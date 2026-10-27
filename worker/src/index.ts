import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Env, User, BioProfile, Link, CachedSlug, CachedBioProfile, OtpRecord } from './types.js';
import { isReservedSlug, validateDestinationUrl, checkRateLimit, generateSecureOtp, sendOtpEmail } from './security.js';
import { renderBioPage } from './bio.js';

const app = new Hono<{ Bindings: Env; Variables: { user?: User } }>();

// Enable CORS for API routes
app.use('/api/*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
}));

// 1. Global Security Headers Middleware
app.use('*', async (c, next) => {
  await next();
  c.header('X-Content-Type-Options', 'nosniff');
  c.header('X-Frame-Options', 'DENY');
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
  c.header(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self'; style-src 'unsafe-inline'; img-src * data:;"
  );
});

// Helper to safely execute background task via ctx.waitUntil or Promise fallback
function safeWaitUntil(c: any, promise: Promise<any>) {
  try {
    if (c.executionCtx && typeof c.executionCtx.waitUntil === 'function') {
      c.executionCtx.waitUntil(promise);
      return;
    }
  } catch {
    // ExecutionContext not available in testing or standard fetch
  }
  promise.catch(() => {});
}

// Helper: Generate Base62 Random Slug
function generateRandomSlug(length = 6): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Helper: Get Client IP
function getClientIp(c: any): string {
  return c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || '127.0.0.1';
}

// 2. Auth Helper / Middleware for API
async function authenticateUser(c: any): Promise<User | null> {
  const authHeader = c.req.header('Authorization');
  const apiKeyHeader = c.req.header('X-API-Key');

  let token = '';
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  } else if (apiKeyHeader) {
    token = apiKeyHeader.trim();
  }

  if (!token) return null;

  const db = c.env.DB;
  if (!db) return null;

  try {
    const user = (await db
      .prepare('SELECT id, email, api_key, is_guest, claim_token, created_at, updated_at FROM users WHERE id = ? OR api_key = ?')
      .bind(token, token)
      .first()) as User | null;
    return user || null;
  } catch {
    return null;
  }
}

// API Auth Guard
const apiAuthMiddleware = async (c: any, next: any) => {
  const user = await authenticateUser(c);
  if (!user) {
    return c.json({ status: 'error', message: 'Unauthorized. Valid Bearer token or X-API-Key required.' }, 401);
  }
  c.set('user', user);
  await next();
};

// -------------------------------------------------------------
// Public Endpoints
// -------------------------------------------------------------

// Health Check
app.get('/health', (c) => c.json({ status: 'ok', service: 'edgelink-worker' }));

// SSR Bio-Profile Handler (GET /@:handle)
app.get('/@:handle', async (c) => {
  const handle = (c.req.param('handle') || '').trim().toLowerCase();
  return handleBio(c, handle);
});

// Support matching encoded @
app.get('/%40:handle', async (c) => {
  const handle = (c.req.param('handle') || '').trim().toLowerCase();
  return handleBio(c, handle);
});

async function handleBio(c: any, handle: string) {
  if (!handle) {
    return c.text('Not Found', 404);
  }

  const kvKey = `bio:${handle}`;
  let cached: CachedBioProfile | null = null;

  // 1. Fast KV Lookup
  if (c.env.KV) {
    try {
      cached = (await c.env.KV.get(kvKey, 'json')) as CachedBioProfile | null;
    } catch {
      cached = null;
    }
  }

  let profile: BioProfile | null | undefined = cached?.profile;
  let links: Link[] | undefined = cached?.links;

  // 2. Fallback to D1
  if (!profile) {
    const db = c.env.DB;
    if (!db) {
      return c.text('Service Unavailable', 503);
    }

    profile = (await db
      .prepare('SELECT * FROM bio_profiles WHERE handle = ?')
      .bind(handle)
      .first()) as BioProfile | null;

    if (!profile) {
      return c.text('Bio profile not found', 404);
    }

    // Fetch active bio links for this profile
    const linksResult = (await db
      .prepare('SELECT * FROM links WHERE user_id = ? AND is_bio_entry = 1 AND is_active = 1 ORDER BY sort_order ASC')
      .bind(profile.user_id)
      .all()) as { results?: Link[] };

    links = linksResult.results || [];

    // Cache in KV for 1 hour
    if (c.env.KV) {
      const toCache: CachedBioProfile = { profile, links };
      safeWaitUntil(c, c.env.KV.put(kvKey, JSON.stringify(toCache), { expirationTtl: 3600 }));
    }
  } else if (!links) {
    links = [];
  }

  const baseUrl = c.env.BASE_URL || new URL(c.req.url).origin;
  const html = renderBioPage(profile, links, baseUrl);
  c.header('Content-Type', 'text/html; charset=utf-8');
  return c.body(html);
}

