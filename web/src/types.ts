export type BioBlockType = 'link' | 'featured' | 'header' | 'whatsapp';

export interface LinkItem {
  id: string;
  slug: string;
  destination_url: string;
  ios_url?: string;
  android_url?: string;
  title?: string;
  clicks: number;
  is_bio_entry: boolean | number;
  sort_order: number;
  is_active: boolean | number;
  block_type?: BioBlockType;
  created_at?: number;
}

export interface LinkAnalytics {
  total_clicks: number;
  by_date: { date: string; clicks: number }[];
  by_country: { country: string; clicks: number }[];
}

export interface BioProfile {
  handle: string;
  display_name: string;
  bio: string;
  avatar_url?: string;
  theme: string;
  avatar_shape?: 'circle' | 'squircle' | 'rounded';
  verified_badge?: boolean;
  social_links?: {
    whatsapp?: string;
    instagram?: string;
    tiktok?: string;
    youtube?: string;
    twitter?: string;
    github?: string;
    website?: string;
  };
}

export interface AuthSession {
  id: string;
  email: string;
  is_guest: boolean;
  handle: string;
  display_name: string;
  api_key?: string;
}

export interface ApiResponse<T> {
  status: 'success' | 'error';
  data?: T;
  message?: string;
}
