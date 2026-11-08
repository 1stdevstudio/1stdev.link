import { Home, UserRound, Scissors, BarChart3, Settings2 } from 'lucide-react';

/**
 * One source of truth for the authenticated app's five destinations.
 * Desktop, mobile, breadcrumbs and tests use these same IDs/order/labels/icons.
 */
export const WORKSPACE_NAV = [
  { id: 'home', labelId: 'Beranda', labelEn: 'Home', Icon: Home },
  { id: 'profile', labelId: 'Halaman', labelEn: 'Page', Icon: UserRound },
  { id: 'links', labelId: 'Link', labelEn: 'Links', Icon: Scissors },
  { id: 'stats', labelId: 'Statistik', labelEn: 'Stats', Icon: BarChart3 },
  { id: 'account', labelId: 'Pengaturan', labelEn: 'Settings', Icon: Settings2 },
] as const;

export type TabType = (typeof WORKSPACE_NAV)[number]['id'];
export type WorkspaceNavItem = (typeof WORKSPACE_NAV)[number];
