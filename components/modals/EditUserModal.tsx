'use client'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Modal } from '@/components/ui/Modal'
import { useUpdateUser } from '@/hooks/useUsers'
import { Spinner } from '@/components/ui/Spinner'
import { ChevronDown } from 'lucide-react'
import type { User } from '@/types'
import { useQueryClient } from '@tanstack/react-query'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://d16rb4jhhui7p6.cloudfront.net/api/v1'

function getToken(): string {
  return localStorage.getItem('_at') || localStorage.getItem('accessToken') || ''
}

const ROLES = [
  { value: 'ADMIN',      label: 'Administrador' },
  { value: 'MANAGER',    label: 'Gerente de sucursal' },
  { value: 'OPERATOR',   label: 'Operador' },
  { value: 'ACCOUNTANT', label: 'Contador' },
]

// ── Definición de módulos — mismos slugs que el sidebar ──────────────────────
const MODULE_GROUPS = [
   {
    label:  'Dashboard',
    module: 'dashboard',
    items: [
      { label: 'Dashboard', module: 'dashboard' },
    ],
  },
  {
    label:  'Comercial',
    module: 'comercial',
    items: [
      { label: 'Nueva Factura',    module: 'comercial.facturacion' },
      { label: 'Cotizaciones',     module: 'comercial.cotizaciones' },
      { label: 'Mis Facturas',     module: 'comercial.facturas' },
      { label: 'Compras',          module: 'comercial.compras' },
      { label: 'Notas de Crédito', module: 'comercial.notas_credito' },
      { label: 'Notas de Débito',  module: 'comercial.notas_debito' },
      { label: 'Retenciones',      module: 'comercial.retenciones' },
      { label: 'Clientes',         module: 'comercial.clientes' },
      { label: 'Proveedores',      module: 'comercial.proveedores' },
    ],
  },
  {
    label:  'Inventario',
    module: 'inventario',
    items: [
      { label: 'Productos', module: 'inventario.productos' },
      { label: 'Stock',     module: 'inventario.stock' },
      { label: 'Bodegas',   module: 'inventario.bodegas' },
    ],
  },
  {
    label:  'Contabilidad',
    module: 'contabilidad',
    items: [
      { label: 'Pendientes',      module: 'contabilidad.pendientes' },
      { label: 'Asientos',        module: 'contabilidad.asientos' },
      { label: 'Libro Diario',    module: 'contabilidad.diario' },
      { label: 'Libro Mayor',     module: 'contabilidad.mayor' },
      { label: 'Plan de Cuentas', module: 'contabilidad.cuentas' },
      { label: 'Balance General', module: 'contabilidad.balance' },
      { label: 'Est. Resultados', module: 'contabilidad.resultados' },
      { label: 'Balanza',         module: 'contabilidad.balanza' },
    ],
  },
  {
    label:  'Finanzas',
    module: 'finanzas',
    items: [
      { label: 'Banco',      module: 'finanzas.banco' },
      { label: 'Reportes',   module: 'finanzas.reportes' },
      { label: 'Anexos SRI', module: 'finanzas.anexos' },
    ],
  },
  {
    label:  'Talento Humano',
    module: 'rrhh',
    items: [
      { label: 'Cargos',      module: 'rrhh.cargos' },
      { label: 'Empleados',   module: 'rrhh.empleados' },
      { label: 'Nómina',      module: 'rrhh.nomina' },
      { label: 'Organigrama', module: 'rrhh.organigrama' },
    ],
  },
  {
    label:  'Configuración',
    module: 'configuracion',
    items: [
      { label: 'Mapeo Contable',   module: 'configuracion.mapeo' },
      { label: 'Cierre Ejercicio', module: 'configuracion.cierre' },
      { label: 'Mi Empresa',       module: 'configuracion.empresa' },
      { label: 'Usuarios',         module: 'configuracion.usuarios' },
      { label: 'Sesiones',         module: 'configuracion.sesiones' },
      { label: 'Auditoría',        module: 'configuracion.auditoria' },
    ],
  },
]

