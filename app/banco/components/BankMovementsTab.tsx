'use client'
import { useEffect, useState, useCallback } from 'react'
import {
    Plus, Search, ArrowDownLeft, ArrowUpRight, Check, EyeOff,
  Clock, Trash2, MoreVertical, AlertCircle, RefreshCw, ChevronDown, ChevronUp,
  Pencil, X, Save, Wallet,
} from 'lucide-react'
import { bankApi, fmtMoney, fmtDate } from '../api'
import {
  type BankAccount, type BankMovement, type BankMovementStatus,
  MOVEMENT_STATUS_LABELS,
} from '../types'
import { BankMovementModal } from './BankMovementModal'
import { ReconcileMovementModal } from './ReconcileMovementModal'
import { BankAdvanceModal } from './BankAdvanceModal'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://d16rb4jhhui7p6.cloudfront.net/api/v1'

interface Props {
  accounts: BankAccount[]
  refreshKey: number
  onChange: () => void
}

interface JournalLine {
  id: string
  account_id: string
  description: string
  debit: string
  credit: string
  account?: { id: string; code: string; name: string }
}

interface JournalEntry {
  id: string
  entry_number: string
  description: string
  status: string
  total_debit: string
  total_credit: string
  lines: JournalLine[]
}

interface AccountOption {
  id: string
  code: string
  name: string
}

const STATUS_COLORS: Record<BankMovementStatus, string> = {
  PENDING: '#F59E0B',
  RECONCILED: '#10B981',
  IGNORED: '#71717A',
}

export function BankMovementsTab({ accounts, refreshKey, onChange }: Props) {
  const [movements, setMovements] = useState<BankMovement[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [filterAccount, setFilterAccount] = useState<string>('')
  const [filterStatus, setFilterStatus] = useState<string>('')
  const [search, setSearch] = useState('')

  const [createOpen, setCreateOpen] = useState(false)
  const [reconcileMovement, setReconcileMovement] = useState<BankMovement | null>(null)
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null)

  // Filas expandidas con detalle contable
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [journalMap, setJournalMap] = useState<Record<string, JournalEntry | null>>({})
  const [loadingJournal, setLoadingJournal] = useState<Set<string>>(new Set())

  // Edición inline de cuenta contable
  const [editingLine, setEditingLine] = useState<{ movementId: string; lineId: string } | null>(null)
  const [editAccountId, setEditAccountId] = useState('')
  const [accountOptions, setAccountOptions] = useState<AccountOption[]>([])
  const [savingLine, setSavingLine] = useState(false)
  const [advanceOpen, setAdvanceOpen] = useState(false)

  const loadMovements = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await bankApi.listMovements({
        bank_account_id: filterAccount || undefined,
        status: filterStatus || undefined,
        search: search || undefined,
        limit: 200,
      })
      setMovements(res.data || [])
    } catch (e: any) {
      setError(e.message || 'Error al cargar movimientos')
    } finally {
      setLoading(false)
    }
  }, [filterAccount, filterStatus, search])

  useEffect(() => { loadMovements() }, [loadMovements, refreshKey])

  useEffect(() => {
    const handler = () => setMenuOpenId(null)
    if (menuOpenId) {
      window.addEventListener('click', handler)
      return () => window.removeEventListener('click', handler)
    }
  }, [menuOpenId])

  // Cargar cuentas para el selector de edición
  useEffect(() => {
    fetch(`${API_URL}/accounting/accounts?only_movement=true`, {
      credentials: 'include',
    })
      .then(r => r.json())
      .then(d => setAccountOptions(Array.isArray(d.data) ? d.data : []))
      .catch(() => setAccountOptions([]))
  }, [])

  const loadJournalEntry = async (movementId: string, force = false) => {
    if (!force && journalMap[movementId] !== undefined) return
    setLoadingJournal(prev => new Set(prev).add(movementId))
    try {
      const res = await fetch(
        `${API_URL}/accounting/journal-entries?source=MANUAL&search=${movementId}&limit=1`,
        { credentials: 'include' }
      )
      const data = await res.json()
      const entries = data.data?.data ?? data.data ?? []
      setJournalMap(prev => ({ ...prev, [movementId]: entries[0] ?? null }))
    } catch {
      setJournalMap(prev => ({ ...prev, [movementId]: null }))
    } finally {
      setLoadingJournal(prev => { const s = new Set(prev); s.delete(movementId); return s })
    }
  }

  const toggleRow = (movementId: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev)
      if (next.has(movementId)) {
        next.delete(movementId)
      } else {
        next.add(movementId)
        loadJournalEntry(movementId)
      }
      return next
    })
    setEditingLine(null)
  }

  const startEditLine = (movementId: string, line: JournalLine) => {
    setEditingLine({ movementId, lineId: line.id })
    setEditAccountId(line.account_id)
  }

