export function readObject(raw: unknown): Record<string, any> {
  try {
    const value = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  } catch { return {}; }
}
export function socialLinks(raw: unknown): Record<string, string> {
  return Object.fromEntries(Object.entries(readObject(raw)).filter((entry): entry is [string, string] =>
    typeof entry[1] === 'string' && /^(https?:\/\/|mailto:)/i.test(entry[1].trim())
  ));
}

export const THEME_STYLES: Record<
  string,
  { bg: string; text: string; subtext: string; cardBg: string; cardText: string; featBg: string; featText: string }
> = {
  '1stnear': {
    bg: '#070e0c',
    text: '#e8efea',
    subtext: '#a9b8b0',
    cardBg: 'rgba(232, 239, 234, 0.07)',
    cardText: '#e8efea',
    featBg: '#e9be54',
    featText: '#182822',
  },
  obsidian: {
    bg: '#07080c',
    text: '#f2f3f7',
    subtext: '#8b90a0',
    cardBg: 'rgba(255, 255, 255, 0.06)',
    cardText: '#f2f3f7',
    featBg: '#7c8cff',
    featText: '#0b0d16',
  },
  'clean-paper': {
    bg: '#f4f4f2',
    text: '#111111',
    subtext: '#5f6368',
    cardBg: 'rgba(0, 0, 0, 0.05)',
    cardText: '#111111',
    featBg: '#111111',
    featText: '#ffffff',
  },
  'aurora-emerald': {
    bg: '#06140f',
    text: '#e6f7f0',
    subtext: '#6ee7b7',
    cardBg: 'rgba(16, 185, 129, 0.1)',
    cardText: '#e6f7f0',
    featBg: '#10b981',
    featText: '#042217',
  },
  'midnight-neon': {
    bg: '#0b0f19',
    text: '#f1f5f9',
    subtext: '#94a3b8',
    cardBg: 'rgba(168, 85, 247, 0.12)',
    cardText: '#f1f5f9',
    featBg: '#a855f7',
    featText: '#ffffff',
  },
  'cyber-matrix': {
    bg: '#0a121e',
    text: '#f0f6fc',
    subtext: '#93c5fd',
    cardBg: 'rgba(56, 189, 248, 0.08)',
    cardText: '#f0f6fc',
    featBg: '#38bdf8',
    featText: '#031424',
  },
  'rose-gold': {
    bg: '#14090d',
    text: '#fdf2f8',
    subtext: '#f472b6',
    cardBg: 'rgba(244, 114, 182, 0.12)',
    cardText: '#fdf2f8',
    featBg: '#f472b6',
    featText: '#1f0914',
  },
};

