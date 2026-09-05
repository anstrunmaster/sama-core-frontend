'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import {
  Building2, Users, RefreshCw, Search, Mail, Phone,
  CheckCircle2, XCircle, Clock, AlertCircle, X, ChevronDown, Check
} from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://d16rb4jhhui7p6.cloudfront.net/api/v1'

function getToken(): string {
  return localStorage.getItem('_at') || localStorage.getItem('accessToken') || ''
}
function getUser(): any {
  try {
    const s = localStorage.getItem('saas_auth')
    if (s) return JSON.parse(s).state?.user ?? {}
    return JSON.parse(localStorage.getItem('user') || '{}')
  } catch { return {} }
}

// ── Status config ─────────────────────────────────────────────────────────────
type StatusKey = 'ACTIVE' | 'TRIAL' | 'SUSPENDED' | 'INACTIVE'

const STATUS_CONFIG: Record<StatusKey, {
  label: string
  color: string
  bg: string
  border: string
  dot: string
  icon: any
}> = {
  ACTIVE:    { label: 'Activo',     color: 'text-green-600 dark:text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20', dot: 'bg-green-500',  icon: CheckCircle2 },
  TRIAL:     { label: 'Trial',      color: 'text-blue-600 dark:text-blue-400',   bg: 'bg-blue/10',      border: 'border-blue/20',      dot: 'bg-blue',       icon: Clock },
  SUSPENDED: { label: 'Suspendido', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', dot: 'bg-amber-500',  icon: AlertCircle },
  INACTIVE:  { label: 'Inactivo',   color: 'text-red-600 dark:text-red-400',     bg: 'bg-red-500/10',   border: 'border-red-500/20',   dot: 'bg-red-500',    icon: XCircle },
}
const STATUS_ORDER: StatusKey[] = ['ACTIVE', 'TRIAL', 'SUSPENDED', 'INACTIVE']

const PLAN_CONFIG: Record<string, { label: string; color: string }> = {
  BASIC:      { label: 'Básico',     color: 'text-ink-tertiary' },
  PREMIUM:    { label: 'Premium',    color: 'text-blue' },
  ENTERPRISE: { label: 'Enterprise', color: 'text-emerald-500' },
}

function initials(name: string): string {
  return (name || '?')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() ?? '')
    .join('')
}

// ── Avatar (logo o iniciales) ─────────────────────────────────────────────────
function TenantAvatar({ tenant }: { tenant: any }) {
  const src = tenant.logo || tenant.logo_url
  if (src) {
    return (
      <div className="w-9 h-9 rounded-lg bg-white border border-edge overflow-hidden shrink-0 flex items-center justify-center">
        <img src={src} alt={tenant.name} className="w-full h-full object-contain" />
      </div>
    )
  }
  return (
    <div className="w-9 h-9 rounded-lg bg-blue/10 text-blue shrink-0 flex items-center justify-center text-xs font-bold">
      {initials(tenant.name)}
    </div>
  )
}

