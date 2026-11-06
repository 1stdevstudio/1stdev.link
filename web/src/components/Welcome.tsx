import React, { useState } from 'react';
import { Link2, Sparkles, Store, ShoppingBag, Scissors } from 'lucide-react';
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
    <section
      id="welcome"
      aria-label={tx('Sambutan', 'Welcome')}
      className="min-h-screen flex items-center justify-center p-5 sm:p-8"
    >
      <div className="w-full max-w-[460px] flex flex-col gap-6">
        {/* Brand Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 font-bold text-base text-[var(--tx)] min-w-0">
            <span className="w-8 h-8 rounded-[var(--r2)] bg-[var(--ac)] text-[var(--ink)] grid place-items-center shrink-0">
              <Link2 size={18} strokeWidth={2} />
            </span>
            <span className="truncate">
              1stdev.link <span className="font-normal text-[var(--tx2)]">by 1stdev.space</span>
            </span>
          </div>
        </div>

        {/* Headline & Subtitle */}
        <div className="flex flex-col gap-1.5">
          <h1 className="text-2xl sm:text-[26px] font-bold leading-tight tracking-tight text-[var(--tx)]">
            {tx('Satu halaman untuk semua yang kamu bagikan.', 'One page for everything you share.')}
          </h1>
          <p className="text-[14px] text-[var(--tx2)] leading-relaxed">
            {tx(
              'Gratis, tanpa iklan. Pilih tujuan utama halaman kamu — semua fitur tetap dapat disesuaikan nanti.',
              'Free, no ads. Choose your primary goal — every feature can be customized anytime.'
            )}
          </p>
        </div>

        {/* Purpose Goal Cards (3 primary goals) */}
        <div className="flex flex-col gap-2.5" role="group" aria-label={tx('Pilih tujuan halaman', 'Choose page goal')}>
          {options.map((opt) => {
            const Icon = opt.icon;
            const selected = choice === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                className={`flex items-start gap-3.5 w-full p-4 rounded-[var(--r3)] text-left transition ${
                  selected
                    ? 'bg-[var(--s2)] text-[var(--tx)]'
                    : 'bg-[var(--s1)] hover:bg-[var(--s2)] text-[var(--tx)]'
                }`}
                aria-pressed={selected}
                onClick={() => setChoice(opt.id)}
              >
                <span
                  className={`w-10 h-10 rounded-[var(--r2)] grid place-items-center shrink-0 transition ${
                    selected
                      ? 'bg-[var(--ac)] text-[var(--ink)]'
                      : 'bg-[var(--s2)] text-[var(--tx2)]'
                  }`}
                >
                  <Icon size={20} strokeWidth={1.75} />
                </span>
                <span className="flex-1 min-w-0">
                  <h2 className="text-[15px] font-semibold text-[var(--tx)]">{opt.title}</h2>
                  <p className="text-[13px] text-[var(--tx2)] mt-0.5 leading-snug">
                    {opt.desc}
                  </p>
                </span>
              </button>
            );
          })}

          {/* Small Shortlink Option */}
          <button
            type="button"
            className={`flex items-center gap-3 w-full p-3 px-4 rounded-[var(--r2)] text-left transition mt-1 ${
              choice === 'links'
                ? 'bg-[var(--s2)] text-[var(--tx)]'
                : 'bg-[var(--s1)]/60 hover:bg-[var(--s1)] text-[var(--tx2)]'
            }`}
            aria-pressed={choice === 'links'}
            onClick={() => setChoice('links')}
          >
            <span
              className={`w-8 h-8 rounded-[var(--r1)] grid place-items-center shrink-0 ${
                choice === 'links'
                  ? 'bg-[var(--ac)] text-[var(--ink)]'
                  : 'bg-[var(--s2)] text-[var(--tx3)]'
              }`}
            >
              <Scissors size={16} strokeWidth={1.75} />
            </span>
            <span className="flex-1 min-w-0">
              <span className="text-[13px] font-medium text-[var(--tx)] block">
                {tx('Pendekkan link saja', 'Shorten links only')}
              </span>
              <span className="text-[12px] text-[var(--tx3)] block truncate">
                {tx('URL ringkas dengan analitik klik tanpa halaman bio', 'Quick short URLs with click analytics without bio')}
              </span>
            </span>
          </button>
        </div>

        {/* CTA Actions */}
        <div className="flex flex-col gap-2 pt-1">
          <button
            type="button"
            disabled={loading}
            className="btn btn-p btn-w disabled:opacity-50 text-[15px]"
            onClick={handleStart}
          >
            {loading ? tx('Membuat sesi...', 'Starting session...') : tx('Mulai sekarang', 'Get started')}
          </button>
          <button
            type="button"
            className="btn btn-t btn-w"
            onClick={onOpenLogin}
          >
            {tx('Sudah punya akun? Masuk', 'Already have an account? Log in')}
          </button>
        </div>

        {/* Legal Footer */}
        <p className="text-[12px] text-[var(--tx3)] text-center leading-normal">
          {tx('Dengan melanjutkan kamu menyetujui', 'By continuing you agree to the')}{' '}
          <button
            type="button"
            onClick={() => onOpenLegal('terms')}
            className="text-[var(--tx2)] hover:underline inline font-medium cursor-pointer"
          >
            {tx('Ketentuan Layanan', 'Terms of Service')}
          </button>{' '}
          {tx('dan', 'and')}{' '}
          <button
            type="button"
            onClick={() => onOpenLegal('privacy')}
            className="text-[var(--tx2)] hover:underline inline font-medium cursor-pointer"
          >
            {tx('Kebijakan Privasi', 'Privacy Policy')}
          </button>
          .
        </p>
      </div>
    </section>
  );
};
