'use client'
import { useState } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Topbar } from '@/components/layout/Topbar'
import { Badge } from '@/components/ui/Badge'
import { TableSkeleton } from '@/components/ui/Skeleton'
import { Empty } from '@/components/ui/Empty'
import { useAuditLogs } from '@/hooks/useSessions'
import { fmtDate, truncate } from '@/lib/utils'
import { ScrollText, Search } from 'lucide-react'
import type { AuditLog, AuditAction } from '@/types'

// Classify audit actions into visual categories
const actionVariant = (a: AuditAction): 'green' | 'red' | 'amber' | 'blue' | 'purple' | 'muted' => {
  if (['LOGIN_SUCCESS', 'TWO_FA_SUCCESS'].includes(a))                return 'green'
  if (['LOGIN_FAILED', 'TWO_FA_FAILED', 'RATE_LIMITED'].includes(a)) return 'red'
  if (['LOGOUT', 'LOGOUT_ALL', 'SESSION_REVOKED', 'TOKEN_REVOKED'].includes(a)) return 'amber'
  if (['USER_CREATED', 'TENANT_CREATED', 'API_KEY_CREATED'].includes(a)) return 'blue'
  if (['USER_DELETED', 'USER_SUSPENDED', 'API_KEY_REVOKED'].includes(a)) return 'red'
  if (['USER_UPDATED', 'TENANT_UPDATED', 'PASSWORD_CHANGED'].includes(a)) return 'purple'
  return 'muted'
}

const actionLabel = (a: AuditAction): string => ({
  LOGIN_SUCCESS:          'Inicio de sesión',
  LOGIN_FAILED:           'Login fallido',
  LOGOUT:                 'Cierre de sesión',
  LOGOUT_ALL:             'Cerrar todas sesiones',
  TOKEN_REFRESH:          'Token renovado',
  TOKEN_REVOKED:          'Token revocado',
  SESSION_REVOKED:        'Sesión revocada',
  PASSWORD_CHANGED:       'Contraseña cambiada',
  PASSWORD_RESET_REQUEST: 'Reset de contraseña',
  PASSWORD_RESET_COMPLETE:'Reset completado',
  USER_CREATED:           'Usuario creado',
  USER_UPDATED:           'Usuario actualizado',
  USER_DELETED:           'Usuario eliminado',
  USER_SUSPENDED:         'Usuario suspendido',
  TENANT_CREATED:         'Tenant creado',
  TENANT_UPDATED:         'Tenant actualizado',
  RATE_LIMITED:           'Límite de tasa',
  TWO_FA_ENABLED:         '2FA activado',
  TWO_FA_DISABLED:        '2FA desactivado',
  TWO_FA_SUCCESS:         '2FA exitoso',
  TWO_FA_FAILED:          '2FA fallido',
  API_KEY_CREATED:        'API key creada',
  API_KEY_REVOKED:        'API key revocada',
}[a] ?? a)

export default function AuditPage() {
  const [filter, setFilter] = useState('')
  const { data, isLoading } = useAuditLogs()

  const logs = data?.items.filter(l =>
    !filter ||
    l.action.toLowerCase().includes(filter.toLowerCase()) ||
    l.user?.email?.toLowerCase().includes(filter.toLowerCase()) ||
    l.ip_address?.includes(filter)
  )

  return (
    <DashboardLayout>
      <Topbar
        title="Auditoría"
        subtitle="Registro completo de actividad en tu organización"
      />

      <div className="p-6 space-y-4">
        {/* Search */}
        <div className="flex items-center gap-3">
          <div className="relative max-w-xs flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#3F3F46]" />
            <input value={filter} onChange={e => setFilter(e.target.value)}
              placeholder="Filtrar por acción, email o IP..."
              className="field pl-9 h-9" />
          </div>
          {data && (
            <span className="text-xs text-[#52525B] shrink-0">
              {logs?.length ?? 0} registros
            </span>
          )}
        </div>

        <div className="card overflow-hidden">
          {isLoading ? <TableSkeleton rows={8} /> : !logs?.length ? (
            <Empty icon={ScrollText} title="Sin registros de auditoría" />
          ) : (
            <table className="tbl">
              <thead>
                <tr>
                  <th>Acción</th>
                  <th>Usuario</th>
                  <th>IP</th>
                  <th>Detalles</th>
                  <th>Fecha</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((l: AuditLog, i) => (
                  <tr key={l.id} className="animate-fade-in" style={{ animationDelay: `${Math.min(i, 20) * 20}ms` }}>
                    <td>
                      <Badge variant={actionVariant(l.action)}>{actionLabel(l.action)}</Badge>
                    </td>
                    <td>
                      {l.user ? (
                        <div>
                          <p className="text-[13px] text-[#FAFAFA] font-medium">{l.user.name}</p>
                          <p className="text-xs text-[#52525B] font-mono">{l.user.email}</p>
                        </div>
                      ) : (
                        <span className="text-[#3F3F46] text-xs font-mono">—</span>
                      )}
                    </td>
                    <td><span className="font-mono text-xs">{l.ip_address ?? '—'}</span></td>
                    <td>
                      {l.metadata ? (
                        <span className="font-mono text-[11px] text-[#52525B]">
                          {truncate(JSON.stringify(l.metadata), 60)}
                        </span>
                      ) : <span className="text-[#3F3F46]">—</span>}
                    </td>
                    <td><span className="text-xs text-[#52525B]">{fmtDate(l.created_at)}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
