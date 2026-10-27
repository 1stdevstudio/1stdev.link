import React, { useState, useEffect } from 'react';
import { api } from './api';
import { AuthSession, BioProfile, LinkItem, BioBlockType } from './types';

// Components
import { Welcome } from './components/Welcome';
import { AppShell, TabType } from './components/AppShell';
import { ProfileScreen } from './components/screens/ProfileScreen';
import { LinksScreen } from './components/screens/LinksScreen';
import { HomeScreen } from './components/screens/HomeScreen';
import { StatsScreen } from './components/screens/StatsScreen';
import { AccountScreen } from './components/screens/AccountScreen';
import { LivePhonePreview } from './components/LivePhonePreview';
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

type SheetType =
  | 'add_link'
  | 'add_block'
  | 'edit_profile'
  | 'share'
  | 'save_account'
  | 'login'
  | 'device_transfer'
  | null;

export const App: React.FC = () => {
  // Session State
  const [session, setSession] = useState<AuthSession | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [startingGuest, setStartingGuest] = useState(false);

  // App Navigation Tab
  const [currentTab, setCurrentTab] = useState<TabType>(() => {
    return (localStorage.getItem('edgelink_tab') as TabType) || 'home';
  });

  // App Data
  const [profile, setProfile] = useState<BioProfile>({
    handle: 'creator',
    display_name: 'Edge Creator',
    bio: '',
    theme: 'obsidian',
    avatar_shape: 'circle',
    verified_badge: false,
  });
  const [links, setLinks] = useState<LinkItem[]>([]);

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

  // Change tab and persist
  const handleTabChange = (tab: TabType) => {
    setCurrentTab(tab);
    localStorage.setItem('edgelink_tab', tab);
  };

  // Load Session on Mount
  useEffect(() => {
    const checkSession = async () => {
      setLoadingSession(true);
      try {
        const existing = await api.getExistingSession();
        if (existing) {
          setSession(existing);
          await loadUserData();
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
      handleTabChange(goal);
      await loadUserData();
      showToast('Sesi dimulai');
    } catch (err: any) {
      console.error('Error starting guest session:', err);
      alert(err.message || 'Gagal memulai sesi baru.');
    } finally {
      setStartingGuest(false);
    }
  };

  // Auth / Session Transitions
  const handleLoginSuccess = async (newSession: AuthSession) => {
    setSession(newSession);
    await loadUserData();
    setActiveSheet(null);
  };

  const handleLogout = () => {
    api.logout();
    setSession(null);
    setLinks([]);
    setCurrentTab('profile');
    localStorage.removeItem('edgelink_tab');
    showToast('Telah keluar dari akun');
  };

  // Profile Mutations
  const handleUpdateProfile = async (updated: Partial<BioProfile>) => {
    // Optimistic UI update
    setProfile((prev) => ({ ...prev, ...updated }));
    const saved = await api.updateBioProfile(updated);
    setProfile(saved);
    showToast('Profil disimpan');
  };

  const handleUpdateTheme = (theme: string) => {
    handleUpdateProfile({ theme });
  };

  const handleUpdateAvatarShape = (shape: 'circle' | 'squircle' | 'rounded') => {
    handleUpdateProfile({ avatar_shape: shape });
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
    showToast('Link dibuat');
  };

  const handleToggleLinkActive = async (id: string, currentState: boolean) => {
    const nextState = !currentState;
    setLinks((prev) =>
      prev.map((l) => (l.id === id ? { ...l, is_active: nextState ? 1 : 0 } : l))
    );
    await api.toggleLinkActive(id, nextState);
    showToast(nextState ? 'Link diaktifkan' : 'Link dinonaktifkan');
  };

  const [editingLink, setEditingLink] = useState<LinkItem | null>(null);

  const handleUpdateLink = async (id: string, patch: BlockPatch) => {
    await api.updateLink(id, patch);
    setLinks((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
    showToast('Perubahan disimpan');
  };

  const handleDeleteLink = async (id: string) => {
    await api.deleteLink(id);
    setLinks((prev) => prev.filter((l) => l.id !== id));
    showToast('Link dihapus');
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
        const updates = reordered.map((l, index) => ({ id: l.id, sort_order: index }));
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
        Memuat EdgeLink...
      </div>
    );
  }

  // Welcome Screen (No Active Session)
  if (!session) {
    return (
      <>
        <Welcome
          onStart={handleStartGuest}
          onOpenLogin={() => setActiveSheet('login')}
          onOpenLegal={(tab) => setShowLegal(tab)}
          loading={startingGuest}
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
            onOpenEditProfile={() => setActiveSheet('edit_profile')}
            onOpenShare={() => setActiveSheet('share')}
            onOpenAddBlock={() => setActiveSheet('add_block')}
            onOpenSaveAccount={() => setActiveSheet('save_account')}
            onUpdateTheme={handleUpdateTheme}
            onUpdateAvatarShape={handleUpdateAvatarShape}
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
