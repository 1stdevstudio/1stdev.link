import React, { useState } from 'react';
import {
  Copy,
  Check,
  BarChart2,
  Trash2,
  ExternalLink,
  Plus,
  Search,
  Smartphone,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { LinkItem } from '../types';

interface LinkManagerProps {
  links: LinkItem[];
  onCreateLink: (payload: {
    destination_url: string;
    slug?: string;
    title?: string;
    is_bio_entry?: boolean;
    ios_url?: string;
    android_url?: string;
  }) => Promise<void>;
  onToggleActive: (id: string, current: boolean) => Promise<void>;
  onDeleteLink: (id: string) => Promise<void>;
  onOpenAnalytics: (link: LinkItem) => void;
}

export const LinkManager: React.FC<LinkManagerProps> = ({
  links,
  onCreateLink,
  onToggleActive,
  onDeleteLink,
  onOpenAnalytics,
}) => {
  const [url, setUrl] = useState('');
  const [slug, setSlug] = useState('');
  const [title, setTitle] = useState('');
  const [isBioEntry, setIsBioEntry] = useState(false);
  const [showSmartRouting, setShowSmartRouting] = useState(false);
  const [iosUrl, setIosUrl] = useState('');
  const [androidUrl, setAndroidUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    try {
      setSubmitting(true);
      setError(null);
      await onCreateLink({
        destination_url: url.trim(),
        slug: slug.trim() || undefined,
        title: title.trim() || undefined,
        is_bio_entry: isBioEntry,
        ios_url: iosUrl.trim() || undefined,
        android_url: androidUrl.trim() || undefined,
      });
      setUrl('');
      setSlug('');
      setTitle('');
      setIosUrl('');
      setAndroidUrl('');
      setShowSmartRouting(false);
      setIsBioEntry(false);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to create link');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const edgeBase = import.meta.env.VITE_API_URL || window.location.origin;

  const copyUrl = (link: LinkItem) => {
    const full = `${edgeBase}/${link.slug}`;
    navigator.clipboard.writeText(full);
    setCopiedId(link.id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const filteredLinks = links.filter(
    (l) =>
      l.slug.toLowerCase().includes(search.toLowerCase()) ||
      l.destination_url.toLowerCase().includes(search.toLowerCase()) ||
      (l.title && l.title.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Create Form (Luxury Card, Zero Border) */}
      <form
        onSubmit={handleCreate}
        className="p-6 bg-white/[0.035] backdrop-blur-2xl rounded-3xl space-y-5 shadow-2xl shadow-black/30"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-2 h-2 rounded-full bg-cyan-400 shadow-sm shadow-cyan-400/50" />
            <span className="text-xs font-semibold tracking-wider uppercase text-neutral-300">
              Buat Tautan Baru
            </span>
          </div>
          <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full">
            100% Gratis &amp; Bebas Iklan
          </span>
        </div>

        {error && (
          <div className="p-3.5 rounded-2xl bg-rose-500/10 text-rose-300 text-xs flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0" />
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5">
          <div className="md:col-span-6">
            <label className="block text-[11px] font-mono text-neutral-400 mb-1.5">
              Destination URL <span className="text-cyan-400">*</span>
            </label>
            <input
              type="url"
              required
              placeholder="https://example.com/target-page"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full px-4 py-2.5 text-xs bg-black/40 rounded-xl text-white placeholder:text-neutral-600 focus:outline-hidden focus:bg-white/[0.06] transition-all"
            />
          </div>

          <div className="md:col-span-3">
            <label className="block text-[11px] font-mono text-neutral-400 mb-1.5">
              Custom Slug <span className="text-neutral-600">(auto Base62 if empty)</span>
            </label>
            <div className="flex items-center bg-black/40 rounded-xl overflow-hidden focus-within:bg-white/[0.06] transition-all">
              <span className="pl-3.5 pr-1 text-xs font-mono text-neutral-500 select-none">
                /
              </span>
              <input
                type="text"
                placeholder="promo"
                value={slug}
                onChange={(e) => setSlug(e.target.value.replace(/[^a-zA-Z0-9-_]/g, ''))}
                className="w-full py-2.5 pr-3 text-xs font-mono bg-transparent text-white placeholder:text-neutral-600 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="md:col-span-3">
            <label className="block text-[11px] font-mono text-neutral-400 mb-1.5">
              Label <span className="text-neutral-600">(optional)</span>
            </label>
            <input
              type="text"
              placeholder="Campaign Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2.5 text-xs bg-black/40 rounded-xl text-white placeholder:text-neutral-600 focus:outline-hidden focus:bg-white/[0.06] transition-all"
            />
          </div>
        </div>

        {/* Smart Device Routing Toggle */}
        <div className="pt-1">
          <button
            type="button"
            onClick={() => setShowSmartRouting(!showSmartRouting)}
            className="flex items-center gap-2 text-xs font-mono text-cyan-400 hover:text-cyan-300 transition cursor-pointer select-none"
          >
            <Smartphone size={13} />
            <span>Smart Device Routing (iOS & Android Deep Link)</span>
            {showSmartRouting ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>

          {showSmartRouting && (
            <div className="mt-3 p-4 rounded-2xl bg-black/30 grid grid-cols-1 md:grid-cols-2 gap-3.5 animate-fadeIn">
              <div>
                <label className="block text-[10px] font-mono text-neutral-400 mb-1">
                  iOS Destination URL (App Store / Universal Link)
                </label>
                <input
                  type="url"
                  placeholder="https://apps.apple.com/app/..."
                  value={iosUrl}
                  onChange={(e) => setIosUrl(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-black/50 rounded-xl text-white placeholder:text-neutral-600 focus:outline-hidden focus:bg-white/[0.06] transition-all"
                />
              </div>
              <div>
                <label className="block text-[10px] font-mono text-neutral-400 mb-1">
                  Android Destination URL (Google Play / APK)
                </label>
                <input
                  type="url"
                  placeholder="https://play.google.com/store/apps/..."
                  value={androidUrl}
                  onChange={(e) => setAndroidUrl(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-black/50 rounded-xl text-white placeholder:text-neutral-600 focus:outline-hidden focus:bg-white/[0.06] transition-all"
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
          <label className="flex items-center gap-2.5 cursor-pointer select-none text-xs text-neutral-300 hover:text-white transition">
            <input
              type="checkbox"
              checked={isBioEntry}
              onChange={(e) => setIsBioEntry(e.target.checked)}
              className="w-4 h-4 rounded-md bg-black/40 border-0 text-cyan-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
            />
            <span>Tampilkan di halaman profil Bio publik</span>
          </label>

          <button
            type="submit"
            disabled={submitting}
            className="flex items-center gap-2 px-5 py-2.5 bg-white hover:bg-neutral-200 text-black text-xs font-semibold rounded-xl transition-all shadow-lg shadow-white/10 disabled:opacity-50 cursor-pointer"
          >
            {submitting ? (
              'Menyimpan...'
            ) : (
              <>
                <Plus size={14} />
                <span>Simpan Tautan</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Filter and Count Bar */}
      <div className="flex items-center justify-between gap-4 px-1">
        <div className="text-xs text-neutral-400 font-mono">
          <span className="font-semibold text-white">{filteredLinks.length}</span> tautan aktif
        </div>
        <div className="relative">
          <Search size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
          <input
            type="text"
            placeholder="Cari tautan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-4 py-2 text-xs bg-white/[0.025] hover:bg-white/[0.04] focus:bg-white/[0.06] rounded-xl text-white placeholder:text-neutral-600 focus:outline-hidden w-60 transition-all font-mono"
          />
        </div>
      </div>

      {/* Links Flow (Clean Borderless Floating Rows) */}
      <div className="space-y-3">
        {filteredLinks.length === 0 ? (
          <div className="p-16 rounded-3xl bg-white/[0.015] text-center text-xs text-neutral-500 font-mono">
            Belum ada tautan yang dibuat. Silakan tambahkan tautan pertama Anda di atas.
          </div>
        ) : (
          filteredLinks.map((link) => (
            <div
              key={link.id}
              className="p-4 rounded-2xl bg-white/[0.025] hover:bg-white/[0.045] backdrop-blur-xl transition-all duration-200 flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              {/* Left Identity */}
              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="font-mono font-semibold text-xs text-cyan-300 bg-cyan-500/10 px-2.5 py-1 rounded-lg">
                    /{link.slug}
                  </span>
                  {link.title && (
                    <span className="text-xs text-white font-medium truncate">
                      {link.title}
                    </span>
                  )}
                  {Boolean(link.is_bio_entry) && (
                    <span className="text-[10px] px-2 py-0.5 bg-indigo-500/10 text-indigo-300 rounded-full uppercase font-mono tracking-wider">
                      bio
                    </span>
                  )}
                  {(link.ios_url || link.android_url) && (
                    <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 bg-cyan-500/10 text-cyan-300 rounded-full font-mono">
                      <Smartphone size={10} />
                      smart route
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-neutral-400 font-mono truncate">
                  <span className="truncate">{link.destination_url}</span>
                  <a
                    href={link.destination_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-neutral-500 hover:text-white shrink-0 transition"
                  >
                    <ExternalLink size={12} />
                  </a>
                </div>
              </div>

              {/* Right Metrics & Floating Actions */}
              <div className="flex items-center gap-4 shrink-0">
                {/* Clicks Metric */}
                <div className="text-right px-2">
                  <div className="text-sm font-mono font-bold text-white">
                    {(link.clicks ?? 0).toLocaleString()}
                  </div>
                  <div className="text-[10px] text-neutral-500 uppercase tracking-wider font-mono">
                    clicks
                  </div>
                </div>

                {/* Actions Group */}
                <div className="flex items-center gap-1.5 bg-black/30 p-1 rounded-xl">
                  {/* Copy Button */}
                  <button
                    onClick={() => copyUrl(link)}
                    className="p-2 rounded-lg hover:bg-white/10 text-neutral-400 hover:text-white transition cursor-pointer"
                    title="Copy shortlink"
                  >
                    {copiedId === link.id ? (
                      <Check size={14} className="text-emerald-400" />
                    ) : (
                      <Copy size={14} />
                    )}
                  </button>

                  {/* Analytics Trigger */}
                  <button
                    onClick={() => onOpenAnalytics(link)}
                    className="p-2 rounded-lg hover:bg-white/10 text-neutral-400 hover:text-white transition cursor-pointer"
                    title="View edge analytics"
                  >
                    <BarChart2 size={14} />
                  </button>

                  {/* Active Toggle Button */}
                  <button
                    onClick={() => onToggleActive(link.id, Boolean(link.is_active))}
                    className={`text-[10px] font-mono px-3 py-1.5 rounded-lg transition-all cursor-pointer font-medium ${
                      link.is_active
                        ? 'bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25'
                        : 'bg-white/5 text-neutral-500 hover:bg-white/10'
                    }`}
                  >
                    {link.is_active ? 'ACTIVE' : 'PAUSED'}
                  </button>

                  {/* Delete Button */}
                  <button
                    onClick={() => onDeleteLink(link.id)}
                    className="p-2 rounded-lg hover:bg-rose-500/20 text-neutral-500 hover:text-rose-400 transition cursor-pointer"
                    title="Delete link"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
