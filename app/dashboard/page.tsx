'use client'
import { useState, useEffect, useCallback } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import {
  TrendingUp, TrendingDown, FileText, CheckCircle2,
  DollarSign, Zap, RefreshCw, ArrowUpRight, ChevronDown,
  Building2
} from 'lucide-react'
import { AiInsightsPanel } from './ai-insights/AiInsightsPanel'

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

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface Invoice {
  id: string
  access_key: string
  sequential: string
  sri_status: string
  delivery_status: string
  invoice_data: any
  created_at: string
  branch_id?: string
}

interface Branch {
  id: string
  name: string
  address?: string
}

interface DashboardData {
  totalInvoices:      number
  authorizedInvoices: number
  totalRevenue:       number
  authRate:           number
  prevTotalInvoices:  number
  prevRevenue:        number
  dailyData:          { date: string; count: number; revenue: number }[]
  recentInvoices:     Invoice[]
  // Desglose por sucursal (solo cuando selectedBranch = null)
  branchBreakdown?:   { branchId: string; branchName: string; count: number; revenue: number }[]
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function pct(current: number, prev: number): number {
  if (prev === 0) return current > 0 ? 100 : 0
  return Math.round(((current - prev) / prev) * 100)
}

function fmtMoney(n: number) {
  return new Intl.NumberFormat('es-EC', {
    style: 'currency', currency: 'USD', minimumFractionDigits: 2,
  }).format(n)
}

// ── Sparkline ─────────────────────────────────────────────────────────────────

function Sparkline({ data, color, height = 40 }: { data: number[]; color: string; height?: number }) {
  if (data.length < 2) return null
  const max = Math.max(...data, 1)
  const min = Math.min(...data)
  const range = max - min || 1
  const w = 120; const h = height
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w
    const y = h - ((v - min) / range) * (h - 8) - 4
    return `${x},${y}`
  }).join(' ')
  const gradientId = `grad-${color.replace(/[^a-zA-Z0-9]/g, '')}`
  return (
    <svg width={w} height={h} className="overflow-visible">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,${h} ${points} ${w},${h}`} fill={`url(#${gradientId})`} />
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// ── Bar chart ─────────────────────────────────────────────────────────────────

function BarChart({ data }: { data: { date: string; count: number; revenue: number }[] }) {
  const maxRevenue = Math.max(...data.map(d => d.revenue), 1)
  return (
    <div className="flex items-end gap-1 h-32 w-full">
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
          <div className="w-full flex flex-col justify-end gap-0.5" style={{ height: '100%' }}>
            <div
              className="w-full rounded-t-sm bg-blue/30 group-hover:bg-blue/50 transition-all relative"
              style={{ height: `${(d.revenue / maxRevenue) * 100}%`, minHeight: d.revenue > 0 ? 4 : 0 }}
            >
              <div className="absolute -top-12 left-1/2 -translate-x-1/2 card-raised rounded-lg px-2 py-1.5 text-[10px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all z-10 pointer-events-none">
                <div className="text-ink-primary font-semibold">{fmtMoney(d.revenue)}</div>
                <div className="text-ink-tertiary">{d.count} facturas</div>
              </div>
            </div>
          </div>
          <span className="text-[9px] text-ink-ghost truncate w-full text-center">{d.date}</span>
        </div>
      ))}
    </div>
  )
}

// ── Selector de sucursal ──────────────────────────────────────────────────────

