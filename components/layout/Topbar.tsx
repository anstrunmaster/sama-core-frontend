'use client'
import { useAuth } from '@/hooks/useAuth'
import { Badge } from '@/components/ui/Badge'

interface TopbarProps { title: string; subtitle?: string; actions?: React.ReactNode }

export function Topbar({ title, subtitle, actions }: TopbarProps) {
  const { user } = useAuth()
  return (
    <header
      className="h-[56px] shrink-0 sticky top-0 z-10 flex items-center justify-between px-6
        bg-[var(--body-bg)]/90 backdrop-blur-sm border-b border-edge-subtle"
    >
      <div>
        <h1 className="text-[15px] font-semibold text-ink-primary leading-none">{title}</h1>
        {subtitle && <p className="text-xs text-ink-tertiary mt-0.5">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-3">
        {actions}
        {user?.name && (
          <span className="text-xs text-ink-ghost font-mono hidden sm:block">{user.email}</span>
        )}
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-700
          flex items-center justify-center text-xs font-bold text-white shrink-0">
          {(user?.name ?? user?.email ?? '?')[0]?.toUpperCase()}
        </div>
      </div>
    </header>
  )
}
