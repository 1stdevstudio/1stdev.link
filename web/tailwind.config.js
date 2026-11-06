/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#f7f9f7',
        s1: '#ffffff',
        s2: '#edf3ef',
        in: '#f0f5f1',
        tx: '#17362d',
        tx2: '#52695e',
        tx3: '#64786e',
        ac: '#18765d',
        ink: '#ffffff',
        ok: '#167a50',
        warn: '#a65e0b',
      },
      borderRadius: {
        r1: '10px',
        r2: '14px',
        r3: '20px',
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
        sans: ['DM Sans', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'sans-serif'],
        dmsans: ['DM Sans', 'Inter', 'system-ui', 'sans-serif'],
        serif: ['Instrument Serif', 'Georgia', 'serif'],
      },
      boxShadow: {
        ring: '0 0 0 3px rgba(24, 118, 93, 0.24)',
      },
    },
  },
  plugins: [],
};
