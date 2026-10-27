/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
