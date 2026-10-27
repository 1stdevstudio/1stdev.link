-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    api_key TEXT UNIQUE,
    is_guest INTEGER DEFAULT 0,
    claim_token TEXT,
    created_at INTEGER DEFAULT (unixepoch()),
    updated_at INTEGER DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_api_key ON users(api_key);

-- 2. Bio Profiles Table
CREATE TABLE IF NOT EXISTS bio_profiles (
    user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    handle TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    bio TEXT,
    avatar_url TEXT,
    social_links TEXT,
    theme TEXT DEFAULT 'minimal-dark',
    updated_at INTEGER DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_bio_profiles_handle ON bio_profiles(handle);

-- 3. Links Table (Shortlinks & Bio Card Items)
CREATE TABLE IF NOT EXISTS links (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    slug TEXT UNIQUE NOT NULL,
    destination_url TEXT NOT NULL,
    ios_url TEXT,
    android_url TEXT,
    title TEXT,
    is_bio_entry INTEGER NOT NULL DEFAULT 0,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at INTEGER DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_links_slug ON links(slug);
CREATE INDEX IF NOT EXISTS idx_links_user ON links(user_id);
CREATE INDEX IF NOT EXISTS idx_links_bio ON links(user_id, is_bio_entry, sort_order);

-- 4. Aggregated Daily Analytics Table
CREATE TABLE IF NOT EXISTS link_analytics (
    link_id TEXT NOT NULL REFERENCES links(id) ON DELETE CASCADE,
    date TEXT NOT NULL,
    country TEXT NOT NULL DEFAULT 'XX',
    clicks INTEGER NOT NULL DEFAULT 1,
    PRIMARY KEY (link_id, date, country)
);

CREATE INDEX IF NOT EXISTS idx_analytics_link_date ON link_analytics(link_id, date);
