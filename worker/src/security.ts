export const RESERVED_SLUGS = new Set([
  'admin',
  'api',
  'app',
  'auth',
  'login',
  'logout',
  'register',
  'signup',
  'dashboard',
  'settings',
  'account',
  'profile',
  'static',
  'assets',
  'cdn',
  'status',
  'ping',
  'health',
  'robots.txt',
  'sitemap.xml',
  'terms',
  'privacy',
  'docs',
  'help',
  'support',
  'edgelink'
]);

export function isReservedSlug(slug: string): boolean {
  return RESERVED_SLUGS.has(slug.trim().toLowerCase());
}

const PRIVATE_IPV4_RANGES = [
  /^127\./,                    // 127.0.0.0/8
  /^10\./,                     // 10.0.0.0/8
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // 172.16.0.0/12
  /^192\.168\./,               // 192.168.0.0/16
  /^169\.254\./,               // 169.254.0.0/16
  /^0\./,                      // 0.0.0.0/8
  /^100\.(6[4-9]|[7-9][0-9]|1[01][0-9]|12[0-7])\./, // shared address space
  /^198\.(18|19)\./,           // benchmarking
  /^(22[4-9]|23[0-9]|24[0-9]|25[0-5])\./ // multicast/reserved
];

export function validateDestinationUrl(urlString: string): { valid: boolean; error?: string } {
  let parsed: URL;
  try {
    parsed = new URL(urlString);
  } catch {
    return { valid: false, error: 'Invalid URL format' };
  }

  // Scheme validation: strictly http or https
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { valid: false, error: 'Only http and https schemes are permitted' };
  }

  if (typeof urlString !== 'string' || urlString.length > 4096 || parsed.username || parsed.password) {
    return { valid: false, error: 'Invalid destination URL' };
  }
  const hostname = parsed.hostname.toLowerCase().replace(/\.+$/, '');

  // Hostname checks for localhost & common loopback
  if (
    hostname === 'localhost' ||
    hostname === '0.0.0.0' ||
    hostname.endsWith('.localhost') ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.internal')
  ) {
    return { valid: false, error: 'Destination URL resolves to private or loopback address' };
  }

  // Check IPv6 loopback / private
  if (
    hostname === '[::1]' ||
    hostname === '::1' ||
    hostname.startsWith('[fc') ||
    hostname.startsWith('[fd') ||
    /^\[fe[89ab]/.test(hostname) ||
    hostname === '[::]' ||
    hostname.startsWith('[::ffff:') ||
    (hostname.startsWith('[') && !/^\[[23][0-9a-f]{0,3}:/.test(hostname))
  ) {
    return { valid: false, error: 'Destination URL resolves to private IPv6 address' };
  }

  // Check IPv4 literal
  for (const range of PRIVATE_IPV4_RANGES) {
    if (range.test(hostname)) {
      return { valid: false, error: 'Destination URL resolves to private IPv4 address' };
    }
  }

  return { valid: true };
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt?: number;
  serviceUnavailable?: boolean;
}

export async function hashRateLimitKey(key: string): Promise<string> {
  const data = new TextEncoder().encode(key);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('');
}

export const RATE_LIMIT_SQL = `
      INSERT INTO rate_limits (key_hash, count, reset_at) VALUES (?, 1, ?)
      ON CONFLICT(key_hash) DO UPDATE SET
        count = CASE WHEN rate_limits.reset_at <= ? THEN 1 ELSE rate_limits.count + 1 END,
        reset_at = CASE WHEN rate_limits.reset_at <= ? THEN excluded.reset_at ELSE rate_limits.reset_at END
      WHERE rate_limits.reset_at <= ? OR rate_limits.count < ?
      RETURNING count, reset_at
    `;

/** D1 enforces a strict window; KV only caches an exhausted allowance. */
export async function checkRateLimit(
  kv: KVNamespace | undefined,
  key: string,
  limit: number,
  ttlSeconds: number = 60,
  db?: D1Database
): Promise<RateLimitResult> {
  if (!db || !Number.isSafeInteger(limit) || limit < 1 || ttlSeconds < 1) {
    return { allowed: false, remaining: 0, serviceUnavailable: true };
  }
  const now = Math.floor(Date.now() / 1000);
  const keyHash = await hashRateLimitKey(key);
  const blockKey = `rate:deny:${keyHash}`;
  if (kv) {
    try {
      const blockedUntil = Number(await kv.get(blockKey));
      if (blockedUntil > now) return { allowed: false, remaining: 0, resetAt: blockedUntil };
    } catch { /* D1 remains the authority when KV is unavailable. */ }
  }
  try {
    const row = await db.prepare(RATE_LIMIT_SQL).bind(keyHash, now + ttlSeconds, now, now, now, limit).first<{ count: number; reset_at: number }>();
    if (!row) {
      const exhausted = await db.prepare('SELECT reset_at FROM rate_limits WHERE key_hash = ?').bind(keyHash).first<{ reset_at: number }>();
      if (!exhausted) return { allowed: false, remaining: 0, serviceUnavailable: true };
      return { allowed: false, remaining: 0, resetAt: exhausted.reset_at };
    }
    // One marker per exhausted window, never one KV write per denied request.
    // KV's minimum TTL is 60s; its numeric value enforces the actual reset time.
    if (row.count === limit && kv) {
      try { await kv.put(blockKey, String(row.reset_at), { expirationTtl: Math.max(60, row.reset_at - now) }); }
      catch { /* A quota or KV outage cannot bypass the D1 limit. */ }
    }
    if (Math.random() < 0.02) {
      try {
        await db.prepare('DELETE FROM rate_limits WHERE key_hash IN (SELECT key_hash FROM rate_limits WHERE reset_at < ? LIMIT 50)').bind(now).run();
      } catch { /* Bounded expiry cleanup may retry on a later request. */ }
    }
    return { allowed: true, remaining: Math.max(0, limit - row.count), resetAt: row.reset_at };
  } catch {
    return { allowed: false, remaining: 0, serviceUnavailable: true };
  }
}

/**
 * Cloudflare Turnstile token validation
 */
export async function verifyTurnstileToken(
  secretKey: string | undefined,
  token: string | undefined,
  ip?: string
): Promise<boolean> {
  // If no secret key configured, bypass gracefully in dev/free tier
  if (!secretKey) return true;
  if (!token) return false;

  try {
    const formData = new URLSearchParams();
    formData.append('secret', secretKey);
    formData.append('response', token);
    if (ip) formData.append('remoteip', ip);

    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: formData,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    const data: any = await res.json();
    return Boolean(data.success);
  } catch {
    return false;
  }
}

/**
 * Generate cryptographically secure 6-digit OTP
 */
export function generateSecureOtp(): string {
  const arr = new Uint32Array(1);
  crypto.getRandomValues(arr);
  const num = (arr[0] % 900000) + 100000;
  return num.toString();
}

/**
 * Dispatch verification email. Preview is opt-in for local development only.
 */
export async function sendOtpEmail(
  apiKey: string | undefined,
  toEmail: string,
  code: string,
  purpose: string,
  allowPreview = false,
  fromAddress = '1stdev.link Security <no-reply@otp.1stdev.link>'
): Promise<{ success: boolean; preview?: string; error?: string }> {
  if (apiKey) {
    const send = async () => {
      return fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          from: fromAddress,
          to: [toEmail],
          subject: `Your ${purpose === 'claim' ? 'Account Claim' : 'Login'} Code: ${code}`,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0c0d12; color: #fff; padding: 40px; border-radius: 16px; max-width: 460px; margin: auto;">
              <h2 style="color: #fff; margin-bottom: 8px;">1stdev.link Security</h2>
              <p style="color: #9ca3af; font-size: 14px; margin-bottom: 24px;">
                Use the verification code below to complete your ${purpose === 'claim' ? 'workspace claim' : 'secure login'}.
              </p>
              <div style="background-color: #181920; padding: 18px; border-radius: 12px; text-align: center; font-family: monospace; font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #38bdf8;">
                ${code}
              </div>
              <p style="color: #6b7280; font-size: 12px; margin-top: 24px;">
                This code is valid for 10 minutes and will self-destruct after 3 incorrect attempts. Never share this code.
              </p>
            </div>
          `,
        }),
      });
    };

    try {
      // Use the configured, verified sender. Resend's testing domain cannot send to customers.
      const res = await send();
      if (res.ok) {
        return { success: true };
      }

      const finalErr: any = await res.json().catch(() => ({}));
      console.warn('Resend email delivery notice:', finalErr?.message);
      // Provider rejection must never disclose the verification code.
      return { success: false, error: 'Email delivery failed' };
    } catch (err: any) {
      console.error('Failed to dispatch email via Resend:', err);
    }
  }

  // Only an explicit development environment may preview a code.
  return allowPreview ? { success: true, preview: code } : { success: false, error: 'Email delivery unavailable' };
}