interface F { name: string; role: string; status: string; branch_id?: string }

export function EditUserModal({ user, onClose }: { user: User | null; onClose: () => void }) {
  const { mutateAsync, isPending } = useUpdateUser()
  const [branches, setBranches]   = useState<{ id: string; name: string }[]>([])
  const [permissions, setPermissions] = useState<string[]>([])
  const [permSaving, setPermSaving]   = useState(false)
  const [openGroups, setOpenGroups]   = useState<Record<string, boolean>>({})
  const queryClient = useQueryClient()

  const { register, handleSubmit, reset, watch } = useForm<F>()
  const role        = watch('role')
  const needsBranch = role === 'MANAGER' || role === 'OPERATOR'

  // ── Cargar datos al abrir ─────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return

    reset({
      name:      user.name,
      role:      user.role,
      status:    user.status,
      branch_id: (user as any).branch_id ?? '',
    })

    // Cargar sucursales
    fetch(`${API_URL}/branches`, {
      headers: { Authorization: `Bearer ${getToken()}` }
    }).then(r => r.json()).then(d => setBranches(d.data ?? [])).catch(() => {})

// Cargar permisos actuales del usuario
fetch(`${API_URL}/users/${user.id}/permissions`, {
  headers: { Authorization: `Bearer ${getToken()}` }
})
  .then(r => r.json())
  .then(d => {
    // Doble wrapper: { data: { success: true, data: [...] } }
    const inner = d.data ?? d
    const perms = inner.data ?? inner
    setPermissions(Array.isArray(perms) ? perms : [])
  })
  .catch(() => setPermissions([]))
}, [user, reset])

  // ── Helpers de permisos ───────────────────────────────────────────────────

  // Verifica si todos los ítems de un grupo están seleccionados
  const isGroupChecked = (group: typeof MODULE_GROUPS[0]) =>
    group.items.every(item => permissions.includes(item.module))

  // Verifica si algunos (no todos) ítems del grupo están seleccionados
  const isGroupIndeterminate = (group: typeof MODULE_GROUPS[0]) =>
    group.items.some(item => permissions.includes(item.module)) && !isGroupChecked(group)

  // Toggle grupo completo
  const toggleGroup = (group: typeof MODULE_GROUPS[0]) => {
    const allSelected = isGroupChecked(group)
    const groupModules = group.items.map(i => i.module)
    if (allSelected) {
      // Deseleccionar todos los ítems del grupo
      setPermissions(p => p.filter(m => !groupModules.includes(m)))
    } else {
      // Seleccionar todos los ítems del grupo
      setPermissions(p => [...new Set([...p, ...groupModules])])
    }
  }

  // Toggle ítem individual
  const toggleItem = (module: string) => {
    setPermissions(p =>
      p.includes(module) ? p.filter(m => m !== module) : [...p, module]
    )
  }

  // Toggle acordeón
  const toggleOpen = (module: string) =>
    setOpenGroups(o => ({ ...o, [module]: !o[module] }))

  // ── Guardar ───────────────────────────────────────────────────────────────
  const onSubmit = async (data: F) => {
    if (!user) return
    const payload = { ...data, branch_id: data.branch_id || undefined }
    await mutateAsync({ id: user.id, payload: payload as any })
    queryClient.invalidateQueries({ queryKey: ['permissions'] })

    // Guardar permisos
    setPermSaving(true)
    try {
      await fetch(`${API_URL}/users/${user.id}/permissions`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body:    JSON.stringify({ modules: permissions }),
      })
    } catch {}
    finally { setPermSaving(false) }

    onClose()
  }

  return (
    <Modal open={!!user} onClose={onClose} title="Editar usuario">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

        {/* Nombre */}
        <div>
          <label className="block text-xs font-medium text-ink-secondary mb-1.5">Nombre</label>
          <input {...register('name')} className="field" />
        </div>

        {/* Rol */}
        <div>
          <label className="block text-xs font-medium text-ink-secondary mb-1.5">Rol</label>
          <select {...register('role')} className="field">
            {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </div>

        {/* Sucursal — solo para MANAGER/OPERATOR */}
        {needsBranch && (
          <div>
            <label className="block text-xs font-medium text-ink-secondary mb-1.5">
              Sucursal <span className="text-red-400">*</span>
            </label>
            <select {...register('branch_id')} className="field">
              <option value="">Seleccionar sucursal...</option>
              {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
            <p className="text-xs text-[#52525B] mt-1">
              Este usuario solo verá datos de la sucursal seleccionada
            </p>
          </div>
        )}

        {/* Estado */}
        <div>
          <label className="block text-xs font-medium text-ink-secondary mb-1.5">Estado</label>
          <select {...register('status')} className="field">
            {['ACTIVE', 'INACTIVE', 'SUSPENDED'].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {/* ── Permisos de módulos ─────────────────────────────────────────── */}
        <div className="border-t border-white/[0.06] pt-4">
          <div className="flex items-center justify-between mb-3">
            <label className="text-xs font-medium text-[#A1A1AA]">
              Permisos de módulos
            </label>
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => setPermissions(
                MODULE_GROUPS.flatMap(g => g.items.map(i => i.module))
              )} className="text-[11px] text-blue hover:underline">
                Todo
              </button>
              <button type="button" onClick={() => setPermissions([])}
                className="text-[11px] text-[#52525B] hover:text-[#A1A1AA]">
                Ninguno
              </button>
            </div>
          </div>

          {permissions.length === 0 && (
            <p className="text-[11px] text-[#52525B] mb-3">
              Sin restricciones — el usuario ve todos los módulos
            </p>
          )}

          <div className="space-y-1 max-h-64 overflow-y-auto pr-1">
            {MODULE_GROUPS.map(group => (
              <div key={group.module} className="rounded-lg border border-white/[0.06] overflow-hidden">

                {/* Header del grupo */}
                <div className="flex items-center gap-2 px-3 py-2 bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
                  <input
                    type="checkbox"
                    checked={isGroupChecked(group)}
                    ref={el => { if (el) el.indeterminate = isGroupIndeterminate(group) }}
                    onChange={() => toggleGroup(group)}
                    className="h-3.5 w-3.5 accent-blue"
                  />
                  <button
                    type="button"
                    onClick={() => toggleOpen(group.module)}
                    className="flex-1 flex items-center justify-between text-left"
                  >
                    <span className="text-xs font-semibold text-[#A1A1AA]">{group.label}</span>
                    <ChevronDown className={`w-3.5 h-3.5 text-[#52525B] transition-transform ${
                      openGroups[group.module] ? '' : '-rotate-90'
                    }`} />
                  </button>
                </div>

                {/* Ítems del grupo */}
                {openGroups[group.module] && (
                  <div className="px-3 py-2 space-y-1.5 bg-black/10">
                    {group.items.map(item => (
                      <label key={item.module} className="flex items-center gap-2 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={permissions.includes(item.module)}
                          onChange={() => toggleItem(item.module)}
                          className="h-3.5 w-3.5 accent-blue"
                        />
                        <span className="text-[12px] text-[#71717A] group-hover:text-[#A1A1AA] transition-colors">
                          {item.label}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Botones */}
        <div className="flex justify-end gap-3 pt-2 border-t border-white/[0.06] mt-4">
          <button type="button" onClick={onClose} className="btn btn-secondary">Cancelar</button>
          <button type="submit" disabled={isPending || permSaving} className="btn btn-primary">
            {(isPending || permSaving) && <Spinner size="sm" />} Guardar cambios
          </button>
        </div>

      </form>
    </Modal>
  )
}
