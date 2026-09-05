'use client'
import { useEffect, useState } from 'react'
import {
  LineChart, Calendar, RefreshCw, Loader2, AlertCircle, X,
  TrendingUp, TrendingDown, Printer,
} from 'lucide-react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { reportsApi } from '../api-4d'
import { type IncomeStatement, type BalanceLine, fmtMoney, fmtPct, fmtDate } from '../types-4d'

export default function ResultadosPage() {
  const today = new Date()
  const yearStart = new Date(today.getFullYear(), 0, 1).toISOString().slice(0, 10)
  const todayStr = today.toISOString().slice(0, 10)

  const [from, setFrom] = useState(yearStart)
  const [to, setTo] = useState(todayStr)
  const [data, setData] = useState<IncomeStatement | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function load() {
    setLoading(true)
    setError('')
    try {
      const stmt = await reportsApi.incomeStatement(from, to)
      setData(stmt)
    } catch (e: any) {
      setError(e.message || 'Error al cargar')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to])

  function presetCurrentMonth() {
    const d = new Date()
    setFrom(new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10))
    setTo(new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10))
  }
  function presetCurrentYear() {
    setFrom(yearStart)
    setTo(todayStr)
  }
  function presetLastYear() {
    const y = new Date().getFullYear() - 1
    setFrom(new Date(y, 0, 1).toISOString().slice(0, 10))
    setTo(new Date(y, 11, 31).toISOString().slice(0, 10))
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <LineChart className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <h1 className="text-lg font-bold text-ink-primary">Estado de Resultados</h1>
            </div>
            <p className="text-sm text-ink-tertiary mt-0.5">
              Pérdidas y Ganancias del {fmtDate(from)} al {fmtDate(to)}
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

        {/* Filtros */}
        <div className="card p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] uppercase tracking-widest text-ink-tertiary font-semibold mb-1.5 flex items-center gap-1">
                <Calendar className="w-2.5 h-2.5" />
                Desde
              </label>
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="field w-full"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-widest text-ink-tertiary font-semibold mb-1.5 flex items-center gap-1">
                <Calendar className="w-2.5 h-2.5" />
                Hasta
              </label>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="field w-full"
              />
            </div>
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {[
              { label: 'Mes actual', action: presetCurrentMonth },
              { label: 'Año a la fecha', action: presetCurrentYear },
              { label: 'Año anterior', action: presetLastYear },
            ].map(({ label, action }) => (
              <button
                key={label}
                onClick={action}
                className="flex items-center px-3 py-1.5 rounded-lg bg-edge-subtle border border-edge text-xs text-ink-secondary hover:text-ink-primary hover:border-edge-strong transition-all"
              >
                {label}
              </button>
            ))}
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
            <p className="text-sm text-ink-tertiary">Calculando resultados...</p>
          </div>
        )}

        {data && (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard
                label="Ingresos"
                value={data.income.total}
                icon={TrendingUp}
                color="#22c55e"
              />
              <StatCard
                label="Utilidad bruta"
                value={data.gross_profit}
                pct={data.gross_margin_pct}
                color={data.gross_profit >= 0 ? '#60a5fa' : '#f87171'}
              />
              <StatCard
                label="Gastos operativos"
                value={data.operating_expenses.total}
                icon={TrendingDown}
                color="#fbbf24"
              />
              <StatCard
                label="Utilidad neta"
                value={data.net_income}
                pct={data.net_margin_pct}
                icon={data.net_income >= 0 ? TrendingUp : TrendingDown}
                color={data.net_income >= 0 ? '#22c55e' : '#f87171'}
                emphasized
              />
            </div>

            {/* P&L vertical */}
            <div className="card overflow-hidden">
              <table className="w-full">
                <tbody>
                  {/* INGRESOS */}
                  <SectionHeader title="Ingresos" color="#22c55e" />
                  {data.income.accounts.map((acc) => (
                    <AccountRow key={acc.account_id} acc={acc} />
                  ))}
                  <SubtotalRow label="Total Ingresos" value={data.income.total} color="#22c55e" />

                  {/* COSTO DE VENTAS */}
                  {data.cost_of_sales.accounts.length > 0 && (
                    <>
                      <SectionHeader title="Costo de Ventas" color="#fbbf24" />
                      {data.cost_of_sales.accounts.map((acc) => (
                        <AccountRow key={acc.account_id} acc={acc} negate />
                      ))}
                      <SubtotalRow
                        label="Total Costo de Ventas"
                        value={data.cost_of_sales.total}
                        color="#fbbf24"
                        negate
                      />
                    </>
                  )}

                  {/* UTILIDAD BRUTA */}
                  <tr className="bg-blue-500/10 border-y border-blue-500/20">
                    <td className="px-5 py-3" colSpan={2}>
                      <span className="text-xs font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400">
                        Utilidad Bruta
                      </span>
                      {data.gross_margin_pct !== 0 && (
                        <span className="ml-2 text-[10px] text-ink-tertiary">
                          (margen {fmtPct(data.gross_margin_pct)})
                        </span>
                      )}
                    </td>
                    <td className={`px-5 py-3 text-right font-mono text-base font-bold tabular-nums ${
                      data.gross_profit >= 0
                        ? 'text-blue-600 dark:text-blue-400'
                        : 'text-red-600 dark:text-red-400'
                    }`}>
                      {fmtMoney(data.gross_profit)}
                    </td>
                  </tr>

                  {/* GASTOS OPERATIVOS */}
                  {data.operating_expenses.accounts.length > 0 && (
                    <>
                      <SectionHeader title="Gastos Operativos" color="#f87171" />
                      {data.operating_expenses.accounts.map((acc) => (
                        <AccountRow key={acc.account_id} acc={acc} negate />
                      ))}
                      <SubtotalRow
                        label="Total Gastos Operativos"
                        value={data.operating_expenses.total}
                        color="#f87171"
                        negate
                      />
                    </>
                  )}

                  {/* UTILIDAD / PÉRDIDA NETA */}
                  <tr className={`border-t border-edge ${
                    data.net_income >= 0
                      ? 'bg-green-500/10'
                      : 'bg-red-500/10'
                  }`}>
                    <td className="px-5 py-4" colSpan={2}>
                      <span className={`text-sm font-bold uppercase tracking-widest ${
                        data.net_income >= 0
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-red-600 dark:text-red-400'
                      }`}>
                        {data.net_income >= 0 ? 'Utilidad Neta' : 'Pérdida Neta'}
                      </span>
                      {data.net_margin_pct !== 0 && (
                        <span className="ml-2 text-[10px] text-ink-tertiary">
                          (margen {fmtPct(data.net_margin_pct)})
                        </span>
                      )}
                    </td>
                    <td className={`px-5 py-4 text-right font-mono text-xl font-bold tabular-nums ${
                      data.net_income >= 0
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-red-600 dark:text-red-400'
                    }`}>
                      {fmtMoney(data.net_income)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  )
}

// ─── Subcomponentes ────────────────────────────────────────────────

function StatCard({ label, value, pct, icon: Icon, color, emphasized }: {
  label: string
  value: number
  pct?: number
  icon?: any
  color: string
  emphasized?: boolean
}) {
  return (
    <div className={`card p-4 ${emphasized ? 'border-edge-strong' : ''}`}>
      <div className="flex items-center gap-1.5 mb-2">
        {Icon && <Icon className="w-3 h-3" style={{ color }} />}
        <span className="text-[10px] uppercase tracking-widest text-ink-tertiary font-semibold">
          {label}
        </span>
      </div>
      <div className="text-base font-bold tabular-nums" style={{ color }}>
        {fmtMoney(value)}
      </div>
      {pct !== undefined && pct !== 0 && (
        <div className="text-[10px] text-ink-tertiary mt-0.5">{fmtPct(pct)} margen</div>
      )}
    </div>
  )
}

function SectionHeader({ title, color }: { title: string; color: string }) {
  return (
    <tr style={{ backgroundColor: `${color}12` }}>
      <td colSpan={3} className="px-5 py-2">
        <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color }}>
          {title}
        </span>
      </td>
    </tr>
  )
}

