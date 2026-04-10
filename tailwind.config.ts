import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#e6fff2',
          100: '#b3ffe0',
          200: '#80ffcc',
          300: '#4dffb8',
          400: '#00ff88',
          500: '#00cc6a',
          600: '#00994f',
          700: '#006636',
          800: '#00331b',
          900: '#001a0e',
        },
        surface: {
          0: '#050508',
          1: '#0a0a0f',
          2: '#111118',
          3: '#18181f',
          4: '#1f1f28',
          5: '#262630',
        },
        accent: {
          cyan: '#06B6D4',
          purple: '#D946EF',
          orange: '#F97316',
        },
        success: '#22c55e',
        warning: '#f59e0b',
        danger: '#ef4444',
        info: '#06B6D4',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
};
export default config;
