import React, { useEffect, useRef, useState } from 'react';
import { Home, Link2, User, Scissors, BarChart2, Share2, Plus, LayoutList, X, CircleUser, Save } from 'lucide-react';
import { AuthSession } from '../types';
import { useI18n } from '../i18n/context';

export type TabType = 'home' | 'profile' | 'links' | 'stats' | 'account';

interface AppShellProps {
  currentTab: TabType;
  onTabChange: (tab: TabType) => void;
  session: AuthSession;
  onOpenShare: () => void;
  onOpenSaveAccount: () => void;
  onOpenAddLink: () => void;
  onOpenAddBlock: () => void;
  children: React.ReactNode;
  previewColumn?: React.ReactNode;
}

const Logo: React.FC = () => (
  <div className="flex items-center gap-2.5 font-bold min-w-0">
    <span className="w-8 h-8 rounded-[var(--r2)] bg-[var(--ac)] text-[var(--ink)] grid place-items-center shrink-0">
      <Link2 size={17} strokeWidth={2} />
    </span>
    <span className="min-w-0 flex flex-col leading-tight">
      <span className="truncate text-[15px]">1stdev.link</span>
      <span className="truncate text-[11px] font-normal text-[var(--tx2)]">by 1stdev.space</span>
    </span>
  </div>
);

/** Menu "Buat": satu pintu untuk menambah isi halaman atau link pendek. */
const CreateMenu: React.FC<{ onClose: () => void; onAddBlock: () => void; onAddLink: () => void; className: string }> = ({
  onClose,
  onAddBlock,
  onAddLink,
  className,
}) => {
  const { tx } = useI18n();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onDown);
    ref.current?.querySelector('button')?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onDown);
    };
  }, [onClose]);

  const item = (icon: React.ReactNode, title: string, sub: string, onClick: () => void) => (
    <button
      type="button"
      role="menuitem"
      className="create-item"
      onClick={() => {
        onClose();
        onClick();
      }}
    >
      <span className="create-ic">{icon}</span>
      <span className="min-w-0 text-left">
        <span className="block text-[14px] font-semibold text-[var(--tx)]">{title}</span>
        <span className="block text-[12px] text-[var(--tx2)] leading-snug">{sub}</span>
      </span>
    </button>
  );

  return (
    <div ref={ref} role="menu" className={`create-menu ${className}`}>
      {item(
        <LayoutList size={18} strokeWidth={1.75} />,
        tx('Tambah isi halaman', 'Add to page'),
        tx('Link, WhatsApp, katalog, video, teks', 'Link, WhatsApp, catalog, video, text'),
        onAddBlock
      )}
      {item(
        <Scissors size={18} strokeWidth={1.75} />,
        tx('Pendekkan link', 'Shorten a link'),
        tx('Link pendek dengan analitik klik', 'Short link with click stats'),
        onAddLink
      )}
    </div>
  );
};

