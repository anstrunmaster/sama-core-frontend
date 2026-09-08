'use client'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  RefreshCw, ChevronLeft, Search,
  AlertTriangle, Package, Plus, X, Save,
  Trash2, CheckCircle2
} from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://d16rb4jhhui7p6.cloudfront.net/api/v1'

interface InventoryItem {
  id:             string
  product_id:     string
  warehouse_id:   string
  stock_quantity: number
  updated_at:     string
  product:   { code: string; name: string; unit: string | null; type: string } | null
  warehouse: { code: string; name: string } | null
}

interface Warehouse { id: string; name: string; code: string }
interface Product   { id: string; code: string; name: string; unit: string | null; type: string }

interface IngresoLine {
  product_id: string
  quantity:   string
  notes:      string
}

function stockBadge(qty: number) {
  if (qty <= 0) return 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20'
  if (qty <= 5) return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
  return 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20'
}

const emptyLine = (): IngresoLine => ({ product_id: '', quantity: '', notes: '' })

export default function InventoryPage() {
  const router = useRouter()
  const [inventory, setInventory]   = useState<InventoryItem[]>([])
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [products, setProducts]     = useState<Product[]>([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [search, setSearch]         = useState('')
  const [warehouseFilter, setWarehouseFilter] = useState('')

  // Modal
  const [showModal, setShowModal]           = useState(false)
  const [modalWarehouse, setModalWarehouse] = useState('')
  const [lines, setLines]                   = useState<IngresoLine[]>([emptyLine()])
  const [saving, setSaving]                 = useState(false)
  const [modalError, setModalError]         = useState('')

  const fetchWarehouses = useCallback(async () => {
    try {
      const res  = await fetch(`${API_URL}/warehouses`, { credentials: 'include' })
      const data = await res.json()
      const p = data.data ?? data
      setWarehouses(Array.isArray(p) ? p : [])
    } catch {}
  }, [])

  const fetchProducts = useCallback(async () => {
    try {
      const res  = await fetch(`${API_URL}/products?limit=100`, { credentials: 'include' })
      const data = await res.json()
      const p = data.data ?? data
      const items = p.items ?? p
      setProducts(Array.isArray(items) ? items : [])
    } catch {}
  }, [])

  const fetchInventory = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams()
      if (warehouseFilter) params.set('warehouseId', warehouseFilter)
      const res  = await fetch(`${API_URL}/inventory?${params}`, { credentials: 'include' })
      const data = await res.json()
      const p = data.data ?? data
      setInventory(Array.isArray(p) ? p : [])
    } catch {
      setError('Error al cargar inventario')
    } finally {
      setLoading(false)
    }
  }, [warehouseFilter])

  useEffect(() => { fetchWarehouses(); fetchProducts() }, [fetchWarehouses, fetchProducts])
  useEffect(() => { fetchInventory() }, [fetchInventory])

  const showSuccess = (msg: string) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(''), 4000) }

  const openModal = () => {
    setModalWarehouse(warehouses[0]?.id ?? '')
    setLines([emptyLine()])
    setModalError('')
    setShowModal(true)
  }

  const setLine = (i: number, field: keyof IngresoLine, value: string) =>
    setLines(prev => prev.map((l, idx) => idx === i ? { ...l, [field]: value } : l))

  const addLine    = () => setLines(prev => [...prev, emptyLine()])
  const removeLine = (i: number) => { if (lines.length > 1) setLines(prev => prev.filter((_, idx) => idx !== i)) }

  const handleSubmit = async () => {
    setModalError('')
    if (!modalWarehouse) { setModalError('Selecciona una bodega'); return }
    const validLines = lines.filter(l => l.product_id && l.quantity)
    if (validLines.length === 0) { setModalError('Agrega al menos un producto con cantidad'); return }
    if (validLines.find(l => Number(l.quantity) <= 0)) { setModalError('La cantidad debe ser mayor a 0'); return }

    setSaving(true)
    try {
      for (const line of validLines) {
        const res = await fetch(`${API_URL}/inventory-movements`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            product_id:   line.product_id,
            warehouse_id: modalWarehouse,
            type:         'PURCHASE',
            quantity:     Number(line.quantity),
            ...(line.notes && { notes: line.notes }),
          }),
        })
        const data = await res.json()
        if (!res.ok) {
          const msg = Array.isArray(data.message) ? data.message[0] : data.message
          setModalError(msg || 'Error al registrar ingreso')
          setSaving(false)
          return
        }
      }
      setShowModal(false)
      showSuccess(`Ingreso registrado — ${validLines.length} producto${validLines.length !== 1 ? 's' : ''}`)
      fetchInventory()
    } catch {
      setModalError('Error de conexión')
    } finally {
      setSaving(false)
    }
  }

  const filtered = inventory.filter(item => {
    if (!search) return true
    const q = search.toLowerCase()
    return item.product?.name.toLowerCase().includes(q) || item.product?.code.toLowerCase().includes(q)
  })

  const totalProducts = filtered.length
  const lowStock      = filtered.filter(i => i.stock_quantity > 0 && i.stock_quantity <= 5).length
  const outOfStock    = filtered.filter(i => i.stock_quantity <= 0).length

  return (
    <DashboardLayout>
      <div className="p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="p-1.5 rounded-lg border border-edge text-ink-tertiary hover:text-ink-primary hover:border-edge-strong transition-all">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-lg font-bold text-ink-primary">Inventario</h1>
              <p className="text-sm text-ink-tertiary mt-0.5">Stock actual por producto y bodega</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={fetchInventory} className="p-2 rounded-lg bg-edge-subtle border border-edge text-ink-secondary hover:text-ink-primary transition-all">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={openModal} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue hover:bg-blue-hover text-white text-sm font-semibold transition-all">
              <Plus className="w-4 h-4" /> Registrar ingreso
            </button>
          </div>
        </div>

        {/* Alerts */}
        {successMsg && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-green-500/10 border border-green-500/20 text-sm text-green-600 dark:text-green-400">
            <CheckCircle2 className="w-4 h-4 shrink-0" />{successMsg}
          </div>
        )}
        {error && <div className="px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-600 dark:text-red-400">{error}</div>}

        {/* Summary */}
        <div className="grid grid-cols-3 gap-3">
          <div className="card rounded-xl p-4">
            <p className="text-[11px] text-ink-tertiary uppercase tracking-widest mb-1">Total productos</p>
            <p className="text-2xl font-bold text-ink-primary">{totalProducts}</p>
          </div>
          <div className="card rounded-xl p-4 !border-amber-500/20">
            <p className="text-[11px] text-ink-tertiary uppercase tracking-widest mb-1">Stock bajo</p>
            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{lowStock}</p>
          </div>
          <div className="card rounded-xl p-4 !border-red-500/20">
            <p className="text-[11px] text-ink-tertiary uppercase tracking-widest mb-1">Sin stock</p>
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">{outOfStock}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-ghost pointer-events-none" />
            <input
              type="text" placeholder="Buscar producto..." value={search}
              onChange={e => setSearch(e.target.value)}
              className="field pl-10"
            />
          </div>
          <select value={warehouseFilter} onChange={e => setWarehouseFilter(e.target.value)}
            className="field w-auto">
            <option value="">Todas las bodegas</option>
            {warehouses.map(w => <option key={w.id} value={w.id}>{w.name} ({w.code})</option>)}
          </select>
        </div>

        {/* Table */}
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-edge-subtle">
                {['Producto', 'Tipo', 'Bodega', 'Stock', 'Unidad', 'Actualizado'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-ink-tertiary">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-edge-subtle">
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="px-4 py-3.5"><div className="h-4 bg-edge-subtle rounded animate-pulse" /></td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-16 text-center">
                    <Package className="w-10 h-10 text-ink-ghost mx-auto mb-3" />
                    <p className="text-sm text-ink-tertiary">
                      {inventory.length === 0 ? 'Sin registros — registra un ingreso para comenzar' : 'No se encontraron productos'}
                    </p>
                    {inventory.length === 0 && (
                      <button onClick={openModal} className="mt-3 text-sm text-blue hover:underline">
                        Registrar primer ingreso
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                filtered.map(item => (
                  <tr key={item.id} className="border-b border-edge-subtle hover:bg-edge-subtle transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="text-sm font-medium text-ink-primary">{item.product?.name ?? '—'}</div>
                      <div className="font-mono text-[11px] text-ink-tertiary mt-0.5">{item.product?.code}</div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                        item.product?.type === 'PRODUCT'
                          ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
                          : 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20'
                      }`}>
                        {item.product?.type === 'PRODUCT' ? 'Producto' : 'Servicio'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="text-sm text-ink-secondary">{item.warehouse?.name ?? '—'}</div>
                      <div className="font-mono text-[11px] text-ink-tertiary">{item.warehouse?.code}</div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-bold border ${stockBadge(item.stock_quantity)}`}>
                        {item.stock_quantity <= 0 && <AlertTriangle className="w-3 h-3" />}
                        {item.stock_quantity}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-sm text-ink-secondary">{item.product?.unit || '—'}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-xs text-ink-tertiary">
                        {new Date(item.updated_at).toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Modal registrar ingreso */}
        {showModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="card-raised w-full max-w-2xl mx-4 p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="text-base font-bold text-ink-primary">Registrar ingreso</h3>
                  <p className="text-xs text-ink-tertiary mt-0.5">Movimiento PURCHASE — incrementa el stock</p>
                </div>
                <button onClick={() => setShowModal(false)} className="text-ink-tertiary hover:text-ink-primary transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Bodega */}
              <div className="mb-5">
                <label className="block text-xs font-medium text-ink-secondary mb-1.5">Bodega destino *</label>
                <select value={modalWarehouse} onChange={e => setModalWarehouse(e.target.value)}
                  className="field">
                  <option value="">Seleccionar bodega...</option>
                  {warehouses.map(w => <option key={w.id} value={w.id}>{w.name} ({w.code})</option>)}
                </select>
              </div>

              {/* Líneas */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium text-ink-secondary">Productos *</label>
                  <button onClick={addLine} className="flex items-center gap-1 text-xs text-blue hover:underline">
                    <Plus className="w-3 h-3" /> Agregar producto
                  </button>
                </div>
                <div className="space-y-3">
                  {lines.map((line, i) => (
                    <div key={i} className="bg-surface-raised border border-edge-subtle rounded-xl p-3 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-ink-tertiary font-semibold uppercase tracking-widest">Producto {i + 1}</span>
                        {lines.length > 1 && (
                          <button onClick={() => removeLine(i)} className="text-ink-tertiary hover:text-red-500 dark:hover:text-red-400 transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] text-ink-tertiary mb-1">Producto</label>
                          <select value={line.product_id} onChange={e => setLine(i, 'product_id', e.target.value)}
                            className="w-full bg-surface border border-edge rounded-lg px-3 py-2 text-sm text-ink-primary outline-none focus:border-blue/60 transition-all">
                            <option value="">Seleccionar...</option>
                            {products.map(p => <option key={p.id} value={p.id}>[{p.code}] {p.name}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[11px] text-ink-tertiary mb-1">Cantidad</label>
                          <input type="number" min="1" step="1" value={line.quantity}
                            onChange={e => setLine(i, 'quantity', e.target.value)}
                            placeholder="0"
                            className="w-full bg-surface border border-edge rounded-lg px-3 py-2 text-sm text-ink-primary placeholder-ink-ghost outline-none focus:border-blue/60 transition-all"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[11px] text-ink-tertiary mb-1">Nota (opcional)</label>
                        <input type="text" value={line.notes} onChange={e => setLine(i, 'notes', e.target.value)}
                          placeholder="Ej: Compra a proveedor, stock inicial..."
                          className="w-full bg-surface border border-edge rounded-lg px-3 py-2 text-sm text-ink-primary placeholder-ink-ghost outline-none focus:border-blue/60 transition-all"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {modalError && (
                <div className="px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-600 dark:text-red-400 mb-4">{modalError}</div>
              )}

              <div className="flex gap-3">
                <button onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 rounded-lg border border-edge text-sm text-ink-secondary hover:text-ink-primary transition-all">
                  Cancelar
                </button>
                <button onClick={handleSubmit} disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-blue hover:bg-blue-hover disabled:opacity-50 text-sm font-semibold text-white transition-all">
                  {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  {saving ? 'Guardando...' : 'Registrar ingreso'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
