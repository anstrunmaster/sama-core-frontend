'use client'
import { useEffect, useState } from 'react'
import { TrendingUp, AlertCircle, FileText, Users, Package, Calendar } from 'lucide-react'
import { reportsApi, fmtMoney, fmtNumber } from '../api'
import type { DateRange, SalesGroupBy, SalesResponse } from '../types'

interface Props {
  range: DateRange
}

const GROUP_OPTIONS: Array<{ id: SalesGroupBy; label: string; icon: typeof FileText }> = [
  { id: 'day', label: 'Por día', icon: Calendar },
  { id: 'month', label: 'Por mes', icon: Calendar },
  { id: 'customer', label: 'Por cliente', icon: Users },
  { id: 'product', label: 'Por producto', icon: Package },
]

export function SalesReport({ range }: Props) {
  const [groupBy, setGroupBy] = useState<SalesGroupBy>('day')
  const [data, setData] = useState<SalesResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    reportsApi
      .sales(range, groupBy)
      .then((d) => { if (!cancelled) setData(d) })
      .catch((e) => { if (!cancelled) setError(e.message || 'Error') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [range.from, range.to, groupBy])

  // Encontrar el máximo para las barras
  const maxValue = data && data.series.length > 0
    ? Math.max(...data.series.map((s) => s.total))
    : 1

  return (
    <div className="space-y-4">
      {/* Selector de agrupación */}
      <div className="card-raised rounded-xl p-2 flex flex-wrap items-center gap-1">
        {GROUP_OPTIONS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setGroupBy(id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              groupBy === id
                ? 'bg-blue text-white'
                : 'text-ink-tertiary hover:text-ink-primary hover:bg-edge-subtle'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {error && (
        <div className="card rounded-xl p-3 flex items-start gap-2 text-xs text-red-600 dark:text-red-400">
          <AlertCircle className="w-3.5 h-3.5 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Totales */}
      {data && !loading && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <SmallKpi label="Total facturado" value={fmtMoney(data.totals.total)} />
          <SmallKpi label="Subtotal" value={fmtMoney(data.totals.subtotal)} />
          <SmallKpi label="IVA" value={fmtMoney(data.totals.iva)} />
          <SmallKpi label="Ticket promedio" value={fmtMoney(data.totals.avg_ticket)} />
        </div>
      )}

      {/* Detalle agrupado */}
      <div className="card rounded-2xl">
        <div className="p-5 border-b border-edge-subtle">
          <h3 className="text-sm font-semibold text-ink-primary">
            {groupBy === 'day' && 'Ventas por día'}
            {groupBy === 'month' && 'Ventas por mes'}
            {groupBy === 'customer' && 'Top clientes'}
            {groupBy === 'product' && 'Top productos'}
          </h3>
          <p className="text-[11px] text-ink-tertiary mt-0.5">
            {data ? `${data.series.length} ${groupBy === 'customer' ? 'clientes' : groupBy === 'product' ? 'productos' : 'períodos'}` : '—'}
          </p>
        </div>

        {loading ? (
          <div className="p-5 space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-12 bg-edge-subtle rounded-xl animate-pulse" />
            ))}
          </div>
        ) : !data || data.series.length === 0 ? (
          <div className="py-12 text-center">
            <TrendingUp className="w-8 h-8 text-ink-ghost mx-auto mb-2" />
            <p className="text-sm font-medium text-ink-primary mb-1">Sin datos</p>
            <p className="text-xs text-ink-tertiary">
              No hay facturas autorizadas en este período
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-surface-raised">
                <tr className="border-b border-edge-subtle">
                  {[
                    groupBy === 'customer' ? 'Cliente'
                      : groupBy === 'product' ? 'Producto'
                      : 'Período',
                    groupBy === 'product' ? 'Cantidad' : '# Facturas',
                    'Subtotal', 'IVA', 'Total', '%',
                  ].map((h) => (
                    <th
                      key={h}
                      className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-ink-tertiary"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.series.map((row, i) => {
                  const percentage = data.totals.total > 0 ? (row.total / data.totals.total) * 100 : 0
                  return (
                    <tr
                      key={row.key + i}
                      className="border-b border-edge-subtle hover:bg-edge-subtle transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-ink-primary truncate max-w-xs">
                          {row.label}
                        </div>
                        {groupBy === 'customer' && row.extra?.identification && (
                          <div className="font-mono text-[10px] text-ink-ghost">
                            {row.extra.identification}
                          </div>
                        )}
                        {groupBy === 'product' && row.extra?.code && (
                          <div className="font-mono text-[10px] text-ink-ghost">
                            {row.extra.code}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-ink-secondary">
                        {groupBy === 'product'
                          ? fmtNumber(row.extra?.quantity ?? 0)
                          : fmtNumber(row.count)}
                      </td>
                      <td className="px-4 py-3 text-xs text-ink-secondary">
                        {fmtMoney(row.subtotal)}
                      </td>
                      <td className="px-4 py-3 text-xs text-ink-tertiary">
                        {fmtMoney(row.iva)}
                      </td>
                      <td className="px-4 py-3 text-sm font-bold text-ink-primary">
                        {fmtMoney(row.total)}
                      </td>
                      <td className="px-4 py-3 w-32">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-edge rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue rounded-full"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-ink-tertiary w-10 text-right">
                            {percentage.toFixed(1)}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function SmallKpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="card rounded-xl p-4">
      <div className="text-[10px] uppercase tracking-widest text-ink-tertiary font-medium mb-1">
        {label}
      </div>
      <div className="text-lg font-bold text-ink-primary tracking-tight">{value}</div>
    </div>
  )
}
