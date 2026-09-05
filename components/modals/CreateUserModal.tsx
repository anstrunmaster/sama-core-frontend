'use client'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Modal } from '@/components/ui/Modal'
import { useCreateUser } from '@/hooks/useUsers'
import { Spinner } from '@/components/ui/Spinner'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://d16rb4jhhui7p6.cloudfront.net/api/v1'

function getToken(): string {
  return localStorage.getItem('_at') || localStorage.getItem('accessToken') || ''
}

const schema = z.object({
  email:     z.string().email('Email inválido'),
  name:      z.string().min(2, 'Mínimo 2 caracteres'),
  password:  z.string().min(8).regex(/^(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])/, 'Necesita mayúscula, número y símbolo'),
  role:      z.enum(['ADMIN', 'MANAGER', 'OPERATOR', 'ACCOUNTANT']).default('OPERATOR'),
  branch_id: z.string().uuid().optional().nullable().or(z.literal('')),  // ← acepta string vacío
})
type F = z.infer<typeof schema>

const ROLES = [
  { value: 'ADMIN',      label: 'Administrador — ve toda la empresa' },
  { value: 'MANAGER',    label: 'Gerente — ve solo su sucursal' },
  { value: 'OPERATOR',   label: 'Operador — emite desde su sucursal' },
  { value: 'ACCOUNTANT', label: 'Contador — acceso contable completo' },
]

export function CreateUserModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { mutateAsync, isPending } = useCreateUser()
  const [branches, setBranches]   = useState<{ id: string; name: string }[]>([])
  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<F>({
    resolver: zodResolver(schema),
    defaultValues: { role: 'OPERATOR' },
  })

  const role = watch('role')
  const needsBranch = role === 'MANAGER' || role === 'OPERATOR'

  useEffect(() => {
    if (!open) return
    fetch(`${API_URL}/branches`, {
      headers: { Authorization: `Bearer ${getToken()}` }
    })
      .then(r => r.json())
      .then(d => setBranches(d.data ?? []))
      .catch(() => {})
  }, [open])

const onSubmit = async (data: F) => {
  const payload = {
    ...data,
    branch_id: data.branch_id || undefined,  // ← convierte "" a undefined
  }
  await mutateAsync(payload)
  reset()
  onClose()
}

  return (
    <Modal open={open} onClose={() => { reset(); onClose() }} title="Nuevo usuario" description="Crea un usuario en tu organización">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-[#A1A1AA] mb-1.5">Nombre completo</label>
          <input {...register('name')} placeholder="Juan Pérez" className={`field ${errors.name ? 'field-error' : ''}`} />
          {errors.name && <p className="text-xs text-red-400 mt-1">{errors.name.message}</p>}
        </div>
        <div>
          <label className="block text-xs font-medium text-[#A1A1AA] mb-1.5">Email</label>
          <input {...register('email')} type="email" placeholder="juan@empresa.com" className={`field ${errors.email ? 'field-error' : ''}`} />
          {errors.email && <p className="text-xs text-red-400 mt-1">{errors.email.message}</p>}
        </div>
        <div>
          <label className="block text-xs font-medium text-[#A1A1AA] mb-1.5">Contraseña</label>
          <input {...register('password')} type="password" placeholder="Min 8 chars, 1 mayúsc, 1 núm, 1 símbolo" className={`field ${errors.password ? 'field-error' : ''}`} />
          {errors.password && <p className="text-xs text-red-400 mt-1">{errors.password.message}</p>}
        </div>
        <div>
          <label className="block text-xs font-medium text-[#A1A1AA] mb-1.5">Rol</label>
          <select {...register('role')} className="field bg-[#18181B]">
            {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </div>
        {needsBranch && (
          <div>
            <label className="block text-xs font-medium text-[#A1A1AA] mb-1.5">
              Sucursal <span className="text-red-400">*</span>
            </label>
            <select {...register('branch_id')} className="field bg-[#18181B]">
              <option value="">Seleccionar sucursal...</option>
              {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
            <p className="text-xs text-[#52525B] mt-1">
              Este usuario solo verá datos de la sucursal seleccionada
            </p>
          </div>
        )}
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-white/[0.06] mt-5">
          <button type="button" onClick={() => { reset(); onClose() }} className="btn btn-secondary">Cancelar</button>
          <button type="submit" disabled={isPending} className="btn btn-primary">
            {isPending && <Spinner size="sm" />}
            Crear usuario
          </button>
        </div>
      </form>
    </Modal>
  )
}
