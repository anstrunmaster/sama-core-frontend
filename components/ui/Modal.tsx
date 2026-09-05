'use client'
import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ModalProps {
  open: boolean; onClose: () => void
  title: string; description?: string
  children: React.ReactNode; size?: 'sm' | 'md' | 'lg'
}

export function Modal({ open, onClose, title, description, children, size = 'md' }: ModalProps) {
  const widths = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl' }
  return (
    <Dialog.Root open={open} onOpenChange={v => !v && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/55 backdrop-blur-[3px] z-40 animate-fade-in flex items-center justify-center">
          <Dialog.Content className={cn(
            'relative z-50',
            'w-[calc(100vw-2rem)]', widths[size],
            'bg-surface border border-edge rounded-xl',
            'shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_20px_60px_rgba(0,0,0,0.7)]',
            'px-6 py-7 outline-none animate-fade-up'
          )}>
            <div className="flex items-start justify-between mb-6">
              <div>
                <Dialog.Title className="text-[15px] font-semibold text-ink-primary leading-snug">{title}</Dialog.Title>
                {description && <Dialog.Description className="text-sm text-[#71717A] mt-0.5">{description}</Dialog.Description>}
              </div>
              <button onClick={onClose} className="ml-4 p-1.5 rounded-md text-[#52525B] hover:text-[#A1A1AA] hover:bg-white/[0.06] transition-colors shrink-0">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="mt-1">{children}</div>
          </Dialog.Content>
        </Dialog.Overlay>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
