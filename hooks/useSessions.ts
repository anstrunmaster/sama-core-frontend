'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { authService } from '@/services/auth.service'
import { toast } from 'sonner'

export const useSessions = () =>
  useQuery({ queryKey: ['sessions'], queryFn: authService.sessions, refetchInterval: 30_000 })

export const useAuditLogs = () =>
  useQuery({ queryKey: ['audit'], queryFn: () => authService.audit() })

export const useRevokeSession = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => authService.revokeSession(id),
    onSuccess: () => { toast.success('Sesión revocada'); qc.invalidateQueries({ queryKey: ['sessions'] }) },
    onError: () => toast.error('No se pudo revocar la sesión'),
  })
}
