import React, { useEffect, useRef, useState } from 'react';
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
  Image as ImageIcon,
  Upload,
  Sparkles,
  Sliders,
} from 'lucide-react';
import { BioProfile, LinkItem, BioProfileStyle } from '../../types';
import { THEME_STYLES, orderedBioLinks } from '../LivePhonePreview';
import { api } from '../../api';
import { prepareCover, prepareBackground } from '../../avatarImage';

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
  onUpdateStyle?: (style: Partial<BioProfileStyle>) => void;
  onReorderLinks: (links: LinkItem[]) => void;
  onDeleteLink: (id: string) => void;
  onEditLink: (link: LinkItem) => void;
  onToast: (msg: string) => void;
}

type BuilderTab = 'content' | 'design' | 'preview';

const THEMES: { id: string; name: [string, string] }[] = [
  { id: '1stnear', name: ['1stdev', '1stdev'] },
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
  onUpdateStyle,
  onReorderLinks,
  onDeleteLink,
  onEditLink,
  onToast,
}) => {
  const { tx, lang } = useI18n();
  const L = (pair: [string, string]) => (lang === 'en' ? pair[1] : pair[0]);
  const [tab, setTab] = useState<BuilderTab>('content');
  const [copied, setCopied] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingBg, setUploadingBg] = useState(false);
  const coverFileRef = useRef<HTMLInputElement>(null);
  const bgFileRef = useRef<HTMLInputElement>(null);

  const baseUrl = import.meta.env.VITE_API_URL || window.location.origin;
  const shortHost = baseUrl.replace(/^https?:\/\//, '');
  const publicUrl = `${baseUrl}/@${profile.handle}`;
  const bioLinks = orderedBioLinks(links);
  const currentTheme = THEMES.some((x) => x.id === profile.theme) ? profile.theme : '1stnear';

  const coverUrl = profile.style?.cover_url || (profile as any).cover_url || '';
  const bgImage = profile.style?.bg_image || '';
  const bgBlur = profile.style?.bg_blur ?? 0;
  const bgDim = profile.style?.bg_dim ?? 0;
  const activeBgFx = Array.isArray(profile.style?.bgfx) ? profile.style!.bgfx : [];

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (isGuest) {
      onOpenSaveAccount();
      return;
    }
    setUploadingCover(true);
    try {
      const blob = await prepareCover(file);
      const url = await api.uploadMedia(blob, 'cover');
      onUpdateStyle?.({ cover_url: url });
      onToast(tx('Banner cover berhasil dipasang', 'Cover banner updated'));
    } catch (err: any) {
      onToast(err?.message || tx('Gagal mengunggah cover', 'Failed to upload cover'));
    } finally {
      setUploadingCover(false);
    }
  };

  const handleRemoveCover = () => {
    onUpdateStyle?.({ cover_url: '' });
    onToast(tx('Banner cover dihapus', 'Cover banner removed'));
  };

  const handleBgUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (isGuest) {
      onOpenSaveAccount();
      return;
    }
    setUploadingBg(true);
    try {
      const blob = await prepareBackground(file);
      const url = await api.uploadMedia(blob, 'background');
      onUpdateStyle?.({ bg_image: url, bg: 'image', bg_dim: bgDim || 40 });
      onToast(tx('Gambar latar berhasil dipasang', 'Background image updated'));
    } catch (err: any) {
      onToast(err?.message || tx('Gagal mengunggah latar', 'Failed to upload background'));
    } finally {
      setUploadingBg(false);
    }
  };

  const handleRemoveBg = () => {
    onUpdateStyle?.({ bg_image: '', bg: 'dark' });
    onToast(tx('Gambar latar dihapus', 'Background image removed'));
  };

  const handleToggleBgFx = (fxName: string) => {
    const next = activeBgFx.includes(fxName)
      ? activeBgFx.filter((x) => x !== fxName)
      : [...activeBgFx, fxName];
    onUpdateStyle?.({ bgfx: next });
  };

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
        <section id="panel-design" role="tabpanel" aria-labelledby="tab-design" className="flex flex-col gap-6">
          {/* Input file tersembunyi untuk cover & background */}
          <input
            ref={coverFileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleCoverUpload}
          />
          <input
            ref={bgFileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleBgUpload}
          />

          <button type="button" className="block-add" onClick={onOpenEditProfile}>
            <Pencil size={16} strokeWidth={1.9} />
            <span>{tx('Ubah nama, foto, bio, dan handle', 'Edit name, photo, bio, and handle')}</span>
          </button>

          {/* 1. Banner Cover Header */}
          <div className="flex flex-col gap-2.5">
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="sec-label">{tx('Banner Header (Cover)', 'Header Cover Banner')}</h3>
              {coverUrl && (
                <button
                  type="button"
                  onClick={handleRemoveCover}
                  className="text-[12px] text-red-400 hover:text-red-300 flex items-center gap-1 transition-colors"
                >
                  <Trash2 size={13} />
                  <span>{tx('Hapus cover', 'Remove cover')}</span>
                </button>
              )}
            </div>

            {coverUrl ? (
              <div className="relative rounded-[var(--r2)] overflow-hidden border border-white/10 group h-28 bg-[var(--s1)]">
                <img src={coverUrl} alt="Cover Preview" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    disabled={uploadingCover}
                    onClick={() => coverFileRef.current?.click()}
                    className="px-3 py-1.5 rounded-full bg-white text-black font-semibold text-[12px] flex items-center gap-1.5 shadow"
                  >
                    <Upload size={13} />
                    <span>{uploadingCover ? tx('Mengunggah...', 'Uploading...') : tx('Ganti cover', 'Change cover')}</span>
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                disabled={uploadingCover}
                onClick={() => coverFileRef.current?.click()}
                className="flex items-center justify-center gap-2 p-4 rounded-[var(--r2)] bg-[var(--s1)] hover:bg-[var(--s2)] text-[var(--tx)] text-[13px] font-medium transition-colors border border-dashed border-white/15"
              >
                <Upload size={16} className="text-[var(--ac)]" />
                <span>{uploadingCover ? tx('Mengunggah cover...', 'Uploading cover...') : tx('Upload Banner Cover Header (Rasio 3:1)', 'Upload Header Cover (3:1 ratio)')}</span>
              </button>
            )}
          </div>

          {/* 2. Wallpaper Latar Belakang (Custom Background) */}
          <div className="flex flex-col gap-2.5">
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="sec-label">{tx('Gambar Latar (Wallpaper Belakang)', 'Background Image Wallpaper')}</h3>
              {bgImage && (
                <button
                  type="button"
                  onClick={handleRemoveBg}
                  className="text-[12px] text-red-400 hover:text-red-300 flex items-center gap-1 transition-colors"
                >
                  <Trash2 size={13} />
                  <span>{tx('Hapus latar', 'Remove background')}</span>
                </button>
              )}
            </div>

            {bgImage ? (
              <div className="flex flex-col gap-3 p-3.5 rounded-[var(--r2)] bg-[var(--s1)] border border-white/10">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <img src={bgImage} alt="Background Preview" className="w-12 h-12 rounded object-cover border border-white/10" />
                    <div>
                      <div className="text-[13px] font-medium text-[var(--tx)]">{tx('Gambar Latar Aktif', 'Active Background')}</div>
                      <div className="text-[11px] text-[var(--tx3)]">{tx('Tersimpan di Cloudflare R2', 'Stored on Cloudflare R2')}</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={uploadingBg}
                    onClick={() => bgFileRef.current?.click()}
                    className="px-2.5 py-1.5 rounded-[var(--r1)] bg-[var(--s2)] hover:bg-white/10 text-[12px] font-medium text-[var(--tx)] flex items-center gap-1 transition-colors"
                  >
                    <Upload size={12} />
                    <span>{uploadingBg ? tx('Mengunggah...', 'Uploading...') : tx('Ganti foto', 'Change')}</span>
                  </button>
                </div>

                {/* Kontrol Blur */}
                <div className="flex flex-col gap-1.5 pt-2 border-t border-white/5">
                  <span className="text-[11px] font-semibold text-[var(--tx2)] uppercase tracking-wider">{tx('Efek Buram (Blur)', 'Blur Effect')}</span>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[
                      { val: 0, label: tx('0px (Asli)', '0px') },
                      { val: 4, label: tx('4px', '4px') },
                      { val: 8, label: tx('8px', '8px') },
                      { val: 16, label: tx('16px (Kabur)', '16px') },
                    ].map((b) => (
                      <button
                        key={b.val}
                        type="button"
                        onClick={() => onUpdateStyle?.({ bg_blur: b.val })}
                        className={`py-1 text-[11px] rounded-[var(--r1)] transition-colors ${
                          bgBlur === b.val ? 'bg-[var(--ac)] text-[var(--ink)] font-bold' : 'bg-[var(--s2)] text-[var(--tx2)] hover:text-white'
                        }`}
                      >
                        {b.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Kontrol Dim / Kegelapan */}
                <div className="flex flex-col gap-1.5 pt-2 border-t border-white/5">
                  <span className="text-[11px] font-semibold text-[var(--tx2)] uppercase tracking-wider">{tx('Lapisan Gelap (Kontras Teks)', 'Dim Darkness')}</span>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[
                      { val: 0, label: tx('0% (Terang)', '0%') },
                      { val: 30, label: tx('30%', '30%') },
                      { val: 60, label: tx('60%', '60%') },
                      { val: 80, label: tx('80% (Pekat)', '80%') },
                    ].map((d) => (
                      <button
                        key={d.val}
                        type="button"
                        onClick={() => onUpdateStyle?.({ bg_dim: d.val })}
                        className={`py-1 text-[11px] rounded-[var(--r1)] transition-colors ${
                          bgDim === d.val ? 'bg-[var(--ac)] text-[var(--ink)] font-bold' : 'bg-[var(--s2)] text-[var(--tx2)] hover:text-white'
                        }`}
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <button
                type="button"
                disabled={uploadingBg}
                onClick={() => bgFileRef.current?.click()}
                className="flex items-center justify-center gap-2 p-4 rounded-[var(--r2)] bg-[var(--s1)] hover:bg-[var(--s2)] text-[var(--tx)] text-[13px] font-medium transition-colors border border-dashed border-white/15"
              >
                <ImageIcon size={16} className="text-[var(--ac)]" />
                <span>{uploadingBg ? tx('Mengunggah latar...', 'Uploading background...') : tx('Upload Wallpaper Latar Belakang Layar Penuh', 'Upload Fullscreen Wallpaper Background')}</span>
              </button>
            )}
          </div>

          {/* 3. Efek Visual Tambahan (Aurora & Grain) */}
          <div className="flex flex-col gap-2.5">
            <h3 className="sec-label">{tx('Efek Atmosfer Latar', 'Background Atmosphere FX')}</h3>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleToggleBgFx('aurora')}
                className={`flex items-center justify-between p-3 rounded-[var(--r2)] bg-[var(--s1)] hover:bg-[var(--s2)] transition-colors border ${
                  activeBgFx.includes('aurora') ? 'border-[var(--ac)]' : 'border-transparent'
                }`}
              >
                <div className="flex items-center gap-2 text-left">
                  <Sparkles size={16} className="text-[var(--ac)]" />
                  <div>
                    <div className="text-[13px] font-medium text-[var(--tx)]">{tx('Aurora Wave', 'Aurora Wave')}</div>
                    <div className="text-[11px] text-[var(--tx3)]">{tx('Ombak cahaya dinamis', 'Dynamic ambient glow')}</div>
                  </div>
                </div>
                {activeBgFx.includes('aurora') && <Check size={14} className="text-[var(--ac)] shrink-0" />}
              </button>

              <button
                type="button"
                onClick={() => handleToggleBgFx('grain')}
                className={`flex items-center justify-between p-3 rounded-[var(--r2)] bg-[var(--s1)] hover:bg-[var(--s2)] transition-colors border ${
                  activeBgFx.includes('grain') ? 'border-[var(--ac)]' : 'border-transparent'
                }`}
              >
                <div className="flex items-center gap-2 text-left">
                  <Sliders size={16} className="text-[var(--ac)]" />
                  <div>
                    <div className="text-[13px] font-medium text-[var(--tx)]">{tx('Film Grain', 'Film Grain')}</div>
                    <div className="text-[11px] text-[var(--tx3)]">{tx('Tekstur analog halus', 'Subtle analog texture')}</div>
                  </div>
                </div>
                {activeBgFx.includes('grain') && <Check size={14} className="text-[var(--ac)] shrink-0" />}
              </button>
            </div>
          </div>

          {/* 4. Bentuk Foto */}
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

          {/* 5. Preset Tema */}
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