// Core Redirect Handler (GET /:slug) with Smart Device Routing & Anti-Scan 404 Cache
app.get('/:slug', async (c) => {
  const slug = c.req.param('slug');
  if (slug.startsWith('@')) {
    return handleBio(c, slug.slice(1));
  }
  if (!slug || isReservedSlug(slug)) {
    return c.text('Not Found', 404);
  }

  const kvKey = `slug:${slug}`;
  let cached: CachedSlug | null = null;

  // 1. Fast KV Lookup
  if (c.env.KV) {
    try {
      cached = (await c.env.KV.get(kvKey, 'json')) as CachedSlug | null;
    } catch {
      cached = null;
    }
  }

  // 2. Anti-Scan 404 Cache Check
  if (!cached && c.env.KV) {
    const isNotFound = await c.env.KV.get(`slug:nf:${slug}`).catch(() => null);
    if (isNotFound) {
      return c.text('Link not found', 404);
    }
  }

  let linkId = cached?.id;
  let destinationUrl = cached?.url;
  let iosUrl = cached?.ios_url;
  let androidUrl = cached?.android_url;

  // 3. Fallback to D1
  if (!destinationUrl) {
    const db = c.env.DB;
    if (!db) {
      return c.text('Service Unavailable', 503);
    }

    const row = (await db
      .prepare('SELECT id, destination_url, ios_url, android_url, is_active FROM links WHERE slug = ?')
      .bind(slug)
      .first()) as { id: string; destination_url: string; ios_url?: string; android_url?: string; is_active: number } | null;

    if (!row || row.is_active !== 1) {
      // Cache 404 for 60s in KV to block DB scan attacks
      if (c.env.KV) {
        safeWaitUntil(c, c.env.KV.put(`slug:nf:${slug}`, '1', { expirationTtl: 60 }));
      }
      return c.text('Link not found or inactive', 404);
    }

    linkId = row.id;
    destinationUrl = row.destination_url;
    iosUrl = row.ios_url;
    androidUrl = row.android_url;

    // Cache in KV for 24 hours (86400s)
    if (c.env.KV && linkId) {
      const dataToCache: CachedSlug = { id: linkId, url: destinationUrl, ios_url: iosUrl, android_url: androidUrl };
      safeWaitUntil(c, c.env.KV.put(kvKey, JSON.stringify(dataToCache), { expirationTtl: 86400 }));
    }
  }

  // 4. Smart Device Routing: Detect User-Agent at edge
  const ua = c.req.header('user-agent') || '';
  let finalTarget = destinationUrl;
  if (/iPhone|iPad|iPod/i.test(ua) && iosUrl) {
    finalTarget = iosUrl;
  } else if (/Android/i.test(ua) && androidUrl) {
    finalTarget = androidUrl;
  }

  // 5. Non-blocking aggregated analytics UPSERT in ctx.waitUntil
  if (linkId && c.env.DB) {
    const cfCountry = c.req.header('cf-ipcountry') || 'XX';
    const country = cfCountry.length === 2 ? cfCountry.toUpperCase() : 'XX';
    const date = new Date().toISOString().slice(0, 10); // 'YYYY-MM-DD'

    const upsertPromise = c.env.DB
      .prepare(
        `INSERT INTO link_analytics (link_id, date, country, clicks)
         VALUES (?, ?, ?, 1)
         ON CONFLICT (link_id, date, country)
         DO UPDATE SET clicks = clicks + 1`
      )
      .bind(linkId, date, country)
      .run()
      .catch((err) => {
        console.error('Analytics aggregation error:', err);
      });

    safeWaitUntil(c, upsertPromise);
  }

  // 6. HTTP 302 Redirect
  return c.redirect(finalTarget, 302);
});

// -------------------------------------------------------------
// Authentication Endpoints (/api/auth/*)
// -------------------------------------------------------------

// POST /api/auth/guest - Instant Guest Onboarding (Zero Form, Anti-Bot Rate Limited)
app.post('/api/auth/guest', async (c) => {
  const ip = getClientIp(c);

  // Anti-bot rate limiter: max 5 guest creations per IP per hour
  if (c.env.KV) {
    const rate = await checkRateLimit(c.env.KV, `rate:guest:${ip}`, 5, 3600);
    if (!rate.allowed) {
      return c.json({ status: 'error', message: 'Too many guest workspaces created from this IP. Please wait 1 hour.' }, 429);
    }
  }

  const randomSuffix = Math.random().toString(36).substring(2, 8);
  const userId = `usr_gst_${randomSuffix}`;
  const apiKey = `el_gst_${crypto.randomUUID().replace(/-/g, '')}`;
  const handle = `edge_${randomSuffix}`;
  const email = `guest_${randomSuffix}@edgelink.local`;
  const now = Math.floor(Date.now() / 1000);

  try {
    // 1. Create guest user
    await c.env.DB
      .prepare(
        `INSERT INTO users (id, email, api_key, is_guest, created_at, updated_at)
         VALUES (?, ?, ?, 1, ?, ?)`
      )
      .bind(userId, email, apiKey, now, now)
      .run();

    // 2. Initialize default bio profile
    await c.env.DB
      .prepare(
        `INSERT INTO bio_profiles (user_id, handle, display_name, bio, theme, updated_at)
         VALUES (?, ?, ?, ?, 'minimal-dark', ?)`
      )
      .bind(userId, handle, `Creator ${randomSuffix}`, 'Instant Cloudflare Edge Bio Link', now)
      .run();

    return c.json(
      {
        status: 'success',
        data: {
          user_id: userId,
          handle,
          api_key: apiKey,
          is_guest: 1,
        },
      },
      201
    );
  } catch (err: any) {
    return c.json({ status: 'error', message: err.message || 'Failed to initialize guest workspace' }, 500);
  }
});

