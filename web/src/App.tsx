import React, { useState, useEffect, useRef } from 'react';
import { BusinessModePanel } from './components/business/BusinessModePanel';
import { BusinessBlockSheet } from './components/business/BusinessBlockSheet';
import { DEFAULT_BUSINESS, isBusinessBlock, isContentBlock, validateBusinessData, type BusinessBlockType, type BusinessData } from '../../shared/business';
import { api } from './api';
import { getInitialTab, getCachedSession, getCachedProfile, getCachedLinks, needsSessionRestore } from './state/sessionCache';
import { CollectionRevision, MutationQueue } from '../../shared/mutationQueue';
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

export const App: React.FC = () => {
  const { tx } = useI18n();
  // Session State - Hydrate synchronous dari cache untuk mencegah flicker saat refresh
  const [session, setSession] = useState<AuthSession | null>(getCachedSession);
  const [loadingSession, setLoadingSession] = useState(needsSessionRestore);
  const [restoreError, setRestoreError] = useState(false);
  const trustedRestoreRequired = useRef(needsSessionRestore());
  const [startingGuest, setStartingGuest] = useState(false);

  // App Navigation Tab
  const [currentTab, setCurrentTab] = useState<TabType>(getInitialTab);

  // App Data - Hydrate synchronous dari cache
  const [profile, setProfile] = useState<BioProfile>(getCachedProfile);
  const [links, setLinks] = useState<LinkItem[]>(getCachedLinks);

  const linksRef = useRef(links);
  const linkRevision = useRef(new CollectionRevision());
  const setLinkCollection = (next: LinkItem[] | ((current: LinkItem[]) => LinkItem[])) => {
    const value = typeof next === 'function' ? next(linksRef.current) : next;
    linksRef.current = value;
    setLinks(value);
  };
  const profileRef = useRef(profile);
  const sessionRef = useRef(session);
  const generation = useRef(0);
  const saveRevision = useRef(0);
  const profileDirty = useRef(false);
  const profileWrites = useRef(new MutationQueue());
  const linkWrites = useRef(new MutationQueue());
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const reorderTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reorderFinishRef = useRef<(() => void) | null>(null);
  const cacheData = (kind: string, value: unknown) => {
    if (sessionRef.current) localStorage.setItem(`edgelink:${sessionRef.current.id}:${kind}`, JSON.stringify(value));
  };
  const resetSessionData = (next: AuthSession | null) => {
    generation.current++;
    saveRevision.current++;
    linkRevision.current = new CollectionRevision();
    profileDirty.current = false;
    profileWrites.current = new MutationQueue();
    linkWrites.current = new MutationQueue();
    setRestoreError(false);
    sessionRef.current = next;
    setSession(next);
    if (reorderTimerRef.current) clearTimeout(reorderTimerRef.current);
    reorderFinishRef.current?.();
    reorderFinishRef.current = null;
    const empty = { handle: 'creator', display_name: 'Edge Creator', bio: '', theme: '1stnear' };
    profileRef.current = empty;
    setProfile(empty);
    setLinkCollection([]);
    setSaveStatus('idle');
    setBusinessEditor(null);
    setEditingLink(null);
    setActiveSheet(null);
  };

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
    let cancelled = false;
    const startedGeneration = generation.current;
    const checkSession = async () => {
      try {
        const existing = await api.getExistingSession();
        if (cancelled || startedGeneration !== generation.current) return;
        if (existing) {
          const changedAccount = sessionRef.current?.id !== existing.id || sessionRef.current?.api_key !== existing.api_key;
          if (changedAccount) resetSessionData(existing);
          else { sessionRef.current = existing; setSession(existing); }
          localStorage.setItem('edgelink_cached_session', JSON.stringify(existing));
          const loaded = await loadUserData();
          if (!cancelled && (changedAccount || trustedRestoreRequired.current) && !loaded) setRestoreError(true);
          if (loaded) trustedRestoreRequired.current = false;
        } else {
          resetSessionData(null);
          localStorage.removeItem('edgelink_cached_session');
        }
      } catch (err) {
        console.error('Failed to restore session:', err);
        if (!cancelled && trustedRestoreRequired.current) setRestoreError(true);
      } finally {
        if (!cancelled) setLoadingSession(false);
      }
    };

    checkSession();
    return () => { cancelled = true; };
  }, []);

  const loadUserData = async () => {
    const startedGeneration = generation.current;
    const token = localStorage.getItem('edgelink_token');
    const revision = saveRevision.current;
    const cleanAtStart = !profileDirty.current;
    const collection = linkRevision.current;
    const linkSnapshot = collection.capture();
    try {
      const [fetchedLinks, fetchedProfile] = await Promise.all([
        api.getLinks(),
        api.getBioProfile(),
      ]);
      if (startedGeneration !== generation.current || token !== localStorage.getItem('edgelink_token')) return false;
      if (collection === linkRevision.current && collection.accepts(linkSnapshot)) {
        setLinkCollection(fetchedLinks);
        cacheData('links', fetchedLinks);
      }
      if (cleanAtStart && !profileDirty.current && revision === saveRevision.current) {
        profileRef.current = fetchedProfile;
        setProfile(fetchedProfile);
        cacheData('profile', fetchedProfile);
      }
      return true;
    } catch (err) {
      console.error('Failed to load user data:', err);
      return false;
    }
  };

  // Handle Starting from Welcome Screen
  const handleStartGuest = async (goal: 'profile' | 'links', purpose?: 'creator' | 'business' | 'affiliate') => {
    setStartingGuest(true);
    try {
      const newSession = await api.initSession();
      resetSessionData(newSession);
      localStorage.setItem('edgelink_cached_session', JSON.stringify(newSession));
      handleTabChange(goal);
      await loadUserData();
      if (purpose && goal === 'profile') {
        await handleUpdateProfile({ business: { ...DEFAULT_BUSINESS, purpose, mode: purpose === 'creator' ? 'personal' : 'business', industry: purpose === 'affiliate' ? 'retail' : 'fnb' } });
      }
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
    resetSessionData(newSession);
    localStorage.setItem('edgelink_cached_session', JSON.stringify(newSession));
    await loadUserData();
    setActiveSheet(null);
  };

  const handleLogout = () => {
    api.logout();
    resetSessionData(null);
    setCurrentTab('profile');
    localStorage.removeItem('edgelink_tab');
    localStorage.removeItem('edgelink_profile_tab');
    localStorage.removeItem('edgelink_cached_session');
    localStorage.removeItem('edgelink_cached_profile');
    localStorage.removeItem('edgelink_cached_links');
    window.location.hash = '';
    showToast(tx('Telah keluar dari akun', 'Logged out'));
  };

  // Serialize writes; late responses never replace a newer draft or a different session.
  const handleUpdateProfile = (updated: Partial<BioProfile>): Promise<void> => {
    const draft = { ...profileRef.current, ...updated };
    profileRef.current = draft;
    setProfile(draft);
    const revision = ++saveRevision.current;
    profileDirty.current = true;
    const startedGeneration = generation.current;
    const token = localStorage.getItem('edgelink_token');
    setSaveStatus('saving');
    const task = profileWrites.current.run(async () => {
      if (startedGeneration !== generation.current || token !== localStorage.getItem('edgelink_token')) return;
      try {
        const saved = await api.updateBioProfile(draft);
        if (startedGeneration !== generation.current || token !== localStorage.getItem('edgelink_token')) return;
        cacheData('profile', saved);
        if (revision === saveRevision.current) {
          profileDirty.current = false;
          profileRef.current = saved;
          setProfile(saved);
          setSaveStatus('saved');
        }
      } catch (error) {
        if (startedGeneration === generation.current && revision === saveRevision.current) {
          setSaveStatus('error');
          showToast(tx('Gagal menyimpan. Coba lagi.', 'Save failed. Please retry.'));
        }
        throw error;
      }
    });
    return task;
  };

  useEffect(() => { cacheData('links', links); }, [links]);

  const handleUpdateTheme = (theme: string) => {
    const s = THEME_STYLES[theme] || THEME_STYLES['1stnear'];
    const currentStyle = profileRef.current.style || {};
    // Theme changes preserve uploaded wallpaper, cover, and their adjustments.
    void handleUpdateProfile({
      theme,
      style: {
        ...currentStyle,
        bg: theme === 'clean-paper' ? 'light' : 'dark',
        accent: s.featBg,
      },
    }).catch(() => {});
  };

  const handleUpdateAvatarShape = (shape: 'circle' | 'squircle' | 'rounded') => {
    void handleUpdateProfile({ avatar_shape: shape }).catch(() => {});
  };

  const handleUpdateStyle = (stylePatch: Partial<BioProfileStyle>) => {
    const currentStyle = profileRef.current.style || {};
    const newStyle = { ...currentStyle, ...stylePatch };
    void handleUpdateProfile({ style: newStyle }).catch(() => {});
  };

  // All collection writes invalidate reads from before or during their lifetime.
  const mutateLinks = async (mutation: (isCurrent: () => boolean) => Promise<void>) => {
    const startedGeneration = generation.current;
    const token = localStorage.getItem('edgelink_token');
    const finish = linkRevision.current.begin();
    const isCurrent = () => startedGeneration === generation.current && token === localStorage.getItem('edgelink_token');
    try {
      await linkWrites.current.run(async () => { if (isCurrent()) await mutation(isCurrent); });
    } finally { finish(); }
  };

  const handleCreateLink = async (payload: {
    destination_url: string; slug?: string; title?: string; is_bio_entry?: boolean;
    ios_url?: string; android_url?: string; block_type?: BioBlockType; data_json?: BusinessData;
  }) => {
    await mutateLinks(async (isCurrent) => {
      const sort_order = Math.max(-1, ...linksRef.current.filter((l) => l.is_bio_entry).map((l) => l.sort_order || 0)) + 1;
      const newLink = await api.createLink({ ...payload, ...(payload.is_bio_entry ? { sort_order } : {}) });
      if (!isCurrent()) return;
      setLinkCollection((prev) => [newLink, ...prev]);
      showToast(tx('Blok dibuat', 'Block created'));
    });
  };

  const handleDuplicateBusinessBlock = async (link: LinkItem) => {
    if (!isBusinessBlock(link.block_type)) return;
    await handleCreateLink({ title: `${link.title || 'Blok'} (salinan)`.slice(0, 100), block_type: link.block_type, data_json: validateBusinessData(link.block_type, link.data_json), destination_url: '#', is_bio_entry: true });
  };

  const handleToggleLinkActive = async (id: string, currentState: boolean) => {
    await mutateLinks(async (isCurrent) => {
      await api.toggleLinkActive(id, !currentState);
      if (isCurrent()) setLinkCollection((prev) => prev.map((l) => l.id === id ? { ...l, is_active: currentState ? 0 : 1 } : l));
    });
  };

  const [businessEditor, setBusinessEditor] = useState<{ kind: BusinessBlockType; link?: LinkItem } | null>(null);
  const [editingLink, setEditingLink] = useState<LinkItem | null>(null);

  const handleUpdateLink = async (id: string, patch: BlockPatch) => {
    await mutateLinks(async (isCurrent) => {
      await api.updateLink(id, patch);
      if (!isCurrent()) return;
      setLinkCollection((prev) => prev.map((l) => l.id === id ? { ...l, ...patch } : l));
      showToast(tx('Perubahan disimpan', 'Changes saved'));
    });
  };

  const handleRemoveFromProfile = async (id: string) => {
    await mutateLinks(async (isCurrent) => {
      await api.updateLink(id, { is_bio_entry: 0 });
      if (!isCurrent()) return;
      setLinkCollection((prev) => prev.map((l) => l.id === id ? { ...l, is_bio_entry: 0 } : l));
      showToast(tx('Dilepas dari halaman. Link dan statistik tetap tersimpan.', 'Removed from page. Your link and stats are preserved.'));
    });
  };

  const handleDeleteLink = async (id: string) => {
    await mutateLinks(async (isCurrent) => {
      await api.deleteLink(id);
      if (!isCurrent()) return;
      setLinkCollection((prev) => prev.filter((l) => l.id !== id));
      showToast(tx('Link dihapus permanen', 'Link permanently deleted'));
    });
  };

  const handleReorderLinks = (reordered: LinkItem[]) => {
    if (reorderTimerRef.current) clearTimeout(reorderTimerRef.current);
    reorderFinishRef.current?.();
    const finish = linkRevision.current.begin();
    reorderFinishRef.current = finish;
    setLinkCollection(reordered);
    const startedGeneration = generation.current;
    reorderTimerRef.current = setTimeout(async () => {
      reorderTimerRef.current = null;
      try {
        await linkWrites.current.run(async () => {
          if (startedGeneration !== generation.current) return;
          await api.updateLinkOrder(reordered.filter((l) => l.is_bio_entry).map((l) => ({ id: l.id, sort_order: l.sort_order ?? 0 })));
        });
      } catch (err) {
        console.error('Failed to persist link order:', err);
        finish();
        if (startedGeneration === generation.current) { await loadUserData(); showToast(tx('Urutan gagal disimpan', 'Could not save order')); }
      } finally {
        finish();
        if (reorderFinishRef.current === finish) reorderFinishRef.current = null;
      }
    }, 800);
  };

  useEffect(() => () => {
    if (reorderTimerRef.current) clearTimeout(reorderTimerRef.current);
    reorderFinishRef.current?.();
  }, []);

  useEffect(() => {
    const syncStorage = (event: StorageEvent) => {
      if (event.key === 'edgelink_token' && event.oldValue !== event.newValue) window.location.reload();
      if (!sessionRef.current || saveStatus === 'saving' || saveStatus === 'error' || !event.newValue) return;
      if (event.key === `edgelink:${sessionRef.current.id}:profile`) {
        try { const next = JSON.parse(event.newValue); profileRef.current = next; setProfile(next); } catch { /* ignore corrupt local cache */ }
      }
    };
    window.addEventListener('storage', syncStorage);
    return () => window.removeEventListener('storage', syncStorage);
  }, [saveStatus]);

  // Loading Screen
  if (loadingSession) {
    return (
      <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center text-[var(--tx2)] text-[14px]">
        {tx('Memuat 1stdev.link...', 'Loading 1stdev.link...')}
      </div>
    );
  }

  if (restoreError) {
    return <main className="min-h-screen grid place-items-center p-6"><div className="card flex flex-col gap-4 max-w-md" role="alert">
      <h1 className="text-xl font-semibold">{tx('Halaman belum berhasil dimuat', 'Your page could not be loaded')}</h1>
      <p className="muted">{tx('Coba muat kembali sebelum mengedit agar isi akun tetap aman.', 'Reload your data before editing to keep your account content safe.')}</p>
      <button className="btn btn-p" type="button" onClick={() => window.location.reload()}>{tx('Coba lagi', 'Try again')}</button>
      <button className="btn btn-g" type="button" onClick={handleLogout}>{tx('Keluar', 'Log out')}</button>
    </div></main>;
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
        saveStatus={saveStatus}
        onRetrySave={() => { void handleUpdateProfile(profileRef.current).catch(() => {}); }}
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
            businessPanel={<BusinessModePanel value={profile.business} onChange={(business) => handleUpdateProfile({ business })} onAdd={(kind) => setBusinessEditor({ kind })} onPreset={async (industry) => {
          const startedGeneration = generation.current;
          await mutateLinks(async (isCurrent) => { if (isCurrent()) await api.applyBusinessPreset(industry); });
          if (startedGeneration === generation.current) await loadUserData();
        }} />}
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
            onRemoveFromProfile={handleRemoveFromProfile}
            onToggleActive={(id, current) => { void handleToggleLinkActive(id, current).catch((e) => showToast(e.message)); }}
            onDuplicateBlock={(link) => { void handleDuplicateBusinessBlock(link).catch((e) => showToast(e.message)); }}
            onEditLink={(link) => { if (isBusinessBlock(link.block_type)) setBusinessEditor({ kind: link.block_type, link }); else setEditingLink(link); }}
            onToast={showToast}
          />
        )}

        {currentTab === 'links' && (
          <LinksScreen
            links={links.filter((link) => !isContentBlock(link.block_type) && link.destination_url !== '#')}
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
      {businessEditor && <BusinessBlockSheet key={businessEditor.link?.id || businessEditor.kind} kind={businessEditor.kind} link={businessEditor.link} industry={profile.business?.industry || 'fnb'} onClose={() => setBusinessEditor(null)} onSave={async (title, data_json, id) => {
        if (id) await handleUpdateLink(id, { title, data_json });
        else await handleCreateLink({ title, data_json, block_type: data_json.kind, destination_url: '#', is_bio_entry: true });
      }} />}
      <AddLinkSheet
        isOpen={activeSheet === 'add_link'}
        onClose={() => setActiveSheet(null)}
        onCreateLink={handleCreateLink}
        defaultBlockType={addLinkDefaultBlock}
      />

      <AddBlockSheet
        isOpen={activeSheet === 'add_block'}
        onClose={() => setActiveSheet(null)}
        onSelectBusinessBlock={(kind) => { setActiveSheet(null); setBusinessEditor({ kind }); }}
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
