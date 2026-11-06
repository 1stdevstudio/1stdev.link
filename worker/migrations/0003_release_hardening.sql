-- Migration 0003: Release Hardening (Rate limiting, Link quota trigger)

-- 1. D1 Atomic Rate Limiting Table
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

-- 2. Atomic Link Quota Trigger (Max 100 links per user across all block types)
CREATE TRIGGER IF NOT EXISTS trg_links_max_quota
BEFORE INSERT ON links
FOR EACH ROW
WHEN (SELECT COUNT(*) FROM links WHERE user_id = NEW.user_id) >= 100
BEGIN
    SELECT RAISE(ABORT, 'QUOTA_EXCEEDED: Maximum 100 links per user');
END;
