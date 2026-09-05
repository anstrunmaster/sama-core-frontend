'use client'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Topbar } from '@/components/layout/Topbar'
import { Badge } from '@/components/ui/Badge'
import { TableSkeleton } from '@/components/ui/Skeleton'
import { Empty } from '@/components/ui/Empty'
import { Spinner } from '@/components/ui/Spinner'
import { useSessions, useRevokeSession } from '@/hooks/useSessions'
import { useAuth } from '@/hooks/useAuth'
import { fmtDate, fmtRelative } from '@/lib/utils'
import { MonitorSmartphone, Laptop, Smartphone, Globe, Trash2, ShieldOff } from 'lucide-react'
import type { Session } from '@/types'

function DeviceIcon({ ua }: { ua: string | null }) {
  const cls = 'w-5 h-5 text-[#A1A1AA]'
  if (!ua) return <Globe className={cls} />
  if (/mobile/i.test(ua)) return <Smartphone className={cls} />
  return <Laptop className={cls} />
}

function parseDevice(ua: string | null): string {
  if (!ua) return 'Dispositivo desconocido'
  if (/chrome/i.test(ua) && /windows/i.test(ua)) return 'Chrome · Windows'
  if (/chrome/i.test(ua) && /mac/i.test(ua))     return 'Chrome · macOS'
  if (/firefox/i.test(ua))                        return 'Firefox'
  if (/safari/i.test(ua))                         return 'Safari'
  if (/mobile/i.test(ua))                         return 'Dispositivo móvil'
  return 'Navegador desconocido'
}

export default function SessionsPage() {
  const { data, isLoading } = useSessions()
  const { mutate: revoke, isPending: revoking, variables } = useRevokeSession()
  const { logoutAll } = useAuth()

  return (
    <DashboardLayout>
      <Topbar
        title="Sesiones activas"
        subtitle="Gestiona los dispositivos con acceso a tu cuenta"
        actions={
          <button onClick={logoutAll} className="btn btn-danger">
            <ShieldOff className="w-3.5 h-3.5" /> Cerrar todas
          </button>
        }
      />

      <div className="p-6 space-y-4">
        {/* Summary bar */}
        {!isLoading && data && (
          <div className="flex items-center gap-3 animate-fade-in">
            <Badge variant="blue" dot>{data.length} sesión{data.length !== 1 ? 'es' : ''} activa{data.length !== 1 ? 's' : ''}</Badge>
            <span className="text-xs text-[#52525B]">Se actualiza cada 30 segundos</span>
          </div>
        )}

        <div className="card overflow-hidden">
          {isLoading ? <TableSkeleton rows={4} /> : !data?.length ? (
            <Empty icon={MonitorSmartphone} title="Sin sesiones activas" body="No hay dispositivos conectados en este momento." />
          ) : (
            <table className="tbl">
              <thead>
                <tr>
                  <th>Dispositivo</th>
                  <th>IP</th>
                  <th>Iniciada</th>
                  <th>Expira</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {data.map((s: Session) => (
                  <tr key={s.id}>
                    <td className="primary">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-white/[0.05] flex items-center justify-center shrink-0">
                          <DeviceIcon ua={s.user_agent} />
                        </div>
                        <div>
                          <p className="text-[13.5px] font-medium text-[#FAFAFA]">
                            {s.device_name ?? parseDevice(s.user_agent)}
                          </p>
                          <p className="text-[11px] text-[#52525B] font-mono truncate max-w-[240px]">
                            {s.user_agent?.slice(0, 60) ?? '—'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td><span className="font-mono text-xs">{s.ip_address ?? '—'}</span></td>
                    <td><span className="text-xs">{fmtRelative(s.created_at)}</span></td>
                    <td><span className="text-xs">{fmtDate(s.expires_at)}</span></td>
                    <td>
                      <button
                        onClick={() => revoke(s.id)}
                        disabled={revoking && variables === s.id}
                        className="btn btn-danger py-1 px-2.5 text-xs"
                        title="Revocar sesión"
                      >
                        {revoking && variables === s.id ? <Spinner size="sm" /> : <Trash2 className="w-3.5 h-3.5" />}
                        Revocar
                      </button>
                    </td>
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
