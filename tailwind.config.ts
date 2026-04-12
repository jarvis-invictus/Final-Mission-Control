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
          50: '#fefaf0',
          100: '#fdf0d0',
          200: '#fbe0a1',
          300: '#f9d072',
          400: '#D4A853',
          500: '#B8932E',
          600: '#9A7A22',
          700: '#7C6218',
          800: '#5E490F',
          900: '#3F3108',
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
