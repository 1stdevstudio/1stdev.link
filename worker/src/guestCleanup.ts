import type { Env } from './types.js';

export const GUEST_EXPIRY_SECONDS = 7 * 24 * 60 * 60;
// Small daily batch: protect Workers/D1/KV free-tier budgets.
export const GUEST_CLEANUP_BATCH = 5;

interface PolicyRow { enabled_at: number }
interface CandidateRow { id: string; handle: string | null }
interface CleanupJob {
  user_id: string;
  handle: string | null;
  slugs_json: string;
  kv_done: number;
}
type CleanupEnv = Pick<Env, 'DB' | 'KV' | 'MEDIA'>;

export function guestExpired(
  createdAt: number,
  userUpdatedAt: number,
  profileUpdatedAt: number,
  policyEnabledAt: number,
  nowSeconds: number,
): boolean {
  return Math.max(createdAt, userUpdatedAt, profileUpdatedAt, policyEnabledAt) <= nowSeconds - GUEST_EXPIRY_SECONDS;
}

/**
 * Delete expired *unclaimed* workspaces, not verified accounts.
 *
 * The migration records the time the policy was enabled. Existing guests
 * receive a fresh seven-day grace period, while newer guests have seven days
 * from their most recent profile update. Creating a link also postpones expiry.
 *
 * Each deleted guest gets a durable cleanup job before its D1 row is removed.
 * Jobs are retried on subsequent cron ticks so KV/R2 failures cannot silently
 * strand cleanup work. No endpoint exposes this operation to site visitors.
 */
export async function expireGuestWorkspaces(
  env: CleanupEnv,
  nowSeconds: number = Math.floor(Date.now() / 1000),
): Promise<{ deleted: number; cleaned: number; pending: number }> {
  if (!env.DB || !env.KV || !env.MEDIA) {
    throw new Error('Guest cleanup requires DB, KV, and MEDIA bindings');
  }

  // Do not delete anything unless the migration has explicitly enabled
  // the grace period. Fail closed if the migration has not been applied.
  const policy = await env.DB
    .prepare("SELECT enabled_at FROM guest_expiration_policy WHERE id = 'guest'")
    .first<PolicyRow>();
  if (!policy || !Number.isFinite(policy.enabled_at) || policy.enabled_at <= 0) {
    return { deleted: 0, cleaned: 0, pending: 0 };
  }

  const cutoff = nowSeconds - GUEST_EXPIRY_SECONDS;
  let deleted = 0;
  if (policy.enabled_at <= cutoff) {
    const candidates = await env.DB.prepare([
      'SELECT u.id, p.handle FROM users u',
      'LEFT JOIN bio_profiles p ON p.user_id = u.id',
      'WHERE u.is_guest = 1 AND u.created_at <= ?',
      'AND COALESCE(u.updated_at, u.created_at) <= ?',
      'AND COALESCE(p.updated_at, u.created_at) <= ?',
      'AND NOT EXISTS (SELECT 1 FROM links l WHERE l.user_id = u.id AND l.created_at > ?)',
      'ORDER BY u.created_at, u.id LIMIT ?',
    ].join(' ')).bind(cutoff, cutoff, cutoff, cutoff, GUEST_CLEANUP_BATCH)
      .all<CandidateRow>();

    for (const candidate of candidates.results || []) {
      // Retain slugs before CASCADE removes the links. Never store emails,
      // access keys or tokens in background job records.
      const owned = await env.DB
        .prepare('SELECT slug FROM links WHERE user_id = ?')
        .bind(candidate.id).all<{ slug: string }>();
      const slugs = (owned.results || []).map((row) => row.slug);
      const statements = [
        env.DB.prepare([
          'INSERT OR IGNORE INTO guest_cleanup_jobs',
          '(user_id, handle, slugs_json, kv_done, created_at) VALUES (?, ?, ?, 0, ?)',
        ].join(' ')).bind(candidate.id, candidate.handle, JSON.stringify(slugs), nowSeconds),
        env.DB.prepare([
          'DELETE FROM users WHERE id = ? AND is_guest = 1',
          'AND created_at <= ? AND COALESCE(updated_at, created_at) <= ?',
          'AND NOT EXISTS (SELECT 1 FROM bio_profiles p WHERE p.user_id = users.id AND p.updated_at > ?)',
          'AND NOT EXISTS (SELECT 1 FROM links l WHERE l.user_id = users.id AND l.created_at > ?)',
          'RETURNING id',
        ].join(' ')).bind(candidate.id, cutoff, cutoff, cutoff, cutoff),
      ];
      // A transaction leaves the durable job and row deletion in sync.
      const result = await env.DB.batch(statements);
      if ((result[1]?.results || []).length > 0) deleted += 1;
    }
  }

  // Retry older jobs even when there is no new eligible guest today.
  const jobs = await env.DB
    .prepare('SELECT user_id, handle, slugs_json, kv_done FROM guest_cleanup_jobs ORDER BY created_at, user_id LIMIT ?')
    .bind(GUEST_CLEANUP_BATCH).all<CleanupJob>();
  let cleaned = 0;
  for (const job of jobs.results || []) {
    try {
      // A claim/profile edit may have raced the deletion. In this case the
      // user still exists and cleanup must NEVER touch their media or cache.
      const alive = await env.DB
        .prepare('SELECT id FROM users WHERE id = ?')
        .bind(job.user_id).first();
      if (alive) {
        await env.DB.prepare('DELETE FROM guest_cleanup_jobs WHERE user_id = ?').bind(job.user_id).run();
        continue;
      }

      if (!job.kv_done) {
        const parsed: unknown = JSON.parse(job.slugs_json);
        if (!Array.isArray(parsed) || !parsed.every((s) => typeof s === 'string')) {
          throw new Error('Invalid stored guest cleanup slugs');
        }
        if (job.handle) await env.KV.delete('bio:' + job.handle);
        for (const slug of parsed) await env.KV.delete('slug:' + slug);
        await env.DB.prepare('UPDATE guest_cleanup_jobs SET kv_done = 1 WHERE user_id = ?')
          .bind(job.user_id).run();
      }

      // Limit list requests and R2 deletes. On partial pages, retry tomorrow;
      // listing again from the prefix start is safe because keys were deleted.
      let allMediaDeleted = true;
      for (const prefix of [
        'avatars/' + job.user_id + '/',
        'covers/' + job.user_id + '/',
        'backgrounds/' + job.user_id + '/',
      ]) {
        const page = await env.MEDIA.list({ prefix, limit: 100 });
        const keys = page.objects.filter((obj) => obj.key.startsWith(prefix)).map((obj) => obj.key);
        if (keys.length) await env.MEDIA.delete(keys);
        if (page.truncated) allMediaDeleted = false;
      }
      if (!allMediaDeleted) continue;
      await env.DB.prepare('DELETE FROM auth_challenges WHERE user_id = ?').bind(job.user_id).run();
      await env.DB.prepare('DELETE FROM guest_cleanup_jobs WHERE user_id = ?').bind(job.user_id).run();
      cleaned += 1;
    } catch (err) {
      // Retry later without deleting the job. Log only an opaque job ID.
      console.error('Guest cleanup failed for job', job.user_id, err instanceof Error ? err.message : 'unknown error');
    }
  }

  return { deleted, cleaned, pending: (jobs.results || []).length - cleaned };
}