// POST /api/auth/send-otp - Dispatch 6-digit verification code with anti-abuse rate limits
app.post('/api/auth/send-otp', async (c) => {
  const ip = getClientIp(c);
  let body: any;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ status: 'error', message: 'Invalid JSON body' }, 400);
  }

  const { email, purpose } = body;
  if (!email || !email.includes('@') || !email.includes('.')) {
    return c.json({ status: 'error', message: 'Valid email address is required' }, 400);
  }

  const cleanEmail = email.trim().toLowerCase();
  const validPurpose = purpose === 'login' ? 'login' : 'claim';

  // 1. IP rate limit: max 10 OTP requests per hour per IP
  if (c.env.KV) {
    const ipRate = await checkRateLimit(c.env.KV, `rate:otp_ip:${ip}`, 10, 3600);
    if (!ipRate.allowed) {
      return c.json({ status: 'error', message: 'Rate limit exceeded. Please wait 1 hour.' }, 429);
    }

    // 2. Cooldown limit: max 1 request per email per 60 seconds
    const emailRate = await checkRateLimit(c.env.KV, `rate:otp_send:${cleanEmail}`, 1, 60);
    if (!emailRate.allowed) {
      return c.json({ status: 'error', message: 'Please wait 60 seconds before requesting another code.' }, 429);
    }
  }

  // Identify user if logged in
  const currentUser = await authenticateUser(c);

  // 3. Generate cryptographically random 6-digit OTP
  const code = generateSecureOtp();
  const now = Math.floor(Date.now() / 1000);

  const otpRecord: OtpRecord = {
    code,
    attempts: 0,
    purpose: validPurpose,
    created_at: now,
    user_id: currentUser?.id,
  };

  // 4. Save to Cloudflare KV with 10-minute (600s) TTL
  if (c.env.KV) {
    await c.env.KV.put(`otp:${cleanEmail}`, JSON.stringify(otpRecord), { expirationTtl: 600 });
  }

  // 5. Dispatch email
  const emailRes = await sendOtpEmail(c.env.RESEND_API_KEY, cleanEmail, code, validPurpose);

  return c.json({
    status: 'success',
    message: `Verification code sent to ${cleanEmail}`,
    // If running in dev/sandbox without Resend API key, provide dev preview for instant verification
    ...(emailRes.preview ? { dev_code: emailRes.preview } : {}),
  });
});

