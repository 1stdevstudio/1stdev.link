import React from 'react';
import {
  Link2,
  User,
  Scissors,
  BarChart2,
  Settings,
  Share2,
  Plus,
  AlertTriangle,
} from 'lucide-react';
import { AuthSession } from '../types';

export type TabType = 'profile' | 'links' | 'stats' | 'account';

interface AppShellProps {
  currentTab: TabType;
  onTabChange: (tab: TabType) => void;
  session: AuthSession;
  onOpenShare: () => void;
  onOpenSaveAccount: () => void;
  onOpenAddLink: () => void;
  children: React.ReactNode;
  previewColumn?: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({
  currentTab,
  onTabChange,
  session,
  onOpenShare,
  onOpenSaveAccount,
  onOpenAddLink,
  children,
  previewColumn,
}) => {
  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--tx)]">
      {/* ============================================================== */}
      {/* MOBILE / TABLET TOPBAR (<1024px)                              */}
      {/* ============================================================== */}
      <header className="lg:hidden sticky top-0 z-30 h-14 px-4 bg-[#07080c]/85 backdrop-blur-md flex items-center justify-between">
        <div className="flex items-center gap-2.5 font-bold text-[15px]">
          <span className="w-6 h-6 rounded-[var(--r2)] bg-[var(--ac)] text-[var(--ink)] grid place-items-center">
            <Link2 size={14} strokeWidth={2} />
          </span>
          <span>EdgeLink</span>
        </div>

        <div className="flex items-center gap-2">
          {session.is_guest && (
            <button
              type="button"
              className="btn btn-p btn-sm text-[12px] h-8 px-2.5"
              onClick={onOpenSaveAccount}
            >
              Simpan akun
            </button>
          )}
          <button
            type="button"
            className="iconbtn w-9 h-9"
            onClick={onOpenShare}
            aria-label="Bagikan profil"
          >
            <Share2 size={18} strokeWidth={1.75} />
          </button>
        </div>
      </header>

      {/* ============================================================== */}
      {/* DESKTOP SIDEBAR + MAIN + PREVIEW LAYOUT (>=1024px)              */}
      {/* ============================================================== */}
      <div className="mx-auto max-w-[1400px] flex">
        {/* Desktop Sidebar (240px) */}
        <aside className="hidden lg:flex flex-col w-[240px] h-screen sticky top-0 p-5 shrink-0">
          {/* Logo */}
          <div className="flex items-center gap-2.5 font-bold text-base mb-8">
            <span className="w-7 h-7 rounded-[var(--r2)] bg-[var(--ac)] text-[var(--ink)] grid place-items-center">
              <Link2 size={16} strokeWidth={2} />
            </span>
            <span>EdgeLink</span>
          </div>

          {/* Navigation Items */}
          <nav className="flex flex-col gap-1 grow" aria-label="Navigasi utama">
            <button
              type="button"
              className={`flex items-center gap-3 w-full px-3.5 h-11 rounded-[var(--r2)] text-left font-medium text-[14px] transition ${
                currentTab === 'profile'
                  ? 'bg-[var(--s2)] text-[var(--tx)] font-semibold'
                  : 'text-[var(--tx2)] hover:bg-[var(--s1)] hover:text-[var(--tx)]'
              }`}
              onClick={() => onTabChange('profile')}
            >
              <User size={18} strokeWidth={1.75} />
              <span>Profil</span>
            </button>

            <button
              type="button"
              className={`flex items-center gap-3 w-full px-3.5 h-11 rounded-[var(--r2)] text-left font-medium text-[14px] transition ${
                currentTab === 'links'
                  ? 'bg-[var(--s2)] text-[var(--tx)] font-semibold'
                  : 'text-[var(--tx2)] hover:bg-[var(--s1)] hover:text-[var(--tx)]'
              }`}
              onClick={() => onTabChange('links')}
            >
              <Scissors size={18} strokeWidth={1.75} />
              <span>Link</span>
            </button>

            <button
              type="button"
              className={`flex items-center gap-3 w-full px-3.5 h-11 rounded-[var(--r2)] text-left font-medium text-[14px] transition ${
                currentTab === 'stats'
                  ? 'bg-[var(--s2)] text-[var(--tx)] font-semibold'
                  : 'text-[var(--tx2)] hover:bg-[var(--s1)] hover:text-[var(--tx)]'
              }`}
              onClick={() => onTabChange('stats')}
            >
              <BarChart2 size={18} strokeWidth={1.75} />
              <span>Statistik</span>
            </button>

            <button
              type="button"
              className={`flex items-center gap-3 w-full px-3.5 h-11 rounded-[var(--r2)] text-left font-medium text-[14px] transition ${
                currentTab === 'account'
                  ? 'bg-[var(--s2)] text-[var(--tx)] font-semibold'
                  : 'text-[var(--tx2)] hover:bg-[var(--s1)] hover:text-[var(--tx)]'
              }`}
              onClick={() => onTabChange('account')}
            >
              <Settings size={18} strokeWidth={1.75} />
              <span>Akun</span>
            </button>
          </nav>

          {/* Guest Save Card in Sidebar */}
          {session.is_guest && (
            <div className="card p-3 flex flex-col gap-2 mt-auto">
              <div className="flex items-start gap-2 text-[var(--warn)]">
                <AlertTriangle size={15} strokeWidth={2} className="shrink-0 mt-0.5" />
                <span className="text-[12px] leading-snug">
                  Akun ini hanya tersimpan di browser ini.
                </span>
              </div>
              <button
                type="button"
                className="btn btn-p btn-sm w-full text-[12px] h-8"
                onClick={onOpenSaveAccount}
              >
                Simpan akun
              </button>
            </div>
          )}
        </aside>

        {/* Central Content Area (max 720px) */}
        <main className="grow min-w-0 max-w-[720px] px-4 py-5 sm:px-6 sm:py-8 pb-28 lg:pb-12">
          {children}
        </main>

        {/* Desktop Phone Preview Column (380px, visible on tab 'profile') */}
        {currentTab === 'profile' && previewColumn && (
          <aside className="hidden lg:flex flex-col w-[380px] h-screen sticky top-0 p-6 items-center justify-center shrink-0">
            {previewColumn}
          </aside>
        )}
      </div>

      {/* ============================================================== */}
      {/* MOBILE / TABLET BOTTOM NAV (<1024px)                          */}
      {/* ============================================================== */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-30 h-16 bg-[#07080c]/90 backdrop-blur-md flex items-center justify-around px-2"
        aria-label="Navigasi bawah"
      >
        <button
          type="button"
          className={`flex flex-col items-center justify-center gap-1 w-16 h-12 rounded-[var(--r1)] transition ${
            currentTab === 'profile' ? 'text-[var(--ac)] font-semibold' : 'text-[var(--tx2)]'
          }`}
          onClick={() => onTabChange('profile')}
        >
          <User size={18} strokeWidth={1.75} />
          <span className="text-[11px]">Profil</span>
        </button>

        <button
          type="button"
          className={`flex flex-col items-center justify-center gap-1 w-16 h-12 rounded-[var(--r1)] transition ${
            currentTab === 'links' ? 'text-[var(--ac)] font-semibold' : 'text-[var(--tx2)]'
          }`}
          onClick={() => onTabChange('links')}
        >
          <Scissors size={18} strokeWidth={1.75} />
          <span className="text-[11px]">Link</span>
        </button>

        <button
          type="button"
          className={`flex flex-col items-center justify-center gap-1 w-16 h-12 rounded-[var(--r1)] transition ${
            currentTab === 'stats' ? 'text-[var(--ac)] font-semibold' : 'text-[var(--tx2)]'
          }`}
          onClick={() => onTabChange('stats')}
        >
          <BarChart2 size={18} strokeWidth={1.75} />
          <span className="text-[11px]">Statistik</span>
        </button>

        <button
          type="button"
          className={`flex flex-col items-center justify-center gap-1 w-16 h-12 rounded-[var(--r1)] transition ${
            currentTab === 'account' ? 'text-[var(--ac)] font-semibold' : 'text-[var(--tx2)]'
          }`}
          onClick={() => onTabChange('account')}
        >
          <Settings size={18} strokeWidth={1.75} />
          <span className="text-[11px]">Akun</span>
        </button>
      </nav>

      {/* ============================================================== */}
      {/* MOBILE FAB ("+" button on tab 'links')                         */}
      {/* ============================================================== */}
      {currentTab === 'links' && (
        <button
          type="button"
          className="lg:hidden fixed right-5 bottom-20 z-30 w-14 h-14 rounded-[var(--r3)] bg-[var(--ac)] text-[var(--ink)] shadow-xl grid place-items-center active:scale-95 transition-transform"
          onClick={onOpenAddLink}
          aria-label="Tambah link"
        >
          <Plus size={24} strokeWidth={2} />
        </button>
      )}
    </div>
  );
};
