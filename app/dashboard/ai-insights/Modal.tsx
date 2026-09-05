'use client'
import { useEffect } from 'react'
import { X } from 'lucide-react'

interface Props {
  open: boolean
  onClose: () => void
  title: string
  subtitle?: string
  icon?: React.ReactNode
  children: React.ReactNode
  /** Acción primaria opcional (botón en el footer). */
  primaryAction?: {
    label: string
    onClick: () => void
    loading?: boolean
    variant?: 'default' | 'danger' | 'success'
  }
}

/**
 * Modal base con animación, click-outside, ESC para cerrar.
 * Usado por RecommendationModal y AnomalyModal.
 */
export function Modal({
  open,
  onClose,
  title,
  subtitle,
  icon,
  children,
  primaryAction,
}: Props) {
  // ESC para cerrar
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  // Bloquear scroll del body
  useEffect(() => {
    if (!open) return
    const original = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = original
    }
  }, [open])

  if (!open) return null

  const variantClasses: Record<string, string> = {
    default: 'bg-blue hover:bg-blue-hover text-white',
    danger:  'bg-red-500/90 hover:bg-red-500 text-white',
    success: 'bg-emerald-500/90 hover:bg-emerald-500 text-white',
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 dark:bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg bg-surface border border-edge rounded-2xl shadow-2xl animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-edge-subtle">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            {icon && <div className="flex-shrink-0">{icon}</div>}
            <div className="flex-1 min-w-0">
              <h2 className="text-base font-semibold text-ink-primary tracking-tight">
                {title}
              </h2>
              {subtitle && (
                <p className="text-xs text-ink-tertiary mt-0.5">{subtitle}</p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-ink-tertiary hover:text-ink-primary hover:bg-edge-subtle transition-all flex-shrink-0"
            aria-label="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 max-h-[60vh] overflow-y-auto">{children}</div>

        {/* Footer (opcional) */}
        {primaryAction && (
          <div className="flex items-center justify-end gap-2 p-4 border-t border-edge-subtle">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-medium text-ink-secondary hover:text-ink-primary hover:bg-edge-subtle transition-all"
            >
              Cerrar
            </button>
            <button
              onClick={primaryAction.onClick}
              disabled={primaryAction.loading}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                variantClasses[primaryAction.variant || 'default']
              }`}
            >
              {primaryAction.loading ? '...' : primaryAction.label}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