// POST /api/auth/verify-otp - Validate 6-digit code with anti brute-force self-destruct
app.post('/api/auth/verify-otp', async (c) => {
  let body: any;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ status: 'error', message: 'Invalid JSON body' }, 400);
  }

  const { email, code, purpose } = body;
  if (!email || !code) {
    return c.json({ status: 'error', message: 'Email and 6-digit code are required' }, 400);
  }

  const cleanEmail = email.trim().toLowerCase();
  const cleanCode = code.toString().trim();

  if (!c.env.KV) {
    return c.json({ status: 'error', message: 'KV storage unavailable' }, 503);
  }

  // 1. Fetch OTP record
  const rawRecord = await c.env.KV.get(`otp:${cleanEmail}`);
  if (!rawRecord) {
    return c.json({ status: 'error', message: 'Verification code expired or not found. Please request a new one.' }, 400);
  }

  let record: OtpRecord & { used?: boolean };
  try {
    record = JSON.parse(rawRecord);
  } catch {
    return c.json({ status: 'error', message: 'Corrupted verification record' }, 500);
  }

  // 2. Anti-Brute-Force & Replay Check
  if (record.used || record.attempts >= 3) {
    await c.env.KV.delete(`otp:${cleanEmail}`);
    return c.json({ status: 'error', message: 'Verification code has been used or invalidated. Please request a new one.' }, 400);
  }

  // 3. Compare Code
  if (record.code !== cleanCode) {
    record.attempts += 1;
    if (record.attempts >= 3) {
      await c.env.KV.put(`otp:${cleanEmail}`, JSON.stringify({ ...record, attempts: 3, used: true }), { expirationTtl: 60 });
      return c.json({ status: 'error', message: 'Incorrect code. Maximum attempts reached. Code invalidated.' }, 429);
    }
    // Update attempts with remaining TTL
    await c.env.KV.put(`otp:${cleanEmail}`, JSON.stringify(record), { expirationTtl: 600 });
    return c.json({ status: 'error', message: `Invalid code. ${3 - record.attempts} attempts remaining.` }, 401);
  }

  // 4. Code is Valid! Mark as used immediately with 60s tombstone (Single-Use Defense)
  await c.env.KV.put(`otp:${cleanEmail}`, JSON.stringify({ ...record, used: true, attempts: 999 }), { expirationTtl: 60 });

  const now = Math.floor(Date.now() / 1000);
  const db = c.env.DB;
  if (!db) return c.json({ status: 'error', message: 'Database unavailable' }, 503);

  // 5. Handle Claim Workspace
  if (purpose === 'claim' || record.purpose === 'claim') {
    const authUser = await authenticateUser(c);
    const targetUserId = authUser?.id || record.user_id;

    if (!targetUserId) {
      return c.json({ status: 'error', message: 'Session required to claim workspace' }, 401);
    }

    try {
      await db
        .prepare('UPDATE users SET email = ?, is_guest = 0, updated_at = ? WHERE id = ?')
        .bind(cleanEmail, now, targetUserId)
        .run();

      const user = (await db
        .prepare('SELECT id, email, api_key, is_guest FROM users WHERE id = ?')
        .bind(targetUserId)
        .first()) as User | null;

      const profile = (await db
        .prepare('SELECT handle, display_name FROM bio_profiles WHERE user_id = ?')
        .bind(targetUserId)
        .first()) as { handle: string; display_name: string } | null;

      return c.json({
        status: 'success',
        message: 'Email verified and workspace claimed successfully!',
        data: {
          user_id: user?.id,
          email: cleanEmail,
          api_key: user?.api_key,
          handle: profile?.handle || '',
          is_guest: false,
        },
      });
    } catch (err: any) {
      if (err.message && err.message.includes('UNIQUE constraint failed: users.email')) {
        return c.json({ status: 'error', message: 'This email is already associated with another account' }, 409);
      }
      return c.json({ status: 'error', message: 'Failed to update account' }, 500);
    }
  }

  // 6. Handle Passwordless Login via Verified Email
  let user = (await db
    .prepare('SELECT id, email, api_key, is_guest FROM users WHERE email = ?')
    .bind(cleanEmail)
    .first()) as User | null;

  if (!user) {
    // Magic Onboarding: Auto-create account for verified email
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const userId = `usr_${randomSuffix}`;
    const apiKey = `el_${crypto.randomUUID().replace(/-/g, '')}`;
    const handle = `u_${randomSuffix}`;

    await db
      .prepare('INSERT INTO users (id, email, api_key, is_guest, created_at, updated_at) VALUES (?, ?, ?, 0, ?, ?)')
      .bind(userId, cleanEmail, apiKey, now, now)
      .run();

    await db
      .prepare('INSERT INTO bio_profiles (user_id, handle, display_name, theme, updated_at) VALUES (?, ?, ?, ?, ?)')
      .bind(userId, handle, cleanEmail.split('@')[0], 'minimal-dark', now)
      .run();

    return c.json({
      status: 'success',
      message: 'New verified workspace created',
      data: {
        user_id: userId,
        email: cleanEmail,
        api_key: apiKey,
        handle,
        is_guest: false,
      },
    });
  }

  const profile = (await db
    .prepare('SELECT handle, display_name FROM bio_profiles WHERE user_id = ?')
    .bind(user.id)
    .first()) as { handle: string; display_name: string } | null;

  return c.json({
    status: 'success',
    message: 'Login verified',
    data: {
      user_id: user.id,
      email: user.email,
      api_key: user.api_key,
      handle: profile?.handle || '',
      display_name: profile?.display_name || '',
      is_guest: Boolean(user.is_guest),
    },
  });
});

// POST /api/auth/claim - Claim Guest Account with permanent email (Direct legacy / token)
app.post('/api/auth/claim', apiAuthMiddleware, async (c) => {
  const user = c.get('user') as User;
  let body: any;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ status: 'error', message: 'Invalid JSON body' }, 400);
  }

  const { email } = body;
  if (!email || !email.includes('@') || !email.includes('.')) {
    return c.json({ status: 'error', message: 'A valid email address is required' }, 400);
  }

  const cleanEmail = email.trim().toLowerCase();
  const now = Math.floor(Date.now() / 1000);

  try {
    await c.env.DB
      .prepare('UPDATE users SET email = ?, is_guest = 0, updated_at = ? WHERE id = ?')
      .bind(cleanEmail, now, user.id)
      .run();

    return c.json({ status: 'success', message: 'Workspace claimed successfully' });
  } catch (err: any) {
    if (err.message && err.message.includes('UNIQUE constraint failed: users.email')) {
      return c.json({ status: 'error', message: 'This email is already associated with an account' }, 409);
    }
    return c.json({ status: 'error', message: 'Failed to claim workspace' }, 500);
  }
});

