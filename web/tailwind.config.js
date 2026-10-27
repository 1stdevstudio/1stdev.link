/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#07080c',
        s1: 'rgba(255, 255, 255, 0.04)',
        s2: 'rgba(255, 255, 255, 0.07)',
        in: 'rgba(255, 255, 255, 0.09)',
        tx: '#f2f3f7',
        tx2: '#b4b8c5',
        tx3: '#8b90a0',
        ac: '#7c8cff',
        ink: '#0b0d16',
        ok: '#4ade80',
        warn: '#fbbf24',
      },
      borderRadius: {
        r1: '4px',
        r2: '6px',
        r3: '8px',
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        ring: '0 0 0 3px rgba(124, 140, 255, 0.55)',
      },
    },
  },
  plugins: [],
};