function BranchSelector({
  branches,
  selected,
  onChange,
}: {
  branches: Branch[]
  selected: string | null
  onChange: (id: string | null) => void
}) {
  const [open, setOpen] = useState(false)
  const selectedBranch  = branches.find(b => b.id === selected)

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-raised border border-edge text-sm text-ink-secondary hover:text-ink-primary hover:border-edge-strong transition-all"
      >
        <Building2 className="w-3.5 h-3.5 text-blue" />
        <span className="font-medium">
          {selectedBranch ? selectedBranch.name : 'Todas las sucursales'}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-56 card rounded-xl shadow-xl z-50 overflow-hidden">
          {/* Opción: todas */}
          <button
            onClick={() => { onChange(null); setOpen(false) }}
            className={`w-full px-4 py-2.5 text-left text-sm flex items-center gap-2 hover:bg-edge-subtle transition-colors ${
              selected === null ? 'text-blue font-semibold' : 'text-ink-secondary'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            Todas las sucursales
          </button>
          <div className="border-t border-edge-subtle" />
          {/* Opciones por sucursal */}
          {branches.map(b => (
            <button
              key={b.id}
              onClick={() => { onChange(b.id); setOpen(false) }}
              className={`w-full px-4 py-2.5 text-left text-sm hover:bg-edge-subtle transition-colors ${
                selected === b.id ? 'text-blue font-semibold' : 'text-ink-secondary'
              }`}
            >
              {b.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Desglose por sucursal ─────────────────────────────────────────────────────

function BranchBreakdown({
  breakdown,
}: {
  breakdown: { branchId: string; branchName: string; count: number; revenue: number }[]
}) {
  if (!breakdown?.length) return null
  const totalRevenue = breakdown.reduce((s, b) => s + b.revenue, 0)

  return (
    <div className="card rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <Building2 className="w-4 h-4 text-blue" />
        <h3 className="text-sm font-semibold text-ink-primary">Desempeño por sucursal</h3>
      </div>
      <div className="space-y-3">
        {breakdown.map(b => {
          const pct = totalRevenue > 0 ? Math.round((b.revenue / totalRevenue) * 100) : 0
          return (
            <div key={b.branchId}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm text-ink-secondary font-medium">{b.branchName}</span>
                <div className="flex items-center gap-3 text-xs text-ink-tertiary">
                  <span>{b.count} facturas</span>
                  <span className="font-semibold text-ink-primary font-mono">{fmtMoney(b.revenue)}</span>
                  <span className="text-blue font-semibold w-8 text-right">{pct}%</span>
                </div>
              </div>
              {/* Barra de progreso */}
              <div className="h-1.5 bg-edge-subtle rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue rounded-full transition-all duration-700"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [data, setData]             = useState<DashboardData | null>(null)
  const [loading, setLoading]       = useState(true)
  const [period, setPeriod]         = useState<'7d' | '30d' | '90d'>('30d')
  const [certDays, setCertDays]     = useState<number | null>(null)
  const [branches, setBranches]     = useState<Branch[]>([])
  const [selectedBranch, setSelectedBranch] = useState<string | null>(null)

  const user    = getUser()
  const isAdmin = user.role === 'SUPER_ADMIN' || user.role === 'ADMIN'

  // ── Cargar sucursales (solo para ADMIN) ──────────────────────────────────
  useEffect(() => {
    if (!isAdmin) return
    fetch(`${API_URL}/branches`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
      .then(r => r.json())
      .then(d => setBranches(d.data ?? []))
      .catch(() => {})
  }, [isAdmin])

  // ── Fetch del dashboard ──────────────────────────────────────────────────
  const fetchDashboard = useCallback(async () => {
    setLoading(true)
    try {
      // ADMIN: usa la sucursal seleccionada o todas (sin filtro)
      // MANAGER/OPERATOR: usa su branchId del JWT siempre
      const branchId = isAdmin ? selectedBranch : user.branchId

      // Si no es admin y no tiene branchId asignado → no cargar
      if (!isAdmin && !branchId) {
        setLoading(false)
        return
      }

      // Construir URL con o sin filtro de sucursal
      const branchParam = branchId ? `&branchId=${branchId}` : ''
      const res  = await fetch(`${API_URL}/invoices?page=1&limit=500${branchParam}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      })
      const json = await res.json()
      const payload  = json.data ?? json
      const invoices: Invoice[] = Array.isArray(payload.data) ? payload.data : []

      // Cálculo de períodos
      const now      = new Date()
      const days     = period === '7d' ? 7 : period === '30d' ? 30 : 90
      const from     = new Date(now.getTime() - days * 86400000)

      const current = invoices.filter(inv => new Date(inv.created_at) >= from)
      const prev    = invoices.filter(inv => {
        const d = new Date(inv.created_at)
        return d >= new Date(from.getTime() - days * 86400000) && d < from
      })

      const authorized = current.filter(inv =>
        inv.sri_status === 'AUTORIZADO' || inv.delivery_status === 'AUTHORIZED'
      )
      const revenue  = current.reduce((s, inv) => s + (Number(inv.invoice_data?.importeTotal) || 0), 0)
      const prevRev  = prev.reduce((s, inv) => s + (Number(inv.invoice_data?.importeTotal) || 0), 0)

      // Daily data para el gráfico
      const dailyMap = new Map<string, { count: number; revenue: number }>()
      const chartDays = Math.min(days, 14)
      for (let i = chartDays - 1; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 86400000)
        const key = d.toLocaleDateString('es-EC', { day: '2-digit', month: 'short' })
        dailyMap.set(key, { count: 0, revenue: 0 })
      }
      current.forEach(inv => {
        const d   = new Date(inv.created_at)
        const key = d.toLocaleDateString('es-EC', { day: '2-digit', month: 'short' })
        if (dailyMap.has(key)) {
          const entry = dailyMap.get(key)!
          entry.count++
          entry.revenue += Number(inv.invoice_data?.importeTotal) || 0
        }
      })

      // Desglose por sucursal (solo cuando ADMIN ve "todas")
      let branchBreakdown = undefined
      if (isAdmin && !selectedBranch && branches.length > 0) {
        const byBranch = new Map<string, { count: number; revenue: number }>()
        current.forEach(inv => {
          const bid = inv.branch_id ?? 'sin-sucursal'
          const entry = byBranch.get(bid) ?? { count: 0, revenue: 0 }
          entry.count++
          entry.revenue += Number(inv.invoice_data?.importeTotal) || 0
          byBranch.set(bid, entry)
        })
        branchBreakdown = Array.from(byBranch.entries()).map(([bid, v]) => ({
          branchId:   bid,
          branchName: branches.find(b => b.id === bid)?.name ?? 'Sin sucursal',
          ...v,
        })).sort((a, b) => b.revenue - a.revenue)
      }

      setData({
        totalInvoices:      current.length,
        authorizedInvoices: authorized.length,
        totalRevenue:       revenue,
        authRate:           current.length > 0 ? Math.round((authorized.length / current.length) * 100) : 0,
        prevTotalInvoices:  prev.length,
        prevRevenue:        prevRev,
        dailyData:          Array.from(dailyMap.entries()).map(([date, v]) => ({ date, ...v })),
        recentInvoices:     invoices.slice(0, 5),
        branchBreakdown,
      })

      // Certificado
      try {
        const certRes  = await fetch(`${API_URL}/certificates/status`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        })
        const certJson = await certRes.json()
        const cert = certJson.data?.certificate ?? certJson.certificate
        if (cert?.valid_until) {
          const d = Math.ceil((new Date(cert.valid_until).getTime() - Date.now()) / 86400000)
          setCertDays(d)
        }
      } catch {}

    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [period, selectedBranch, isAdmin, user.branchId, branches])

  useEffect(() => { fetchDashboard() }, [fetchDashboard])

  const growth      = data ? pct(data.totalRevenue, data.prevRevenue) : 0
  const invoiceDiff = data ? pct(data.totalInvoices, data.prevTotalInvoices) : 0

  const kpis = data ? [
    {
      title: 'Facturas emitidas', value: data.totalInvoices, format: 'number',
      diff: invoiceDiff, icon: FileText, color: '#3B82F6',
      sparkline: data.dailyData.map(d => d.count),
    },
    {
      title: 'Autorizadas', value: data.authorizedInvoices, format: 'number',
      diff: data.authRate, diffLabel: `${data.authRate}% autorización`,
      icon: CheckCircle2, color: '#10B981',
      sparkline: data.dailyData.map(d => d.count),
    },
    {
      title: 'Ingresos totales', value: data.totalRevenue, format: 'money',
      diff: growth, icon: DollarSign, color: '#F59E0B',
      sparkline: data.dailyData.map(d => d.revenue),
    },
    {
      title: 'Crecimiento', value: Math.abs(growth), format: 'pct',
      diff: growth, icon: Zap, color: growth >= 0 ? '#10B981' : '#EF4444',
      sparkline: data.dailyData.map(d => d.revenue),
    },
  ] : []

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-ink-primary tracking-tight">
              Bienvenido, {user.name?.split(' ')[0] ?? 'Admin'} 👋
            </h1>
            <p className="text-sm text-ink-tertiary mt-0.5">{user.tenantName}</p>
          </div>

          <div className="flex items-center gap-2">
            {/* Selector de sucursal — solo para ADMIN/SUPER_ADMIN */}
            {isAdmin && branches.length > 0 && (
              <BranchSelector
                branches={branches}
                selected={selectedBranch}
                onChange={setSelectedBranch}
              />
            )}

            {/* Selector de período */}
            <div className="flex items-center bg-surface-raised border border-edge rounded-lg p-1 gap-1">
              {(['7d', '30d', '90d'] as const).map(p => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    period === p ? 'bg-blue text-white' : 'text-ink-tertiary hover:text-ink-primary'
                  }`}
                >
                  {p === '7d' ? '7 días' : p === '30d' ? '30 días' : '90 días'}
                </button>
              ))}
            </div>

            <button
              onClick={fetchDashboard}
              className="p-2 rounded-lg bg-edge-subtle border border-edge text-ink-tertiary hover:text-ink-primary transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Banner sucursal activa (cuando ADMIN filtra por una) */}
        {isAdmin && selectedBranch && branches.length > 0 && (
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue/5 border border-blue/20 text-sm text-blue">
            <Building2 className="w-4 h-4 shrink-0" />
            <span>
              Viendo datos de <strong>{branches.find(b => b.id === selectedBranch)?.name}</strong>
            </span>
            <button
              onClick={() => setSelectedBranch(null)}
              className="ml-auto text-xs text-blue/60 hover:text-blue underline"
            >
              Ver todas
            </button>
          </div>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="card rounded-2xl p-5 animate-pulse">
                <div className="h-3 bg-edge-subtle rounded w-24 mb-4" />
                <div className="h-8 bg-edge-subtle rounded w-32 mb-3" />
                <div className="h-10 bg-edge-subtle rounded" />
              </div>
            ))
          ) : (
            kpis.map((kpi, i) => {
              const Icon = kpi.icon
              const isUp = kpi.diff >= 0
              const TrendIcon = isUp ? TrendingUp : TrendingDown
              return (
                <div key={i} className="card rounded-2xl p-5 hover:border-edge-strong transition-all group">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[11px] font-semibold uppercase tracking-widest text-ink-tertiary">
                      {kpi.title}
                    </span>
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                      style={{ background: `${kpi.color}15` }}>
                      <Icon className="w-3.5 h-3.5" style={{ color: kpi.color }} />
                    </div>
                  </div>
                  <div className="mb-3">
                    <div className="text-2xl font-bold text-ink-primary tracking-tight">
                      {kpi.format === 'money' ? fmtMoney(kpi.value as number)
                        : kpi.format === 'pct' ? `${kpi.value}%`
                        : kpi.value}
                    </div>
                    <div className={`flex items-center gap-1 mt-1 text-[11px] font-medium ${
                      isUp ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'
                    }`}>
                      <TrendIcon className="w-3 h-3" />
                      {(kpi as any).diffLabel ?? `${isUp ? '+' : ''}${kpi.diff}% vs período anterior`}
                    </div>
                  </div>
                  <div className="opacity-70 group-hover:opacity-100 transition-opacity">
                    <Sparkline data={kpi.sparkline} color={kpi.color} />
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Banner certificado */}
        {certDays !== null && (
          <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm ${
            certDays <= 7
              ? 'bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400'
              : 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400'
          }`}>
            <span className="text-lg">{certDays <= 7 ? '🚨' : '⚠️'}</span>
            <span className="font-medium">
              {certDays <= 0
                ? 'Tu certificado digital ha vencido — no puedes emitir facturas'
                : `Tu certificado digital vence en ${certDays} día${certDays !== 1 ? 's' : ''} — renuévalo pronto`}
            </span>
          </div>
        )}

        {/* Charts row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Bar chart */}
          <div className="lg:col-span-2 card rounded-2xl p-5">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-sm font-semibold text-ink-primary">Ingresos por día</h3>
                <p className="text-xs text-ink-tertiary mt-0.5">
                  Últimos {period === '7d' ? 7 : 14} días
                  {isAdmin && selectedBranch && ` · ${branches.find(b => b.id === selectedBranch)?.name}`}
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-blue/50" />
                <span className="text-[11px] text-ink-tertiary">Ingresos</span>
              </div>
            </div>
            {loading ? (
              <div className="h-32 bg-edge-subtle rounded-xl animate-pulse" />
            ) : data ? (
              <BarChart data={data.dailyData} />
            ) : null}
          </div>

          {/* Auth rate donut */}
          <div className="card rounded-2xl p-5">
            <div className="mb-5">
              <h3 className="text-sm font-semibold text-ink-primary">Tasa de autorización</h3>
              <p className="text-xs text-ink-tertiary mt-0.5">SRI · período actual</p>
            </div>
            {loading ? (
              <div className="h-32 bg-edge-subtle rounded-xl animate-pulse" />
            ) : data ? (
              <div className="flex flex-col items-center justify-center h-32 relative">
                <svg width="120" height="120" viewBox="0 0 120 120" className="-rotate-90">
                  <circle cx="60" cy="60" r="50" fill="none" stroke="var(--edge)" strokeWidth="12" />
                  <circle cx="60" cy="60" r="50" fill="none"
                    stroke="#10B981" strokeWidth="12"
                    strokeDasharray={`${2 * Math.PI * 50}`}
                    strokeDashoffset={`${2 * Math.PI * 50 * (1 - data.authRate / 100)}`}
                    strokeLinecap="round"
                    className="transition-all duration-1000"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold text-ink-primary">{data.authRate}%</span>
                  <span className="text-[10px] text-ink-tertiary">autorizadas</span>
                </div>
              </div>
            ) : null}
            {data && (
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="text-ink-secondary">Autorizadas</span>
                  </div>
                  <span className="font-semibold text-ink-primary">{data.authorizedInvoices}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-ink-ghost" />
                    <span className="text-ink-secondary">Total emitidas</span>
                  </div>
                  <span className="font-semibold text-ink-primary">{data.totalInvoices}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Desglose por sucursal — solo cuando ADMIN ve "todas" y hay más de 1 sucursal */}
        {!loading && data?.branchBreakdown && data.branchBreakdown.length > 1 && (
          <BranchBreakdown breakdown={data.branchBreakdown} />
        )}

        {/* AI Insights */}
        <AiInsightsPanel />

        {/* Últimas facturas */}
        <div className="card rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-ink-primary">Últimas facturas</h3>
            <a href="/facturas" className="flex items-center gap-1 text-xs text-blue hover:underline">
              Ver todas <ArrowUpRight className="w-3 h-3" />
            </a>
          </div>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-10 bg-edge-subtle rounded-lg animate-pulse" />
              ))}
            </div>
          ) : data?.recentInvoices.length === 0 ? (
            <div className="py-8 text-center text-sm text-ink-tertiary">No hay facturas aún</div>
          ) : (
            <div className="space-y-2">
              {data?.recentInvoices.map(inv => (
                <div key={inv.id}
                  className="flex items-center justify-between py-2.5 px-3 rounded-xl hover:bg-edge-subtle transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-blue-muted flex items-center justify-center">
                      <FileText className="w-3.5 h-3.5 text-blue" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-ink-primary">
                        {inv.invoice_data?.razonSocialComprador || '—'}
                      </div>
                      <div className="font-mono text-[10px] text-ink-ghost">{inv.sequential}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-bold text-ink-primary">
                      {fmtMoney(Number(inv.invoice_data?.importeTotal) || 0)}
                    </div>
                    <div className="text-[10px] text-ink-ghost">
                      {new Date(inv.created_at).toLocaleDateString('es-EC', { day: '2-digit', month: 'short' })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </DashboardLayout>
  )
}
