export const INDUSTRIES = [
  ['fnb', 'F&B · Kafe & resto'], ['retail', 'Retail · Toko produk'], ['services', 'Jasa · Studio & layanan'],
  ['professional', 'Profesional & agensi'], ['hospitality', 'Penginapan & kos'], ['property', 'Properti'],
  ['education', 'Kelas & kursus'], ['other', 'Usaha lainnya'],
] as const;
export type Industry = typeof INDUSTRIES[number][0];
export interface BusinessSettings { version: 1; mode: 'personal' | 'business'; industry: Industry; skin: 'paper' | 'ink'; purpose?: 'creator' | 'business' | 'affiliate' }
export const BUSINESS_TYPES = ['catalog', 'business_info', 'location', 'contact', 'announcement'] as const;
export type BusinessBlockType = typeof BUSINESS_TYPES[number];
export const isBusinessBlock = (type?: string): type is BusinessBlockType => BUSINESS_TYPES.includes(type as BusinessBlockType);
export const isContentBlock = (type?: string) => isBusinessBlock(type) || ['header', 'text', 'divider'].includes(type || '');
export interface CatalogItem {
  id: string; name: string; description: string; category: string; image_url: string;
  price: number | null; price_kind: 'fixed' | 'from' | 'ask'; unit: string;
  status: 'available' | 'unavailable' | 'hidden'; duration: number | null;
  action_url?: string; action_label?: string;
}
export interface CatalogData { version: 1; kind: 'catalog'; layout: 'list' | 'grid'; presentation: 'products' | 'services'; categories: string[]; items: CatalogItem[]; whatsapp?: string; disclosure?: string }
export interface Hours { day: number; open: string; close: string }
export interface InfoData { version: 1; kind: 'business_info'; timezone: string; hours: Hours[]; note: string; closed: boolean }
export interface LocationData { version: 1; kind: 'location'; address: string; map_url: string }
export interface ContactData { version: 1; kind: 'contact'; whatsapp: string; phone: string; email: string; website: string }
export interface AnnouncementData { version: 1; kind: 'announcement'; text: string }
export type BusinessData = CatalogData | InfoData | LocationData | ContactData | AnnouncementData;
export const BLOCK_LABELS: Record<BusinessBlockType, string> = { catalog: 'Katalog / layanan', business_info: 'Informasi usaha', location: 'Lokasi', contact: 'Kontak', announcement: 'Pengumuman' };
export const CATALOG_LABELS: Record<Industry, string> = { fnb: 'Menu', retail: 'Katalog produk', services: 'Layanan & harga', professional: 'Paket jasa', hospitality: 'Kamar & unit', property: 'Daftar properti', education: 'Program kelas', other: 'Katalog' };
export const DEFAULT_BUSINESS: BusinessSettings = { version: 1, mode: 'personal', industry: 'fnb', skin: 'paper' };
const object = (v: unknown): v is Record<string, any> => !!v && typeof v === 'object' && !Array.isArray(v);
export function parseObject(value: unknown): Record<string, any> {
  try { const v = typeof value === 'string' ? JSON.parse(value) : value; return object(v) ? v : {}; } catch { return {}; }
}
export function validateBusinessSettings(raw: unknown): BusinessSettings {
  const v = parseObject(raw);
  if (v.version !== 1 || !['personal', 'business'].includes(v.mode) || !INDUSTRIES.some(([id]) => id === v.industry) || !['paper', 'ink'].includes(v.skin) || (v.purpose !== undefined && !['creator', 'business', 'affiliate'].includes(v.purpose))) throw new Error('Pengaturan usaha tidak valid');
  return { version: 1, mode: v.mode, industry: v.industry, skin: v.skin, ...(v.purpose === undefined ? {} : { purpose: v.purpose }) };
}
export function readBusiness(raw: unknown): BusinessSettings {
  try { return validateBusinessSettings(raw); } catch { return { ...DEFAULT_BUSINESS }; }
}
export function defaultBusinessData(kind: BusinessBlockType, industry: Industry = 'fnb'): BusinessData {
  if (kind === 'catalog') return { version: 1, kind, layout: 'list', presentation: ['services', 'professional', 'education'].includes(industry) ? 'services' : 'products', categories: [], items: [] };
  if (kind === 'business_info') return { version: 1, kind, timezone: 'Asia/Jakarta', hours: [], note: '', closed: false };
  if (kind === 'location') return { version: 1, kind, address: '', map_url: '' };
  if (kind === 'contact') return { version: 1, kind, whatsapp: '', phone: '', email: '', website: '' };
  return { version: 1, kind, text: '' };
}
/** Shared rendering fallback; the API additionally supplies its destination URL policy. */
export function isPublicBusinessUrl(value: string): boolean {
  try {
    if (!/^https?:\/\//i.test(value) || /[\s\\\u0000-\u001f\u007f]/.test(value)) return false;
    const u = new URL(value), host = u.hostname.toLowerCase().replace(/\.+$/, '');
    if (!['http:', 'https:'].includes(u.protocol) || u.username || u.password) return false;
    if (!host || host === 'localhost' || /\.(localhost|local|internal)$/.test(host)) return false;
    if (host.startsWith('[')) return /^\[[23][0-9a-f]{0,3}:/.test(host);
    return !/^(?:0|10|127|169\.254|172\.(?:1[6-9]|2\d|3[01])|192\.168|100\.(?:6[4-9]|[7-9]\d|1[01]\d|12[0-7])|198\.(?:18|19)|22[4-9]|23\d|24\d|25[0-5])\./.test(host);
  } catch { return false; }
}
export function validateBusinessData(kind: string, raw: unknown, allowedUrl: (url: string) => boolean = isPublicBusinessUrl): BusinessData {
  let v: unknown = raw;
  if (typeof v === 'string') { try { v = JSON.parse(v); } catch { throw new Error('Data blok harus berupa JSON valid'); } }
  if (!object(v) || v.version !== 1 || v.kind !== kind || !isBusinessBlock(kind)) throw new Error('Jenis atau versi data blok tidak valid');
  if (new TextEncoder().encode(JSON.stringify(v)).length > 32768) throw new Error('Data blok maksimal 32 KiB');
  const text = (value: unknown, max: number, required = false): string => {
    if (typeof value !== 'string' || value.length > max || (required && !value.trim())) throw new Error(`Teks wajib valid, maksimal ${max} karakter`);
    return value.trim();
  };
  const url = (value: unknown, preserve = false): string => {
    const s = text(value, 2048); if (!s) return '';
    try { const u = new URL(s); if (!isPublicBusinessUrl(s) || !allowedUrl(s)) throw 0; return preserve ? s : u.href; }
    catch { throw new Error('URL harus berupa alamat HTTP/HTTPS publik'); }
  };
  if (kind === 'catalog') {
    if (!['list', 'grid'].includes(v.layout) || !['products', 'services'].includes(v.presentation) || !Array.isArray(v.categories) || v.categories.length > 8 || !Array.isArray(v.items) || v.items.length > 50) throw new Error('Katalog maksimal 50 item dan 8 kategori');
    const categories = v.categories.map((x) => text(x, 40, true));
    if (new Set(categories).size !== categories.length) throw new Error('Kategori tidak boleh duplikat');
    const ids = new Set<string>();
    const items: CatalogItem[] = v.items.map((item: unknown) => {
      if (!object(item)) throw new Error('Item tidak valid');
      const id = text(item.id, 64, true);
      if (!/^[a-zA-Z0-9_-]+$/.test(id) || ids.has(id)) throw new Error('ID item harus unik'); ids.add(id);
      const category = text(item.category, 40);
      if (category && !categories.includes(category)) throw new Error('Kategori item tidak ditemukan');
      if (!['fixed', 'from', 'ask'].includes(item.price_kind) || !['available', 'unavailable', 'hidden'].includes(item.status)) throw new Error('Jenis harga atau ketersediaan tidak valid');
      if (item.price_kind !== 'ask' && (!Number.isSafeInteger(item.price) || item.price < 0 || item.price > 1000000000000)) throw new Error('Harga harus rupiah utuh dan tidak negatif');
      if (item.duration !== null && (!Number.isInteger(item.duration) || item.duration < 1 || item.duration > 10080)) throw new Error('Durasi harus 1–10080 menit');
      return { id, name: text(item.name, 100, true), description: text(item.description, 240), category, image_url: url(item.image_url), price: item.price_kind === 'ask' ? null : item.price, price_kind: item.price_kind, unit: text(item.unit, 30), status: item.status, duration: item.duration,
        ...(item.action_url === undefined ? {} : { action_url: url(item.action_url, true) }),
        ...(item.action_label === undefined ? {} : { action_label: text(item.action_label, 40) }) };
    });
    let whatsapp: string | undefined;
    if (v.whatsapp !== undefined) {
      const raw = text(v.whatsapp, 64);
      whatsapp = raw.replace(/[+\s().-]/g, '');
      if (raw && (!/^\+?[\d\s().-]+$/.test(raw) || !/^[1-9]\d{6,14}$/.test(whatsapp))) throw new Error('WhatsApp harus memakai kode negara, contoh 628123456789');
    }
    return { version: 1, kind, layout: v.layout, presentation: v.presentation, categories, items,
      ...(whatsapp === undefined ? {} : { whatsapp }), ...(v.disclosure === undefined ? {} : { disclosure: text(v.disclosure, 280) }) };
  }
  if (kind === 'business_info') {
    if (!['Asia/Jakarta', 'Asia/Makassar', 'Asia/Jayapura'].includes(v.timezone) || typeof v.closed !== 'boolean' || !Array.isArray(v.hours) || v.hours.length > 7) throw new Error('Jadwal atau zona waktu tidak valid');
    const days = new Set<number>();
    const hours = v.hours.map((h: unknown) => {
      if (!object(h) || !Number.isInteger(h.day) || h.day < 0 || h.day > 6 || days.has(h.day) || typeof h.open !== 'string' || typeof h.close !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(h.open) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(h.close) || h.open === h.close) throw new Error('Jam buka harus valid dan hari tidak boleh duplikat');
      days.add(h.day); return { day: h.day, open: h.open, close: h.close };
    });
    return { version: 1, kind, timezone: v.timezone, closed: v.closed, note: text(v.note, 500), hours };
  }
  if (kind === 'location') return { version: 1, kind, address: text(v.address, 500), map_url: url(v.map_url) };
  if (kind === 'contact') {
    const whatsapp = text(v.whatsapp, 16), phone = text(v.phone, 20), email = text(v.email, 254);
    if (whatsapp && !/^[1-9]\d{6,14}$/.test(whatsapp)) throw new Error('WhatsApp harus memakai kode negara, contoh 628123456789');
    if (phone && !/^\+?[1-9]\d{6,14}$/.test(phone)) throw new Error('Nomor telepon tidak valid');
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Email tidak valid');
    return { version: 1, kind, whatsapp, phone, email, website: url(v.website) };
  }
  return { version: 1, kind: 'announcement', text: text(v.text, 1000) };
}

/** Eligibility mirrors the meaningful sections rendered on the public profile. */
export function hasBusinessContent(data: BusinessData): boolean {
  if (data.kind === 'catalog') return data.items.some((item) => item.status !== 'hidden');
  if (data.kind === 'business_info') return !!(data.hours.length || data.note || data.closed);
  if (data.kind === 'location') return !!(data.address || data.map_url);
  if (data.kind === 'contact') return !!(data.whatsapp || data.phone || data.email || data.website);
  return !!data.text;
}

export function businessOpenStatus(data: InfoData, now = new Date()): 'open' | 'closed' | 'unknown' {
  if (data.closed) return 'closed'; if (!data.hours.length) return 'unknown';
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: data.timezone, weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value || '';
  const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday'));
  const current = `${get('hour')}:${get('minute')}`;
  const today = data.hours.find((h) => h.day === day), previous = data.hours.find((h) => h.day === (day + 6) % 7);
  if (previous && previous.close < previous.open && current < previous.close) return 'open';
  if (today && (today.close > today.open ? current >= today.open && current < today.close : current >= today.open)) return 'open';
  return 'closed';
}
