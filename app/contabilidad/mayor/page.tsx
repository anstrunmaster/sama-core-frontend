'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Library, Calendar, RefreshCw, Loader2, AlertCircle, X,
  TrendingUp, TrendingDown, BookText, Layers,
} from 'lucide-react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { AccountPicker } from '../asientos/components/AccountPicker'
import { ledgerApi } from '../api-4c'
import { type AccountLedger, fmtMoney, fmtDateShort } from '../types-4c'
import type { Account } from '../cuentas/types'

export default function LibroMayorPage() {
  const today = new Date()
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10)
  const lastOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().slice(0, 10)

  const [account, setAccount] = useState<Account | null>(null)
  const [from, setFrom] = useState(firstOfMonth)
  const [to, setTo] = useState(lastOfMonth)

  const [data, setData] = useState<AccountLedger | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function load() {
    if (!account) return
    setLoading(true)
    setError('')
    try {
      const ledger = await ledgerApi.byAccount(account.id, from, to)
      setData(ledger)
    } catch (e: any) {
      setError(e.message || 'Error al cargar libro mayor')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account?.id, from, to])

  return (
    <DashboardLayout>
      <div className="p-6 space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <Library className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <h1 className="text-lg font-bold text-ink-primary">Libro Mayor</h1>
            </div>
            <p className="text-sm text-ink-tertiary mt-0.5">
              Movimientos y saldo acumulado por cuenta
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/contabilidad/diario"
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-edge-subtle border border-edge text-sm text-ink-secondary hover:text-ink-primary hover:border-edge-strong transition-all"
            >
              <BookText className="w-3.5 h-3.5" />
              Libro Diario
            </Link>
            <Link
              href="/contabilidad/cuentas"
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-edge-subtle border border-edge text-sm text-ink-secondary hover:text-ink-primary hover:border-edge-strong transition-all"
            >
              <Layers className="w-3.5 h-3.5" />
              Plan de Cuentas
            </Link>
            {account && (
              <button
                onClick={load}
                disabled={loading}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-edge-subtle border border-edge text-sm text-ink-secondary hover:text-ink-primary hover:border-edge-strong disabled:opacity-50 transition-all"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              </button>
            )}
          </div>
        </div>

        {/* Filtros */}
        <div className="card p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-1">
              <label className="text-[10px] uppercase tracking-widest text-ink-tertiary font-semibold mb-1.5 block">
                Cuenta
              </label>
              <AccountPicker
                value={account?.id ?? null}
                onChange={setAccount}
                placeholder="Seleccionar cuenta..."
              />
            </div>
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

        {/* Sin cuenta seleccionada */}
        {!account && (
          <div className="card py-16 text-center">
            <Library className="w-10 h-10 text-ink-ghost mx-auto mb-3" />
            <h3 className="text-base font-semibold text-ink-primary mb-1">
              Seleccioná una cuenta
            </h3>
            <p className="text-sm text-ink-tertiary">
              Usá el selector de arriba para ver los movimientos de una cuenta
            </p>
          </div>
        )}

        {/* Loading */}
        {account && loading && !data && (
          <div className="card py-16 text-center">
            <Loader2 className="w-6 h-6 text-blue-600 dark:text-blue-400 animate-spin mx-auto mb-3" />
            <p className="text-sm text-ink-tertiary">Calculando libro mayor...</p>
          </div>
        )}

        {/* Resultado */}
        {data && (
          <>
            {/* Header de cuenta */}
            <div className="card-raised p-5">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="font-mono text-sm font-bold px-2.5 py-1 rounded-lg bg-edge-subtle border border-edge text-ink-secondary">
                  {data.account.code}
                </span>
                <h2 className="text-lg font-bold text-ink-primary">{data.account.name}</h2>
                <span className="text-[10px] uppercase tracking-wider text-ink-tertiary font-semibold">
                  {data.account.account_type}
                </span>
                <span
                  className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
                  style={{
                    backgroundColor: data.account.nature === 'DEBIT' ? 'rgba(34,197,94,.12)' : 'rgba(59,130,246,.12)',
                    color: data.account.nature === 'DEBIT' ? '#22c55e' : '#60a5fa',
                  }}
                >
                  {data.account.nature === 'DEBIT' ? 'Naturaleza débito' : 'Naturaleza crédito'}
                </span>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <SummaryCard label="Saldo inicial" value={data.summary.opening_balance} emphasis="muted" />
              <SummaryCard label="Débitos" value={data.summary.total_debit} icon={TrendingUp} emphasis="debit" />
              <SummaryCard label="Créditos" value={data.summary.total_credit} icon={TrendingDown} emphasis="credit" />
              <SummaryCard
                label="Variación período"
                value={data.summary.period_net}
                emphasis={data.summary.period_net >= 0 ? 'positive' : 'negative'}
              />
              <SummaryCard label="Saldo final" value={data.summary.closing_balance} emphasis="bold" />
            </div>

            {/* Movimientos */}
            {data.movements.length === 0 ? (
              <div className="card py-16 text-center">
                <Library className="w-10 h-10 text-ink-ghost mx-auto mb-3" />
                <h3 className="text-base font-semibold text-ink-primary mb-1">
                  Sin movimientos en el período
                </h3>
                <p className="text-sm text-ink-tertiary">
                  Saldo inicial: <strong className="text-ink-primary">{fmtMoney(data.summary.opening_balance)}</strong>
                </p>
              </div>
            ) : (
              <div className="card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-surface-raised">
                      <tr className="border-b border-edge-subtle">
                        {['Fecha', 'Asiento', 'Descripción', 'Débito', 'Crédito', 'Saldo'].map((h, i) => (
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
                      {/* Saldo inicial */}
                      <tr className="border-b border-edge-subtle bg-edge-subtle/50">
                        <td colSpan={5} className="px-4 py-2 text-xs text-ink-tertiary italic">
                          Saldo inicial al {fmtDateShort(data.period.from)}
                        </td>
                        <td className="px-4 py-2 text-right font-mono text-sm font-semibold text-ink-primary tabular-nums">
                          {fmtMoney(data.summary.opening_balance)}
                        </td>
                      </tr>
                      {data.movements.map((mov) => (
                        <tr
                          key={mov.line_id}
                          className="border-b border-edge-subtle last:border-0 hover:bg-edge-subtle transition-colors"
                        >
                          <td className="px-4 py-3.5">
                            <div className="text-sm text-ink-secondary tabular-nums">
                              {fmtDateShort(mov.entry_date)}
                            </div>
                          </td>
                          <td className="px-4 py-3.5">
                            <Link
                              href={`/contabilidad/asientos/${mov.entry_id}`}
                              className="font-mono text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                            >
                              {mov.entry_number}
                            </Link>
                          </td>
                          <td className="px-4 py-3.5 max-w-[400px]">
                            <div className="text-sm text-ink-primary truncate">
                              {mov.line_description || mov.entry_description}
                            </div>
                            {mov.entry_reference && (
                              <div className="font-mono text-[10px] text-ink-ghost mt-0.5 truncate">
                                ref: {mov.entry_reference}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3.5 text-right font-mono text-sm tabular-nums">
                            {mov.debit > 0 ? (
                              <span className="text-green-600 dark:text-green-400 font-semibold">
                                {fmtMoney(mov.debit)}
                              </span>
                            ) : (
                              <span className="text-ink-ghost">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3.5 text-right font-mono text-sm tabular-nums">
                            {mov.credit > 0 ? (
                              <span className="text-blue-600 dark:text-blue-400 font-semibold">
                                {fmtMoney(mov.credit)}
                              </span>
                            ) : (
                              <span className="text-ink-ghost">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3.5 text-right font-mono text-sm font-bold text-ink-primary tabular-nums">
                            {fmtMoney(mov.balance)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-edge-subtle">
                      <tr>
                        <td
                          colSpan={3}
                          className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-widest text-ink-tertiary"
                        >
                          Totales del período
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-sm font-bold text-green-600 dark:text-green-400 tabular-nums">
                          {fmtMoney(data.summary.total_debit)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-sm font-bold text-blue-600 dark:text-blue-400 tabular-nums">
                          {fmtMoney(data.summary.total_credit)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-sm font-bold text-ink-primary tabular-nums">
                          {fmtMoney(data.summary.closing_balance)}
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

// ─── Subcomponentes ────────────────────────────────────────────────

function SummaryCard({
  label, value, icon: Icon, emphasis,
}: {
  label: string
  value: number
  icon?: any
  emphasis: 'muted' | 'debit' | 'credit' | 'positive' | 'negative' | 'bold'
}) {
  const color =
    emphasis === 'debit'     ? '#22c55e' :
    emphasis === 'credit'    ? '#60a5fa' :
    emphasis === 'positive'  ? '#22c55e' :
    emphasis === 'negative'  ? '#f87171' :
    emphasis === 'bold'      ? '#60a5fa' :
    undefined

  return (
    <div className="card p-4">
      <div className="flex items-center gap-1.5 mb-2">
        {Icon && <Icon className="w-3 h-3" style={{ color }} />}
        <span className="text-[10px] uppercase tracking-widest text-ink-tertiary font-semibold">
          {label}
        </span>
      </div>
      <div
        className={`font-mono tabular-nums ${emphasis === 'bold' ? 'text-base font-bold' : 'text-sm font-semibold'}`}
        style={{ color: color ?? 'var(--ink-secondary)' }}
      >
        {fmtMoney(value)}
      </div>
    </div>
  )
}
