import React from 'react';
import { ArrowRight, ArrowUpRight, Send, Save, Sparkles, Settings2 } from 'lucide-react';
import type { AuthSession } from '../../types';
import { useI18n } from '../../i18n/context';
import { WORKSPACE_NAV, type TabType } from './workspaceNav';
import { WorkspaceNavButton } from './WorkspaceNavButton';
import { BrandMark } from '../brand/BrandMark';

interface StudioSidebarProps {
  session: AuthSession;
  currentTab: TabType;
  onTabChange: (tab: TabType) => void;
  onOpenSaveAccount: () => void;
  onOpenShare: () => void;
}

/** Desktop-only navigation shell. The menu data and active state are shared with mobile. */
export const StudioSidebar: React.FC<StudioSidebarProps> = ({
  session,
  currentTab,
  onTabChange,
  onOpenSaveAccount,
  onOpenShare,
}) => {
  const { tx } = useI18n();
  const displayName = session.display_name?.trim() || session.handle?.trim() || tx('Workspace tamu', 'Guest workspace');
  const initial = displayName[0]?.toLocaleUpperCase() || '1';

  return (
    <aside className="workspace-sidebar panel3-sidebar sidebar4" aria-label={tx('Navigasi workspace', 'Workspace navigation')}>
      <div className="sidebar4-brand">
        <span className="sidebar4-orbit sidebar4-orbit-first" aria-hidden="true" />
        <span className="sidebar4-orbit sidebar4-orbit-second" aria-hidden="true" />
        <div className="sidebar4-brand-top">
          <span className="sidebar4-brand-mark"><BrandMark size={29} /></span>
          <span className="sidebar4-brand-eyebrow">{tx('RUANG KREATIF', 'CREATIVE SPACE')}</span>
          <Sparkles size={15} className="sidebar4-brand-sparkle" aria-hidden="true" />
        </div>
        <strong>{tx('Semua dalam satu tempat.', 'All in one place.')}</strong>
        <p>{tx('Kelola halaman, link, dan performamu.', 'Manage your pages, links, and insights.')}</p>
      </div>

      <nav className="workspace-nav sidebar4-nav" aria-label={tx('Menu utama', 'Main menu')}>
        <div className="sidebar4-nav-heading">
          <span>{tx('MENU UTAMA', 'MAIN MENU')}</span>
          <span className="sidebar4-menu-count" aria-label={tx('Empat menu', 'Four menu items')}>04</span>
        </div>
        <div className="sidebar4-nav-links">
          {WORKSPACE_NAV.map((item) => (
            <WorkspaceNavButton
              key={item.id}
              item={item}
              currentTab={currentTab}
              onTabChange={onTabChange}
              placement="sidebar"
            />
          ))}
        </div>
      </nav>

      <section className="sidebar4-shortcuts" aria-label={tx('Pintasan dan akun', 'Shortcuts and account')}>
        <div className="sidebar4-tools-heading">{tx('PINTASAN', 'SHORTCUTS')}</div>
        <nav className="sidebar4-shortcuts-list" aria-label={tx('Aksi cepat', 'Quick actions')}>
          <button type="button" className="sidebar4-share" onClick={onOpenShare}>
            <span className="sidebar4-share-icon"><Send size={19} strokeWidth={1.9} aria-hidden="true" /></span>
            <span className="sidebar4-share-copy">
              <strong>{tx('Bagikan halaman', 'Share your page')}</strong>
              <small>{tx('Kirim tautan profilmu', 'Send your profile link')}</small>
            </span>
            <ArrowUpRight className="sidebar4-share-arrow" size={18} aria-hidden="true" />
          </button>
          <button
            type="button"
            data-nav-id="account"
            className="sidebar4-settings"
            aria-current={currentTab === 'account' ? 'page' : undefined}
            onClick={() => onTabChange('account')}
          >
            <span className="sidebar4-share-icon"><Settings2 size={19} strokeWidth={1.9} aria-hidden="true" /></span>
            <span className="sidebar4-share-copy">
              <strong>{tx('Pengaturan', 'Settings')}</strong>
              <small>{tx('Akun, privasi, dan keamanan', 'Account, privacy, and security')}</small>
            </span>
            <ArrowRight className="sidebar4-share-arrow" size={18} aria-hidden="true" />
          </button>
          <button
            type="button"
            className="sidebar4-account-entry"
            onClick={session.is_guest ? onOpenSaveAccount : () => onTabChange('account')}
            aria-label={session.is_guest ? tx('Simpan akun', 'Save account') : tx('Kelola akun', 'Manage account')}
          >
            <span className="sidebar4-account-avatar" aria-hidden="true">{initial}</span>
            <span className="sidebar4-account-copy">
              <strong title={displayName}>{displayName}</strong>
              <small>{session.is_guest ? tx('Sesi sementara · Simpan akun', 'Temporary session · Save account') : tx('Akun tersimpan · Kelola akun', 'Saved account · Manage account')}</small>
            </span>
            <span className={'sidebar4-account-indicator' + (session.is_guest ? ' is-guest' : '')} title={session.is_guest ? tx('Sesi tamu', 'Guest session') : tx('Akun tersimpan', 'Saved account')} aria-hidden="true" />
            {session.is_guest ? <Save size={17} className="sidebar4-account-next" aria-hidden="true" /> : <ArrowRight size={17} className="sidebar4-account-next" aria-hidden="true" />}
          </button>
        </nav>
      </section>
    </aside>
  );
};