const saveEditLine = async () => {
    if (!editingLine || !editAccountId) return
    setSavingLine(true)
    try {
      const currentJournal = journalMap[editingLine.movementId]
      if (!currentJournal) return
      await fetch(`${API_URL}/accounting/journal-entries/${currentJournal.id}/lines/${editingLine.lineId}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account_id: editAccountId }),
      })
      const movId = editingLine.movementId
      setEditingLine(null)
      await loadJournalEntry(movId, true)
    } catch (e: any) {
      alert(e.message || 'Error al guardar')
    } finally {
      setSavingLine(false)
    }
  }

  const handleIgnore = async (m: BankMovement) => {
    if (!confirm('¿Marcar este movimiento como ignorado? No se podrá deshacer.')) return
    try {
      await bankApi.ignoreMovement(m.id)
      onChange()
      loadMovements()
    } catch (e: any) {
      alert(e.message || 'Error')
    }
  }

  const handleDelete = async (m: BankMovement) => {
    if (!confirm('¿Eliminar este movimiento? El saldo de la cuenta se recalculará.')) return
    try {
      await bankApi.deleteMovement(m.id)
      onChange()
      loadMovements()
    } catch (e: any) {
      alert(e.message || 'Error')
    }
  }

  return (
    <>
      <div className="card rounded-2xl">
        {/* Header con filtros */}
        <div className="p-5 border-b border-edge-subtle">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-ink-primary">Movimientos</h2>
              <p className="text-[11px] text-ink-tertiary mt-0.5">
                Historial de movimientos de todas tus cuentas
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={loadMovements}
                className="p-2 rounded-lg bg-edge-subtle border border-edge text-ink-tertiary hover:text-ink-primary transition-all"
                title="Recargar"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              </button>
                           <button
                onClick={() => setAdvanceOpen(true)}
                disabled={accounts.length === 0}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-sm font-semibold hover:bg-amber-500/20 transition-all disabled:opacity-50"
              >
                <Wallet className="w-4 h-4" />
                Anticipo
              </button>
              <button
                onClick={() => setCreateOpen(true)}
                disabled={accounts.length === 0}
                className="btn btn-primary"
              >
                <Plus className="w-4 h-4" />
                Nuevo movimiento
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-ghost pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar descripción..."
                className="field pl-10"
              />
            </div>
            <select value={filterAccount} onChange={(e) => setFilterAccount(e.target.value)} className="field">
              <option value="">Todas las cuentas</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>{a.name} — {a.bank_name}</option>
              ))}
            </select>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="field">
              <option value="">Todos los estados</option>
              <option value="PENDING">Pendientes</option>
              <option value="RECONCILED">Conciliados</option>
              <option value="IGNORED">Ignorados</option>
            </select>
          </div>
        </div>

        {error && (
          <div className="m-5 flex items-start gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-600 dark:text-red-400">
            <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="p-5 space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-14 bg-edge-subtle rounded-xl animate-pulse" />
            ))}
          </div>
        ) : movements.length === 0 ? (
          <div className="py-12 text-center">
            <Clock className="w-8 h-8 text-ink-ghost mx-auto mb-2" />
            <p className="text-sm font-medium text-ink-primary mb-1">No hay movimientos</p>
            <p className="text-xs text-ink-tertiary">
              {accounts.length === 0
                ? 'Primero registrá una cuenta bancaria'
                : 'Agregá tu primer movimiento manualmente'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-surface-raised">
                <tr className="border-b border-edge-subtle">
                  {['', 'Fecha', 'Descripción', 'Cuenta', 'Estado', 'Monto', 'Saldo', ''].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-ink-tertiary first:w-8 first:px-2">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {movements.flatMap((m) => {
                  const isCredit = m.direction === 'CREDIT'
                  const ArrowIcon = isCredit ? ArrowDownLeft : ArrowUpRight
                  const amountColor = isCredit
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-red-600 dark:text-red-400'
                  const isExpanded = expandedRows.has(m.id)
                  const journal = journalMap[m.id]
                  const isLoadingJournal = loadingJournal.has(m.id)

                  const rows: React.ReactElement[] = [
                    <tr
                      key={m.id}
                      className="border-b border-edge-subtle hover:bg-edge-subtle transition-colors"
                    >
                      {/* Chevron */}
                      <td className="px-2 py-3 w-8">
                        <button
                          onClick={() => toggleRow(m.id)}
                          className="p-1 rounded text-ink-ghost hover:text-ink-tertiary transition-colors"
                          title={isExpanded ? 'Contraer' : 'Ver detalle'}
                        >
                          {isExpanded
                            ? <ChevronUp className="w-3.5 h-3.5" />
                            : <ChevronDown className="w-3.5 h-3.5" />
                          }
                        </button>
                      </td>
                      <td className="px-4 py-3 text-xs text-ink-secondary whitespace-nowrap">
                        {fmtDate(m.movement_date)}
                      </td>
                                            <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-ink-primary truncate max-w-xs">{m.description}</span>
                          {(m as any).advance && (
                            <span className={`shrink-0 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full border ${
                              (m as any).advance.type === 'CUSTOMER'
                                ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
                                : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                            }`}>
                              {(m as any).advance.type === 'CUSTOMER' ? 'Anticipo cliente' : 'Anticipo proveedor'}
                            </span>
                          )}
                        </div>
                        {m.reference && (
                          <div className="text-[10px] text-ink-ghost font-mono">{m.reference}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-ink-tertiary truncate max-w-[180px]">
                        {m.bank_account?.name || '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="text-[9px] uppercase tracking-wider px-2 py-1 rounded font-bold"
                          style={{
                            background: `${STATUS_COLORS[m.status]}20`,
                            color: STATUS_COLORS[m.status],
                          }}
                        >
                          {MOVEMENT_STATUS_LABELS[m.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className={`flex items-center gap-1 text-sm font-semibold ${amountColor}`}>
                          <ArrowIcon className="w-3.5 h-3.5" />
                          {fmtMoney(m.amount, m.bank_account?.currency || 'USD')}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs font-mono text-ink-tertiary whitespace-nowrap">
                        {fmtMoney(m.balance_after, m.bank_account?.currency || 'USD')}
                      </td>
                      <td className="px-4 py-3 text-right relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setMenuOpenId(menuOpenId === m.id ? null : m.id)
                          }}
                          className="p-1.5 rounded-lg text-ink-tertiary hover:text-ink-primary hover:bg-edge transition-all focus:outline-none"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                        {menuOpenId === m.id && (
                          <div
                            className="absolute right-4 top-12 z-10 w-52 bg-surface border border-edge rounded-xl shadow-2xl py-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              onClick={() => { toggleRow(m.id); setMenuOpenId(null) }}
                              className="w-full text-left px-3 py-2 text-xs text-ink-primary hover:bg-edge-subtle flex items-center gap-2"
                            >
                              {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-ink-tertiary" /> : <ChevronDown className="w-3.5 h-3.5 text-ink-tertiary" />}
                              Ver movimiento
                            </button>
                            {m.status === 'PENDING' && (
                              <>
                                <div className="my-1 border-t border-edge-subtle" />
                                <button
                                  onClick={() => { setReconcileMovement(m); setMenuOpenId(null) }}
                                  className="w-full text-left px-3 py-2 text-xs text-ink-primary hover:bg-edge-subtle flex items-center gap-2"
                                >
                                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                                  Conciliar con factura
                                </button>
                                <button
                                  onClick={() => { handleIgnore(m); setMenuOpenId(null) }}
                                  className="w-full text-left px-3 py-2 text-xs text-ink-primary hover:bg-edge-subtle flex items-center gap-2"
                                >
                                  <EyeOff className="w-3.5 h-3.5 text-ink-tertiary" />
                                  Marcar como ignorado
                                </button>
                                <div className="my-1 border-t border-edge-subtle" />
                                <button
                                  onClick={() => { handleDelete(m); setMenuOpenId(null) }}
                                  className="w-full text-left px-3 py-2 text-xs text-red-600 dark:text-red-400 hover:bg-edge-subtle flex items-center gap-2"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  Eliminar
                                </button>
                              </>
                            )}
                            {m.status === 'RECONCILED' && m.reconciled_invoice && (
                              <div className="px-3 py-2 text-[11px] text-ink-tertiary border-t border-edge-subtle mt-1">
                                Conciliado con factura{' '}
                                <span className="font-mono text-ink-secondary">
                                  {m.reconciled_invoice.sequential}
                                </span>
                              </div>
                            )}
                            {m.status === 'IGNORED' && (
                              <div className="px-3 py-2 text-[11px] text-ink-tertiary border-t border-edge-subtle mt-1">
                                Movimiento ignorado
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ]

                  // Fila expandida con detalle
                  if (isExpanded) {
                    rows.push(
                      <tr key={`${m.id}-detail`} className="border-b border-edge-subtle bg-surface-raised/40">
                        <td colSpan={8} className="px-6 py-4">
                          <div className="max-w-2xl space-y-4">

                            {/* Datos del movimiento */}
                            <div className="rounded-xl border border-edge-subtle bg-surface-raised overflow-hidden">
                              <div className="px-4 py-2.5 border-b border-edge-subtle bg-edge-subtle/40">
                                <span className="text-[10px] font-semibold uppercase tracking-widest text-ink-tertiary">
                                  Movimiento bancario
                                </span>
                              </div>
                              <div className="divide-y divide-edge-subtle">
                                <DetailRow label="Monto" value={fmtMoney(m.amount, m.bank_account?.currency || 'USD')} />
                                <DetailRow label="Fecha" value={fmtDate(m.movement_date)} />
                                <DetailRow label="Banco" value={m.bank_account?.bank_name ?? '—'} />
                                <DetailRow label="Cuenta" value={m.bank_account?.name ?? '—'} />
                                {m.description && <DetailRow label="Descripción" value={m.description} />}
                                {m.reference && <DetailRow label="Referencia" value={m.reference} mono />}
                                <DetailRow
                                  label="Estado"
                                  value={MOVEMENT_STATUS_LABELS[m.status]}
                                  color={STATUS_COLORS[m.status]}
                                />
                              </div>
                            </div>
                            {/* Detalle anticipo */}
                            {(m as any).advance && (() => {
                              const adv = (m as any).advance
                              const available = Number(adv.original_amount) - Number(adv.applied_amount)
                              const statusLabels: Record<string, string> = {
                                AVAILABLE: 'Disponible',
                                PARTIALLY_APPLIED: 'Parcialmente aplicado',
                                APPLIED: 'Aplicado',
                                CANCELLED: 'Anulado',
                              }
                              const statusColors: Record<string, string> = {
                                AVAILABLE: '#10B981',
                                PARTIALLY_APPLIED: '#F59E0B',
                                APPLIED: '#71717A',
                                CANCELLED: '#EF4444',
                              }
                              return (
                                <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 overflow-hidden">
                                  <div className="px-4 py-2.5 border-b border-amber-500/20 bg-amber-500/10">
                                    <span className="text-[10px] font-semibold uppercase tracking-widest text-amber-600 dark:text-amber-400">
                                      {adv.type === 'CUSTOMER' ? '📥 Anticipo de cliente' : '📤 Anticipo a proveedor'}
                                    </span>
                                  </div>
                                  <div className="divide-y divide-amber-500/10">
                                    <DetailRow label="Contraparte" value={adv.counterpart_name} />
                                    <DetailRow label="Monto original" value={fmtMoney(adv.original_amount)} />
                                    <DetailRow label="Monto aplicado" value={fmtMoney(adv.applied_amount)} />
                                    <DetailRow label="Saldo disponible" value={fmtMoney(available)} />
                                    <DetailRow
                                      label="Estado"
                                      value={statusLabels[adv.status] ?? adv.status}
                                      color={statusColors[adv.status]}
                                    />
                                    {adv.notes && <DetailRow label="Notas" value={adv.notes} />}
                                  </div>
                                </div>
                              )
                            })()}
                            {/* Asiento contable */}
                            <div className="rounded-xl border border-edge-subtle bg-surface-raised overflow-hidden">
                              <div className="px-4 py-2.5 border-b border-edge-subtle bg-edge-subtle/40 flex items-center justify-between">
                                <span className="text-[10px] font-semibold uppercase tracking-widest text-ink-tertiary">
                                  Contabilidad
                                </span>
                                {journal && (
                                  <span className="font-mono text-[10px] text-ink-tertiary">
                                    {journal.entry_number}
                                  </span>
                                )}
                              </div>
                              {isLoadingJournal ? (
                                <div className="flex items-center gap-2 px-4 py-4 text-xs text-ink-tertiary">
                                  <RefreshCw className="w-3 h-3 animate-spin" /> Cargando asiento...
                                </div>
                              ) : !journal ? (
                                <div className="px-4 py-4 text-xs text-ink-ghost italic">
                                  Sin asiento contable registrado
                                </div>
                              ) : (
                                <div className="divide-y divide-edge-subtle">
                                  {journal.lines.map((line) => {
                                    const isEditing = editingLine?.lineId === line.id
                                    const isDebit = parseFloat(line.debit) > 0
                                    return (
                                      <div key={line.id} className="px-4 py-3">
                                        <div className="flex items-start justify-between gap-3">
                                          <div className="flex-1 min-w-0">
                                            <p className="text-[10px] text-ink-ghost uppercase tracking-wider mb-1">
                                              {isDebit ? 'Débito' : 'Crédito'}
                                            </p>
                                            {isEditing ? (
                                              <div className="space-y-2">
                                                <select
                                                  value={editAccountId}
                                                  onChange={e => setEditAccountId(e.target.value)}
                                                  className="field text-xs w-full"
                                                  autoFocus
                                                >
                                                  <option value="">Selecciona cuenta...</option>
                                                  {accountOptions.map(a => (
                                                    <option key={a.id} value={a.id}>
                                                      {a.code} · {a.name}
                                                    </option>
                                                  ))}
                                                </select>
                                                <div className="flex gap-2">
                                                  <button
                                                    onClick={() => setEditingLine(null)}
                                                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-edge text-xs text-ink-secondary hover:text-ink-primary transition-all"
                                                  >
                                                    <X className="w-3 h-3" /> Cancelar
                                                  </button>
                                                  <button
                                                    onClick={saveEditLine}
                                                    disabled={savingLine || !editAccountId}
                                                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue text-white text-xs font-medium hover:bg-blue-hover disabled:opacity-50 transition-all"
                                                  >
                                                    {savingLine
                                                      ? <><RefreshCw className="w-3 h-3 animate-spin" /> Guardando...</>
                                                      : <><Save className="w-3 h-3" /> Guardar</>
                                                    }
                                                  </button>
                                                </div>
                                              </div>
                                            ) : (
                                              <div className="flex items-center gap-2">
                                                <span className="text-xs text-ink-primary font-mono">
                                                  {line.account?.code ?? '—'}
                                                </span>
                                                <span className="text-xs text-ink-secondary">
                                                  {line.account?.name ?? line.description}
                                                </span>
                                              </div>
                                            )}
                                          </div>
                                          <div className="flex items-center gap-2 shrink-0">
                                            <span className={`font-mono text-xs font-semibold ${isDebit ? 'text-ink-primary' : 'text-ink-secondary'}`}>
                                              {fmtMoney(parseFloat(isDebit ? line.debit : line.credit))}
                                            </span>
                                            {!isEditing && (
                                              <button
                                                onClick={() => startEditLine(m.id, line)}
                                                className="p-1 rounded text-ink-ghost hover:text-ink-tertiary hover:bg-edge-subtle transition-all"
                                                title="Editar cuenta contable"
                                              >
                                                <Pencil className="w-3 h-3" />
                                              </button>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    )
                                  })}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )
                  }

                  return rows
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <BankMovementModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        accounts={accounts}
        onSaved={() => { onChange(); loadMovements() }}
      />
            <BankAdvanceModal
        open={advanceOpen}
        onClose={() => setAdvanceOpen(false)}
        accounts={accounts}
        onSaved={() => { onChange(); loadMovements() }}
      />
      <ReconcileMovementModal
        open={reconcileMovement !== null}
        onClose={() => setReconcileMovement(null)}
        movement={reconcileMovement}
        onReconciled={() => { onChange(); loadMovements() }}
      />
    </>
  )
}

function DetailRow({ label, value, mono, color }: {
  label: string; value: string; mono?: boolean; color?: string
}) {
  return (
    <div className="flex justify-between items-center px-4 py-2.5 text-xs">
      <span className="text-ink-tertiary">{label}</span>
      <span
        className={`${mono ? 'font-mono' : 'font-medium'} text-ink-primary`}
        style={color ? { color } : undefined}
      >
        {value}
      </span>
    </div>
  )
}
