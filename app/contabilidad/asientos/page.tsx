'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  FileEdit, Plus, Search, RefreshCw, Loader2, AlertCircle,
  FileText, X, Filter, BookText, ChevronRight, ChevronLeft,
} from 'lucide-react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { journalApi } from './api'
import {
  type JournalEntry,
  type JournalEntryStatus,
  type JournalStats,
  STATUS_LABELS,
  STATUS_COLORS,
  SOURCE_LABELS,
  fmtMoney,
  fmtDateShort,
} from './types'

export default function AsientosPage() {
  const [data, setData] = useState<JournalEntry[]>([])
  const [stats, setStats] = useState<JournalStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<JournalEntryStatus | null>(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  async function load() {
    setLoading(true)
    setError('')
    try {
      const [list, statsRes] = await Promise.all([
        journalApi.list({
          page,
          limit: 50,
          search: search.trim() || undefined,
          status: statusFilter ?? undefined,
        }),
        journalApi.stats(),
      ])
      setData(list.data)
      setTotalPages(list.pagination.pages)
      setStats(statsRes)
    } catch (e: any) {
      setError(e.message || 'Error al cargar')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, statusFilter])

  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1)
      load()
    }, 300)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  return (
    <DashboardLayout>
      <div className="p-6 space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <FileEdit className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <h1 className="text-lg font-bold text-ink-primary">Asientos contables</h1>
            </div>
            <p className="text-sm text-ink-tertiary mt-0.5">
              Gestión de asientos por partida doble · {stats?.counts.total ?? 0} asientos
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
              href="/contabilidad/asientos/nuevo"
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-sm font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              Nuevo asiento
            </Link>
            <button
              onClick={load}
              disabled={loading}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-edge-subtle border border-edge text-sm text-ink-secondary hover:text-ink-primary hover:border-edge-strong disabled:opacity-50 transition-all"
              title="Recargar"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Stats por status */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard
              label="Total"
              value={stats.counts.total}
              color="#3B82F6"
              active={!statusFilter}
              onClick={() => setStatusFilter(null)}
            />
            <StatCard
              label="Borradores"
              value={stats.counts.draft}
              color={STATUS_COLORS.DRAFT}
              active={statusFilter === 'DRAFT'}
              onClick={() => setStatusFilter(statusFilter === 'DRAFT' ? null : 'DRAFT')}
            />
            <StatCard
              label="Contabilizados"
              value={stats.counts.posted}
              color={STATUS_COLORS.POSTED}
              active={statusFilter === 'POSTED'}
              onClick={() => setStatusFilter(statusFilter === 'POSTED' ? null : 'POSTED')}
            />
            <StatCard
              label="Reversados"
              value={stats.counts.reversed}
              color={STATUS_COLORS.REVERSED}
              active={statusFilter === 'REVERSED'}
              onClick={() => setStatusFilter(statusFilter === 'REVERSED' ? null : 'REVERSED')}
            />
          </div>
        )}

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

        {/* Toolbar */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex-1 min-w-[240px] relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-ghost pointer-events-none" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="field pl-10 w-full"
              placeholder="Buscar por número, descripción o referencia..."
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
          {statusFilter && (
            <button
              onClick={() => setStatusFilter(null)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-edge-subtle border border-edge text-sm text-ink-secondary hover:text-ink-primary hover:border-edge-strong transition-all"
            >
              <Filter className="w-3.5 h-3.5" />
              {STATUS_LABELS[statusFilter]}
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Tabla */}
        {loading && data.length === 0 ? (
          <div className="card py-16 text-center">
            <Loader2 className="w-6 h-6 text-blue-600 dark:text-blue-400 animate-spin mx-auto mb-3" />
            <p className="text-sm text-ink-tertiary">Cargando asientos...</p>
          </div>
        ) : data.length === 0 ? (
          <div className="card py-16 text-center">
            <FileText className="w-10 h-10 text-ink-ghost mx-auto mb-3" />
            <h3 className="text-base font-semibold text-ink-primary mb-1">
              {search || statusFilter ? 'Sin resultados' : 'Aún no hay asientos'}
            </h3>
            <p className="text-sm text-ink-tertiary mb-4">
              {search || statusFilter
                ? 'Probá quitando los filtros'
                : 'Creá tu primer asiento contable para empezar'}
            </p>
            {!search && !statusFilter && (
              <Link
                href="/contabilidad/asientos/nuevo"
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-sm font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                Crear primer asiento
              </Link>
            )}
          </div>
        ) : (
          <>
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-surface-raised">
                    <tr className="border-b border-edge-subtle">
                      {['Número', 'Fecha', 'Descripción', 'Origen', 'Total', 'Estado', ''].map((h, i) => (
                        <th
                          key={i}
                          className={`px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-ink-tertiary ${
                            h === 'Total' ? 'text-right' : h === 'Estado' ? 'text-center' : 'text-left'
                          }`}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((entry) => (
                      <tr
                        key={entry.id}
                        className="border-b border-edge-subtle last:border-0 hover:bg-edge-subtle transition-colors"
                      >
                        <td className="px-4 py-3.5">
                          <Link
                            href={`/contabilidad/asientos/${entry.id}`}
                            className="font-mono text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                          >
                            {entry.entry_number}
                          </Link>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="text-sm text-ink-secondary tabular-nums">
                            {fmtDateShort(entry.entry_date)}
                          </div>
                        </td>
                        <td className="px-4 py-3.5 max-w-[400px]">
                          <div className="text-sm text-ink-primary truncate">
                            {entry.description}
                          </div>
                          {entry.reference && (
                            <div className="font-mono text-[10px] text-ink-ghost mt-0.5 truncate">
                              ref: {entry.reference}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="text-[10px] uppercase tracking-wider text-ink-tertiary font-semibold">
                            {SOURCE_LABELS[entry.source]}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <div className="font-mono text-sm font-bold text-ink-primary tabular-nums">
                            {fmtMoney(entry.total_debit)}
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <StatusBadge status={entry.status} />
                        </td>
                        <td className="px-4 py-3.5">
                          <Link
                            href={`/contabilidad/asientos/${entry.id}`}
                            className="p-1.5 rounded-lg border border-edge text-ink-tertiary hover:text-ink-primary hover:border-edge-strong transition-all inline-flex"
                          >
                            <ChevronRight className="w-3.5 h-3.5" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Paginación */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-edge-subtle">
                  <span className="text-xs text-ink-tertiary">
                    Página {page} de {totalPages}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPage(Math.max(1, page - 1))}
                      disabled={page === 1 || loading}
                      className="p-1.5 rounded-lg border border-edge text-ink-tertiary hover:text-ink-primary hover:border-edge-strong disabled:opacity-30 transition-all"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setPage(Math.min(totalPages, page + 1))}
                      disabled={page === totalPages || loading}
                      className="p-1.5 rounded-lg border border-edge text-ink-tertiary hover:text-ink-primary hover:border-edge-strong disabled:opacity-30 transition-all"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  )
}

// ─── Subcomponentes ────────────────────────────────────────────────

function StatCard({
  label, value, color, active, onClick,
}: {
  label: string
  value: number
  color: string
  active?: boolean
  onClick?: () => void
}) {
  return (
    <button
      onClick={onClick}
      type="button"
      className={`card p-4 text-left transition-all ${
        active
          ? 'border-edge-strong bg-edge-subtle'
          : 'hover:bg-edge-subtle'
      }`}
    >
      <div className="flex items-center gap-1.5 mb-2">
        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
        <span className="text-[10px] uppercase tracking-widest text-ink-tertiary font-semibold">
          {label}
        </span>
      </div>
      <div className="text-xl font-bold text-ink-primary tabular-nums">{value}</div>
    </button>
  )
}

function StatusBadge({ status }: { status: JournalEntryStatus }) {
  const color = STATUS_COLORS[status]
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
      style={{ backgroundColor: `${color}18`, color }}
    >
      {STATUS_LABELS[status]}
    </span>
  )
}
