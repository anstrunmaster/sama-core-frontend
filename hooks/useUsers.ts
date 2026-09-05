'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { usersService } from '@/services/users.service'
import { toast } from 'sonner'
import type { CreateUserPayload, UpdateUserPayload } from '@/types'

export const useUsers = (params?: { search?: string; status?: string }) =>
  useQuery({ queryKey: ['users', params], queryFn: () => usersService.list(params) })

export const useUserStats = () =>
  useQuery({ queryKey: ['users-stats'], queryFn: usersService.stats })

export const useCreateUser = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (p: CreateUserPayload) => usersService.create(p),
    onSuccess: () => { toast.success('Usuario creado'); qc.invalidateQueries({ queryKey: ['users'] }) },
    onError: (e: any) => toast.error(e?.response?.data?.message?.[0] ?? 'Error al crear usuario'),
  })
}

export const useUpdateUser = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateUserPayload }) => usersService.update(id, payload),
    onSuccess: () => { toast.success('Usuario actualizado'); qc.invalidateQueries({ queryKey: ['users'] }) },
    onError: (e: any) => toast.error(e?.response?.data?.message?.[0] ?? 'Error'),
  })
}

export const useDeactivateUser = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => usersService.deactivate(id),
    onSuccess: () => { toast.success('Usuario desactivado'); qc.invalidateQueries({ queryKey: ['users'] }) },
    onError: () => toast.error('Error al desactivar usuario'),
  })
}
