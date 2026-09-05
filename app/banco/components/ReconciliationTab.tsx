'use client'
import { useEffect, useState, useCallback } from 'react'
import {
  CheckCircle2, AlertCircle, ArrowDownLeft, ArrowUpRight,
  Check, EyeOff, FileSearch,
} from 'lucide-react'
import { bankApi, fmtMoney, fmtDate } from '../api'
import type { BankAccount, BankMovement } from '../types'
import { ReconcileMovementModal } from './ReconcileMovementModal'

interface Props {
  accounts: BankAccount[]
  refreshKey: number
  onChange: () => void
}

/**
 * Tab de Conciliación: lista SOLO movimientos pendientes (PENDING),
 * agrupados por cuenta, con CTAs directos para conciliar o ignorar.
 *
 * Es una vista "task-oriented" — el usuario llega acá cuando quiere
 * cerrar pendientes en bloque.
 */
export function ReconciliationTab({ accounts, refreshKey, onChange }: Props) {
  const [movements, setMovements] = useState<BankMovement[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reconcileMovement, setReconcileMovement] = useState<BankMovement | null>(null)

  const loadPending = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await bankApi.listMovements({ status: 'PENDING', limit: 500 })
      setMovements(res.data || [])
    } catch (e: any) {
      setError(e.message || 'Error al cargar pendientes')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadPending() }, [loadPending, refreshKey])

  const handleIgnore = async (m: BankMovement) => {
    if (!confirm('¿Marcar este movimiento como ignorado?')) return
    try {
      await bankApi.ignoreMovement(m.id)
      onChange()
      loadPending()
    } catch (e: any) {
      alert(e.message || 'Error')
    }
  }

  // Agrupar por cuenta
  const grouped = movements.reduce((acc, m) => {
    const accId = m.bank_account_id
    if (!acc[accId]) acc[accId] = []
    acc[accId].push(m)
    return acc
  }, {} as Record<string, BankMovement[]>)

  return (
    <>
      <div className="space-y-4">
        {error && (
          <div className="card rounded-xl p-3 flex items-start gap-2 text-xs text-red-600 dark:text-red-400">
            <AlertCircle className="w-3.5 h-3.5 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="card rounded-2xl p-5">
                <div className="h-4 bg-edge-subtle rounded w-48 mb-4 animate-pulse" />
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, j) => (
                    <div key={j} className="h-14 bg-edge-subtle rounded-xl animate-pulse" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : movements.length === 0 ? (
          <div className="card rounded-2xl py-16 text-center">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-500" />
            </div>
            <p className="text-sm font-semibold text-ink-primary mb-1">Todo conciliado</p>
            <p className="text-xs text-ink-tertiary">
              No tenés movimientos pendientes de conciliar
            </p>
          </div>
        ) : (
          Object.entries(grouped).map(([accountId, movs]) => {
            const account = accounts.find((a) => a.id === accountId)
            return (
              <div key={accountId} className="card rounded-2xl">
                <div className="flex items-center justify-between p-4 border-b border-edge-subtle">
                  <div>
                    <h3 className="text-sm font-semibold text-ink-primary">
                      {account?.name || 'Cuenta'}
                    </h3>
                    <p className="text-[11px] text-ink-tertiary mt-0.5">
                      {account?.bank_name} · {movs.length} pendiente{movs.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider px-2 py-1 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold">
                    <FileSearch className="w-3 h-3" />
                    {movs.length} sin conciliar
                  </div>
                </div>

                <div className="divide-y divide-edge-subtle">
                  {movs.map((m) => {
                    const isCredit = m.direction === 'CREDIT'
                    const ArrowIcon = isCredit ? ArrowDownLeft : ArrowUpRight
                    const color = isCredit
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-red-600 dark:text-red-400'
                    return (
                      <div
                        key={m.id}
                        className="flex items-center gap-3 p-4 hover:bg-edge-subtle transition-colors"
                      >
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                            isCredit ? 'bg-emerald-500/10' : 'bg-red-500/10'
                          }`}
                        >
                          <ArrowIcon className={`w-4 h-4 ${color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-ink-primary truncate">
                            {m.description}
                          </div>
                          <div className="text-[11px] text-ink-tertiary mt-0.5">
                            {fmtDate(m.movement_date)}
                            {m.reference && ` · ${m.reference}`}
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className={`text-sm font-bold ${color}`}>
                            {fmtMoney(m.amount, account?.currency || 'USD')}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            onClick={() => setReconcileMovement(m)}
                            className="px-3 py-1.5 rounded-lg bg-blue text-white text-xs font-semibold hover:bg-blue-hover transition-all flex items-center gap-1"
                          >
                            <Check className="w-3.5 h-3.5" />
                            Conciliar
                          </button>
                          <button
                            onClick={() => handleIgnore(m)}
                            title="Marcar como ignorado"
                            className="p-1.5 rounded-lg text-ink-tertiary hover:text-ink-primary hover:bg-edge transition-all"
                          >
                            <EyeOff className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })
        )}
      </div>

      <ReconcileMovementModal
        open={reconcileMovement !== null}
        onClose={() => setReconcileMovement(null)}
        movement={reconcileMovement}
        onReconciled={() => { onChange(); loadPending() }}
      />
    </>
  )
}
