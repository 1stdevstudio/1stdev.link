import { validateDestinationUrl } from './security.js';

export function validateProfilePatch(raw: unknown): { valid: true; value: Record<string, any> } | { valid: false; error: string } {
  const fail = (error: string) => ({ valid: false as const, error });
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return fail('Profile must be an object');
  const value = { ...raw } as Record<string, any>;
  for (const [key, max] of [['handle', 32], ['display_name', 100], ['bio', 2000]] as const) {
    if (value[key] !== undefined && (typeof value[key] !== 'string' || value[key].length > max)) return fail(`Invalid ${key}`);
  }
  if (value.handle !== undefined && !/^[a-z0-9_.-]{1,32}$/i.test(value.handle.trim())) return fail('Invalid handle');
  if (value.avatar_url !== undefined && value.avatar_url !== null && value.avatar_url !== '') {
    if (typeof value.avatar_url !== 'string' || !validateDestinationUrl(value.avatar_url).valid) return fail('Invalid avatar_url');
  }
  if (value.theme !== undefined && !['1stnear', 'minimal-dark', 'obsidian', 'clean-paper', 'aurora-emerald', 'midnight-neon', 'cyber-matrix', 'rose-gold'].includes(value.theme)) return fail('Invalid theme');
  if (value.avatar_shape !== undefined && !['circle', 'squircle', 'rounded'].includes(value.avatar_shape)) return fail('Invalid avatar_shape');
  if (value.social_links !== undefined) {
    let social = value.social_links;
    if (typeof social === 'string') {
      try { social = JSON.parse(social); } catch { return fail('Invalid social_links JSON'); }
    }
    if (!social || typeof social !== 'object' || Array.isArray(social)) return fail('social_links must be an object');
    if (Object.keys(social).length > 12) return fail('Too many social links');
    const cleaned: Record<string, string> = {};
    for (const [key, url] of Object.entries(social)) {
      if (!/^[a-z][a-z0-9_-]{0,31}$/i.test(key) || typeof url !== 'string' || url.length > 2048) return fail('Invalid social link');
      if (!url.trim()) continue;
      if (!validateDestinationUrl(url).valid) return fail('Invalid social URL');
      cleaned[key] = url.trim();
    }
    value.social_links = cleaned;
  }
  return { valid: true, value };
}

export function validateStyleJson(raw: any): { valid: boolean; cleaned?: string; error?: string } {
  if (raw === undefined || raw === null || raw === '') return { valid: true, cleaned: '{}' };
  let obj: any = raw;
  if (typeof raw === 'string') {
    try {
      obj = JSON.parse(raw);
    } catch {
      return { valid: false, error: 'Invalid JSON for style' };
    }
  }
  if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
    return { valid: false, error: 'Style must be a JSON object' };
  }

  // Check payload size <= 4KB
  const str = JSON.stringify(obj);
  if (str.length > 4096) {
    return { valid: false, error: 'Style payload exceeds 4KB limit' };
  }

  const allowedBg = ['dark', 'light', 'gradient', 'custom', 'image'];
  const allowedFont = ['modern', 'classic', 'mono', 'rounded'];
  const allowedBtn = ['soft', 'solid', 'glass', 'outline', 'shadow'];
  const allowedEnter = ['none', 'fade', 'slide', 'bounce'];
  const allowedHover = ['none', 'lift', 'glow', 'press'];
  const allowedShapes = ['circle', 'squircle', 'rounded'];
  const allowedBgFx = ['grain', 'aurora'];

  const cleaned: Record<string, any> = {};

  if (obj.bg !== undefined) {
    if (!allowedBg.includes(obj.bg)) return { valid: false, error: 'Invalid bg option' };
    cleaned.bg = obj.bg;
  }
  if (obj.accent !== undefined) {
    if (typeof obj.accent !== 'string' || !/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(obj.accent)) {
      return { valid: false, error: 'Invalid accent hex color' };
    }
    cleaned.accent = obj.accent;
  }
  if (obj.font !== undefined) {
    if (!allowedFont.includes(obj.font)) return { valid: false, error: 'Invalid font option' };
    cleaned.font = obj.font;
  }
  if (obj.btn !== undefined) {
    if (!allowedBtn.includes(obj.btn)) return { valid: false, error: 'Invalid btn option' };
    cleaned.btn = obj.btn;
  }
  if (obj.radius !== undefined) {
    const num = Number(obj.radius);
    if (isNaN(num) || num < 0 || num > 32) return { valid: false, error: 'Radius must be 0-32px' };
    cleaned.radius = Math.round(num);
  }
  if (obj.gap !== undefined) {
    const num = Number(obj.gap);
    if (isNaN(num) || num < 0 || num > 32) return { valid: false, error: 'Gap must be 0-32px' };
    cleaned.gap = Math.round(num);
  }
  if (obj.enter !== undefined) {
    if (!allowedEnter.includes(obj.enter)) return { valid: false, error: 'Invalid enter effect' };
    cleaned.enter = obj.enter;
  }
  if (obj.hover !== undefined) {
    if (!allowedHover.includes(obj.hover)) return { valid: false, error: 'Invalid hover effect' };
    cleaned.hover = obj.hover;
  }
  if (obj.av_shape !== undefined) {
    if (!allowedShapes.includes(obj.av_shape)) return { valid: false, error: 'Invalid avatar shape' };
    cleaned.av_shape = obj.av_shape;
  }
  if (obj.ring !== undefined) {
    if (typeof obj.ring !== 'boolean') return { valid: false, error: 'Invalid ring option' };
    cleaned.ring = obj.ring;
  }
  if (obj.cover_url !== undefined && obj.cover_url) {
    if (typeof obj.cover_url !== 'string') return { valid: false, error: 'Invalid cover_url' };
    const valid = validateDestinationUrl(obj.cover_url);
    if (!valid.valid) return { valid: false, error: 'Invalid cover_url: https required' };
    cleaned.cover_url = obj.cover_url.trim();
  }
  if (obj.bg_image !== undefined && obj.bg_image) {
    if (typeof obj.bg_image !== 'string') return { valid: false, error: 'Invalid bg_image' };
    const valid = validateDestinationUrl(obj.bg_image);
    if (!valid.valid) return { valid: false, error: 'Invalid bg_image: https required' };
    cleaned.bg_image = obj.bg_image.trim();
  }
  if (obj.bgfx !== undefined) {
    if (!Array.isArray(obj.bgfx)) return { valid: false, error: 'bgfx must be an array' };
    cleaned.bgfx = obj.bgfx.filter((x: string) => allowedBgFx.includes(x));
  }
  if (obj.bg_blur !== undefined) {
    const num = Number(obj.bg_blur);
    cleaned.bg_blur = isNaN(num) ? 0 : Math.min(30, Math.max(0, num));
  }
  if (obj.bg_dim !== undefined) {
    const num = Number(obj.bg_dim);
    cleaned.bg_dim = isNaN(num) ? 0 : Math.min(90, Math.max(0, num));
  }

  return { valid: true, cleaned: JSON.stringify(cleaned) };
}

