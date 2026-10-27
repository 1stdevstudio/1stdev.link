# PRD-04: Database Schema & Storage Strategy

Dokumen ini mendefinisikan skema SQLite untuk Cloudflare D1, struktur key untuk Cloudflare KV, dan strategi indexing.

---

## 1. D1 SQLite Database Schema (`schema.sql`)

```sql
-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,                       -- UUIDv4 / ULID
    email TEXT UNIQUE NOT NULL,
    api_key TEXT UNIQUE,
    created_at INTEGER DEFAULT (unixepoch()),
    updated_at INTEGER DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- 2. Bio Profiles Table
CREATE TABLE IF NOT EXISTS bio_profiles (
    user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    handle TEXT UNIQUE NOT NULL,              -- e.g. 'yogi' (URL: /@yogi)
    display_name TEXT NOT NULL,
    bio TEXT,
    avatar_url TEXT,
    social_links TEXT,                         -- JSON: {"github": "...", "twitter": "..."}
    theme TEXT DEFAULT 'minimal-dark',
    updated_at INTEGER DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_bio_profiles_handle ON bio_profiles(handle);

-- 3. Links Table (Shortlinks & Bio Card Items)
CREATE TABLE IF NOT EXISTS links (
    id TEXT PRIMARY KEY,                       -- UUIDv4 / ULID
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    slug TEXT UNIQUE NOT NULL,                 -- Slug unik (e.g. 'promo' atau random 'aX9k2')
    destination_url TEXT NOT NULL,
    title TEXT,
    is_bio_entry INTEGER NOT NULL DEFAULT 0,  -- 1 jika ditampilkan di bio profile, 0 jika standalone
    sort_order INTEGER NOT NULL DEFAULT 0,     -- Urutan tampilan pada bio profile
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at INTEGER DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_links_slug ON links(slug);
CREATE INDEX IF NOT EXISTS idx_links_user ON links(user_id);
CREATE INDEX IF NOT EXISTS idx_links_bio ON links(user_id, is_bio_entry, sort_order);

-- 4. Aggregated Daily Analytics Table
-- Catatan: Mencegah row explosion dan menghemat kuota Write D1
CREATE TABLE IF NOT EXISTS link_analytics (
    link_id TEXT NOT NULL REFERENCES links(id) ON DELETE CASCADE,
    date TEXT NOT NULL,                        -- Format: 'YYYY-MM-DD'
    country TEXT NOT NULL DEFAULT 'XX',        -- Kode ISO 2-huruf (dari cf-ipcountry)
    clicks INTEGER NOT NULL DEFAULT 1,
    PRIMARY KEY (link_id, date, country)
);

CREATE INDEX IF NOT EXISTS idx_analytics_link_date ON link_analytics(link_id, date);
```

---

## 2. Cloudflare KV Key-Value Pattern

| Key Format | Tipe Data | TTL | Contoh Value | Kegunaan |
|---|---|---|---|---|
| `slug:{slug}` | JSON | 86400s (24 Jam) | `{"url":"https://example.com","id":"link_1"}` | Caching lookup redirect <5ms |
| `bio:{handle}` | JSON | 3600s (1 Jam) | `{"profile":{...},"links":[{...}]}` | Cache rendering bio profile SSR |
| `user_rate:{ip}` | String (Count) | 60s (1 Menit) | `"5"` | Rate limiting pembuatan link |