// GET /api/auth/me - Get current session
app.get('/api/auth/me', apiAuthMiddleware, async (c) => {
  const user = c.get('user') as User;
  const profile = (await c.env.DB
    .prepare('SELECT handle, display_name FROM bio_profiles WHERE user_id = ?')
    .bind(user.id)
    .first()) as { handle: string; display_name: string } | null;

  return c.json({
    status: 'success',
    data: {
      id: user.id,
      email: user.email,
      is_guest: Boolean(user.is_guest),
      handle: profile?.handle || '',
      display_name: profile?.display_name || '',
      api_key: user.api_key || '',
    },
  });
});

// POST /api/auth/login - Connect / Sync existing workspace from another device
app.post('/api/auth/login', async (c) => {
  const ip = getClientIp(c);

  // Anti-brute force limiter: max 10 login attempts per IP per 5 minutes
  if (c.env.KV) {
    const rate = await checkRateLimit(c.env.KV, `rate:login:${ip}`, 10, 300);
    if (!rate.allowed) {
      return c.json(
        { status: 'error', message: 'Too many login attempts. Please wait 5 minutes.' },
        429
      );
    }
  }

  let body: any;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ status: 'error', message: 'Invalid JSON body' }, 400);
  }

  const credential = (body.credential || '').trim();
  if (!credential) {
    return c.json({ status: 'error', message: 'Email or Access Key is required' }, 400);
  }

  const db = c.env.DB;
  if (!db) {
    return c.json({ status: 'error', message: 'Database unavailable' }, 503);
  }

  let user: User | null = null;
  if (credential.includes('@')) {
    // Lookup by registered email
    user = (await db
      .prepare('SELECT id, email, api_key, is_guest FROM users WHERE email = ? AND is_guest = 0')
      .bind(credential.toLowerCase())
      .first()) as User | null;
  } else {
    // Lookup by Access Key / API Key / Token
    user = (await db
      .prepare('SELECT id, email, api_key, is_guest FROM users WHERE api_key = ? OR id = ?')
      .bind(credential, credential)
      .first()) as User | null;
  }

  if (!user || !user.api_key) {
    return c.json({ status: 'error', message: 'Invalid credentials. Account not found.' }, 401);
  }

  const profile = (await db
    .prepare('SELECT handle, display_name FROM bio_profiles WHERE user_id = ?')
    .bind(user.id)
    .first()) as { handle: string; display_name: string } | null;

  return c.json({
    status: 'success',
    data: {
      user_id: user.id,
      email: user.email,
      api_key: user.api_key,
      handle: profile?.handle || '',
      display_name: profile?.display_name || '',
      is_guest: Boolean(user.is_guest),
    },
  });
});

// -------------------------------------------------------------
// Management REST API Endpoints (/api/links, /api/bio-profile)
// -------------------------------------------------------------

