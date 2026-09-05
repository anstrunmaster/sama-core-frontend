import { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export function StatCard({ label, value, icon: Icon, color = '#3B82F6', delta, index = 0, className }: {
  label: string; value: string | number; icon: LucideIcon
  color?: string; delta?: string; index?: number; className?: string
}) {
  return (
    <div className={cn('card p-5 animate-fade-up', className)} style={{ animationDelay: `${index * 55}ms` }}>
      <div className="flex items-center justify-between mb-4">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-[#52525B]">{label}</p>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${color}18` }}>
          <Icon className="w-[18px] h-[18px]" style={{ color }} />
        </div>
      </div>
      <p className="text-[30px] font-bold text-[#FAFAFA] leading-none tracking-tight">{value}</p>
      {delta && <p className="text-xs text-[#71717A] mt-2">{delta}</p>}
    </div>
  )
}
