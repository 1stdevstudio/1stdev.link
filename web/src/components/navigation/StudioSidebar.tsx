import React from 'react';
import { ArrowRight, ArrowUpRight, Send, Save, Sparkles } from 'lucide-react';
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
          <span className="sidebar4-menu-count" aria-label={tx('Lima menu', 'Five menu items')}>05</span>
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

      <div className="sidebar4-tools">
        <div className="sidebar4-tools-heading">{tx('PINTASAN', 'SHORTCUT')}</div>
        <button type="button" className="sidebar4-share" onClick={onOpenShare}>
          <span className="sidebar4-share-icon"><Send size={17} strokeWidth={1.9} aria-hidden="true" /></span>
          <span className="sidebar4-share-copy">
            <strong>{tx('Bagikan halaman', 'Share your page')}</strong>
            <small>{tx('Kirim tautan profilmu', 'Send your profile link')}</small>
          </span>
          <ArrowUpRight className="sidebar4-share-arrow" size={17} aria-hidden="true" />
        </button>
      </div>

      <div className="sidebar4-account">
        <div className="sidebar4-account-main">
          <span className="sidebar4-account-avatar" aria-hidden="true">{initial}</span>
          <span className="sidebar4-account-copy">
            <strong title={displayName}>{displayName}</strong>
            <small>{session.is_guest ? tx('Sesi sementara', 'Temporary session') : tx('Akun tersimpan', 'Saved account')}</small>
          </span>
          <span className={'sidebar4-account-indicator' + (session.is_guest ? ' is-guest' : '')} title={session.is_guest ? tx('Sesi tamu', 'Guest session') : tx('Akun tersimpan', 'Saved account')} aria-hidden="true" />
        </div>
        {session.is_guest ? (
          <button type="button" className="sidebar4-account-action" onClick={onOpenSaveAccount}>
            <Save size={15} aria-hidden="true" />
            {tx('Simpan akun', 'Save account')}
            <ArrowRight size={15} aria-hidden="true" />
          </button>
        ) : (
          <button type="button" className="sidebar4-account-action" onClick={() => onTabChange('account')}>
            {tx('Kelola akun', 'Manage account')}
            <ArrowRight size={15} aria-hidden="true" />
          </button>
        )}
      </div>
    </aside>
  );
};
