import React, { useState, useEffect } from 'react';
import { api } from './api';
import { AuthSession, BioProfile, LinkItem, BioBlockType, BioProfileStyle } from './types';

// Components
import { Welcome } from './components/Welcome';
import { LandingPage } from './components/LandingPage';
import { AppShell, TabType } from './components/AppShell';
import { ProfileScreen } from './components/screens/ProfileScreen';
import { LinksScreen } from './components/screens/LinksScreen';
import { HomeScreen } from './components/screens/HomeScreen';
import { StatsScreen } from './components/screens/StatsScreen';
import { AccountScreen } from './components/screens/AccountScreen';
import { LivePhonePreview, THEME_STYLES } from './components/LivePhonePreview';
import { Toast } from './components/Toast';
import { LegalModal } from './components/LegalModal';

// Sheets
import { AddLinkSheet } from './components/sheets/AddLinkSheet';
import { AddBlockSheet } from './components/sheets/AddBlockSheet';
import { EditBlockSheet, BlockPatch } from './components/sheets/EditBlockSheet';
import { EditProfileSheet } from './components/sheets/EditProfileSheet';
import { ShareSheet } from './components/sheets/ShareSheet';
import { SaveAccountSheet } from './components/sheets/SaveAccountSheet';
import { LoginSheet } from './components/sheets/LoginSheet';
import { DeviceTransferSheet } from './components/sheets/DeviceTransferSheet';
import { useI18n } from './i18n/context';

type SheetType =
  | 'add_link'
  | 'add_block'
  | 'edit_profile'
  | 'share'
  | 'save_account'
  | 'login'
  | 'device_transfer'
  | null;

// Persistensi Cache & Tab Navigation Helper
const getInitialTab = (): TabType => {
  const hash = window.location.hash.replace('#', '');
  if (hash === 'design' || hash === 'preview' || hash === 'content' || hash === 'profile') return 'profile';
  if (hash === 'home' || hash === 'links' || hash === 'stats' || hash === 'account') return hash as TabType;
  return (localStorage.getItem('edgelink_tab') as TabType) || 'home';
};

const getCachedSession = (): AuthSession | null => {
  try {
    const raw = localStorage.getItem('edgelink_cached_session');
    if (raw) return JSON.parse(raw);
    const token = localStorage.getItem('edgelink_token');
    if (token) {
      // Standby session agar Welcome screen tidak pernah berkedip saat verifikasi token di background
      return {
        id: 'usr_standby',
        handle: 'creator',
        display_name: 'Creator',
        email: '',
        is_guest: true,
        api_key: token,
      };
    }
    return null;
  } catch {
    return null;
  }
};

const getCachedProfile = (): BioProfile => {
  try {
    const raw = localStorage.getItem('edgelink_cached_profile');
    if (raw) return JSON.parse(raw);
  } catch {}
  return {
    handle: 'creator',
    display_name: 'Edge Creator',
    bio: '',
    theme: '1stnear',
    avatar_shape: 'circle',
    verified_badge: false,
  };
};

