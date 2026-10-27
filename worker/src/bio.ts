import type { BioProfile, Link } from './types.js';

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function renderBioPage(profile: BioProfile, links: Link[], baseUrl: string = ''): string {
  const name = escapeHtml(profile.display_name);
  const handle = escapeHtml(profile.handle);
  const bio = profile.bio ? escapeHtml(profile.bio) : '';
  const avatar = profile.avatar_url ? escapeHtml(profile.avatar_url) : '';
  const theme = profile.theme || 'obsidian';
  const avatarShape = profile.avatar_shape || 'circle';
  const isVerified = Boolean(profile.verified_badge);

  let socialMap: Record<string, string> = {};
  if (profile.social_links) {
    try {
      socialMap = JSON.parse(profile.social_links);
    } catch {
      socialMap = {};
    }
  }

  const socialIconsHtml = Object.entries(socialMap)
    .filter(([_, url]) => typeof url === 'string' && url.trim().length > 0)
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
        return `<div class="block-header">
          <span>${linkTitle}</span>
        </div>`;
      }

      if (blockType === 'featured') {
        return `<a href="${targetUrl}" class="link-card featured-card" target="_blank" rel="noopener noreferrer">
          <div class="featured-badge">★ Pilihan</div>
          <span class="link-title">${linkTitle}</span>
          <svg class="arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17l9.2-9.2M17 17V8H8"/></svg>
        </a>`;
      }

      if (blockType === 'whatsapp') {
        return `<a href="${targetUrl}" class="link-card whatsapp-card" target="_blank" rel="noopener noreferrer">
          <div class="wa-content">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2zm.01 1.67c4.54 0 8.24 3.7 8.24 8.24 0 2.2-.86 4.27-2.42 5.82a8.19 8.19 0 0 1-5.82 2.42c-1.48 0-2.94-.4-4.21-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.216 8.216 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.24-8.24zm4.52 11.66c-.25-.13-1.47-.72-1.7-.81-.23-.08-.39-.13-.56.13-.17.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.13-1.06-.39-2.02-1.25-.75-.67-1.26-1.5-1.41-1.75-.14-.25-.02-.39.11-.51.11-.11.25-.29.37-.44.13-.15.17-.25.25-.42.08-.17.04-.31-.02-.44-.06-.13-.56-1.35-.77-1.85-.2-.49-.41-.42-.56-.43h-.48c-.17 0-.44.06-.67.31-.23.25-.88.86-.88 2.1 0 1.24.9 2.44 1.03 2.61.13.17 1.78 2.72 4.31 3.81.6.26 1.07.42 1.44.54.61.19 1.16.17 1.6.1.49-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.15-1.18-.07-.11-.23-.17-.48-.29z"/></svg>
            <span class="link-title">${linkTitle}</span>
          </div>
          <svg class="arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17l9.2-9.2M17 17V8H8"/></svg>
        </a>`;
      }

      return `<a href="${targetUrl}" class="link-card" target="_blank" rel="noopener noreferrer">
        <span class="link-title">${linkTitle}</span>
        <svg class="arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17l9.2-9.2M17 17V8H8"/></svg>
      </a>`;
    })
    .join('');

  // Verified Badge SVG
  const verifiedBadgeSvg = `
    <svg class="verified-icon" width="17" height="17" viewBox="0 0 24 24" fill="#38bdf8" style="display:inline-block; vertical-align:middle; margin-left:4px;">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15-5-5 1.41-1.41L11 14.17l7.59-7.59L20 8l-9 9z"/>
    </svg>
  `;

  return `<!DOCTYPE html>
<html lang="id" data-theme="${theme}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>${name} (@${handle}) · EdgeLink</title>
  <meta name="description" content="${bio || name + ' di EdgeLink'}">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    
    /* 6 Luxury Themes (Zero Border, High Craft) */
    :root, [data-theme="obsidian"], [data-theme="minimal-dark"] {
      --bg: #07080c;
      --card-bg: rgba(255, 255, 255, 0.04);
      --card-hover: rgba(255, 255, 255, 0.08);
      --text: #f8fafc;
      --text-muted: #94a3b8;
      --accent: #38bdf8;
      --glow-1: rgba(56, 189, 248, 0.15);
      --glow-2: rgba(99, 102, 241, 0.10);
    }

    [data-theme="midnight-neon"] {
      --bg: #080c1a;
      --card-bg: rgba(255, 255, 255, 0.045);
      --card-hover: rgba(56, 189, 248, 0.12);
      --text: #f1f5f9;
      --text-muted: #818cf8;
      --accent: #818cf8;
      --glow-1: rgba(129, 140, 248, 0.22);
      --glow-2: rgba(192, 132, 252, 0.15);
    }

    [data-theme="aurora-emerald"] {
      --bg: #05130d;
      --card-bg: rgba(255, 255, 255, 0.04);
      --card-hover: rgba(52, 211, 153, 0.12);
      --text: #f0fdf4;
      --text-muted: #86efac;
      --accent: #34d399;
      --glow-1: rgba(52, 211, 153, 0.20);
      --glow-2: rgba(45, 212, 191, 0.12);
    }

    [data-theme="rose-gold"] {
      --bg: #14090f;
      --card-bg: rgba(255, 255, 255, 0.04);
      --card-hover: rgba(251, 113, 133, 0.12);
      --text: #fff1f2;
      --text-muted: #fda4af;
      --accent: #fb7185;
      --glow-1: rgba(251, 113, 133, 0.20);
      --glow-2: rgba(244, 114, 182, 0.12);
    }

    [data-theme="cyber-matrix"] {
      --bg: #030303;
      --card-bg: rgba(255, 255, 255, 0.035);
      --card-hover: rgba(163, 230, 53, 0.10);
      --text: #f4f4f5;
      --text-muted: #a1a1aa;
      --accent: #a3e635;
      --glow-1: rgba(163, 230, 53, 0.18);
      --glow-2: rgba(34, 197, 94, 0.10);
    }

    [data-theme="clean-paper"] {
      --bg: #f8fafc;
      --card-bg: rgba(0, 0, 0, 0.04);
      --card-hover: rgba(0, 0, 0, 0.08);
      --text: #0f172a;
      --text-muted: #64748b;
      --accent: #0284c7;
      --glow-1: rgba(2, 132, 199, 0.10);
      --glow-2: rgba(99, 102, 241, 0.06);
    }

    body {
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: var(--bg);
      color: var(--text);
      display: flex;
      flex-direction: column;
      align-items: center;
      min-height: 100vh;
      padding: 3rem 1.25rem 2rem;
      line-height: 1.5;
      position: relative;
      overflow-x: hidden;
      -webkit-font-smoothing: antialiased;
    }

    .ambient-glow {
      position: absolute;
      top: -120px;
      left: 50%;
      transform: translateX(-50%);
      width: 600px;
      height: 380px;
      background: radial-gradient(ellipse at center, var(--glow-1), var(--glow-2), transparent 70%);
      filter: blur(80px);
      pointer-events: none;
      z-index: 0;
    }

    .profile-card {
      position: relative;
      z-index: 1;
      width: 100%;
      max-width: 440px;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
    }

    .avatar {
      width: 96px;
      height: 96px;
      object-fit: cover;
      margin-bottom: 1.25rem;
      box-shadow: 0 12px 30px rgba(0, 0, 0, 0.35);
      background: var(--card-bg);
    }
    .avatar.shape-circle { border-radius: 50%; }
    .avatar.shape-squircle { border-radius: 28%; }
    .avatar.shape-rounded { border-radius: 18px; }

    .avatar-placeholder {
      width: 96px;
      height: 96px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 2.2rem;
      font-weight: 700;
      color: #ffffff;
      background: linear-gradient(135deg, var(--accent), #6366f1);
      margin-bottom: 1.25rem;
      box-shadow: 0 12px 30px var(--glow-1);
    }
    .avatar-placeholder.shape-circle { border-radius: 50%; }
    .avatar-placeholder.shape-squircle { border-radius: 28%; }
    .avatar-placeholder.shape-rounded { border-radius: 18px; }

    .name-row {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
    }

    h1 {
      font-size: 1.35rem;
      font-weight: 700;
      letter-spacing: -0.02em;
      color: var(--text);
    }

    .handle {
      font-size: 0.82rem;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      color: var(--text-muted);
      margin-top: 0.2rem;
      margin-bottom: 0.75rem;
      opacity: 0.85;
    }

    .bio {
      font-size: 0.9rem;
      color: var(--text-muted);
      margin-bottom: 1.5rem;
      max-width: 92%;
      line-height: 1.6;
    }

    .socials {
      display: flex;
      gap: 0.5rem;
      margin-bottom: 2rem;
      flex-wrap: wrap;
      justify-content: center;
    }

    .social-link {
      color: var(--text);
      text-decoration: none;
      font-size: 0.75rem;
      font-family: ui-monospace, monospace;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      padding: 0.4rem 0.85rem;
      border-radius: 9999px;
      background: var(--card-bg);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      transition: background 0.2s, color 0.2s, transform 0.2s;
    }
    .social-link:hover {
      background: var(--card-hover);
      color: var(--accent);
      transform: translateY(-1px);
    }

    .links-container {
      width: 100%;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .link-card {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1.1rem 1.4rem;
      background: var(--card-bg);
      backdrop-filter: blur(24px);
      -webkit-backdrop-filter: blur(24px);
      border-radius: 20px;
      color: var(--text);
      text-decoration: none;
      font-weight: 500;
      font-size: 0.92rem;
      box-shadow: 0 4px 24px rgba(0, 0, 0, 0.12);
      transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), background 0.2s;
    }
    .link-card:hover {
      background: var(--card-hover);
      transform: translateY(-2px);
    }

    .featured-card {
      position: relative;
      background: linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03));
      box-shadow: 0 8px 30px var(--glow-1);
    }
    .featured-badge {
      position: absolute;
      top: -8px;
      right: 18px;
      font-size: 0.65rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      background: var(--accent);
      color: #000;
      padding: 2px 8px;
      border-radius: 9999px;
    }

    .whatsapp-card {
      background: rgba(34, 197, 94, 0.12);
      color: #4ade80;
    }
    .whatsapp-card:hover {
      background: rgba(34, 197, 94, 0.18);
    }
    .wa-content {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .block-header {
      text-align: left;
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--text-muted);
      margin-top: 0.75rem;
      margin-bottom: 0.15rem;
      padding-left: 0.5rem;
      opacity: 0.7;
    }

    .arrow {
      color: var(--text-muted);
      transition: transform 0.2s ease, color 0.2s;
    }
    .link-card:hover .arrow {
      transform: translate(2px, -2px);
      color: var(--accent);
    }

    footer {
      position: relative;
      z-index: 1;
      margin-top: auto;
      padding-top: 3.5rem;
      font-size: 0.75rem;
      letter-spacing: 0.05em;
      color: var(--text-muted);
      opacity: 0.6;
    }
    footer a {
      color: inherit;
      text-decoration: none;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="ambient-glow"></div>
  <main class="profile-card">
    ${
      avatar
        ? `<img class="avatar shape-${avatarShape}" src="${avatar}" alt="${name}">`
        : `<div class="avatar-placeholder shape-${avatarShape}">${name.charAt(0).toUpperCase()}</div>`
    }
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
  <footer>Dibuat gratis dengan <a href="https://edgelink-afl.pages.dev">EdgeLink</a></footer>
</body>
</html>`;
}
