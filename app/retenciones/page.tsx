'use client'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  RefreshCw, ChevronLeft, Search, AlertTriangle, Receipt, Plus, Filter, FileText,
} from 'lucide-react'
import { StatusBadge } from '@/components/withholdings/StatusBadge'
import type { Withholding, WithholdingStatus } from '@/types/withholding'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://d16rb4jhhui7p6.cloudfront.net/api/v1'

function num(v: any): number {
  if (typeof v === 'number') return v
  if (typeof v === 'string') return parseFloat(v)
  if (typeof v?.toNumber === 'function') return v.toNumber()
  return 0
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}

function fmtMoney(v: any): string {
  return num(v).toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const STATUS_OPTIONS: Array<{ value: WithholdingStatus | ''; label: string }> = [
  { value: '', label: 'Todos los estados' },
  { value: 'DRAFT', label: 'Borrador' },
  { value: 'SIGNED', label: 'Firmado' },
  { value: 'SENT', label: 'Enviado' },
  { value: 'AUTHORIZED', label: 'Autorizado' },
  { value: 'REJECTED', label: 'Rechazado' },
  { value: 'VOIDED', label: 'Anulado' },
]

export default function WithholdingsPage() {
  const router = useRouter()
  const [items, setItems] = useState<Withholding[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<WithholdingStatus | ''>('')
  const [fiscalPeriod, setFiscalPeriod] = useState('')

  const fetchWithholdings = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams({ page: '1', limit: '25' })
      if (search) params.set('q', search)
      if (statusFilter) params.set('status', statusFilter)
      if (fiscalPeriod) params.set('fiscal_period', fiscalPeriod)

      const res = await fetch(`${API_URL}/withholdings?${params}`, {
        credentials: 'include',
      })
      const data = await res.json()
      const p = data.data ?? data
      setItems(Array.isArray(p.items) ? p.items : [])
      setTotal(p.total ?? 0)
    } catch {
      setError('Error al cargar retenciones')
    } finally {
      setLoading(false)
    }
  }, [search, statusFilter, fiscalPeriod])

  useEffect(() => { fetchWithholdings() }, [fetchWithholdings])

  const totalRetenido = useMemo(
    () => items.reduce((acc, w) => acc + num(w.total_withheld), 0),
    [items],
  )
  const autorizadas = items.filter((w) => w.status === 'AUTHORIZED').length
  const borradores = items.filter((w) => w.status === 'DRAFT').length

  return (
    <DashboardLayout>
      <div className="p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="p-1.5 rounded-lg border border-edge text-ink-tertiary hover:text-ink-primary hover:border-edge-strong transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-lg font-bold text-ink-primary">Retenciones</h1>
              <p className="text-sm text-ink-tertiary mt-0.5">Comprobantes electrónicos de retención SRI</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchWithholdings}
              className="p-2 rounded-lg bg-edge-subtle border border-edge text-ink-secondary hover:text-ink-primary transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <Link
              href="/retenciones/nueva"
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue hover:bg-blue-hover text-white text-sm font-semibold transition-all"
            >
              <Plus className="w-4 h-4" /> Nueva retención
            </Link>
          </div>
        </div>

        {error && (
          <div className="px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        {/* Summary */}
        <div className="grid grid-cols-3 gap-3">
          <div className="card rounded-xl p-4">
            <p className="text-[11px] text-ink-tertiary uppercase tracking-widest mb-1">Total documentos</p>
            <p className="text-2xl font-bold text-ink-primary">{total}</p>
          </div>
          <div className="card rounded-xl p-4 !border-blue/20">
            <p className="text-[11px] text-ink-tertiary uppercase tracking-widest mb-1">Total retenido (página)</p>
            <p className="text-2xl font-bold text-ink-primary">${fmtMoney(totalRetenido)}</p>
          </div>
          <div className="card rounded-xl p-4">
            <p className="text-[11px] text-ink-tertiary uppercase tracking-widest mb-1">Borradores / Autorizadas</p>
            <p className="text-2xl font-bold text-ink-primary">
              {borradores}<span className="text-ink-tertiary"> / </span>{autorizadas}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-ghost pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar por nº doc, interno o sustento..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="field pl-10"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as WithholdingStatus | '')}
            className="field w-auto"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <input
            type="month"
            value={fiscalPeriod}
            onChange={(e) => setFiscalPeriod(e.target.value)}
            className="field w-auto"
          />
        </div>

        {/* Table */}
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-edge-subtle">
                {['Nº SRI', 'Interno', 'Fecha', 'Doc. sustento', 'Retenido', 'Estado', ''].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-ink-tertiary">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-edge-subtle">
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-4 py-3.5"><div className="h-4 bg-edge-subtle rounded animate-pulse" /></td>
                    ))}
                  </tr>
                ))
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center">
                    <Receipt className="w-10 h-10 text-ink-ghost mx-auto mb-3" />
                    <p className="text-sm text-ink-tertiary">
                      No hay retenciones que coincidan con los filtros.
                    </p>
                    <Link href="/retenciones/nueva" className="mt-3 inline-block text-sm text-blue hover:underline">
                      Crear primera retención
                    </Link>
                  </td>
                </tr>
              ) : (
                items.map((w) => (
                  <tr key={w.id} className="border-b border-edge-subtle hover:bg-edge-subtle transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="font-mono text-xs text-ink-primary">{w.document_number}</div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="font-mono text-xs text-ink-secondary">{w.internal_number}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-xs text-ink-secondary">{fmtDate(w.issue_date)}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="font-mono text-xs text-ink-secondary">{w.support_doc_number}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-sm font-semibold text-ink-primary">${fmtMoney(w.total_withheld)}</span>
                    </td>
                    <td className="px-4 py-3.5"><StatusBadge status={w.status} /></td>
                    <td className="px-4 py-3.5 text-right">
                      <Link href={`/retenciones/${w.id}`} className="text-xs text-blue hover:underline font-semibold">
                        Abrir →
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  )
}
