import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { BUSINESS_TYPES, INDUSTRIES, BLOCK_LABELS, CATALOG_LABELS, defaultBusinessData, isBusinessBlock, isContentBlock, readBusiness, validateBusinessData, validateBusinessSettings } from '../../shared/business.js';
import { bodyLimit } from 'hono/body-limit';
import type { Env, User, BioProfile, Link, CachedSlug, CachedBioProfile, OtpRecord } from './types.js';
import { isReservedSlug, validateDestinationUrl, checkRateLimit, generateSecureOtp, sendOtpEmail } from './security.js';
import { validateStyleJson, validateProfilePatch } from './profileValidation.js';
import { issueChallenge, attemptChallenge } from './authChallenges.js';
import { readObject } from '../../shared/bio.js';
import { renderBioPage } from './bio.js';
import { AVATAR_MAX_BYTES, MEDIA_MAX_BYTES, sniffImage, contentHash, mediaPrefix, isValidMediaKey, cleanupMediaIfDue } from './media.js';
import { renderDocsHtml } from './docs.js';
import { renderLegalPage } from './legalPages.js';
import { expireGuestWorkspaces } from './guestCleanup.js';
import { unsafePlainTextReason } from './contentSafety.js';
import { installAdminRoutes } from './admin.js';
import { cachedPublicResponse, publicCacheControl, ASSET_CACHE, MEDIA_CACHE_POLICY, SEO_CACHE, SITEMAP_CACHE } from './publicCache.js';
import { renderRobotsTxt, renderSitemapXml, SITEMAP_PROFILES_SQL, isLikelyBot, type SitemapProfileRow } from './seo.js';

const app = new Hono<{ Bindings: Env; Variables: { user?: User } }>();

// Enable CORS for API routes
app.use('/api/*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-Admin-Session'],
}));

// 0. Pindah domain: 1stdev.link adalah domain utama.
// Domain lama tetap melayani API (integrasi pihak ketiga) dan media (URL foto lama di database),
// serta halaman dashboard "/" agar sesi yang tersimpan di domain lama bisa dibawa lewat handoff.
// Selain itu, GET/HEAD dialihkan permanen (301) ke path yang sama: link pendek lama tetap jalan.
const PRIMARY_HOST = '1stdev.link';
const LEGACY_HOSTS = new Set(['link.1stnear.com', 'www.1stdev.link']);

app.use('*', async (c, next) => {
  if (c.env.DOMAIN_REDIRECT !== 'on') return next();
  const url = new URL(c.req.url);
  if (!LEGACY_HOSTS.has(url.hostname)) return next();
  const p = url.pathname;
  const isReadRequest = c.req.method === 'GET' || c.req.method === 'HEAD';
  const keepOnLegacy =
    url.hostname === 'link.1stnear.com' &&
    (p === '/' || p.startsWith('/assets/') || p.startsWith('/api/') || p.startsWith('/m/'));
  if (!isReadRequest || keepOnLegacy) return next();
  return c.redirect(`https://${PRIMARY_HOST}${p}${url.search}`, 301);
});

// 1. Global Security Headers Middleware
app.use('*', async (c, next) => {
  await next();
  c.header('X-Content-Type-Options', 'nosniff');
  c.header('X-Permitted-Cross-Domain-Policies', 'none');
  c.header('Permissions-Policy', 'geolocation=(), microphone=(), payment=()');
  c.header('X-Frame-Options', 'DENY');
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
  // API JSON tidak untuk mesin pencari.
  if (c.req.path.startsWith('/api/')) {
    c.header('X-Robots-Tag', 'noindex, nofollow');
    c.header('Cache-Control', 'no-store');
  }
  c.header(
    'Content-Security-Policy',
    // Dashboard SPA (proxied from Pages) + SSR bio: own CSS/JS, Google Fonts, inline styles.
    // Inline scripts and third-party scripts (incl. injected analytics beacons) stay blocked.
    "default-src 'self'; script-src 'self'; object-src 'none'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
      "font-src 'self' https://fonts.gstatic.com data:; img-src * data: blob:; connect-src 'self'; " +
      "frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
  );
  // HTML: `no-transform` stops the Cloudflare zone from injecting its Web Analytics beacon
  // (third-party tracker, forbidden on bio pages) and the CSP console errors it causes.
  if ((c.res.headers.get('content-type') || '').includes('text/html')) {
    const cc = c.res.headers.get('cache-control');
    if (!cc || !/no-transform/i.test(cc)) {
      c.header('Cache-Control', cc ? `${cc}, no-transform` : 'no-transform');
    }
  }
});

// Bound JSON parsing and reject primitive bodies before route destructuring.
const jsonBodyLimit = bodyLimit({ maxSize: 65536, onError: (c) => c.json({ status: 'error', message: 'Payload too large' }, 413) });
app.use('/api/*', (c, next) => c.req.path.startsWith('/api/media/') ? next() : jsonBodyLimit(c, next));
app.use('/api/*', async (c, next) => {
  if (!c.req.path.startsWith('/api/media/') && ['POST', 'PUT', 'PATCH'].includes(c.req.method) && c.req.raw.body) {
    try {
      const text = await c.req.text();
      if (!text.trim()) return next();
      const body = JSON.parse(text);
      if (!body || typeof body !== 'object' || Array.isArray(body)) return c.json({ status: 'error', message: 'JSON object required' }, 400);
    } catch { return c.json({ status: 'error', message: 'Invalid JSON body' }, 400); }
  }
  return next();
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

function scheduleMediaCleanup(c: any, userId: string) {
  if (c.env.MEDIA && c.env.DB) safeWaitUntil(c, cleanupMediaIfDue(c.env.MEDIA, c.env.DB, userId).catch(() => 0));
}

// Helper: Generate Base62 Random Slug
function generateRandomSlug(length = 6): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (byte) => chars[byte % chars.length]).join('');
}

// Helper: Get Client IP
function getClientIp(c: any): string {
  // X-Forwarded-For is visitor-controlled; Cloudflare assigns cf-connecting-ip.
  return c.req.header('cf-connecting-ip') || 'unknown';
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
    // Hanya api_key. Id user tampil publik (mis. URL foto profil), jadi tidak boleh jadi token.
    const user = (await db
      .prepare('SELECT id, email, api_key, is_guest, claim_token, created_at, updated_at FROM users WHERE api_key = ?')
      .bind(token)
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

// -------------------------------------------------------------
// Media (foto profil di R2)
// -------------------------------------------------------------

const MEDIA_CACHE = publicCacheControl(MEDIA_CACHE_POLICY);

async function readLimitedImage(request: Request, maxBytes: number): Promise<ArrayBuffer | null> {
  if (!request.body) return new ArrayBuffer(0);
  const reader = request.body.getReader(), chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      size += part.value.byteLength;
      if (size > maxBytes) { void reader.cancel().catch(() => {}); return null; }
      chunks.push(part.value);
    }
  } finally { reader.releaseLock(); }
  const result = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { result.set(chunk, offset); offset += chunk.byteLength; }
  return result.buffer;
}

