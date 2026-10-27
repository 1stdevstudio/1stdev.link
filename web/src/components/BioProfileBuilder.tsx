import React, { useState } from 'react';
import { BioProfile, LinkItem, BioBlockType } from '../types';
import {
  ArrowUp,
  ArrowDown,
  Check,
  ExternalLink,
  Sparkles,
  Smartphone,
  Edit3,
  Copy,
  Eye,
  BadgeCheck,
} from 'lucide-react';

interface BioProfileBuilderProps {
  profile: BioProfile;
  bioLinks: LinkItem[];
  onUpdateProfile: (updated: Partial<BioProfile>) => Promise<void>;
  onReorderLinks: (links: LinkItem[]) => Promise<void>;
  onUpdateLinkBlockType?: (linkId: string, blockType: BioBlockType) => Promise<void>;
}

export const BioProfileBuilder: React.FC<BioProfileBuilderProps> = ({
  profile,
  bioLinks,
  onUpdateProfile,
  onReorderLinks,
  onUpdateLinkBlockType,
}) => {
  const [handle, setHandle] = useState(profile.handle || 'user');
  const [displayName, setDisplayName] = useState(profile.display_name || 'My Profile');
  const [bio, setBio] = useState(profile.bio || '');
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url || '');
  const [theme, setTheme] = useState(profile.theme || 'obsidian');
  const [avatarShape, setAvatarShape] = useState<'circle' | 'squircle' | 'rounded'>(
    profile.avatar_shape || 'circle'
  );
  const [verifiedBadge, setVerifiedBadge] = useState<boolean>(Boolean(profile.verified_badge));
  const [socials, setSocials] = useState<Record<string, string>>(profile.social_links || {});

  // Mobile viewport toggle: 'editor' or 'preview'
  const [mobileTab, setMobileTab] = useState<'editor' | 'preview'>('editor');
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const publicUrl = `${import.meta.env.VITE_API_URL || window.location.origin}/@${handle}`;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onUpdateProfile({
        handle,
        display_name: displayName,
        bio,
        avatar_url: avatarUrl,
        theme,
        avatar_shape: avatarShape,
        verified_badge: verifiedBadge,
        social_links: socials,
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  const handleCopyPublicUrl = () => {
    navigator.clipboard.writeText(publicUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const moveLink = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= bioLinks.length) return;

    const list = [...bioLinks];
    const [moved] = list.splice(index, 1);
    list.splice(targetIndex, 0, moved);

    const updated = list.map((item, idx) => ({
      ...item,
      sort_order: idx + 1,
    }));
    onReorderLinks(updated);
  };

  const handleBlockTypeChange = async (linkId: string, type: BioBlockType) => {
    if (onUpdateLinkBlockType) {
      await onUpdateLinkBlockType(linkId, type);
    }
  };

  const themes = [
    { id: 'obsidian', name: 'Cosmic Obsidian', desc: 'Gelap mewah & ambient glass', bg: '#07080c', border: '#38bdf8' },
    { id: 'midnight-neon', name: 'Midnight Neon', desc: 'Gradasi ungu & cyan glow', bg: '#080c1a', border: '#818cf8' },
    { id: 'aurora-emerald', name: 'Aurora Emerald', desc: 'Nuansa hijau beludru premium', bg: '#05130d', border: '#34d399' },
    { id: 'rose-gold', name: 'Rose Gold', desc: 'Aura sunset blush elegan', bg: '#14090f', border: '#fb7185' },
    { id: 'cyber-matrix', name: 'Cyber Matrix', desc: 'Kontras tinggi hitam & neon lime', bg: '#030303', border: '#a3e635' },
    { id: 'clean-paper', name: 'Clean Paper', desc: 'Terang minimalis & tipografi tajam', bg: '#f8fafc', border: '#0284c7' },
  ];

  return (
    <div className="space-y-6">
      {/* Mobile Switcher (Editor vs Live Preview) */}
      <div className="lg:hidden flex items-center justify-center p-1 bg-white/[0.035] rounded-2xl">
        <button
          onClick={() => setMobileTab('editor')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-xl transition cursor-pointer ${
            mobileTab === 'editor' ? 'bg-white text-black shadow-lg shadow-white/10' : 'text-neutral-400'
          }`}
        >
          <Edit3 size={14} />
          <span>Pengaturan Bio</span>
        </button>
        <button
          onClick={() => setMobileTab('preview')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-xl transition cursor-pointer ${
            mobileTab === 'preview' ? 'bg-white text-black shadow-lg shadow-white/10' : 'text-neutral-400'
          }`}
        >
          <Eye size={14} />
          <span>Lihat Hasil HP</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Customizer & Block Management */}
        <div className={`space-y-6 ${mobileTab === 'editor' ? 'block' : 'hidden lg:block'} lg:col-span-7`}>
          <form
            onSubmit={handleSave}
            className="p-6 md:p-8 bg-white/[0.035] backdrop-blur-2xl rounded-3xl space-y-6 shadow-2xl shadow-black/30"
          >
            {/* Header info */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2">
              <div>
                <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                  <span>Kustomisasi Laman Bio Publik</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400">
                    100% Bebas Iklan
                  </span>
                </h3>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Laman profil berkecepatan tinggi tanpa pembebanan script berat.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyPublicUrl}
                  className="flex items-center gap-1.5 text-xs text-neutral-300 hover:text-white transition font-mono bg-white/[0.04] hover:bg-white/[0.08] px-3 py-2 rounded-xl cursor-pointer"
                  title="Salin Tautan Bio"
                >
                  {copiedLink ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                  <span>@{handle}</span>
                </button>
                <a
                  href={publicUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2 text-cyan-400 hover:text-cyan-300 bg-cyan-500/10 hover:bg-cyan-500/20 rounded-xl transition"
                  title="Buka di Tab Baru"
                >
                  <ExternalLink size={14} />
                </a>
              </div>
            </div>

            {/* Basic Identity */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono text-neutral-400 mb-1.5">Username Handle *</label>
                  <div className="flex items-center bg-black/40 rounded-xl overflow-hidden focus-within:bg-white/[0.06] transition-all">
                    <span className="pl-3.5 pr-1 text-xs font-mono text-neutral-500 select-none">@</span>
                    <input
                      type="text"
                      required
                      value={handle}
                      onChange={(e) => setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                      className="w-full py-2.5 pr-3 text-xs font-mono bg-transparent text-white focus:outline-hidden"
                      placeholder="username"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono text-neutral-400 mb-1.5">Nama Tampilan *</label>
                  <input
                    type="text"
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs bg-black/40 rounded-xl text-white focus:bg-white/[0.06] focus:outline-hidden transition-all"
                    placeholder="Nama Anda atau Brand"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-neutral-400 mb-1.5">Deskripsi Singkat (Bio)</label>
                <textarea
                  rows={2}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-black/40 rounded-xl text-white focus:bg-white/[0.06] focus:outline-hidden transition-all resize-none"
                  placeholder="Ceritakan tentang Anda, toko, atau karya Anda..."
                />
              </div>

              {/* Avatar & Shape */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 pt-1">
                <div className="sm:col-span-7">
                  <label className="block text-xs font-mono text-neutral-400 mb-1.5">URL Foto Profil (Avatar)</label>
                  <input
                    type="url"
                    value={avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs bg-black/40 rounded-xl text-white focus:bg-white/[0.06] focus:outline-hidden transition-all"
                    placeholder="https://images.unsplash.com/..."
                  />
                </div>
                <div className="sm:col-span-5">
                  <label className="block text-xs font-mono text-neutral-400 mb-1.5">Bentuk Avatar</label>
                  <div className="grid grid-cols-3 gap-1.5 p-1 bg-black/40 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setAvatarShape('circle')}
                      className={`py-1.5 text-[11px] font-mono rounded-lg transition cursor-pointer ${
                        avatarShape === 'circle' ? 'bg-white text-black font-bold' : 'text-neutral-400'
                      }`}
                    >
                      Bulat
                    </button>
                    <button
                      type="button"
                      onClick={() => setAvatarShape('squircle')}
                      className={`py-1.5 text-[11px] font-mono rounded-lg transition cursor-pointer ${
                        avatarShape === 'squircle' ? 'bg-white text-black font-bold' : 'text-neutral-400'
                      }`}
                    >
                      Squircle
                    </button>
                    <button
                      type="button"
                      onClick={() => setAvatarShape('rounded')}
                      className={`py-1.5 text-[11px] font-mono rounded-lg transition cursor-pointer ${
                        avatarShape === 'rounded' ? 'bg-white text-black font-bold' : 'text-neutral-400'
                      }`}
                    >
                      Kotak
                    </button>
                  </div>
                </div>
              </div>

              {/* Verified Badge Checkbox */}
              <div className="pt-2">
                <label className="flex items-center gap-3 p-3 bg-black/30 hover:bg-black/50 rounded-2xl cursor-pointer transition">
                  <input
                    type="checkbox"
                    checked={verifiedBadge}
                    onChange={(e) => setVerifiedBadge(e.target.checked)}
                    className="w-4 h-4 rounded-md accent-sky-400"
                  />
                  <div className="flex items-center gap-2">
                    <BadgeCheck size={16} className="text-sky-400" />
                    <div>
                      <span className="text-xs font-medium text-white block">Tampilkan Lencana Kreator Terverifikasi</span>
                      <span className="text-[11px] text-neutral-400 block">Menambahkan centang biru di samping nama profil Anda.</span>
                    </div>
                  </div>
                </label>
              </div>
            </div>

            {/* Theme Selector (6 Luxury Themes) */}
            <div className="space-y-3 pt-3">
              <label className="block text-xs font-mono text-neutral-400">Pilih Tema Tampilan (6 Desain Mewah)</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {themes.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTheme(t.id)}
                    className={`p-3 rounded-2xl text-left transition-all cursor-pointer relative overflow-hidden ${
                      theme === t.id
                        ? 'bg-white/[0.08] ring-1 ring-white/30 shadow-lg'
                        : 'bg-black/40 hover:bg-black/60'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: t.border }} />
                      <span className="text-xs font-semibold text-white truncate">{t.name}</span>
                    </div>
                    <p className="text-[10px] text-neutral-400 leading-tight">{t.desc}</p>
                    {theme === t.id && (
                      <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Social Links Form */}
            <div className="space-y-3 pt-3">
              <label className="block text-xs font-mono text-neutral-400">Tautan Kontak &amp; Media Sosial</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { key: 'whatsapp', label: 'WhatsApp (wa.me/...)', placeholder: 'https://wa.me/628...' },
                  { key: 'instagram', label: 'Instagram (instagram.com/...)', placeholder: 'https://instagram.com/...' },
                  { key: 'tiktok', label: 'TikTok (tiktok.com/@...)', placeholder: 'https://tiktok.com/@...' },
                  { key: 'youtube', label: 'YouTube', placeholder: 'https://youtube.com/@...' },
                  { key: 'twitter', label: 'X / Twitter', placeholder: 'https://x.com/...' },
                  { key: 'website', label: 'Website Pribadi / Toko', placeholder: 'https://tokosaya.com' },
                ].map((s) => (
                  <div key={s.key}>
                    <span className="block text-[11px] font-mono text-neutral-400 mb-1">{s.label}</span>
                    <input
                      type="url"
                      value={socials[s.key] || ''}
                      onChange={(e) => setSocials({ ...socials, [s.key]: e.target.value })}
                      className="w-full px-3 py-2 text-xs bg-black/40 rounded-xl text-white focus:bg-white/[0.06] focus:outline-hidden transition-all font-mono"
                      placeholder={s.placeholder}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-4 flex items-center justify-between">
              <div className="text-xs text-neutral-400 font-mono">
                {savedSuccess && (
                  <span className="text-emerald-400 flex items-center gap-1.5">
                    <Check size={14} /> Tersimpan dan Live di Edge!
                  </span>
                )}
              </div>
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2.5 bg-white hover:bg-neutral-200 text-black text-xs font-semibold rounded-xl transition-all shadow-lg shadow-white/10 disabled:opacity-50 cursor-pointer"
              >
                {saving ? (
                  'Menyimpan...'
                ) : (
                  <>
                    <Sparkles size={14} />
                    <span>Simpan Profil Bio</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Block Types & Arrangement Section */}
          <div className="p-6 md:p-8 bg-white/[0.035] backdrop-blur-2xl rounded-3xl space-y-4 shadow-2xl shadow-black/30">
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                <span>Susunan Blok &amp; Tipe Tampilan Bio</span>
                <span className="text-xs font-mono text-neutral-400 font-normal">({bioLinks.length} blok)</span>
              </h3>
              <p className="text-xs text-neutral-400 mt-1">
                Ubah tipe setiap item menjadi Kartu Pilihan, Chat WhatsApp, atau Pembatas Kategori.
              </p>
            </div>

            {bioLinks.length === 0 ? (
              <div className="p-8 text-center text-xs text-neutral-500 font-mono bg-black/30 rounded-2xl">
                Belum ada tautan yang diaktifkan untuk profil Bio. Buat tautan di tab &quot;Tautan Saya&quot; dan centang &quot;Tampilkan di Bio&quot;.
              </div>
            ) : (
              <div className="space-y-3">
                {bioLinks.map((link, idx) => (
                  <div
                    key={link.id}
                    className="p-3.5 bg-black/40 hover:bg-black/60 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-md bg-white/[0.05] text-[10px] font-mono flex items-center justify-center text-neutral-400">
                          {idx + 1}
                        </span>
                        <span className="text-xs font-semibold text-white truncate">
                          {link.title || link.slug}
                        </span>
                      </div>
                      <span className="text-[11px] text-neutral-400 font-mono truncate block mt-0.5">
                        /{link.slug} &rarr; {link.destination_url}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Block Type Selector */}
                      <select
                        value={link.block_type || 'link'}
                        onChange={(e) => handleBlockTypeChange(link.id, e.target.value as BioBlockType)}
                        className="text-[11px] font-mono bg-white/[0.06] hover:bg-white/[0.1] text-white py-1.5 px-2.5 rounded-xl border-none focus:outline-hidden cursor-pointer"
                      >
                        <option value="link" className="bg-[#12131a] text-white">🔗 Tautan Standar</option>
                        <option value="featured" className="bg-[#12131a] text-white">⭐ Kartu Pilihan (Highlight)</option>
                        <option value="whatsapp" className="bg-[#12131a] text-white">💬 Chat WhatsApp</option>
                        <option value="header" className="bg-[#12131a] text-white">🏷️ Pembatas Kategori</option>
                      </select>

                      {/* Move Up/Down Controls */}
                      <div className="flex items-center gap-1 bg-white/[0.03] p-1 rounded-xl">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => moveLink(idx, 'up')}
                          className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-white/[0.08] disabled:opacity-20 cursor-pointer"
                          title="Pindahkan ke atas"
                        >
                          <ArrowUp size={13} />
                        </button>
                        <button
                          type="button"
                          disabled={idx === bioLinks.length - 1}
                          onClick={() => moveLink(idx, 'down')}
                          className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-white/[0.08] disabled:opacity-20 cursor-pointer"
                          title="Pindahkan ke bawah"
                        >
                          <ArrowDown size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Live Interactive Smartphone Mockup */}
        <div className={`lg:col-span-5 ${mobileTab === 'preview' ? 'block' : 'hidden lg:block'} sticky top-24`}>
          <div className="flex items-center justify-between mb-3 px-1">
            <span className="text-xs font-mono uppercase tracking-wider text-neutral-400 flex items-center gap-2">
              <Smartphone size={13} />
              <span>Simulasi Smartphone Langsung</span>
            </span>
            <span className="text-[10px] font-mono text-neutral-500">Live SSR Preview</span>
          </div>

          {/* Smartphone Frame (Borderless Luxury Design) */}
          <div className="relative mx-auto w-full max-w-[340px] aspect-[9/18.5] bg-[#0c0d12] rounded-[48px] p-3.5 shadow-2xl shadow-black/80 ring-1 ring-white/10 flex flex-col overflow-hidden">
            {/* Dynamic Island Notch */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 w-24 h-5 bg-black rounded-full z-20 flex items-center justify-center">
              <span className="w-2.5 h-2.5 rounded-full bg-neutral-900 border border-neutral-800" />
            </div>

            {/* Phone Screen Canvas */}
            <div
              className={`w-full h-full rounded-[38px] p-5 pt-10 overflow-y-auto flex flex-col items-center text-center transition-colors duration-300 relative ${
                theme === 'clean-paper'
                  ? 'bg-slate-50 text-slate-900'
                  : theme === 'aurora-emerald'
                  ? 'bg-[#05130d] text-emerald-50'
                  : theme === 'midnight-neon'
                  ? 'bg-[#080c1a] text-indigo-50'
                  : theme === 'rose-gold'
                  ? 'bg-[#14090f] text-rose-50'
                  : theme === 'cyber-matrix'
                  ? 'bg-[#030303] text-zinc-100'
                  : 'bg-[#07080c] text-white'
              }`}
            >
              {/* Radial ambient glow in phone */}
              <div
                className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-32 blur-2xl pointer-events-none rounded-full opacity-40"
                style={{
                  background:
                    theme === 'aurora-emerald'
                      ? '#34d399'
                      : theme === 'midnight-neon'
                      ? '#818cf8'
                      : theme === 'rose-gold'
                      ? '#fb7185'
                      : theme === 'cyber-matrix'
                      ? '#a3e635'
                      : '#38bdf8',
                }}
              />

              {/* Avatar */}
              <div className="relative z-10 mb-3 mt-2">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={displayName}
                    className={`w-16 h-16 object-cover shadow-lg ${
                      avatarShape === 'squircle'
                        ? 'rounded-[18px]'
                        : avatarShape === 'rounded'
                        ? 'rounded-xl'
                        : 'rounded-full'
                    }`}
                  />
                ) : (
                  <div
                    className={`w-16 h-16 flex items-center justify-center text-xl font-bold text-white shadow-lg ${
                      avatarShape === 'squircle'
                        ? 'rounded-[18px]'
                        : avatarShape === 'rounded'
                        ? 'rounded-xl'
                        : 'rounded-full'
                    }`}
                    style={{
                      background: 'linear-gradient(135deg, #38bdf8, #6366f1)',
                    }}
                  >
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>

              {/* Display Name & Verified Badge */}
              <div className="relative z-10 flex items-center justify-center gap-1">
                <h4 className="text-sm font-bold tracking-tight">{displayName}</h4>
                {verifiedBadge && (
                  <BadgeCheck size={14} className="text-sky-400" />
                )}
              </div>

              {/* Handle */}
              <span className="relative z-10 text-[10px] font-mono opacity-70 block mb-2">
                @{handle}
              </span>

              {/* Bio */}
              {bio && (
                <p className="relative z-10 text-[11px] opacity-80 leading-relaxed mb-3 max-w-[90%]">
                  {bio}
                </p>
              )}

              {/* Social Icons Bar */}
              <div className="relative z-10 flex gap-1.5 flex-wrap justify-center mb-4">
                {Object.entries(socials)
                  .filter(([_, url]) => url && url.trim().length > 0)
                  .map(([platform]) => (
                    <span
                      key={platform}
                      className="text-[9px] uppercase font-mono px-2 py-0.5 rounded-full bg-white/[0.08] backdrop-blur-md"
                    >
                      {platform}
                    </span>
                  ))}
              </div>

              {/* Custom Blocks Container */}
              <div className="relative z-10 w-full space-y-2 mt-auto pb-4">
                {bioLinks.length === 0 ? (
                  <div className="p-4 rounded-xl bg-white/[0.03] text-[10px] opacity-60">
                    Tautan akan muncul di sini secara otomatis
                  </div>
                ) : (
                  bioLinks.map((link) => {
                    const blockType = link.block_type || 'link';

                    if (blockType === 'header') {
                      return (
                        <div
                          key={link.id}
                          className="text-left text-[9px] font-bold uppercase tracking-wider opacity-60 px-2 pt-2"
                        >
                          {link.title || link.slug}
                        </div>
                      );
                    }

                    if (blockType === 'whatsapp') {
                      return (
                        <div
                          key={link.id}
                          className="w-full p-2.5 rounded-xl bg-emerald-500/15 text-emerald-400 font-medium text-xs flex items-center justify-between transition shadow-sm"
                        >
                          <span className="truncate pr-2">{link.title || 'Chat WhatsApp'}</span>
                          <span className="text-[10px] font-mono">Chat &rarr;</span>
                        </div>
                      );
                    }

                    if (blockType === 'featured') {
                      return (
                        <div
                          key={link.id}
                          className="w-full p-2.5 rounded-xl bg-white/[0.1] text-white font-medium text-xs flex items-center justify-between transition shadow-lg relative ring-1 ring-white/20"
                        >
                          <span className="absolute -top-2 right-3 text-[8px] font-bold px-1.5 py-0.2 rounded-full bg-sky-400 text-black">
                            ★ PILIHAN
                          </span>
                          <span className="truncate pr-2">{link.title || link.slug}</span>
                          <span className="text-[10px] font-mono">&rarr;</span>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={link.id}
                        className="w-full p-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.09] font-medium text-xs flex items-center justify-between transition shadow-sm"
                      >
                        <span className="truncate pr-2">{link.title || link.slug}</span>
                        <span className="text-[10px] font-mono opacity-50">&rarr;</span>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Footer */}
              <div className="relative z-10 text-[9px] opacity-40 font-mono mt-2">
                EdgeLink • Free
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