export const AppShell: React.FC<AppShellProps> = ({
  currentTab,
  onTabChange,
  session,
  onOpenShare,
  onOpenSaveAccount,
  onOpenAddLink,
  onOpenAddBlock,
  children,
  previewColumn,
}) => {
  const { tx } = useI18n();
  const [createOpen, setCreateOpen] = useState<'top' | 'dock' | null>(null);
  const showPreview = currentTab === 'profile' && !!previewColumn;

  // 4 destinasi utama + nama tab profil diubah menjadi "Halaman"
  const tabs: { id: TabType; label: string; icon: React.ElementType }[] = [
    { id: 'home', label: tx('Beranda', 'Home'), icon: Home },
    { id: 'profile', label: tx('Halaman', 'Page'), icon: User },
    { id: 'links', label: tx('Link', 'Links'), icon: Scissors },
    { id: 'stats', label: tx('Statistik', 'Stats'), icon: BarChart2 },
  ];

  const dockItem = ({ id, label, icon: Icon }: (typeof tabs)[number]) => {
    const on = currentTab === id;
    return (
      <button
        key={id}
        type="button"
        aria-current={on ? 'page' : undefined}
        className={`dock-btn ${on ? 'on' : ''}`}
        onClick={() => onTabChange(id)}
      >
        <Icon size={20} strokeWidth={on ? 2 : 1.75} />
        <span>{label}</span>
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--tx)]">
      <header className="appbar">
        <div className="appbar-in">
          <button
            type="button"
            className="shrink-0 min-h-[44px] rounded-[var(--r2)] text-left"
            onClick={() => onTabChange('home')}
            aria-label="1stdev.link"
          >
            <Logo />
          </button>

          {/* Tab navigasi desktop */}
          <nav className="tabs-top" aria-label={tx('Navigasi utama', 'Main navigation')}>
            {tabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                aria-current={currentTab === id ? 'page' : undefined}
                className={currentTab === id ? 'on' : ''}
                onClick={() => onTabChange(id)}
              >
                <Icon size={16} strokeWidth={1.75} />
                {label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Tombol Buat (desktop) */}
            <div className="relative hidden lg:block">
              <button
                type="button"
                className="btn btn-p btn-sm gap-1.5"
                aria-haspopup="menu"
                aria-expanded={createOpen === 'top'}
                onClick={() => setCreateOpen(createOpen === 'top' ? null : 'top')}
              >
                <Plus size={16} strokeWidth={2} />
                {tx('Buat', 'Create')}
              </button>
              {createOpen === 'top' && (
                <CreateMenu
                  className="create-top"
                  onClose={() => setCreateOpen(null)}
                  onAddBlock={onOpenAddBlock}
                  onAddLink={onOpenAddLink}
                />
              )}
            </div>

            {/* Simpan akun (guest) */}
            {session.is_guest && (
              <button
                type="button"
                className="btn btn-g btn-sm save-account"
                aria-label={tx('Simpan akun', 'Save account')}
                onClick={onOpenSaveAccount}
              >
                <Save className="save-account-icon" size={18} strokeWidth={1.75} />
                <span className="save-account-label">{tx('Simpan akun', 'Save account')}</span>
              </button>
            )}

            {/* Bagikan halaman */}
            <button
              type="button"
              className="iconbtn"
              onClick={onOpenShare}
              aria-label={tx('Bagikan halaman', 'Share page')}
            >
              <Share2 size={18} strokeWidth={1.75} />
            </button>

            {/* Akun pengguna */}
            <button
              type="button"
              className={`iconbtn ${currentTab === 'account' ? 'text-[var(--ac)]' : ''}`}
              aria-current={currentTab === 'account' ? 'page' : undefined}
              onClick={() => onTabChange('account')}
              aria-label={tx('Akun', 'Account')}
            >
              <CircleUser size={20} strokeWidth={1.75} />
            </button>
          </div>
        </div>
      </header>

      <div className={`shell-body ${showPreview ? 'with-preview' : ''}`}>
        <main className="main-area min-w-0">{children}</main>
        {showPreview && <aside className="preview-col">{previewColumn}</aside>}
      </div>

      {/* Dock melayang (mobile / tablet) */}
      <nav className="dock" aria-label={tx('Navigasi bawah', 'Bottom navigation')}>
        {dockItem(tabs[0])}
        {dockItem(tabs[1])}
        <div className="relative">
          <button
            type="button"
            className={`dock-create ${createOpen === 'dock' ? 'open' : ''}`}
            aria-haspopup="menu"
            aria-expanded={createOpen === 'dock'}
            aria-label={tx('Buat', 'Create')}
            onClick={() => setCreateOpen(createOpen === 'dock' ? null : 'dock')}
          >
            {createOpen === 'dock' ? <X size={22} strokeWidth={2.2} /> : <Plus size={24} strokeWidth={2.2} />}
          </button>
          {createOpen === 'dock' && (
            <CreateMenu
              className="create-dock"
              onClose={() => setCreateOpen(null)}
              onAddBlock={onOpenAddBlock}
              onAddLink={onOpenAddLink}
            />
          )}
        </div>
        {dockItem(tabs[2])}
        {dockItem(tabs[3])}
      </nav>
    </div>
  );
};
