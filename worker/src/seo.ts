import type { BioProfile, Link } from './types.js';

/**
 * SEO + GEO (Generative Engine Optimization) untuk 1stdev.link.
 * Satu sumber untuk robots.txt, sitemap.xml, meta/JSON-LD halaman bio, dan deteksi bot.
 * Konten landing (meta, FAQ, llms.txt, og.png) ada sebagai file statis di web/.
 */

export const SITE = {
  name: '1stdev.link by 1stdev.space',
  publisher: '1stdev.space',
  publisherUrl: 'https://1stdev.space',
  ogImage: '/og.png',
  themeColor: '#0e1f1b',
  favicon:
    "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23e9be54' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71'/><path d='M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71'/></svg>",
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
 * Halaman bio layak diindeks bila punya minimal satu link sungguhan dan bukan handle tamu bawaan.
 * Halaman kosong/tamu tetap bisa dibuka, hanya tidak ditawarkan ke mesin pencari (hindari thin content).
 */
export function shouldIndexProfile(profile: BioProfile, links: Link[]): boolean {
  if (DEFAULT_GUEST_HANDLE.test(profile.handle || '')) return false;
  return links.some((l) => l.is_active === 1 && isHttpUrl(l.destination_url));
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
    '# Kebijakan crawler pelatihan AI diatur di level zona 1stnear.com.',
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
    AND EXISTS (SELECT 1 FROM links l WHERE l.user_id = p.user_id AND l.is_bio_entry = 1 AND l.is_active = 1 AND l.destination_url != '#')
  ORDER BY p.updated_at DESC LIMIT 5000`;

const xmlEscape = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');

export function renderSitemapXml(baseUrl: string, profiles: SitemapProfileRow[]): string {
  const urls: string[] = [
    `  <url><loc>${xmlEscape(`${baseUrl}/`)}</loc><changefreq>weekly</changefreq><priority>1.0</priority></url>`,
    `  <url><loc>${xmlEscape(`${baseUrl}/docs`)}</loc><changefreq>monthly</changefreq><priority>0.5</priority></url>`,
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
    `<meta property="og:image:alt" content="${title}">`,
    `<meta property="profile:username" content="${e(rawHandle)}">`,
    `<meta name="twitter:card" content="${avatar ? 'summary' : 'summary_large_image'}">`,
    `<meta name="twitter:title" content="${title}">`,
    `<meta name="twitter:description" content="${desc}">`,
    `<meta name="twitter:image" content="${e(image)}">`,
    `<script type="application/ld+json">${safeJsonLd(ld)}</script>`,
  ].join('\n  ');
}
