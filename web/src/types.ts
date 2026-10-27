export type BioBlockType =
  | 'link'
  | 'featured'
  | 'header'
  | 'whatsapp'
  | 'image'
  | 'gallery'
  | 'video'
  | 'text'
  | 'social'
  | 'divider';

export interface BioBlockStyle {
  fx?: 'shimmer' | 'pulse' | 'wobble' | 'tilt' | 'zoom' | 'bw_to_color' | 'none';
  thumb_url?: string;
  image_url?: string;
  ratio?: '1:1' | '4:5' | '16:9' | '3:1';
  images?: string[];
}

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
  style?: BioBlockStyle | string;
  created_at?: number;
}

export interface LinkAnalytics {
  total_clicks: number;
  by_date: { date: string; clicks: number }[];
  by_country: { country: string; clicks: number }[];
}

export interface BioProfileStyle {
  bg?: 'dark' | 'light' | 'gradient' | 'custom' | 'image';
  accent?: string;
  font?: 'modern' | 'classic' | 'mono' | 'rounded';
  btn?: 'soft' | 'solid' | 'glass' | 'outline' | 'shadow';
  radius?: number; // 0 - 28px
  gap?: number; // 8 - 24px
  enter?: 'none' | 'fade' | 'slide' | 'bounce';
  hover?: 'none' | 'lift' | 'glow' | 'press';
  bgfx?: string[]; // ['grain', 'aurora']
  cover_url?: string;
  av_shape?: 'circle' | 'squircle' | 'rounded';
  ring?: boolean;
  bg_color?: string;
  bg_gradient?: string;
  bg_image?: string;
  bg_blur?: number;
  bg_dim?: number;
}

export interface BioProfile {
  handle: string;
  display_name: string;
  bio: string;
  avatar_url?: string;
  theme: string;
  avatar_shape?: 'circle' | 'squircle' | 'rounded';
  verified_badge?: boolean;
  style?: BioProfileStyle;
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
