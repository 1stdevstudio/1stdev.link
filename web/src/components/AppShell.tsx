import React, { useEffect, useRef, useState } from 'react';
import { Scissors, Share2, Plus, LayoutList, Save, CheckCircle2, AlertCircle, LoaderCircle, ChevronRight } from 'lucide-react';
import { WORKSPACE_NAV } from './navigation/workspaceNav';
import { WorkspaceNavButton } from './navigation/WorkspaceNavButton';
import { StudioSidebar } from './navigation/StudioSidebar';
import { BrandMark } from './brand/BrandMark';
import type { TabType } from './navigation/workspaceNav';
import { AuthSession } from '../types';
import { useI18n } from '../i18n/context';

export type { TabType } from './navigation/workspaceNav';

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
  saveStatus?: 'idle' | 'saving' | 'saved' | 'error';
  onRetrySave?: () => void;
}

const Logo: React.FC = () => (
  <div className="flex items-center gap-2.5 font-bold min-w-0">
    <span className="w-[37px] h-[37px] grid place-items-center shrink-0">
      <BrandMark size={37} />
    </span>
    <span className="min-w-0 flex flex-col leading-tight">
      <span className="truncate text-[15px]">1stdev<span className="text-[var(--ac)]">.</span>link</span>
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
  saveStatus = 'idle',
  onRetrySave,
}) => {
  const { tx } = useI18n();
  const [createOpen, setCreateOpen] = useState(false);
  const showPreview = currentTab === 'profile' && !!previewColumn;
  const activeNav = WORKSPACE_NAV.find((item) => item.id === currentTab);
  const navigate = (tab: TabType) => {
    setCreateOpen(false);
    onTabChange(tab);
  };

  return (
    <div className="panel3 min-h-screen bg-[var(--bg)] text-[var(--tx)]">
      <header className="appbar panel3-appbar">
        <div className="appbar-in panel3-topbar">
          <button
            type="button"
            className="shrink-0 min-h-[44px] rounded-[var(--r2)] text-left"
            onClick={() => navigate('home')}
            aria-label="1stdev.link"
          >
            <Logo />
          </button>

          <div className="workspace-current panel3-page-crumb" aria-live="polite">
            <span className="panel3-crumb-overline">{tx('WORKSPACE', 'WORKSPACE')} <ChevronRight size={12} aria-hidden="true" /> {tx('PANEL KONTROL', 'CONTROL PANEL')}</span>
            <strong>{activeNav ? tx(activeNav.labelId, activeNav.labelEn) : tx('Beranda', 'Home')}</strong>
          </div>

          <div className="panel3-top-actions flex items-center gap-2 shrink-0">
            {saveStatus !== 'idle' && (
              <div role="status" aria-live="polite" className={'panel3-save-status is-' + saveStatus}>
                {saveStatus === 'saving' && <><LoaderCircle size={15} className="panel3-saving-spinner" aria-hidden="true"/><span>{tx('Menyimpan…', 'Saving…')}</span></>}
                {saveStatus === 'saved' && <><CheckCircle2 size={15} aria-hidden="true"/><span>{tx('Tersimpan', 'Saved')}</span></>}
                {saveStatus === 'error' && <button type="button" onClick={onRetrySave} aria-label={tx('Gagal menyimpan, coba lagi', 'Save failed, retry')}><AlertCircle size={15} aria-hidden="true"/><span>{tx('Ulangi simpan', 'Retry save')}</span></button>}
              </div>
            )}
            {/* Tombol Buat (desktop) */}
            <div className="relative panel3-create-wrap">
              <button
                type="button"
                className="btn btn-p btn-sm gap-1.5"
                aria-haspopup="menu"
                aria-expanded={createOpen}
                onClick={() => setCreateOpen(!createOpen)}
              >
                <Plus size={16} strokeWidth={2} />
                {tx('Buat', 'Create')}
              </button>
              {createOpen && (
                <CreateMenu
                  className="create-top"
                  onClose={() => setCreateOpen(false)}
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

          </div>
        </div>
      </header>

      <div className="workspace-frame panel3-frame">
        <StudioSidebar
          session={session}
          currentTab={currentTab}
          onTabChange={navigate}
          onOpenSaveAccount={onOpenSaveAccount}
          onOpenShare={onOpenShare}
        />
        <div className={`shell-body ${showPreview ? 'with-preview' : ''}`}>
          <main className="main-area min-w-0">{children}</main>
          {showPreview && (
            <aside className="preview-col panel3-preview" aria-label={tx('Pratinjau halaman publik', 'Public page preview')}>
              <div className="panel3-preview-heading">
                <span className="panel3-preview-live"><i aria-hidden="true" /> {tx('PRATINJAU LANGSUNG', 'LIVE PREVIEW')}</span>
                <span className="panel3-preview-device">{tx('Tampilan seluler', 'Mobile view')}</span>
              </div>
              {previewColumn}
            </aside>
          )}
        </div>
      </div>

      {/* Exactly the same five destinations on mobile and desktop. */}
      <nav className="dock panel3-dock" aria-label={tx('Navigasi utama', 'Main navigation')}>
        {WORKSPACE_NAV.map((item) => (
          <WorkspaceNavButton
            key={item.id}
            item={item}
            currentTab={currentTab}
            onTabChange={navigate}
            placement="dock"
          />
        ))}
      </nav>
    </div>
  );
};