// ── Dropdown de estado ──────────────────────────────────────────────────────────
function StatusDropdown({
  status, updating, onSelect,
}: {
  status: string
  updating: boolean
  onSelect: (s: StatusKey) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const cfg = STATUS_CONFIG[status as StatusKey] ?? STATUS_CONFIG.INACTIVE
  const Icon = cfg.icon

  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={ref} className="relative inline-block text-left">
      <button
        type="button"
        disabled={updating}
        onClick={() => setOpen(o => !o)}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all disabled:opacity-60 ${cfg.bg} ${cfg.border} ${cfg.color} hover:brightness-110`}
      >
        {updating
          ? <RefreshCw className="w-3 h-3 animate-spin" />
          : <Icon className="w-3 h-3" />}
        {cfg.label}
        <ChevronDown className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 z-20 mt-1.5 w-44 rounded-lg border border-edge bg-surface-raised shadow-xl overflow-hidden animate-fade-up">
          {STATUS_ORDER.map(s => {
            const oc = STATUS_CONFIG[s]
            const OIcon = oc.icon
            const isCurrent = s === status
            return (
              <button
                key={s}
                type="button"
                onClick={() => { setOpen(false); if (!isCurrent) onSelect(s) }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs text-left transition-colors ${isCurrent ? 'bg-edge-subtle cursor-default' : 'hover:bg-edge-subtle'}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${oc.dot}`} />
                <OIcon className={`w-3.5 h-3.5 ${oc.color}`} />
                <span className={`flex-1 font-medium ${oc.color}`}>{oc.label}</span>
                {isCurrent && <Check className="w-3.5 h-3.5 text-ink-tertiary" />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Página ────────────────────────────────────────────────────────────────────
export default function BackOfficePage() {
  const router  = useRouter()
  const [tenants, setTenants]   = useState<any[]>([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')
  const [success, setSuccess]   = useState('')
  const [search, setSearch]     = useState('')
  const [statusFilter, setStatusFilter] = useState<'' | StatusKey>('')
  const [updating, setUpdating] = useState<string | null>(null)

  // Proteger la página — solo SUPER_ADMIN
  useEffect(() => {
    const user = getUser()
    if (user.role !== 'SUPER_ADMIN') {
      router.push('/dashboard')
    }
  }, [router])

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res  = await fetch(`${API_URL}/tenants?limit=100`, {
        headers: { Authorization: `Bearer ${getToken()}` }
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message?.[0] ?? 'Error al cargar')
      const payload = data.data ?? data
      setTenants(payload.items ?? [])
    } catch (e: any) {
      setError(e.message || 'Error de conexión')
    } finally {
      setLoading(false)
    }
  }, [])
  useEffect(() => { load() }, [load])

  // Cambiar estado del tenant
  const changeStatus = async (tenantId: string, newStatus: StatusKey, tenantName: string) => {
    const messages: Record<StatusKey, string> = {
      ACTIVE:    `¿Activar "${tenantName}"? Todos sus usuarios podrán ingresar.`,
      SUSPENDED: `¿Suspender "${tenantName}"? Ningún usuario podrá ingresar.`,
      INACTIVE:  `¿Desactivar "${tenantName}"? Ningún usuario podrá ingresar.`,
      TRIAL:     `¿Poner "${tenantName}" en Trial?`,
    }
    if (!confirm(messages[newStatus] ?? `¿Cambiar estado de "${tenantName}"?`)) return
    setUpdating(tenantId)
    setError('')
    try {
      const res  = await fetch(`${API_URL}/tenants/${tenantId}/status`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body:    JSON.stringify({ status: newStatus }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message?.[0] ?? 'Error al actualizar')
      setTenants(prev => prev.map(t => t.id === tenantId ? { ...t, status: newStatus } : t))
      setSuccess(`${tenantName} → ${STATUS_CONFIG[newStatus]?.label}`)
      setTimeout(() => setSuccess(''), 3000)
    } catch (e: any) {
      setError(e.message || 'Error de conexión')
    } finally {
      setUpdating(null)
    }
  }

  // Filtrar por búsqueda + estado
  const filtered = tenants.filter(t => {
    const matchesSearch =
      !search ||
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.ruc?.includes(search) ||
      t.email?.toLowerCase().includes(search.toLowerCase()) ||
      t.phone?.includes(search)
    const matchesStatus = !statusFilter || t.status === statusFilter
    return matchesSearch && matchesStatus
  })

  // Contadores
  const counts = {
    total:     tenants.length,
    active:    tenants.filter(t => t.status === 'ACTIVE').length,
    trial:     tenants.filter(t => t.status === 'TRIAL').length,
    suspended: tenants.filter(t => t.status === 'SUSPENDED').length,
    inactive:  tenants.filter(t => t.status === 'INACTIVE').length,
  }

  const kpis: { label: string; value: number; color: string; filter: '' | StatusKey }[] = [
    { label: 'Total',       value: counts.total,     color: 'text-ink-primary',                  filter: ''          },
    { label: 'Activos',     value: counts.active,    color: 'text-green-600 dark:text-green-400', filter: 'ACTIVE'    },
    { label: 'Trial',       value: counts.trial,     color: 'text-blue',                          filter: 'TRIAL'     },
    { label: 'Suspendidos', value: counts.suspended, color: 'text-amber-600 dark:text-amber-400', filter: 'SUSPENDED' },
    { label: 'Inactivos',   value: counts.inactive,  color: 'text-red-600 dark:text-red-400',     filter: 'INACTIVE'  },
  ]

  return (
    <DashboardLayout>
      <div className="p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-ink-primary">Back Office</h1>
            <p className="text-sm text-ink-tertiary mt-0.5">
              Administración de tenants — solo SUPER_ADMIN
            </p>
          </div>
          <button onClick={load} disabled={loading}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-edge-subtle border border-edge text-sm text-ink-secondary hover:text-ink-primary transition-all disabled:opacity-50">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* KPIs — clic para filtrar */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {kpis.map((k, i) => {
            const activeFilter = statusFilter === k.filter
            return (
              <button
                key={i}
                onClick={() => setStatusFilter(k.filter)}
                className={`card p-4 text-left transition-all hover:border-edge-strong ${activeFilter ? 'ring-1 ring-blue border-blue/40' : ''}`}
              >
                <p className="text-[10px] uppercase tracking-widest text-ink-tertiary font-semibold mb-1">{k.label}</p>
                <p className={`text-2xl font-bold ${k.color}`}>{k.value}</p>
              </button>
            )
          })}
        </div>

        {/* Alertas */}
        {error && (
          <div className="flex items-center justify-between px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-600 dark:text-red-400">
            <div className="flex items-center gap-2"><AlertCircle className="w-4 h-4" />{error}</div>
            <button onClick={() => setError('')}><X className="w-3.5 h-3.5" /></button>
          </div>
        )}
        {success && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-green-500/10 border border-green-500/20 text-sm text-green-600 dark:text-green-400">
            <CheckCircle2 className="w-4 h-4" />{success}
          </div>
        )}

        {/* Toolbar: búsqueda + filtro estado */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-tertiary pointer-events-none" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por nombre, RUC, email o teléfono..."
              className="field pl-9 h-9 w-full"
            />
          </div>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as '' | StatusKey)}
            className="field h-9 w-full sm:w-44"
          >
            <option value="">Todos los estados</option>
            {STATUS_ORDER.map(s => (
              <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
            ))}
          </select>
          {(search || statusFilter) && (
            <button
              onClick={() => { setSearch(''); setStatusFilter('') }}
              className="flex items-center gap-1.5 px-3 h-9 rounded-lg border border-edge text-xs text-ink-tertiary hover:text-ink-primary transition-all"
            >
              <X className="w-3.5 h-3.5" /> Limpiar
            </button>
          )}
        </div>

        {/* Tabla de tenants */}
        <div className="card overflow-visible">
          {loading ? (
            <div className="p-4 space-y-3">
              {[1,2,3,4,5].map(i => (
                <div key={i} className="h-16 bg-edge-subtle rounded-lg animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center">
              <Building2 className="w-10 h-10 text-ink-ghost mx-auto mb-3" />
              <p className="text-sm text-ink-tertiary">Sin resultados</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[880px]">
                <thead className="bg-surface-raised">
                  <tr className="border-b border-edge-subtle">
                    <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-ink-tertiary">Empresa</th>
                    <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-ink-tertiary">Contacto</th>
                    <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-ink-tertiary">RUC</th>
                    <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-ink-tertiary">Plan</th>
                    <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-ink-tertiary">Usuarios</th>
                    <th className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-widest text-ink-tertiary">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(t => {
                    const planCfg = PLAN_CONFIG[t.plan] ?? PLAN_CONFIG.BASIC
                    return (
                      <tr key={t.id} className="border-b border-edge-subtle last:border-0 hover:bg-edge-subtle/60 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <TenantAvatar tenant={t} />
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-ink-primary truncate">{t.name}</p>
                              <p className="text-xs text-ink-tertiary font-mono truncate">{t.slug}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5 text-xs text-ink-secondary">
                              <Mail className="w-3.5 h-3.5 text-ink-tertiary shrink-0" />
                              <span className="truncate">{t.email ?? '—'}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-ink-tertiary">
                              <Phone className="w-3.5 h-3.5 shrink-0" />
                              <span>{t.phone || '—'}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs font-mono text-ink-secondary">{t.ruc ?? '—'}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-semibold ${planCfg.color}`}>{planCfg.label}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5 text-xs text-ink-secondary">
                            <Users className="w-3.5 h-3.5" />
                            {t._count?.users ?? 0}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <StatusDropdown
                            status={t.status}
                            updating={updating === t.id}
                            onSelect={(s) => changeStatus(t.id, s, t.name)}
                          />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer info */}
        <p className="text-xs text-ink-ghost text-center">
          {filtered.length} de {counts.total} tenants
        </p>
      </div>
    </DashboardLayout>
  )
}
