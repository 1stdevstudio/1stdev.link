-- Guest expiry release: protects every existing guest with a fresh 7-day grace period.
-- Deploy this migration BEFORE deploying the Worker with the daily cron.
-- INSERT OR IGNORE is intentional: reapplying must never restart the clock.
CREATE TABLE IF NOT EXISTS guest_expiration_policy (
  id TEXT PRIMARY KEY CHECK (id = 'guest'),
  enabled_at INTEGER NOT NULL
);
INSERT OR IGNORE INTO guest_expiration_policy (id, enabled_at)
VALUES ('guest', unixepoch());

-- Durable queue for cache/media cleanup after a guest is deleted.
-- No personal email addresses, API keys, or secrets are stored.
CREATE TABLE IF NOT EXISTS guest_cleanup_jobs (
  user_id TEXT PRIMARY KEY,
  handle TEXT,
  slugs_json TEXT NOT NULL DEFAULT '[]',
  kv_done INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_guest_cleanup_jobs_created ON guest_cleanup_jobs(created_at);
