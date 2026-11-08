import React, { useState } from 'react';
import { Link2, Sparkles, Store, ShoppingBag, Scissors, Check, ArrowRight, ArrowUpRight, BarChart3, Globe2, Layers3 } from 'lucide-react';
import { useI18n } from '../i18n/context';
import { SiteHeader } from './navigation/SiteHeader';

type WelcomeChoice = 'creator' | 'business' | 'affiliate' | 'links';

interface WelcomeProps {
  onStart: (goal: 'profile' | 'links', purpose?: 'creator' | 'business' | 'affiliate') => void;
  onOpenLogin: () => void;
  onOpenLegal: (tab: 'terms' | 'privacy') => void;
  loading?: boolean;
}

export const Welcome: React.FC<WelcomeProps> = ({
  onStart,
  onOpenLogin,
  onOpenLegal,
  loading = false,
}) => {
  const { tx } = useI18n();
  const [choice, setChoice] = useState<WelcomeChoice>('creator');

  const handleStart = () => {
    if (choice === 'links') {
      onStart('links');
    } else {
      onStart('profile', choice);
    }
  };

  const options: {
    id: WelcomeChoice;
    title: string;
    desc: string;
    icon: React.ElementType;
  }[] = [
    {
      id: 'creator',
      title: tx('Kreator', 'Creator'),
      desc: tx(
        'Halaman karya, portofolio, media sosial, dan tautan kerja sama.',
        'Showcase your work, portfolio, socials, and collaboration links.'
      ),
      icon: Sparkles,
    },
    {
      id: 'business',
      title: tx('Usaha / UMKM', 'Business / UMKM'),
      desc: tx(
        'Katalog produk atau layanan, kontak WhatsApp, jam operasional, dan lokasi.',
        'Product or service catalog, WhatsApp contact, hours, and location.'
      ),
      icon: Store,
    },
    {
      id: 'affiliate',
      title: tx('Afiliasi & Rekomendasi', 'Affiliate & Recommendations'),
      desc: tx(
        'Katalog kurasi produk rekomendasi dengan tautan belanja dan ulasan.',
        'Curated product recommendations with direct shop links and reviews.'
      ),
      icon: ShoppingBag,
    },
  ];

  const selectedTitle = choice === 'links'
    ? tx('Link pendek', 'Short links')
    : options.find((option) => option.id === choice)?.title || options[0].title;

  return (
    <section
      id="welcome"
      className="welcome-screen start-screen"
      aria-label={tx('Mulai menggunakan 1stdev.link', 'Get started with 1stdev.link')}
    >
      <div className="welcome-shell start-shell">
        <SiteHeader onOpenLogin={onOpenLogin} />

        <main className="start-main">
          <section className="start-hero" aria-labelledby="start-title">
            <div className="start-hero-copy">
              <p className="start-kicker"><span className="start-kicker-dot" aria-hidden="true" /> {tx('RUANG DIGITAL UNTUK IDE BESAR', 'ONE SPACE FOR BIG IDEAS')}</p>
              <h1 id="start-title" className="start-title">
                {tx('Bukan sekadar', 'More than just')}
                <span>{tx('satu link.', 'one link.')}</span>
              </h1>
              <p className="start-description">
                {tx('Tampilkan karya, jual produk, bagikan rekomendasi, atau buat tautan pendek. Semua dalam satu halaman yang mudah dikelola dan siap dibagikan.', 'Show your work, sell products, share recommendations, or shorten URLs. Everything in one easy-to-manage page, ready to share.')}
              </p>
              <div className="start-hero-actions">
                <a className="start-primary-action" href="#start-goals">
                  {tx('Buat halaman gratis', 'Create your free page')}
                  <ArrowUpRight size={19} strokeWidth={2} aria-hidden="true"/>
                </a>
                <a className="start-text-action" href="#start-highlights">
                  {tx('Lihat keunggulan', 'Explore the benefits')} <ArrowRight size={16} aria-hidden="true"/>
                </a>
              </div>
              <div className="start-assurance" aria-label={tx('Keunggulan layanan', 'Service benefits')}>
                <span><Check size={15} aria-hidden="true"/> {tx('100% gratis', '100% free')}</span>
                <span><Check size={15} aria-hidden="true"/> {tx('Tanpa iklan', 'Ad-free')}</span>
                <span><Check size={15} aria-hidden="true"/> {tx('Mulai tanpa daftar', 'Start without signing up')}</span>
              </div>
            </div>

            <div className="start-visual" aria-label={tx('Contoh halaman publik yang bisa dibuat', 'Example of a public page you can create')}>
              <div className="start-orbit start-orbit-one" aria-hidden="true"/>
              <div className="start-orbit start-orbit-two" aria-hidden="true"/>
              <div className="start-browser" aria-hidden="true">
                <div className="start-browser-bar">
                  <span className="start-browser-dots"><i/><i/><i/></span>
                  <span className="start-browser-url"><Globe2 size={12} /> 1stdev.link/@studio</span>
                  <span className="start-browser-menu">•••</span>
                </div>
                <div className="start-profile-mock">
                  <div className="start-profile-cover">
                    <div className="start-cover-shape start-shape-one"/>
                    <div className="start-cover-shape start-shape-two"/>
                    <span className="start-cover-label">{tx('KARYA • PRODUK • CERITA', 'WORK • PRODUCTS • STORIES')}</span>
                  </div>
                  <div className="start-profile-body">
                    <div className="start-avatar">S<span>✳</span></div>
                    <div className="start-profile-heading">
                      <strong>{tx('Studio Kreatif', 'Creative Studio')}</strong>
                      <span>@studio · <span className="start-profile-availability">{tx('Tersedia untuk kolaborasi', 'Open for collaborations')}</span></span>
                    </div>
                    <p>{tx('Satu tempat untuk ide, karya, dan hal-hal yang kami suka.', 'A home for ideas, work, and everything we love.')}</p>
                    <div className="start-profile-links">
                      <span><Layers3 size={17} /> {tx('Lihat portofolio', 'View portfolio')} <ArrowUpRight size={17}/></span>
                      <span><Store size={17} /> {tx('Produk & layanan', 'Products & services')} <ArrowUpRight size={17}/></span>
                      <span><Link2 size={17} /> {tx('Semua tautan penting', 'All important links')} <ArrowUpRight size={17}/></span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="start-preview-badge"><span className="start-preview-badge-icon"><BarChart3 size={18}/></span><span><strong>{tx('Siap dibagikan', 'Ready to share')}</strong><small>{tx('Kreasikan halamanmu sendiri', 'Make your page your own')}</small></span></div>
              <span className="start-preview-caption">{tx('ILUSTRASI HALAMAN • BUKAN DATA PENGGUNA', 'PAGE ILLUSTRATION • NOT USER DATA')}</span>
            </div>
          </section>

          <section className="start-highlights" id="start-highlights" aria-label={tx('Keunggulan platform', 'Platform benefits')}>
            <div className="start-highlight"><span className="start-highlight-icon"><Layers3 size={20} strokeWidth={1.8}/></span><span><strong>{tx('Semua jadi satu', 'Everything together')}</strong><small>{tx('Konten, produk, dan link', 'Content, products and links')}</small></span></div>
            <div className="start-highlight"><span className="start-highlight-icon"><Sparkles size={20} strokeWidth={1.8}/></span><span><strong>{tx('Tampilan fleksibel', 'Make it yours')}</strong><small>{tx('Sesuaikan dengan identitasmu', 'Match your identity')}</small></span></div>
            <div className="start-highlight"><span className="start-highlight-icon"><BarChart3 size={20} strokeWidth={1.8}/></span><span><strong>{tx('Pantau performa', 'Track performance')}</strong><small>{tx('Lihat statistik klik link', 'Understand your link clicks')}</small></span></div>
          </section>

          <section className="welcome-chooser start-chooser" id="start-goals" aria-labelledby="welcome-chooser-title">
            <div className="start-chooser-head">
              <div className="start-chooser-intro">
                <p className="start-step-label">{tx('MULAI DARI SINI / 01', 'START HERE / 01')}</p>
                <h2 id="welcome-chooser-title">{tx('Kamu ingin membuat apa?', 'What would you like to create?')}</h2>
              </div>
              <p>{tx('Pilih sesuai kebutuhanmu. Kamu selalu bisa menambahkan fitur lain nanti.', 'Choose what fits your needs. You can always add more features later.')}</p>
            </div>

            <div className="welcome-choice-list start-choice-grid" role="group" aria-label={tx('Pilih tujuan halaman', 'Choose page goal')}>
              {options.map((opt, index) => {
                const Icon = opt.icon;
                const selected = choice === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    className={'welcome-choice start-choice' + (selected ? ' is-selected' : '')}
                    aria-pressed={selected}
                    onClick={() => setChoice(opt.id)}
                  >
                    <span className="start-choice-top">
                      <span className="start-choice-icon"><Icon size={22} strokeWidth={1.8} aria-hidden="true"/></span>
                      <span className="start-choice-indicator" aria-hidden="true">{selected ? <Check size={16} strokeWidth={2.6}/> : String(index + 1).padStart(2, '0')}</span>
                    </span>
                    <span className="start-choice-copy"><strong>{opt.title}</strong><small>{opt.desc}</small></span>
                    <span className="start-choice-bottom">{tx('Buat halaman', 'Create page')} <ArrowUpRight size={16} aria-hidden="true"/></span>
                  </button>
                );
              })}
              <button
                type="button"
                className={'welcome-choice start-choice' + (choice === 'links' ? ' is-selected' : '')}
                aria-pressed={choice === 'links'}
                onClick={() => setChoice('links')}
              >
                <span className="start-choice-top">
                  <span className="start-choice-icon"><Scissors size={22} strokeWidth={1.8} aria-hidden="true"/></span>
                  <span className="start-choice-indicator" aria-hidden="true">{choice === 'links' ? <Check size={16} strokeWidth={2.6}/> : '04'}</span>
                </span>
                <span className="start-choice-copy"><strong>{tx('Pendekkan link saja', 'Shorten links only')}</strong><small>{tx('URL singkat dengan statistik klik, tanpa membuat halaman bio.', 'Short URLs and click stats, without creating a bio page.')}</small></span>
                <span className="start-choice-bottom">{tx('Buat link pendek', 'Shorten a URL')} <ArrowUpRight size={16} aria-hidden="true"/></span>
              </button>
            </div>

            <div className="start-chooser-bottom">
              <div className="start-selected-text">
                <span className="start-selected-dot" aria-hidden="true"/>
                <span>{tx('Pilihanmu:', 'Selected:')} <strong>{selectedTitle}</strong></span>
              </div>
              <button className="start-continue" type="button" disabled={loading} onClick={handleStart}>
                <span>{loading ? tx('Membuat sesi...', 'Starting session...') : tx('Mulai sekarang — Gratis', 'Get started — Free')}</span><ArrowRight size={19} strokeWidth={2} aria-hidden="true"/>
              </button>
            </div>
          </section>

          {/* Product education is visible to visitors and rendered by React, matching the HTML fallback. */}
          <section className="start-seo-guide" id="panduan" aria-labelledby="start-seo-guide-title">
            <div className="start-seo-intro">
              <p className="start-step-label">{tx('KENALI FITURNYA / 02', 'EXPLORE THE TOOLS / 02')}</p>
              <h2 id="start-seo-guide-title">
                {tx('Satu halaman untuk berkarya dan menjalankan usaha.', 'One page for your work and business.')}
              </h2>
              <p>
                {tx(
                  '1stdev.link membantu kreator, penjual, dan UMKM membagikan tautan, katalog, dan informasi usaha dari satu alamat. Mulai gratis tanpa kartu kredit atau proses pendaftaran panjang.',
                  '1stdev.link helps creators and small businesses share links, catalogs, and business details from one address. Start for free without a credit card or lengthy sign-up.'
                )}
              </p>
            </div>
            <div className="start-seo-grid">
              <article>
                <h3>{tx('Link bio gratis untuk Instagram dan TikTok', 'Free link in bio for Instagram and TikTok')}</h3>
                <p>{tx(
                  'Buat profil publik untuk mengumpulkan portofolio, tautan toko, video, media sosial, dan kontak WhatsApp. Bagikan satu alamat 1stdev.link/@nama di bio atau kartu nama agar orang mudah menemukan semuanya.',
                  'Create a public profile for your portfolio, shop links, videos, social accounts, and WhatsApp contact. Share one 1stdev.link/@name address in your bio or business card.'
                )}</p>
              </article>
              <article>
                <h3>{tx('Link pendek gratis dengan statistik klik', 'Free short links with click statistics')}</h3>
                <p>{tx(
                  'Ringkas URL panjang menjadi tautan yang mudah dibagikan. Lihat jumlah klik menurut hari dan negara melalui dashboard, tanpa perlu membuat halaman profil terlebih dahulu.',
                  'Turn long URLs into easy-to-share short links. See daily and country-level aggregate clicks in the dashboard, even without creating a profile first.'
                )}</p>
              </article>
              <article>
                <h3>{tx('Katalog online sederhana untuk UMKM', 'A simple online catalog for small businesses')}</h3>
                <p>{tx(
                  'Tampilkan produk atau jasa, informasi harga, jam buka, lokasi, dan kontak dalam Mode Usaha. Pengunjung bisa melihat penawaran dan melanjutkan percakapan lewat WhatsApp, tanpa memasang toko online yang rumit.',
                  'Show products or services, pricing, business hours, location, and contact details in Business Mode. Visitors can explore and contact you through WhatsApp without a complex storefront.'
                )}</p>
              </article>
              <article>
                <h3>{tx('QR Code dan halaman siap dibagikan', 'QR codes and shareable pages')}</h3>
                <p>{tx(
                  'Buat QR Code untuk mengarahkan pelanggan ke profil atau tautan penting. Sesuaikan tampilannya, lalu gunakan di kemasan, poster, meja usaha, atau materi promosi.',
                  'Create QR codes that direct customers to your profile or important links. Customize the design and use it on packaging, posters, counters, or promotional material.'
                )}</p>
              </article>
            </div>
            <div className="start-seo-links" aria-label={tx('Informasi tambahan', 'More information')}>
              <a href="/docs">{tx('Dokumentasi API', 'API documentation')}</a>
              <a href="/privacy">{tx('Kebijakan Privasi', 'Privacy Policy')}</a>
              <a href="/terms">{tx('Ketentuan Layanan', 'Terms of Service')}</a>
            </div>
          </section>

          <div className="start-returning">
            {tx('Sudah punya halaman?', 'Already have a page?')}{' '}
            <button type="button" onClick={onOpenLogin}>{tx('Masuk ke akun', 'Log in to your account')} <ArrowUpRight size={15} aria-hidden="true"/></button>
          </div>
        </main>

        <footer className="start-footer">
          <span>© 2026 1stdev.link · by 1stdev.space</span>
          <span>{tx('Penggunaan layanan mengikuti', 'Use of the service is subject to the')}{' '}
            <button type="button" onClick={() => onOpenLegal('terms')}>{tx('Ketentuan Layanan', 'Terms of Service')}</button>
            {' '}{tx('dan pelajari penggunaan data di', 'and you can learn about data use in')}{' '}
            <button type="button" onClick={() => onOpenLegal('privacy')}>{tx('Kebijakan Privasi', 'Privacy Policy')}</button>.
          </span>
        </footer>
      </div>
    </section>
  );
};
