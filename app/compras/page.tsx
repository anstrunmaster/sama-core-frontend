'use client'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import {
  Plus, Search, ShoppingCart, AlertCircle, RefreshCw,
  Building2, FileText, MoreVertical, Eye, Ban, Trash2, CheckCircle2,
} from 'lucide-react'
import { purchasesApi, fmtMoney, fmtDate, fmtNumber } from './api'
import {
  type Purchase, type PurchaseStatusT, type PurchaseDocumentTypeT,
  PURCHASE_STATUS_LABELS, DOCUMENT_TYPE_LABELS,
} from './types'

const STATUS_COLORS: Record<PurchaseStatusT, string> = {
  DRAFT: '#F59E0B',
  REGISTERED: '#3B82F6',
  PAID: '#10B981',
  ANNULLED: '#71717A',
}

export default function ComprasPage() {
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null)

  // Filtros
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('')
  const [filterType, setFilterType] = useState<string>('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await purchasesApi.list({
        search: search || undefined,
        status: filterStatus || undefined,
        document_type: filterType || undefined,
        limit: 100,
      })
      setPurchases(res.data || [])
    } catch (e: any) {
      setError(e.message || 'Error al cargar compras')
    } finally {
      setLoading(false)
    }
  }, [search, filterStatus, filterType])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    const handler = () => setMenuOpenId(null)
    if (menuOpenId) {
      window.addEventListener('click', handler)
      return () => window.removeEventListener('click', handler)
    }
  }, [menuOpenId])

  const handleRegister = async (p: Purchase) => {
    if (!confirm(`¿Contabilizar la compra ${p.sequential}? No se podrá editar después.`)) return
    try {
      await purchasesApi.register(p.id)
      load()
    } catch (e: any) {
      alert(e.message || 'Error')
    }
  }

  const handleAnnul = async (p: Purchase) => {
    if (!confirm(`¿Anular la compra ${p.sequential}? Esta acción no se puede deshacer.`)) return
    try {
      await purchasesApi.annul(p.id)
      load()
    } catch (e: any) {
      alert(e.message || 'Error')
    }
  }

  const handleDelete = async (p: Purchase) => {
    if (!confirm(`¿Eliminar la compra borrador ${p.sequential}?`)) return
    try {
      await purchasesApi.delete(p.id)
      load()
    } catch (e: any) {
      alert(e.message || 'Error')
    }
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-ink-primary tracking-tight">Compras</h1>
            <p className="text-sm text-ink-tertiary mt-0.5">
              Facturas y comprobantes de tus proveedores
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/proveedores"
              className="btn btn-secondary"
            >
              <Building2 className="w-4 h-4" />
              Proveedores
            </Link>
            <Link
              href="/compras/nueva"
              className="btn btn-primary"
            >
              <Plus className="w-4 h-4" />
              Nueva compra
            </Link>
          </div>
        </div>

        {/* Filtros */}
        <div className="card rounded-2xl p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
            <div className="relative md:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-ghost pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por secuencial o clave de acceso..."
                className="field pl-10"
              />
            </div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="field"
            >
              <option value="">Todos los tipos</option>
              <option value="FACTURA">Facturas</option>
              <option value="NOTA_VENTA">Notas de venta</option>
              <option value="LIQUIDACION_COMPRA">Liquidaciones</option>
              <option value="REEMBOLSO_GASTOS">Reembolsos</option>
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="field"
            >
              <option value="">Todos los estados</option>
              <option value="DRAFT">Borradores</option>
              <option value="REGISTERED">Registradas</option>
              <option value="PAID">Pagadas</option>
              <option value="ANNULLED">Anuladas</option>
            </select>
          </div>
        </div>

        {error && (
          <div className="card rounded-xl p-3 flex items-start gap-2 text-xs text-red-600 dark:text-red-400">
            <AlertCircle className="w-3.5 h-3.5 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Tabla */}
        <div className="card rounded-2xl">
          {loading ? (
            <div className="p-5 space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-14 bg-edge-subtle rounded-xl animate-pulse" />
              ))}
            </div>
          ) : purchases.length === 0 ? (
            <div className="py-16 text-center">
              <ShoppingCart className="w-10 h-10 text-ink-ghost mx-auto mb-3" />
              <p className="text-sm font-medium text-ink-primary mb-1">Sin compras registradas</p>
              <p className="text-xs text-ink-tertiary mb-4">
                Comenzá cargando la primera factura de un proveedor
              </p>
              <Link href="/compras/nueva" className="btn btn-primary inline-flex">
                <Plus className="w-4 h-4" />
                Cargar primera compra
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-surface-raised">
                  <tr className="border-b border-edge-subtle">
                    {['Fecha', 'Tipo', 'Documento', 'Proveedor', 'Total', 'Retenciones', 'Neto', 'Estado', ''].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-ink-tertiary">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {purchases.map((p) => {
                    const retentions = parseFloat(p.retention_renta_total) + parseFloat(p.retention_iva_total)
                    return (
                      <tr key={p.id} className="border-b border-edge-subtle hover:bg-edge-subtle transition-colors">
                        <td className="px-4 py-3 text-xs text-ink-secondary whitespace-nowrap">
                          {fmtDate(p.issue_date)}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-[10px] uppercase tracking-wider px-2 py-1 rounded bg-edge-subtle text-ink-secondary font-medium">
                            {DOCUMENT_TYPE_LABELS[p.document_type]}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-ink-secondary whitespace-nowrap">
                          {p.establishment}-{p.emission_point}-{p.sequential}
                        </td>
                        <td className="px-4 py-3 text-sm text-ink-primary truncate max-w-xs">
                          {p.supplier?.legal_name || '—'}
                          <div className="text-[10px] text-ink-ghost font-mono">
                            {p.supplier?.identification || ''}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-ink-primary whitespace-nowrap">
                          {fmtMoney(p.total)}
                        </td>
                        <td className="px-4 py-3 text-xs text-amber-600 dark:text-amber-400 whitespace-nowrap">
                          {retentions > 0 ? `- ${fmtMoney(retentions)}` : '—'}
                        </td>
                        <td className="px-4 py-3 text-sm font-bold text-ink-primary whitespace-nowrap">
                          {fmtMoney(p.net_payable)}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className="text-[9px] uppercase tracking-wider px-2 py-1 rounded font-bold"
                            style={{
                              background: `${STATUS_COLORS[p.status]}20`,
                              color: STATUS_COLORS[p.status],
                            }}
                          >
                            {PURCHASE_STATUS_LABELS[p.status]}
                          </span>
                        </td>
                        <td className="px-4 py-3 relative">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setMenuOpenId(menuOpenId === p.id ? null : p.id)
                            }}
                            className="p-1.5 rounded-lg text-ink-tertiary hover:text-ink-primary hover:bg-edge transition-all"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>
                          {menuOpenId === p.id && (
                            <div
                              className="absolute right-4 top-12 z-10 w-48 bg-surface border border-edge rounded-xl shadow-2xl py-1"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Link
                                href={`/compras/${p.id}`}
                                className="w-full text-left px-3 py-2 text-xs text-ink-primary hover:bg-edge-subtle flex items-center gap-2"
                                onClick={() => setMenuOpenId(null)}
                              >
                                <Eye className="w-3.5 h-3.5" />
                                Ver detalle
                              </Link>
                              {p.status === 'DRAFT' && (
                                <>
                                  <button
                                    onClick={() => { handleRegister(p); setMenuOpenId(null) }}
                                    className="w-full text-left px-3 py-2 text-xs text-ink-primary hover:bg-edge-subtle flex items-center gap-2"
                                  >
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                                    Contabilizar
                                  </button>
                                  <button
                                    onClick={() => { handleDelete(p); setMenuOpenId(null) }}
                                    className="w-full text-left px-3 py-2 text-xs text-red-600 dark:text-red-400 hover:bg-edge-subtle flex items-center gap-2"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    Eliminar
                                  </button>
                                </>
                              )}
                              {p.status === 'REGISTERED' && (
                                <button
                                  onClick={() => { handleAnnul(p); setMenuOpenId(null) }}
                                  className="w-full text-left px-3 py-2 text-xs text-red-600 dark:text-red-400 hover:bg-edge-subtle flex items-center gap-2"
                                >
                                  <Ban className="w-3.5 h-3.5" />
                                  Anular
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
