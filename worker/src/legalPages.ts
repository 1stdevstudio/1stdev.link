import { LEGAL_VERSION, LEGAL_CONTACT, legalDocuments, legalHighlights } from '../../web/src/legal/content.js';
import { escapeHtml, safeJsonLd } from '../../shared/publicSeo.js';
import { LEGAL_PAGE_CSS } from './legalPageStyles.js';

type LegalKind = 'privacy' | 'terms';
type Lang = 'id' | 'en';

const brandMark = `<svg class="brand-mark" width="39" height="39" viewBox="0 0 112 112" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
<path fill="#0DAD62" d="M27 25c0-4 2-7 6-9L78 1c11-4 19 2 19 13v50c0 8-3 13-10 17l-10 6V34c0-11-7-16-16-12L27 39z"/>
<path fill="#91D6AE" d="M26 34c0-3 2-6 5-7L70 12c10-4 18 2 18 13v41c0 7-4 12-10 15l-9 5V37c0-9-7-14-16-10L26 41z"/>
<path fill="#064A36" d="M14 50 56 32c10-4 18 2 18 13v38c0 8-4 13-11 17l-29 12c-8 4-14 0-14-8V72L9 77C2 80 0 76 0 69V63c0-6 4-10 14-13z"/>
</svg>`;

/** Server-rendered legal reading experience; uses the same policy text as the app. */
export function renderLegalPage(kind: LegalKind, lang: Lang, baseUrl: string): string {
  const base = baseUrl.replace(/\/$/, '');
  const url = base + '/' + kind;
  const canonical = url + (lang === 'en' ? '?lang=en' : '');
  const isPrivacy = kind === 'privacy';
  const id = lang === 'id';
  const label = id
    ? (isPrivacy ? 'Kebijakan Privasi' : 'Ketentuan Layanan')
    : (isPrivacy ? 'Privacy Policy' : 'Terms of Service');
  const titlePieces = id
    ? (isPrivacy ? ['Privasi Anda.', 'Prioritas Kami.'] : ['Aturan Jelas.', 'Ruang Berkarya.'])
    : (isPrivacy ? ['Your Privacy.', 'Our Priority.'] : ['Clear Terms.', 'Room to Create.']);
  const description = isPrivacy
    ? (id ? 'Data akun, konten publik, statistik klik, keamanan, penyedia layanan, dan hak penghapusan di 1stdev.link.' : 'Account data, public content, click statistics, security, service providers, and deletion rights on 1stdev.link.')
    : (id ? 'Ketentuan penggunaan 1stdev.link: publikasi, tautan, keamanan, moderasi, dan hak pengguna.' : 'Terms for 1stdev.link: publishing, links, security, moderation, and user rights.');
  const doc = legalDocuments[lang][kind];
  const readingMinutes = Math.max(2, Math.round((doc.intro.split(/\s+/).length + doc.sections.reduce((a, s) => a + s.paragraphs.join(' ').split(/\s+/).length, 0)) / 210));
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': canonical + '#webpage',
    url: canonical,
    name: label + ' — 1stdev.link',
    description,
    inLanguage: lang,
    dateModified: LEGAL_VERSION,
    isPartOf: { '@type': 'WebSite', '@id': base + '/#website', name: '1stdev.link' },
    publisher: { '@type': 'Organization', name: '1stdev.space', url: 'https://1stdev.space' },
  };
  const toc = doc.sections.map((s, i) => `<a href="#section-${i + 1}"><span>${String(i + 1).padStart(2, '0')}</span>${escapeHtml(s.title)}</a>`).join('');
  const sections = doc.sections.map((section, i) =>
    `<section id="section-${i + 1}" aria-labelledby="section-title-${i + 1}"><span class="section-count" aria-hidden="true">${String(i + 1).padStart(2, '0')}</span><h3 id="section-title-${i + 1}">${escapeHtml(section.title)}</h3>${section.paragraphs.map(p => `<p>${escapeHtml(p)}</p>`).join('')}</section>`
  ).join('\n');
  const summary = legalHighlights[lang][kind].map((point, i) => `<li><span class="summary-num">${String(i + 1).padStart(2, '0')} / 04</span>${escapeHtml(point)}</li>`).join('');
  const summaryNote = id ? 'Ringkasan memudahkan pembacaan; dokumen lengkap tetap berlaku.' : 'A quick overview; the complete document remains applicable.';
  const other = isPrivacy ? 'terms' : 'privacy';
  const otherLabel = id ? (isPrivacy ? 'Ketentuan Layanan' : 'Kebijakan Privasi') : (isPrivacy ? 'Terms of Service' : 'Privacy Policy');

  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(label)} — 1stdev.link</title>
