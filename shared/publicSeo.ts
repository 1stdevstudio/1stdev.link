import type { BioProfile, Link } from './types.js';
import { hasBusinessContent, isBusinessBlock, isContentBlock, validateBusinessData } from './business.js';

/**
 * SEO + GEO (Generative Engine Optimization) untuk 1stdev.link.
 * Satu sumber untuk robots.txt, sitemap.xml, meta/JSON-LD halaman bio, dan deteksi bot.
 * Konten landing (meta, FAQ, llms.txt, og.png) ada sebagai file statis di web/.
 */

export const SITE = {
  name: '1stdev.link',
  publisher: '1stdev.space',
  publisherUrl: 'https://1stdev.space',
  ogImage: '/og.png?v=20261109',
  themeColor: '#18765D',
  favicon: "data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20112%20112%22%3E%3Cpath%20fill%3D%22%230DAD62%22%20d%3D%22M27%2025c0-4%202-7%206-9L78%201c11-4%2019%202%2019%2013v50c0%208-3%2013-10%2017l-10%206V34c0-11-7-16-16-12L27%2039z%22%2F%3E%3Cpath%20fill%3D%22%2391D6AE%22%20d%3D%22M26%2034c0-3%202-6%205-7L70%2012c10-4%2018%202%2018%2013v41c0%207-4%2012-10%2015l-9%205V37c0-9-7-14-16-10L26%2041z%22%2F%3E%3Cpath%20fill%3D%22%23064A36%22%20d%3D%22M14%2050%2056%2032c10-4%2018%202%2018%2013v38c0%208-4%2013-11%2017l-29%2012c-8%204-14%200-14-8V72L9%2077C2%2080%200%2076%200%2069V63c0-6%204-10%2014-13z%22%2F%3E%3C%2Fsvg%3E",
};

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/** JSON aman untuk disisipkan di <script type="application/ld+json">: tidak bisa menutup tag script. */
export function safeJsonLd(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

const isHttpUrl = (u: unknown): u is string => typeof u === 'string' && /^https?:\/\/[^\s"'<>]+$/i.test(u.trim());

/** Kolom updated_at bisa detik (unixepoch()) atau milidetik (Date.now()). */
export function toDate(ts: number | undefined): Date | null {
  if (!ts || !Number.isFinite(ts)) return null;
  return new Date(ts > 1e12 ? ts : ts * 1000);
}

const truncate = (s: string, max: number) => (s.length <= max ? s : `${s.slice(0, max - 1).trimEnd()}…`);

/** Handle bawaan akun tamu yang belum diklaim: edge_xxxxxx. */
export const DEFAULT_GUEST_HANDLE = /^edge_[a-z0-9]+$/i;

/**
 * Halaman bio layak diindeks bila punya link atau blok usaha valid yang benar-benar tampil.
 * Halaman kosong/tamu tetap bisa dibuka, hanya tidak ditawarkan ke mesin pencari (hindari thin content).
 */
export function shouldIndexProfile(profile: BioProfile, links: Link[]): boolean {
  if ((profile as BioProfile & { is_guest?: number }).is_guest === 1 || DEFAULT_GUEST_HANDLE.test(profile.handle || '')) return false;
  return links.some((l) => {
    if (l.is_active !== 1 || l.is_bio_entry !== 1) return false;
    if (!isBusinessBlock(l.block_type)) return !isContentBlock(l.block_type) && isHttpUrl(l.destination_url);
    try { return hasBusinessContent(validateBusinessData(l.block_type, l.data_json)); } catch { return false; }
  });
}

/** Crawler, bot SEO/AI, dan pengambil pratinjau link (WhatsApp, Telegram, dll). Tidak dihitung sebagai klik. */
const BOT_UA =
  /bot\b|bot\/|crawl|spider|slurp|mediapartners|facebookexternalhit|facebookcatalog|whatsapp|telegram|discord|slack|skype|embedly|quora link preview|pinterest|vkshare|w3c_validator|headless|lighthouse|preview|python-requests|curl\/|wget|go-http-client|axios|node-fetch|okhttp|ahrefs|semrush|mj12|dotbot|petalbot|bingpreview|google-inspectiontool|chatgpt-user|perplexity|claude-user|claude-searchbot|oai-searchbot/i;

export function isLikelyBot(ua: string): boolean {
  if (!ua) return true;
  return BOT_UA.test(ua);
}

// ---------- robots.txt ----------

/** Mesin jawab AI yang mengambil halaman untuk menjawab/mengutip (bukan crawler pelatihan). */
const AI_ANSWER_AGENTS = [
  'OAI-SearchBot',
  'ChatGPT-User',
  'PerplexityBot',
  'Perplexity-User',
  'Claude-SearchBot',
  'Claude-User',
  'DuckAssistBot',
  'MistralAI-User',
];

export function renderRobotsTxt(baseUrl: string): string {
  return [
    '# 1stdev.link by 1stdev.space',
    '# Halaman profil publik (/@handle) dan halaman utama boleh diindeks.',
    '# Aturan pengindeksan dan akses halaman publik 1stdev.link.',
    '',
    'User-agent: *',
    'Allow: /',
    'Disallow: /api/',
    '',
    '# Mesin jawab AI (pencarian & kutipan langsung)',
    ...AI_ANSWER_AGENTS.map((a) => `User-agent: ${a}`),
    'Allow: /',
    'Disallow: /api/',
    '',
    `Sitemap: ${baseUrl}/sitemap.xml`,
    '',
  ].join('\n');
}

// ---------- sitemap.xml ----------

export interface SitemapProfileRow {
  handle: string;
  updated_at: number;
}

export const SITEMAP_PROFILES_SQL = `SELECT p.handle, p.updated_at FROM bio_profiles p JOIN users u ON u.id = p.user_id
  WHERE COALESCE(u.is_guest, 0) = 0
    AND p.handle NOT LIKE 'edge\\_%' ESCAPE '\\'
    AND EXISTS (SELECT 1 FROM links l WHERE l.user_id = p.user_id AND l.is_bio_entry = 1 AND l.is_active = 1 AND (
      (COALESCE(l.block_type, 'link') NOT IN ('catalog','business_info','location','contact','announcement','header','text','divider')
        AND (l.destination_url LIKE 'https://_%' OR l.destination_url LIKE 'http://_%'))
      OR CASE WHEN json_valid(l.data_json) THEN
        json_type(l.data_json) = 'object' AND json_extract(l.data_json, '$.version') = 1
        AND json_extract(l.data_json, '$.kind') = l.block_type AND CASE l.block_type
          WHEN 'catalog' THEN
            json_extract(l.data_json, '$.layout') IN ('list','grid')
            AND json_extract(l.data_json, '$.presentation') IN ('products','services')
            AND json_type(l.data_json, '$.categories') = 'array' AND json_array_length(l.data_json, '$.categories') <= 8
            AND json_type(l.data_json, '$.items') = 'array' AND json_array_length(l.data_json, '$.items') BETWEEN 1 AND 50
            AND EXISTS (SELECT 1 FROM json_each(l.data_json, '$.items') i WHERE CASE WHEN i.type = 'object' THEN
              json_type(i.value, '$.name') = 'text' AND length(trim(json_extract(i.value, '$.name'))) BETWEEN 1 AND 100
              AND json_extract(i.value, '$.status') IN ('available','unavailable')
              AND json_type(i.value, '$.id') = 'text' AND length(trim(json_extract(i.value, '$.id'))) BETWEEN 1 AND 64
              AND json_type(i.value, '$.description') = 'text' AND json_type(i.value, '$.category') = 'text'
              AND json_type(i.value, '$.image_url') = 'text' AND json_type(i.value, '$.unit') = 'text'
              AND json_extract(i.value, '$.price_kind') IN ('fixed','from','ask')
              AND (json_extract(i.value, '$.price_kind') = 'ask' OR (json_type(i.value, '$.price') = 'integer' AND json_extract(i.value, '$.price') BETWEEN 0 AND 1000000000000))
              AND (json_type(i.value, '$.duration') = 'null' OR (json_type(i.value, '$.duration') = 'integer' AND json_extract(i.value, '$.duration') BETWEEN 1 AND 10080))
              ELSE 0 END)
          WHEN 'business_info' THEN json_extract(l.data_json, '$.timezone') IN ('Asia/Jakarta','Asia/Makassar','Asia/Jayapura')
            AND json_type(l.data_json, '$.closed') IN ('true','false') AND json_type(l.data_json, '$.note') = 'text'
            AND json_type(l.data_json, '$.hours') = 'array' AND json_array_length(l.data_json, '$.hours') <= 7
            AND (json_extract(l.data_json, '$.closed') = 1 OR length(trim(json_extract(l.data_json, '$.note'))) > 0
              OR EXISTS (SELECT 1 FROM json_each(l.data_json, '$.hours') h WHERE CASE WHEN h.type = 'object' THEN
                json_type(h.value, '$.day') = 'integer' AND json_extract(h.value, '$.day') BETWEEN 0 AND 6
                AND json_extract(h.value, '$.open') GLOB '[012][0-9]:[0-5][0-9]' AND json_extract(h.value, '$.close') GLOB '[012][0-9]:[0-5][0-9]'
                AND json_extract(h.value, '$.open') != json_extract(h.value, '$.close') ELSE 0 END))
          WHEN 'location' THEN json_type(l.data_json, '$.address') = 'text' AND json_type(l.data_json, '$.map_url') = 'text'
            AND (length(trim(json_extract(l.data_json, '$.address'))) > 0 OR json_extract(l.data_json, '$.map_url') LIKE 'https://_%' OR json_extract(l.data_json, '$.map_url') LIKE 'http://_%')
          WHEN 'contact' THEN json_type(l.data_json, '$.whatsapp') = 'text' AND json_type(l.data_json, '$.phone') = 'text'
            AND json_type(l.data_json, '$.email') = 'text' AND json_type(l.data_json, '$.website') = 'text'
            AND (length(trim(json_extract(l.data_json, '$.whatsapp'))) > 0 OR length(trim(json_extract(l.data_json, '$.phone'))) > 0
              OR length(trim(json_extract(l.data_json, '$.email'))) > 0 OR json_extract(l.data_json, '$.website') LIKE 'https://_%' OR json_extract(l.data_json, '$.website') LIKE 'http://_%')
          WHEN 'announcement' THEN json_type(l.data_json, '$.text') = 'text' AND length(trim(json_extract(l.data_json, '$.text'))) BETWEEN 1 AND 1000
          ELSE 0 END
        ELSE 0 END))
  ORDER BY p.updated_at DESC LIMIT 5000`;

const xmlEscape = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');

export function renderSitemapXml(baseUrl: string, profiles: SitemapProfileRow[]): string {
  const urls: string[] = [
    `  <url><loc>${xmlEscape(`${baseUrl}/`)}</loc><changefreq>weekly</changefreq><priority>1.0</priority></url>`,
    `  <url><loc>${xmlEscape(`${baseUrl}/docs`)}</loc><changefreq>monthly</changefreq><priority>0.5</priority></url>`,
    `  <url><loc>${xmlEscape(`${baseUrl}/privacy`)}</loc><lastmod>2026-11-09</lastmod><changefreq>monthly</changefreq><priority>0.4</priority></url>`,
    `  <url><loc>${xmlEscape(`${baseUrl}/terms`)}</loc><lastmod>2026-11-09</lastmod><changefreq>monthly</changefreq><priority>0.4</priority></url>`,
  ];
  for (const p of profiles) {
    if (!p.handle || DEFAULT_GUEST_HANDLE.test(p.handle)) continue;
    const d = toDate(p.updated_at);
    const lastmod = d ? `<lastmod>${d.toISOString().slice(0, 10)}</lastmod>` : '';
    urls.push(
      `  <url><loc>${xmlEscape(`${baseUrl}/@${encodeURIComponent(p.handle)}`)}</loc>${lastmod}<changefreq>weekly</changefreq><priority>0.7</priority></url>`
    );
  }
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
}

// ---------- Halaman bio ----------

export interface BioSeoInput {
  profile: BioProfile;
  links: Link[];
  baseUrl: string;
  lang: 'id' | 'en';
  themeColor: string;
  socials: Record<string, string>;
}

/** Tag <head> untuk SEO + kartu sosial + JSON-LD ProfilePage. Semua teks pengguna di-escape. */
export function renderBioSeoHead({ profile, links, baseUrl, lang, themeColor, socials }: BioSeoInput): string {
  const rawName = (profile.display_name || '1stdev.link User').trim();
  const rawHandle = (profile.handle || 'user').trim();
  const canonical = `${baseUrl}/@${encodeURIComponent(rawHandle)}`;
  const realLinks = links
    .filter((l) => l.is_active === 1 && isHttpUrl(l.destination_url))
    .sort((a, b) => a.sort_order - b.sort_order);

  const topTitles = realLinks
    .map((l) => (l.title || '').trim())
    .filter(Boolean)
    .slice(0, 3);
  const fallbackDesc =
    lang === 'id'
      ? `Semua link ${rawName} di satu halaman.${topTitles.length ? ` ${topTitles.join(' · ')}.` : ''}`
      : `All of ${rawName}'s links in one place.${topTitles.length ? ` ${topTitles.join(' · ')}.` : ''}`;
  const rawDesc = truncate((profile.bio || '').replace(/\s+/g, ' ').trim() || fallbackDesc, 160);
  const rawTitle = `${rawName} (@${rawHandle})`;

  const avatar = isHttpUrl(profile.avatar_url) ? profile.avatar_url.trim() : '';
  const image = avatar || `${baseUrl}${SITE.ogImage}`;
  const indexable = shouldIndexProfile(profile, links);
  const sameAs = Object.values(socials).filter(isHttpUrl).map((u) => u.trim());
  const modified = toDate(profile.updated_at);

  const ld: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    '@id': `${canonical}#page`,
    url: canonical,
    name: rawTitle,
    description: rawDesc,
    inLanguage: lang,
    ...(modified ? { dateModified: modified.toISOString() } : {}),
    isPartOf: { '@type': 'WebSite', '@id': `${baseUrl}/#website`, name: SITE.name, url: `${baseUrl}/` },
    mainEntity: {
      '@type': 'Person',
      '@id': `${canonical}#person`,
      name: rawName,
      alternateName: `@${rawHandle}`,
      identifier: rawHandle,
      url: canonical,
      ...(profile.bio ? { description: profile.bio.trim() } : {}),
      ...(avatar ? { image: avatar } : {}),
      ...(sameAs.length ? { sameAs } : {}),
    },
    ...(realLinks.length
      ? { significantLink: [...new Set(realLinks.map((l) => l.destination_url.trim()))].slice(0, 20) }
      : {}),
  };

  const e = escapeHtml;
  const title = e(rawTitle);
  const desc = e(rawDesc);
  return [
    `<meta name="description" content="${desc}">`,
    `<link rel="canonical" href="${e(canonical)}">`,
    `<meta name="robots" content="${indexable ? 'index, follow, max-image-preview:large' : 'noindex, follow'}">`,
    `<meta name="theme-color" content="${e(themeColor)}">`,
    `<link rel="icon" type="image/svg+xml" href="${SITE.favicon}">`,
    `<link rel="apple-touch-icon" href="${e(baseUrl)}/apple-touch-icon.png">`,
    `<meta property="og:type" content="profile">`,
    `<meta property="og:site_name" content="${e(SITE.name)}">`,
    `<meta property="og:locale" content="${lang === 'id' ? 'id_ID' : 'en_US'}">`,
    `<meta property="og:url" content="${e(canonical)}">`,
    `<meta property="og:title" content="${title}">`,
    `<meta property="og:description" content="${desc}">`,
    `<meta property="og:image" content="${e(image)}">`,
    `<meta property="og:image:secure_url" content="${e(image)}">`,
    `<meta property="og:image:alt" content="${title}">`,
    `<meta property="profile:username" content="${e(rawHandle)}">`,
    `<meta name="twitter:card" content="${avatar ? 'summary' : 'summary_large_image'}">`,
    `<meta name="twitter:title" content="${title}">`,
    `<meta name="twitter:description" content="${desc}">`,
    `<meta name="twitter:image" content="${e(image)}">`,
    `<meta name="twitter:image:alt" content="${title}">`,
    `<script type="application/ld+json">${safeJsonLd(ld)}</script>`,
  ].join('\n  ');
}
