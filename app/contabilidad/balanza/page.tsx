'use client'
import { useEffect, useState } from 'react'
import {
  ListChecks, Calendar, RefreshCw, Loader2, AlertCircle, X,
  CheckCircle2, AlertTriangle, Printer,
} from 'lucide-react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { reportsApi } from '../api-4d'
import { type TrialBalance, fmtMoney, fmtDate } from '../types-4d'

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  ASSET:        { label: 'Activo',    color: '#22c55e' },
  LIABILITY:    { label: 'Pasivo',    color: '#f87171' },
  EQUITY:       { label: 'Patrimonio', color: '#60a5fa' },
  INCOME:       { label: 'Ingreso',   color: '#22c55e' },
  REVENUE:      { label: 'Ingreso',   color: '#22c55e' },
  EXPENSE:      { label: 'Gasto',     color: '#fbbf24' },
  COST_OF_SALES:{ label: 'Costo',     color: '#fbbf24' },
  COGS:         { label: 'Costo',     color: '#fbbf24' },
}

export default function BalanzaPage() {
  const today = new Date().toISOString().slice(0, 10)
  const [asOf, setAsOf] = useState(today)
  const [data, setData] = useState<TrialBalance | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function load() {
    setLoading(true)
    setError('')
    try {
      const tb = await reportsApi.trialBalance(asOf)
      setData(tb)
    } catch (e: any) {
      setError(e.message || 'Error al cargar')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [asOf])

  return (
    <DashboardLayout>
      <div className="p-6 space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <ListChecks className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <h1 className="text-lg font-bold text-ink-primary">Balanza de Comprobación</h1>
            </div>
            <p className="text-sm text-ink-tertiary mt-0.5">
              Verificación de saldos al {fmtDate(asOf)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              disabled={!data}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-edge-subtle border border-edge text-sm text-ink-secondary hover:text-ink-primary hover:border-edge-strong disabled:opacity-50 transition-all"
            >
              <Printer className="w-3.5 h-3.5" />
              Imprimir
            </button>
            <button
              onClick={load}
              disabled={loading}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-edge-subtle border border-edge text-sm text-ink-secondary hover:text-ink-primary hover:border-edge-strong disabled:opacity-50 transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Filtro de fecha */}
        <div className="card p-4">
          <label className="text-[10px] uppercase tracking-widest text-ink-tertiary font-semibold mb-1.5 flex items-center gap-1">
            <Calendar className="w-2.5 h-2.5" />
            Al corte del
          </label>
          <input
            type="date"
            value={asOf}
            onChange={(e) => setAsOf(e.target.value)}
            className="field max-w-xs"
          />
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center justify-between px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-600 dark:text-red-400">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              onClick={() => setError('')}
              className="text-red-600/60 dark:text-red-400/60 hover:text-red-600 dark:hover:text-red-400 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Loading */}
        {loading && !data && (
          <div className="card py-16 text-center">
            <Loader2 className="w-6 h-6 text-blue-600 dark:text-blue-400 animate-spin mx-auto mb-3" />
            <p className="text-sm text-ink-tertiary">Calculando balanza...</p>
          </div>
        )}

        {data && (
          <>
            {/* Validación */}
            <div className={`flex items-center gap-3 px-4 py-3 rounded-lg border ${
              data.totals.is_balanced
                ? 'bg-green-500/10 border-green-500/20'
                : 'bg-red-500/10 border-red-500/20'
            }`}>
              {data.totals.is_balanced ? (
                <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
              )}
              <div className="flex-1">
                <p className={`text-sm font-semibold ${
                  data.totals.is_balanced
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-red-600 dark:text-red-400'
                }`}>
                  {data.totals.is_balanced
                    ? 'Balanza cuadrada ✓'
                    : `Descuadre: ${fmtMoney(data.totals.difference)}`
                  }
                </p>
                <p className="text-[11px] text-ink-tertiary mt-0.5">
                  Σ Débitos {fmtMoney(data.totals.total_debit)} = Σ Créditos {fmtMoney(data.totals.total_credit)}
                </p>
              </div>
              <span className="text-xs text-ink-tertiary">{data.rows.length} cuentas</span>
            </div>

            {/* Tabla */}
            {data.rows.length === 0 ? (
              <div className="card py-16 text-center">
                <ListChecks className="w-10 h-10 text-ink-ghost mx-auto mb-3" />
                <p className="text-sm text-ink-tertiary">Sin movimientos a esta fecha</p>
              </div>
            ) : (
              <div className="card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-surface-raised">
                      <tr className="border-b border-edge-subtle">
                        {['Código', 'Cuenta', 'Tipo', 'Σ Débito', 'Σ Crédito', 'Saldo'].map((h, i) => (
                          <th
                            key={i}
                            className={`px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-ink-tertiary ${
                              i >= 3 ? 'text-right' : 'text-left'
                            }`}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {data.rows.map((row) => {
                        const meta = TYPE_LABELS[row.account_type] ?? { label: row.account_type, color: '#888780' }
                        return (
                          <tr
                            key={row.account_id}
                            className="border-b border-edge-subtle last:border-0 hover:bg-edge-subtle transition-colors"
                          >
                            <td className="px-4 py-3.5 font-mono text-xs text-ink-tertiary tabular-nums">
                              {row.code}
                            </td>
                            <td className="px-4 py-3.5 text-sm text-ink-primary font-medium">
                              {row.name}
                            </td>
                            <td className="px-4 py-3.5">
                              <span
                                className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
                                style={{ backgroundColor: `${meta.color}18`, color: meta.color }}
                              >
                                {meta.label}
                              </span>
                            </td>
                            <td className="px-4 py-3.5 text-right font-mono text-sm tabular-nums">
                              {row.total_debit > 0 ? (
                                <span className="text-green-600 dark:text-green-400 font-semibold">
                                  {fmtMoney(row.total_debit)}
                                </span>
                              ) : (
                                <span className="text-ink-ghost">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3.5 text-right font-mono text-sm tabular-nums">
                              {row.total_credit > 0 ? (
                                <span className="text-blue-600 dark:text-blue-400 font-semibold">
                                  {fmtMoney(row.total_credit)}
                                </span>
                              ) : (
                                <span className="text-ink-ghost">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3.5 text-right font-mono text-sm font-bold text-ink-primary tabular-nums">
                              {fmtMoney(row.balance)}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                    <tfoot className="bg-edge-subtle">
                      <tr>
                        <td
                          colSpan={3}
                          className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-widest text-ink-tertiary"
                        >
                          Totales
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-sm font-bold text-green-600 dark:text-green-400 tabular-nums">
                          {fmtMoney(data.totals.total_debit)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-sm font-bold text-blue-600 dark:text-blue-400 tabular-nums">
                          {fmtMoney(data.totals.total_credit)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-sm font-bold text-ink-primary tabular-nums">
                          {fmtMoney(data.totals.total_debit - data.totals.total_credit)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  )
}
