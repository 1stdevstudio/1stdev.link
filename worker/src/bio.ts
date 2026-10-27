import type { BioProfile, Link } from './types.js';
import { escapeHtml, renderBioSeoHead } from './seo.js';

/** Sama dengan THEMES di web/src/components/screens/ProfileScreen.tsx. */
const THEME_PRESETS: Record<string, { bg: string; text: string; muted: string; accent: string }> = {
  '1stnear': { bg: '#0e1f1b', text: '#e8efea', muted: '#a9b8b0', accent: '#e9be54' },
  obsidian: { bg: '#0b0c12', text: '#f2f3f7', muted: '#b4b8c5', accent: '#7c8cff' },
  'clean-paper': { bg: '#f4f4f2', text: '#111111', muted: '#5f6368', accent: '#111111' },
  'aurora-emerald': { bg: '#0f1f1a', text: '#bff3d8', muted: '#86b8a0', accent: '#34d399' },
  'midnight-neon': { bg: '#1a1024', text: '#e9d5ff', muted: '#b39cc9', accent: '#c084fc' },
  'cyber-matrix': { bg: '#101826', text: '#bfdbfe', muted: '#8ea6c4', accent: '#60a5fa' },
  'rose-gold': { bg: '#1f1a12', text: '#fde68a', muted: '#c2ad7a', accent: '#fbbf24' },
};

