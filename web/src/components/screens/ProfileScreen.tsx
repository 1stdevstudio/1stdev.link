import React, { useEffect, useState } from 'react';
import { useI18n } from '../../i18n/context';
import {
  AlertTriangle,
  Share2,
  Copy,
  Check,
  Star,
  Link2,
  MessageCircle,
  Type,
  AlignLeft,
  Minus,
  PlayCircle,
  Plus,
  ArrowUp,
  ArrowDown,
  Trash2,
  Pencil,
  ExternalLink,
  LayoutList,
  Palette,
  Smartphone,
} from 'lucide-react';
import { BioProfile, LinkItem } from '../../types';
import { THEME_STYLES, orderedBioLinks } from '../LivePhonePreview';

interface ProfileScreenProps {
  isGuest: boolean;
  profile: BioProfile;
  links: LinkItem[];
  /** Pratinjau ponsel untuk tab Pratinjau di layar kecil (layar lebar memakai kolom samping). */
  preview?: React.ReactNode;
  onOpenEditProfile: () => void;
  onOpenShare: () => void;
  onOpenAddBlock: () => void;
  onOpenSaveAccount: () => void;
  onUpdateTheme: (theme: string) => void;
  onUpdateAvatarShape: (shape: 'circle' | 'squircle' | 'rounded') => void;
  onReorderLinks: (links: LinkItem[]) => void;
  onDeleteLink: (id: string) => void;
  onEditLink: (link: LinkItem) => void;
  onToast: (msg: string) => void;
}

type BuilderTab = 'content' | 'design' | 'preview';

const THEMES: { id: string; name: [string, string] }[] = [
  { id: '1stnear', name: ['1stNear', '1stNear'] },
  { id: 'obsidian', name: ['Obsidian', 'Obsidian'] },
  { id: 'clean-paper', name: ['Kertas', 'Paper'] },
  { id: 'aurora-emerald', name: ['Hutan', 'Forest'] },
  { id: 'midnight-neon', name: ['Senja', 'Dusk'] },
  { id: 'cyber-matrix', name: ['Samudra', 'Ocean'] },
  { id: 'rose-gold', name: ['Pasir', 'Sand'] },
];

const SHAPES: { id: 'circle' | 'squircle' | 'rounded'; label: [string, string]; radius: string }[] = [
  { id: 'circle', label: ['Bulat', 'Circle'], radius: '9999px' },
  { id: 'squircle', label: ['Membulat', 'Soft square'], radius: '14px' },
  { id: 'rounded', label: ['Kotak', 'Square'], radius: 'var(--r2)' },
];

/** Ikon + warna aksen per jenis blok; warna dipakai sebagai latar tipis ikon. */
const BLOCK_META: Record<string, { icon: React.ElementType; tint: string; label: [string, string] }> = {
  link: { icon: Link2, tint: 'var(--tx2)', label: ['Link', 'Link'] },
  featured: { icon: Star, tint: 'var(--ac)', label: ['Sorotan', 'Featured'] },
  whatsapp: { icon: MessageCircle, tint: 'var(--ok)', label: ['WhatsApp', 'WhatsApp'] },
  video: { icon: PlayCircle, tint: '#f87171', label: ['Video', 'Video'] },
  header: { icon: Type, tint: '#93c5fd', label: ['Judul bagian', 'Heading'] },
  text: { icon: AlignLeft, tint: '#c4b5fd', label: ['Teks', 'Text'] },
  divider: { icon: Minus, tint: 'var(--tx3)', label: ['Pemisah', 'Divider'] },
};

const hostOf = (url: string) => {
  try {
    return new URL(url).host.replace(/^www\./, '');
  } catch {
    return url;
  }
};