// POST /api/links - Create shortlink or bio card with Smart Device Routing & Anti-Bot
app.post('/api/links', apiAuthMiddleware, async (c) => {
  const user = c.get('user') as User;
  const ip = getClientIp(c);

  // Anti-bot rate limiter: max 30 links per IP per minute
  if (c.env.KV) {
    const rate = await checkRateLimit(c.env.KV, `rate:link:${ip}`, 30, 60);
    if (!rate.allowed) {
      return c.json({ status: 'error', message: 'Rate limit exceeded. Maximum 30 links per minute.' }, 429);
    }
  }

  let body: any;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ status: 'error', message: 'Invalid JSON body' }, 400);
  }

  const { destination_url, title, is_bio_entry, sort_order, ios_url, android_url } = body;
  let slug = (body.slug || '').trim();

  if (!destination_url) {
    return c.json({ status: 'error', message: 'destination_url is required' }, 400);
  }

  // Validate Destination URL
  const validation = validateDestinationUrl(destination_url);
  if (!validation.valid) {
    return c.json({ status: 'error', message: validation.error }, 422);
  }

  // Validate Smart Device URLs if provided
  if (ios_url) {
    const vIos = validateDestinationUrl(ios_url);
    if (!vIos.valid) return c.json({ status: 'error', message: `iOS URL: ${vIos.error}` }, 422);
  }
  if (android_url) {
    const vAndroid = validateDestinationUrl(android_url);
    if (!vAndroid.valid) return c.json({ status: 'error', message: `Android URL: ${vAndroid.error}` }, 422);
  }

  // Check or Generate Slug
  if (slug) {
    if (isReservedSlug(slug)) {
      return c.json({ status: 'error', message: `Slug '${slug}' is reserved` }, 400);
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(slug)) {
      return c.json({ status: 'error', message: 'Slug can only contain alphanumeric characters, hyphens, and underscores' }, 400);
    }
  } else {
    let attempts = 0;
    while (attempts < 5) {
      const candidate = generateRandomSlug(6);
      if (!isReservedSlug(candidate)) {
        const existing = await c.env.DB
          .prepare('SELECT id FROM links WHERE slug = ?')
          .bind(candidate)
          .first();
        if (!existing) {
          slug = candidate;
          break;
        }
      }
      attempts++;
    }
    if (!slug) {
      return c.json({ status: 'error', message: 'Failed to generate unique slug' }, 500);
    }
  }

  const id = `lnk_${crypto.randomUUID().replace(/-/g, '')}`;
  const now = Math.floor(Date.now() / 1000);
  const bioEntryFlag = is_bio_entry ? 1 : 0;
  const sort = typeof sort_order === 'number' ? sort_order : 0;

  const blockType = (body.block_type || 'link').toLowerCase();

  try {
    await c.env.DB
      .prepare(
        `INSERT INTO links (id, user_id, slug, destination_url, ios_url, android_url, title, is_bio_entry, sort_order, is_active, block_type, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`
      )
      .bind(id, user.id, slug, destination_url, ios_url || null, android_url || null, title || null, bioEntryFlag, sort, blockType, now)
      .run();
  } catch (err: any) {
    if (err.message && err.message.includes('UNIQUE constraint failed: links.slug')) {
      return c.json({ status: 'error', message: `Slug '${slug}' already exists` }, 409);
    }
    return c.json({ status: 'error', message: 'Database insert failed' }, 500);
  }

  // Populate KV cache with smart device targets
  if (c.env.KV) {
    const dataToCache: CachedSlug = { id, url: destination_url, ios_url: ios_url || undefined, android_url: android_url || undefined };
    safeWaitUntil(c, c.env.KV.put(`slug:${slug}`, JSON.stringify(dataToCache), { expirationTtl: 86400 }));
    // Invalidate 404 cache if previously hit
    safeWaitUntil(c, c.env.KV.delete(`slug:nf:${slug}`).catch(() => {}));
  }

  const baseUrl = c.env.BASE_URL || new URL(c.req.url).origin;
  return c.json(
    {
      status: 'success',
      data: {
        id,
        slug,
        short_url: `${baseUrl}/${slug}`,
        destination_url,
        ios_url: ios_url || null,
        android_url: android_url || null,
        title,
        is_bio_entry: bioEntryFlag,
        sort_order: sort,
        is_active: 1,
        block_type: blockType,
        clicks: 0,
        created_at: now
      }
    },
    201
  );
});

