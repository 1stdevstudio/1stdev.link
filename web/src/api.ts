import { LinkItem, LinkAnalytics, BioProfile, AuthSession, ApiResponse } from './types';

const STORAGE_LINKS = 'edgelink_mock_links';
const STORAGE_PROFILE = 'edgelink_mock_profile';

const INITIAL_LINKS: LinkItem[] = [
  {
    id: 'lnk_01HXYZ1234567890',
    slug: 'mastery',
    destination_url: 'https://spixels.id/products/mastery',
    title: 'Mastery Course',
    clicks: 1420,
    is_bio_entry: 1,
    sort_order: 1,
    is_active: 1,
    created_at: 1772188800,
  },
  {
    id: 'lnk_01HXYZ2345678901',
    slug: 'gh',
    destination_url: 'https://github.com/spixels',
    title: 'Personal GitHub',
    clicks: 840,
    is_bio_entry: 1,
    sort_order: 2,
    is_active: 1,
    created_at: 1772190000,
  },
  {
    id: 'lnk_01HXYZ3456789012',
    slug: 'promo-2026',
    destination_url: 'https://edgelink.id/summer-sale',
    title: 'Summer Launch Sale',
    clicks: 312,
    is_bio_entry: 0,
    sort_order: 0,
    is_active: 1,
    created_at: 1772195000,
  },
];

const INITIAL_PROFILE: BioProfile = {
  handle: 'yogi',
  display_name: 'Yogi Iskandar',
  bio: 'Security Researcher & Architect. Building ultra-light edge systems.',
  avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
  theme: 'minimal-dark',
  social_links: {
    github: 'https://github.com/spixels',
    twitter: 'https://x.com/spixels',
    website: 'https://spixels.id',
  },
};

function getMockLinks(): LinkItem[] {
  const data = localStorage.getItem(STORAGE_LINKS);
  if (!data) {
    localStorage.setItem(STORAGE_LINKS, JSON.stringify(INITIAL_LINKS));
    return INITIAL_LINKS;
  }
  try {
    return JSON.parse(data);
  } catch {
    return INITIAL_LINKS;
  }
}

function saveMockLinks(links: LinkItem[]) {
  localStorage.setItem(STORAGE_LINKS, JSON.stringify(links));
}

function getMockProfile(): BioProfile {
  const data = localStorage.getItem(STORAGE_PROFILE);
  if (!data) {
    localStorage.setItem(STORAGE_PROFILE, JSON.stringify(INITIAL_PROFILE));
    return INITIAL_PROFILE;
  }
  try {
    return JSON.parse(data);
  } catch {
    return INITIAL_PROFILE;
  }
}

function saveMockProfile(profile: BioProfile) {
  localStorage.setItem(STORAGE_PROFILE, JSON.stringify(profile));
}

export class ApiClient {
  private baseUrl: string;
  private useMock: boolean;

  constructor() {
    this.baseUrl = import.meta.env.VITE_API_URL || '';
    // Auto mock mode if running in dev without backend or localStorage flag
    this.useMock = import.meta.env.VITE_USE_MOCK === 'true' || !this.baseUrl;
  }

  setMockMode(enable: boolean) {
    this.useMock = enable;
  }

