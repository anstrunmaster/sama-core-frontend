'use client'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  BookText, Calendar, Search, RefreshCw, Loader2, AlertCircle,
  FileText, X, Filter, ChevronRight, ChevronDown,
  TrendingUp, TrendingDown, Layers,
} from 'lucide-react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { journalApi } from '../asientos/api'
import {
  type JournalEntry,
  type JournalEntryStatus,
  STATUS_LABELS,
  STATUS_COLORS,
  fmtMoney,
  fmtDateShort,
  num,
} from '../asientos/types'
import { accountsApi } from '../cuentas/api'
import type { Account } from '../cuentas/types'

export default function LibroDiarioPage() {
  const today = new Date()
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10)
  const lastOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().slice(0, 10)

  const [data, setData] = useState<JournalEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [from, setFrom] = useState(firstOfMonth)
  const [to, setTo] = useState(lastOfMonth)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<JournalEntryStatus | 'ALL'>('POSTED')
  const [accountFilter, setAccountFilter] = useState<Account | null>(null)
  const [accountSearch, setAccountSearch] = useState('')
  const [accountPickerOpen, setAccountPickerOpen] = useState(false)
  const [accounts, setAccounts] = useState<Account[]>([])
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    accountsApi
      .list({ only_movement: true })
      .then(setAccounts)
      .catch(() => setAccounts([]))
  }, [])

  async function load() {
    setLoading(true)
    setError('')
    try {
      const list = await journalApi.list({
        limit: 200,
        from,
        to,
        search: search.trim() || undefined,
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        account_id: accountFilter?.id,
      })
      setData(list.data)
    } catch (e: any) {
      setError(e.message || 'Error al cargar')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to, statusFilter, accountFilter])

  useEffect(() => {
    const t = setTimeout(() => load(), 300)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  const stats = useMemo(() => {
    let debit = 0
    let credit = 0
    let count = 0
    for (const e of data) {
      if (e.status === 'POSTED') {
        debit += num(e.total_debit)
        credit += num(e.total_credit)
        count++
      }
    }
    return {
      count,
      total_debit: debit,
      total_credit: credit,
      balanced: Math.abs(debit - credit) < 0.01,
    }
  }, [data])

  const filteredAccounts = useMemo(() => {
    if (!accountSearch) return accounts.slice(0, 100)
    const s = accountSearch.toLowerCase()
    return accounts
      .filter((a) => a.code.toLowerCase().includes(s) || a.name.toLowerCase().includes(s))
      .slice(0, 100)
  }, [accounts, accountSearch])

  function toggleExpand(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function expandAll() { setExpandedIds(new Set(data.map((e) => e.id))) }
  function collapseAll() { setExpandedIds(new Set()) }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <BookText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <h1 className="text-lg font-bold text-ink-primary">Libro Diario</h1>
            </div>
            <p className="text-sm text-ink-tertiary mt-0.5">
              Cronología de asientos contabilizados · período {fmtDateShort(from)} → {fmtDateShort(to)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/contabilidad/asientos"
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-edge-subtle border border-edge text-sm text-ink-secondary hover:text-ink-primary hover:border-edge-strong transition-all"
            >
              <Layers className="w-3.5 h-3.5" />
              Lista de asientos
            </Link>
            <button
              onClick={load}
              disabled={loading}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-edge-subtle border border-edge text-sm text-ink-secondary hover:text-ink-primary hover:border-edge-strong disabled:opacity-50 transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Asientos" value={String(stats.count)} icon={FileText} color="#3B82F6" />
          <StatCard label="Total Débitos" value={fmtMoney(stats.total_debit)} icon={TrendingUp} color="#22c55e" />
          <StatCard label="Total Créditos" value={fmtMoney(stats.total_credit)} icon={TrendingDown} color="#3B82F6" />
          <StatCard
            label="Balance"
            value={stats.balanced ? '✓ OK' : `Δ ${fmtMoney(Math.abs(stats.total_debit - stats.total_credit))}`}
            icon={Layers}
            color={stats.balanced ? '#22c55e' : '#ef4444'}
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

        {/* Filtros */}
        <div className="card p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
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
            <div>
              <label className="text-[10px] uppercase tracking-widest text-ink-tertiary font-semibold mb-1.5">
                Estado
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="field w-full"
              >
                <option value="POSTED">Solo contabilizados</option>
                <option value="ALL">Todos</option>
                <option value="DRAFT">Solo borradores</option>
                <option value="REVERSED">Solo reversados</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-widest text-ink-tertiary font-semibold mb-1.5">
                Cuenta
              </label>
              {accountFilter ? (
                <div className="field w-full flex items-center gap-2">
                  <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-edge-subtle text-ink-secondary shrink-0">
                    {accountFilter.code}
                  </span>
                  <span className="flex-1 truncate text-sm text-ink-primary">{accountFilter.name}</span>
                  <button
                    onClick={() => setAccountFilter(null)}
                    className="text-ink-tertiary hover:text-red-600 dark:hover:text-red-400 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setAccountPickerOpen(true)}
                  className="field w-full text-left text-ink-ghost"
                >
                  Filtrar por cuenta...
                </button>
              )}
            </div>
          </div>

          {/* Búsqueda + acciones */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex-1 min-w-[200px] relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-ghost pointer-events-none" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="field w-full pl-10"
                placeholder="Buscar por número, descripción..."
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-tertiary hover:text-ink-primary transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <button
              onClick={expandAll}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-edge-subtle border border-edge text-sm text-ink-secondary hover:text-ink-primary hover:border-edge-strong transition-all"
            >
              <ChevronDown className="w-3.5 h-3.5" />
              Expandir todo
            </button>
            <button
              onClick={collapseAll}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-edge-subtle border border-edge text-sm text-ink-secondary hover:text-ink-primary hover:border-edge-strong transition-all"
            >
              <ChevronRight className="w-3.5 h-3.5" />
              Colapsar
            </button>
          </div>
        </div>

        {/* Tabla cronológica */}
        {loading && data.length === 0 ? (
          <div className="card py-16 text-center">
            <Loader2 className="w-6 h-6 text-blue-600 dark:text-blue-400 animate-spin mx-auto mb-3" />
            <p className="text-sm text-ink-tertiary">Cargando libro diario...</p>
          </div>
        ) : data.length === 0 ? (
          <div className="card py-16 text-center">
            <BookText className="w-10 h-10 text-ink-ghost mx-auto mb-3" />
            <h3 className="text-base font-semibold text-ink-primary mb-1">
              Sin asientos en el período
            </h3>
            <p className="text-sm text-ink-tertiary">
              Probá ampliar el rango de fechas o limpiar los filtros
            </p>
          </div>
        ) : (
          <div className="card overflow-hidden">
            <div className="divide-y divide-edge-subtle">
              {data.map((entry) => (
                <JournalRowExpandable
                  key={entry.id}
                  entry={entry}
                  expanded={expandedIds.has(entry.id)}
                  onToggle={() => toggleExpand(entry.id)}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modal selector de cuenta */}
      {accountPickerOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setAccountPickerOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="card-raised w-full max-w-md max-h-[500px] flex flex-col shadow-2xl"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-edge-subtle">
              <h3 className="text-base font-bold text-ink-primary">Filtrar por cuenta</h3>
              <button
                onClick={() => setAccountPickerOpen(false)}
                className="p-1.5 rounded-lg border border-edge text-ink-tertiary hover:text-ink-primary hover:border-edge-strong transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-3 border-b border-edge-subtle">
              <input
                autoFocus
                value={accountSearch}
                onChange={(e) => setAccountSearch(e.target.value)}
                className="field w-full"
                placeholder="Buscar por código o nombre..."
              />
            </div>
            <div className="flex-1 overflow-y-auto">
              {filteredAccounts.length === 0 ? (
                <div className="py-10 text-center">
                  <p className="text-sm text-ink-tertiary">Sin resultados</p>
                </div>
              ) : (
                filteredAccounts.map((acc) => (
                  <button
                    key={acc.id}
                    onClick={() => {
                      setAccountFilter(acc)
                      setAccountPickerOpen(false)
                      setAccountSearch('')
                    }}
                    className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-edge-subtle transition-colors text-left border-b border-edge-subtle last:border-0"
                  >
                    <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-edge-subtle border border-edge text-ink-secondary shrink-0 min-w-[60px] text-center">
                      {acc.code}
                    </span>
                    <span className="text-sm text-ink-primary flex-1 truncate">{acc.name}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}

// ─── Subcomponentes ────────────────────────────────────────────────

function StatCard({
  label, value, icon: Icon, color,
}: { label: string; value: string; icon: any; color: string }) {
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] uppercase tracking-widest text-ink-tertiary font-semibold">
          {label}
        </span>
        <div
          className="w-6 h-6 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: `${color}18` }}
        >
          <Icon className="w-3.5 h-3.5" style={{ color }} />
        </div>
      </div>
      <div
        className="text-xl font-bold tabular-nums"
        style={{ color: label === 'Balance' ? color : undefined }}
      >
        {value || <span className="text-ink-primary">{value}</span>}
      </div>
    </div>
  )
}

function JournalRowExpandable({
  entry, expanded, onToggle,
}: { entry: JournalEntry; expanded: boolean; onToggle: () => void }) {
  const statusColor = STATUS_COLORS[entry.status]
  return (
    <div>
      <div
        onClick={onToggle}
        className="px-4 py-3.5 hover:bg-edge-subtle cursor-pointer flex items-center gap-3 transition-colors"
      >
        <button
          type="button"
          className="w-5 h-5 flex items-center justify-center text-ink-tertiary shrink-0"
          onClick={(e) => { e.stopPropagation(); onToggle() }}
        >
          {expanded
            ? <ChevronDown className="w-3.5 h-3.5" />
            : <ChevronRight className="w-3.5 h-3.5" />
          }
        </button>

        <div className="font-mono text-sm font-semibold text-blue-600 dark:text-blue-400 min-w-[140px]">
          <Link
            href={`/contabilidad/asientos/${entry.id}`}
            onClick={(e) => e.stopPropagation()}
            className="hover:underline"
          >
            {entry.entry_number}
          </Link>
        </div>

        <div className="text-sm text-ink-tertiary tabular-nums min-w-[80px]">
          {fmtDateShort(entry.entry_date)}
        </div>

        <div className="flex-1 min-w-0">
          <div className="text-sm text-ink-primary truncate">{entry.description}</div>
          {entry.reference && (
            <div className="font-mono text-[10px] text-ink-ghost mt-0.5 truncate">
              ref: {entry.reference}
            </div>
          )}
        </div>

        <div className="font-mono text-sm font-bold text-ink-primary tabular-nums min-w-[110px] text-right">
          {fmtMoney(entry.total_debit)}
        </div>

        <span
          className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0"
          style={{ backgroundColor: `${statusColor}18`, color: statusColor }}
        >
          {STATUS_LABELS[entry.status]}
        </span>
      </div>

      {/* Líneas expandidas */}
      {expanded && (
        <div className="bg-surface-raised border-t border-edge-subtle">
          <table className="w-full">
            <thead>
              <tr className="border-b border-edge-subtle">
                <th className="text-left pl-12 pr-4 py-2 text-[10px] font-semibold uppercase tracking-widest text-ink-tertiary w-10">#</th>
                <th className="text-left px-4 py-2 text-[10px] font-semibold uppercase tracking-widest text-ink-tertiary">Cuenta</th>
                <th className="text-left px-4 py-2 text-[10px] font-semibold uppercase tracking-widest text-ink-tertiary">Descripción</th>
                <th className="text-right px-4 py-2 text-[10px] font-semibold uppercase tracking-widest text-ink-tertiary">Débito</th>
                <th className="text-right pr-4 py-2 text-[10px] font-semibold uppercase tracking-widest text-ink-tertiary">Crédito</th>
              </tr>
            </thead>
            <tbody>
              {entry.lines.map((line, idx) => (
                <tr key={line.id} className="border-b border-edge-subtle/50 last:border-0">
                  <td className="pl-12 pr-4 py-2 text-xs text-ink-tertiary tabular-nums">{idx + 1}</td>
                  <td className="px-4 py-2">
                    {line.account && (
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-edge border border-edge-subtle text-ink-secondary">
                          {line.account.code}
                        </span>
                        <span className="text-xs text-ink-primary">{line.account.name}</span>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-2 text-xs text-ink-secondary max-w-[250px] truncate">
                    {line.description || '—'}
                  </td>
                  <td className="px-4 py-2 text-right font-mono text-xs tabular-nums">
                    {num(line.debit) > 0 ? (
                      <span className="text-green-600 dark:text-green-400 font-semibold">
                        {fmtMoney(line.debit)}
                      </span>
                    ) : (
                      <span className="text-ink-ghost">—</span>
                    )}
                  </td>
                  <td className="pr-4 py-2 text-right font-mono text-xs tabular-nums">
                    {num(line.credit) > 0 ? (
                      <span className="text-blue-600 dark:text-blue-400 font-semibold">
                        {fmtMoney(line.credit)}
                      </span>
                    ) : (
                      <span className="text-ink-ghost">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
