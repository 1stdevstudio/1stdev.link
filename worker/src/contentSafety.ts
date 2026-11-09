/**
 * Abuse signals for user-facing plain-text fields.
 *
 * This is NOT an XSS sanitizer. HTML/JSON/CSS output must still be escaped or
 * allowlisted in the renderer. It stops obvious attempts at persisting executable
 * markup while permitting ordinary names (including "A < B" and "<3").
 */
export function looksLikeMarkupAttack(input: string): boolean {
  if (!input) return false;
  let value = input.normalize('NFKC').replace(/[\u200b-\u200d\u2060\uFEFF]/g, '');
  // Decode up to two levels of HTML entities so &amp;lt;script&amp;gt; is also flagged.
  for (let i = 0; i < 3; i++) {
    const decoded = value.replace(/&(?:amp);/gi, '&')
      .replace(/&(?:lt|#0*60|#x0*3c);?/gi, '<')
      .replace(/&(?:gt|#0*62|#x0*3e);?/gi, '>');
    if (decoded === value) break;
    value = decoded;
  }
  return /<\s*\/?\s*[a-z][^>]{0,2048}>/i.test(value) ||
    /<\s*!(?:--|doctype)/i.test(value);
}

export function unsafePlainTextReason(input: unknown, maxLength: number): string | null {
  if (typeof input !== 'string' || input.length > maxLength) return 'Invalid text length or type';
  // Control characters (except normal tabs/newlines) and bidi overrides are
  // used to obfuscate display names, social links, and abuse reports.
  if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f\u202a-\u202e\u2066-\u2069]/u.test(input)) {
    return 'Control characters are not allowed';
  }
  if (looksLikeMarkupAttack(input)) return 'HTML tags are not allowed in plain text';
  return null;
}