function AccountRow({ acc, negate }: { acc: BalanceLine; negate?: boolean }) {
  return (
    <tr className="border-b border-edge-subtle last:border-0 hover:bg-edge-subtle transition-colors">
      <td className="px-5 py-2.5 w-20 font-mono text-[11px] text-ink-tertiary tabular-nums">
        {acc.code}
      </td>
      <td className="px-5 py-2.5 text-sm text-ink-primary">{acc.name}</td>
      <td className="px-5 py-2.5 text-right font-mono text-sm font-semibold text-ink-primary tabular-nums whitespace-nowrap">
        {negate && '('}{fmtMoney(acc.balance)}{negate && ')'}
      </td>
    </tr>
  )
}

function SubtotalRow({ label, value, color, negate }: {
  label: string
  value: number
  color: string
  negate?: boolean
}) {
  return (
    <tr className="bg-edge-subtle border-b border-edge-subtle">
      <td className="px-5 py-2.5" colSpan={2}>
        <span className="text-xs font-semibold text-ink-secondary">{label}</span>
      </td>
      <td className="px-5 py-2.5 text-right font-mono text-sm font-bold tabular-nums" style={{ color }}>
        {negate && '('}{fmtMoney(value)}{negate && ')'}
      </td>
    </tr>
  )
}
