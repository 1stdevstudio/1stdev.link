import React from 'react';
import { ArrowUpRight, MessageCircle, ExternalLink } from 'lucide-react';
import { BioProfile, LinkItem } from '../types';
import { useI18n } from '../i18n/context';

interface LivePhonePreviewProps {
  profile: BioProfile;
  links: LinkItem[];
}

export const THEME_STYLES: Record<
  string,
  { bg: string; text: string; subtext: string; cardBg: string; cardText: string; featBg: string; featText: string }
> = {
  '1stnear': {
    bg: '#0e1f1b',
    text: '#e8efea',
    subtext: '#a9b8b0',
    cardBg: 'rgba(232, 239, 234, 0.07)',
    cardText: '#e8efea',
    featBg: '#e9be54',
    featText: '#182822',
  },
  obsidian: {
    bg: '#07080c',
    text: '#f2f3f7',
    subtext: '#8b90a0',
    cardBg: 'rgba(255, 255, 255, 0.06)',
    cardText: '#f2f3f7',
    featBg: '#7c8cff',
    featText: '#0b0d16',
  },
  'clean-paper': {
    bg: '#f4f4f2',
    text: '#111111',
    subtext: '#5f6368',
    cardBg: 'rgba(0, 0, 0, 0.05)',
    cardText: '#111111',
    featBg: '#111111',
    featText: '#ffffff',
  },
  'aurora-emerald': {
    bg: '#06140f',
    text: '#e6f7f0',
    subtext: '#6ee7b7',
    cardBg: 'rgba(16, 185, 129, 0.1)',
    cardText: '#e6f7f0',
    featBg: '#10b981',
    featText: '#042217',
  },
  'midnight-neon': {
    bg: '#0b0f19',
    text: '#f1f5f9',
    subtext: '#94a3b8',
    cardBg: 'rgba(168, 85, 247, 0.12)',
    cardText: '#f1f5f9',
    featBg: '#a855f7',
    featText: '#ffffff',
  },
  'cyber-matrix': {
    bg: '#0a121e',
    text: '#f0f6fc',
    subtext: '#93c5fd',
    cardBg: 'rgba(56, 189, 248, 0.08)',
    cardText: '#f0f6fc',
    featBg: '#38bdf8',
    featText: '#031424',
  },
  'rose-gold': {
    bg: '#14090d',
    text: '#fdf2f8',
    subtext: '#f472b6',
    cardBg: 'rgba(244, 114, 182, 0.12)',
    cardText: '#fdf2f8',
    featBg: '#f472b6',
    featText: '#1f0914',
  },
};

/** Urutan blok sama persis dengan backend SSR bio.ts (ORDER BY sort_order) */
export const orderedBioLinks = (links: LinkItem[]) =>
  links.filter((l) => Boolean(l.is_bio_entry)).sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

