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
    theme TEXT DEFAULT '1stnear',
    business_json TEXT,
    avatar_shape TEXT DEFAULT 'circle',
    verified_badge INTEGER NOT NULL DEFAULT 0,
    style TEXT DEFAULT '{}',
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
    data_json TEXT,
    block_type TEXT DEFAULT 'link',
    style TEXT DEFAULT '{}',
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

-- Additive: apply to the target D1 database before deploying the Worker.
CREATE TABLE IF NOT EXISTS auth_challenges (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  expires_at INTEGER NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  consumed INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_auth_challenges_expiry ON auth_challenges(expires_at);


-- 5. Rate Limits Table (D1 Atomic Enforcement)
CREATE TABLE IF NOT EXISTS rate_limits (
    key_hash TEXT PRIMARY KEY,
    count INTEGER NOT NULL,
    reset_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_reset ON rate_limits(reset_at);

CREATE TABLE IF NOT EXISTS media_cleanup_runs (
    user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    last_run INTEGER NOT NULL,
    cursors_json TEXT NOT NULL DEFAULT '{}'
);

-- 6. Atomic Link Quota Trigger (Max 100 links per user across all block types)
CREATE TRIGGER IF NOT EXISTS trg_links_max_quota
BEFORE INSERT ON links
FOR EACH ROW
WHEN (SELECT COUNT(*) FROM links WHERE user_id = NEW.user_id) >= 100
BEGIN
    SELECT RAISE(ABORT, 'QUOTA_EXCEEDED: Maximum 100 links per user');
END;

-- Guest expiration with a migration-time 7-day grace period for existing guests.
CREATE TABLE IF NOT EXISTS guest_expiration_policy (
  id TEXT PRIMARY KEY CHECK (id = 'guest'),
  enabled_at INTEGER NOT NULL
);
INSERT OR IGNORE INTO guest_expiration_policy (id, enabled_at) VALUES ('guest', unixepoch());
CREATE TABLE IF NOT EXISTS guest_cleanup_jobs (
  user_id TEXT PRIMARY KEY,
  handle TEXT,
  slugs_json TEXT NOT NULL DEFAULT '[]',
  kv_done INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_guest_cleanup_jobs_created ON guest_cleanup_jobs(created_at);

-- Only existing, non-guest accounts can hold administrator roles.
CREATE TABLE IF NOT EXISTS admin_memberships (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'owner' CHECK (role IN ('owner', 'admin')),
  granted_at INTEGER NOT NULL DEFAULT (unixepoch())
);