// GET /api/links - List user links
app.get('/api/links', apiAuthMiddleware, async (c) => {
  const user = c.get('user') as User;
  const filter = c.req.query('filter');
  const page = Math.max(1, parseInt(c.req.query('page') || '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(c.req.query('limit') || '50', 10)));
  const offset = (page - 1) * limit;

  let query = `
    SELECT l.id, l.slug, l.destination_url, l.ios_url, l.android_url, l.title, l.is_bio_entry, l.sort_order, l.is_active, l.created_at,
           COALESCE(SUM(la.clicks), 0) AS clicks
    FROM links l
    LEFT JOIN link_analytics la ON l.id = la.link_id
    WHERE l.user_id = ?
  `;
  const bindings: any[] = [user.id];

  if (filter === 'bio') {
    query += ' AND l.is_bio_entry = 1';
  } else if (filter === 'shortlink') {
    query += ' AND l.is_bio_entry = 0';
  }

  query += ' GROUP BY l.id ORDER BY l.created_at DESC LIMIT ? OFFSET ?';
  bindings.push(limit, offset);

  try {
    const res = (await c.env.DB.prepare(query).bind(...bindings).all()) as { results?: any[] };
    return c.json({
      status: 'success',
      data: res.results || []
    });
  } catch (err: any) {
    return c.json({ status: 'error', message: err.message || 'Failed to list links' }, 500);
  }
});

// GET /api/links/:id/analytics - Get click stats by date and country
app.get('/api/links/:id/analytics', apiAuthMiddleware, async (c) => {
  const user = c.get('user') as User;
  const linkId = c.req.param('id');
  const range = c.req.query('range') || '30d';

  const link = await c.env.DB
    .prepare('SELECT id FROM links WHERE id = ? AND user_id = ?')
    .bind(linkId, user.id)
    .first();

  if (!link) {
    return c.json({ status: 'error', message: 'Link not found' }, 404);
  }

  const days = range === '7d' ? 7 : 30;
  const sinceDate = new Date(Date.now() - days * 86400 * 1000).toISOString().slice(0, 10);

  const dateResult = (await c.env.DB
    .prepare(
      `SELECT date, SUM(clicks) as clicks
       FROM link_analytics
       WHERE link_id = ? AND date >= ?
       GROUP BY date
       ORDER BY date ASC`
    )
    .bind(linkId, sinceDate)
    .all()) as { results?: any[] };

  const countryResult = (await c.env.DB
    .prepare(
      `SELECT country, SUM(clicks) as clicks
       FROM link_analytics
       WHERE link_id = ? AND date >= ?
       GROUP BY country
       ORDER BY clicks DESC`
    )
    .bind(linkId, sinceDate)
    .all()) as { results?: any[] };

  const byDate = dateResult.results || [];
  const byCountry = countryResult.results || [];
  const totalClicks = byDate.reduce((sum, item) => sum + (item.clicks || 0), 0);

  return c.json({
    status: 'success',
    data: {
      total_clicks: totalClicks,
      by_date: byDate,
      by_country: byCountry
    }
  });
});

// GET /api/bio-profile - Get bio profile of authenticated user
app.get('/api/bio-profile', apiAuthMiddleware, async (c) => {
  const user = c.get('user') as User;
  const profile = (await c.env.DB
    .prepare('SELECT * FROM bio_profiles WHERE user_id = ?')
    .bind(user.id)
    .first()) as BioProfile | null;

  if (!profile) {
    const defaultProfile = {
      handle: user.id.replace(/^usr_(gst_)?/, ''),
      display_name: user.email.split('@')[0],
      bio: '',
      avatar_url: '',
      theme: 'minimal-dark',
      social_links: {}
    };
    return c.json({ status: 'success', data: defaultProfile });
  }

  let socialLinks = {};
  if (profile.social_links) {
    try {
      socialLinks = JSON.parse(profile.social_links);
    } catch {
      socialLinks = {};
    }
  }

  return c.json({
    status: 'success',
    data: {
      handle: profile.handle,
      display_name: profile.display_name,
      bio: profile.bio || '',
      avatar_url: profile.avatar_url || '',
      theme: profile.theme || 'minimal-dark',
      social_links: socialLinks
    }
  });
});

// PATCH /api/links/:id - Toggle link active state
app.patch('/api/links/:id', apiAuthMiddleware, async (c) => {
  const user = c.get('user') as User;
  const linkId = c.req.param('id');
  let body: any;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ status: 'error', message: 'Invalid JSON body' }, 400);
  }

  const { is_active, block_type } = body;
  if (is_active === undefined && block_type === undefined) {
    return c.json({ status: 'error', message: 'is_active or block_type is required' }, 400);
  }

  const link = (await c.env.DB
    .prepare('SELECT * FROM links WHERE id = ? AND user_id = ?')
    .bind(linkId, user.id)
    .first()) as Link | null;

  if (!link) {
    return c.json({ status: 'error', message: 'Link not found' }, 404);
  }

  if (is_active !== undefined) {
    const activeVal = is_active ? 1 : 0;
    await c.env.DB
      .prepare('UPDATE links SET is_active = ? WHERE id = ? AND user_id = ?')
      .bind(activeVal, linkId, user.id)
      .run();

    if (c.env.KV) {
      if (activeVal === 1) {
        safeWaitUntil(
          c,
          c.env.KV.put(
            `slug:${link.slug}`,
            JSON.stringify({ url: link.destination_url, id: link.id, ios_url: link.ios_url, android_url: link.android_url }),
            { expirationTtl: 86400 }
          ).catch(() => {})
        );
      } else {
        safeWaitUntil(c, c.env.KV.delete(`slug:${link.slug}`).catch(() => {}));
      }
    }
  }

  if (block_type !== undefined) {
    await c.env.DB
      .prepare('UPDATE links SET block_type = ? WHERE id = ? AND user_id = ?')
      .bind(block_type, linkId, user.id)
      .run();
  }

  return c.json({ status: 'success', message: 'Link updated' });
});

// PUT /api/links/reorder - Update link sort order
app.put('/api/links/reorder', apiAuthMiddleware, async (c) => {
  const user = c.get('user') as User;
  let body: any;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ status: 'error', message: 'Invalid JSON body' }, 400);
  }

  const items = body.items;
  if (!Array.isArray(items)) {
    return c.json({ status: 'error', message: 'items array is required' }, 400);
  }

  const statements = items.map((item: { id: string; sort_order: number }) =>
    c.env.DB.prepare('UPDATE links SET sort_order = ? WHERE id = ? AND user_id = ?')
      .bind(item.sort_order, item.id, user.id)
  );

  if (statements.length > 0) {
    await c.env.DB.batch(statements);
  }

  return c.json({ status: 'success', message: 'Links reordered' });
});

