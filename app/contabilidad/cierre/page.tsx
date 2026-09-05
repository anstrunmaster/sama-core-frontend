'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Lock, LockOpen, RefreshCw, Loader2, AlertCircle, X,
  CheckCircle2, ShieldAlert, Eye, Calendar,
} from 'lucide-react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { closingApi } from '../api-4d'
import {
  type ClosingStatus,
  type ClosingPreview,
  type ClosingExecuteResult,
  fmtMoney, fmtDate,
} from '../types-4d'

export default function CierrePage() {
  const currentYear = new Date().getFullYear()
  const [year, setYear] = useState(currentYear - 1)

  const [status, setStatus] = useState<ClosingStatus | null>(null)
  const [preview, setPreview] = useState<ClosingPreview | null>(null)
  const [result, setResult] = useState<ClosingExecuteResult | null>(null)

  const [loadingStatus, setLoadingStatus] = useState(false)
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [executing, setExecuting] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [error, setError] = useState('')

  async function loadStatus() {
    setLoadingStatus(true)
    setError('')
    setPreview(null)
    setResult(null)
    try {
      const s = await closingApi.status(year)
      setStatus(s)
    } catch (e: any) {
      setError(e.message || 'Error al cargar estado')
    } finally {
      setLoadingStatus(false)
    }
  }

  async function loadPreview() {
    setLoadingPreview(true)
    setError('')
    setResult(null)
    try {
      const p = await closingApi.preview(year)
      setPreview(p)
    } catch (e: any) {
      setError(e.message || 'Error al generar preview')
    } finally {
      setLoadingPreview(false)
    }
  }

  async function executeClosing() {
    setExecuting(true)
    setError('')
    try {
      const r = await closingApi.execute(year)
      setResult(r)
      setConfirmOpen(false)
      setPreview(null)
      await loadStatus()
    } catch (e: any) {
      setError(e.message || 'Error al ejecutar cierre')
    } finally {
      setExecuting(false)
    }
  }

  useEffect(() => {
    loadStatus()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year])

  const years = Array.from({ length: 5 }, (_, i) => currentYear - i)

  return (
    <DashboardLayout>
      <div className="p-6 space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <Lock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <h1 className="text-lg font-bold text-ink-primary">Cierre del ejercicio</h1>
            </div>
            <p className="text-sm text-ink-tertiary mt-0.5">
              Cerrar contablemente un año fiscal: transferir ingresos y gastos a patrimonio
            </p>
          </div>
        </div>

        {/* Selector año */}
        <div className="card p-4">
          <label className="text-[10px] uppercase tracking-widest text-ink-tertiary font-semibold mb-2 flex items-center gap-1">
            <Calendar className="w-2.5 h-2.5" />
            Año fiscal a cerrar
          </label>
          <div className="flex gap-2 flex-wrap">
            {years.map((y) => (
              <button
                key={y}
                onClick={() => setYear(y)}
                className={`px-4 py-2 rounded-lg text-sm font-mono font-bold tabular-nums transition-all ${
                  y === year
                    ? 'bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400'
                    : 'bg-edge-subtle border border-edge text-ink-secondary hover:text-ink-primary hover:border-edge-strong'
                }`}
              >
                {y}
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

        {/* Loading status */}
        {loadingStatus && (
          <div className="card py-12 text-center">
            <Loader2 className="w-5 h-5 text-blue-600 dark:text-blue-400 animate-spin mx-auto mb-2" />
            <p className="text-sm text-ink-tertiary">Consultando estado...</p>
          </div>
        )}

        {/* Estado del año */}
        {status && !loadingStatus && (
          <div className={`flex items-center gap-4 px-4 py-4 rounded-lg border ${
            status.is_closed
              ? 'bg-blue-500/10 border-blue-500/20'
              : 'bg-amber-500/10 border-amber-500/20'
          }`}>
            {status.is_closed ? (
              <Lock className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
            ) : (
              <LockOpen className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-bold ${
                status.is_closed
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-amber-600 dark:text-amber-400'
              }`}>
                Año {year} — {status.is_closed ? 'Cerrado' : 'Abierto'}
              </p>
              {status.is_closed && status.closing_entry ? (
                <p className="text-sm text-ink-secondary mt-0.5">
                  Cerrado con asiento{' '}
                  <Link
                    href={`/contabilidad/asientos/${status.closing_entry.id}`}
                    className="font-mono font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    {status.closing_entry.entry_number}
                  </Link>
                  {' '}por {fmtMoney(status.closing_entry.total)}
                  {status.closing_entry.posted_at && <> el {fmtDate(status.closing_entry.posted_at)}</>}
                </p>
              ) : (
                <p className="text-sm text-ink-secondary mt-0.5">
                  Las cuentas de resultado aún tienen movimientos sin transferir a patrimonio
                </p>
              )}
            </div>
            {!status.is_closed && !preview && !result && (
              <button
                onClick={loadPreview}
                disabled={loadingPreview}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-sm font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 disabled:opacity-50 transition-all shrink-0"
              >
                {loadingPreview
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : <Eye className="w-3.5 h-3.5" />
                }
                Ver preview
              </button>
            )}
          </div>
        )}

        {/* Resultado del cierre */}
        {result && (
          <div className="card p-5 space-y-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 shrink-0" />
              <div>
                <p className="text-sm font-bold text-ink-primary">¡Cierre completado!</p>
                <p className="text-sm text-ink-secondary mt-0.5">
                  Asiento{' '}
                  <Link
                    href={`/contabilidad/asientos/${result.entry.id}`}
                    className="font-mono font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    {result.entry.entry_number}
                  </Link>
                  {' '}generado con {result.summary.lines_count} líneas
                </p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 pt-3 border-t border-edge-subtle">
              <ResultStat label="Total ingresos" value={result.summary.total_income} color="#22c55e" />
              <ResultStat label="Total gastos" value={result.summary.total_expense} color="#fbbf24" />
              <ResultStat
                label={result.summary.result_type === 'UTILITY' ? 'Utilidad neta' : 'Pérdida neta'}
                value={Math.abs(result.summary.net_result)}
                color={result.summary.result_type === 'UTILITY' ? '#22c55e' : '#f87171'}
                emphasized
              />
            </div>
          </div>
        )}

        {/* Preview */}
        {preview && !result && (
          <>
            <div className="card p-5 space-y-4">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <h3 className="text-sm font-bold text-ink-primary">Preview del cierre</h3>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <ResultStat label="Ingresos del año" value={preview.totals.total_income} color="#22c55e" />
                <ResultStat label="Gastos del año" value={preview.totals.total_expense} color="#fbbf24" />
                <ResultStat
                  label={preview.totals.result_type === 'UTILITY' ? 'Utilidad' : 'Pérdida'}
                  value={Math.abs(preview.totals.net_result)}
                  color={preview.totals.result_type === 'UTILITY' ? '#22c55e' : '#f87171'}
                  emphasized
                />
              </div>

              <div className="space-y-3 pt-1">
                {preview.income_accounts.length > 0 && (
                  <DetailSection
                    title="Cuentas de ingresos a cerrar"
                    accounts={preview.income_accounts}
                    color="#22c55e"
                  />
                )}
                {preview.expense_accounts.length > 0 && (
                  <DetailSection
                    title="Cuentas de gastos a cerrar"
                    accounts={preview.expense_accounts}
                    color="#fbbf24"
                  />
                )}
                {preview.retained_earnings_account && (
                  <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                    <p className="text-[10px] uppercase tracking-widest text-blue-600 dark:text-blue-400 font-semibold mb-1">
                      Resultado se transfiere a
                    </p>
                    <p className="text-sm font-mono font-bold text-ink-primary">
                      {preview.retained_earnings_account.code} — {preview.retained_earnings_account.name}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Acciones */}
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setPreview(null)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-edge-subtle border border-edge text-sm text-ink-secondary hover:text-ink-primary hover:border-edge-strong transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={() => setConfirmOpen(true)}
                disabled={executing}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-sm font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 disabled:opacity-50 transition-all"
              >
                <Lock className="w-3.5 h-3.5" />
                Ejecutar cierre del {year}
              </button>
            </div>
          </>
        )}
      </div>

      {/* Modal de confirmación */}
      {confirmOpen && preview && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="card-raised w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-start gap-4 mb-5">
              <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-ink-primary">¿Confirmás el cierre?</h3>
                <p className="text-sm text-ink-tertiary mt-1">
                  Esta acción genera un asiento POSTED irreversible sin reversar.
                </p>
              </div>
            </div>

            <div className="bg-edge-subtle border border-edge-subtle rounded-lg p-3 mb-5 space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-ink-tertiary">Año</span>
                <span className="font-mono font-bold text-ink-primary">{year}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-ink-tertiary">Cuentas afectadas</span>
                <span className="font-mono font-bold text-ink-primary">{preview.will_create_lines}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-ink-tertiary">Resultado</span>
                <span className={`font-mono font-bold ${
                  preview.totals.result_type === 'UTILITY'
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-red-600 dark:text-red-400'
                }`}>
                  {preview.totals.result_type === 'UTILITY' ? 'Utilidad' : 'Pérdida'} de {fmtMoney(Math.abs(preview.totals.net_result))}
                </span>
              </div>
            </div>

            <p className="text-xs text-ink-tertiary leading-relaxed mb-5">
              💡 Si encontrás un error después, podés <strong className="text-ink-secondary">reversar el asiento</strong>{' '}
              y volver a ejecutar el cierre.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setConfirmOpen(false)}
                disabled={executing}
                className="flex-1 py-2.5 rounded-lg border border-edge text-sm text-ink-secondary hover:text-ink-primary hover:border-edge-strong disabled:opacity-50 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={executeClosing}
                disabled={executing}
                className="flex-1 py-2.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-sm font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                {executing
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : <Lock className="w-3.5 h-3.5" />
                }
                Confirmar cierre
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}

// ─── Subcomponentes ────────────────────────────────────────────────

function ResultStat({ label, value, color, emphasized }: {
  label: string
  value: number
  color: string
  emphasized?: boolean
}) {
  return (
    <div className={emphasized ? 'p-3 rounded-lg bg-edge-subtle border border-edge-subtle' : ''}>
      <p className="text-[10px] uppercase tracking-widest text-ink-tertiary font-semibold mb-1">
        {label}
      </p>
      <p
        className={`font-mono tabular-nums ${emphasized ? 'text-lg font-bold' : 'text-sm font-semibold'}`}
        style={{ color }}
      >
        {fmtMoney(value)}
      </p>
    </div>
  )
}

function DetailSection({ title, accounts, color }: {
  title: string
  accounts: any[]
  color: string
}) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-widest font-semibold mb-1.5" style={{ color }}>
        {title} · {accounts.length}
      </p>
      <div className="space-y-0.5">
        {accounts.map((acc) => (
          <div
            key={acc.account_id}
            className="flex items-center justify-between text-sm py-1.5 px-2 rounded-lg hover:bg-edge-subtle transition-colors"
          >
            <span>
              <span className="font-mono text-[11px] text-ink-tertiary mr-2">{acc.code}</span>
              <span className="text-ink-primary">{acc.name}</span>
            </span>
            <span className="font-mono text-sm font-semibold text-ink-primary tabular-nums">
              {fmtMoney(acc.balance)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
