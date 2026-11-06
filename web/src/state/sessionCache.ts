import type { AuthSession, BioProfile, LinkItem } from '../types';
import type { TabType } from '../components/AppShell';

// Persistensi Cache & Tab Navigation Helper
export const getInitialTab = (): TabType => {
  const hash = window.location.hash.replace('#', '');
  if (hash === 'design' || hash === 'preview' || hash === 'content' || hash === 'profile') return 'profile';
  if (hash === 'home' || hash === 'links' || hash === 'stats' || hash === 'account') return hash as TabType;
  return (localStorage.getItem('edgelink_tab') as TabType) || 'home';
};

export const getCachedSession = (): AuthSession | null => {
  try {
    const token = localStorage.getItem('edgelink_token');
    if (!token) return null;
    const raw = localStorage.getItem('edgelink_cached_session');
    if (raw) {
      const cached = JSON.parse(raw);
      if (cached.api_key === token) return cached;
    }
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

/** Cached UI is editable only when it belongs to the incoming session. */
export const needsSessionRestore = (): boolean => {
  if (new URLSearchParams(window.location.search).has('handoff')) return true;
  const cached = getCachedSession();
  if (!cached) return false;
  try {
    return cached.id === 'usr_standby' || !localStorage.getItem(`edgelink:${cached.id}:profile`);
  } catch { return true; }
};

export const getCachedProfile = (): BioProfile => {
  try {
    const raw = localStorage.getItem(`edgelink:${getCachedSession()?.id}:profile`);
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

export const getCachedLinks = (): LinkItem[] => {
  try {
    const raw = localStorage.getItem(`edgelink:${getCachedSession()?.id}:links`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

