'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  FileSearch, Plus, Search, RefreshCw, X, ChevronLeft, ChevronRight,
  AlertCircle, CheckCircle2, Mail, FileText,
} from 'lucide-react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { quotationsApi } from '../api-cotizaciones'
import {
  type Quotation, type QuotationStatus,
  STATUS_CONFIG, fmtMoney, fmtDate,
} from '../types-cotizaciones'

export default function CotizacionesPage() {
  const [data, setData]           = useState<Quotation[]>([])
  const [total, setTotal]         = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [page, setPage]           = useState(1)
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState('')
  const [search, setSearch]       = useState('')
  const [statusFilter, setStatusFilter] = useState<QuotationStatus | ''>('')

  async function load(p = page) {
    setLoading(true)
    setError('')
    try {
      const res = await quotationsApi.list({
        page:   p,
        limit:  20,
        search: search.trim() || undefined,
        status: (statusFilter || undefined) as QuotationStatus | undefined,
      })
      setData(res.data)
      setTotal(res.pagination.total)
      setTotalPages(res.pagination.totalPages)
    } catch (e: any) {
      setError(e.message || 'Error al cargar')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load(1) }, [statusFilter])

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => { setPage(1); load(1) }, 300)
    return () => clearTimeout(t)
  }, [search])

  function goPage(p: number) {
    setPage(p)
    load(p)
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <FileSearch className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <h1 className="text-lg font-bold text-ink-primary">Cotizaciones</h1>
            </div>
            <p className="text-sm text-ink-tertiary mt-0.5">
              {total} cotización{total !== 1 ? 'es' : ''} en total
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => load(page)}
              disabled={loading}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-edge-subtle border border-edge text-sm text-ink-secondary hover:text-ink-primary hover:border-edge-strong disabled:opacity-50 transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <Link
              href="/cotizaciones/nueva"
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-sm font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              Nueva cotización
            </Link>
          </div>
        </div>

        {/* Filtros de estado */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setStatusFilter('')}
            className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
              !statusFilter
                ? 'bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400'
                : 'bg-edge-subtle border-edge text-ink-tertiary hover:text-ink-primary hover:border-edge-strong'
            }`}
          >
            Todas
          </button>
          {(Object.keys(STATUS_CONFIG) as QuotationStatus[]).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(statusFilter === s ? '' : s)}
              className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                statusFilter === s
                  ? STATUS_CONFIG[s].classes
                  : 'bg-edge-subtle border-edge text-ink-tertiary hover:text-ink-primary hover:border-edge-strong'
              }`}
            >
              {STATUS_CONFIG[s].label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-ghost pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar por número, cliente o RUC/cédula..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="field pl-10 w-full"
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

        {/* Error */}
        {error && (
          <div className="flex items-center justify-between px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-600 dark:text-red-400">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
            <button onClick={() => setError('')} className="text-red-600/60 dark:text-red-400/60 hover:text-red-600 dark:hover:text-red-400 transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Tabla */}
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-surface-raised">
                <tr className="border-b border-edge-subtle">
                  {['N° Cotización', 'Cliente', 'Total', 'Vence', 'Estado', 'Acciones'].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-ink-tertiary">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b border-edge-subtle">
                      {Array.from({ length: 6 }).map((_, j) => (
                        <td key={j} className="px-4 py-3.5">
                          <div className="h-4 bg-edge-subtle rounded animate-pulse" style={{ width: `${55 + j * 8}%` }} />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : data.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-16 text-center">
                      <FileSearch className="w-10 h-10 text-ink-ghost mx-auto mb-3" />
                      <p className="text-sm text-ink-tertiary">
                        {search || statusFilter ? 'Sin resultados para los filtros aplicados' : 'Aún no hay cotizaciones'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  data.map((q) => {
                    const sc = STATUS_CONFIG[q.status]
                    return (
                      <tr key={q.id} className="border-b border-edge-subtle last:border-0 hover:bg-edge-subtle transition-colors">
                        <td className="px-4 py-3.5">
                          <div className="font-mono text-sm font-semibold text-ink-primary">
                            {q.number}
                          </div>
                          <div className="text-[11px] text-ink-ghost mt-0.5">
                            {fmtDate(q.created_at)}
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="text-sm text-ink-primary font-medium">
                            {q.buyer_name || q.customer?.name || '—'}
                          </div>
                          {(q.buyer_id || q.customer?.identification) && (
                            <div className="text-[11px] text-ink-tertiary mt-0.5">
                              {q.buyer_id || q.customer?.identification}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="text-sm font-bold text-ink-primary">
                            {fmtMoney(q.total)}
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="text-sm text-ink-secondary">
                            {q.valid_until ? fmtDate(q.valid_until) : <span className="text-ink-ghost">—</span>}
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${sc.classes}`}>
                            {sc.label}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1.5">
                            <Link
                              href={`/cotizaciones/${q.id}`}
                              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-medium hover:bg-blue-500/20 transition-all"
                            >
                              <FileText className="w-3 h-3" />
                              Ver
                            </Link>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-edge-subtle">
              <span className="text-xs text-ink-tertiary">
                Página {page} de {totalPages} · {total} registros
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => goPage(page - 1)}
                  disabled={page <= 1 || loading}
                  className="p-1.5 rounded-lg border border-edge text-ink-tertiary hover:text-ink-primary hover:border-edge-strong disabled:opacity-30 transition-all"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => goPage(page + 1)}
                  disabled={page >= totalPages || loading}
                  className="p-1.5 rounded-lg border border-edge text-ink-tertiary hover:text-ink-primary hover:border-edge-strong disabled:opacity-30 transition-all"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
