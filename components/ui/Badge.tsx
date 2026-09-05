import { cn } from '@/lib/utils'

type V = 'green' | 'red' | 'amber' | 'blue' | 'purple' | 'muted'
const map: Record<V, string> = {
  green: 'badge-green', red: 'badge-red', amber: 'badge-amber',
  blue: 'badge-blue', purple: 'badge-purple', muted: 'badge-muted',
}

export function Badge({ variant = 'muted', dot, children, className }: {
  variant?: V; dot?: boolean; children: React.ReactNode; className?: string
}) {
  return (
    <span className={cn('badge', map[variant], className)}>
      {dot && <span className={cn('w-1.5 h-1.5 rounded-full', {
        'bg-green-500': variant === 'green',
        'bg-red-500':   variant === 'red',
        'bg-amber-500': variant === 'amber',
        'bg-blue-400':  variant === 'blue',
        'bg-purple-400':variant === 'purple',
        'bg-zinc-500':  variant === 'muted',
      })} />}
      {children}
    </span>
  )
}
