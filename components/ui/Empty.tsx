import { LucideIcon } from 'lucide-react'

export function Empty({ icon: Icon, title, body, action }: {
  icon: LucideIcon; title: string; body?: string; action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3 animate-fade-up">
      <div className="w-12 h-12 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
        <Icon className="w-5 h-5 text-[#3F3F46]" />
      </div>
      <div className="text-center">
        <p className="text-sm font-medium text-[#FAFAFA]">{title}</p>
        {body && <p className="text-sm text-[#52525B] mt-0.5 max-w-xs">{body}</p>}
      </div>
      {action}
    </div>
  )
}
