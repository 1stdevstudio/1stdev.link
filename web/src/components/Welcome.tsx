import React, { useState } from 'react';
import { Link2, User, Scissors } from 'lucide-react';
import { useI18n } from '../i18n/context';

interface WelcomeProps {
  onStart: (goal: 'profile' | 'links') => void;
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
  const [goal, setGoal] = useState<'profile' | 'links'>('profile');

  return (
    <section
      id="welcome"
      aria-label={tx('Sambutan', 'Welcome')}
      className="min-h-screen flex items-center justify-center p-6 sm:p-8"
    >
      <div className="w-full max-w-[440px] flex flex-col gap-6">
        {/* Logo */}
        <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 font-bold text-base text-[var(--tx)] min-w-0">
          <span className="w-7 h-7 rounded-[var(--r2)] bg-[var(--ac)] text-[var(--ink)] grid place-items-center">
            <Link2 size={16} strokeWidth={2} />
          </span>
          <span className="truncate">EdgeLink <span className="font-normal text-[var(--tx2)]">by 1stnear.com</span></span>
        </div>
        </div>

        {/* Headline */}
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold leading-tight tracking-tight text-[var(--tx)]">
            {tx('Satu link untuk semua yang kamu bagikan.', 'One link for everything you share.')}
          </h1>
          <p className="text-[14px] text-[var(--tx2)] leading-relaxed">
            {tx('Gratis, tanpa iklan, tanpa daftar. Pilih yang ingin kamu buat dulu, yang lain bisa menyusul.', 'Free, no ads, no sign-up. Pick what to build first, the rest can come later.')}
          </p>
        </div>

        {/* Goal Choices */}
        <div className="flex flex-col gap-3" role="group" aria-label={tx('Pilih tujuan', 'Choose a goal')}>
          <button
            type="button"
            className={`flex items-start gap-3.5 w-full p-4 rounded-[var(--r3)] text-left transition ${
              goal === 'profile'
                ? 'bg-[rgba(233,190,84,0.12)] shadow-[inset_0_0_0_1.5px_var(--ac)]'
                : 'bg-[var(--s1)] hover:bg-[var(--s2)]'
            }`}
            aria-pressed={goal === 'profile'}
            onClick={() => setGoal('profile')}
          >
            <span className="w-10 h-10 rounded-[var(--r2)] bg-[var(--s2)] grid place-items-center text-[var(--ac)] shrink-0">
              <User size={20} strokeWidth={1.75} />
            </span>
            <span className="flex-1 min-w-0">
              <h3 className="text-[15px] font-semibold text-[var(--tx)]">{tx('Halaman profil', 'Profile page')}</h3>
              <p className="text-[13px] text-[var(--tx2)] mt-0.5 leading-snug">
                {tx('Satu halaman berisi semua link kamu, untuk bio Instagram, TikTok, atau WhatsApp.', 'One page with all your links, for your Instagram, TikTok, or WhatsApp bio.')}
              </p>
            </span>
          </button>

          <button
            type="button"
            className={`flex items-start gap-3.5 w-full p-4 rounded-[var(--r3)] text-left transition ${
              goal === 'links'
                ? 'bg-[rgba(233,190,84,0.12)] shadow-[inset_0_0_0_1.5px_var(--ac)]'
                : 'bg-[var(--s1)] hover:bg-[var(--s2)]'
            }`}
            aria-pressed={goal === 'links'}
            onClick={() => setGoal('links')}
          >
            <span className="w-10 h-10 rounded-[var(--r2)] bg-[var(--s2)] grid place-items-center text-[var(--ac)] shrink-0">
              <Scissors size={20} strokeWidth={1.75} />
            </span>
            <span className="flex-1 min-w-0">
              <h3 className="text-[15px] font-semibold text-[var(--tx)]">{tx('Pendekkan link', 'Shorten links')}</h3>
              <p className="text-[13px] text-[var(--tx2)] mt-0.5 leading-snug">
                {tx('Ubah link panjang jadi pendek dan lihat berapa kali diklik.', 'Turn long links into short ones and see how often they are clicked.')}
              </p>
            </span>
          </button>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-1.5 pt-1">
          <button
            type="button"
            disabled={loading}
            className="btn btn-p btn-w disabled:opacity-50"
            onClick={() => onStart(goal)}
          >
            {loading ? tx('Membuat sesi...', 'Starting session...') : tx('Mulai', 'Get started')}
          </button>
          <button
            type="button"
            className="btn btn-t btn-w"
            onClick={onOpenLogin}
          >
            {tx('Sudah punya akun? Masuk', 'Already have an account? Log in')}
          </button>
        </div>

        {/* Footer legal note */}
        <p className="text-[13px] text-[var(--tx2)] text-center leading-normal">
          {tx('Dengan melanjutkan kamu setuju dengan', 'By continuing you agree to the')}{' '}
          <button
            type="button"
            onClick={() => onOpenLegal('terms')}
            className="text-[var(--tx)] hover:underline inline font-medium cursor-pointer"
          >
            {tx('Ketentuan', 'Terms')}
          </button>{' '}
          {tx('dan', 'and')}{' '}
          <button
            type="button"
            onClick={() => onOpenLegal('privacy')}
            className="text-[var(--tx)] hover:underline inline font-medium cursor-pointer"
          >
            {tx('Privasi', 'Privacy')}
          </button>
          .
        </p>
      </div>
    </section>
  );
};
