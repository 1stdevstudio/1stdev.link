import type { Hono } from 'hono';
import type { Env, User } from './types.js';
import { generateSecureOtp, sendOtpEmail, checkRateLimit } from './security.js';
import { issueChallenge, attemptChallenge } from './authChallenges.js';
import { looksLikeMarkupAttack } from './contentSafety.js';

type App = Hono<{ Bindings: Env; Variables: { user?: User } }>;
type AuthUser = (c: any) => Promise<User | null>;
const OTP_TTL = 600;
const ADMIN_SESSION_TTL = 1800;
interface OtpEntry { code: string; challenge_id: string; created_at: number }
interface AdminSessionEntry { user_id: string; expires_at: number }

async function sha256(value: string): Promise<string> {
  const buffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function hasMembership(env: Env, user: User | null): Promise<boolean> {
  if (!user || user.is_guest || !env.DB) return false;
  const found = await env.DB.prepare(
    'SELECT user_id FROM admin_memberships WHERE user_id = ?'
  ).bind(user.id).first<{ user_id: string }>();
  return found?.user_id === user.id;
}

export function installAdminRoutes(app: App, authenticateUser: AuthUser) {
  async function currentAdmin(c: any): Promise<User | null> {
    const user = await authenticateUser(c);
    return await hasMembership(c.env, user) ? user : null;
  }

  /** Role discovery is strictly scoped to the account authenticated by its secret key. */
  app.get('/api/admin/status', async (c) => {
    const user = await authenticateUser(c);
    if (!user) return c.json({ status: 'error', message: 'Unauthorized' }, 401);
    return c.json({ status: 'success', data: { is_admin: await hasMembership(c.env, user) } });
  });

  /** Step-up is mandatory even when an API key has already been authenticated. */
  app.post('/api/admin/otp', async (c) => {
    const user = await currentAdmin(c);
    if (!user) return c.json({ status: 'error', message: 'Forbidden' }, 403);
    if (!c.env.KV || !c.env.DB) return c.json({ status: 'error', message: 'Verification unavailable' }, 503);
    const ip = c.req.header('cf-connecting-ip') || 'unknown';
    const rate = await checkRateLimit(c.env.KV, 'rate:admin-otp:' + user.id + ':' + ip, 3, 3600, c.env.DB);
    if (rate.serviceUnavailable) return c.json({ status: 'error', message: 'Verification unavailable' }, 503);
    if (!rate.allowed) return c.json({ status: 'error', message: 'Try again later' }, 429);
    const code = generateSecureOtp();
    const challengeId = await issueChallenge(c.env.DB, user.id, OTP_TTL);
    const now = Math.floor(Date.now() / 1000);
    const key = 'admin:otp:' + user.id;
    await c.env.KV.put(key, JSON.stringify({ code, challenge_id: challengeId, created_at: now }), { expirationTtl: OTP_TTL });
    const sent = await sendOtpEmail(
      c.env.RESEND_API_KEY, user.email, code, 'login',
      c.env.ENVIRONMENT === 'development', c.env.EMAIL_FROM
    );
    if (!sent.success) {
      await c.env.KV.delete(key);
      return c.json({ status: 'error', message: 'Could not send verification code' }, 503);
    }
    return c.json({ status: 'success', message: 'Verification code sent' });
  });

  app.post('/api/admin/otp/verify', async (c) => {
    const user = await currentAdmin(c);
    if (!user) return c.json({ status: 'error', message: 'Forbidden' }, 403);
    if (!c.env.KV || !c.env.DB) return c.json({ status: 'error', message: 'Verification unavailable' }, 503);
    const body = await c.req.json().catch(() => ({})) as { code?: unknown };
    if (typeof body.code !== 'string' || !/^\d{6}$/.test(body.code)) {
      return c.json({ status: 'error', message: 'Six-digit code required' }, 400);
    }
    const rate = await checkRateLimit(c.env.KV, 'rate:admin-verify:' + user.id, 10, 600, c.env.DB);
    if (rate.serviceUnavailable) return c.json({ status: 'error', message: 'Verification unavailable' }, 503);
    if (!rate.allowed) return c.json({ status: 'error', message: 'Try again later' }, 429);
    const key = 'admin:otp:' + user.id;
    const record = await c.env.KV.get<OtpEntry>(key, 'json');
    if (!record || !Number.isFinite(record.created_at) || record.created_at + OTP_TTL <= Math.floor(Date.now() / 1000)) {
      return c.json({ status: 'error', message: 'Code expired' }, 401);
    }
    if (!await attemptChallenge(c.env.DB, record.challenge_id, user.id, record.code === body.code)) {
      return c.json({ status: 'error', message: 'Invalid or expired code' }, 401);
    }
    await c.env.KV.delete(key);
    const random = new Uint8Array(32);
    crypto.getRandomValues(random);
    const token = [...random].map((b) => b.toString(16).padStart(2, '0')).join('');
    const hashed = await sha256(token);
    const expires = Math.floor(Date.now() / 1000) + ADMIN_SESSION_TTL;
    await c.env.KV.put('admin:session:' + hashed, JSON.stringify({ user_id: user.id, expires_at: expires }), {
      expirationTtl: ADMIN_SESSION_TTL
    });
    return c.json({ status: 'success', data: { admin_token: token, expires_at: expires } });
  });

  const requireAdminSession = async (c: any, next: any) => {
    const user = await currentAdmin(c);
    if (!user) return c.json({ status: 'error', message: 'Forbidden' }, 403);
    const token = c.req.header('x-admin-session') || '';
    if (!/^[a-f0-9]{64}$/.test(token) || !c.env.KV) {
      return c.json({ status: 'error', message: 'Additional email verification required' }, 401);
    }
    const record = await c.env.KV.get('admin:session:' + await sha256(token), 'json') as AdminSessionEntry | null;
    if (!record || record.user_id !== user.id || record.expires_at <= Math.floor(Date.now() / 1000)) {
      return c.json({ status: 'error', message: 'Admin verification expired' }, 401);
    }
    return next();
  };

  app.use('/api/admin/overview', requireAdminSession);
  app.use('/api/admin/users', requireAdminSession);
  app.use('/api/admin/users/*', requireAdminSession);

  app.get('/api/admin/overview', async (c) => {
    const [users, links, clicks, cleanup] = await Promise.all([
      c.env.DB.prepare(
        'SELECT COUNT(*) AS total, COALESCE(SUM(CASE WHEN is_guest=1 THEN 1 ELSE 0 END),0) AS guests, ' +
        'COALESCE(SUM(CASE WHEN is_guest=0 THEN 1 ELSE 0 END),0) AS verified, ' +
        'COALESCE(SUM(CASE WHEN is_guest=0 AND created_at >= unixepoch() - 604800 THEN 1 ELSE 0 END),0) AS new_verified_7d ' +
        'FROM users'
      ).first(),
      c.env.DB.prepare(
        'SELECT COUNT(*) AS total, COALESCE(SUM(CASE WHEN is_active=1 THEN 1 ELSE 0 END),0) AS active FROM links'
      ).first(),
      c.env.DB.prepare(
        "SELECT COALESCE(SUM(clicks),0) AS total, COALESCE(SUM(CASE WHEN date >= date('now','-6 days') THEN clicks ELSE 0 END),0) AS last_7d FROM link_analytics"
      ).first(),
      c.env.DB.prepare(
        "SELECT (SELECT COUNT(*) FROM guest_cleanup_jobs) AS pending, " +
        "(SELECT enabled_at FROM guest_expiration_policy WHERE id = 'guest') AS enabled_at, " +
        "(SELECT COUNT(*) FROM users u LEFT JOIN bio_profiles p ON p.user_id=u.id " +
        "WHERE u.is_guest=1 AND u.created_at <= unixepoch()-604800 " +
        "AND COALESCE(u.updated_at,u.created_at) <= unixepoch()-604800 " +
        "AND COALESCE(p.updated_at,u.created_at) <= unixepoch()-604800 " +
        "AND NOT EXISTS(SELECT 1 FROM links l WHERE l.user_id=u.id AND l.created_at > unixepoch()-604800)) AS old_guests"
      ).first()
    ]);
    return c.json({ status: 'success', data: { users, links, clicks, cleanup, refresh_seconds: 0 } });
  });

  /** Read-only, bounded user directory. No API keys, OTPs, or raw emails returned. */
  app.get('/api/admin/users', async (c) => {
    const status = c.req.query('status') || 'all';
    if (!['all', 'guest', 'verified'].includes(status)) return c.json({ status: 'error', message: 'Invalid filter' }, 400);
    const offset = Math.min(10000, Math.max(0, Number.parseInt(c.req.query('offset') || '0', 10) || 0));
    const query = (c.req.query('q') || '').trim().slice(0, 64);
    const parts = ['1=1'];
    const values: (string | number)[] = [];
    if (status !== 'all') { parts.push('u.is_guest = ?'); values.push(status === 'guest' ? 1 : 0); }
    if (query) {
      parts.push("(lower(COALESCE(p.handle,'')) LIKE ? OR lower(COALESCE(p.display_name,'')) LIKE ? OR lower(u.email) LIKE ?)");
      const pattern = '%' + query.toLowerCase() + '%';
      values.push(pattern, pattern, pattern);
    }
    const statement =
      'SELECT u.id, u.email, u.is_guest, u.created_at, u.updated_at, p.handle, p.display_name, ' +
      'COALESCE(l.cnt,0) AS links_count FROM users u ' +
      'LEFT JOIN bio_profiles p ON p.user_id=u.id ' +
      'LEFT JOIN (SELECT user_id,COUNT(*) AS cnt FROM links GROUP BY user_id) l ON l.user_id=u.id ' +
      'WHERE ' + parts.join(' AND ') + ' ORDER BY u.created_at DESC, u.id DESC LIMIT ? OFFSET ?';
    const rows = await c.env.DB.prepare(statement).bind(...values, 26, offset).all<{
      id: string; email: string; is_guest: number; created_at: number; updated_at: number;
      handle: string | null; display_name: string | null; links_count: number
    }>();
    const records = (rows.results || []).slice(0, 25).map(({ email, ...row }) => {
      const at = email.indexOf('@');
      const maskedEmail = at > 0 && !email.endsWith('.local')
        ? email.slice(0, Math.min(2, at)) + '***' + email.slice(at)
        : null;
      return { ...row, email_masked: maskedEmail, suspicious_profile: looksLikeMarkupAttack(row.display_name || '') };
    });
    return c.json({ status: 'success', data: { users: records, has_more: (rows.results || []).length > 25, next_offset: offset + records.length } });
  });

  /** Tenant identity must be specified and checked against the owner of every link. */
  app.get('/api/admin/users/:userId/links', async (c) => {
    const id = c.req.param('userId');
    if (!/^usr_[a-zA-Z0-9_-]{2,80}$/.test(id)) return c.json({ status: 'error', message: 'Invalid user' }, 400);
    const owner = await c.env.DB.prepare('SELECT id FROM users WHERE id = ?').bind(id).first();
    if (!owner) return c.json({ status: 'error', message: 'Not found' }, 404);
    const rows = await c.env.DB.prepare(
      'SELECT l.id,l.slug,l.title,l.destination_url,l.is_active,l.is_bio_entry,l.block_type,' +
      'COALESCE(SUM(a.clicks),0) AS clicks FROM links l ' +
      'LEFT JOIN link_analytics a ON a.link_id=l.id WHERE l.user_id=? ' +
      'GROUP BY l.id ORDER BY l.created_at DESC,l.id DESC LIMIT 100'
    ).bind(id).all();
    return c.json({ status: 'success', data: { links: rows.results || [] } });
  });
}