const shapeRadius = (shape?: string) => SHAPES.find((s) => s.id === shape)?.radius ?? '9999px';

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  isGuest,
  profile,
  links,
  preview,
  onOpenEditProfile,
  onOpenShare,
  onOpenAddBlock,
  onOpenSaveAccount,
  onUpdateTheme,
  onUpdateAvatarShape,
  onReorderLinks,
  onDeleteLink,
  onEditLink,
  onToast,
}) => {
  const { tx, lang } = useI18n();
  const L = (pair: [string, string]) => (lang === 'en' ? pair[1] : pair[0]);
  const [tab, setTab] = useState<BuilderTab>('content');
  const [copied, setCopied] = useState(false);

  const baseUrl = import.meta.env.VITE_API_URL || window.location.origin;
  const shortHost = baseUrl.replace(/^https?:\/\//, '');
  const publicUrl = `${baseUrl}/@${profile.handle}`;
  const bioLinks = orderedBioLinks(links);
  const currentTheme = THEMES.some((x) => x.id === profile.theme) ? profile.theme : '1stnear';

  // Tab Pratinjau hanya ada di layar kecil; saat melebar, kembali ke Isi.
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const sync = () => mq.matches && setTab((t) => (t === 'preview' ? 'content' : t));
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    onToast(tx('Link disalin', 'Link copied'));
    setTimeout(() => setCopied(false), 2000);
  };

  const moveLink = (index: number, direction: 'up' | 'down') => {
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= bioLinks.length) return;
    const next = [...bioLinks];
    [next[index], next[target]] = [next[target], next[index]];
    onReorderLinks(
      links.map((link) => {
        const i = next.findIndex((b) => b.id === link.id);
        return i !== -1 ? { ...link, sort_order: i } : link;
      })
    );
  };

  const tabs: { id: BuilderTab; label: string; icon: React.ElementType; count?: number; mobileOnly?: boolean }[] = [
    { id: 'content', label: tx('Isi', 'Content'), icon: LayoutList, count: bioLinks.length },
    { id: 'design', label: tx('Tampilan', 'Design'), icon: Palette },
    { id: 'preview', label: tx('Pratinjau', 'Preview'), icon: Smartphone, mobileOnly: true },
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* Tab builder */}
      <div className="studio-tabs" role="tablist" aria-label={tx('Bagian editor', 'Editor sections')}>
        {tabs.map(({ id, label, icon: Icon, count, mobileOnly }) => (
          <button
            key={id}
            type="button"
            role="tab"
            id={`tab-${id}`}
            aria-selected={tab === id}
            aria-controls={`panel-${id}`}
            className={mobileOnly ? 'tab-mobile' : ''}
            onClick={() => setTab(id)}
          >
            <Icon size={16} strokeWidth={1.9} />
            <span>{label}</span>
            {count !== undefined && <b>{count}</b>}
          </button>
        ))}
      </div>

      {/* Studio hero: identitas + aksi utama */}
      <section className="studio-hero">
        <div className="flex items-center gap-4 min-w-0">
          <button
            type="button"
            onClick={onOpenEditProfile}
            className="studio-avatar"
            style={{ borderRadius: shapeRadius(profile.avatar_shape) }}
            aria-label={tx('Ubah foto dan profil', 'Edit photo and profile')}
          >
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <span>{(profile.display_name?.charAt(0) || 'E').toUpperCase()}</span>
            )}
            <i aria-hidden>
              <Pencil size={12} strokeWidth={2} />
            </i>
          </button>
          <div className="min-w-0 grow">
            <h2 className="text-[20px] font-semibold text-[var(--tx)] leading-tight flex items-center gap-1.5 min-w-0">
              <span className="truncate">{profile.display_name || tx('Kreator', 'Creator')}</span>
              {profile.verified_badge ? (
                <span className="w-4 h-4 rounded-full bg-[var(--ac)] text-[var(--ink)] inline-grid place-items-center shrink-0">
                  <Check size={11} strokeWidth={2.5} />
                </span>
              ) : null}
            </h2>
            <p className="mono text-[13px] text-[var(--ac)] truncate mt-0.5">
              {shortHost}/@{profile.handle}
            </p>
            {profile.bio ? (
              <p className="text-[13px] text-[var(--tx2)] mt-1 line-clamp-2 leading-snug">{profile.bio}</p>
            ) : (
              <button type="button" onClick={onOpenEditProfile} className="text-[13px] text-[var(--tx3)] mt-1 hover:text-[var(--tx2)]">
                {tx('+ Tulis bio singkat', '+ Write a short bio')}
              </button>
            )}
          </div>
        </div>

        <div className="studio-actions">
          <button type="button" className="btn btn-p btn-sm" onClick={onOpenShare}>
            <Share2 size={16} strokeWidth={1.75} /> {tx('Bagikan', 'Share')}
          </button>
          <button type="button" className="btn btn-g btn-sm" onClick={handleCopyLink}>
            {copied ? <Check size={16} /> : <Copy size={16} strokeWidth={1.75} />} {copied ? tx('Disalin', 'Copied') : tx('Salin', 'Copy')}
          </button>
          <a className="btn btn-g btn-sm" href={publicUrl} target="_blank" rel="noopener noreferrer">
            <ExternalLink size={16} strokeWidth={1.75} /> {tx('Buka', 'Open')}
          </a>
          <button type="button" className="btn btn-g btn-sm" onClick={onOpenEditProfile}>
            <Pencil size={16} strokeWidth={1.75} /> {tx('Ubah', 'Edit')}
          </button>
        </div>

        {isGuest && (
          <button type="button" onClick={onOpenSaveAccount} className="studio-warn">
            <AlertTriangle size={16} strokeWidth={1.75} className="shrink-0" />
            <span className="grow text-left">
              {tx('Tersimpan di browser ini saja. Simpan dengan email agar tidak hilang.', 'Saved in this browser only. Save with email so it is not lost.')}
            </span>
            <span className="font-semibold shrink-0">{tx('Simpan', 'Save')}</span>
          </button>
        )}
      </section>

      {tab === 'content' && (
        <section id="panel-content" role="tabpanel" aria-labelledby="tab-content" className="flex flex-col gap-2">
          {bioLinks.length === 0 ? (
            <div className="studio-empty">
              <LayoutList size={28} strokeWidth={1.5} className="text-[var(--ac)]" />
              <h3 className="text-[15px] font-semibold text-[var(--tx)]">{tx('Halaman kamu masih kosong', 'Your page is empty')}</h3>
              <p className="small muted max-w-[320px]">
                {tx('Tambahkan link, WhatsApp, video, atau teks. Ada 30 template siap pakai.', 'Add links, WhatsApp, video, or text. There are 30 ready-made templates.')}
              </p>
              <button type="button" className="btn btn-p btn-sm mt-1" onClick={onOpenAddBlock}>
                <Plus size={16} strokeWidth={2} /> {tx('Tambah blok pertama', 'Add your first block')}
              </button>
            </div>
          ) : (
            <ol className="flex flex-col gap-2">
              {bioLinks.map((link, idx) => {
                const meta = BLOCK_META[link.block_type || 'link'] || BLOCK_META.link;
                const Icon = meta.icon;
                const isUrl = !['header', 'text', 'divider'].includes(link.block_type || 'link');
                const sub =
                  link.block_type === 'divider'
                    ? tx('Jeda antar blok', 'Space between blocks')
                    : link.block_type === 'whatsapp'
                    ? tx('Chat langsung', 'Direct chat')
                    : isUrl
                    ? hostOf(link.destination_url)
                    : L(meta.label);
                return (
                  <li key={link.id} className="block-row">
                    <span className="block-num" aria-hidden>
                      {idx + 1}
                    </span>
                    <span className="block-ic" style={{ color: meta.tint }}>
                      <Icon size={18} strokeWidth={1.75} />
                    </span>
                    <button
                      type="button"
                      onClick={() => onEditLink(link)}
                      className="grow min-w-0 min-h-[44px] text-left"
                      aria-label={`${tx('Ubah', 'Edit')} ${link.title || tx('blok', 'block')}`}
                    >
                      <span className="block text-[14px] font-semibold text-[var(--tx)] truncate">
                        {link.block_type === 'divider' ? L(meta.label) : link.title || link.slug || tx('Tanpa judul', 'Untitled')}
                      </span>
                      <span className="flex items-center gap-1.5 min-w-0 text-[12px] text-[var(--tx3)]">
                        <span className="block-type">{L(meta.label)}</span>
                        <span className="truncate">{sub}</span>
                        {isUrl && link.clicks > 0 && (
                          <span className="shrink-0">· {link.clicks.toLocaleString()} {tx('klik', link.clicks === 1 ? 'click' : 'clicks')}</span>
                        )}
                      </span>
                    </button>
                    <div className="block-tools">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => moveLink(idx, 'up')}
                        aria-label={tx('Geser ke atas', 'Move up')}
                      >
                        <ArrowUp size={16} strokeWidth={1.75} />
                      </button>
                      <button
                        type="button"
                        disabled={idx === bioLinks.length - 1}
                        onClick={() => moveLink(idx, 'down')}
                        aria-label={tx('Geser ke bawah', 'Move down')}
                      >
                        <ArrowDown size={16} strokeWidth={1.75} />
                      </button>
                      <button type="button" className="danger" onClick={() => onDeleteLink(link.id)} aria-label={tx('Hapus dari profil', 'Remove from profile')}>
                        <Trash2 size={16} strokeWidth={1.75} />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}

          {bioLinks.length > 0 && (
            <button type="button" className="block-add" onClick={onOpenAddBlock}>
              <Plus size={18} strokeWidth={2} />
              <span>{tx('Tambah blok', 'Add block')}</span>
            </button>
          )}
        </section>
      )}

      {tab === 'design' && (
        <section id="panel-design" role="tabpanel" aria-labelledby="tab-design" className="flex flex-col gap-5">
          <button type="button" className="block-add" onClick={onOpenEditProfile}>
            <Pencil size={16} strokeWidth={1.9} />
            <span>{tx('Ubah nama, foto, bio, dan handle', 'Edit name, photo, bio, and handle')}</span>
          </button>
          <div className="flex flex-col gap-2.5">
            <h3 className="sec-label">{tx('Bentuk foto', 'Photo shape')}</h3>
            <div className="grid grid-cols-3 gap-2">
              {SHAPES.map((sh) => {
                const active = (profile.avatar_shape || 'circle') === sh.id;
                return (
                  <button
                    key={sh.id}
                    type="button"
                    className="shape-tile"
                    aria-pressed={active}
                    onClick={() => onUpdateAvatarShape(sh.id)}
                  >
                    <span className="shape-swatch" style={{ borderRadius: sh.radius }}>
                      {profile.avatar_url ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" /> : null}
                    </span>
                    <span className="text-[13px] font-medium">{L(sh.label)}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col gap-2.5">
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="sec-label">{tx('Tema', 'Theme')}</h3>
              <span className="small muted">{tx('Tersimpan otomatis', 'Saved automatically')}</span>
            </div>
            <div className="theme-grid">
              {THEMES.map((th) => {
                const s = THEME_STYLES[th.id] || THEME_STYLES['1stnear'];
                const active = currentTheme === th.id;
                return (
                  <button
                    key={th.id}
                    type="button"
                    className="theme-tile"
                    aria-pressed={active}
                    onClick={() => onUpdateTheme(th.id)}
                  >
                    <span className="theme-phone" style={{ background: s.bg }}>
                      <span className="theme-dot" style={{ background: s.featBg }} />
                      <span className="theme-bar w-[55%]" style={{ background: s.text, opacity: 0.8 }} />
                      <span className="theme-bar theme-btn" style={{ background: s.featBg }} />
                      <span className="theme-bar theme-btn" style={{ background: s.cardBg }} />
                      <span className="theme-bar theme-btn" style={{ background: s.cardBg }} />
                    </span>
                    <span className="flex items-center justify-between gap-1 px-0.5">
                      <span className="text-[13px] font-medium text-[var(--tx)] truncate">{L(th.name)}</span>
                      {active && <Check size={14} strokeWidth={2.5} className="text-[var(--ac)] shrink-0" />}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {tab === 'preview' && (
        <section id="panel-preview" role="tabpanel" aria-labelledby="tab-preview" className="lg:hidden pt-1">
          {preview}
        </section>
      )}
    </div>
  );
};
