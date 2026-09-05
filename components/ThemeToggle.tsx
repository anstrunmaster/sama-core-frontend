'use client'

import { useEffect, useState } from 'react'

/**
 * ThemeToggle — botón que alterna entre tema claro y oscuro.
 *
 * Comportamiento:
 *   - Al primer load: usa el tema ya aplicado por el script de layout.tsx
 *     (que respeta localStorage o preferencia del SO).
 *   - Al click: alterna y persiste en localStorage.
 *   - Si el SO cambia de tema mientras el usuario NO eligió manualmente,
 *     se actualiza automáticamente.
 *
 * Diseño minimal: 32x32px, ícono cambia con animación suave.
 *
 * Uso típico:
 *   import { ThemeToggle } from '@/components/ThemeToggle'
 *   <ThemeToggle />
 */
export function ThemeToggle() {
  const [isDark, setIsDark] = useState<boolean>(true)
  const [mounted, setMounted] = useState(false)

  // En el primer render del cliente, sincronizar el state con la clase
  // que ya aplicó el script inline de layout.tsx
  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'))
    setMounted(true)
  }, [])

  // Si el usuario NO eligió manualmente, escuchar cambios del SO
  useEffect(() => {
    if (!mounted) return
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

    const onSystemChange = (e: MediaQueryListEvent) => {
      const userChose = localStorage.getItem('theme')
      if (userChose) return // user override, ignorar SO

      if (e.matches) {
        document.documentElement.classList.add('dark')
        setIsDark(true)
      } else {
        document.documentElement.classList.remove('dark')
        setIsDark(false)
      }
    }

    mediaQuery.addEventListener('change', onSystemChange)
    return () => mediaQuery.removeEventListener('change', onSystemChange)
  }, [mounted])

  const toggle = () => {
    const next = !isDark
    setIsDark(next)
    if (next) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
  }

  // Evitar mismatch de hydration: no render hasta que el cliente sincronice
  if (!mounted) {
    return (
      <button
        type="button"
        aria-label="Cargando tema"
        className="h-9 w-9 rounded-md border border-edge bg-surface-raised"
        disabled
      />
    )
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
      title={isDark ? 'Tema claro' : 'Tema oscuro'}
      className="
        relative h-9 w-9 rounded-md
        border border-edge bg-surface-raised
        text-ink-secondary hover:text-ink-primary
        hover:bg-edge transition-colors
        flex items-center justify-center
        focus:outline-none focus:ring-2 focus:ring-blue/40
      "
    >
      {/* Sun icon — visible en dark mode (clickeable para ir a light) */}
      <SunIcon
        className={`absolute h-[18px] w-[18px] transition-all duration-300 ${
          isDark ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-50'
        }`}
      />
      {/* Moon icon — visible en light mode */}
      <MoonIcon
        className={`absolute h-[18px] w-[18px] transition-all duration-300 ${
          isDark ? 'opacity-0 rotate-90 scale-50' : 'opacity-100 rotate-0 scale-100'
        }`}
      />
    </button>
  )
}

/* ── Icons (inline SVG para no depender de lucide u otra librería) ─────── */

function SunIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="m4.93 4.93 1.41 1.41" />
      <path d="m17.66 17.66 1.41 1.41" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="m6.34 17.66-1.41 1.41" />
      <path d="m19.07 4.93-1.41 1.41" />
    </svg>
  )
}

function MoonIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
    </svg>
  )
}