<meta name="description" content="${escapeHtml(description)}">
<meta name="robots" content="index,follow,max-snippet:-1">
<meta name="theme-color" content="#f7f9f7">
<link rel="canonical" href="${escapeHtml(canonical)}">
<link rel="alternate" hreflang="id" href="${escapeHtml(url)}">
<link rel="alternate" hreflang="en" href="${escapeHtml(url)}?lang=en">
<link rel="alternate" hreflang="x-default" href="${escapeHtml(url)}">
<meta property="og:type" content="article">
<meta property="og:site_name" content="1stdev.link">
<meta property="og:url" content="${escapeHtml(canonical)}">
<meta property="og:title" content="${escapeHtml(label)} — 1stdev.link">
<meta property="og:description" content="${escapeHtml(description)}">
<meta property="og:image" content="${escapeHtml(base)}/og.png?v=20261109">
<meta property="og:image:secure_url" content="${escapeHtml(base)}/og.png?v=20261109">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="1stdev.link — Satu link untuk semua yang kamu bagikan">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escapeHtml(label)} — 1stdev.link">
<meta name="twitter:description" content="${escapeHtml(description)}">
<meta name="twitter:image" content="${escapeHtml(base)}/og.png?v=20261109">
<script type="application/ld+json">${safeJsonLd(schema)}</script>
<style>${LEGAL_PAGE_CSS}</style>
</head>
<body>
<a class="skip-link" href="#content">${id ? 'Langsung ke isi' : 'Skip to content'}</a>
<header class="site-head"><div class="shell site-head-inner">
  <a class="brand" href="/" aria-label="1stdev.link — ${id ? 'Beranda' : 'Home'}">${brandMark}<span class="brand-name">1stdev<em>.</em>link</span></a>
  <nav class="head-links" aria-label="${id ? 'Dokumen hukum' : 'Legal documents'}">
    <a href="/privacy${id ? '' : '?lang=en'}" ${isPrivacy ? 'aria-current="page"' : ''}>${id ? 'Privasi' : 'Privacy'}</a>
    <a href="/terms${id ? '' : '?lang=en'}" ${!isPrivacy ? 'aria-current="page"' : ''}>${id ? 'Ketentuan' : 'Terms'}</a>
    <a class="lang" href="${escapeHtml(url)}${id ? '?lang=en' : ''}" hreflang="${id ? 'en' : 'id'}" aria-label="${id ? 'Read in English' : 'Baca dalam Bahasa Indonesia'}">${id ? 'EN' : 'ID'}</a>
  </nav>
