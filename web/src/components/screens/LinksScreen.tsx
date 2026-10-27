import React, { useState } from 'react';
import { Search, Copy, Plus, Trash2, Check, ExternalLink } from 'lucide-react';
import { LinkItem } from '../../types';

interface LinksScreenProps {
  links: LinkItem[];
  onOpenAddLink: () => void;
  onToggleActive: (id: string, currentState: boolean) => void;
  onDeleteLink: (id: string) => void;
  onToast: (msg: string) => void;
}

export const LinksScreen: React.FC<LinksScreenProps> = ({
  links,
  onOpenAddLink,
  onToggleActive,
  onDeleteLink,
  onToast,
}) => {
  const [query, setQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const baseUrl = import.meta.env.VITE_API_URL || window.location.origin;

  const filtered = links.filter((l) => {
    const q = query.toLowerCase();
    return (
      (l.title && l.title.toLowerCase().includes(q)) ||
      (l.slug && l.slug.toLowerCase().includes(q)) ||
      (l.destination_url && l.destination_url.toLowerCase().includes(q))
    );
  });

  const handleCopy = (slug: string, id: string) => {
    const shortUrl = `${baseUrl}/${slug}`;
    navigator.clipboard.writeText(shortUrl);
    setCopiedId(id);
    onToast('Link disalin');
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-[20px] font-semibold text-[var(--tx)]">Link</h2>
        <button
          type="button"
          className="btn btn-p btn-sm"
          onClick={onOpenAddLink}
        >
          <Plus size={16} strokeWidth={2} />
          <span>Tambah link</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="relative flex items-center">
        <Search
          size={18}
          strokeWidth={1.75}
          className="absolute left-3.5 text-[var(--tx3)] pointer-events-none"
        />
        <input
          type="search"
          placeholder="Cari link..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-10 h-11"
        />
      </div>

      {/* Link List */}
      <div className="flex flex-col gap-2">
        {filtered.length === 0 ? (
          <div className="card p-8 text-center flex flex-col items-center gap-2">
            <p className="text-[14px] text-[var(--tx2)]">
              {query ? 'Tidak ada link yang cocok dengan pencarian.' : 'Belum ada link yang dibuat.'}
            </p>
            {!query && (
              <button
                type="button"
                className="btn btn-g btn-sm mt-1"
                onClick={onOpenAddLink}
              >
                Buat link pertama
              </button>
            )}
          </div>
        ) : (
          filtered.map((link) => {
            const hasSmartRouting = Boolean(link.ios_url || link.android_url);
            const isCopied = copiedId === link.id;

            return (
              <div
                key={link.id}
                className="card flex items-center gap-3 p-3.5 transition hover:bg-[var(--s2)]"
              >
                <div className="grow min-w-0">
                  <h4 className="text-[14px] font-semibold text-[var(--tx)] truncate flex items-center gap-2">
                    <span>{link.title || link.slug}</span>
                    <a
                      href={`${baseUrl}/${link.slug}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[var(--tx3)] hover:text-[var(--tx)] inline"
                      aria-label="Buka link"
                    >
                      <ExternalLink size={13} strokeWidth={1.75} />
                    </a>
                  </h4>
                  <div className="mono text-[13px] text-[var(--tx2)] truncate">
                    edgelink.id/{link.slug}
                  </div>
                  {hasSmartRouting && (
                    <div className="small text-[var(--ac)] mt-0.5">
                      Otomatis ke App Store / Play Store
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {/* Clicks badge */}
                  <span className="tag off font-medium">
                    {(link.clicks ?? 0).toLocaleString()} klik
                  </span>

                  {/* Active / Inactive Tag */}
                  {link.is_active === 0 ? (
                    <span className="tag off text-rose-400">Nonaktif</span>
                  ) : null}

                  {/* Copy button */}
                  <button
                    type="button"
                    className="iconbtn"
                    onClick={() => handleCopy(link.slug, link.id)}
                    aria-label="Salin link"
                  >
                    {isCopied ? (
                      <Check size={18} strokeWidth={2} className="text-[var(--ok)]" />
                    ) : (
                      <Copy size={18} strokeWidth={1.75} />
                    )}
                  </button>

                  {/* Toggle status */}
                  <button
                    type="button"
                    className={`text-[12px] font-medium px-2 py-1 rounded-[var(--r1)] transition ${
                      link.is_active === 0
                        ? 'bg-[var(--s2)] text-[var(--tx2)]'
                        : 'bg-emerald-500/10 text-[var(--ok)]'
                    }`}
                    onClick={() => onToggleActive(link.id, link.is_active !== 0)}
                  >
                    {link.is_active === 0 ? 'Aktifkan' : 'Aktif'}
                  </button>

                  {/* Delete button */}
                  <button
                    type="button"
                    className="iconbtn text-[var(--tx3)] hover:text-rose-400"
                    onClick={() => {
                      if (confirm(`Hapus link "${link.title || link.slug}"?`)) {
                        onDeleteLink(link.id);
                      }
                    }}
                    aria-label="Hapus link"
                  >
                    <Trash2 size={16} strokeWidth={1.75} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
