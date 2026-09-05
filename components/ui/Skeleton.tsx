import { cn } from '@/lib/utils'

export const Skeleton = ({ className }: { className?: string }) => (
  <div className={cn('skel', className)} />
)

export const TableSkeleton = ({ rows = 6 }: { rows?: number }) => (
  <div className="divide-y divide-white/[0.04]">
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="flex items-center gap-4 px-4 py-3.5" style={{ animationDelay: `${i * 40}ms` }}>
        <Skeleton className="w-8 h-8 rounded-full shrink-0" />
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-3.5 w-36" />
          <Skeleton className="h-3 w-24" />
        </div>
        <Skeleton className="h-5 w-16 rounded-md" />
        <Skeleton className="h-5 w-20 rounded-md" />
        <Skeleton className="h-7 w-14 rounded-md ml-auto" />
      </div>
    ))}
  </div>
)
