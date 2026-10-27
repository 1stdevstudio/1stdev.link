export interface Env {
  DB: D1Database;
  KV: KVNamespace;
  ENVIRONMENT?: string;
  BASE_URL?: string;
  TURNSTILE_SECRET_KEY?: string;
  RESEND_API_KEY?: string;
}

export interface OtpRecord {
  code: string;
  attempts: number;
  purpose: 'claim' | 'login';
  created_at: number;
  user_id?: string;
}

export interface User {
  id: string;
  email: string;
  api_key?: string;
  is_guest?: number;
  claim_token?: string;
  created_at: number;
  updated_at: number;
}

export interface BioProfile {
  user_id: string;
  handle: string;
  display_name: string;
  bio?: string;
  avatar_url?: string;
  social_links?: string; // JSON string e.g. {"github":"...","twitter":"..."}
  theme?: string;
  avatar_shape?: string;
  verified_badge?: number;
  updated_at: number;
}

export interface Link {
  id: string;
  user_id: string;
  slug: string;
  destination_url: string;
  ios_url?: string;
  android_url?: string;
  title?: string;
  is_bio_entry: number;
  sort_order: number;
  is_active: number;
  block_type?: string;
  created_at: number;
}

export interface LinkAnalytics {
  link_id: string;
  date: string; // YYYY-MM-DD
  country: string; // 2-letter ISO code
  clicks: number;
}

export interface CachedSlug {
  id: string;
  url: string;
  ios_url?: string;
  android_url?: string;
}

export interface CachedBioProfile {
  profile: BioProfile;
  links: Link[];
}