  isMockMode(): boolean {
    return this.useMock;
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const token = localStorage.getItem('edgelink_token') || 'edgelink_live_secret_key';
    const res = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: res.statusText }));
      throw new Error(err.message || `HTTP ${res.status}`);
    }

    return res.json();
  }

  // Session & Guest Onboarding
  hasSessionToken(): boolean {
    return Boolean(localStorage.getItem('edgelink_token'));
  }

  async getExistingSession(): Promise<AuthSession | null> {
    if (this.useMock) {
      const has = localStorage.getItem('edgelink_token');
      if (has) {
        return {
          id: 'usr_mock_123',
          email: 'creator@edgelink.local',
          is_guest: true,
          handle: 'creator',
          display_name: 'Edge Creator',
          api_key: has,
        };
      }
      return null;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const syncKey = urlParams.get('sync_key');
    if (syncKey) {
      localStorage.setItem('edgelink_token', syncKey);
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    const existingToken = localStorage.getItem('edgelink_token');
    if (!existingToken) return null;

    try {
      const me = await this.request<ApiResponse<AuthSession>>('/api/auth/me');
      return me.data || null;
    } catch {
      localStorage.removeItem('edgelink_token');
      return null;
    }
  }

  logout(): void {
    localStorage.removeItem('edgelink_token');
  }

  async initSession(): Promise<AuthSession> {
    if (this.useMock) {
      return {
        id: 'usr_mock_123',
        email: 'creator@edgelink.local',
        is_guest: true,
        handle: 'creator',
        display_name: 'Edge Creator',
      };
    }

    // Check URL query sync_key (instant cross-device link / QR scan)
    const urlParams = new URLSearchParams(window.location.search);
    const syncKey = urlParams.get('sync_key');
    if (syncKey) {
      localStorage.setItem('edgelink_token', syncKey);
      // Clean URL without refresh
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    const existingToken = localStorage.getItem('edgelink_token');
    if (existingToken) {
      try {
        const me = await this.request<ApiResponse<AuthSession>>('/api/auth/me');
        if (me.data) return me.data;
      } catch {
        // Token invalid, proceed to create guest
      }
    }

    // Auto-create guest workspace
    const res = await fetch(`${this.baseUrl}/api/auth/guest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    const data: any = await res.json();
    if (data.status === 'success' && data.data?.api_key) {
      localStorage.setItem('edgelink_token', data.data.api_key);
      return {
        id: data.data.user_id,
        email: 'guest@edgelink.local',
        is_guest: true,
        handle: data.data.handle,
        display_name: `Creator ${data.data.handle}`,
        api_key: data.data.api_key,
      };
    }

    throw new Error('Failed to initialize workspace');
  }

  async login(credential: string): Promise<AuthSession> {
    if (this.useMock) {
      return {
        id: 'usr_mock_123',
        email: credential,
        is_guest: false,
        handle: 'creator',
        display_name: 'Edge Creator',
      };
    }

    const res = await fetch(`${this.baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential }),
    });

    const data: any = await res.json();
    if (!res.ok || data.status !== 'success') {
      throw new Error(data.message || 'Login failed');
    }

    localStorage.setItem('edgelink_token', data.data.api_key);
    return {
      id: data.data.user_id,
      email: data.data.email,
      is_guest: data.data.is_guest,
      handle: data.data.handle,
      display_name: data.data.display_name,
      api_key: data.data.api_key,
    };
  }

  async sendOtp(email: string, purpose: 'claim' | 'login'): Promise<{ message: string; dev_code?: string }> {
    if (this.useMock) {
      return { message: 'Verification code sent', dev_code: '123456' };
    }
    const token = localStorage.getItem('edgelink_token') || '';
    const res = await fetch(`${this.baseUrl}/api/auth/send-otp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ email, purpose }),
    });
    const data: any = await res.json();
    if (!res.ok || data.status !== 'success') {
      throw new Error(data.message || 'Failed to send verification code');
    }
    return { message: data.message, dev_code: data.dev_code };
  }

  async verifyOtp(email: string, code: string, purpose: 'claim' | 'login'): Promise<AuthSession> {
    if (this.useMock) {
      return {
        id: 'usr_mock_123',
        email,
        is_guest: false,
        handle: 'creator',
        display_name: 'Edge Creator',
      };
    }
    const token = localStorage.getItem('edgelink_token') || '';
    const res = await fetch(`${this.baseUrl}/api/auth/verify-otp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ email, code, purpose }),
    });
    const data: any = await res.json();
    if (!res.ok || data.status !== 'success') {
      throw new Error(data.message || 'Verification failed');
    }
    if (data.data?.api_key) {
      localStorage.setItem('edgelink_token', data.data.api_key);
    }
    return {
      id: data.data.user_id,
      email: data.data.email,
      is_guest: data.data.is_guest,
      handle: data.data.handle,
      display_name: data.data.display_name || data.data.handle,
      api_key: data.data.api_key,
    };
  }

  async claimAccount(email: string): Promise<void> {
    if (this.useMock) {
      return;
    }
    await this.request('/api/auth/claim', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  // Links CRUD
  async getLinks(filter?: 'bio' | 'shortlink'): Promise<LinkItem[]> {
    if (this.useMock) {
      await new Promise((r) => setTimeout(r, 60));
      let links = getMockLinks();
      if (filter === 'bio') {
        links = links.filter((l) => Boolean(l.is_bio_entry));
      } else if (filter === 'shortlink') {
        links = links.filter((l) => !l.is_bio_entry);
      }
      return [...links].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    }

    const query = filter ? `?filter=${filter}` : '';
    const res = await this.request<ApiResponse<LinkItem[]>>(`/api/links${query}`);
    return res.data || [];
  }

  async createLink(payload: {
    destination_url: string;
    slug?: string;
    title?: string;
    is_bio_entry?: boolean;
    sort_order?: number;
    ios_url?: string;
    android_url?: string;
  }): Promise<LinkItem> {
    if (this.useMock) {
      await new Promise((r) => setTimeout(r, 80));
      const links = getMockLinks();
      const slug = payload.slug?.trim() || Math.random().toString(36).substring(2, 8);
      
      if (links.some((l) => l.slug.toLowerCase() === slug.toLowerCase())) {
        throw new Error(`Slug '${slug}' already in use.`);
      }

      const newLink: LinkItem = {
        id: `lnk_${Date.now().toString(36)}`,
        slug,
        destination_url: payload.destination_url,
        ios_url: payload.ios_url,
        android_url: payload.android_url,
        title: payload.title || slug,
        clicks: 0,
        is_bio_entry: payload.is_bio_entry ? 1 : 0,
        sort_order: payload.sort_order ?? links.length + 1,
        is_active: 1,
        created_at: Math.floor(Date.now() / 1000),
      };

      links.unshift(newLink);
      saveMockLinks(links);
      return newLink;
    }

    const res = await this.request<ApiResponse<LinkItem>>('/api/links', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res.data!;
  }

  async toggleLinkActive(id: string, is_active: boolean): Promise<void> {
    if (this.useMock) {
      const links = getMockLinks().map((l) =>
        l.id === id ? { ...l, is_active: is_active ? 1 : 0 } : l
      );
      saveMockLinks(links);
      return;
    }

    await this.request(`/api/links/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ is_active: is_active ? 1 : 0 }),
    });
  }

  async updateLink(
    id: string,
    patch: { title?: string; destination_url?: string; block_type?: import('./types').BioBlockType }
  ): Promise<void> {
    if (this.useMock) {
      saveMockLinks(getMockLinks().map((l) => (l.id === id ? { ...l, ...patch } : l)));
      return;
    }

    await this.request(`/api/links/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    });
  }

  async updateLinkOrder(items: { id: string; sort_order: number }[]): Promise<void> {
    if (this.useMock) {
      const links = getMockLinks();
      const map = new Map(items.map((i) => [i.id, i.sort_order]));
      const updated = links.map((l) => (map.has(l.id) ? { ...l, sort_order: map.get(l.id)! } : l));
      saveMockLinks(updated);
      return;
    }

    await this.request('/api/links/reorder', {
      method: 'PUT',
      body: JSON.stringify({ items }),
    });
  }

  async deleteLink(id: string): Promise<void> {
    if (this.useMock) {
      const links = getMockLinks().filter((l) => l.id !== id);
      saveMockLinks(links);
      return;
    }

    await this.request(`/api/links/${id}`, {
      method: 'DELETE',
    });
  }

  async updateLinkBlockType(id: string, blockType: import('./types').BioBlockType): Promise<void> {
    if (this.useMock) {
      const links = getMockLinks();
      const updated = links.map((l) => (l.id === id ? { ...l, block_type: blockType } : l));
      saveMockLinks(updated);
      return;
    }

    await this.request(`/api/links/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ block_type: blockType }),
    });
  }

  // Analytics
  async getLinkAnalytics(linkId: string, _range: '7d' | '30d' = '7d'): Promise<LinkAnalytics> {
    if (this.useMock) {
      await new Promise((r) => setTimeout(r, 90));
      return {
        total_clicks: 1420,
        by_date: [
          { date: '2026-10-21', clicks: 120 },
          { date: '2026-10-22', clicks: 180 },
          { date: '2026-10-23', clicks: 210 },
          { date: '2026-10-24', clicks: 150 },
          { date: '2026-10-25', clicks: 310 },
          { date: '2026-10-26', clicks: 450 },
        ],
        by_country: [
          { country: 'ID', clicks: 920 },
          { country: 'SG', clicks: 230 },
          { country: 'US', clicks: 140 },
          { country: 'MY', clicks: 80 },
          { country: 'JP', clicks: 50 },
        ],
      };
    }

    const res = await this.request<ApiResponse<LinkAnalytics>>(`/api/links/${linkId}/analytics?range=${_range}`);
    return res.data!;
  }

  // Bio Profile
  async getBioProfile(): Promise<BioProfile> {
    if (this.useMock) {
      return getMockProfile();
    }

    const res = await this.request<ApiResponse<BioProfile>>('/api/bio-profile');
    return res.data!;
  }

  async updateBioProfile(profile: Partial<BioProfile>): Promise<BioProfile> {
    if (this.useMock) {
      const current = getMockProfile();
      const updated = { ...current, ...profile };
      saveMockProfile(updated);
      return updated;
    }

    const res = await this.request<ApiResponse<BioProfile>>('/api/bio-profile', {
      method: 'PUT',
      body: JSON.stringify(profile),
    });
    return res.data!;
  }
}

export const api = new ApiClient();