export function renderBioPage(profile: BioProfile, links: Link[], baseUrl: string = '', acceptLanguage: string = ''): string {
  const name = escapeHtml(profile.display_name || '1stdev.link User');
  const handle = escapeHtml(profile.handle || 'user');
  const bio = profile.bio ? escapeHtml(profile.bio) : '';
  const avatar = profile.avatar_url ? escapeHtml(profile.avatar_url) : '';
  const isVerified = Boolean(profile.verified_badge);

  // Parse Style JSON safely
  let style: Record<string, any> = {};
  if (profile.style) {
    try {
      style = typeof profile.style === 'string' ? JSON.parse(profile.style) : profile.style;
    } catch {
      style = {};
    }
  }

  const bg = style.bg || 'dark';
  // Preset tema dari dashboard (profile.theme). style.bg/accent (editor v3) tetap menang bila diisi.
  // Tema kosong/lama (mis. 'minimal-dark') memakai tema bawaan 1stdev.
  const preset = style.bg ? undefined : THEME_PRESETS[profile.theme || ''] || THEME_PRESETS['1stnear'];
  const accent = (style.accent && /^#[0-9a-fA-F]{3,8}$/.test(style.accent)) ? style.accent : preset?.accent || '#e9be54';
  const font = style.font || 'modern';
  const btn = style.btn || 'soft';
  const radius = typeof style.radius === 'number' ? Math.max(0, Math.min(32, style.radius)) : 8;
  const gap = typeof style.gap === 'number' ? Math.max(8, Math.min(32, style.gap)) : 12;
  const enter = style.enter || 'none';
  const hover = style.hover || 'none';
  const bgfx: string[] = Array.isArray(style.bgfx) ? style.bgfx : [];
  const coverUrl = style.cover_url ? escapeHtml(style.cover_url) : '';
  const avatarShape = style.av_shape || profile.avatar_shape || 'circle';
  const avatarRing = Boolean(style.ring);
  const bgImage = style.bg_image ? escapeHtml(style.bg_image) : '';
  const bgBlur = typeof style.bg_blur === 'number' ? Math.max(0, Math.min(30, style.bg_blur)) : 0;
  const bgDim = typeof style.bg_dim === 'number' ? Math.max(0, Math.min(90, style.bg_dim)) : 0;

  // Language check for footer
  const isId = acceptLanguage.toLowerCase().includes('id');
  const footerText = isId ? 'Dibuat dengan 1stdev.link by 1stdev.space · gratis 100%' : 'Made with 1stdev.link by 1stdev.space · 100% free';

  let socialMap: Record<string, string> = {};
  if (profile.social_links) {
    try {
      socialMap = JSON.parse(profile.social_links);
    } catch {
      socialMap = {};
    }
  }

  const socialIconsHtml = Object.entries(socialMap)
    .filter(([_, url]) => typeof url === 'string' && /^(https?:\/\/|mailto:)/i.test(url.trim()))
    .map(([platform, url]) => {
      const cleanUrl = escapeHtml(url);
      const cleanPlatform = escapeHtml(platform);
      return `<a href="${cleanUrl}" target="_blank" rel="noopener noreferrer" class="social-link" title="${cleanPlatform}">${cleanPlatform}</a>`;
    })
    .join('');

  // Render Custom Block Types
  const blocksHtml = links
    .filter((l) => l.is_active === 1)
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((l) => {
      const blockType = l.block_type || 'link';
      const linkTitle = escapeHtml(l.title || l.slug);
      const targetUrl = `${baseUrl}/${encodeURIComponent(l.slug)}`;

      if (blockType === 'header') {
        return `<div class="block-header"><span>${linkTitle}</span></div>`;
      }

      if (blockType === 'text') {
        return `<div class="block-text"><p>${linkTitle}</p></div>`;
      }

      if (blockType === 'divider') {
        return `<div class="block-divider"><hr /></div>`;
      }

      if (blockType === 'featured') {
        return `<a href="${targetUrl}" class="link-card btn-${btn} hover-${hover} featured-card" target="_blank" rel="noopener noreferrer">
          <div class="featured-badge">★ Pilihan</div>
          <span class="link-title">${linkTitle}</span>
          <svg class="arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17l9.2-9.2M17 17V8H8"/></svg>
        </a>`;
      }

      if (blockType === 'whatsapp') {
        return `<a href="${targetUrl}" class="link-card btn-${btn} hover-${hover} whatsapp-card" target="_blank" rel="noopener noreferrer">
          <div class="wa-content">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2zm.01 1.67c4.54 0 8.24 3.7 8.24 8.24 0 2.2-.86 4.27-2.42 5.82a8.19 8.19 0 0 1-5.82 2.42c-1.48 0-2.94-.4-4.21-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.216 8.216 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.24-8.24zm4.52 11.66c-.25-.13-1.47-.72-1.7-.81-.23-.08-.39-.13-.56.13-.17.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.13-1.06-.39-2.02-1.25-.75-.67-1.26-1.5-1.41-1.75-.14-.25-.02-.39.11-.51.11-.11.25-.29.37-.44.13-.15.17-.25.25-.42.08-.17.04-.31-.02-.44-.06-.13-.56-1.35-.77-1.85-.2-.49-.41-.42-.56-.43h-.48c-.17 0-.44.06-.67.31-.23.25-.88.86-.88 2.1 0 1.24.9 2.44 1.03 2.61.13.17 1.78 2.72 4.31 3.81.6.26 1.07.42 1.44.54.61.19 1.16.17 1.6.1.49-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.15-1.18-.07-.11-.23-.17-.48-.29z"/></svg>
            <span class="link-title">${linkTitle}</span>
          </div>
          <svg class="arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17l9.2-9.2M17 17V8H8"/></svg>
        </a>`;
      }

      if (blockType === 'video') {
        return `<a href="${targetUrl}" class="link-card btn-${btn} hover-${hover} video-card" target="_blank" rel="noopener noreferrer">
          <div class="video-content">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            <span class="link-title">${linkTitle}</span>
          </div>
          <svg class="arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17l9.2-9.2M17 17V8H8"/></svg>
        </a>`;
      }

      return `<a href="${targetUrl}" class="link-card btn-${btn} hover-${hover}" target="_blank" rel="noopener noreferrer">
        <span class="link-title">${linkTitle}</span>
        <svg class="arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17l9.2-9.2M17 17V8H8"/></svg>
      </a>`;
    })
    .join('');

  // Font family string
  let fontFamily = "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  if (font === 'classic') fontFamily = "Georgia, Cambria, 'Times New Roman', serif";
  if (font === 'mono') fontFamily = "'JetBrains Mono', ui-monospace, Menlo, Monaco, monospace";
  if (font === 'rounded') fontFamily = "'Quicksand', 'Plus Jakarta Sans', system-ui, sans-serif";

  // Verified Badge SVG
  const verifiedBadgeSvg = `
    <svg class="verified-icon" width="17" height="17" viewBox="0 0 24 24" fill="${accent}" style="display:inline-block; vertical-align:middle; margin-left:4px;">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15-5-5 1.41-1.41L11 14.17l7.59-7.59L20 8l-9 9z"/>
    </svg>
  `;

  // Entrance animation CSS
  let enterAnimCss = '';
  if (enter === 'fade') enterAnimCss = 'animation: bioFadeIn 0.6s ease forwards;';
  if (enter === 'slide') enterAnimCss = 'animation: bioSlideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;';
  if (enter === 'bounce') enterAnimCss = 'animation: bioBounce 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;';

  // Aurora effect CSS
  const hasAurora = bgfx.includes('aurora');
  const hasGrain = bgfx.includes('grain');

  return `<!DOCTYPE html>
<html lang="${isId ? 'id' : 'en'}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>${name} (@${handle}) · 1stdev.link by 1stdev.space</title>
  ${renderBioSeoHead({ profile, links, baseUrl, lang: isId ? 'id' : 'en', themeColor: preset ? preset.bg : style.bg && /^#[0-9a-fA-F]{3,8}$/.test(style.bg) ? style.bg : '#0e1f1b', socials: socialMap })}
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    
    :root {
      --bg: ${preset ? preset.bg : bg === 'light' ? '#f8fafc' : bg === 'gradient' ? 'linear-gradient(135deg, #0e1f1b 0%, #123f36 100%)' : '#07080c'};
      --text: ${preset ? preset.text : bg === 'light' ? '#0f172a' : '#f2f3f7'};
      --text-muted: ${preset ? preset.muted : bg === 'light' ? '#64748b' : '#b4b8c5'};
      --accent: ${accent};
      --radius: ${radius}px;
      --gap: ${gap}px;
    }

    body {
      font-family: ${fontFamily};
      background: var(--bg);
      color: var(--text);
      display: flex;
      flex-direction: column;
      align-items: center;
      min-height: 100vh;
      padding: 0 1.25rem 2rem;
      line-height: 1.5;
      position: relative;
      overflow-x: hidden;
      -webkit-font-smoothing: antialiased;
    }

    ${bgImage ? `
    .bg-custom-image {
      position: fixed;
      inset: 0;
      background-image: url('${bgImage}');
      background-size: cover;
      background-position: center;
      filter: blur(${bgBlur}px);
      z-index: 0;
      pointer-events: none;
    }
    .bg-dim-layer {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, ${bgDim / 100});
      z-index: 0;
      pointer-events: none;
    }
    ` : ''}

    ${hasGrain ? `
    .grain-layer {
      position: fixed;
      inset: 0;
      background-image: radial-gradient(color-mix(in srgb, var(--text) 8%, transparent) 1px, transparent 0);
      background-size: 24px 24px;
      opacity: 0.4;
      pointer-events: none;
      z-index: 1;
    }
    ` : ''}

    ${hasAurora ? `
    .aurora-layer {
      position: fixed;
      top: -20%;
      left: 10%;
      width: 80%;
      height: 60%;
      background: radial-gradient(ellipse at center, ${accent}33, ${accent}11, transparent 70%);
      filter: blur(80px);
      pointer-events: none;
      z-index: 1;
      animation: auroraMove 12s ease-in-out infinite alternate;
    }
    @keyframes auroraMove {
      0% { transform: scale(1) translate(0, 0); }
      100% { transform: scale(1.2) translate(-30px, 40px); }
    }
    ` : ''}

    @keyframes bioFadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes bioSlideUp {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes bioBounce {
      from { opacity: 0; transform: translateY(30px) scale(0.96); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }

    .profile-card {
      position: relative;
      z-index: 2;
      width: 100%;
      max-width: 440px;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      ${enterAnimCss}
    }

    .cover-banner {
      width: 100vw;
      max-width: 480px;
      height: 120px;
      object-fit: cover;
      margin-bottom: -50px;
      border-radius: 0 0 16px 16px;
    }

    .avatar-wrapper {
      position: relative;
      margin-top: ${coverUrl ? '0' : '2.5rem'};
      margin-bottom: 1rem;
    }

    .avatar {
      width: 92px;
      height: 92px;
      object-fit: cover;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
      background: color-mix(in srgb, var(--text) 5%, transparent);
      ${avatarRing ? `outline: 3px solid ${accent}; outline-offset: 3px;` : ''}
    }
    .avatar.shape-circle { border-radius: 50%; }
    .avatar.shape-squircle { border-radius: 28%; }
    .avatar.shape-rounded { border-radius: 12px; }

    .avatar-placeholder {
      width: 92px;
      height: 92px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 2rem;
      font-weight: 700;
      color: ${preset ? preset.bg : '#ffffff'};
      background: linear-gradient(135deg, var(--accent), color-mix(in srgb, var(--accent) 72%, #000));
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
      ${avatarRing ? `outline: 3px solid ${accent}; outline-offset: 3px;` : ''}
    }
    .avatar-placeholder.shape-circle { border-radius: 50%; }
    .avatar-placeholder.shape-squircle { border-radius: 28%; }
    .avatar-placeholder.shape-rounded { border-radius: 12px; }

    .name-row {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
    }

    h1 {
      font-size: 1.25rem;
      font-weight: 700;
      letter-spacing: -0.02em;
      color: var(--text);
    }

    .handle {
      font-size: 0.8rem;
      font-family: 'JetBrains Mono', monospace;
      color: var(--text-muted);
      margin-top: 0.15rem;
      margin-bottom: 0.6rem;
    }

    .bio {
      font-size: 0.88rem;
      color: var(--text-muted);
      margin-bottom: 1.25rem;
      max-width: 90%;
      line-height: 1.5;
    }

    .socials {
      display: flex;
      gap: 0.5rem;
      margin-bottom: 1.5rem;
      flex-wrap: wrap;
      justify-content: center;
    }

    .social-link {
      color: var(--text);
      text-decoration: none;
      font-size: 0.72rem;
      font-family: 'JetBrains Mono', monospace;
      text-transform: uppercase;
      padding: 0.35rem 0.75rem;
      border-radius: 9999px;
      background: color-mix(in srgb, var(--text) 6%, transparent);
      transition: opacity 0.2s;
    }
    .social-link:hover {
      opacity: 0.8;
      color: var(--accent);
    }

    .links-container {
      width: 100%;
      display: flex;
      flex-direction: column;
      gap: var(--gap);
    }

    .link-card {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.95rem 1.25rem;
      border-radius: var(--radius);
      color: var(--text);
      text-decoration: none;
      font-weight: 500;
      font-size: 0.92rem;
      transition: transform 0.15s ease, box-shadow 0.15s ease;
    }

    /* Button styles */
    .btn-soft {
      background: color-mix(in srgb, var(--text) 5%, transparent);
    }
    .btn-solid {
      background: var(--text);
      color: var(--bg);
    }
    .btn-solid .arrow { color: var(--bg); }
    .btn-glass {
      background: color-mix(in srgb, var(--text) 3%, transparent);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border: 1px solid color-mix(in srgb, var(--text) 8%, transparent);
    }
    .btn-outline {
      background: transparent;
      border: 1.5px solid color-mix(in srgb, var(--text) 15%, transparent);
    }
    .btn-shadow {
      background: color-mix(in srgb, var(--text) 6%, transparent);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
    }

    /* Button hover styles */
    .hover-lift:hover {
      transform: translateY(-2px);
    }
    .hover-glow:hover {
      box-shadow: 0 0 20px ${accent}66;
    }
    .hover-press:active {
      transform: scale(0.98);
    }

    .featured-card {
      position: relative;
      background: linear-gradient(135deg, color-mix(in srgb, var(--text) 9%, transparent), color-mix(in srgb, var(--text) 4%, transparent));
      border: 1px solid ${accent}44;
    }
    .featured-badge {
      position: absolute;
      top: -9px;
      right: 14px;
      font-size: 0.62rem;
      font-weight: 700;
      text-transform: uppercase;
      background: var(--accent);
      color: #000;
      padding: 1px 7px;
      border-radius: 4px;
    }

    .whatsapp-card {
      background: rgba(34, 197, 94, 0.12);
      color: #4ade80;
    }
    .wa-content, .video-content {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .block-header {
      text-align: left;
      font-size: 0.72rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--text-muted);
      margin-top: 0.5rem;
      padding-left: 0.25rem;
    }
    .block-text {
      text-align: left;
      font-size: 0.85rem;
      color: var(--text-muted);
      padding: 0.25rem;
      line-height: 1.5;
    }
    .block-divider hr {
      border: 0;
      height: 1px;
      background: color-mix(in srgb, var(--text) 8%, transparent);
      margin: 0.25rem 0;
    }

    .arrow {
      color: var(--text-muted);
      transition: transform 0.15s ease;
    }
    .link-card:hover .arrow {
      transform: translate(2px, -2px);
      color: var(--accent);
    }

    footer {
      position: relative;
      z-index: 2;
      margin-top: auto;
      padding-top: 3rem;
      font-size: 0.72rem;
      letter-spacing: 0.05em;
      color: var(--text-muted);
      opacity: 0.65;
    }
    footer a {
      color: inherit;
      text-decoration: none;
      font-weight: 600;
    }

    @media (prefers-reduced-motion: reduce) {
      * {
        animation: none !important;
        transition: none !important;
      }
    }
  </style>
</head>
<body>
  ${bgImage ? `<div class="bg-custom-image"></div><div class="bg-dim-layer"></div>` : ''}
  ${hasGrain ? `<div class="grain-layer"></div>` : ''}
  ${hasAurora ? `<div class="aurora-layer"></div>` : ''}
  
  <main class="profile-card">
    ${coverUrl ? `<img class="cover-banner" src="${coverUrl}" alt="Cover">` : ''}
    <div class="avatar-wrapper">
      ${
        avatar
          ? `<img class="avatar shape-${avatarShape}" src="${avatar}" alt="${name}">`
          : `<div class="avatar-placeholder shape-${avatarShape}">${name.charAt(0).toUpperCase()}</div>`
      }
    </div>
    <div class="name-row">
      <h1>${name}</h1>
      ${isVerified ? verifiedBadgeSvg : ''}
    </div>
    <div class="handle">@${handle}</div>
    ${bio ? `<p class="bio">${bio}</p>` : ''}
    ${socialIconsHtml ? `<div class="socials">${socialIconsHtml}</div>` : ''}
    <div class="links-container">
      ${blocksHtml}
    </div>
  </main>
  <footer><a href="${escapeHtml(baseUrl)}/" target="_blank" rel="noopener noreferrer">${footerText}</a></footer>
</body>
</html>`;
}