export const LivePhonePreview: React.FC<LivePhonePreviewProps> = ({ profile, links }) => {
  const { tx } = useI18n();
  const baseUrl = import.meta.env.VITE_API_URL || window.location.origin;
  const publicUrl = `${baseUrl}/@${profile.handle}`;
  const theme = THEME_STYLES[profile.theme || ''] || THEME_STYLES['1stnear'];
  const accentColor = profile.style?.accent || theme.featBg;

  const bioLinks = orderedBioLinks(links);
  const coverUrl = profile.style?.cover_url || (profile as any).cover_url;
  const bgImage = profile.style?.bg_image;
  const bgBlur = profile.style?.bg_blur ?? 0;
  const bgDim = (profile.style?.bg_dim ?? 0) / 100;

  // Social links parser (identik dengan bio.ts)
  let socialMap: Record<string, string> = {};
  if (profile.social_links) {
    if (typeof profile.social_links === 'string') {
      try {
        socialMap = JSON.parse(profile.social_links);
      } catch {
        socialMap = {};
      }
    } else if (typeof profile.social_links === 'object') {
      socialMap = profile.social_links;
    }
  }

  const socialEntries = Object.entries(socialMap).filter(
    ([_, url]) => typeof url === 'string' && /^(https?:\/\/|mailto:)/i.test(url.trim())
  );

  const getShapeRadius = (shape?: string) => {
    if (shape === 'squircle') return '28%';
    if (shape === 'rounded') return '12px';
    return '50%';
  };

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Smartphone frame */}
      <div
        className="phone relative overflow-hidden"
        style={{
          backgroundColor: theme.bg,
          color: bgImage ? '#ffffff' : theme.text,
        }}
      >
        {/* Background Image Layer */}
        {bgImage && (
          <div
            className="absolute inset-0 pointer-events-none z-0 bg-cover bg-center"
            style={{
              backgroundImage: `url(${bgImage})`,
              filter: bgBlur > 0 ? `blur(${bgBlur}px)` : 'none',
              transform: bgBlur > 0 ? 'scale(1.08)' : 'none',
            }}
          />
        )}
        {/* Background Dim / Overlay */}
        {bgImage && bgDim > 0 && (
          <div
            className="absolute inset-0 pointer-events-none z-0"
            style={{ backgroundColor: `rgba(0, 0, 0, ${bgDim})` }}
          />
        )}

        {/* Cover Banner */}
        {coverUrl && (
          <div className="w-full h-24 shrink-0 overflow-hidden relative z-10 -mt-8 mb-2 rounded-b-xl">
            <img src={coverUrl} alt="Cover" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/40" />
          </div>
        )}

        {/* Profile Avatar */}
        <div
          className="w-20 h-20 shrink-0 grid place-items-center font-bold text-2xl overflow-hidden relative z-10 shadow-lg"
          style={{
            borderRadius: getShapeRadius(profile.avatar_shape),
            backgroundColor: accentColor,
            color: '#000000',
            marginTop: coverUrl ? '-2.5rem' : '0.5rem',
          }}
        >
          {profile.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={profile.display_name}
              className="w-full h-full object-cover"
            />
          ) : (
            (profile.display_name?.charAt(0) || 'C').toUpperCase()
          )}
        </div>

        {/* Name & Handle */}
        <div className="flex flex-col items-center text-center mt-2 w-full px-2 relative z-10">
          <div className="flex items-center justify-center gap-1 font-bold text-[17px] tracking-tight max-w-full">
            <span className="truncate">{profile.display_name || 'Edge Creator'}</span>
            {profile.verified_badge ? (
              <svg className="shrink-0 ml-0.5" width="16" height="16" viewBox="0 0 24 24" fill={accentColor}>
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15-5-5 1.41-1.41L11 14.17l7.59-7.59L20 8l-9 9z"/>
              </svg>
            ) : null}
          </div>
          <span className="text-[12px] opacity-70 font-mono mt-0.5">@{profile.handle}</span>
          {profile.bio && (
            <p className="text-[12px] opacity-80 mt-2 leading-relaxed max-w-[92%]">
              {profile.bio}
            </p>
          )}
        </div>

        {/* Social Links Pills (persis bio.ts) */}
        {socialEntries.length > 0 && (
          <div className="flex gap-1.5 mt-3 mb-2 flex-wrap justify-center relative z-10 px-2">
            {socialEntries.map(([platform]) => (
              <span
                key={platform}
                className="text-[10px] font-mono uppercase px-2.5 py-1 rounded-full transition-opacity opacity-80"
                style={{
                  background: 'color-mix(in srgb, currentColor 8%, transparent)',
                  color: bgImage ? '#ffffff' : theme.text,
                }}
              >
                {platform}
              </span>
            ))}
          </div>
        )}

        {/* Blocks list (persis bio.ts) */}
        <div className="flex flex-col gap-2.5 w-full mt-2 relative z-10 px-1">
          {bioLinks.length === 0 ? (
            <div className="p-4 text-center text-[12px] opacity-40">
              {tx('Belum ada link yang ditampilkan', 'No links to show yet')}
            </div>
          ) : (
            bioLinks.map((block) => {
              if (block.block_type === 'header') {
                return (
                  <div
                    key={block.id}
                    className="text-[11px] font-bold uppercase tracking-wider text-left pt-2 pb-0.5 opacity-60 px-1"
                  >
                    {block.title}
                  </div>
                );
              }

              if (block.block_type === 'divider') {
                return <hr key={block.id} className="border-0 h-px my-1 opacity-15" style={{ background: 'currentColor' }} />;
              }

              if (block.block_type === 'text') {
                return (
                  <p key={block.id} className="text-[12px] text-left opacity-80 whitespace-pre-line px-1 leading-relaxed">
                    {block.title}
                  </p>
                );
              }

              if (block.block_type === 'whatsapp') {
                return (
                  <div
                    key={block.id}
                    className="w-full rounded-[var(--r2)] px-4 py-3 flex items-center justify-between text-[13px] font-medium"
                    style={{
                      backgroundColor: 'rgba(34, 197, 94, 0.12)',
                      color: '#4ade80',
                    }}
                  >
                    <div className="flex items-center gap-2 truncate pr-2">
                      <MessageCircle size={16} strokeWidth={2} />
                      <span className="truncate">{block.title || 'WhatsApp'}</span>
                    </div>
                    <ArrowUpRight size={16} className="shrink-0 opacity-70" />
                  </div>
                );
              }

              if (block.block_type === 'featured') {
                return (
                  <div
                    key={block.id}
                    className="relative w-full rounded-[var(--r2)] px-4 py-3 flex items-center justify-between text-[13px] font-medium transition-transform"
                    style={{
                      background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.09), rgba(255, 255, 255, 0.04))',
                      border: `1px solid ${accentColor}55`,
                      color: bgImage ? '#ffffff' : theme.text,
                    }}
                  >
                    <div
                      className="absolute -top-2.5 right-3 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded shadow-sm"
                      style={{
                        backgroundColor: accentColor,
                        color: '#000000',
                      }}
                    >
                      ★ {tx('PILIHAN', 'FEATURED')}
                    </div>
                    <span className="truncate pr-2">{block.title || block.slug}</span>
                    <ArrowUpRight size={16} className="shrink-0 opacity-80" />
                  </div>
                );
              }

              return (
                <div
                  key={block.id}
                  className="w-full rounded-[var(--r2)] px-4 py-3 flex items-center justify-between text-[13px] font-medium transition-colors"
                  style={{
                    backgroundColor: bgImage ? 'rgba(255, 255, 255, 0.07)' : theme.cardBg,
                    color: bgImage ? '#ffffff' : theme.cardText,
                  }}
                >
                  <span className="truncate pr-2">{block.title || block.slug}</span>
                  <ArrowUpRight size={16} className="shrink-0 opacity-50" />
                </div>
              );
            })
          )}
        </div>

        {/* Badge footer */}
        <div className="mt-auto pt-8 pb-3 text-[10px] tracking-wider uppercase opacity-40 text-center">
          {tx('Dibuat dengan', 'Made with')} 1stdev.link by 1stdev.space
        </div>
      </div>

      {/* External link button */}
      <a
        href={publicUrl}
        target="_blank"
        rel="noreferrer"
        className="btn btn-g btn-sm text-[13px]"
      >
        <ExternalLink size={14} strokeWidth={1.75} />
        <span>{tx('Buka halaman', 'Open page')}</span>
      </a>
    </div>
  );
};
