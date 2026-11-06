import { shouldIndexProfile } from '../../shared/publicSeo.js';
import { isContentBlock } from '../../shared/business.js';
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
    auth_challenges: [] as any[],
    rate_limits: [] as any[],
    users: [] as any[],
    bio_profiles: [] as any[],
    links: [] as any[],
    link_analytics: [] as any[]
  };

  async batch(statements: any[]) {
    const before = structuredClone(this.tables);
    try { return statements.map((s) => this.executeRun(s._query, s._params)); }
    catch (error) { this.tables = before; throw error; }
  }

  prepare(query: string) {
    const trimmed = query.trim().replace(/\s+/g, ' ');
    const self = this;
    return {
      _query: trimmed,
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
    if (query.startsWith('DELETE FROM rate_limits')) {
      const expired = new Set(this.tables.rate_limits.filter((r) => r.reset_at < params[0]).slice(0, 50).map((r) => r.key_hash));
      this.tables.rate_limits = this.tables.rate_limits.filter((r) => !expired.has(r.key_hash));
      return { success: true };
    }
    if (query.startsWith('INSERT INTO users')) {
      const [id, email, api_key, created_at, updated_at] = params;
      this.tables.users.push({ id, email, api_key, created_at, updated_at, is_guest: 1 });
      return { success: true };
    }
    if (query.startsWith('UPDATE users SET email = ?, is_guest = 0, updated_at = ? WHERE id = ?')) {
      const [email, updated_at, id] = params;
      const user = this.tables.users.find((u) => u.id === id);
      if (user) Object.assign(user, { email, updated_at, is_guest: 0 });
      return { success: true };
    }
    if (query.startsWith('DELETE FROM links WHERE id = ? AND user_id = ?')) {
      const [id, user_id] = params;
      const owned = this.tables.links.some((l) => l.id === id && l.user_id === user_id);
      this.tables.links = this.tables.links.filter((l) => l.id !== id || l.user_id !== user_id);
      if (owned) this.tables.link_analytics = this.tables.link_analytics.filter((a) => a.link_id !== id);
      return { success: true };
    }
    if (query.startsWith('INSERT INTO auth_challenges')) {
      const [id, user_id, expires_at] = params;
      this.tables.auth_challenges.push({ id, user_id, expires_at, attempts: 0, consumed: 0 });
      return { success: true };
    }
    if (query.startsWith('DELETE FROM auth_challenges')) {
      this.tables.auth_challenges = this.tables.auth_challenges.filter((r) => r.expires_at > params[0]);
      return { success: true };
    }
    // Generic tenant-scoped update: UPDATE links SET a = ?, b = ? WHERE id = ? AND user_id = ?
    const upd = query.match(/^UPDATE links SET (.+) WHERE id = \? AND user_id = \?$/);
    if (upd) {
      const cols = upd[1].split(',').map((p) => p.trim().replace(/ = \?$/, ''));
      const [id, user_id] = params.slice(cols.length);
      const row = this.tables.links.find((l) => l.id === id && l.user_id === user_id);
      if (row) cols.forEach((col, i) => (row[col] = params[i]));
      return { success: true, meta: { changes: row ? 1 : 0 } };
    }
    if (query.startsWith('INSERT INTO links') && query.includes('WHERE NOT EXISTS')) {
      const [id, user_id, slug, title, , block_type, created_at, data_json] = params;
      if (!this.tables.links.some((l) => l.user_id === user_id && l.block_type === block_type && l.is_bio_entry === 1)) {
        if (this.tables.links.filter((l) => l.user_id === user_id).length >= 100) throw new Error('QUOTA_EXCEEDED: Maximum 100 links per user');
        const sort_order = Math.max(-1, ...this.tables.links.filter((l) => l.user_id === user_id).map((l) => l.sort_order || 0)) + 1;
        this.tables.links.push({ id, user_id, slug, title, block_type, created_at, data_json, destination_url: '#', is_bio_entry: 1, is_active: 1, sort_order });
      }
      return { success: true };
    }
    // 1. Insert into links
    if (query.startsWith('INSERT INTO links')) {
      // Matches worker: (id, user_id, slug, destination_url, ios_url, android_url, title, is_bio_entry, sort_order, 1, block_type, created_at)
      const [id, user_id, slug, destination_url, ios_url, android_url, title, is_bio_entry, sort_order, block_type, created_at, data_json] = params;
      const is_active = 1;
      if (this.tables.links.filter((l) => l.user_id === user_id).length >= 100) throw new Error('QUOTA_EXCEEDED: Maximum 100 links per user');
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
        data_json,
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
      if (query.includes('(user_id, handle, display_name, bio, theme, updated_at)')) {
        const [user_id, handle, display_name, bio, updated_at] = params;
        this.tables.bio_profiles.push({ user_id, handle, display_name, bio, updated_at, theme: '1stnear' });
        return { success: true };
      }
      const [user_id, handle, display_name, bio, avatar_url, social_links, theme, avatar_shape, verified_badge, style, updated_at, business_json] = params;
      const existingHandle = this.tables.bio_profiles.find((p) => p.handle === handle && p.user_id !== user_id);
      if (existingHandle) {
        throw new Error('UNIQUE constraint failed: bio_profiles.handle');
      }

      const existingIndex = this.tables.bio_profiles.findIndex((p) => p.user_id === user_id);
      const row = { user_id, handle, display_name, bio, avatar_url, social_links, theme, avatar_shape, verified_badge, style, updated_at, business_json };
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
    if (query.startsWith('INSERT INTO rate_limits')) {
      const [key_hash, reset_at, now, , , limit] = params;
      let row = this.tables.rate_limits.find((r) => r.key_hash === key_hash);
      if (!row) { row = { key_hash, count: 1, reset_at }; this.tables.rate_limits.push(row); }
      else if (row.reset_at <= now) { row.count = 1; row.reset_at = reset_at; }
      else if (row.count < limit) row.count++;
      else return { results: [] };
      return { results: [{ count: row.count, reset_at: row.reset_at }] };
    }
    if (query.includes('SELECT reset_at FROM rate_limits WHERE key_hash = ?')) {
      return { results: this.tables.rate_limits.filter((r) => r.key_hash === params[0]).map((r) => ({ reset_at: r.reset_at })) };
    }
    if (query.includes('/* summary_')) {
      const [userId, since, until] = params;
      const links = this.tables.links.filter((l) => l.user_id === userId && !isContentBlock(l.block_type) && /^https?:\/\//i.test(l.destination_url));
      if (query.includes('/* summary_active */')) return { results: [{ active_links: links.filter((l) => l.is_active === 1).length }] };
      const ids = new Set(links.map((l) => l.id));
      const analytics = this.tables.link_analytics.filter((a) => ids.has(a.link_id) && a.date >= since && a.date <= until);
      if (query.includes('/* summary_links */')) {
        const results = links.map(({ id, slug, title }) => ({ id, slug, title, clicks: analytics.filter((a) => a.link_id === id).reduce((sum, a) => sum + a.clicks, 0) })).filter((r) => r.clicks > 0).sort((a, b) => b.clicks - a.clicks || a.id.localeCompare(b.id)).slice(0, 20);
        return { results };
      }
      const field = query.includes('/* summary_dates */') ? 'date' : 'country';
      const counts = new Map<string, number>();
      for (const row of analytics) counts.set(row[field], (counts.get(row[field]) || 0) + row.clicks);
      const results = [...counts].map(([key, clicks]) => ({ [field]: key, clicks }));
      results.sort((a, b) => field === 'date' ? String(a.date).localeCompare(String(b.date)) : Number(b.clicks) - Number(a.clicks) || String(a.country).localeCompare(String(b.country)));
      return { results };
    }
    if (query.startsWith('UPDATE auth_challenges')) {
      const [matches, id, userId, now] = params;
      const row = this.tables.auth_challenges.find((r) => r.id === id && r.user_id === userId && r.expires_at > now && !r.consumed && r.attempts < 3);
      if (!row) return { results: [] };
      row.attempts++;
      row.consumed = matches;
      return { results: [{ consumed: row.consumed }] };
    }
    if (query.includes('SELECT COUNT(*) AS total FROM links')) return { results: [{ total: this.tables.links.filter((l) => l.user_id === params[0]).length }] };
    // Sitemap: indexable public profiles (non-guest, not default guest handle, has a real bio link)
    if (query.includes('FROM bio_profiles p JOIN users u ON u.id = p.user_id')) {
      const results = this.tables.bio_profiles
        .filter((p) => {
          const u = this.tables.users.find((x) => x.id === p.user_id);
          if (!u || u.is_guest) return false;
          return shouldIndexProfile(p, this.tables.links.filter((l) => l.user_id === p.user_id));
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

    if (query.includes('FROM users WHERE email = ?')) {
      return { results: this.tables.users.filter((u) => u.email === params[0]) };
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
        .filter((l) => l.user_id === userId && l.is_bio_entry === 1 && (query.includes('AND is_active = 1') ? l.is_active === 1 : true) && (query.includes('block_type IN') ? ['catalog', 'business_info', 'location', 'contact'].includes(l.block_type) : true))
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

      results.sort((a, b) => b.created_at - a.created_at || a.id.localeCompare(b.id));
      const limit = Number(params.at(-2)), offset = Number(params.at(-1));
      return { results: results.slice(offset, offset + limit) };
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
