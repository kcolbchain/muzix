import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: '#0a0a0a',
          50: '#fafaf9',
          100: '#f5f1e8',
          200: '#e7e5e4',
          300: '#a8a29e',
          400: '#78716c',
          500: '#57534e',
          600: '#3a3835',
          700: '#26241f',
          800: '#171513',
          900: '#0f0d0a',
          950: '#070605',
        },
        muzix: {
          accent: '#f5c451',
          accentDim: '#8a6e2c',
          signal: '#7dd3fc',
          warn: '#fb923c',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      letterSpacing: {
        tightest: '-0.04em',
      },
    },
  },
  plugins: [],
};

export default config;