// DELETE /api/links/:id - Delete a link
app.delete('/api/links/:id', apiAuthMiddleware, async (c) => {
  const user = c.get('user') as User;
  const linkId = c.req.param('id');

  const link = (await c.env.DB
    .prepare('SELECT * FROM links WHERE id = ? AND user_id = ?')
    .bind(linkId, user.id)
    .first()) as Link | null;

  if (!link) {
    return c.json({ status: 'error', message: 'Link not found' }, 404);
  }

  await c.env.DB
    .prepare('DELETE FROM links WHERE id = ? AND user_id = ?')
    .bind(linkId, user.id)
    .run();

  if (c.env.KV) {
    safeWaitUntil(c, c.env.KV.delete(`slug:${link.slug}`).catch(() => {}));
  }

  return c.json({ status: 'success', message: 'Link deleted' });
});

// PUT /api/bio-profile - Update bio profile
app.put('/api/bio-profile', apiAuthMiddleware, async (c) => {
  const user = c.get('user') as User;
  let body: any;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ status: 'error', message: 'Invalid JSON body' }, 400);
  }

  const { handle, display_name, bio, avatar_url, theme, social_links, avatar_shape, verified_badge } = body;

  const existing = (await c.env.DB
    .prepare('SELECT * FROM bio_profiles WHERE user_id = ?')
    .bind(user.id)
    .first()) as BioProfile | null;

  const newHandle = (handle !== undefined ? handle : existing?.handle || user.id).trim().toLowerCase();
  const newDisplayName = display_name !== undefined ? display_name : existing?.display_name || user.email.split('@')[0];
  const newBio = bio !== undefined ? bio : existing?.bio || null;
  const newAvatarUrl = avatar_url !== undefined ? avatar_url : existing?.avatar_url || null;
  const newTheme = theme !== undefined ? theme : existing?.theme || 'obsidian';
  const newAvatarShape = avatar_shape !== undefined ? avatar_shape : existing?.avatar_shape || 'circle';
  const newVerifiedBadge = verified_badge !== undefined ? (verified_badge ? 1 : 0) : existing?.verified_badge || 0;

  let newSocialLinks: string | null = null;
  if (social_links !== undefined) {
    if (typeof social_links === 'string') {
      newSocialLinks = social_links;
    } else if (typeof social_links === 'object' && social_links !== null) {
      newSocialLinks = JSON.stringify(social_links);
    }
  } else {
    newSocialLinks = existing?.social_links || null;
  }

  if (isReservedSlug(newHandle)) {
    return c.json({ status: 'error', message: `Handle '${newHandle}' is reserved` }, 400);
  }

  if (!/^[a-zA-Z0-9_.-]+$/.test(newHandle)) {
    return c.json({ status: 'error', message: 'Handle contains invalid characters' }, 400);
  }

  const now = Math.floor(Date.now() / 1000);

  try {
    await c.env.DB
      .prepare(
        `INSERT INTO bio_profiles (user_id, handle, display_name, bio, avatar_url, social_links, theme, avatar_shape, verified_badge, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT (user_id) DO UPDATE SET
           handle = excluded.handle,
           display_name = excluded.display_name,
           bio = excluded.bio,
           avatar_url = excluded.avatar_url,
           social_links = excluded.social_links,
           theme = excluded.theme,
           avatar_shape = excluded.avatar_shape,
           verified_badge = excluded.verified_badge,
           updated_at = excluded.updated_at`
      )
      .bind(user.id, newHandle, newDisplayName, newBio, newAvatarUrl, newSocialLinks, newTheme, newAvatarShape, newVerifiedBadge, now)
      .run();
  } catch (err: any) {
    if (err.message && err.message.includes('UNIQUE constraint failed: bio_profiles.handle')) {
      return c.json({ status: 'error', message: `Handle '${newHandle}' is already taken` }, 409);
    }
    return c.json({ status: 'error', message: 'Failed to save bio profile' }, 500);
  }

  // Invalidate old & new handle in KV cache
  if (c.env.KV) {
    safeWaitUntil(
      c,
      Promise.all([
        c.env.KV.delete(`bio:${newHandle}`).catch(() => {}),
        existing?.handle && existing.handle !== newHandle
          ? c.env.KV.delete(`bio:${existing.handle}`).catch(() => {})
          : Promise.resolve()
      ])
    );
  }

  return c.json({
    status: 'success',
    data: {
      handle: newHandle,
      display_name: newDisplayName,
      bio: newBio,
      avatar_url: newAvatarUrl,
      theme: newTheme,
      social_links: newSocialLinks ? JSON.parse(newSocialLinks) : {}
    }
  });
});

export default app;