const SLUG_PATTERN = /^[a-zA-Z0-9_-]{3,30}$/;
const REDIRECT_SLUG_PATTERN = /^[a-zA-Z0-9_-]{1,100}$/;
const negativeSlugWrites = new Map<string, Promise<unknown>>();
function negativeSlugKey(c: any, slug: string): Request {
  return new Request(new URL(`/__edgelink_slug_miss/${encodeURIComponent(slug)}`, c.env.BASE_URL || new URL(c.req.url).origin).toString());
}
async function clearNegativeSlug(c: any, slug: string): Promise<void> {
  if (typeof caches === 'undefined') return;
  const key = negativeSlugKey(c, slug);
  try {
    await negativeSlugWrites.get(key.url)?.catch(() => {});
    await caches.default.delete(key);
  } catch { /* A cache outage must not undo a successful database mutation. */ }
}

// Upload media (foto profil, cover banner, background).
app.post('/api/media/:type', apiAuthMiddleware, async (c) => {
  const user = c.get('user') as User;
  const rawType = c.req.param('type');
  const typeMap: Record<string, { folder: string; maxBytes: number }> = {
    avatar: { folder: 'avatars', maxBytes: AVATAR_MAX_BYTES },
    cover: { folder: 'covers', maxBytes: MEDIA_MAX_BYTES },
    background: { folder: 'backgrounds', maxBytes: MEDIA_MAX_BYTES },
  };

  const target = typeMap[rawType];
  if (!target) {
    return c.json({ status: 'error', message: 'Invalid media type. Allowed: avatar, cover, background' }, 400);
  }

  if (!c.env.MEDIA) {
    return c.json({ status: 'error', message: 'Media storage is not available' }, 503);
  }
  if (user.is_guest) {
    return c.json({ status: 'error', message: 'Save your account first to upload images' }, 403);
  }

  const declared = Number(c.req.header('Content-Length') || 0);
  if (declared > target.maxBytes) {
    return c.json({ status: 'error', message: `Image too large (max ${Math.round(target.maxBytes / 1024)} KB)` }, 413);
  }

  const rate = await checkRateLimit(c.env.KV, `rate:media:${user.id}`, 20, 3600, c.env.DB);
  if (rate.serviceUnavailable) return c.json({ status: 'error', message: 'Rate limiting unavailable. Please retry.' }, 503);
  if (!rate.allowed) {
    return c.json({ status: 'error', message: 'Too many uploads. Try again later.' }, 429);
  }

  const buf = await readLimitedImage(c.req.raw, target.maxBytes);
  if (buf === null) return c.json({ status: 'error', message: `Image too large (max ${Math.round(target.maxBytes / 1024)} KB)` }, 413);
  if (buf.byteLength === 0) {
    return c.json({ status: 'error', message: 'Empty body' }, 400);
  }
  if (buf.byteLength > target.maxBytes) {
    return c.json({ status: 'error', message: `Image too large (max ${Math.round(target.maxBytes / 1024)} KB)` }, 413);
  }

  const kind = sniffImage(new Uint8Array(buf, 0, Math.min(16, buf.byteLength)));
  if (!kind) {
    return c.json({ status: 'error', message: 'Only WebP, JPEG, or PNG images are allowed' }, 415);
  }

  const key = `${mediaPrefix(target.folder, user.id)}${await contentHash(buf)}.${kind.ext}`;
  await c.env.MEDIA.put(key, buf, { httpMetadata: { contentType: kind.mime, cacheControl: MEDIA_CACHE } });
  scheduleMediaCleanup(c, user.id);

  const base = (c.env.BASE_URL || new URL(c.req.url).origin).replace(/\/$/, '');
  return c.json({ status: 'success', data: { url: `${base}/m/${key}` } });
});

// Media publik memakai nama hash isi; cache dapat dipakai ulang sampai TTL berakhir.
app.get('/m/:folder/:uid/:file', async (c) => {
  const key = `${c.req.param('folder')}/${c.req.param('uid')}/${c.req.param('file')}`;
  if (!c.env.MEDIA || !isValidMediaKey(key)) return c.text('Not found', 404);

  return cachedPublicResponse(c.req.raw, MEDIA_CACHE_POLICY, async () => {
    const obj = await c.env.MEDIA!.get(key);
    if (!obj) return c.text('Not found', 404);
    return new Response(obj.body, {
      headers: {
        'Content-Type': obj.httpMetadata?.contentType || 'application/octet-stream',
        'Cache-Control': MEDIA_CACHE,
        ETag: obj.httpEtag,
        'X-Content-Type-Options': 'nosniff',
        'Content-Security-Policy': "default-src 'none'; sandbox",
        'Cross-Origin-Resource-Policy': 'cross-origin',
      },
    });
  }, (task) => safeWaitUntil(c, task));
});

// Developer API Documentation (Live HTML & spec)
app.get('/docs', (c) => c.html(renderDocsHtml()));
app.get('/api/docs', (c) => c.html(renderDocsHtml()));

const PAGES_ORIGIN = 'https://edgelink-afl.pages.dev';

// Only public byte ranges are forwarded; dashboard credentials must never reach Pages.
function fetchPublicFile(path: string, request: Request): Promise<Response> {
  const headers = new Headers();
  for (const name of ['range', 'if-range']) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  // Fetch a full GET on HEAD/conditional misses so the cache never stores an empty body or 304.
  return fetch(`${PAGES_ORIGIN}${path}`, { method: 'GET', headers, redirect: 'manual' });
}

// Serve SPA Dashboard and Static Assets directly on link.1stnear.com
app.get('/assets/*', async (c) => {
  const url = new URL(c.req.url);
  return cachedPublicResponse(c.req.raw, ASSET_CACHE,
    () => fetchPublicFile(`${url.pathname}${url.search}`, c.req.raw), (task) => safeWaitUntil(c, task));
});

app.get('/vite.svg', async (c) => {
  return cachedPublicResponse(c.req.raw, SEO_CACHE,
    () => fetchPublicFile('/vite.svg', c.req.raw), (task) => safeWaitUntil(c, task));
});

app.get('/favicon.ico', async (c) => {
  return cachedPublicResponse(c.req.raw, SEO_CACHE,
    () => fetchPublicFile('/favicon.ico', c.req.raw), (task) => safeWaitUntil(c, task));
});

// ---------- SEO & GEO ----------
app.get('/robots.txt', (c) => {
  const baseUrl = c.env.BASE_URL || new URL(c.req.url).origin;
  return c.text(renderRobotsTxt(baseUrl), 200, { 'cache-control': 'public, max-age=86400' });
});

