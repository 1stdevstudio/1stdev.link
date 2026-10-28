import React from 'react';
import { ExternalLink, Star, MessageCircle, Link2, Check } from 'lucide-react';
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

/** Urutan blok sama dengan halaman publik (ORDER BY sort_order); sort stabil menjaga urutan awal bila nilainya sama. */
export const orderedBioLinks = (links: LinkItem[]) =>
  links.filter((l) => Boolean(l.is_bio_entry)).sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

export const LivePhonePreview: React.FC<LivePhonePreviewProps> = ({ profile, links }) => {
  const { tx } = useI18n();
  const baseUrl = import.meta.env.VITE_API_URL || window.location.origin;
  const publicUrl = `${baseUrl}/@${profile.handle}`;
  const theme = THEME_STYLES[profile.theme || ''] || THEME_STYLES['1stnear'];

  const bioLinks = orderedBioLinks(links);
  const coverUrl = profile.style?.cover_url || (profile as any).cover_url;
  const bgImage = profile.style?.bg_image;
  const bgBlur = profile.style?.bg_blur ?? 0;
  const bgDim = (profile.style?.bg_dim ?? 0) / 100;

  const getShapeRadius = (shape?: string) => {
    // Sama dengan default server (bio.ts): bentuk kosong = bulat.
    if (shape === 'squircle') return '18px';
    if (shape === 'rounded') return '8px';
    return '9999px';
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
          <div className="w-full h-24 shrink-0 overflow-hidden relative z-10 -mt-6 mb-2">
            <img src={coverUrl} alt="Cover" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/40" />
          </div>
        )}

        {/* Profile Avatar */}
        <div
          className="w-16 h-16 shrink-0 grid place-items-center font-bold text-xl overflow-hidden relative z-10"
          style={{
            borderRadius: getShapeRadius(profile.avatar_shape),
            backgroundColor: theme.featBg,
            color: theme.featText,
            marginTop: coverUrl ? '-2rem' : '0',
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
        <div className="flex flex-col items-center text-center mt-1 w-full px-2 relative z-10">
          <div className="flex items-center gap-1 font-semibold text-[15px] truncate max-w-full">
            <span className="truncate">{profile.display_name || 'Edge Creator'}</span>
            {profile.verified_badge ? (
              <span className="w-3.5 h-3.5 rounded-full bg-[var(--ac)] text-[var(--ink)] inline-grid place-items-center shrink-0">
                <Check size={9} strokeWidth={2.5} />
              </span>
            ) : null}
          </div>
          <span className="text-[12px] opacity-70 font-mono">@{profile.handle}</span>
          {profile.bio && (
            <p className="text-[12px] opacity-80 mt-1.5 leading-snug line-clamp-3">
              {profile.bio}
            </p>
          )}
        </div>

        {/* Blocks list */}
        <div className="flex flex-col gap-2 w-full mt-3 relative z-10">
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
                    className="text-[12px] font-semibold uppercase tracking-wider text-center py-1 opacity-70"
                  >
                    {block.title}
                  </div>
                );
              }

              if (block.block_type === 'divider') {
                return <hr key={block.id} className="border-0 h-px my-1 opacity-20" style={{ background: 'currentColor' }} />;
              }

              if (block.block_type === 'text') {
                return (
                  <p key={block.id} className="text-[12px] text-center opacity-80 whitespace-pre-line px-1">
                    {block.title}
                  </p>
                );
              }

              if (block.block_type === 'whatsapp') {
                return (
                  <div
                    key={block.id}
                    className="pv-link wa flex items-center justify-center gap-1.5 font-medium text-[13px]"
                  >
                    <MessageCircle size={15} strokeWidth={2} />
                    <span className="truncate">{block.title || 'Chat WhatsApp'}</span>
                  </div>
                );
              }

              if (block.block_type === 'featured') {
                return (
                  <div
                    key={block.id}
                    className="pv-link feat flex items-center justify-center gap-1.5 font-semibold text-[13px]"
                    style={{
                      backgroundColor: theme.featBg,
                      color: theme.featText,
                    }}
                  >
                    <Star size={14} strokeWidth={2} />
                    <span className="truncate">{block.title || block.slug}</span>
                  </div>
                );
              }

              return (
                <div
                  key={block.id}
                  className="pv-link flex items-center justify-center gap-1.5 text-[13px]"
                  style={{
                    backgroundColor: bgImage ? 'rgba(255, 255, 255, 0.12)' : theme.cardBg,
                    color: bgImage ? '#ffffff' : theme.cardText,
                  }}
                >
                  <Link2 size={14} strokeWidth={1.75} className="opacity-60" />
                  <span className="truncate">{block.title || block.slug}</span>
                </div>
              );
            })
          )}
        </div>

        {/* Badge footer */}
        <div className="mt-auto pt-6 pb-2 text-[10px] tracking-wider uppercase opacity-40">
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
