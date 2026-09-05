import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, formatDistanceToNow } from 'date-fns'

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs))

export const fmtDate = (d: string | null | undefined) => {
  if (!d) return '—'
  try { return format(new Date(d), 'dd MMM yyyy, HH:mm') } catch { return '—' }
}

export const fmtRelative = (d: string | null | undefined) => {
  if (!d) return '—'
  try { return formatDistanceToNow(new Date(d), { addSuffix: true }) } catch { return '—' }
}

export const initials = (name: string) =>
  name.split(' ').slice(0, 2).map(n => n[0]?.toUpperCase() ?? '').join('')

export const truncate = (s: string, n: number) => s.length > n ? s.slice(0, n) + '…' : s
