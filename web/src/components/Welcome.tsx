import React, { useState } from 'react';
import { Link2, User, Scissors } from 'lucide-react';

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
  const [goal, setGoal] = useState<'profile' | 'links'>('profile');

  return (
    <section
      id="welcome"
      aria-label="Sambutan"
      className="min-h-screen flex items-center justify-center p-6 sm:p-8"
    >
      <div className="w-full max-w-[440px] flex flex-col gap-6">
        {/* Logo */}
        <div className="flex items-center gap-2.5 font-bold text-base text-[var(--tx)]">
          <span className="w-7 h-7 rounded-[var(--r2)] bg-[var(--ac)] text-[var(--ink)] grid place-items-center">
            <Link2 size={16} strokeWidth={2} />
          </span>
          <span className="truncate">EdgeLink <span className="font-normal text-[var(--tx2)]">by 1stnear.com</span></span>
        </div>

        {/* Headline */}
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold leading-tight tracking-tight text-[var(--tx)]">
            Satu link untuk semua yang kamu bagikan.
          </h1>
          <p className="text-[14px] text-[var(--tx2)] leading-relaxed">
            Gratis, tanpa iklan, tanpa daftar. Pilih yang ingin kamu buat dulu, yang lain bisa menyusul.
          </p>
        </div>

        {/* Goal Choices */}
        <div className="flex flex-col gap-3" role="group" aria-label="Pilih tujuan">
          <button
            type="button"
            className={`flex items-start gap-3.5 w-full p-4 rounded-[var(--r3)] text-left transition ${
              goal === 'profile'
                ? 'bg-[rgba(124,140,255,0.12)] shadow-[inset_0_0_0_1.5px_var(--ac)]'
                : 'bg-[var(--s1)] hover:bg-[var(--s2)]'
            }`}
            aria-pressed={goal === 'profile'}
            onClick={() => setGoal('profile')}
          >
            <span className="w-10 h-10 rounded-[var(--r2)] bg-[var(--s2)] grid place-items-center text-[var(--ac)] shrink-0">
              <User size={20} strokeWidth={1.75} />
            </span>
            <span className="flex-1 min-w-0">
              <h3 className="text-[15px] font-semibold text-[var(--tx)]">Halaman profil</h3>
              <p className="text-[13px] text-[var(--tx2)] mt-0.5 leading-snug">
                Satu halaman berisi semua link kamu, untuk bio Instagram, TikTok, atau WhatsApp.
              </p>
            </span>
          </button>

          <button
            type="button"
            className={`flex items-start gap-3.5 w-full p-4 rounded-[var(--r3)] text-left transition ${
              goal === 'links'
                ? 'bg-[rgba(124,140,255,0.12)] shadow-[inset_0_0_0_1.5px_var(--ac)]'
                : 'bg-[var(--s1)] hover:bg-[var(--s2)]'
            }`}
            aria-pressed={goal === 'links'}
            onClick={() => setGoal('links')}
          >
            <span className="w-10 h-10 rounded-[var(--r2)] bg-[var(--s2)] grid place-items-center text-[var(--ac)] shrink-0">
              <Scissors size={20} strokeWidth={1.75} />
            </span>
            <span className="flex-1 min-w-0">
              <h3 className="text-[15px] font-semibold text-[var(--tx)]">Pendekkan link</h3>
              <p className="text-[13px] text-[var(--tx2)] mt-0.5 leading-snug">
                Ubah link panjang jadi pendek dan lihat berapa kali diklik.
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
            {loading ? 'Membuat sesi...' : 'Mulai'}
          </button>
          <button
            type="button"
            className="btn btn-t btn-w"
            onClick={onOpenLogin}
          >
            Sudah punya akun? Masuk
          </button>
        </div>

        {/* Footer legal note */}
        <p className="text-[13px] text-[var(--tx2)] text-center leading-normal">
          Dengan melanjutkan kamu setuju dengan{' '}
          <button
            type="button"
            onClick={() => onOpenLegal('terms')}
            className="text-[var(--tx)] hover:underline inline font-medium cursor-pointer"
          >
            Ketentuan
          </button>{' '}
          dan{' '}
          <button
            type="button"
            onClick={() => onOpenLegal('privacy')}
            className="text-[var(--tx)] hover:underline inline font-medium cursor-pointer"
          >
            Privasi
          </button>
          .
        </p>
      </div>
    </section>
  );
};