app.get('/sitemap.xml', async (c) => {
  const baseUrl = c.env.BASE_URL || new URL(c.req.url).origin;
  return cachedPublicResponse(c.req.raw, SITEMAP_CACHE, async () => {
    let rows: SitemapProfileRow[] = [];
    if (c.env.DB) {
      try {
        const res = (await c.env.DB.prepare(SITEMAP_PROFILES_SQL).all()) as { results?: SitemapProfileRow[] };
        rows = res.results || [];
      } catch (err) {
        console.error('sitemap query failed:', err);
        return c.text('Temporarily unavailable', 503);
      }
    }
    return new Response(renderSitemapXml(baseUrl, rows), {
      headers: { 'content-type': 'application/xml; charset=utf-8' },
    });
  }, (task) => safeWaitUntil(c, task));
});

// Aset statis SEO/GEO dari Pages (web/public): kartu sosial, ikon, manifest, llms.txt.
const STATIC_SEO_FILES = ['/og.png', '/apple-touch-icon.png', '/icon-192.png', '/icon-512.png', '/site.webmanifest', '/llms.txt', '/llms-full.txt'];
for (const path of STATIC_SEO_FILES) {
  app.get(path, async (c) => {
    return cachedPublicResponse(c.req.raw, SEO_CACHE,
      () => fetchPublicFile(path, c.req.raw), (task) => safeWaitUntil(c, task));
  });
}

// Public, server-rendered legal documents readable without client-side JavaScript.
for (const document of ['privacy', 'terms'] as const) {
  app.get('/' + document, (c) => {
    const languageParam = c.req.query('lang');
    const lang = languageParam === 'en' ? 'en' : languageParam === 'id' ? 'id' :
      (c.req.header('accept-language') || '').toLowerCase().startsWith('en') ? 'en' : 'id';
    return c.html(renderLegalPage(document, lang, c.env.BASE_URL || 'https://1stdev.link'), 200, {
      'Cache-Control': 'public, max-age=300',
      'Vary': 'Accept-Language',
    });
  });
}

// Root - Serve Dashboard SPA directly (no redirect, URL stays link.1stnear.com)
app.get('/', async (c) => {
  const resp = await fetch(`${PAGES_ORIGIN}/`, c.req.raw);
  const html = await resp.text();
  return c.html(html, 200, {
    'cache-control': 'no-cache, no-store, must-revalidate',
  });
});

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
  if (!profile || typeof profile.is_guest !== 'number') {
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

    const owner = await db.prepare('SELECT is_guest FROM users WHERE id = ?').bind(profile.user_id).first() as { is_guest?: number } | null;
    if (!owner) return c.text('Bio profile not found', 404);
    profile = { ...profile, is_guest: owner.is_guest ? 1 : 0 };

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
  const acceptLanguage = c.req.header('accept-language') || '';
  const html = renderBioPage(profile, links, baseUrl, acceptLanguage);
  c.header('Content-Type', 'text/html; charset=utf-8');
  return c.body(html);
}