const getCachedLinks = (): LinkItem[] => {
  try {
    const raw = localStorage.getItem('edgelink_cached_links');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const App: React.FC = () => {
  const { tx } = useI18n();
  // Session State - Hydrate synchronous dari cache untuk mencegah flicker saat refresh
  const [session, setSession] = useState<AuthSession | null>(getCachedSession);
  const [loadingSession, setLoadingSession] = useState<boolean>(false);
  const [startingGuest, setStartingGuest] = useState(false);

  // App Navigation Tab
  const [currentTab, setCurrentTab] = useState<TabType>(getInitialTab);

  // App Data - Hydrate synchronous dari cache
  const [profile, setProfile] = useState<BioProfile>(getCachedProfile);
  const [links, setLinks] = useState<LinkItem[]>(getCachedLinks);

  // Sheet Controls
  const [activeSheet, setActiveSheet] = useState<SheetType>(null);
  const [addLinkDefaultBlock, setAddLinkDefaultBlock] = useState<BioBlockType>('link');
  const [showLegal, setShowLegal] = useState<'terms' | 'privacy' | null>(null);

  // Toast Control
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2500);
  };

  // Change tab and persist URL hash & localStorage
  const handleTabChange = (tab: TabType) => {
    setCurrentTab(tab);
    localStorage.setItem('edgelink_tab', tab);
    if (tab !== 'profile') {
      window.location.hash = tab;
    } else {
      const pTab = localStorage.getItem('edgelink_profile_tab') || 'content';
      window.location.hash = pTab;
    }
  };

  // Sync hash changes (e.g. back/forward button)
  useEffect(() => {
    const onHash = () => {
      const resolved = getInitialTab();
      setCurrentTab(resolved);
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  // Load / Revalidate Session on Mount (Background SWR)
  useEffect(() => {
    const checkSession = async () => {
      const token = localStorage.getItem('edgelink_token');
      if (!token) {
        setLoadingSession(false);
        setSession(null);
        return;
      }
      try {
        const existing = await api.getExistingSession();
        if (existing) {
          setSession(existing);
          localStorage.setItem('edgelink_cached_session', JSON.stringify(existing));
          await loadUserData();
        } else {
          setSession(null);
          localStorage.removeItem('edgelink_cached_session');
        }
      } catch (err) {
        console.error('Failed to restore session:', err);
      } finally {
        setLoadingSession(false);
      }
    };

    checkSession();
  }, []);

  const loadUserData = async () => {
    try {
      const [fetchedLinks, fetchedProfile] = await Promise.all([
        api.getLinks(),
        api.getBioProfile(),
      ]);
      setLinks(fetchedLinks);
      setProfile(fetchedProfile);
      localStorage.setItem('edgelink_cached_links', JSON.stringify(fetchedLinks));
      localStorage.setItem('edgelink_cached_profile', JSON.stringify(fetchedProfile));
    } catch (err) {
      console.error('Failed to load user data:', err);
    }
  };

  // Handle Starting from Welcome Screen
  const handleStartGuest = async (goal: 'profile' | 'links') => {
    setStartingGuest(true);
    try {
      const newSession = await api.initSession();
      setSession(newSession);
      localStorage.setItem('edgelink_cached_session', JSON.stringify(newSession));
      handleTabChange(goal);
      await loadUserData();
      showToast(tx('Sesi dimulai', 'Session started'));
    } catch (err: any) {
      console.error('Error starting guest session:', err);
      showToast(err.message || tx('Gagal memulai sesi baru.', 'Could not start a new session.'));
    } finally {
      setStartingGuest(false);
    }
  };

  // Auth / Session Transitions
  const handleLoginSuccess = async (newSession: AuthSession) => {
    setSession(newSession);
    localStorage.setItem('edgelink_cached_session', JSON.stringify(newSession));
    await loadUserData();
    setActiveSheet(null);
  };

  const handleLogout = () => {
    api.logout();
    setSession(null);
    setLinks([]);
    setCurrentTab('profile');
    localStorage.removeItem('edgelink_tab');
    localStorage.removeItem('edgelink_profile_tab');
    localStorage.removeItem('edgelink_cached_session');
    localStorage.removeItem('edgelink_cached_profile');
    localStorage.removeItem('edgelink_cached_links');
    window.location.hash = '';
    showToast(tx('Telah keluar dari akun', 'Logged out'));
  };

  // Profile Mutations
  const handleUpdateProfile = async (updated: Partial<BioProfile>) => {
    // Optimistic UI update
    setProfile((prev) => {
      const next = { ...prev, ...updated };
      localStorage.setItem('edgelink_cached_profile', JSON.stringify(next));
      return next;
    });
    const saved = await api.updateBioProfile(updated);
    setProfile(saved);
    localStorage.setItem('edgelink_cached_profile', JSON.stringify(saved));
    showToast(tx('Profil disimpan', 'Profile saved'));
  };

  useEffect(() => {
    if (links.length > 0) {
      localStorage.setItem('edgelink_cached_links', JSON.stringify(links));
    }
  }, [links]);

  const handleUpdateTheme = (theme: string) => {
    const s = THEME_STYLES[theme] || THEME_STYLES['1stnear'];
    const currentStyle = profile.style || {};
    // Switch to chosen theme: clear custom wallpaper so the full theme palette takes effect
    handleUpdateProfile({
      theme,
      style: {
        ...currentStyle,
        bg: theme === 'clean-paper' ? 'light' : 'dark',
        bg_image: '',
        accent: s.featBg,
      },
    });
  };

  const handleUpdateAvatarShape = (shape: 'circle' | 'squircle' | 'rounded') => {
    handleUpdateProfile({ avatar_shape: shape });
  };

  const handleUpdateStyle = (stylePatch: Partial<BioProfileStyle>) => {
    const currentStyle = profile.style || {};
    const newStyle = { ...currentStyle, ...stylePatch };
    handleUpdateProfile({ style: newStyle });
  };

  // Link Mutations
  const handleCreateLink = async (payload: {
    destination_url: string;
    slug?: string;
    title?: string;
    is_bio_entry?: boolean;
    ios_url?: string;
    android_url?: string;
    block_type?: BioBlockType;
  }) => {
    const newLink = await api.createLink(payload);
    setLinks((prev) => [newLink, ...prev]);
    showToast(tx('Link dibuat', 'Link created'));
  };

  const handleToggleLinkActive = async (id: string, currentState: boolean) => {
    const nextState = !currentState;
    setLinks((prev) =>
      prev.map((l) => (l.id === id ? { ...l, is_active: nextState ? 1 : 0 } : l))
    );
    await api.toggleLinkActive(id, nextState);
    showToast(nextState ? tx('Link diaktifkan', 'Link enabled') : tx('Link dinonaktifkan', 'Link disabled'));
  };

  const [editingLink, setEditingLink] = useState<LinkItem | null>(null);

  const handleUpdateLink = async (id: string, patch: BlockPatch) => {
    await api.updateLink(id, patch);
    setLinks((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
    showToast(tx('Perubahan disimpan', 'Changes saved'));
  };

  const handleDeleteLink = async (id: string) => {
    await api.deleteLink(id);
    setLinks((prev) => prev.filter((l) => l.id !== id));
    showToast(tx('Link dihapus', 'Link deleted'));
  };

  const reorderTimerRef = React.useRef<any>(null);

  const handleReorderLinks = (reordered: LinkItem[]) => {
    // 1. Immediate optimistic UI update
    setLinks(reordered);

    // 2. Debounce remote PUT /api/links/reorder by 800ms to respect D1/KV limits
    if (reorderTimerRef.current) {
      clearTimeout(reorderTimerRef.current);
    }
    reorderTimerRef.current = setTimeout(async () => {
      try {
        // Hanya blok profil yang punya urutan; kirim sort_order apa adanya (hemat write D1).
        const updates = reordered
          .filter((l) => l.is_bio_entry)
          .map((l) => ({ id: l.id, sort_order: l.sort_order ?? 0 }));
        await api.updateLinkOrder(updates);
      } catch (err) {
        console.error('Failed to persist link order:', err);
      }
    }, 800);
  };

  // Loading Screen
  if (loadingSession) {
    return (
      <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center text-[var(--tx2)] text-[14px]">
        {tx('Memuat 1stdev.link...', 'Loading 1stdev.link...')}
      </div>
    );
  }

  // Welcome Screen (No Active Session)
  if (!session) {
    const isLandingPreview = window.location.pathname === '/landing' || window.location.search.includes('view=landing');
    return (
      <>
        {isLandingPreview ? (
          <LandingPage
            onStart={handleStartGuest}
            onOpenLogin={() => setActiveSheet('login')}
            onOpenLegal={(tab) => setShowLegal(tab)}
            loading={startingGuest}
          />
        ) : (
          <Welcome
            onStart={handleStartGuest}
            onOpenLogin={() => setActiveSheet('login')}
            onOpenLegal={(tab) => setShowLegal(tab)}
            loading={startingGuest}
          />
        )}

        <LoginSheet
          isOpen={activeSheet === 'login'}
          onClose={() => setActiveSheet(null)}
          onSendOtp={(email, purpose) => api.sendOtp(email, purpose)}
          onVerifyOtp={(email, code, purpose) => api.verifyOtp(email, code, purpose)}
          onLoginWithKey={(key) => api.login(key)}
          onSuccess={handleLoginSuccess}
          onToast={showToast}
        />

        {showLegal && (
          <LegalModal initialTab={showLegal} onClose={() => setShowLegal(null)} />
        )}

        <Toast message={toastMessage} />
      </>
    );
  }

  // Active App Session
  return (
    <>
      <AppShell
        currentTab={currentTab}
        onTabChange={handleTabChange}
        session={session}
        onOpenShare={() => setActiveSheet('share')}
        onOpenSaveAccount={() => setActiveSheet('save_account')}
        onOpenAddLink={() => {
          setAddLinkDefaultBlock('link');
          setActiveSheet('add_link');
        }}
        onOpenAddBlock={() => setActiveSheet('add_block')}
        previewColumn={<LivePhonePreview profile={profile} links={links} />}
      >
        {currentTab === 'home' && (
          <HomeScreen
            session={session}
            profile={profile}
            links={links}
            onOpenShare={() => setActiveSheet('share')}
            onOpenAddLink={() => {
              setAddLinkDefaultBlock('link');
              setActiveSheet('add_link');
            }}
            onOpenAddBlock={() => setActiveSheet('add_block')}
            onOpenEditProfile={() => setActiveSheet('edit_profile')}
            onOpenSaveAccount={() => setActiveSheet('save_account')}
            onGoTo={handleTabChange}
            onToast={showToast}
          />
        )}

        {currentTab === 'profile' && (
          <ProfileScreen
            isGuest={session.is_guest}
            profile={profile}
            links={links}
            preview={<LivePhonePreview profile={profile} links={links} />}
            onOpenEditProfile={() => setActiveSheet('edit_profile')}
            onOpenShare={() => setActiveSheet('share')}
            onOpenAddBlock={() => setActiveSheet('add_block')}
            onOpenSaveAccount={() => setActiveSheet('save_account')}
            onUpdateTheme={handleUpdateTheme}
            onUpdateAvatarShape={handleUpdateAvatarShape}
            onUpdateStyle={handleUpdateStyle}
            onReorderLinks={handleReorderLinks}
            onDeleteLink={handleDeleteLink}
            onEditLink={setEditingLink}
            onToast={showToast}
          />
        )}

        {currentTab === 'links' && (
          <LinksScreen
            links={links}
            onOpenAddLink={() => {
              setAddLinkDefaultBlock('link');
              setActiveSheet('add_link');
            }}
            onToggleActive={handleToggleLinkActive}
            onDeleteLink={handleDeleteLink}
            onToast={showToast}
          />
        )}

        {currentTab === 'stats' && <StatsScreen links={links} />}

        {currentTab === 'account' && (
          <AccountScreen
            session={session}
            onOpenSaveAccount={() => setActiveSheet('save_account')}
            onOpenDeviceTransfer={() => setActiveSheet('device_transfer')}
            onGoToProfile={() => handleTabChange('profile')}
            onOpenLegal={(tab) => setShowLegal(tab)}
            onLogout={handleLogout}
            onToast={showToast}
          />
        )}
      </AppShell>

      {/* Sheets & Dialogs */}
      <AddLinkSheet
        isOpen={activeSheet === 'add_link'}
        onClose={() => setActiveSheet(null)}
        onCreateLink={handleCreateLink}
        defaultBlockType={addLinkDefaultBlock}
      />

      <AddBlockSheet
        isOpen={activeSheet === 'add_block'}
        onClose={() => setActiveSheet(null)}
        onSelectLinkType={(type) => {
          setAddLinkDefaultBlock(type);
          setActiveSheet('add_link');
        }}
        onCreateBlock={async (payload) => {
          await handleCreateLink({
            destination_url: payload.destination_url,
            title: payload.title,
            is_bio_entry: true,
            block_type: payload.block_type,
          });
        }}
      />

      <EditBlockSheet
        link={editingLink}
        onClose={() => setEditingLink(null)}
        onSave={handleUpdateLink}
        onDelete={handleDeleteLink}
      />

      <EditProfileSheet
        isOpen={activeSheet === 'edit_profile'}
        onClose={() => setActiveSheet(null)}
        profile={profile}
        onUpdateProfile={handleUpdateProfile}
        isGuest={Boolean(session.is_guest)}
        onSaveAccount={() => setActiveSheet('save_account')}
      />

      <ShareSheet
        isOpen={activeSheet === 'share'}
        onClose={() => setActiveSheet(null)}
        handle={profile.handle}
        onToast={showToast}
      />

      <SaveAccountSheet
        isOpen={activeSheet === 'save_account'}
        onClose={() => setActiveSheet(null)}
        onSendOtp={(email, purpose) => api.sendOtp(email, purpose)}
        onVerifyOtp={(email, code, purpose) => api.verifyOtp(email, code, purpose)}
        onSuccess={handleLoginSuccess}
        onToast={showToast}
      />

      <LoginSheet
        isOpen={activeSheet === 'login'}
        onClose={() => setActiveSheet(null)}
        onSendOtp={(email, purpose) => api.sendOtp(email, purpose)}
        onVerifyOtp={(email, code, purpose) => api.verifyOtp(email, code, purpose)}
        onLoginWithKey={(key) => api.login(key)}
        onSuccess={handleLoginSuccess}
        onToast={showToast}
      />

      <DeviceTransferSheet
        isOpen={activeSheet === 'device_transfer'}
        onClose={() => setActiveSheet(null)}
        apiKey={session.api_key}
        onToast={showToast}
      />

      {showLegal && (
        <LegalModal initialTab={showLegal} onClose={() => setShowLegal(null)} />
      )}

      {/* Floating Status Toast */}
      <Toast message={toastMessage} />
    </>
  );
};

export default App;
