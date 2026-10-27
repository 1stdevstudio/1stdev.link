// In-memory mock for Cloudflare D1 and KV to test Worker locally without external network
export class MockKV {
  private store = new Map<string, { value: string; expires?: number }>();

  async get<T = any>(key: string, type?: string): Promise<T | null> {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expires && entry.expires < Date.now()) {
      this.store.delete(key);
      return null;
    }
    if (type === 'json') {
      try {
        return JSON.parse(entry.value) as T;
      } catch {
        return null;
      }
    }
    return entry.value as unknown as T;
  }

  async put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void> {
    const expires = options?.expirationTtl ? Date.now() + options.expirationTtl * 1000 : undefined;
    this.store.set(key, { value, expires });
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }
}

export class MockD1 {
  public tables = {
    users: [] as any[],
    bio_profiles: [] as any[],
    links: [] as any[],
    link_analytics: [] as any[]
  };

  prepare(query: string) {
    const trimmed = query.trim().replace(/\s+/g, ' ');
    const self = this;
    return {
      _params: [] as any[],
      bind(...params: any[]) {
        this._params = params;
        return this;
      },
      async first() {
        const res = await this.all();
        return res.results && res.results.length > 0 ? res.results[0] : null;
      },
      async run() {
        return self.executeRun(trimmed, this._params);
      },
      async all() {
        return self.executeSelect(trimmed, this._params);
      }
    };
  }

  private executeRun(query: string, params: any[]) {
    // Generic tenant-scoped update: UPDATE links SET a = ?, b = ? WHERE id = ? AND user_id = ?
    const upd = query.match(/^UPDATE links SET (.+) WHERE id = \? AND user_id = \?$/);
    if (upd) {
      const cols = upd[1].split(',').map((p) => p.trim().replace(/ = \?$/, ''));
      const [id, user_id] = params.slice(cols.length);
      const row = this.tables.links.find((l) => l.id === id && l.user_id === user_id);
      if (row) cols.forEach((col, i) => (row[col] = params[i]));
      return { success: true, meta: { changes: row ? 1 : 0 } };
    }
    // 1. Insert into links
    if (query.startsWith('INSERT INTO links')) {
      // Matches worker: (id, user_id, slug, destination_url, ios_url, android_url, title, is_bio_entry, sort_order, 1, block_type, created_at)
      const [id, user_id, slug, destination_url, ios_url, android_url, title, is_bio_entry, sort_order, block_type, created_at] = params;
      const is_active = 1;
      const existing = this.tables.links.find((l) => l.slug === slug);
      if (existing) {
        throw new Error('UNIQUE constraint failed: links.slug');
      }
      this.tables.links.push({
        id,
        user_id,
        slug,
        destination_url,
        ios_url,
        android_url,
        title,
        is_bio_entry,
        sort_order,
        is_active,
        block_type,
        created_at
      });
      return { success: true };
    }

    // 2. Link analytics UPSERT
    if (query.includes('INSERT INTO link_analytics')) {
      const [link_id, date, country] = params;
      const existing = this.tables.link_analytics.find(
        (a) => a.link_id === link_id && a.date === date && a.country === country
      );
      if (existing) {
        existing.clicks += 1;
      } else {
        this.tables.link_analytics.push({
          link_id,
          date,
          country,
          clicks: 1
        });
      }
      return { success: true };
    }

    // 3. Bio profile UPSERT
    if (query.includes('INSERT INTO bio_profiles')) {
      const [user_id, handle, display_name, bio, avatar_url, social_links, theme, updated_at] = params;
      const existingHandle = this.tables.bio_profiles.find((p) => p.handle === handle && p.user_id !== user_id);
      if (existingHandle) {
        throw new Error('UNIQUE constraint failed: bio_profiles.handle');
      }

      const existingIndex = this.tables.bio_profiles.findIndex((p) => p.user_id === user_id);
      const row = { user_id, handle, display_name, bio, avatar_url, social_links, theme, updated_at };
      if (existingIndex >= 0) {
        this.tables.bio_profiles[existingIndex] = row;
      } else {
        this.tables.bio_profiles.push(row);
      }
      return { success: true };
    }

    return { success: true };
  }