// Core Redirect Handler (GET /:slug) with Smart Device Routing & Anti-Scan 404 Cache
app.get('/:slug', async (c) => {
  const slug = c.req.param('slug');
  if (slug.startsWith('@')) {
    return handleBio(c, slug.slice(1));
  }
  if (!REDIRECT_SLUG_PATTERN.test(slug) || isReservedSlug(slug)) {
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

  const canCacheMiss = !['authorization', 'x-api-key', 'cookie', 'range', 'if-range'].some((header) => c.req.raw.headers.has(header));
  const missCache = canCacheMiss && typeof caches !== 'undefined' ? caches.default : undefined;
  const missKey = negativeSlugKey(c, slug);
  if (!cached && missCache) {
    const miss = await missCache.match(missKey).catch(() => undefined);
    if (miss) return c.text('Link not found', 404, { 'Cache-Control': 'no-store' });
  }

  let linkId = cached?.id;
  let destinationUrl = cached?.url;
  if (destinationUrl === '#') return c.text('Not Found', 404);
  let iosUrl = cached?.ios_url;
  let androidUrl = cached?.android_url;

  // 3. Fallback to D1
  if (!destinationUrl) {
    const db = c.env.DB;
    if (!db) {
      return c.text('Service Unavailable', 503);
    }

    const row = (await db
      .prepare('SELECT id, destination_url, ios_url, android_url, is_active, block_type FROM links WHERE slug = ?')
      .bind(slug)
      .first()) as { id: string; destination_url: string; ios_url?: string; android_url?: string; is_active: number; block_type?: string } | null;

    if (row && (isContentBlock(row.block_type) || row.destination_url === '#')) return c.text('Not Found', 404);
    if (!row || row.is_active !== 1) {
      // Fallback: Check if slug is actually a bio handle (allows link.1stnear.com/yogi without @)
      const bioProfile = (await db
        .prepare('SELECT handle FROM bio_profiles WHERE handle = ?')
        .bind(slug)
        .first()) as { handle: string } | null;
      if (bioProfile?.handle) {
        return c.redirect(`/@${bioProfile.handle}`, 302);
      }

      // Short-lived edge-local misses avoid a KV write for every scanner path.
      if (missCache) {
        const write = missCache.put(missKey, new Response('Link not found', { status: 404, headers: { 'Cache-Control': 'public, max-age=30' } })).catch(() => {});
        negativeSlugWrites.set(missKey.url, write);
        await write;
        if (negativeSlugWrites.get(missKey.url) === write) negativeSlugWrites.delete(missKey.url);
      }
      return c.text('Link not found or inactive', 404, { 'Cache-Control': 'no-store' });
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
  if (finalTarget === '#' || !finalTarget) {
    return c.text('Content block (not a redirect link)', 200);
  }
  if (/iPhone|iPad|iPod/i.test(ua) && iosUrl) {
    finalTarget = iosUrl;
  } else if (/Android/i.test(ua) && androidUrl) {
    finalTarget = androidUrl;
  }

  // 5. Non-blocking aggregated analytics UPSERT in ctx.waitUntil
  //    Crawler & pengambil pratinjau link (WhatsApp, Telegram, Googlebot, dll) tidak dihitung sebagai klik.
  if (linkId && c.env.DB && !isLikelyBot(ua)) {
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
  if (c.env.KV || c.env.DB) {
    const rate = await checkRateLimit(c.env.KV, `rate:guest:${ip}`, 5, 3600, c.env.DB);
    if (rate.serviceUnavailable) return c.json({ status: 'error', message: 'Rate limiting unavailable. Please retry.' }, 503);
    if (!rate.allowed) {
      return c.json({ status: 'error', message: 'Too many guest workspaces created from this IP. Please wait 1 hour.' }, 429);
    }
  }

  const randomSuffix = crypto.randomUUID().replace(/-/g, '').slice(0, 12);
  const userId = `usr_gst_${randomSuffix}`;
  const apiKey = `el_gst_${crypto.randomUUID().replace(/-/g, '')}`;
  const handle = `edge_${randomSuffix}`;
  const email = `guest_${randomSuffix}@edgelink.local`;
  const now = Math.floor(Date.now() / 1000);

  try {
    // Atomic D1 batch prevents orphan guests when profile creation fails.
    await c.env.DB.batch([
      c.env.DB.prepare(`INSERT INTO users (id, email, api_key, is_guest, created_at, updated_at)
         VALUES (?, ?, ?, 1, ?, ?)`).bind(userId, email, apiKey, now, now),
      c.env.DB.prepare(`INSERT INTO bio_profiles (user_id, handle, display_name, bio, theme, updated_at)
         VALUES (?, ?, ?, ?, '1stnear', ?)`).bind(userId, handle, `Creator ${randomSuffix}`, 'Semua link saya ada di sini.', now)
    ]);

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
  } catch {
    return c.json({ status: 'error', message: 'Failed to initialize guest workspace. Please retry.' }, 503);
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

  const { email, purpose } = body || {};
  if (typeof email !== 'string' || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return c.json({ status: 'error', message: 'Valid email address is required' }, 400);
  }

  const cleanEmail = email.trim().toLowerCase();
  const validPurpose = purpose === 'login' ? 'login' : 'claim';

  // 1. IP rate limit: max 10 OTP requests per hour per IP
  if (c.env.KV || c.env.DB) {
    const ipRate = await checkRateLimit(c.env.KV, `rate:otp_ip:${ip}`, 10, 3600, c.env.DB);
    if (ipRate.serviceUnavailable) return c.json({ status: 'error', message: 'Rate limiting unavailable. Please retry.' }, 503);
    if (!ipRate.allowed) {
      return c.json({ status: 'error', message: 'Rate limit exceeded. Please wait 1 hour.' }, 429);
    }

    // 2. Cooldown limit: max 1 request per email per 60 seconds
    const emailRate = await checkRateLimit(c.env.KV, `rate:otp_send:${cleanEmail}`, 1, 60, c.env.DB);
    if (emailRate.serviceUnavailable) return c.json({ status: 'error', message: 'Rate limiting unavailable. Please retry.' }, 503);
    if (!emailRate.allowed) {
      return c.json({ status: 'error', message: 'Please wait 60 seconds before requesting another code.' }, 429);
    }
  }

  // Identify user if logged in
  const currentUser = await authenticateUser(c);

  if (!c.env.KV) return c.json({ status: 'error', message: 'Verification unavailable' }, 503);
  if (validPurpose === 'claim' && !currentUser) {
    return c.json({ status: 'error', message: 'Session required to claim workspace' }, 401);
  }

  // 3. Generate cryptographically random 6-digit OTP
  const code = generateSecureOtp();
  const now = Math.floor(Date.now() / 1000);

  const otpRecord: OtpRecord = {
    challenge_id: await issueChallenge(c.env.DB, validPurpose === 'claim' ? currentUser!.id : null, 600),
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
  const emailRes = await sendOtpEmail(c.env.RESEND_API_KEY, cleanEmail, code, validPurpose, c.env.ENVIRONMENT === 'development', c.env.EMAIL_FROM);

  if (!emailRes.success) {
    await c.env.KV.delete(`otp:${cleanEmail}`);
    return c.json({ status: 'error', message: 'Could not send verification email' }, 503);
  }

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

  const { email, code, purpose } = body || {};
  if (typeof email !== 'string' || email.length > 254 || typeof code !== 'string' || !/^\d{6}$/.test(code) || !['claim', 'login'].includes(purpose)) {
    return c.json({ status: 'error', message: 'Email and 6-digit code are required' }, 400);
  }

  const cleanEmail = email.trim().toLowerCase();
  const cleanCode = code.toString().trim();

  if (!c.env.KV) {
    return c.json({ status: 'error', message: 'KV storage unavailable' }, 503);
  }

  const rate = await checkRateLimit(c.env.KV, `rate:otp_verify:${getClientIp(c)}`, 20, 300, c.env.DB);
  if (rate.serviceUnavailable) return c.json({ status: 'error', message: 'Rate limiting unavailable. Please retry.' }, 503);
  if (!rate.allowed) return c.json({ status: 'error', message: 'Too many attempts' }, 429);

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

  if (record.purpose !== purpose || !Number.isFinite(record.created_at) || record.created_at + 600 <= Math.floor(Date.now() / 1000)) {
    return c.json({ status: 'error', message: 'Invalid or expired verification code' }, 400);
  }
  const claimUser = purpose === 'claim' ? await authenticateUser(c) : null;
  if (purpose === 'claim' && (!claimUser || record.user_id !== claimUser.id)) {
    return c.json({ status: 'error', message: 'Verification belongs to another session' }, 403);
  }

  // 2. Anti-Brute-Force & Replay Check
  if (record.used || record.attempts >= 3) {
    await c.env.KV.delete(`otp:${cleanEmail}`);
    return c.json({ status: 'error', message: 'Verification code has been used or invalidated. Please request a new one.' }, 400);
  }

  // A conditional D1 UPDATE decides attempts and consumption atomically.
  if (!record.challenge_id || !await attemptChallenge(c.env.DB, record.challenge_id, record.purpose === 'claim' ? record.user_id || null : null, record.code === cleanCode)) {
    return c.json({ status: 'error', message: 'Invalid, expired or already used code' }, 401);
  }
  await c.env.KV.delete(`otp:${cleanEmail}`);

  const now = Math.floor(Date.now() / 1000);
  const db = c.env.DB;
  if (!db) return c.json({ status: 'error', message: 'Database unavailable' }, 503);

  // 5. Handle Claim Workspace
  if (purpose === 'claim') {
    const targetUserId = claimUser?.id;

    if (!targetUserId) {
      return c.json({ status: 'error', message: 'Session required to claim workspace' }, 401);
    }

    try {
      await db
        .prepare('UPDATE users SET email = ?, is_guest = 0, updated_at = ? WHERE id = ?')
        .bind(cleanEmail, now, targetUserId)
        .run();
      await invalidateUserBioCache(c, targetUserId);

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
      .bind(userId, handle, cleanEmail.split('@')[0], '1stnear', now)
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
app.post('/api/auth/claim', apiAuthMiddleware, (c) =>
  c.json({ status: 'error', message: 'Email verification required. Use send-otp and verify-otp.' }, 403)
);

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

// Handoff sesi antar-domain (link.1stnear.com -> 1stdev.link).
// Token tersimpan per domain di localStorage. Domain lama meminta kode sekali pakai (berlaku 2 menit),
// domain baru menukarnya dengan token. Kunci akses jangka panjang tidak pernah masuk ke URL.
const HANDOFF_TTL = 120;

app.post('/api/auth/handoff', apiAuthMiddleware, async (c) => {
  const user = c.get('user') as User;
  if (!c.env.KV) return c.json({ status: 'error', message: 'Unavailable' }, 503);
  const rate = await checkRateLimit(c.env.KV, `rate:handoff:${user.id}`, 10, 3600, c.env.DB);
  if (rate.serviceUnavailable) return c.json({ status: 'error', message: 'Rate limiting unavailable. Please retry.' }, 503);
  if (!rate.allowed) return c.json({ status: 'error', message: 'Too many requests' }, 429);

  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const code = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  const challengeId = await issueChallenge(c.env.DB, user.id, HANDOFF_TTL);
  await c.env.KV.put(`handoff:${code}`, JSON.stringify({ userId: user.id, challengeId }), { expirationTtl: HANDOFF_TTL });
  return c.json({ status: 'success', data: { code, expires_in: HANDOFF_TTL } });
});

app.post('/api/auth/handoff/claim', async (c) => {
  if (!c.env.KV || !c.env.DB) return c.json({ status: 'error', message: 'Unavailable' }, 503);
  const rate = await checkRateLimit(c.env.KV, `rate:handoff_claim:${getClientIp(c)}`, 20, 300, c.env.DB);
  if (rate.serviceUnavailable) return c.json({ status: 'error', message: 'Rate limiting unavailable. Please retry.' }, 503);
  if (!rate.allowed) return c.json({ status: 'error', message: 'Too many requests' }, 429);

  const body = (await c.req.json().catch(() => ({}))) as { code?: unknown };
  const code = typeof body.code === 'string' ? body.code : '';
  if (!/^[a-f0-9]{64}$/.test(code)) return c.json({ status: 'error', message: 'Invalid code' }, 400);

  const key = `handoff:${code}`;
  const transfer = await c.env.KV.get<{ userId: string; challengeId: string }>(key, 'json');
  if (!transfer || !await attemptChallenge(c.env.DB, transfer.challengeId, transfer.userId, true)) return c.json({ status: 'error', message: 'Code expired' }, 410);
  const userId = transfer.userId;
  await c.env.KV.delete(key);

  const user = (await c.env.DB
    .prepare('SELECT api_key FROM users WHERE id = ?')
    .bind(userId)
    .first()) as { api_key: string } | null;
  if (!user?.api_key) return c.json({ status: 'error', message: 'Code expired' }, 410);
  return c.json({ status: 'success', data: { api_key: user.api_key } });
});

// POST /api/auth/login - Connect / Sync existing workspace from another device
app.post('/api/auth/login', async (c) => {
  const ip = getClientIp(c);

  // Anti-brute force limiter: max 10 login attempts per IP per 5 minutes
  if (c.env.KV || c.env.DB) {
    const rate = await checkRateLimit(c.env.KV, `rate:login:${ip}`, 10, 300, c.env.DB);
    if (rate.serviceUnavailable) return c.json({ status: 'error', message: 'Rate limiting unavailable. Please retry.' }, 503);
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

  const credential = typeof body.credential === 'string' ? body.credential.trim() : '';
  if (!credential) {
    return c.json({ status: 'error', message: 'Email or Access Key is required' }, 400);
  }

  const db = c.env.DB;
  if (!db) {
    return c.json({ status: 'error', message: 'Database unavailable' }, 503);
  }

  // Email saja bukan bukti kepemilikan: masuk dengan email wajib lewat kode OTP (/api/auth/send-otp).
  if (credential.includes('@')) {
    return c.json({ status: 'error', message: 'Sign in with email uses a verification code.' }, 400);
  }
  // Hanya kunci akses rahasia (api_key). Id user bersifat publik.
  const user = (await db
    .prepare('SELECT id, email, api_key, is_guest FROM users WHERE api_key = ?')
    .bind(credential)
    .first()) as User | null;

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
// Helper: invalidate bio KV cache for user
async function invalidateUserBioCache(c: any, userId: string) {
  if (!c.env.KV || !c.env.DB) return;
  try {
    const profile = (await c.env.DB
      .prepare('SELECT handle FROM bio_profiles WHERE user_id = ?')
      .bind(userId)
      .first()) as { handle?: string } | null;
    if (profile?.handle) {
      await c.env.KV.delete(`bio:${profile.handle}`).catch(() => {});
    }
  } catch (err) {
    console.error('Failed to invalidate bio cache:', err);
  }
}

// -------------------------------------------------------------
// Create missing starter blocks in one atomic D1 batch. Never insert example business data.
app.post('/api/business/preset', apiAuthMiddleware, async (c) => {
  const user = c.get('user') as User;
  if (!c.env.KV) return c.json({ status: 'error', message: 'Unavailable' }, 503);
  const rate = await checkRateLimit(c.env.KV, `rate:preset:${getClientIp(c)}`, 10, 60, c.env.DB);
  if (rate.serviceUnavailable) return c.json({ status: 'error', message: 'Rate limiting unavailable. Please retry.' }, 503);
  if (!rate.allowed) return c.json({ status: 'error', message: 'Too many requests' }, 429);
  const body = await c.req.json();
  const industry = INDUSTRIES.find(([id]) => id === body.industry)?.[0];
  if (!industry) return c.json({ status: 'error', message: 'Invalid industry' }, 400);
  const count = await c.env.DB.prepare('SELECT COUNT(*) AS total FROM links WHERE user_id = ?').bind(user.id).first<{ total: number }>();
  const present = await c.env.DB.prepare("SELECT block_type FROM links WHERE user_id = ? AND is_bio_entry = 1 AND block_type IN ('catalog','business_info','location','contact')").bind(user.id).all<{ block_type: string }>();
  const missing = ['catalog', 'business_info', 'location', 'contact'].filter((kind) => !present.results.some((row) => row.block_type === kind)).length;
  if ((count?.total || 0) + missing > 100) return c.json({ status: 'error', code: 'LINK_QUOTA_EXCEEDED', message: 'Not enough room for starter blocks (maximum 100)' }, 400);
  const now = Math.floor(Date.now() / 1000);
  const statements = (['catalog', 'business_info', 'location', 'contact'] as const).map((kind) => {
    const id = `lnk_${crypto.randomUUID().replace(/-/g, '')}`;
    return c.env.DB.prepare(`INSERT INTO links (id, user_id, slug, destination_url, title, is_bio_entry, sort_order, is_active, block_type, created_at, data_json)
      SELECT ?, ?, ?, '#', ?, 1, COALESCE((SELECT MAX(sort_order) + 1 FROM links WHERE user_id = ?), 0), 1, ?, ?, ?
      WHERE NOT EXISTS (SELECT 1 FROM links WHERE user_id = ? AND block_type = ? AND is_bio_entry = 1)`)
      .bind(id, user.id, crypto.randomUUID().replace(/-/g, ''), kind === 'catalog' ? CATALOG_LABELS[industry] : BLOCK_LABELS[kind], user.id, kind, now, JSON.stringify(defaultBusinessData(kind, industry)), user.id, kind);
  });
  try { await c.env.DB.batch(statements); }
  catch (error) {
    if (/QUOTA_EXCEEDED/.test(String(error))) return c.json({ status: 'error', code: 'LINK_QUOTA_EXCEEDED', message: 'Maximum 100 links per account' }, 400);
    return c.json({ status: 'error', message: 'Could not create starter blocks. Please retry.' }, 503);
  }
  await invalidateUserBioCache(c, user.id);
  return c.json({ status: 'success' });
});

// POST /api/links - Create shortlink or bio card with Smart Device Routing & Anti-Bot
app.post('/api/links', apiAuthMiddleware, async (c) => {
  const user = c.get('user') as User;
  const ip = getClientIp(c);

  // Anti-bot rate limiter: max 30 links per IP per minute
  if (c.env.KV || c.env.DB) {
    const rate = await checkRateLimit(c.env.KV, `rate:link:${ip}`, 30, 60, c.env.DB);
    if (rate.serviceUnavailable) return c.json({ status: 'error', message: 'Rate limiting unavailable. Please retry.' }, 503);
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
  if (title !== undefined && title !== null && unsafePlainTextReason(title, 280)) {
    return c.json({ status: 'error', message: 'Invalid title: plain text only, without HTML markup or control characters' }, 400);
  }
  let slug = typeof body.slug === 'string' ? body.slug.trim() : '';

  const validBlockTypes = ['link', 'featured', 'header', 'whatsapp', 'image', 'gallery', 'video', 'text', 'social', 'divider', ...BUSINESS_TYPES];
  const blockType = typeof body.block_type === 'string' ? body.block_type.toLowerCase() : 'link';
  if (!validBlockTypes.includes(blockType)) {
    return c.json({ status: 'error', message: 'Invalid block_type' }, 400);
  }

  const count = await c.env.DB.prepare('SELECT COUNT(*) AS total FROM links WHERE user_id = ?').bind(user.id).first<{ total: number }>();
  if ((count?.total || 0) >= 100) return c.json({ status: 'error', code: 'LINK_QUOTA_EXCEEDED', message: 'Maximum 100 links per account' }, 400);

  const isContentOnly = isContentBlock(blockType);
  let dataJson: string | null = null;
  if (isBusinessBlock(blockType)) {
    if (typeof title !== 'string' || !title.trim() || title.length > 100) return c.json({ status: 'error', message: 'Business block title is required (maximum 100 characters)' }, 400);
    try { dataJson = JSON.stringify(validateBusinessData(blockType, body.data_json, (url) => validateDestinationUrl(url).valid)); }
    catch (error) { return c.json({ status: 'error', message: (error as Error).message }, 400); }
  } else if (body.data_json !== undefined) return c.json({ status: 'error', message: 'data_json is only supported on business blocks' }, 400);
  let targetUrl = typeof destination_url === 'string' ? destination_url.trim() : '';
  if (isBusinessBlock(blockType)) targetUrl = '#';
  if (!targetUrl) {
    if (isContentOnly) {
      targetUrl = '#';
    } else {
      return c.json({ status: 'error', message: 'destination_url is required' }, 400);
    }
  }

  // Validate Destination URL (allow '#' for content-only blocks like header/text/divider)
  if (!isContentOnly || targetUrl !== '#') {
    const validation = validateDestinationUrl(targetUrl);
    if (!validation.valid) {
      return c.json({ status: 'error', message: validation.error }, 422);
    }
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
    if (!SLUG_PATTERN.test(slug)) {
      return c.json({ status: 'error', message: 'Slug must contain 3–30 letters, numbers, hyphens, or underscores' }, 400);
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
  const bioEntryFlag = isBusinessBlock(blockType) ? 1 : is_bio_entry !== undefined ? (is_bio_entry ? 1 : 0) : (blockType !== 'link' ? 1 : 0);
  const sort = typeof sort_order === 'number' ? sort_order : 0;

  try {
    await c.env.DB
      .prepare(
        `INSERT INTO links (id, user_id, slug, destination_url, ios_url, android_url, title, is_bio_entry, sort_order, is_active, block_type, created_at, data_json)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)`
      )
      .bind(id, user.id, slug, targetUrl, ios_url || null, android_url || null, title || null, bioEntryFlag, sort, blockType, now, dataJson)
      .run();
  } catch (err: any) {
    if (/QUOTA_EXCEEDED/.test(String(err))) return c.json({ status: 'error', code: 'LINK_QUOTA_EXCEEDED', message: 'Maximum 100 links per account' }, 400);
    if (err.message && err.message.includes('UNIQUE constraint failed: links.slug')) {
      return c.json({ status: 'error', message: `Slug '${slug}' already exists` }, 409);
    }
    return c.json({ status: 'error', message: 'Database insert failed' }, 500);
  }

  // Populate KV cache with smart device targets
  if (c.env.KV && !isContentOnly) {
    const dataToCache: CachedSlug = { id, url: targetUrl, ios_url: ios_url || undefined, android_url: android_url || undefined };
    await c.env.KV.put(`slug:${slug}`, JSON.stringify(dataToCache), { expirationTtl: 86400 }).catch(() => {});
  }
  await clearNegativeSlug(c, slug);

  // Invalidate bio cache in KV
  await invalidateUserBioCache(c, user.id);
  scheduleMediaCleanup(c, user.id);

  const baseUrl = c.env.BASE_URL || new URL(c.req.url).origin;
  return c.json(
    {
      status: 'success',
      data: {
        id,
        slug,
        short_url: `${baseUrl}/${slug}`,
        destination_url: targetUrl,
        ios_url: ios_url || null,
        android_url: android_url || null,
        title,
        is_bio_entry: bioEntryFlag,
        sort_order: sort,
        is_active: 1,
        block_type: blockType,
        data_json: dataJson,
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
    SELECT l.id, l.slug, l.destination_url, l.ios_url, l.android_url, l.title, l.is_bio_entry, l.sort_order, l.is_active, l.block_type, l.style, l.data_json, l.created_at,
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

  query += ' GROUP BY l.id ORDER BY l.created_at DESC, l.id ASC LIMIT ? OFFSET ?';
  bindings.push(limit, offset);

  try {
    const res = (await c.env.DB.prepare(query).bind(...bindings).all()) as { results?: any[] };
    return c.json({
      status: 'success',
      data: res.results || []
    });
  } catch (err: any) {
    return c.json({ status: 'error', message: 'Unable to list links. Please retry.' }, 503);
  }
});

// One tenant aggregate; all redirectable links contribute before the top-20 ranking.
app.get('/api/analytics/summary', apiAuthMiddleware, async (c) => {
  const user = c.get('user') as User;
  const range = c.req.query('range') || '7d';
  if (range !== '7d' && range !== '30d') return c.json({ status: 'error', message: 'range must be 7d or 30d' }, 400);
  const until = new Date().toISOString().slice(0, 10);
  const since = new Date(Date.now() - ((range === '7d' ? 7 : 30) - 1) * 864e5).toISOString().slice(0, 10);
  const redirectable = "COALESCE(l.block_type, 'link') NOT IN ('catalog','business_info','location','contact','announcement','header','text','divider') AND (l.destination_url LIKE 'https://%' OR l.destination_url LIKE 'http://%')";
  const scope = `FROM link_analytics la JOIN links l ON l.id = la.link_id WHERE l.user_id = ? AND ${redirectable} AND la.date >= ? AND la.date <= ?`;
  try {
    const [dates, countries, ranking, active] = await Promise.all([
      c.env.DB.prepare(`/* summary_dates */ SELECT la.date AS date, SUM(la.clicks) AS clicks ${scope} GROUP BY la.date ORDER BY la.date ASC`).bind(user.id, since, until).all<{ date: string; clicks: number }>(),
      c.env.DB.prepare(`/* summary_countries */ SELECT la.country AS country, SUM(la.clicks) AS clicks ${scope} GROUP BY la.country ORDER BY clicks DESC, la.country ASC`).bind(user.id, since, until).all(),
      c.env.DB.prepare(`/* summary_links */ SELECT l.id, l.slug, l.title, SUM(la.clicks) AS clicks ${scope} GROUP BY l.id ORDER BY clicks DESC, l.id ASC LIMIT 20`).bind(user.id, since, until).all(),
      c.env.DB.prepare(`/* summary_active */ SELECT COUNT(*) AS active_links FROM links l WHERE l.user_id = ? AND l.is_active = 1 AND ${redirectable}`).bind(user.id).first<{ active_links: number }>(),
    ]);
    const byDate = dates.results || [];
    return c.json({ status: 'success', data: { total_clicks: byDate.reduce((sum, row) => sum + Number(row.clicks || 0), 0), by_date: byDate, by_country: countries.results || [], by_link: ranking.results || [], active_links: Number(active?.active_links || 0) } });
  } catch {
    return c.json({ status: 'error', message: 'Analytics unavailable. Please retry.' }, 503);
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
      avatar_shape: profile.avatar_shape || 'circle',
      verified_badge: profile.verified_badge === 1,
      business: readBusiness(profile.business_json),
      style: readObject(profile.style),
      social_links: readObject(socialLinks)
    }
  });
});

// PATCH /api/links/:id - Toggle link active state
app.patch('/api/links/:id', apiAuthMiddleware, async (c) => {
  const user = c.get('user') as User;
  const rate = await checkRateLimit(c.env.KV, `rate:link-update:${user.id}`, 90, 60, c.env.DB);
  if (rate.serviceUnavailable) return c.json({ status: 'error', message: 'Please retry later' }, 503);
  if (!rate.allowed) return c.json({ status: 'error', message: 'Too many link updates. Try again shortly.' }, 429);
  const linkId = c.req.param('id');
  let body: any;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ status: 'error', message: 'Invalid JSON body' }, 400);
  }

  const { is_active, block_type, is_bio_entry } = body;
  const hasTitle = body.title !== undefined;
  const hasUrl = body.destination_url !== undefined;
  if (is_active === undefined && is_bio_entry === undefined && block_type === undefined && !hasTitle && !hasUrl && body.data_json === undefined) {
    return c.json({ status: 'error', message: 'Nothing to update' }, 400);
  }

  const link = (await c.env.DB
    .prepare('SELECT * FROM links WHERE id = ? AND user_id = ?')
    .bind(linkId, user.id)
    .first()) as Link | null;

  if (!link) {
    return c.json({ status: 'error', message: 'Link not found' }, 404);
  }

  // Validate everything first so a bad field never leaves a half-applied edit.
  const validBlockTypes = ['link', 'featured', 'header', 'whatsapp', 'image', 'gallery', 'video', 'text', 'social', 'divider', ...BUSINESS_TYPES];
  const nextType = block_type !== undefined ? String(block_type).toLowerCase() : (link as any).block_type || 'link';
  if (!validBlockTypes.includes(nextType)) {
    return c.json({ status: 'error', message: 'Invalid block_type' }, 400);
  }
  const isContentOnly = isContentBlock(nextType);

  const sets: string[] = [];
  const vals: any[] = [];
  if (is_bio_entry !== undefined) {
    if (![0, 1, false, true].includes(is_bio_entry)) return c.json({ status: 'error', message: 'is_bio_entry must be 0, 1, or boolean' }, 400);
    sets.push('is_bio_entry = ?'); vals.push(is_bio_entry ? 1 : 0);
  }
  if (isBusinessBlock(nextType)) {
    try {
      const data = validateBusinessData(nextType, body.data_json !== undefined ? body.data_json : link.data_json, (url) => validateDestinationUrl(url).valid);
      sets.push('data_json = ?'); vals.push(JSON.stringify(data));
    } catch (error) { return c.json({ status: 'error', message: (error as Error).message }, 400); }
  } else if (body.data_json !== undefined) return c.json({ status: 'error', message: 'data_json requires a business block' }, 400);
  if (isBusinessBlock(nextType) !== isBusinessBlock(link.block_type)) {
    return c.json({ status: 'error', message: 'Create a new block to change between links and business content' }, 400);
  }

  if (hasTitle) {
    if (body.title !== null && unsafePlainTextReason(body.title, 280)) {
      return c.json({ status: 'error', message: 'Invalid title: plain text only, without HTML markup or control characters' }, 400);
    }
    const title = String(body.title ?? '').trim();
    if (!title && nextType !== 'divider') {
      return c.json({ status: 'error', message: 'title is required' }, 400);
    }
    sets.push('title = ?');
    vals.push(title || null);
  }

  if (isBusinessBlock(nextType) && hasUrl && body.destination_url !== '#') return c.json({ status: 'error', message: 'Business information cannot be used as a redirect' }, 400);
  let nextUrl = link.destination_url;
  if (hasUrl) {
    nextUrl = String(body.destination_url ?? '').trim() || (isContentOnly ? '#' : '');
    if (!nextUrl) {
      return c.json({ status: 'error', message: 'destination_url is required' }, 400);
    }
  } else if (!isContentOnly && nextUrl === '#') {
    return c.json({ status: 'error', message: 'destination_url is required for this block type' }, 400);
  }
  if (hasUrl && !(isContentOnly && nextUrl === '#')) {
    const validation = validateDestinationUrl(nextUrl);
    if (!validation.valid) {
      return c.json({ status: 'error', message: validation.error }, 422);
    }
  }
  if (hasUrl) {
    sets.push('destination_url = ?');
    vals.push(nextUrl);
  }
  if (block_type !== undefined) {
    sets.push('block_type = ?');
    vals.push(nextType);
  }
  const activeVal = is_active !== undefined ? (is_active ? 1 : 0) : link.is_active;
  if (is_active !== undefined) {
    sets.push('is_active = ?');
    vals.push(activeVal);
  }

  await c.env.DB
    .prepare(`UPDATE links SET ${sets.join(', ')} WHERE id = ? AND user_id = ?`)
    .bind(...vals, linkId, user.id)
    .run();

  // Keep the redirect cache in step with the new URL / active state.
  if (c.env.KV && (is_active !== undefined || hasUrl)) {
    if (activeVal && nextUrl !== '#') {
      await c.env.KV.put(
        `slug:${link.slug}`,
        JSON.stringify({ url: nextUrl, id: link.id, ios_url: link.ios_url, android_url: link.android_url }),
        { expirationTtl: 86400 }
      ).catch(() => {});
    } else {
      await c.env.KV.delete(`slug:${link.slug}`).catch(() => {});
    }
  }

  await invalidateUserBioCache(c, user.id);

  await clearNegativeSlug(c, link.slug);
  scheduleMediaCleanup(c, user.id);

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

  await invalidateUserBioCache(c, user.id);

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

  await invalidateUserBioCache(c, user.id);

  scheduleMediaCleanup(c, user.id);
  return c.json({ status: 'success', message: 'Link deleted' });
});

// PUT /api/bio-profile - Update bio profile
app.put('/api/bio-profile', apiAuthMiddleware, async (c) => {
  const user = c.get('user') as User;
  const rate = await checkRateLimit(c.env.KV, `rate:profile-update:${user.id}`, 45, 60, c.env.DB);
  if (rate.serviceUnavailable) return c.json({ status: 'error', message: 'Please retry later' }, 503);
  if (!rate.allowed) return c.json({ status: 'error', message: 'Too many profile updates. Try again shortly.' }, 429);
  let body: any;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ status: 'error', message: 'Invalid JSON body' }, 400);
  }

  const validation = validateProfilePatch(body);
  if (!validation.valid) return c.json({ status: 'error', message: validation.error }, 400);
  body = validation.value;
  const { handle, display_name, bio, avatar_url, theme, social_links, avatar_shape, style } = body;

  const existing = (await c.env.DB
    .prepare('SELECT * FROM bio_profiles WHERE user_id = ?')
    .bind(user.id)
    .first()) as BioProfile | null;

  const newHandle = (handle !== undefined ? handle : existing?.handle || user.id).trim().toLowerCase();
  const newDisplayName = display_name !== undefined ? display_name : existing?.display_name || user.email.split('@')[0];
  const newBio = bio !== undefined ? bio : existing?.bio || null;
  const newAvatarUrl = avatar_url !== undefined ? avatar_url : existing?.avatar_url || null;
  const newTheme = theme !== undefined ? theme : existing?.theme || '1stnear';
  const newAvatarShape = avatar_shape !== undefined ? avatar_shape : existing?.avatar_shape || 'circle';
  const newVerifiedBadge = existing?.verified_badge || 0;
  let businessJson: string;
  try { businessJson = JSON.stringify(body.business !== undefined ? validateBusinessSettings(body.business) : readBusiness(existing?.business_json)); }
  catch (error) { return c.json({ status: 'error', message: (error as Error).message }, 400); }

  let newStyleJson: string = '{}';
  if (style !== undefined) {
    const styleCheck = validateStyleJson(style);
    if (!styleCheck.valid) {
      return c.json({ status: 'error', message: styleCheck.error }, 400);
    }
    newStyleJson = styleCheck.cleaned || '{}';
  } else {
    newStyleJson = JSON.stringify(readObject(existing?.style));
  }

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
        `INSERT INTO bio_profiles (user_id, handle, display_name, bio, avatar_url, social_links, theme, avatar_shape, verified_badge, style, updated_at, business_json)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT (user_id) DO UPDATE SET
           handle = excluded.handle,
           display_name = excluded.display_name,
           bio = excluded.bio,
           avatar_url = excluded.avatar_url,
           social_links = excluded.social_links,
           theme = excluded.theme,
           avatar_shape = excluded.avatar_shape,
           verified_badge = excluded.verified_badge,
           style = excluded.style,
           business_json = excluded.business_json,
           updated_at = excluded.updated_at`
      )
      .bind(user.id, newHandle, newDisplayName, newBio, newAvatarUrl, newSocialLinks, newTheme, newAvatarShape, newVerifiedBadge, newStyleJson, now, businessJson)
      .run();
  } catch (err: any) {
    if (err.message && err.message.includes('UNIQUE constraint failed: bio_profiles.handle')) {
      return c.json({ status: 'error', message: `Handle '${newHandle}' is already taken` }, 409);
    }
    return c.json({ status: 'error', message: 'Failed to save bio profile' }, 500);
  }

  // Invalidate old & new handle in KV cache
  if (c.env.KV) {
    await Promise.all([
        c.env.KV.delete(`bio:${newHandle}`).catch(() => {}),
        existing?.handle && existing.handle !== newHandle
          ? c.env.KV.delete(`bio:${existing.handle}`).catch(() => {})
          : Promise.resolve()
      ]);
  }

  // Preserve referenced/recent media; the bounded sweep runs at most once per day.
  scheduleMediaCleanup(c, user.id);

  return c.json({
    status: 'success',
    data: {
      handle: newHandle,
      display_name: newDisplayName,
      bio: newBio,
      avatar_url: newAvatarUrl,
      theme: newTheme,
      avatar_shape: newAvatarShape,
      verified_badge: newVerifiedBadge === 1,
      business: JSON.parse(businessJson),
      style: JSON.parse(newStyleJson),
      social_links: readObject(newSocialLinks)
    }
  });
});

// Administrator-only routes use a role record and fresh email OTP step-up.
installAdminRoutes(app, authenticateUser);

// Keep Hono's fetch/request methods for browser and unit tests, while adding
// a scheduled entrypoint for the daily free-tier-friendly guest cleanup.
export default Object.assign(app, {
  scheduled(_controller: ScheduledController, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(expireGuestWorkspaces(env)
      .then((result) => console.log('Guest cleanup run:', result))
      .catch((err) => console.error('Guest cleanup cron failed:', err instanceof Error ? err.message : 'unknown error')));
  },
});
