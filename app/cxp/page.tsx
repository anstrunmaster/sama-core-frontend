'use client'
import { useCallback, useEffect, useState } from 'react'
import {
  AlertCircle, RefreshCw, Search, X,
  TrendingDown, Clock, AlertTriangle, CheckCircle2, ShoppingCart,
} from 'lucide-react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import {
  cxpApi,
  fmtMoney, fmtDate, bucketColor,
  type PayablesResponse, type PayableRow,
} from './api-cxp'

const BUCKETS = [
  { value: '',        label: 'Todos'      },
  { value: 'current', label: 'Al día'     },
  { value: '1_30',    label: '1-30 días'  },
  { value: '31_60',   label: '31-60 días' },
  { value: '61_90',   label: '61-90 días' },
  { value: '90_plus', label: '+90 días'   },
]

export default function CxPPage() {
  const [data, setData]       = useState<PayablesResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')
  const [bucket,   setBucket]   = useState('')
  const [search,   setSearch]   = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo,   setDateTo]   = useState('')
  const [page,     setPage]     = useState(1)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await cxpApi.getPayables({
        bucket:    bucket   || undefined,
        date_from: dateFrom || undefined,
        date_to:   dateTo   || undefined,
        page,
        limit: 50,
      })
      setData(res)
    } catch (e: any) {
      setError(e.message || 'Error al cargar cartera')
    } finally {
      setLoading(false)
    }
  }, [bucket, dateFrom, dateTo, page])

  useEffect(() => { load() }, [load])

  const rows: PayableRow[] = (data?.data ?? []).filter(r => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      r.supplier?.legal_name.toLowerCase().includes(q) ||
      r.supplier?.identification.includes(q) ||
      r.sequential.includes(q)
    )
  })

  const summary = data?.summary

  return (
    <DashboardLayout>
      <div className="p-6 space-y-5">

        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <TrendingDown className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <h1 className="text-lg font-bold text-ink-primary">Cuentas por Pagar</h1>
            </div>
            <p className="text-sm text-ink-tertiary mt-0.5">
              Cartera pendiente de pago · {summary?.count ?? 0} compras
            </p>
          </div>
          <button onClick={load} disabled={loading}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-edge-subtle border border-edge text-sm text-ink-secondary hover:text-ink-primary hover:border-edge-strong disabled:opacity-50 transition-all">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="lg:col-span-2 card p-4">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-ink-tertiary mb-1">Total por pagar</p>
              <p className="text-2xl font-bold text-ink-primary tabular-nums">{fmtMoney(summary.total_payable)}</p>
              <p className="text-[11px] text-ink-ghost mt-1">{summary.count} compras pendientes</p>
            </div>
            <SummaryCard label="Al día"     amount={summary.current}      icon={<CheckCircle2 className="w-4 h-4 text-green-500" />}  color="text-green-600 dark:text-green-400"  onClick={() => { setBucket('current'); setPage(1) }} active={bucket === 'current'} />
            <SummaryCard label="1-30 días"  amount={summary.days_1_30}    icon={<Clock className="w-4 h-4 text-blue-500" />}           color="text-blue-600 dark:text-blue-400"    onClick={() => { setBucket('1_30');   setPage(1) }} active={bucket === '1_30'} />
            <SummaryCard label="31-90 días" amount={summary.days_31_60 + summary.days_61_90} icon={<AlertTriangle className="w-4 h-4 text-amber-500" />} color="text-amber-600 dark:text-amber-400" onClick={() => { setBucket('31_60'); setPage(1) }} active={bucket === '31_60' || bucket === '61_90'} />
            <SummaryCard label="+90 días"   amount={summary.days_90_plus} icon={<AlertCircle className="w-4 h-4 text-red-500" />}      color="text-red-600 dark:text-red-400"      onClick={() => { setBucket('90_plus'); setPage(1) }} active={bucket === '90_plus'} />
          </div>
        )}

        <div className="card p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="relative md:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-ghost pointer-events-none" />
              <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Buscar proveedor, RUC o N° compra..." className="field pl-10 w-full" />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-ghost hover:text-ink-tertiary">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1) }} className="field w-full" />
            <input type="date" value={dateTo}   onChange={e => { setDateTo(e.target.value);   setPage(1) }} className="field w-full" />
          </div>
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            {BUCKETS.map(b => (
              <button key={b.value} onClick={() => { setBucket(b.value); setPage(1) }}
                className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                  bucket === b.value
                    ? 'bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400'
                    : 'bg-edge-subtle border-edge text-ink-tertiary hover:text-ink-primary'
                }`}>
                {b.label}
              </button>
            ))}
            {(bucket || search || dateFrom || dateTo) && (
              <button onClick={() => { setBucket(''); setSearch(''); setDateFrom(''); setDateTo(''); setPage(1) }}
                className="px-3 py-1.5 rounded-lg border border-edge text-xs text-ink-ghost hover:text-red-500 hover:border-red-500/20 hover:bg-red-500/10 transition-all flex items-center gap-1">
                <X className="w-3 h-3" /> Limpiar
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-600 dark:text-red-400">
            <AlertCircle className="w-4 h-4 shrink-0" /><span>{error}</span>
          </div>
        )}

        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-surface-raised">
                <tr className="border-b border-edge-subtle">
                  {['Compra','Proveedor','Fecha','Total','Pagado','Saldo','Antigüedad'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-ink-tertiary whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b border-edge-subtle">
                      {Array.from({ length: 7 }).map((_, j) => (
                        <td key={j} className="px-4 py-3.5"><div className="h-4 bg-edge-subtle rounded animate-pulse" /></td>
                      ))}
                    </tr>
                  ))
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-16 text-center">
                      <CheckCircle2 className="w-10 h-10 text-green-500 mx-auto mb-3" />
                      <p className="text-sm font-medium text-ink-primary mb-1">
                        {bucket || search ? 'Sin resultados para los filtros aplicados' : '¡Sin cartera pendiente de pago!'}
                      </p>
                    </td>
                  </tr>
                ) : rows.map(r => {
                  const bc = bucketColor(r.bucket)
                  return (
                    <tr key={r.purchase_id} className="border-b border-edge-subtle hover:bg-edge-subtle transition-colors">
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <ShoppingCart className="w-3.5 h-3.5 text-ink-ghost shrink-0" />
                          <span className="font-mono text-xs font-semibold text-ink-primary">{r.sequential}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="text-sm font-medium text-ink-primary truncate max-w-[200px]">{r.supplier?.legal_name ?? '—'}</p>
                        <p className="text-[11px] text-ink-ghost font-mono">{r.supplier?.identification ?? ''}</p>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-ink-secondary whitespace-nowrap">{fmtDate(r.issue_date)}</td>
                      <td className="px-4 py-3.5 text-sm font-mono text-ink-primary whitespace-nowrap">{fmtMoney(r.total)}</td>
                      <td className="px-4 py-3.5 text-sm font-mono text-green-600 dark:text-green-400 whitespace-nowrap">{r.paid > 0 ? fmtMoney(r.paid) : '—'}</td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className="text-sm font-bold text-ink-primary tabular-nums">{fmtMoney(r.balance)}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${bc.bg} ${bc.text} ${bc.border}`}>
                          {r.days_age === 0 ? 'Hoy' : `${r.days_age}d`}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {data && data.pagination.pages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-edge-subtle">
              <span className="text-xs text-ink-tertiary">Página {data.pagination.page} de {data.pagination.pages} · {data.pagination.total} compras</span>
              <div className="flex items-center gap-2">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1 || loading}
                  className="px-3 py-1.5 rounded-lg border border-edge text-xs text-ink-secondary hover:text-ink-primary disabled:opacity-30 transition-all">Anterior</button>
                <button onClick={() => setPage(p => p + 1)} disabled={page >= data.pagination.pages || loading}
                  className="px-3 py-1.5 rounded-lg border border-edge text-xs text-ink-secondary hover:text-ink-primary disabled:opacity-30 transition-all">Siguiente</button>
              </div>
            </div>
          )}
        </div>

      </div>
    </DashboardLayout>
  )
}

function SummaryCard({ label, amount, icon, color, onClick, active }: {
  label: string; amount: number; icon: React.ReactNode; color: string; onClick: () => void; active: boolean
}) {
  return (
    <button onClick={onClick}
      className={`card p-4 text-left transition-all hover:border-edge-strong ${active ? 'ring-2 ring-blue-500/30 border-blue-500/20' : ''}`}>
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <span className="text-[10px] font-semibold uppercase tracking-widest text-ink-tertiary">{label}</span>
      </div>
      <p className={`text-lg font-bold tabular-nums ${color}`}>{fmtMoney(amount)}</p>
    </button>
  )
}
