import { Home, UserRound, Scissors, BarChart3 } from 'lucide-react';

/**
 * One source of truth for four primary destinations; settings lives in shortcuts.
 * Desktop, mobile, breadcrumbs and tests use these same IDs/order/labels/icons.
 */
export const WORKSPACE_NAV = [
  { id: 'home', labelId: 'Beranda', labelEn: 'Home', Icon: Home },
  { id: 'profile', labelId: 'Halaman', labelEn: 'Page', Icon: UserRound },
  { id: 'links', labelId: 'Link', labelEn: 'Links', Icon: Scissors },
  { id: 'stats', labelId: 'Statistik', labelEn: 'Stats', Icon: BarChart3 },
] as const;

export type TabType = (typeof WORKSPACE_NAV)[number]['id'] | 'account' | 'admin';
export type WorkspaceNavItem = (typeof WORKSPACE_NAV)[number];
