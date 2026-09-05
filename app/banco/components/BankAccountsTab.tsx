'use client'
import { useEffect, useState, useCallback } from 'react'
import {
  Plus, Building2, MoreVertical, Edit2, Archive,
  AlertCircle, Banknote, CreditCard, Wallet, Box,
} from 'lucide-react'
import { bankApi, fmtMoney } from '../api'
import { ACCOUNT_TYPE_LABELS, type BankAccount, type BankAccountType } from '../types'
import { BankAccountModal } from './BankAccountModal'

interface Props {
  /** Cuando cambia, refresca la lista (signal del padre tras conciliar/etc.) */
  refreshKey: number
  /** Para que el padre sepa cuándo cambió algo (refresca summary) */
  onChange: () => void
}

const TYPE_ICONS: Record<BankAccountType, typeof Building2> = {
  CHECKING: Banknote,
  SAVINGS: Wallet,
  CREDIT: CreditCard,
  CASH: Box,
  OTHER: Building2,
}

export function BankAccountsTab({ refreshKey, onChange }: Props) {
  const [accounts, setAccounts] = useState<BankAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<BankAccount | null>(null)
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null)

  const loadAccounts = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await bankApi.listAccounts({ limit: 200 })
      setAccounts(res.data || [])
    } catch (e: any) {
      setError(e.message || 'Error al cargar cuentas')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadAccounts() }, [loadAccounts, refreshKey])

  // Cerrar menú al click afuera
  useEffect(() => {
    const handler = () => setMenuOpenId(null)
    if (menuOpenId) {
      window.addEventListener('click', handler)
      return () => window.removeEventListener('click', handler)
    }
  }, [menuOpenId])

  const handleArchive = async (acc: BankAccount) => {
    if (!confirm(`¿Archivar la cuenta "${acc.name}"? Conserva su historial pero deja de aparecer en operaciones.`)) {
      return
    }
    try {
      await bankApi.archiveAccount(acc.id)
      onChange()
      loadAccounts()
    } catch (e: any) {
      alert(e.message || 'Error al archivar')
    }
  }

  return (
    <>
      <div className="card rounded-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-edge-subtle">
          <div>
            <h2 className="text-sm font-semibold text-ink-primary">Cuentas bancarias</h2>
            <p className="text-[11px] text-ink-tertiary mt-0.5">
              {accounts.length === 0
                ? 'Aún no hay cuentas registradas'
                : `${accounts.length} ${accounts.length === 1 ? 'cuenta activa' : 'cuentas activas'}`}
            </p>
          </div>
          <button
            onClick={() => { setEditing(null); setModalOpen(true) }}
            className="btn btn-primary"
          >
            <Plus className="w-4 h-4" />
            Nueva cuenta
          </button>
        </div>

        {error && (
          <div className="m-5 flex items-start gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-600 dark:text-red-400">
            <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Loading skeleton */}
        {loading ? (
          <div className="p-5 space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-16 bg-edge-subtle rounded-xl animate-pulse" />
            ))}
          </div>
        ) : accounts.length === 0 ? (
          <div className="py-12 text-center">
            <div className="w-12 h-12 rounded-xl bg-edge-subtle flex items-center justify-center mx-auto mb-3">
              <Building2 className="w-5 h-5 text-ink-tertiary" />
            </div>
            <p className="text-sm font-medium text-ink-primary mb-1">No hay cuentas todavía</p>
            <p className="text-xs text-ink-tertiary mb-4">
              Registrá tu primera cuenta para empezar a operar
            </p>
            <button
              onClick={() => { setEditing(null); setModalOpen(true) }}
              className="btn btn-primary"
            >
              <Plus className="w-4 h-4" />
              Crear cuenta
            </button>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-surface-raised">
              <tr className="border-b border-edge-subtle">
                {['Cuenta', 'Banco', 'N° cuenta', 'Tipo', 'Saldo actual', ''].map((h) => (
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
              {accounts.map((acc) => {
                const Icon = TYPE_ICONS[acc.type] || Building2
                return (
                  <tr
                    key={acc.id}
                    className="border-b border-edge-subtle hover:bg-edge-subtle transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-blue-muted flex items-center justify-center flex-shrink-0">
                          <Icon className="w-4 h-4 text-blue" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-ink-primary truncate">
                            {acc.name}
                          </div>
                          {acc.notes && (
                            <div className="text-[10px] text-ink-tertiary truncate max-w-xs">
                              {acc.notes}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-ink-secondary">
                      {acc.bank_name}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-ink-secondary">
                      {acc.account_number}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[10px] uppercase tracking-wider px-2 py-1 rounded bg-edge-subtle text-ink-secondary font-medium">
                        {ACCOUNT_TYPE_LABELS[acc.type]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm font-bold text-ink-primary">
                        {fmtMoney(acc.current_balance, acc.currency)}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setMenuOpenId(menuOpenId === acc.id ? null : acc.id)
                        }}
                        className="p-1.5 rounded-lg text-ink-tertiary hover:text-ink-primary hover:bg-edge transition-all focus:outline-none"
                        aria-label="Más acciones"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>

                      {menuOpenId === acc.id && (
                        <div
                          className="absolute right-4 top-12 z-10 w-48 bg-surface border border-edge rounded-xl shadow-2xl py-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={() => {
                              setEditing(acc); setModalOpen(true); setMenuOpenId(null)
                            }}
                            className="w-full text-left px-3 py-2 text-xs text-ink-primary hover:bg-edge-subtle flex items-center gap-2"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            Editar
                          </button>
                          <button
                            onClick={() => { handleArchive(acc); setMenuOpenId(null) }}
                            className="w-full text-left px-3 py-2 text-xs text-red-600 dark:text-red-400 hover:bg-edge-subtle flex items-center gap-2"
                          >
                            <Archive className="w-3.5 h-3.5" />
                            Archivar
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      <BankAccountModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        account={editing}
        onSaved={() => { onChange(); loadAccounts() }}
      />
    </>
  )
}
