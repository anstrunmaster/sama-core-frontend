'use client'
import { useEffect, useState } from 'react'
import {
  TrendingUp, TrendingDown, FileText, Wallet,
  DollarSign, Percent, AlertCircle, Receipt,
} from 'lucide-react'
import { reportsApi, fmtMoney, fmtNumber } from '../api'
import type { DateRange, SummaryResponse } from '../types'

interface Props {
  range: DateRange
}

export function FinancialSummary({ range }: Props) {
  const [data, setData] = useState<SummaryResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    reportsApi
      .summary(range)
      .then((d) => { if (!cancelled) setData(d) })
      .catch((e) => { if (!cancelled) setError(e.message || 'Error') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [range.from, range.to])

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card rounded-2xl p-5 animate-pulse">
              <div className="h-3 bg-edge-subtle rounded w-20 mb-4" />
              <div className="h-8 bg-edge-subtle rounded w-32" />
            </div>
          ))}
        </div>
        <div className="card rounded-2xl p-6 h-32 animate-pulse" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="card rounded-xl p-4 flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
        <AlertCircle className="w-4 h-4" />
        {error}
      </div>
    )
  }

  if (!data) return null

  const kpis = [
    {
      title: 'Ingresos totales',
      value: fmtMoney(data.revenue.total),
      diff: data.revenue.growth_pct,
      sub: `IVA cobrado: ${fmtMoney(data.revenue.iva)}`,
      icon: DollarSign,
      color: '#10B981',
    },
    {
      title: 'Facturas emitidas',
      value: fmtNumber(data.invoices.count),
      diff: data.invoices.growth_pct,
      sub: `Ticket promedio: ${fmtMoney(data.invoices.avg_ticket)}`,
      icon: FileText,
      color: '#3B82F6',
    },
    {
      title: 'Cobrado',
      value: fmtMoney(data.collection.total_collected),
      sub: `${data.collection.reconciled_movements} mov. conciliados`,
      icon: Wallet,
      color: '#A855F7',
    },
    {
      title: 'Pendiente de cobro',
      value: fmtMoney(data.collection.pending_collection),
      sub: 'Facturado - cobrado',
      icon: Receipt,
      color: '#F59E0B',
    },
  ]

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((k, i) => {
          const Icon = k.icon
          const hasDiff = k.diff !== undefined
          const isUp = (k.diff ?? 0) >= 0
          const TrendIcon = isUp ? TrendingUp : TrendingDown
          return (
            <div key={i} className="card rounded-2xl p-5 hover:border-edge-strong transition-all">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-semibold uppercase tracking-widest text-ink-tertiary">
                  {k.title}
                </span>
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ background: `${k.color}15` }}
                >
                  <Icon className="w-3.5 h-3.5" style={{ color: k.color }} />
                </div>
              </div>
              <div className="text-2xl font-bold text-ink-primary tracking-tight">
                {k.value}
              </div>
              {hasDiff && (
                <div className={`flex items-center gap-1 mt-1.5 text-[11px] font-medium ${
                  isUp ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'
                }`}>
                  <TrendIcon className="w-3 h-3" />
                  {isUp ? '+' : ''}{k.diff}% vs período anterior
                </div>
              )}
              {k.sub && (
                <div className="text-[10px] text-ink-tertiary mt-1">{k.sub}</div>
              )}
            </div>
          )
        })}
      </div>

      {/* Detalle: subtotal vs IVA */}
      <div className="card rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-ink-primary mb-4">
          Composición de ingresos
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <BreakdownItem
            label="Subtotal (sin IVA)"
            value={data.revenue.subtotal}
            percentage={data.revenue.total > 0 ? (data.revenue.subtotal / data.revenue.total) * 100 : 0}
            color="#3B82F6"
          />
          <BreakdownItem
            label="IVA cobrado"
            value={data.revenue.iva}
            percentage={data.revenue.total > 0 ? (data.revenue.iva / data.revenue.total) * 100 : 0}
            color="#F59E0B"
          />
          <BreakdownItem
            label="Total facturado"
            value={data.revenue.total}
            percentage={100}
            color="#10B981"
            highlight
          />
        </div>
      </div>
    </div>
  )
}

function BreakdownItem({
  label, value, percentage, color, highlight,
}: {
  label: string
  value: number
  percentage: number
  color: string
  highlight?: boolean
}) {
  return (
    <div className={`p-4 rounded-xl border ${highlight ? 'border-edge bg-edge-subtle' : 'border-edge-subtle'}`}>
      <div className="flex items-center gap-2 mb-2">
        <Percent className="w-3 h-3 text-ink-tertiary" />
        <span className="text-[10px] uppercase tracking-widest text-ink-tertiary font-medium">
          {label}
        </span>
      </div>
      <div className={`text-xl font-bold tracking-tight ${highlight ? 'text-ink-primary' : 'text-ink-primary'}`}>
        {fmtMoney(value)}
      </div>
      <div className="mt-2 h-1.5 bg-edge rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${percentage}%`, background: color }}
        />
      </div>
      <div className="text-[10px] text-ink-tertiary mt-1">
        {percentage.toFixed(1)}%
      </div>
    </div>
  )
}
