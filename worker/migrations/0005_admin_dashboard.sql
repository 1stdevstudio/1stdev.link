-- Admin Dashboard v1: explicit, non-guest owner membership.
-- No role based on browser-controlled email; membership always joins verified D1 users.
CREATE TABLE IF NOT EXISTS admin_memberships (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'owner' CHECK (role IN ('owner','admin')),
  granted_at INTEGER NOT NULL DEFAULT (unixepoch())
);
-- Idempotent first owner grant; only an existing verified account qualifies.
INSERT OR IGNORE INTO admin_memberships(user_id, role, granted_at)
  SELECT id, 'owner', unixepoch() FROM users
  WHERE lower(email) = 'yhogieisk66@gmail.com' AND is_guest = 0;
