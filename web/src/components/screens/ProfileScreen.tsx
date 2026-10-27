import React from 'react';
import {
  AlertTriangle,
  Share2,
  Copy,
  Check,
  Star,
  Link2,
  MessageCircle,
  Type,
  Plus,
  ArrowUp,
  ArrowDown,
  Trash2,
} from 'lucide-react';
import { BioProfile, LinkItem } from '../../types';

interface ProfileScreenProps {
  isGuest: boolean;
  profile: BioProfile;
  links: LinkItem[];
  onOpenEditProfile: () => void;
  onOpenShare: () => void;
  onOpenAddBlock: () => void;
  onOpenSaveAccount: () => void;
  onUpdateTheme: (theme: string) => void;
  onUpdateAvatarShape: (shape: 'circle' | 'squircle' | 'rounded') => void;
  onReorderLinks: (links: LinkItem[]) => void;
  onDeleteLink: (id: string) => void;
  onToast: (msg: string) => void;
}

const THEMES = [
  { id: 'obsidian', name: 'Obsidian', bg: '#0b0c12', text: '#f2f3f7' },
  { id: 'clean-paper', name: 'Kertas', bg: '#f4f4f2', text: '#111111' },
  { id: 'aurora-emerald', name: 'Hutan', bg: '#0f1f1a', text: '#bff3d8' },
  { id: 'midnight-neon', name: 'Senja', bg: '#1a1024', text: '#e9d5ff' },
  { id: 'cyber-matrix', name: 'Samudra', bg: '#101826', text: '#bfdbfe' },
  { id: 'rose-gold', name: 'Pasir', bg: '#1f1a12', text: '#fde68a' },
];

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  isGuest,
  profile,
  links,
  onOpenEditProfile,
  onOpenShare,
  onOpenAddBlock,
  onOpenSaveAccount,
  onUpdateTheme,
  onUpdateAvatarShape,
  onReorderLinks,
  onDeleteLink,
  onToast,
}) => {
  const baseUrl = import.meta.env.VITE_API_URL || window.location.origin;
  const publicUrl = `${baseUrl}/@${profile.handle}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicUrl);
    onToast('Link disalin');
  };

  const bioLinks = links.filter((l) => l.is_bio_entry !== false);

  const moveLink = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= bioLinks.length) return;

    const newBioLinks = [...bioLinks];
    const temp = newBioLinks[index];
    newBioLinks[index] = newBioLinks[targetIndex];
    newBioLinks[targetIndex] = temp;

    // Map back into full link list
    const updatedAll = links.map((link) => {
      const idxInBio = newBioLinks.findIndex((b) => b.id === link.id);
      if (idxInBio !== -1) {
        return { ...link, sort_order: idxInBio };
      }
      return link;
    });

    onReorderLinks(updatedAll);
  };

  const getShapeClass = (shape?: string) => {
    if (shape === 'circle') return 'rounded-full';
    if (shape === 'squircle') return 'rounded-[18px]';
    return 'rounded-[var(--r3)]';
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Guest Warning Banner */}
      {isGuest && (
        <button
          type="button"
          onClick={onOpenSaveAccount}
          className="flex items-start gap-3 w-full p-3.5 rounded-[var(--r3)] bg-[rgba(251,191,36,0.1)] text-left transition hover:bg-[rgba(251,191,36,0.15)] text-[var(--warn)]"
        >
          <AlertTriangle size={18} strokeWidth={1.75} className="shrink-0 mt-0.5" />
          <span className="text-[13px] leading-snug">
            Akun ini hanya ada di browser ini. Simpan dengan email agar profil dan link kamu tidak
            hilang.
          </span>
        </button>
      )}

      {/* Profile Head */}
      <div className="card flex items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 min-w-0">
          <div
            className={`w-14 h-14 shrink-0 bg-[var(--ac)] text-[var(--ink)] font-bold text-lg grid place-items-center overflow-hidden ${getShapeClass(
              profile.avatar_shape
            )}`}
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
          <div className="min-w-0">
            <h2 className="text-[17px] font-semibold text-[var(--tx)] truncate flex items-center gap-1.5">
              <span>{profile.display_name || 'Edge Creator'}</span>
              {profile.verified_badge ? (
                <span className="w-4 h-4 rounded-full bg-[var(--ac)] text-[var(--ink)] inline-grid place-items-center">
                  <Check size={11} strokeWidth={2.5} />
                </span>
              ) : null}
            </h2>
            <div className="mono text-[13px] text-[var(--tx2)] truncate">
              edgelink.id/@{profile.handle}
            </div>
          </div>
        </div>
        <button
          type="button"
          className="btn btn-g btn-sm shrink-0"
          onClick={onOpenEditProfile}
        >
          Ubah
        </button>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <button
          type="button"
          className="btn btn-p grow"
          onClick={onOpenShare}
        >
          <Share2 size={18} strokeWidth={1.75} />
          <span>Bagikan</span>
        </button>
        <button
          type="button"
          className="btn btn-g grow"
          onClick={handleCopyLink}
        >
          <Copy size={18} strokeWidth={1.75} />
          <span>Salin link</span>
        </button>
      </div>

      {/* Section: Isi Halaman */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="text-[15px] font-semibold text-[var(--tx)]">Isi halaman</h3>
          <span className="small muted">{bioLinks.length} blok</span>
        </div>

        <div className="flex flex-col gap-2">
          {bioLinks.length === 0 ? (
            <div className="card p-6 text-center text-[13px] text-[var(--tx2)]">
              Belum ada isi di halaman profil. Tekan tombol Tambah isi di bawah.
            </div>
          ) : (
            bioLinks.map((link, idx) => (
              <div
                key={link.id}
                className="card flex items-center gap-3 p-3 transition hover:bg-[var(--s2)] group"
              >
                {/* Grip & Reorder Controls */}
                <div className="flex flex-col gap-0.5 text-[var(--tx3)]">
                  <button
                    type="button"
                    disabled={idx === 0}
                    onClick={() => moveLink(idx, 'up')}
                    className="hover:text-[var(--tx)] disabled:opacity-20 p-0.5"
                    aria-label="Geser ke atas"
                  >
                    <ArrowUp size={14} strokeWidth={1.75} />
                  </button>
                  <button
                    type="button"
                    disabled={idx === bioLinks.length - 1}
                    onClick={() => moveLink(idx, 'down')}
                    className="hover:text-[var(--tx)] disabled:opacity-20 p-0.5"
                    aria-label="Geser ke bawah"
                  >
                    <ArrowDown size={14} strokeWidth={1.75} />
                  </button>
                </div>

                {/* Block Icon */}
                <span className="w-9 h-9 rounded-[var(--r2)] bg-[var(--s2)] grid place-items-center shrink-0">
                  {link.block_type === 'featured' ? (
                    <Star size={18} strokeWidth={1.75} className="text-[var(--ac)]" />
                  ) : link.block_type === 'whatsapp' ? (
                    <MessageCircle size={18} strokeWidth={1.75} className="text-[var(--ok)]" />
                  ) : link.block_type === 'header' ? (
                    <Type size={18} strokeWidth={1.75} className="text-[var(--tx2)]" />
                  ) : (
                    <Link2 size={18} strokeWidth={1.75} className="text-[var(--tx2)]" />
                  )}
                </span>

                {/* Info */}
                <div className="grow min-w-0">
                  <h4 className="text-[14px] font-semibold text-[var(--tx)] truncate">
                    {link.title || link.slug || 'Tanpa judul'}
                  </h4>
                  <p className="small muted truncate">
                    {link.block_type === 'header'
                      ? 'Judul Kategori'
                      : link.block_type === 'whatsapp'
                      ? 'Chat Langsung'
                      : link.destination_url}
                  </p>
                </div>

                {/* Status Tag */}
                <span className="tag shrink-0">Tampil</span>

                {/* Delete button */}
                <button
                  type="button"
                  onClick={() => onDeleteLink(link.id)}
                  className="iconbtn text-[var(--tx3)] hover:text-rose-400 p-1 shrink-0"
                  aria-label="Hapus dari bio"
                >
                  <Trash2 size={16} strokeWidth={1.75} />
                </button>
              </div>
            ))
          )}
        </div>

        <button
          type="button"
          className="btn btn-g btn-w"
          onClick={onOpenAddBlock}
        >
          <Plus size={18} strokeWidth={1.75} />
          <span>Tambah isi</span>
        </button>
      </div>

      {/* Section: Tampilan */}
      <div className="flex flex-col gap-4">
        <h3 className="text-[15px] font-semibold text-[var(--tx)]">Tampilan</h3>

        {/* 6 Luxury Themes */}
        <div className="flex flex-col gap-2">
          <label className="text-[13px] text-[var(--tx2)] font-medium">Tema</label>
          <div className="themes">
            {THEMES.map((t) => {
              const active = (profile.theme || 'obsidian') === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  className="theme"
                  style={{ background: t.bg, color: t.text }}
                  aria-pressed={active}
                  onClick={() => onUpdateTheme(t.id)}
                >
                  <i />
                  <i />
                  <span className="font-medium mt-1 truncate">{t.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Photo Shape */}
        <div className="flex flex-col gap-2">
          <label className="text-[13px] text-[var(--tx2)] font-medium">Bentuk foto</label>
          <div className="seg">
            <button
              type="button"
              aria-pressed={(profile.avatar_shape || 'circle') === 'circle'}
              onClick={() => onUpdateAvatarShape('circle')}
            >
              Bulat
            </button>
            <button
              type="button"
              aria-pressed={profile.avatar_shape === 'squircle'}
              onClick={() => onUpdateAvatarShape('squircle')}
            >
              Membulat
            </button>
            <button
              type="button"
              aria-pressed={profile.avatar_shape === 'rounded'}
              onClick={() => onUpdateAvatarShape('rounded')}
            >
              Kotak
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