  private executeSelect(query: string, params: any[]) {
    // Sitemap: indexable public profiles (non-guest, not default guest handle, has a real bio link)
    if (query.includes('FROM bio_profiles p JOIN users u ON u.id = p.user_id')) {
      const results = this.tables.bio_profiles
        .filter((p) => {
          const u = this.tables.users.find((x) => x.id === p.user_id);
          if (!u || u.is_guest) return false;
          if (/^edge_/.test(p.handle)) return false;
          return this.tables.links.some((l) => l.user_id === p.user_id && l.is_bio_entry === 1 && l.is_active === 1 && l.destination_url !== '#');
        })
        .sort((a, b) => b.updated_at - a.updated_at)
        .map((p) => ({ handle: p.handle, updated_at: p.updated_at }));
      return { results };
    }
    // Select user
    // Token lookup: hanya api_key (id user bersifat publik, bukan rahasia).
    if (query.includes('FROM users WHERE api_key = ?')) {
      const [token] = params;
      const user = this.tables.users.find((u) => u.api_key === token);
      return { results: user ? [user] : [] };
    }
    if (query.includes('FROM users WHERE id = ?')) {
      const [id] = params;
      const user = this.tables.users.find((u) => u.id === id);
      return { results: user ? [user] : [] };
    }

    // Select bio_profile by handle
    if (query.includes('FROM bio_profiles WHERE handle = ?')) {
      const [handle] = params;
      const profile = this.tables.bio_profiles.find((p) => p.handle === handle);
      return { results: profile ? [profile] : [] };
    }

    // Select bio_profile by user_id
    if (query.includes('FROM bio_profiles WHERE user_id = ?')) {
      const [userId] = params;
      const profile = this.tables.bio_profiles.find((p) => p.user_id === userId);
      return { results: profile ? [profile] : [] };
    }

    // Select links for bio
    if (query.includes('FROM links WHERE user_id = ? AND is_bio_entry = 1')) {
      const [userId] = params;
      const links = this.tables.links
        .filter((l) => l.user_id === userId && l.is_bio_entry === 1 && l.is_active === 1)
        .sort((a, b) => a.sort_order - b.sort_order);
      return { results: links };
    }

    // Select links by slug
    if (query.includes('FROM links WHERE slug = ?')) {
      const [slug] = params;
      const link = this.tables.links.find((l) => l.slug === slug);
      return { results: link ? [link] : [] };
    }

    // Select links by id and user_id
    if (query.includes('FROM links WHERE id = ? AND user_id = ?')) {
      const [id, userId] = params;
      const link = this.tables.links.find((l) => l.id === id && l.user_id === userId);
      return { results: link ? [link] : [] };
    }

    // List links for user
    if (query.includes('SELECT l.id, l.slug, l.destination_url')) {
      const userId = params[0];
      let links = this.tables.links.filter((l) => l.user_id === userId);
      if (query.includes('AND l.is_bio_entry = 1')) {
        links = links.filter((l) => l.is_bio_entry === 1);
      } else if (query.includes('AND l.is_bio_entry = 0')) {
        links = links.filter((l) => l.is_bio_entry === 0);
      }

      const results = links.map((l) => {
        const totalClicks = this.tables.link_analytics
          .filter((a) => a.link_id === l.id)
          .reduce((sum, curr) => sum + curr.clicks, 0);
        return {
          ...l,
          clicks: totalClicks
        };
      });

      return { results };
    }

    // Analytics by date
    if (query.includes('SELECT date, SUM(clicks) as clicks')) {
      const [linkId, sinceDate] = params;
      const map = new Map<string, number>();
      for (const a of this.tables.link_analytics) {
        if (a.link_id === linkId && a.date >= sinceDate) {
          map.set(a.date, (map.get(a.date) || 0) + a.clicks);
        }
      }
      const results = Array.from(map.entries())
        .map(([date, clicks]) => ({ date, clicks }))
        .sort((a, b) => a.date.localeCompare(b.date));
      return { results };
    }

    // Analytics by country
    if (query.includes('SELECT country, SUM(clicks) as clicks')) {
      const [linkId, sinceDate] = params;
      const map = new Map<string, number>();
      for (const a of this.tables.link_analytics) {
        if (a.link_id === linkId && a.date >= sinceDate) {
          map.set(a.country, (map.get(a.country) || 0) + a.clicks);
        }
      }
      const results = Array.from(map.entries())
        .map(([country, clicks]) => ({ country, clicks }))
        .sort((a, b) => b.clicks - a.clicks);
      return { results };
    }

    return { results: [] };
  }
}

// Minimal in-memory R2 bucket (put/get/delete/list) for media tests
export class MockR2 {
  objects = new Map<string, { bytes: Uint8Array; contentType?: string }>();

  async put(key: string, value: ArrayBuffer, opts?: { httpMetadata?: { contentType?: string } }) {
    this.objects.set(key, { bytes: new Uint8Array(value), contentType: opts?.httpMetadata?.contentType });
    return { key };
  }

  async get(key: string) {
    const o = this.objects.get(key);
    if (!o) return null;
    return { body: o.bytes, httpEtag: `"${key.length}-${o.bytes.length}"`, httpMetadata: { contentType: o.contentType } };
  }

  async delete(keys: string | string[]) {
    for (const k of Array.isArray(keys) ? keys : [keys]) this.objects.delete(k);
  }

  async list(opts?: { prefix?: string }) {
    const objects = [...this.objects.keys()].filter((k) => k.startsWith(opts?.prefix || '')).map((key) => ({ key }));
    return { objects, truncated: false };
  }
}
