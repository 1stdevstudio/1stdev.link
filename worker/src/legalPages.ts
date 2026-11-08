import { LEGAL_VERSION, LEGAL_CONTACT, legalDocuments, legalHighlights } from '../../web/src/legal/content.js';
import { escapeHtml, safeJsonLd } from '../../shared/publicSeo.js';

type LegalKind = 'privacy' | 'terms';
type Lang = 'id' | 'en';

/** Crawlable, JavaScript-free legal documents, synchronized with the UI. */
export function renderLegalPage(kind: LegalKind, lang: Lang, baseUrl: string): string {
  const base = baseUrl.replace(/\/$/, '');
  const url = base + '/' + kind;
  const canonical = url + (lang === 'en' ? '?lang=en' : '');
  const name = lang === 'id' ? (kind === 'privacy' ? 'Kebijakan Privasi' : 'Ketentuan Layanan') :
    (kind === 'privacy' ? 'Privacy Policy' : 'Terms of Service');
  const description = kind === 'privacy'
    ? (lang === 'id' ? 'Data akun, konten publik, statistik klik, keamanan, penyedia layanan, dan hak penghapusan di 1stdev.link.' : 'Account data, public content, click statistics, security, service providers, and deletion rights on 1stdev.link.')
    : (lang === 'id' ? 'Ketentuan penggunaan 1stdev.link: publikasi, tautan, keamanan, moderasi, dan hak pengguna.' : 'Terms for 1stdev.link: publishing, links, security, moderation, and user rights.');
  const doc = legalDocuments[lang][kind];
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': canonical + '#webpage',
    url: canonical,
    name: name + ' — 1stdev.link',
    description,
    inLanguage: lang,
    dateModified: LEGAL_VERSION,
    isPartOf: { '@type': 'WebSite', '@id': base + '/#website', name: '1stdev.link' },
    publisher: { '@type': 'Organization', name: '1stdev.space', url: 'https://1stdev.space' },
  };
  const sections = doc.sections.map((part, i) => `<section id="section-${i + 1}"><h2>${i + 1}. ${escapeHtml(part.title)}</h2>${part.paragraphs.map(p => `<p>${escapeHtml(p)}</p>`).join('')}</section>`).join('\n');
  const summary = legalHighlights[lang][kind].map(point => `<li>${escapeHtml(point)}</li>`).join('');
  const nav = `<nav class="topnav" aria-label="${lang === 'id' ? 'Navigasi utama' : 'Main navigation'}">
    <a href="/">1stdev.link</a>
    <a href="/privacy" ${kind === 'privacy' ? 'aria-current="page"' : ''}>${lang === 'id' ? 'Privasi' : 'Privacy'}</a>
    <a href="/terms" ${kind === 'terms' ? 'aria-current="page"' : ''}>${lang === 'id' ? 'Ketentuan' : 'Terms'}</a>
    <a href="${escapeHtml(url)}${lang === 'id' ? '?lang=en' : ''}" hreflang="${lang === 'id' ? 'en' : 'id'}">${lang === 'id' ? 'EN' : 'ID'}</a>
  </nav>`;
  return `<!doctype html>
<html lang="${lang}"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(name)} — 1stdev.link</title>
<meta name="description" content="${escapeHtml(description)}">
<meta name="robots" content="index,follow,max-snippet:-1">
<link rel="canonical" href="${escapeHtml(canonical)}">
<link rel="alternate" hreflang="id" href="${escapeHtml(url)}">
<link rel="alternate" hreflang="en" href="${escapeHtml(url)}?lang=en">
<meta property="og:type" content="article">
<meta property="og:url" content="${escapeHtml(canonical)}">
<meta property="og:title" content="${escapeHtml(name)} — 1stdev.link">
<meta property="og:description" content="${escapeHtml(description)}">
<meta property="og:image" content="${escapeHtml(base)}/og.png">
<meta name="twitter:card" content="summary_large_image">
<script type="application/ld+json">${safeJsonLd(schema)}</script>
<style>
:root{color-scheme:light}*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:#f7f9f7;color:#153c2d;font:16px/1.7 system-ui,-apple-system,sans-serif}a{color:#18765d}a:focus-visible{outline:3px solid #18765d;outline-offset:4px}header{background:white;border-bottom:1px solid #dfeae1}.topnav{max-width:1040px;margin:auto;padding:18px 24px;display:flex;gap:22px;flex-wrap:wrap;align-items:center}.topnav a{text-decoration:none;font-weight:650}.topnav a[aria-current]{text-decoration:underline}main{max-width:840px;margin:auto;padding:40px 24px 72px}h1{font-size:clamp(32px,5vw,48px);line-height:1.2;letter-spacing:-.04em}h2{font-size:22px;line-height:1.4;margin:0 0 10px}p{margin:12px 0}article section{padding:22px 0;border-bottom:1px solid #dfeae1}aside{background:#edf5ef;padding:24px;border-radius:18px}aside ul{padding-left:20px}aside li{margin:12px 0}.muted{color:#52695e}.toc{background:white;padding:20px;border-radius:16px;margin:30px 0}.toc a{display:block;padding:3px 0}footer{padding:28px 24px;text-align:center;border-top:1px solid #dfeae1}@media(max-width:600px){.topnav{gap:12px;font-size:14px}main{padding:30px 18px}article section{padding:18px 0}}
</style>
</head><body>
<header>${nav}</header>
<main>
<p class="muted">1stdev.link · ${lang === 'id' ? 'Diperbarui' : 'Updated'} ${escapeHtml(LEGAL_VERSION)}</p>
<h1>${escapeHtml(name)}</h1><p>${escapeHtml(doc.intro)}</p>
<aside aria-label="${lang === 'id' ? 'Ringkasan dokumen' : 'Document summary'}"><h2>${lang === 'id' ? 'Poin penting' : 'Key points'}</h2><p>${lang === 'id' ? 'Ringkasan ini bukan pengganti isi dokumen lengkap.' : 'This summary does not replace the full document.'}</p><ul>${summary}</ul></aside>
<nav class="toc" aria-label="${lang === 'id' ? 'Daftar isi' : 'Contents'}"><strong>${lang === 'id' ? 'Daftar isi' : 'Contents'}</strong>${doc.sections.map((part, i) => `<a href="#section-${i + 1}">${i + 1}. ${escapeHtml(part.title)}</a>`).join('')}</nav>
<article>${sections}</article>
<section><h2>${lang === 'id' ? 'Kontak dan permintaan data' : 'Contact and data requests'}</h2>
<p>${lang === 'id' ? 'Untuk akses, koreksi, penghapusan, dan laporan dugaan insiden, hubungi' : 'For access, correction, deletion, or suspected incidents, contact'} <a href="mailto:${escapeHtml(LEGAL_CONTACT.support)}">${escapeHtml(LEGAL_CONTACT.support)}</a>. ${lang === 'id' ? 'Jangan kirim OTP atau kunci API.' : 'Do not send OTPs or API keys.'}</p></section>
</main>
<footer>© 2026 1stdev.link · <a href="https://1stdev.space">1stdev.space</a> · <a href="/">${lang === 'id' ? 'Beranda' : 'Home'}</a></footer>
</body></html>`;
}
