import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: '#09090b',
        surface: '#111113',
        'surface-2': '#18181b',
        border: 'rgba(255,255,255,0.07)',
        'border-2': 'rgba(255,255,255,0.12)',
        text: '#fafafa',
        muted: '#71717a',
        'muted-2': '#52525b',
        accent: '#6366f1',
        'accent-glow': 'rgba(99,102,241,0.15)',
        ok: '#22c55e',
        err: '#ef4444',
        warn: '#f59e0b',
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Courier New', 'monospace'],
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
}

export default config
