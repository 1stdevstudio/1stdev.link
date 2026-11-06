import React, { useState } from 'react';
import { Link2, Sparkles, Store, ShoppingBag, Scissors, Check, ArrowRight, ArrowUpRight } from 'lucide-react';
import { useI18n } from '../i18n/context';

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

  return (
    <section id="welcome" aria-label={tx('Mulai menggunakan 1stdev.link', 'Get started with 1stdev.link')} className="welcome-screen">
      <div className="welcome-shell">
        <header className="welcome-topbar">
          <a href="/" className="welcome-brand" aria-label="1stdev.link">
            <span className="welcome-brand-mark"><Link2 size={20} strokeWidth={2} /></span>
            <span className="welcome-brand-text">
              <strong>1stdev.link</strong>
              <small>by 1stdev.space</small>
            </span>
          </a>
          <button type="button" className="welcome-top-login" onClick={onOpenLogin}>
            {tx('Masuk', 'Log in')} <ArrowUpRight size={17} strokeWidth={1.8} aria-hidden="true" />
          </button>
        </header>

        <main className="welcome-layout">
          <div className="welcome-story">
            <span className="welcome-eyebrow">
              <span className="welcome-pulse" aria-hidden="true" />
              {tx('SEMUA KEBUTUHAN DIGITAL DALAM SATU LINK', 'YOUR DIGITAL SPACE IN ONE LINK')}
            </span>
            <h1 className="welcome-headline">
              {tx('Satu link untuk', 'One link for')}
              <span>{tx('semua yang penting.', 'everything that matters.')}</span>
            </h1>
            <p className="welcome-lead">
              {tx(
                'Buat halaman yang mencerminkan dirimu atau bisnismu. Kumpulkan karya, produk, dan tautan penting dalam satu tempat yang mudah dibagikan.',
                'Create a page for yourself or your business. Bring your work, products, and important links together in one place that is easy to share.'
              )}
            </p>

            <div className="welcome-highlights">
              <span><Check size={16} aria-hidden="true" /> {tx('Gratis & tanpa iklan', 'Free & ad-free')}</span>
              <span><Check size={16} aria-hidden="true" /> {tx('Siap dalam hitungan menit', 'Ready in minutes')}</span>
            </div>

            <div className="welcome-story-card" aria-hidden="true">
              <div className="welcome-story-card-top">
                <span className="welcome-story-avatar"><Sparkles size={19} strokeWidth={1.9} /></span>
                <div><strong>{tx('Studio Kreatif', 'Creative Studio')}</strong><small>1stdev.link/@studio</small></div>
                <span className="welcome-story-online"><span /> LIVE</span>
              </div>
              <div className="welcome-story-card-links">
                <span><ArrowUpRight size={16} /> {tx('Karya pilihan', 'Featured work')} <ArrowRight size={15} /></span>
                <span><Store size={16} /> {tx('Produk & layanan', 'Products & services')} <ArrowRight size={15} /></span>
                <span><Link2 size={16} /> {tx('Semua tautan', 'All links')} <ArrowRight size={15} /></span>
              </div>
              <p>{tx('Contoh tampilan halaman publik', 'Example public page preview')}</p>
            </div>
          </div>

          <div className="welcome-chooser" aria-labelledby="welcome-chooser-title">
            <div className="welcome-chooser-heading">
              <span className="welcome-step-label">{tx('LANGKAH 01 / 02', 'STEP 01 / 02')}</span>
              <h2 id="welcome-chooser-title">{tx('Kamu ingin membuat apa?', 'What would you like to create?')}</h2>
              <p>{tx('Pilih tujuan utamamu. Semua fitur bisa diubah dan ditambah nanti.', 'Choose your main goal. You can customize everything later.')}</p>
            </div>

            <div className="welcome-choice-list" role="group" aria-label={tx('Pilih tujuan halaman', 'Choose page goal')}>
              {options.map((opt) => {
                const Icon = opt.icon;
                const selected = choice === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    className={'welcome-choice' + (selected ? ' is-selected' : '')}
                    aria-pressed={selected}
                    onClick={() => setChoice(opt.id)}
                  >
                    <span className="welcome-choice-icon"><Icon size={21} strokeWidth={1.8} aria-hidden="true" /></span>
                    <span className="welcome-choice-copy">
                      <strong>{opt.title}</strong>
                      <small>{opt.desc}</small>
                    </span>
                    <span className="welcome-choice-indicator" aria-hidden="true">{selected && <Check size={14} strokeWidth={2.6} />}</span>
                  </button>
                );
              })}

              <button
                type="button"
                className={'welcome-choice welcome-choice-short' + (choice === 'links' ? ' is-selected' : '')}
                aria-pressed={choice === 'links'}
                onClick={() => setChoice('links')}
              >
                <span className="welcome-choice-icon"><Scissors size={20} strokeWidth={1.8} aria-hidden="true" /></span>
                <span className="welcome-choice-copy">
                  <strong>{tx('Pendekkan link saja', 'Shorten links only')}</strong>
                  <small>{tx('URL ringkas dengan statistik klik, tanpa halaman bio.', 'Short URLs with click stats, without a bio page.')}</small>
                </span>
                <span className="welcome-choice-indicator" aria-hidden="true">{choice === 'links' && <Check size={14} strokeWidth={2.6} />}</span>
              </button>
            </div>

            <button type="button" className="welcome-continue" disabled={loading} onClick={handleStart}>
              <span>{loading ? tx('Membuat sesi...', 'Starting session...') : tx('Mulai sekarang — Gratis', 'Get started — Free')}</span>
              <ArrowRight size={19} strokeWidth={2} aria-hidden="true" />
            </button>

            <p className="welcome-returning">
              {tx('Sudah punya halaman?', 'Already have a page?')}{' '}
              <button type="button" onClick={onOpenLogin}>{tx('Masuk ke akun', 'Log in to your account')}</button>
            </p>
            <p className="welcome-legal">
              {tx('Dengan melanjutkan, kamu menyetujui', 'By continuing, you agree to the')}{' '}
              <button type="button" onClick={() => onOpenLegal('terms')}>{tx('Ketentuan Layanan', 'Terms of Service')}</button>
              {' '}{tx('dan', 'and')}{' '}
              <button type="button" onClick={() => onOpenLegal('privacy')}>{tx('Kebijakan Privasi', 'Privacy Policy')}</button>.
            </p>
          </div>
        </main>

        <footer className="welcome-footer">
          <span>© 2026 1stdev.link · by 1stdev.space</span>
          <span>{tx('Buat halamanmu. Bagikan duniamu.', 'Create your page. Share your world.')}</span>
        </footer>
      </div>
    </section>
  );
};