</div></header>
<main id="content" class="shell">
  <section class="page-hero" aria-labelledby="page-title">
    <div class="breadcrumb"><a href="/">1stdev.link</a><span aria-hidden="true">/</span><span>${escapeHtml(label)}</span></div>
    <div class="hero-layout">
      <div>
        <p class="eyebrow"><i aria-hidden="true"></i>${id ? 'INFORMASI & KEBIJAKAN' : 'INFORMATION & POLICIES'}</p>
        <h1 id="page-title" class="hero-title">${escapeHtml(titlePieces[0])}<br><span>${escapeHtml(titlePieces[1])}</span></h1>
        <p class="hero-intro">${escapeHtml(doc.intro)}</p>
        <div class="doc-meta"><span class="meta-chip">${id ? 'Diperbarui' : 'Updated'} ${escapeHtml(LEGAL_VERSION)}</span><span>${doc.sections.length} ${id ? 'bagian' : 'sections'}</span><span aria-hidden="true">·</span><span>${readingMinutes} ${id ? 'menit baca' : 'min read'}</span></div>
      </div>
      <aside class="hero-aside" aria-label="${id ? 'Informasi dokumen' : 'Document information'}">
        <div class="hero-aside-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z"/><path d="m9 11 2 2 4-4"/></svg></div>
        <div><p class="hero-aside-label">${id ? 'TRANSPARANSI' : 'TRANSPARENCY'}</p><h2>${id ? 'Jelas, terbuka, dan mudah dipahami.' : 'Clear, open, and easy to understand.'}</h2><p>${id ? 'Ketahui aturan layanan dan bagaimana informasi Anda digunakan.' : 'Know the service rules and how your information is handled.'}</p></div>
      </aside>
    </div>
  </section>
  <section class="summary-wrap" aria-labelledby="summary-title">
    <div class="summary-heading"><div><p class="section-kicker">${id ? 'RINGKASAN CEPAT' : 'AT A GLANCE'}</p><h2 id="summary-title">${id ? 'Hal penting yang perlu diketahui' : 'What matters most'}</h2></div><p class="summary-note">${escapeHtml(summaryNote)}</p></div>
    <ol class="summary-grid">${summary}</ol>
  </section>
  <div class="reading-layout">
    <aside class="reading-sidebar" aria-label="${id ? 'Daftar isi' : 'Contents'}">
      <p class="section-kicker">${id ? 'DI HALAMAN INI' : 'ON THIS PAGE'}</p>
      <nav class="toc-list">${toc}</nav>
      <div class="sidebar-contact"><strong>${id ? 'Ada pertanyaan?' : 'Questions?'}</strong><p>${id ? 'Tim dukungan siap menerima permintaan privasi dan laporan.' : 'Reach our team about privacy requests and reports.'}</p><a href="mailto:${escapeHtml(LEGAL_CONTACT.support)}">${escapeHtml(LEGAL_CONTACT.support)}</a></div>
    </aside>
    <div class="article-content">
      <details class="mobile-toc"><summary>${id ? 'Daftar isi · Pilih bagian' : 'Contents · Jump to a section'}</summary><nav class="toc-list" aria-label="${id ? 'Daftar isi' : 'Contents'}">${toc}</nav></details>
      <p class="article-overline">${id ? 'DOKUMEN LENGKAP' : 'COMPLETE DOCUMENT'}</p>
      <h2>${escapeHtml(label)}</h2>
      <article aria-label="${escapeHtml(label)}">${sections}</article>
    </div>
  </div>
  <section class="contact-banner" aria-labelledby="contact-title">
    <div><p class="section-kicker">${id ? 'BANTUAN & HAK PENGGUNA' : 'SUPPORT & YOUR RIGHTS'}</p><h2 id="contact-title">${id ? 'Butuh bantuan terkait data atau akun?' : 'Need help with data or your account?'}</h2><p>${id ? 'Permintaan akses, koreksi, penghapusan, dan laporan keamanan dapat diajukan melalui email dukungan. Jangan sertakan OTP atau kunci API.' : 'Send access, correction, deletion, and security requests to support. Never include OTPs or API keys.'}</p></div>
    <div class="contact-actions"><a href="mailto:${escapeHtml(LEGAL_CONTACT.support)}?subject=${encodeURIComponent('1stdev.link - ' + label)}">${id ? 'Hubungi dukungan ↗' : 'Contact support ↗'}</a><a class="secondary" href="/${other}${id ? '' : '?lang=en'}">${escapeHtml(otherLabel)} →</a></div>
  </section>
</main>
<footer class="site-footer"><div class="shell footer-inner"><span>© 2026 1stdev.link · ${id ? 'Dibuat oleh' : 'By'} 1stdev.space</span><div><a href="/">${id ? 'Beranda' : 'Home'}</a> · <a href="/privacy${id ? '' : '?lang=en'}">${id ? 'Privasi' : 'Privacy'}</a> · <a href="/terms${id ? '' : '?lang=en'}">${id ? 'Ketentuan' : 'Terms'}</a></div></div></footer>
</body></html>`;
}
