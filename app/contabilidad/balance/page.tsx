'use client'
import { useEffect, useState } from 'react'
import {
  Scale, Calendar, RefreshCw, Loader2, AlertCircle, X,
  CheckCircle2, AlertTriangle, Printer,
} from 'lucide-react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { reportsApi } from '../api-4d'
import { type BalanceSheet, type BalanceLine, fmtMoney, fmtDate } from '../types-4d'

export default function BalancePage() {
  const today = new Date().toISOString().slice(0, 10)
  const [asOf, setAsOf] = useState(today)
  const [data, setData] = useState<BalanceSheet | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function load() {
    setLoading(true)
    setError('')
    try {
      const sheet = await reportsApi.balanceSheet(asOf)
      setData(sheet)
    } catch (e: any) {
      setError(e.message || 'Error al cargar balance')
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
              <Scale className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <h1 className="text-lg font-bold text-ink-primary">Balance General</h1>
            </div>
            <p className="text-sm text-ink-tertiary mt-0.5">
              Estado de Situación Financiera al {fmtDate(asOf)}
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

        {/* Selector fecha */}
        <div className="card p-4">
          <div className="flex items-end gap-3 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <label className="text-[10px] uppercase tracking-widest text-ink-tertiary font-semibold mb-1.5 flex items-center gap-1">
                <Calendar className="w-2.5 h-2.5" />
                Al corte del
              </label>
              <input
                type="date"
                value={asOf}
                onChange={(e) => setAsOf(e.target.value)}
                className="field w-full"
              />
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {[
                { label: 'Hoy', action: () => setAsOf(today) },
                {
                  label: 'Fin de mes',
                  action: () => {
                    const d = new Date()
                    setAsOf(new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10))
                  },
                },
                {
                  label: 'Fin de año',
                  action: () => setAsOf(new Date(new Date().getFullYear(), 11, 31).toISOString().slice(0, 10)),
                },
              ].map(({ label, action }) => (
                <button
                  key={label}
                  onClick={action}
                  className="flex items-center px-3 py-2 rounded-lg bg-edge-subtle border border-edge text-xs text-ink-secondary hover:text-ink-primary hover:border-edge-strong transition-all"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
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
            <p className="text-sm text-ink-tertiary">Calculando balance...</p>
          </div>
        )}

        {data && (
          <>
            {/* Validación A = P + PN */}
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
                    ? 'Balance cuadrado ✓'
                    : `Diferencia: ${fmtMoney(data.totals.difference)}`
                  }
                </p>
                <p className="text-[11px] text-ink-tertiary mt-0.5">
                  Activos {fmtMoney(data.totals.assets)} = Pasivos + Patrimonio{' '}
                  {fmtMoney(data.totals.liabilities_and_equity)}
                </p>
              </div>
            </div>

            {/* 2 columnas */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* ACTIVOS */}
              <Section
                title="Activos"
                accounts={data.assets.accounts}
                total={data.assets.total}
                emphasis="asset"
              />

              {/* PASIVOS + PATRIMONIO */}
              <div className="space-y-5">
                <Section
                  title="Pasivos"
                  accounts={data.liabilities.accounts}
                  total={data.liabilities.total}
                  emphasis="liability"
                />
                <Section
                  title="Patrimonio"
                  accounts={data.equity.accounts}
                  total={data.equity.total}
                  emphasis="equity"
                  extraRow={
                    data.equity.current_year_earnings !== 0
                      ? {
                          label: 'Utilidad/Pérdida del ejercicio',
                          value: data.equity.current_year_earnings,
                        }
                      : undefined
                  }
                />
                <div className="card p-4 bg-edge-subtle">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-ink-secondary">
                      Total Pasivos + Patrimonio
                    </span>
                    <span className="font-mono text-base font-bold tabular-nums text-ink-primary">
                      {fmtMoney(data.totals.liabilities_and_equity)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  )
}

// ─── Subcomponentes ────────────────────────────────────────────────

function Section({
  title, accounts, total, emphasis, extraRow,
}: {
  title: string
  accounts: BalanceLine[]
  total: number
  emphasis: 'asset' | 'liability' | 'equity'
  extraRow?: { label: string; value: number }
}) {
  const color =
    emphasis === 'asset'     ? '#22c55e' :
    emphasis === 'liability' ? '#f87171' :
    '#60a5fa'

  return (
    <div className="card overflow-hidden">
      <div className="px-5 py-3 border-b border-edge-subtle" style={{ backgroundColor: `${color}12` }}>
        <h3 className="text-[10px] font-semibold uppercase tracking-widest" style={{ color }}>
          {title}
        </h3>
      </div>
      {accounts.length === 0 && !extraRow ? (
        <div className="px-5 py-8 text-center">
          <p className="text-sm text-ink-tertiary italic">Sin movimientos</p>
        </div>
      ) : (
        <table className="w-full">
          <tbody>
            {accounts.map((acc) => (
              <tr key={acc.account_id} className="border-b border-edge-subtle last:border-0 hover:bg-edge-subtle transition-colors">
                <td className="px-5 py-2.5">
                  <span className="font-mono text-[11px] text-ink-tertiary tabular-nums mr-2">
                    {acc.code}
                  </span>
                  <span className="text-sm text-ink-primary">{acc.name}</span>
                </td>
                <td className="px-5 py-2.5 text-right font-mono text-sm font-semibold text-ink-primary tabular-nums whitespace-nowrap">
                  {fmtMoney(acc.balance)}
                </td>
              </tr>
            ))}
            {extraRow && (
              <tr className="border-b border-edge-subtle last:border-0 bg-edge-subtle/50">
                <td className="px-5 py-2.5">
                  <span className="text-xs italic text-ink-secondary">{extraRow.label}</span>
                </td>
                <td className={`px-5 py-2.5 text-right font-mono text-sm font-semibold tabular-nums whitespace-nowrap ${
                  extraRow.value >= 0
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-red-600 dark:text-red-400'
                }`}>
                  {fmtMoney(extraRow.value)}
                </td>
              </tr>
            )}
          </tbody>
          <tfoot className="bg-edge-subtle">
            <tr>
              <td
                className="px-5 py-3 text-[10px] font-semibold uppercase tracking-widest"
                style={{ color }}
              >
                Total {title.toLowerCase()}
              </td>
              <td className="px-5 py-3 text-right font-mono text-sm font-bold text-ink-primary tabular-nums">
                {fmtMoney(total)}
              </td>
            </tr>
          </tfoot>
        </table>
      )}
    </div>
  )
}
