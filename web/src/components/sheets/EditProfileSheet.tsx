import React, { useState } from 'react';
import { Sheet } from '../Sheet';
import { BioProfile } from '../../types';

interface EditProfileSheetProps {
  isOpen: boolean;
  onClose: () => void;
  profile: BioProfile;
  onUpdateProfile: (updated: Partial<BioProfile>) => Promise<void>;
}

export const EditProfileSheet: React.FC<EditProfileSheetProps> = ({
  isOpen,
  onClose,
  profile,
  onUpdateProfile,
}) => {
  const [displayName, setDisplayName] = useState(profile.display_name || '');
  const [handle, setHandle] = useState(profile.handle || '');
  const [bio, setBio] = useState(profile.bio || '');
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url || '');
  const [showAvatarInput, setShowAvatarInput] = useState(false);
  const [verifiedBadge, setVerifiedBadge] = useState<boolean>(Boolean(profile.verified_badge));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        avatar_url: avatarUrl.trim() || undefined,
        verified_badge: verifiedBadge,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Gagal menyimpan profil');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet isOpen={isOpen} onClose={onClose} title="Ubah profil">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        {error && (
          <div className="p-3 rounded-[var(--r2)] bg-rose-500/10 text-rose-400 text-[13px]">
            {error}
          </div>
        )}

        <div className="row">
          <div className="avatar">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={displayName}
                className="w-full h-full object-cover rounded-[var(--r3)]"
              />
            ) : (
              (displayName.charAt(0) || 'C').toUpperCase()
            )}
          </div>
          <button
            type="button"
            className="btn btn-g btn-sm"
            onClick={() => setShowAvatarInput(!showAvatarInput)}
          >
            {showAvatarInput ? 'Tutup URL Foto' : 'Ganti foto'}
          </button>
        </div>

        {showAvatarInput && (
          <div className="field">
            <label htmlFor="p-avatar">URL Foto Profil</label>
            <input
              id="p-avatar"
              type="url"
              placeholder="https://images.unsplash.com/..."
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
            />
          </div>
        )}

        <div className="field">
          <label htmlFor="p-name">Nama</label>
          <input
            id="p-name"
            type="text"
            required
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="p-handle">Alamat halaman</label>
          <div className="flex items-center gap-0">
            <span className="mono muted bg-[var(--in)] min-h-[44px] flex items-center pl-3 rounded-l-[var(--r2)] select-none">
              edgelink.id/@
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
          <div className="hint text-[var(--ok)]">Tersedia</div>
        </div>

        <div className="field">
          <label htmlFor="p-bio">Bio</label>
          <textarea
            id="p-bio"
            rows={3}
            maxLength={160}
            placeholder="Ceritakan singkat tentang kamu"
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
          <span>Tampilkan tanda terverifikasi</span>
        </label>

        <button
          type="submit"
          disabled={loading}
          className="btn btn-p btn-w mt-2 disabled:opacity-50"
        >
          {loading ? 'Menyimpan...' : 'Simpan'}
        </button>
      </form>
    </Sheet>
  );
};
