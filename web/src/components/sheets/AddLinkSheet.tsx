import React, { useState } from 'react';
import { Sheet } from '../Sheet';
import { ChevronRight } from 'lucide-react';
import { BioBlockType } from '../../types';

interface AddLinkSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateLink: (payload: {
    destination_url: string;
    slug?: string;
    title?: string;
    is_bio_entry?: boolean;
    ios_url?: string;
    android_url?: string;
    block_type?: BioBlockType;
  }) => Promise<void>;
  defaultBlockType?: BioBlockType;
}

export const AddLinkSheet: React.FC<AddLinkSheetProps> = ({
  isOpen,
  onClose,
  onCreateLink,
  defaultBlockType = 'link',
}) => {
  const [destinationUrl, setDestinationUrl] = useState('');
  const [title, setTitle] = useState('');
  const [showInBio, setShowInBio] = useState(true);
  const [slug, setSlug] = useState('');
  const [iosUrl, setIosUrl] = useState('');
  const [androidUrl, setAndroidUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!destinationUrl.trim()) return;

    let cleanUrl = destinationUrl.trim();
    if (!/^https?:\/\//i.test(cleanUrl)) {
      cleanUrl = `https://${cleanUrl}`;
    }

    setLoading(true);
    setError(null);
    try {
      await onCreateLink({
        destination_url: cleanUrl,
        title: title.trim() || undefined,
        slug: slug.trim() || undefined,
        is_bio_entry: showInBio,
        ios_url: iosUrl.trim() || undefined,
        android_url: androidUrl.trim() || undefined,
        block_type: defaultBlockType,
      });
      // Reset form
      setDestinationUrl('');
      setTitle('');
      setSlug('');
      setIosUrl('');
      setAndroidUrl('');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Gagal membuat link');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet isOpen={isOpen} onClose={onClose} title="Tambah link">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        {error && (
          <div className="p-3 rounded-[var(--r2)] bg-rose-500/10 text-rose-400 text-[13px]">
            {error}
          </div>
        )}

        <div className="field">
          <label htmlFor="f-url">Link tujuan</label>
          <input
            id="f-url"
            type="url"
            inputMode="url"
            required
            placeholder="Tempel link, mis. tokoku.com/produk"
            value={destinationUrl}
            onChange={(e) => setDestinationUrl(e.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="f-title">
            Judul <span className="muted font-normal">(opsional)</span>
          </label>
          <input
            id="f-title"
            type="text"
            placeholder="mis. Promo Ramadan"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <label className="check">
          <input
            type="checkbox"
            checked={showInBio}
            onChange={(e) => setShowInBio(e.target.checked)}
          />
          <span>Tampilkan juga di halaman profil</span>
        </label>

        <details className="adv">
          <summary>
            <span>Opsi lanjutan</span>
            <ChevronRight size={18} strokeWidth={1.75} className="muted transition-transform" />
          </summary>
          <div className="body">
            <div className="field">
              <label htmlFor="f-slug">Nama link sendiri</label>
              <div className="flex items-center gap-0">
                <span className="mono muted bg-[var(--in)] min-h-[44px] flex items-center pl-3 rounded-l-[var(--r2)] select-none">
                  edgelink.id/
                </span>
                <input
                  id="f-slug"
                  className="mono rounded-l-none pl-1"
                  placeholder="promo"
                  value={slug}
                  onChange={(e) =>
                    setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))
                  }
                />
              </div>
              <div className="hint">Kosongkan untuk dibuat otomatis.</div>
            </div>

            <div className="field">
              <label htmlFor="f-ios">Link khusus iPhone</label>
              <input
                id="f-ios"
                type="url"
                placeholder="Link App Store"
                value={iosUrl}
                onChange={(e) => setIosUrl(e.target.value)}
              />
            </div>

            <div className="field">
              <label htmlFor="f-and">Link khusus Android</label>
              <input
                id="f-and"
                type="url"
                placeholder="Link Google Play"
                value={androidUrl}
                onChange={(e) => setAndroidUrl(e.target.value)}
              />
              <div className="hint">
                Pengunjung dari HP otomatis diarahkan ke toko aplikasi yang sesuai.
              </div>
            </div>
          </div>
        </details>

        <button
          type="submit"
          disabled={loading}
          className="btn btn-p btn-w mt-2 disabled:opacity-50"
        >
          {loading ? 'Membuat link...' : 'Buat link'}
        </button>
      </form>
    </Sheet>
  );
};
