import React, { useRef, useState } from 'react';
import { Upload, Trash2, Link2 } from 'lucide-react';
import { Sheet } from '../Sheet';
import { BioProfile } from '../../types';
import { useI18n } from '../../i18n/context';
import { api } from '../../api';
import { ImageCropperModal } from '../ImageCropperModal';

interface EditProfileSheetProps {
  isOpen: boolean;
  onClose: () => void;
  profile: BioProfile;
  onUpdateProfile: (updated: Partial<BioProfile>) => Promise<void>;
  isGuest?: boolean;
  onSaveAccount?: () => void;
}

export const EditProfileSheet: React.FC<EditProfileSheetProps> = ({
  isOpen,
  onClose,
  profile,
  onUpdateProfile,
  isGuest,
  onSaveAccount,
}) => {
  const { tx } = useI18n();
  const baseUrl = import.meta.env.VITE_API_URL || window.location.origin;
  const shortHost = baseUrl.replace(/^https?:\/\//, '');
  const [displayName, setDisplayName] = useState(profile.display_name || '');
  const [handle, setHandle] = useState(profile.handle || '');
  const [bio, setBio] = useState(profile.bio || '');
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url || '');
  const [showAvatarInput, setShowAvatarInput] = useState(false);
  const [verifiedBadge, setVerifiedBadge] = useState<boolean>(Boolean(profile.verified_badge));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError(null);
    setCropFile(file);
  };

  const handleCropComplete = async (croppedBlob: Blob) => {
    setCropFile(null);
    setUploading(true);
    setError(null);
    try {
      const url = await api.uploadMedia(croppedBlob, 'avatar');
      setAvatarUrl(url);
      setShowAvatarInput(false);
    } catch (err: any) {
      const msg = err?.message;
      setError(
        msg === 'unsupported' || msg === 'too_large' || !msg
          ? tx('Foto tidak bisa dibaca. Coba file JPG atau PNG lain.', 'Could not read that photo. Try another JPG or PNG.')
          : msg
      );
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim() || !handle.trim()) return;

    setLoading(true);
    setError(null);
    try {
      await onUpdateProfile({
        display_name: displayName.trim(),
        handle: handle.trim().toLowerCase(),
        bio: bio.trim(),
        // null = hapus foto; server lalu membersihkan file lama di penyimpanan.
        avatar_url: (avatarUrl.trim() || null) as string | undefined,
        verified_badge: verifiedBadge,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || tx('Gagal menyimpan profil', 'Could not save profile'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet isOpen={isOpen} onClose={onClose} title={tx('Ubah profil', 'Edit profile')}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        {error && (
          <div className="p-3 rounded-[var(--r2)] bg-rose-500/10 text-rose-400 text-[13px]">
            {error}
          </div>
        )}

        <div className="flex items-center gap-3">
          <div className="w-16 h-16 shrink-0 rounded-full overflow-hidden grid place-items-center bg-[var(--ac)] text-[var(--ink)] text-xl font-bold shadow-lg shadow-black/30">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={displayName}
                className="w-full h-full object-cover"
              />
            ) : (
              (displayName.charAt(0) || 'C').toUpperCase()
            )}
          </div>
          <div className="flex flex-wrap gap-1.5 min-w-0">
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
              className="hidden"
              onChange={handleFile}
            />
            <button
              type="button"
              className="btn btn-g btn-sm disabled:opacity-50"
              disabled={isGuest || uploading}
              onClick={() => fileRef.current?.click()}
            >
              <Upload size={15} strokeWidth={1.75} />
              {uploading ? tx('Mengunggah...', 'Uploading...') : tx('Unggah foto', 'Upload photo')}
            </button>
            {avatarUrl && !uploading && (
              <button type="button" className="btn btn-g btn-sm" onClick={() => setAvatarUrl('')}>
                <Trash2 size={15} strokeWidth={1.75} />
                {tx('Hapus', 'Remove')}
              </button>
            )}
            <button
              type="button"
              className="btn btn-g btn-sm"
              aria-expanded={showAvatarInput}
              onClick={() => setShowAvatarInput(!showAvatarInput)}
            >
              <Link2 size={15} strokeWidth={1.75} />
              {tx('Pakai URL', 'Use URL')}
            </button>
          </div>
        </div>

        {isGuest ? (
          <div className="hint">
            {tx('Simpan akun dulu untuk mengunggah foto.', 'Save your account first to upload a photo.')}{' '}
            {onSaveAccount && (
              <button type="button" className="text-[var(--ac)] font-semibold min-h-[44px]" onClick={onSaveAccount}>
                {tx('Simpan akun', 'Save account')}
              </button>
            )}
          </div>
        ) : (
          <div className="hint">{tx('Foto otomatis dipotong persegi dan dikecilkan.', 'Photos are cropped square and resized automatically.')}</div>
        )}

        {showAvatarInput && (
          <div className="field">
            <label htmlFor="p-avatar">{tx('URL foto profil', 'Profile photo URL')}</label>
            <input
              id="p-avatar"
              type="url"
              placeholder="https://..."
              value={avatarUrl.startsWith('data:') ? '' : avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
            />
          </div>
        )}

        <div className="field">
          <label htmlFor="p-name">{tx('Nama', 'Name')}</label>
          <input
            id="p-name"
            type="text"
            required
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="p-handle">{tx('Alamat halaman', 'Page address')}</label>
          <div className="flex items-center gap-0">
            <span className="mono muted bg-[var(--in)] min-h-[44px] flex items-center pl-3 rounded-l-[var(--r2)] select-none">
              {shortHost}/@
            </span>
            <input
              id="p-handle"
              className="mono rounded-l-none pl-1"
              required
              value={handle}
              onChange={(e) =>
                setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))
              }
            />
          </div>
          <div className="hint text-[var(--ok)]">{tx('Tersedia', 'Available')}</div>
        </div>

        <div className="field">
          <label htmlFor="p-bio">Bio</label>
          <textarea
            id="p-bio"
            rows={3}
            maxLength={160}
            placeholder={tx('Ceritakan singkat tentang kamu', 'A short line about you')}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
          />
          <div className="hint text-right">{bio.length}/160</div>
        </div>

        <label className="check">
          <input
            type="checkbox"
            checked={verifiedBadge}
            onChange={(e) => setVerifiedBadge(e.target.checked)}
          />
          <span>{tx('Tampilkan tanda terverifikasi', 'Show verified badge')}</span>
        </label>

        <button
          type="submit"
          disabled={loading || uploading || !displayName.trim() || !handle.trim()}
          className="btn btn-p btn-w mt-2 disabled:opacity-50"
        >
          {loading ? tx('Menyimpan...', 'Saving...') : tx('Simpan', 'Save')}
        </button>
      </form>

      <ImageCropperModal
        isOpen={Boolean(cropFile)}
        imageFile={cropFile}
        cropType="avatar"
        onCropComplete={handleCropComplete}
        onCancel={() => setCropFile(null)}
      />
    </Sheet>
  );
};
