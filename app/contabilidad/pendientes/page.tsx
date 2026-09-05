'use client'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  Inbox, FileText, ShoppingCart, RefreshCw, Loader2, AlertCircle,
  CheckCircle2, X, Zap, ArrowRight, Settings, Search, Download,
} from 'lucide-react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import SriSyncModal from '@/components/modals/SriSyncModal'
import { pendingApi, sriApi } from '../api-4c'
import {
  type PendingDocument,
  type PendingSummary,
  type BatchResult,
  type SriDocument,
  fmtMoney,
  fmtDateShort,
} from '../types-4c'

const SRI_PAGE_SIZE = 50

export default function PendientesPage() {
  const [tab, setTab] = useState<'invoices' | 'purchases' | 'sri'>('invoices')
  const [sriDocs, setSriDocs] = useState<SriDocument[]>([])
  const [sriPage, setSriPage] = useState(0)
  const [summary, setSummary] = useState<PendingSummary | null>(null)
  const [invoices, setInvoices] = useState<PendingDocument[]>([])
  const [purchases, setPurchases] = useState<PendingDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [processing, setProcessing] = useState<string | 'batch' | 'all' | null>(null)
  const [batchResult, setBatchResult] = useState<BatchResult | null>(null)
  const [search, setSearch] = useState('')
  const [sriModalOpen, setSriModalOpen] = useState(false)
  const [detalleDoc, setDetalleDoc] = useState<{ clave: string; items: any[] } | null>(null)
  const [loadingDetalle, setLoadingDetalle] = useState(false)

  async function load() {
    setLoading(true)
    setError('')
    try {
      const [sum, inv, pur, sri] = await Promise.all([
        pendingApi.summary(),
        pendingApi.invoices(200),
        pendingApi.purchases(200),
        sriApi.pendingDocuments(),
      ])
      setSummary(sum)
      setInvoices(inv)
      setPurchases(pur)
      setSriDocs(sri)
    } catch (e: any) {
      setError(e.message || 'Error al cargar')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const list = useMemo(() => {
    const docs = tab === 'invoices' ? invoices
               : tab === 'purchases' ? purchases
               : sriDocs
    if (!search.trim()) return docs
    const q = search.toLowerCase().trim()
    return docs.filter(d =>
      d.number.toLowerCase().includes(q) ||
      (d.customer ?? '').toLowerCase().includes(q) ||
      (d.status ?? '').toLowerCase().includes(q)
    )
  }, [tab, invoices, purchases, sriDocs, search])

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    if (selected.size === list.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(list.map((d) => d.id)))
    }
  }

  async function contabilizarIndividual(doc: PendingDocument) {
    setError('')
    setProcessing(doc.id)
    setBatchResult(null)
    try {
      if (doc.type === 'INVOICE') {
        await pendingApi.generateInvoice(doc.id)
      } else {
        await pendingApi.generatePurchase(doc.id)
      }
      await load()
      setSelected((prev) => {
        const next = new Set(prev)
        next.delete(doc.id)
        return next
      })
    } catch (e: any) {
      setError(e.message || 'Error al contabilizar')
    } finally {
      setProcessing(null)
    }
  }

  async function contabilizarSeleccionados() {
    if (selected.size === 0) return
    setError('')
    setProcessing('batch')
    setBatchResult(null)
    try {
      const invoiceIds = invoices.filter((i) => selected.has(i.id)).map((i) => i.id)
      const purchaseIds = purchases.filter((p) => selected.has(p.id)).map((p) => p.id)
      const result = await pendingApi.generateBatch(invoiceIds, purchaseIds)
      setBatchResult(result)
      setSelected(new Set())
      await load()
    } catch (e: any) {
      setError(e.message || 'Error en lote')
    } finally {
      setProcessing(null)
    }
  }

  async function contabilizarTodo() {
    setError('')
    setProcessing('all')
    setBatchResult(null)
    try {
      const result = await pendingApi.generateBatch(
        invoices.map((i) => i.id),
        purchases.map((p) => p.id),
      )
      setBatchResult(result)
      setSelected(new Set())
      await load()
    } catch (e: any) {
      setError(e.message || 'Error en lote')
    } finally {
      setProcessing(null)
    }
  }


  async function verDetalle(claveAcceso: string) {
    setLoadingDetalle(true)
    setDetalleDoc({ clave: claveAcceso, items: [] })
    try {
      const res = await sriApi.detalles(claveAcceso)
      setDetalleDoc({ clave: claveAcceso, items: res.detalles ?? [] })
    } catch {
      setDetalleDoc({ clave: claveAcceso, items: [] })
    } finally {
      setLoadingDetalle(false)
    }
  }

  

  const totalPending = (summary?.invoices.count ?? 0) + (summary?.purchases.count ?? 0)
  const selectedSum = useMemo(
    () => list.filter((d) => selected.has(d.id)).reduce((s, d) => s + d.total, 0),
    [list, selected],
  )

  const sriList = list as SriDocument[]
  const sriPagedList = sriList.slice(sriPage * SRI_PAGE_SIZE, (sriPage + 1) * SRI_PAGE_SIZE)

  return (
    <DashboardLayout>
      <div className="p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <Inbox className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <h1 className="text-lg font-bold text-ink-primary">Pendientes de contabilizar</h1>
            </div>
            <p className="text-sm text-ink-tertiary mt-0.5">
              Facturas y compras que aún no tienen asiento contable
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/contabilidad/mapeo"
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-edge-subtle border border-edge text-sm text-ink-secondary hover:text-ink-primary hover:border-edge-strong transition-all"
            >
              <Settings className="w-3.5 h-3.5" />
              Mapeo de cuentas
            </Link>
            <button
              onClick={load}
              disabled={loading}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-edge-subtle border border-edge text-sm text-ink-secondary hover:text-ink-primary hover:border-edge-strong disabled:opacity-50 transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Actualizar
            </button>
            {/* ← CAMBIO: era tab === 'purchases', ahora tab === 'sri' */}
            {tab === 'sri' && (
              <button
                onClick={() => setSriModalOpen(true)}
                disabled={loading}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-sm font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 disabled:opacity-50 transition-all"
              >
                <Download className="w-3.5 h-3.5" />
                Sincronizar SRI
              </button>
            )}
          </div>
        </div>

        {/* Resumen */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="card p-4">
              <div className="flex items-center gap-1.5 mb-2">
                <FileText className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span className="text-[10px] uppercase tracking-widest text-ink-tertiary font-semibold">
                  Facturas pendientes
                </span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-xl font-bold text-ink-primary tabular-nums">
                  {summary.invoices.count}
                </span>
                <span className="text-xs text-ink-tertiary tabular-nums">
                  {fmtMoney(summary.invoices.total)}
                </span>
              </div>
            </div>
            <div className="card p-4">
              <div className="flex items-center gap-1.5 mb-2">
                <ShoppingCart className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span className="text-[10px] uppercase tracking-widest text-ink-tertiary font-semibold">
                  Compras pendientes
                </span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-xl font-bold text-ink-primary tabular-nums">
                  {summary.purchases.count}
                </span>
                <span className="text-xs text-ink-tertiary tabular-nums">
                  {fmtMoney(summary.purchases.total)}
                </span>
              </div>
            </div>
            <div className="card p-4">
              <div className="flex items-center gap-1.5 mb-2">
                <Zap className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span className="text-[10px] uppercase tracking-widest text-ink-tertiary font-semibold">
                  Total
                </span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-xl font-bold text-ink-primary tabular-nums">
                  {totalPending}
                </span>
                <button
                  onClick={contabilizarTodo}
                  disabled={!!processing || totalPending === 0}
                  className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {processing === 'all' ? 'Procesando...' : 'Contabilizar todo →'}
                </button>
              </div>
            </div>
          </div>
        )}

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

        {/* Resultado de lote */}
        {batchResult && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-green-500/10 border border-green-500/20 text-sm text-green-600 dark:text-green-400">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <div className="flex-1">
              <span className="font-semibold">{batchResult.success} contabilizados correctamente</span>
              {batchResult.failed > 0 && (
                <span className="ml-3 text-red-600 dark:text-red-400">· {batchResult.failed} fallidos</span>
              )}
              {batchResult.errors.length > 0 && (
                <div className="mt-2 space-y-1 border-t border-green-500/20 pt-2">
                  {batchResult.errors.map((err, idx) => (
                    <div key={idx} className="text-[11px] text-red-600 dark:text-red-400 leading-relaxed">
                      <span className="font-mono">{err.source_id.slice(0, 8)}:</span> {err.error}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <button onClick={() => setBatchResult(null)} className="text-green-600/60 dark:text-green-400/60 hover:text-green-600 dark:hover:text-green-400 transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Tabs */}
        <div className="flex items-center gap-1 border-b border-edge-subtle">
          <TabButton active={tab === 'invoices'} onClick={() => { setTab('invoices'); setSelected(new Set()) }} count={invoices.length} icon={FileText}>Facturas</TabButton>
          <TabButton active={tab === 'purchases'} onClick={() => { setTab('purchases'); setSelected(new Set()) }} count={purchases.length} icon={ShoppingCart}>Compras</TabButton>
          <TabButton active={tab === 'sri'} onClick={() => { setTab('sri'); setSelected(new Set()); setSriPage(0) }} count={sriDocs.length} icon={Download}>Importados SRI</TabButton>
        </div>

        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-tertiary" />
          <input
            type="text"
            placeholder={`Buscar ${tab === 'sri' ? 'comprobante' : tab === 'invoices' ? 'factura' : 'compra'}...`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-edge bg-surface pl-10 pr-3 py-2 text-sm text-ink-primary placeholder:text-ink-tertiary focus:outline-none focus:ring-2 focus:ring-blue-500/30"
          />
        </div>

        {/* Barra de selección — solo facturas y compras */}
        {selected.size > 0 && tab !== 'sri' && (
          <div className="flex items-center justify-between px-4 py-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
            <div className="text-sm text-ink-primary">
              <strong>{selected.size}</strong>
              <span className="text-ink-tertiary"> seleccionados · </span>
              {fmtMoney(selectedSum)}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setSelected(new Set())} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-edge-subtle border border-edge text-xs text-ink-secondary hover:text-ink-primary hover:border-edge-strong transition-all">Limpiar</button>
              <button onClick={contabilizarSeleccionados} disabled={!!processing} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-semibold hover:bg-blue-500/20 disabled:opacity-50 transition-all">
                {processing === 'batch' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
                Contabilizar seleccionados
              </button>
            </div>
          </div>
        )}

        {/* ── TABLA SRI ─────────────────────────────────────────────────────── */}
        {tab === 'sri' ? (
          loading && sriDocs.length === 0 ? (
            <div className="card py-16 text-center">
              <Loader2 className="w-6 h-6 text-blue-600 dark:text-blue-400 animate-spin mx-auto mb-3" />
              <p className="text-sm text-ink-tertiary">Cargando documentos SRI...</p>
            </div>
          ) : sriDocs.length === 0 ? (
            <div className="card py-16 text-center">
              <Download className="w-12 h-12 text-ink-ghost mx-auto mb-3" />
              <h3 className="text-base font-semibold text-ink-primary mb-1">Sin documentos importados</h3>
              <p className="text-sm text-ink-tertiary mb-4">Usa "Sincronizar SRI" para importar comprobantes del portal.</p>
            </div>
          ) : (
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-surface-raised">
                    <tr className="border-b border-edge-subtle">
                      {['RUC Emisor', 'Razón Social', 'Tipo', 'Serie', 'Fecha Emisión', 'Subtotal', 'IVA', 'Total', 'XML','Detalle', ''].map(h => (
                        <th key={h} className={`px-3 py-3 text-[10px] font-semibold uppercase tracking-widest text-ink-tertiary ${['Subtotal', 'IVA', 'Total'].includes(h) ? 'text-right' : 'text-left'}`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sriPagedList.map(doc => (
                      <tr key={doc.id} className="border-b border-edge-subtle last:border-0 hover:bg-edge-subtle transition-colors">
                        <td className="px-3 py-3"><span className="font-mono text-xs text-ink-secondary">{doc.counterpart_id ?? '—'}</span></td>
                        <td className="px-3 py-3"><span className="text-sm text-ink-primary max-w-[180px] truncate block">{doc.customer ?? '—'}</span></td>
                        <td className="px-3 py-3"><span className="text-xs px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 font-semibold">{doc.status ?? '—'}</span></td>
                        <td className="px-3 py-3"><span className="font-mono text-xs text-ink-secondary">{doc.number ?? '—'}</span></td>
                        <td className="px-3 py-3"><span className="text-xs text-ink-secondary tabular-nums">{fmtDateShort(doc.issue_date)}</span></td>
                        <td className="px-3 py-3 text-right"><span className="text-xs tabular-nums text-ink-secondary">{fmtMoney(doc.subtotal ?? 0)}</span></td>
                        <td className="px-3 py-3 text-right"><span className="text-xs tabular-nums text-ink-secondary">{fmtMoney(doc.iva ?? 0)}</span></td>
                        <td className="px-3 py-3 text-right"><span className="text-sm font-bold tabular-nums text-ink-primary">{fmtMoney(doc.total)}</span></td>
                        <td className="px-3 py-3">
                          {doc.xml_disponible === false
                            ? <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">Sin XML</span>
                            : <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-500/10 text-green-600 dark:text-green-400">Sí</span>
                          }
                        </td>
                        <td className="px-3 py-3">
                          <button
                            onClick={() => verDetalle(doc.clave_acceso)}
                            className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                          >
                            Ver detalle
                          </button>
                        </td>
                        
                        <td className="px-3 py-3 text-right">
                          <Link
                            href={`/compras/nueva?sri=${doc.id}&ruc=${doc.counterpart_id ?? ''}&razon=${encodeURIComponent(doc.customer ?? '')}&total=${doc.total}&fecha=${doc.issue_date ?? ''}&numero=${encodeURIComponent(doc.number)}`}
                            className="inline-flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 hover:underline"
                          >
                            Convertir <ArrowRight className="w-3 h-3" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {sriList.length > SRI_PAGE_SIZE && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-edge-subtle">
                  <span className="text-xs text-ink-tertiary">
                    {sriPage * SRI_PAGE_SIZE + 1}–{Math.min((sriPage + 1) * SRI_PAGE_SIZE, sriList.length)} de {sriList.length}
                  </span>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setSriPage(p => Math.max(0, p - 1))} disabled={sriPage === 0} className="px-3 py-1.5 rounded-lg border border-edge text-xs text-ink-secondary hover:text-ink-primary disabled:opacity-40 transition-all">Anterior</button>
                    <button onClick={() => setSriPage(p => p + 1)} disabled={(sriPage + 1) * SRI_PAGE_SIZE >= sriList.length} className="px-3 py-1.5 rounded-lg border border-edge text-xs text-ink-secondary hover:text-ink-primary disabled:opacity-40 transition-all">Siguiente</button>
                  </div>
                </div>
              )}
            </div>
          )
        ) : (
          /* ── TABLA FACTURAS / COMPRAS (original sin cambios) ──────────────── */
          loading && list.length === 0 ? (
            <div className="card py-16 text-center">
              <Loader2 className="w-6 h-6 text-blue-600 dark:text-blue-400 animate-spin mx-auto mb-3" />
              <p className="text-sm text-ink-tertiary">Cargando documentos...</p>
            </div>
          ) : list.length === 0 ? (
            <div className="card py-16 text-center">
              <CheckCircle2 className="w-12 h-12 text-green-600 dark:text-green-400 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-ink-primary mb-1">¡Todo contabilizado!</h3>
              <p className="text-sm text-ink-tertiary mb-4">No hay {tab === 'invoices' ? 'facturas' : 'compras'} pendientes</p>
              <Link href="/contabilidad/diario" className="text-xs text-blue-600 dark:text-blue-400 hover:underline">Ver Libro Diario →</Link>
            </div>
          ) : (
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-surface-raised">
                    <tr className="border-b border-edge-subtle">
                      <th className="w-12 px-4 py-3">
                        <input type="checkbox" checked={selected.size === list.length && list.length > 0} onChange={toggleSelectAll} className="w-3.5 h-3.5" />
                      </th>
                      {['Número', 'Cliente', 'Fecha', 'Estado', 'Total', ''].map((h) => (
                        <th key={h} className={`px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-ink-tertiary ${h === 'Total' ? 'text-right' : 'text-left'}`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {list.map((doc) => {
                      const isSelected = selected.has(doc.id)
                      const isProcessing = processing === doc.id
                      return (
                        <tr key={doc.id} className={`border-b border-edge-subtle last:border-0 transition-colors ${isSelected ? 'bg-blue-500/5' : 'hover:bg-edge-subtle'}`}>
                          <td className="px-4 py-3.5">
                            <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(doc.id)} className="w-3.5 h-3.5" disabled={!!isProcessing} />
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="font-mono text-sm font-semibold text-ink-primary">{doc.number}</div>
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="text-sm text-ink-secondary max-w-[220px] truncate">{doc.customer ?? '-'}</div>
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="text-sm text-ink-secondary tabular-nums">{fmtDateShort(doc.issue_date)}</div>
                          </td>
                          <td className="px-4 py-3.5">
                            {doc.status && <span className="text-[10px] uppercase tracking-wider text-ink-tertiary font-semibold">{doc.status}</span>}
                          </td>
                          <td className="px-4 py-3.5 text-right">
                            <div className="text-sm font-bold text-ink-primary tabular-nums">{fmtMoney(doc.total)}</div>
                          </td>
                          <td className="px-4 py-3.5 text-right">
                            <button onClick={() => contabilizarIndividual(doc)} disabled={!!processing} className="inline-flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-50 disabled:cursor-not-allowed transition-all">
                              {isProcessing
                                ? <Loader2 className="w-3 h-3 animate-spin" />
                                : <><span>Contabilizar</span><ArrowRight className="w-3 h-3" /></>
                              }
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )
        )}
      </div>
{detalleDoc && (
  <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
    <div className="bg-surface border border-edge rounded-xl shadow-2xl w-full max-w-2xl">
      <div className="flex items-center justify-between p-4 border-b border-edge-subtle">
        <h3 className="text-sm font-bold text-ink-primary">
          Detalle del comprobante
        </h3>
        <button
          onClick={() => setDetalleDoc(null)}
          className="text-ink-tertiary hover:text-ink-primary transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="p-4">
        {loadingDetalle ? (
          <div className="flex items-center justify-center py-8 gap-2 text-ink-tertiary">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Consultando al SRI...</span>
          </div>
        ) : detalleDoc.items.length === 0 ? (
          <p className="text-sm text-ink-tertiary text-center py-8">
            Sin detalle disponible
          </p>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-edge-subtle">
                <th className="px-3 py-2 text-left text-[10px] uppercase tracking-widest text-ink-tertiary font-semibold">Descripción</th>
                <th className="px-3 py-2 text-right text-[10px] uppercase tracking-widest text-ink-tertiary font-semibold">Cant.</th>
                <th className="px-3 py-2 text-right text-[10px] uppercase tracking-widest text-ink-tertiary font-semibold">P. Unit.</th>
                <th className="px-3 py-2 text-right text-[10px] uppercase tracking-widest text-ink-tertiary font-semibold">Total</th>
              </tr>
            </thead>
            <tbody>
              {detalleDoc.items.map((item, idx) => (
                <tr key={idx} className="border-b border-edge-subtle last:border-0">
                  <td className="px-3 py-2.5 text-ink-primary max-w-[280px]">
                    {item.descripcion ?? '—'}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-ink-secondary">
                    {item.cantidad ?? '—'}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-ink-secondary">
                    {fmtMoney(item.precioUnitario ?? 0)}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums font-semibold text-ink-primary">
                    {fmtMoney(item.precioTotal ?? 0)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <div className="flex justify-end p-4 border-t border-edge-subtle">
        <button
          onClick={() => setDetalleDoc(null)}
          className="px-3 py-2 rounded-lg border border-edge text-sm text-ink-secondary hover:text-ink-primary transition-all"
        >
          Cerrar
        </button>
      </div>
    </div>
  </div>
)}






      
      <SriSyncModal open={sriModalOpen} onOpenChange={setSriModalOpen} onSyncComplete={load} />
    </DashboardLayout>
  )
}

function TabButton({
  active, onClick, count, icon: Icon, children,
}: {
  active: boolean
  onClick: () => void
  count: number
  icon: any
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
        active ? 'border-blue-600 dark:border-blue-400 text-ink-primary' : 'border-transparent text-ink-tertiary hover:text-ink-primary'
      }`}
    >
      <Icon className="w-3.5 h-3.5" />
      {children}
      <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full ${
        active ? 'bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400' : 'bg-edge-subtle text-ink-tertiary'
      }`}>
        {count}
      </span>
    </button>
  )
}
