'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { tenantsService } from '@/services/tenants.service'
import { toast } from 'sonner'
import type { UpdateTenantPayload } from '@/types'

export const useTenant = () =>
  useQuery({ queryKey: ['tenant'], queryFn: tenantsService.me })

export const useUpdateTenant = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateTenantPayload }) =>
      tenantsService.update(id, payload),
    onSuccess: () => { toast.success('Cambios guardados'); qc.invalidateQueries({ queryKey: ['tenant'] }) },
    onError: (e: any) => toast.error(e?.response?.data?.message?.[0] ?? 'Error al guardar'),
  })
}
