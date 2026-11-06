/** D1 owns the single-use/attempt decision; KV remains the IP limiting layer. */
export async function issueChallenge(db: D1Database, userId: string | null, ttl: number): Promise<string> {
  const id = crypto.randomUUID();
  const now = Math.floor(Date.now() / 1000);
  await db.batch([
    db.prepare('DELETE FROM auth_challenges WHERE expires_at <= ?').bind(now),
    db.prepare('INSERT INTO auth_challenges (id, user_id, expires_at) VALUES (?, ?, ?)').bind(id, userId, now + ttl),
  ]);
  return id;
}

export const ATTEMPT_CHALLENGE_SQL = `UPDATE auth_challenges
  SET attempts = attempts + 1, consumed = CASE WHEN ? = 1 THEN 1 ELSE 0 END
  WHERE id = ? AND user_id IS ? AND expires_at > ? AND consumed = 0 AND attempts < 3
  RETURNING consumed`;

export async function attemptChallenge(db: D1Database, id: string, userId: string | null, matches: boolean): Promise<boolean> {
  const result = await db.prepare(ATTEMPT_CHALLENGE_SQL)
    .bind(matches ? 1 : 0, id, userId, Math.floor(Date.now() / 1000))
    .first<{ consumed: number }>();
  return result?.consumed === 1;
}
