'use client'
import { useEffect, useState } from 'react'
import {
  ArrowDownLeft, ArrowUpRight, Wallet, AlertCircle, Activity,
} from 'lucide-react'
import { reportsApi, fmtMoney, fmtNumber } from '../api'
import type { CashFlowResponse, DateRange } from '../types'

interface Props {
  range: DateRange
}

export function CashFlowReport({ range }: Props) {
  const [data, setData] = useState<CashFlowResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    reportsApi
      .cashFlow(range)
      .then((d) => { if (!cancelled) setData(d) })
      .catch((e) => { if (!cancelled) setError(e.message || 'Error') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [range.from, range.to])

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="card rounded-2xl p-5 animate-pulse">
              <div className="h-3 bg-edge-subtle rounded w-20 mb-3" />
              <div className="h-8 bg-edge-subtle rounded w-28" />
            </div>
          ))}
        </div>
        <div className="card rounded-2xl p-6 h-64 animate-pulse" />
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

  const netIsPositive = data.totals.net_flow >= 0
  const maxDailyValue = data.series.length > 0
    ? Math.max(...data.series.map((d) => Math.max(d.credit, d.debit)))
    : 1

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-ink-tertiary">
              Entradas
            </span>
            <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-emerald-500/15">
              <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-500" />
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 tracking-tight">
            {fmtMoney(data.totals.total_credit)}
          </div>
          <div className="text-[10px] text-ink-tertiary mt-1">
            Dinero recibido en el período
          </div>
        </div>

        <div className="card rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-ink-tertiary">
              Salidas
            </span>
            <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-red-500/15">
              <ArrowUpRight className="w-3.5 h-3.5 text-red-500" />
            </div>
          </div>
          <div className="text-2xl font-bold text-red-600 dark:text-red-400 tracking-tight">
            {fmtMoney(data.totals.total_debit)}
          </div>
          <div className="text-[10px] text-ink-tertiary mt-1">
            Pagos y egresos del período
          </div>
        </div>

        <div className="card rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-ink-tertiary">
              Flujo neto
            </span>
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
              netIsPositive ? 'bg-emerald-500/15' : 'bg-red-500/15'
            }`}>
              <Wallet className={`w-3.5 h-3.5 ${netIsPositive ? 'text-emerald-500' : 'text-red-500'}`} />
            </div>
          </div>
          <div className={`text-2xl font-bold tracking-tight ${
            netIsPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
          }`}>
            {netIsPositive ? '+' : ''}{fmtMoney(data.totals.net_flow)}
          </div>
          <div className="text-[10px] text-ink-tertiary mt-1">
            {fmtNumber(data.totals.movement_count)} movimientos
          </div>
        </div>
      </div>

      {/* Serie diaria */}
      <div className="card rounded-2xl">
        <div className="p-5 border-b border-edge-subtle">
          <h3 className="text-sm font-semibold text-ink-primary">Flujo diario</h3>
          <p className="text-[11px] text-ink-tertiary mt-0.5">
            Entradas vs salidas por día
          </p>
        </div>

        {data.series.length === 0 ? (
          <div className="py-12 text-center">
            <Activity className="w-8 h-8 text-ink-ghost mx-auto mb-2" />
            <p className="text-sm font-medium text-ink-primary mb-1">Sin movimientos</p>
            <p className="text-xs text-ink-tertiary">
              No hay movimientos bancarios registrados en este período
            </p>
          </div>
        ) : (
          <div className="p-5">
            {/* Mini chart: barras horizontales por día */}
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {data.series.map((day) => {
                const creditW = (day.credit / maxDailyValue) * 100
                const debitW = (day.debit / maxDailyValue) * 100
                return (
                  <div key={day.date} className="flex items-center gap-3 py-1">
                    <div className="text-[10px] font-mono text-ink-tertiary w-20 flex-shrink-0">
                      {day.date}
                    </div>
                    <div className="flex-1 grid grid-cols-2 gap-2">
                      {/* Credit bar (right) */}
                      <div className="flex items-center justify-end gap-2">
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium font-mono">
                          {day.credit > 0 ? `+${fmtMoney(day.credit)}` : ''}
                        </span>
                        <div className="w-24 h-3 bg-edge rounded-full overflow-hidden flex justify-end">
                          {day.credit > 0 && (
                            <div
                              className="h-full bg-emerald-500/70 rounded-full"
                              style={{ width: `${creditW}%` }}
                            />
                          )}
                        </div>
                      </div>
                      {/* Debit bar (left) */}
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-3 bg-edge rounded-full overflow-hidden">
                          {day.debit > 0 && (
                            <div
                              className="h-full bg-red-500/70 rounded-full"
                              style={{ width: `${debitW}%` }}
                            />
                          )}
                        </div>
                        <span className="text-[10px] text-red-600 dark:text-red-400 font-medium font-mono">
                          {day.debit > 0 ? `-${fmtMoney(day.debit)}` : ''}
                        </span>
                      </div>
                    </div>
                    <div className={`text-[10px] font-mono font-bold w-24 text-right ${
                      day.net >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                    }`}>
                      {day.net >= 0 ? '+' : ''}{fmtMoney(day.net)}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Por cuenta */}
      {data.by_account.length > 0 && (
        <div className="card rounded-2xl">
          <div className="p-5 border-b border-edge-subtle">
            <h3 className="text-sm font-semibold text-ink-primary">Flujo por cuenta bancaria</h3>
            <p className="text-[11px] text-ink-tertiary mt-0.5">
              Movimientos agrupados por cuenta
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-surface-raised">
                <tr className="border-b border-edge-subtle">
                  {['Cuenta', 'Entradas', 'Salidas', 'Flujo neto'].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-ink-tertiary">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.by_account.map((acc) => (
                  <tr key={acc.bank_account_id} className="border-b border-edge-subtle hover:bg-edge-subtle transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-ink-primary">
                      {acc.name}
                      <span className="text-[10px] text-ink-tertiary ml-2">{acc.currency}</span>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-emerald-600 dark:text-emerald-400">
                      {fmtMoney(acc.credit, acc.currency)}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-red-600 dark:text-red-400">
                      {fmtMoney(acc.debit, acc.currency)}
                    </td>
                    <td className={`px-4 py-3 text-sm font-bold ${
                      acc.net >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                    }`}>
                      {acc.net >= 0 ? '+' : ''}{fmtMoney(acc.net, acc.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
