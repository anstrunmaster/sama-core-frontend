import { initials } from '@/lib/utils'

const GRADIENTS = [
  'from-blue-500 to-blue-700',
  'from-violet-500 to-violet-700',
  'from-emerald-500 to-emerald-700',
  'from-rose-500 to-rose-700',
  'from-amber-500 to-amber-700',
  'from-cyan-500 to-cyan-700',
]

const sizes: Record<string, string> = {
  xs: 'w-6 h-6 text-[9px]',
  sm: 'w-7 h-7 text-[10px]',
  md: 'w-8 h-8 text-xs',
  lg: 'w-10 h-10 text-sm',
  xl: 'w-12 h-12 text-base',
}

export function Avatar({ name, size = 'md' }: { name: string; size?: string }) {
  const grad = GRADIENTS[name.charCodeAt(0) % GRADIENTS.length]
  return (
    <div className={`${sizes[size] ?? sizes.md} rounded-full bg-gradient-to-br ${grad} flex items-center justify-center font-semibold text-white shrink-0 select-none`}>
      {initials(name)}
    </div>
  )
}
