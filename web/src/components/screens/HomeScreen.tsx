import React, { useState } from 'react';
import {
  Copy,
  Check,
  Share2,
  Plus,
  LayoutGrid,
  UserPen,
  BarChart2,
  ArrowRight,
  ExternalLink,
  Sparkles,
  Store,
  ShoppingBag,
  Scissors,
} from 'lucide-react';
import { AuthSession, BioProfile, LinkItem } from '../../types';
import { useI18n } from '../../i18n/context';
import { isContentBlock } from '../../../../shared/business';

interface HomeScreenProps {
  session: AuthSession;
  profile: BioProfile;
  links: LinkItem[];
  onOpenShare: () => void;
  onOpenAddLink: () => void;
  onOpenAddBlock: () => void;
  onOpenEditProfile: () => void;
  onOpenSaveAccount: () => void;
  onGoTo: (tab: 'profile' | 'links' | 'stats') => void;
  onToast: (msg: string) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  session,
  profile,
  links,
  onOpenShare,
  onOpenAddLink,
  onOpenAddBlock,
  onOpenEditProfile,
  onOpenSaveAccount,
  onGoTo,
  onToast,
}) => {
  const { t, tx } = useI18n();
  const [copied, setCopied] = useState(false);
  const baseUrl = import.meta.env.VITE_API_URL || window.location.origin;
  const publicUrl = `${baseUrl}/@${profile.handle}`;
  const shortHost = baseUrl.replace(/^https?:\/\//, '');

  // Pemisahan yang benar antara shortlink pengalihan URL dan blok konten halaman (R04)
  const bioBlocks = links.filter((l) => Boolean(l.is_bio_entry));
  const shortlinks = links.filter((l) => !isContentBlock(l.block_type));

  const totalClicks = shortlinks.reduce((n, l) => n + (l.clicks || 0), 0);
  const top = [...shortlinks]
    .filter((l) => (l.clicks || 0) > 0)
    .sort((a, b) => (b.clicks || 0) - (a.clicks || 0))
    .slice(0, 4);
  const recent = [...shortlinks]
    .sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')))
    .slice(0, 4);
  const maxTop = Math.max(1, ...top.map((l) => l.clicks || 0));

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      onToast(tx('Link halaman disalin', 'Page link copied'));
      setTimeout(() => setCopied(false), 2000);
    } catch {
      onToast(tx('Gagal menyalin link', 'Failed to copy link'));
    }
  };

  const hour = new Date().getHours();
  const greet =
    hour < 11
      ? tx('Selamat pagi', 'Good morning')
      : hour < 15
      ? tx('Selamat siang', 'Good afternoon')
      : hour < 19
      ? tx('Selamat sore', 'Good afternoon')
      : tx('Selamat malam', 'Good evening');

  // Identifikasi tujuan halaman pengguna (Creator, Usaha, Affiliate)
  const purpose =
    profile.business?.purpose ||
    (profile.business?.mode === 'business' ? 'business' : 'creator');

  // Panduan satu tindakan prioritas berikutnya (purpose-specific single next action)
  const getNextAction = () => {
    if (bioBlocks.length === 0) {
      if (purpose === 'business') {
        return {
          icon: Store,
          badge: tx('Langkah Pertama', 'First Step'),
          title: tx('Mulai siapkan katalog atau kontak usaha', 'Start your catalog or business contacts'),
          desc: tx(
            'Tambahkan produk/layanan, jam buka, dan WhatsApp agar calon pelanggan mudah menghubungi.',
            'Add products/services, hours, and WhatsApp so customers can reach you.'
          ),
          actLabel: tx('Tambah katalog / kontak', 'Add catalog or contact'),
          act: onOpenAddBlock,
        };
      }
      if (purpose === 'affiliate') {
        return {
          icon: ShoppingBag,
          badge: tx('Langkah Pertama', 'First Step'),
          title: tx('Tambahkan katalog rekomendasi produk', 'Add product recommendation catalog'),
          desc: tx(
            'Kurasi produk favorit dengan tautan belanja langsung ke toko online atau marketplace.',
            'Curate your favorite items with direct shop links to marketplaces.'
          ),
          actLabel: tx('Tambah katalog rekomendasi', 'Add recommendation catalog'),
          act: onOpenAddBlock,
        };
      }
      return {
        icon: Sparkles,
        badge: tx('Langkah Pertama', 'First Step'),
        title: tx('Tambahkan karya atau tautan pertama', 'Add your first work or link'),
        desc: tx(
          'Tampilkan media sosial, portofolio karya, atau tautan kerja sama di halaman kamu.',
          'Showcase your socials, portfolio work, or collaboration links.'
        ),
        actLabel: tx('Tambah blok pertama', 'Add first block'),
        act: onOpenAddBlock,
      };
    }

    if (!profile.avatar_url) {
      return {
        icon: UserPen,
        badge: tx('Lengkapi Profil', 'Complete Profile'),
        title: purpose === 'business'
          ? tx('Pasang logo usaha kamu', 'Add your business logo')
          : tx('Pasang foto profil', 'Add your profile photo'),
        desc: purpose === 'business'
          ? tx('Logo membangun kepercayaan langsung bagi pengunjung yang ingin memesan.', 'A logo builds instant trust with prospective customers.')
          : tx('Foto profil membuat halaman lebih personal dan mudah dikenali.', 'A profile photo gives your page a personal, recognizable identity.'),
        actLabel: tx('Pasang foto / logo', 'Add photo / logo'),
        act: onOpenEditProfile,
      };
    }

    if (!profile.bio?.trim()) {
      return {
        icon: UserPen,
        badge: tx('Lengkapi Profil', 'Complete Profile'),
        title: tx('Tulis deskripsi singkat', 'Write a short description'),
        desc: purpose === 'business'
          ? tx('Jelaskan penawaran atau keunggulan usaha kamu secara padat.', 'Explain what makes your business offerings special.')
          : purpose === 'affiliate'
          ? tx('Beri tahu pengunjung kategori rekomendasi barang yang kamu bagikan.', 'Let visitors know what categories you curate and review.')
          : tx('Tulis bio singkat tentang siapa kamu dan karya yang kamu buat.', 'Write a short bio about who you are and what you create.'),
        actLabel: tx('Tulis deskripsi', 'Write description'),
        act: onOpenEditProfile,
      };
    }

    if (session.is_guest) {
      return {
        icon: Sparkles,
        badge: tx('Amankan Data', 'Protect Data'),
        title: tx('Simpan akun dengan email', 'Save your account with email'),
        desc: tx(
          'Halaman kamu baru tersimpan di browser ini. Simpan dengan email agar tidak hilang saat ganti perangkat.',
          'Your page is currently stored in this browser only. Connect email so you never lose it.'
        ),
        actLabel: tx('Simpan akun sekarang', 'Save account now'),
        act: onOpenSaveAccount,
      };
    }

    return {
      icon: Share2,
      badge: tx('Siap Publik', 'Ready for Public'),
      title: tx('Halaman kamu siap dibagikan', 'Your page is ready to share'),
      desc: tx(
        'Salin link atau bagikan ke bio Instagram, TikTok, WhatsApp, atau kemasan produk.',
        'Share your page link in your bio, socials, or product packaging.'
      ),
      actLabel: tx('Bagikan halaman', 'Share page'),
      act: onOpenShare,
    };
  };

  const nextAction = getNextAction();
  const NextIcon = nextAction.icon;

  const quickActions = [
    { icon: <Plus size={20} strokeWidth={1.75} />, label: tx('Link pendek', 'Short link'), act: onOpenAddLink },
    { icon: <LayoutGrid size={20} strokeWidth={1.75} />, label: tx('Tambah blok', 'Add block'), act: onOpenAddBlock },
    { icon: <UserPen size={20} strokeWidth={1.75} />, label: tx('Edit halaman', 'Edit page'), act: onOpenEditProfile },
    { icon: <Share2 size={20} strokeWidth={1.75} />, label: tx('Bagikan', 'Share'), act: onOpenShare },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="small muted">{greet}</p>
        <h2 className="text-[22px] font-semibold text-[var(--tx)] truncate">
          {profile.display_name || tx('Halaman Baru', 'New Page')}
        </h2>
      </div>

      <p className="free-strip">
        <b>{t('heroFreeHeadline')}</b> {t('heroFreeSub')}
      </p>

      {/* Grid: Hero URL Halaman + Panduan Aksi Prioritas Tunggal */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        {/* Bio Link Hero */}
        <section className="card home-hero flex flex-col justify-between">
          <div className="flex items-center gap-3">
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt=""
                className="w-12 h-12 rounded-[var(--r2)] object-cover shrink-0"
              />
            ) : (
              <div className="fav fav-lg" aria-hidden>
                {(profile.display_name || 'E').charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <p className="small muted">{tx('Halaman publik kamu', 'Your public page')}</p>
              <p className="mono text-[14px] text-[var(--ac)] truncate">
                {shortHost}/@{profile.handle}
              </p>
            </div>
          </div>
          <div className="flex gap-2 mt-4 flex-wrap">
            <button type="button" className="btn btn-p btn-sm" onClick={copy}>
              {copied ? <Check size={16} strokeWidth={2} /> : <Copy size={16} strokeWidth={1.75} />}
              <span>{copied ? tx('Disalin', 'Copied') : tx('Salin link', 'Copy link')}</span>
            </button>
            <button type="button" className="btn btn-g btn-sm" onClick={onOpenShare}>
              <Share2 size={16} strokeWidth={1.75} />
              <span>{tx('Bagikan', 'Share')}</span>
            </button>
            <a
              className="btn btn-g btn-sm"
              href={publicUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink size={16} strokeWidth={1.75} />
              <span>{tx('Lihat', 'View')}</span>
            </a>
          </div>
        </section>

        {/* Single Purpose-Specific Next-Action Guide */}
        <section className="card flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-[11px] font-semibold text-[var(--ac)] uppercase tracking-wider">
                {nextAction.badge}
              </span>
              <span className="text-[12px] text-[var(--tx3)]">
                {purpose === 'business'
                  ? tx('Mode Usaha', 'Business Mode')
                  : purpose === 'affiliate'
                  ? tx('Mode Afiliasi', 'Affiliate Mode')
                  : tx('Mode Kreator', 'Creator Mode')}
              </span>
            </div>
            <div className="flex items-start gap-3 mt-1">
              <div className="w-9 h-9 rounded-[var(--r2)] bg-[var(--s2)] grid place-items-center text-[var(--ac)] shrink-0">
                <NextIcon size={18} strokeWidth={1.75} />
              </div>
              <div className="min-w-0">
                <h3 className="text-[15px] font-semibold text-[var(--tx)] leading-snug">
                  {nextAction.title}
                </h3>
                <p className="small muted mt-1 leading-relaxed">
                  {nextAction.desc}
                </p>
              </div>
            </div>
          </div>
          <div className="pt-4">
            <button
              type="button"
              className="btn btn-g btn-sm w-full justify-between"
              onClick={nextAction.act}
            >
              <span>{nextAction.actLabel}</span>
              <ArrowRight size={16} strokeWidth={1.75} />
            </button>
          </div>
        </section>
      </div>

      {/* KPIs: Shortlink dihitung dengan benar via !isContentBlock */}
      <div className="kpis kpis-4">
        <div className="kpi">
          <span>{tx('Total klik link', 'Total link clicks')}</span>
          <b>{totalClicks.toLocaleString()}</b>
        </div>
        <div className="kpi">
          <span>{tx('Link pendek', 'Short links')}</span>
          <b>{shortlinks.length}</b>
        </div>
        <div className="kpi">
          <span>{tx('Blok di halaman', 'Page blocks')}</span>
          <b>{bioBlocks.length}</b>
        </div>
        <div className="kpi">
          <span>{tx('Link aktif', 'Active links')}</span>
          <b>{shortlinks.filter((l) => Boolean(l.is_active)).length}</b>
        </div>
      </div>

      {/* Tombol aksi cepat */}
      <div className="quick">
        {quickActions.map((a) => (
          <button key={a.label} type="button" className="quick-btn" onClick={a.act}>
            <span className="text-[var(--ac)]">{a.icon}</span>
            <span>{a.label}</span>
          </button>
        ))}
      </div>

      {/* Statistik Shortlink & Terbaru */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className="card">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-[15px] font-semibold">
              {tx('Paling banyak diklik', 'Most clicked short links')}
            </h3>
            <button
              type="button"
              className="small text-[var(--ac)] min-h-[44px]"
              onClick={() => onGoTo('stats')}
            >
              <BarChart2 size={14} className="inline -mt-0.5" strokeWidth={1.75} />{' '}
              {tx('Statistik', 'Stats')}
            </button>
          </div>
          {top.length === 0 ? (
            <p className="small muted py-4">
              {tx(
                'Belum ada klik shortlink. Buat link pendek dan bagikan untuk melihat analitik.',
                'No clicks yet. Create a shortlink and share it to view analytics.'
              )}
            </p>
          ) : (
            <ol className="flex flex-col gap-3">
              {top.map((l) => (
                <li key={l.id}>
                  <div className="flex justify-between gap-2 small">
                    <span className="truncate">{l.title || `/${l.slug}`}</span>
                    <b>{(l.clicks || 0).toLocaleString()}</b>
                  </div>
                  <div className="bar">
                    <i style={{ width: `${((l.clicks || 0) / maxTop) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className="card">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-[15px] font-semibold">{tx('Link terbaru', 'Recent short links')}</h3>
            <button
              type="button"
              className="small text-[var(--ac)] min-h-[44px]"
              onClick={() => onGoTo('links')}
            >
              {tx('Semua link', 'All links')}
            </button>
          </div>
          {recent.length === 0 ? (
            <div className="flex flex-col items-start gap-2 py-3">
              <p className="small muted">
                {tx('Belum ada link pendek pengalihan URL.', 'No shortlinks yet.')}
              </p>
              <button
                type="button"
                className="btn btn-g btn-sm text-[12px]"
                onClick={onOpenAddLink}
              >
                <Scissors size={14} strokeWidth={1.75} />
                <span>{tx('Buat link pendek', 'Create short link')}</span>
              </button>
            </div>
          ) : (
            <ul className="flex flex-col gap-2">
              {recent.map((l) => (
                <li key={l.id} className="flex items-center gap-3 min-w-0">
                  <div className="fav" aria-hidden>
                    {(l.title || l.slug).charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 grow">
                    <p className="text-[14px] font-medium truncate">{l.title || l.slug}</p>
                    <p className="mono small muted truncate">
                      {shortHost}/{l.slug}
                    </p>
                  </div>
                  <span className={`tag shrink-0 ${l.is_active ? '' : 'off'}`}>
                    {l.is_active ? tx('Aktif', 'Active') : tx('Nonaktif', 'Inactive')}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
};
