'use client'
import { useState } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Topbar } from '@/components/layout/Topbar'
import { Badge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import { TableSkeleton } from '@/components/ui/Skeleton'
import { Empty } from '@/components/ui/Empty'
import { Modal } from '@/components/ui/Modal'
import { CreateUserModal } from '@/components/modals/CreateUserModal'
import { EditUserModal } from '@/components/modals/EditUserModal'
import { useUsers, useDeactivateUser } from '@/hooks/useUsers'
import { fmtRelative } from '@/lib/utils'
import { Plus, Search, Pencil, UserX, Users2 } from 'lucide-react'
import type { User, UserStatus, UserRole } from '@/types'
import { Spinner } from '@/components/ui/Spinner'
const statusBadge: Record<UserStatus, 'green' | 'red' | 'amber' | 'muted'> = {
  ACTIVE: 'green', INACTIVE: 'red', SUSPENDED: 'amber', PENDING_VERIFICATION: 'muted',
}
const roleBadge: Record<UserRole, 'purple' | 'blue' | 'muted' | 'muted'> = {
  SUPER_ADMIN: 'purple', ADMIN: 'blue', USER: 'muted', VIEWER: 'muted',
}
export default function UsersPage() {
  const [search, setSearch]       = useState('')
  const [createOpen, setCreate]   = useState(false)
  const [editUser, setEditUser]   = useState<User | null>(null)
  const [confirmUser, setConfirmUser] = useState<User | null>(null)
  const { data, isLoading, error } = useUsers({ search: search || undefined })
  const { mutate: deactivate, isPending: deactivating } = useDeactivateUser()

  const handleConfirmDeactivate = () => {
    if (!confirmUser) return
    deactivate(confirmUser.id, {
      onSettled: () => setConfirmUser(null),
    })
  }
  return (
    <DashboardLayout>
      <Topbar
        title="Usuarios"
        subtitle={data ? `${data.total} usuarios en tu organización` : undefined}
        actions={
          <button onClick={() => setCreate(true)} className="btn btn-primary">
            <Plus className="w-3.5 h-3.5" /> Nuevo usuario
          </button>
        }
      />
      <div className="p-6 space-y-4">
        {/* Search */}
        <div className="relative max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#3F3F46] pointer-events-none" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar usuario..."
            className="field pl-9 h-9"
          />
        </div>
        {/* Table */}
        <div className="card overflow-hidden">
          {isLoading ? <TableSkeleton rows={7} /> : error ? (
            <div className="p-8 text-center text-sm text-red-400">Error al cargar usuarios.</div>
          ) : !data?.items.length ? (
            <Empty icon={Users2} title="Sin usuarios" body="Crea el primer usuario de tu organización." action={
              <button onClick={() => setCreate(true)} className="btn btn-primary"><Plus className="w-3.5 h-3.5" /> Crear usuario</button>
            } />
          ) : (
            <table className="tbl">
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>Rol</th>
                  <th>Estado</th>
                  <th>Último acceso</th>
                  <th>2FA</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((u: User) => (
                  <tr key={u.id}>
                    <td className="primary">
                      <div className="flex items-center gap-3">
                        <Avatar name={u.name} size="sm" />
                        <div>
                          <p className="text-[13.5px] font-medium text-ink-primary">{u.name}</p>
                          <p className="text-xs text-ink-tertiary font-mono">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td><Badge variant={roleBadge[u.role] ?? 'muted'}>{u.role}</Badge></td>
                    <td><Badge variant={statusBadge[u.status] ?? 'muted'} dot>{u.status}</Badge></td>
                    <td><span className="text-xs">{fmtRelative(u.last_login_at)}</span></td>
                    <td>
                      <Badge variant={u.two_fa_enabled ? 'green' : 'muted'}>
                        {u.two_fa_enabled ? '2FA ON' : 'OFF'}
                      </Badge>
                    </td>
                    <td>
                      <div className="flex items-center gap-2 justify-end">
                        <button onClick={() => setEditUser(u)} className="btn btn-ghost p-1.5" title="Editar">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        {u.status === 'ACTIVE' && (
                          <button onClick={() => setConfirmUser(u)} disabled={deactivating}
                            className="btn btn-ghost p-1.5 hover:text-red-400" title="Desactivar">
                            <UserX className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        {data && data.total > data.items.length && (
          <p className="text-xs text-[#52525B] text-center">
            Mostrando {data.items.length} de {data.total} usuarios
          </p>
        )}
      </div>
      <CreateUserModal open={createOpen} onClose={() => setCreate(false)} />
      <EditUserModal user={editUser} onClose={() => setEditUser(null)} />

      {/* Modal de confirmación — desactivar usuario */}
      <Modal open={!!confirmUser} onClose={() => setConfirmUser(null)}>
        <div className="flex flex-col items-center text-center px-2 py-1">
          <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
            <UserX className="w-6 h-6 text-red-500 dark:text-red-400" />
          </div>
          <h3 className="text-base font-bold text-ink-primary">¿Desactivar usuario?</h3>
          <p className="text-sm text-ink-tertiary mt-1.5">
            El usuario <span className="font-semibold text-ink-secondary">{confirmUser?.name}</span> perderá
            acceso inmediatamente. Puedes reactivarlo después.
          </p>
          <div className="flex gap-3 w-full mt-6">
            <button
              onClick={() => setConfirmUser(null)}
              disabled={deactivating}
              className="flex-1 py-2.5 rounded-lg border border-edge text-sm font-medium text-ink-secondary hover:text-ink-primary hover:border-edge-strong transition-all disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirmDeactivate}
              disabled={deactivating}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-sm font-semibold text-red-600 dark:text-red-400 hover:bg-red-500/20 transition-all disabled:opacity-50"
            >
              {deactivating ? <Spinner size="sm" /> : <UserX className="w-3.5 h-3.5" />}
              Desactivar
            </button>
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  )
}
