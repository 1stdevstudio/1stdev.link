import { defaultBusinessData, isContentBlock, BLOCK_LABELS, CATALOG_LABELS, type Industry, type BusinessData } from '../../shared/business';
import { LinkItem, LinkAnalytics, AnalyticsSummary, BioProfile, AuthSession, ApiResponse } from './types';

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
  private sessionRequest?: Promise<AuthSession | null>;

  constructor() {
    const envBase = import.meta.env.VITE_API_URL || '';
    // Dashboard yang disajikan Worker (1stdev.link, link.1stnear.com) memanggil API di origin sendiri:
    // CSP Worker hanya mengizinkan connect-src 'self'. pages.dev tetap memakai VITE_API_URL.
    const servedByWorker = /^(www\.)?1stdev\.link$|^link\.1stnear\.com$/.test(window.location.hostname);
    this.baseUrl = servedByWorker ? window.location.origin : envBase;
    // Auto mock mode if running in dev without backend or localStorage flag
    this.useMock = import.meta.env.DEV && import.meta.env.VITE_USE_MOCK === 'true';
  }

  setMockMode(enable: boolean) {
    this.useMock = enable;
  }

  isMockMode(): boolean {
    return this.useMock;
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const token = localStorage.getItem('edgelink_token');
    const res = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: res.statusText }));
      throw Object.assign(new Error(err.message || `HTTP ${res.status}`), { status: res.status });
    }

    return res.json();
  }

  /** Upload media (avatar, cover, background) dalam byte gambar teroptimasi. */
  async uploadMedia(image: Blob, type: 'avatar' | 'cover' | 'background' = 'avatar'): Promise<string> {
    if (this.useMock) {
      return await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(String(r.result));
        r.onerror = () => reject(new Error('Could not read image'));
        r.readAsDataURL(image);
      });
    }
    const res = await this.request<{ data: { url: string } }>(`/api/media/${type}`, {
      method: 'POST',
      body: image,
      headers: { 'Content-Type': image.type || 'application/octet-stream' },
    });
    return res.data.url;
  }

  /** Upload foto profil (kompatibilitas mundur). */
  async uploadAvatar(image: Blob): Promise<string> {
    return this.uploadMedia(image, 'avatar');
  }

  // Session & Guest Onboarding
  hasSessionToken(): boolean {
    return Boolean(localStorage.getItem('edgelink_token'));
  }

  getExistingSession(): Promise<AuthSession | null> {
    if (!this.sessionRequest) {
      this.sessionRequest = this.restoreSession().finally(() => { this.sessionRequest = undefined; });
    }
    return this.sessionRequest;
  }

  private async restoreSession(): Promise<AuthSession | null> {
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
    // Sesi yang dibawa dari domain lama (lihat main.tsx). Kode sekali pakai, hapus dari URL segera.
    const handoff = urlParams.get('handoff');
    if (handoff) {
      window.history.replaceState({}, document.title, window.location.pathname);
      try {
        const res = await fetch(`${this.baseUrl}/api/auth/handoff/claim`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: handoff }),
        });
        const body = await res.json().catch(() => null);
        if (res.ok && body?.data?.api_key) localStorage.setItem('edgelink_token', body.data.api_key);
      } catch {
        /* kode kedaluwarsa: lanjut seperti biasa, pengguna bisa masuk lagi */
      }
    }

    const existingToken = localStorage.getItem('edgelink_token');
    if (!existingToken) return null;

    try {
      const me = await this.request<ApiResponse<AuthSession>>('/api/auth/me');
      return me.data || null;
    } catch (error) {
      if ((error as { status?: number }).status !== 401) throw error;
      if (localStorage.getItem('edgelink_token') === existingToken) localStorage.removeItem('edgelink_token');
      return null;
    }
  }

  /** Minta kode sekali pakai untuk membawa sesi ini ke domain utama. */
  async createHandoff(): Promise<string> {
    const res = await this.request<ApiResponse<{ code: string }>>('/api/auth/handoff', { method: 'POST' });
    if (!res.data?.code) throw new Error('handoff_failed');
    return res.data.code;
  }

  logout(): void {
    sessionStorage.removeItem('edgelink_admin_stepup');
    localStorage.removeItem('edgelink_token');
  }

  async initSession(): Promise<AuthSession> {
    if (this.useMock) {
      localStorage.setItem('edgelink_token', 'dev_mock_session');
      return {
        api_key: 'dev_mock_session',
        id: 'usr_mock_123',
        email: 'creator@edgelink.local',
        is_guest: true,
        handle: 'creator',
        display_name: 'Edge Creator',
      };
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

  private getAdminToken(): string {
    try {
      const raw = sessionStorage.getItem('edgelink_admin_stepup');
      if (!raw) return '';
      const saved = JSON.parse(raw) as { token: string; expires_at: number; key: string };
      const currentKey = localStorage.getItem('edgelink_token') || '';
      if (saved.key !== currentKey || saved.expires_at <= Date.now() / 1000) {
        sessionStorage.removeItem('edgelink_admin_stepup');
        return '';
      }
      return saved.token;
    } catch { return ''; }
  }

  private adminRequest<T>(path: string): Promise<T> {
    const token = this.getAdminToken();
    return this.request<T>(path, { headers: { 'X-Admin-Session': token } });
  }

  async isAdmin(): Promise<boolean> {
    if (this.useMock) return false;
    const result = await this.request<{ data: { is_admin: boolean } }>('/api/admin/status');
    return Boolean(result.data.is_admin);
  }

  async sendAdminOtp(): Promise<void> {
    await this.request('/api/admin/otp', { method: 'POST', body: '{}' });
  }

  async verifyAdminOtp(code: string): Promise<void> {
    const result = await this.request<{ data: { admin_token: string; expires_at: number } }>(
      '/api/admin/otp/verify', { method: 'POST', body: JSON.stringify({ code }) }
    );
    sessionStorage.setItem('edgelink_admin_stepup', JSON.stringify({
      token: result.data.admin_token,
      expires_at: result.data.expires_at,
      key: localStorage.getItem('edgelink_token') || ''
    }));
  }

  async getAdminOverview(): Promise<import('./types').AdminOverview> {
    const result = await this.adminRequest<{ data: import('./types').AdminOverview }>('/api/admin/overview');
    return result.data;
  }

  async getAdminUsers(status: 'all' | 'guest' | 'verified', q: string, offset: number): Promise<import('./types').AdminUserPage> {
    const params = new URLSearchParams({ status, q, offset: String(offset) });
    const result = await this.adminRequest<{ data: import('./types').AdminUserPage }>('/api/admin/users?' + params.toString());
    return result.data;
  }

  async getAdminUserLinks(userId: string): Promise<import('./types').AdminUserLink[]> {
    const result = await this.adminRequest<{ data: { links: import('./types').AdminUserLink[] } }>(
      '/api/admin/users/' + encodeURIComponent(userId) + '/links'
    );
    return result.data.links;
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

    const token = localStorage.getItem('edgelink_token');
    const collected = new Map<string, LinkItem>();
    for (let page = 1; page <= 100; page++) {
      if (token !== localStorage.getItem('edgelink_token')) throw new Error('Session changed');
      const query = new URLSearchParams({ limit: '100', page: String(page), ...(filter ? { filter } : {}) });
      const res = await this.request<ApiResponse<LinkItem[]>>(`/api/links?${query}`);
      const rows = res.data || [];
      for (const row of rows) collected.set(row.id, row);
      if (rows.length < 100) return [...collected.values()];
    }
    throw new Error('Too many links to load. Please contact support.');
  }

  async createLink(payload: {
    destination_url: string;
    block_type?: import('./types').BioBlockType;
    data_json?: BusinessData;
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
        id: `lnk_${crypto.randomUUID()}`,
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
        block_type: payload.block_type,
        data_json: payload.data_json,
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
    patch: { title?: string; destination_url?: string; block_type?: import('./types').BioBlockType; data_json?: BusinessData | string; is_bio_entry?: boolean | number }
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

  // One tenant aggregate: totals include all links, ranking is bounded by the server.
  async getAnalyticsSummary(range: '7d' | '30d' = '7d'): Promise<AnalyticsSummary> {
    if (this.useMock) {
      const links = getMockLinks().filter((link) => !isContentBlock(link.block_type) && link.destination_url !== '#');
      const total = links.reduce((sum, link) => sum + link.clicks, 0);
      return {
        total_clicks: total,
        by_date: [{ date: new Date().toISOString().slice(0, 10), clicks: total }],
        by_country: total ? [{ country: 'ID', clicks: total }] : [],
        by_link: [...links].sort((a, b) => b.clicks - a.clicks).slice(0, 20).map(({ id, slug, title, clicks }) => ({ id, slug, title, clicks })),
        active_links: links.filter((link) => link.is_active).length,
      };
    }
    const res = await this.request<ApiResponse<AnalyticsSummary>>(`/api/analytics/summary?range=${range}`);
    return res.data!;
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

  async applyBusinessPreset(industry: Industry): Promise<void> {
    if (this.useMock) {
      const links = getMockLinks();
      for (const kind of ['catalog', 'business_info', 'location', 'contact'] as const) {
        if (links.some((l) => l.is_bio_entry && l.block_type === kind)) continue;
        links.push({ id: `lnk_${crypto.randomUUID()}`, slug: crypto.randomUUID(), destination_url: '#', title: kind === 'catalog' ? CATALOG_LABELS[industry] : BLOCK_LABELS[kind], block_type: kind, data_json: defaultBusinessData(kind, industry), is_bio_entry: 1, is_active: 1, sort_order: Math.max(0, ...links.map((l) => l.sort_order)) + 1, clicks: 0 });
      }
      saveMockLinks(links); return;
    }
    await this.request('/api/business/preset', { method: 'POST', body: JSON.stringify({ industry }) });
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
