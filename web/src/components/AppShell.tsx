import React from 'react';
import {
  Home,
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

export type TabType = 'home' | 'profile' | 'links' | 'stats' | 'account';

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

/** Satu sumber untuk sidebar desktop dan nav bawah mobile. */
const NAV: { id: TabType; label: string; icon: React.ElementType }[] = [
  { id: 'home', label: 'Beranda', icon: Home },
  { id: 'profile', label: 'Profil', icon: User },
  { id: 'links', label: 'Link', icon: Scissors },
  { id: 'stats', label: 'Statistik', icon: BarChart2 },
  { id: 'account', label: 'Akun', icon: Settings },
];

const Logo: React.FC<{ size?: 'sm' | 'md' }> = ({ size = 'sm' }) => (
  <div className={`flex items-center gap-2.5 font-bold min-w-0 ${size === 'md' ? 'text-base' : 'text-[15px]'}`}>
    <span
      className={`${size === 'md' ? 'w-7 h-7' : 'w-6 h-6'} rounded-[var(--r2)] bg-[var(--ac)] text-[var(--ink)] grid place-items-center shrink-0`}
    >
      <Link2 size={size === 'md' ? 16 : 14} strokeWidth={2} />
    </span>
    <span className="truncate">EdgeLink</span>
  </div>
);

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
  const showPreview = currentTab === 'profile' && !!previewColumn;

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--tx)]">
      {/* Topbar mobile / tablet (<1024px) */}
      <header className="topbar lg:hidden">
        <Logo />
        <div className="flex items-center gap-1 shrink-0">
          {session.is_guest && (
            <button type="button" className="btn btn-p btn-sm" onClick={onOpenSaveAccount}>
              Simpan akun
            </button>
          )}
          <button type="button" className="iconbtn" onClick={onOpenShare} aria-label="Bagikan profil">
            <Share2 size={18} strokeWidth={1.75} />
          </button>
        </div>
      </header>

      <div className="flex w-full">
        {/* Sidebar desktop (>=1024px) */}
        <aside className="hidden lg:flex flex-col w-[220px] xl:w-[240px] h-screen sticky top-0 p-4 xl:p-5 shrink-0">
          <div className="mb-8 px-1">
            <Logo size="md" />
          </div>

          <nav className="flex flex-col gap-1 grow" aria-label="Navigasi utama">
            {NAV.map(({ id, label, icon: Icon }) => {
              const on = currentTab === id;
              return (
                <button
                  key={id}
                  type="button"
                  aria-current={on ? 'page' : undefined}
                  className={`flex items-center gap-3 w-full px-3.5 h-11 rounded-[var(--r2)] text-left text-[14px] transition ${
                    on
                      ? 'bg-[var(--s2)] text-[var(--tx)] font-semibold'
                      : 'text-[var(--tx2)] font-medium hover:bg-[var(--s1)] hover:text-[var(--tx)]'
                  }`}
                  onClick={() => onTabChange(id)}
                >
                  <Icon size={18} strokeWidth={1.75} />
                  <span>{label}</span>
                </button>
              );
            })}
          </nav>

          {session.is_guest && (
            <div className="card p-3 flex flex-col gap-2 mt-auto">
              <div className="flex items-start gap-2 text-[var(--warn)]">
                <AlertTriangle size={15} strokeWidth={2} className="shrink-0 mt-0.5" />
                <span className="text-[12px] leading-snug">Akun ini hanya tersimpan di browser ini.</span>
              </div>
              <button type="button" className="btn btn-p btn-sm w-full" onClick={onOpenSaveAccount}>
                Simpan akun
              </button>
            </div>
          )}
        </aside>

        {/* Konten utama: selalu mengisi sisa lebar */}
        <main className="main-area grow min-w-0 px-4 pt-5 sm:px-6 sm:pt-8 lg:px-8 xl:px-10">{children}</main>

        {/* Pratinjau HP: hanya di layar lebar agar konten tidak terjepit */}
        {showPreview && (
          <aside className="hidden xl:flex flex-col w-[360px] 2xl:w-[400px] h-screen sticky top-0 p-6 items-center justify-center shrink-0">
            {previewColumn}
          </aside>
        )}
      </div>

      {/* Nav bawah mobile / tablet (<1024px) */}
      <nav className="bottomnav lg:hidden" aria-label="Navigasi bawah">
        <div className="flex items-stretch justify-between w-full max-w-lg mx-auto">
          {NAV.map(({ id, label, icon: Icon }) => {
            const on = currentTab === id;
            return (
              <button
                key={id}
                type="button"
                aria-current={on ? 'page' : undefined}
                className={`flex-1 min-w-0 flex flex-col items-center justify-center gap-1 h-14 rounded-[var(--r2)] transition ${
                  on ? 'text-[var(--ac)] font-semibold' : 'text-[var(--tx2)]'
                }`}
                onClick={() => onTabChange(id)}
              >
                <Icon size={20} strokeWidth={1.75} />
                <span className="text-[11px] leading-none truncate max-w-full px-0.5">{label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* FAB tambah link (tab Link, mobile) */}
      {currentTab === 'links' && (
        <button type="button" className="fab lg:hidden" onClick={onOpenAddLink} aria-label="Tambah link">
          <Plus size={24} strokeWidth={2} />
        </button>
      )}
    </div>
  );
};
