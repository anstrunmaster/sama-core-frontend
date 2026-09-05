import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Outfit', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        // Tokens que cambian con el tema (apuntan a variables CSS de globals.css)
        surface: {
          DEFAULT: 'var(--surface)',
          raised:  'var(--surface-raised)',
          overlay: 'var(--surface-overlay)',
        },
        edge: {
          subtle:  'var(--edge-subtle)',
          DEFAULT: 'var(--edge)',
          strong:  'var(--edge-strong)',
        },
        ink: {
          primary:   'var(--ink-primary)',
          secondary: 'var(--ink-secondary)',
          tertiary:  'var(--ink-tertiary)',
          ghost:     'var(--ink-ghost)',
        },
        // Acentos (mismo color en ambos modos, solo cambia el fondo donde se usan)
        blue: {
          DEFAULT: 'var(--blue)',
          hover:   'var(--blue-hover)',
          muted:   'var(--blue-muted)',
          glow:    'var(--blue-glow)',
        },
        // Estos NO cambian con el tema (siempre el mismo color, semántica de estado)
        green: { DEFAULT: '#22C55E', muted: 'rgba(34,197,94,0.12)' },
        amber: { DEFAULT: '#F59E0B', muted: 'rgba(245,158,11,0.12)' },
        red:   { DEFAULT: '#EF4444', muted: 'rgba(239,68,68,0.12)' },
      },
      keyframes: {
        'fade-up': { from: { opacity: '0', transform: 'translateY(8px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        shimmer:   { from: { backgroundPosition: '-600px 0' }, to: { backgroundPosition: '600px 0' } },
      },
      animation: {
        'fade-up': 'fade-up 0.28s cubic-bezier(0.16,1,0.3,1) both',
        'fade-in': 'fade-in 0.2s ease both',
        shimmer:   'shimmer 1.8s linear infinite',
      },
    },
  },
  plugins: [],
}
export default config
