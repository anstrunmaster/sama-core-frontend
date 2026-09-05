'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ChevronLeft, Plus, Trash2, AlertCircle, X, Loader2, Save,
} from 'lucide-react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { quotationsApi } from '../api-cotizaciones'
import {
  type QuotationFormItem,
  EMPTY_ITEM, PAYMENT_METHODS, ID_TYPES,
  buildItemTaxes, calcTotals, fmtMoney, uid,
} from '../types-cotizaciones'

export default function NuevaCotizacionPage() {
  const router = useRouter()

  // Comprador
  const [buyerIdType, setBuyerIdType]   = useState('04')
  const [buyerId,     setBuyerId]       = useState('')
  const [buyerName,   setBuyerName]     = useState('')
  const [buyerEmail,  setBuyerEmail]    = useState('')
  const [buyerAddress,setBuyerAddress]  = useState('')

  // Ítems
  const [items, setItems] = useState<QuotationFormItem[]>([EMPTY_ITEM()])

  // Config
  const [paymentMethod, setPaymentMethod] = useState('01')
  const [notes,         setNotes]         = useState('')
  const [validUntil,    setValidUntil]    = useState('')

  // UI
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')

  // ─── Item handlers ──────────────────────────────────────────────────────

  function updateItem(id: string, field: keyof QuotationFormItem, value: any) {
    setItems((prev) =>
      prev.map((item) => {
        if (item._id !== id) return item
        const updated = { ...item, [field]: value }

        // Recalcular impuestos cuando cambia cantidad, precio, descuento o iva_pct
        if (['cantidad', 'precioUnitario', 'descuento', 'iva_pct'].includes(field)) {
          const base = updated.cantidad * updated.precioUnitario - updated.descuento
          updated.impuestos = buildItemTaxes(Math.max(0, base), updated.iva_pct as 0 | 15)
        }

        return updated
      }),
    )
  }

  function addItem() {
    setItems((prev) => [...prev, EMPTY_ITEM()])
  }

  function removeItem(id: string) {
    if (items.length === 1) return
    setItems((prev) => prev.filter((i) => i._id !== id))
  }

  // ─── Submit ─────────────────────────────────────────────────────────────

  async function handleSave() {
    setError('')

    if (!buyerName.trim()) { setError('Ingresá el nombre del comprador'); return }
    if (items.some((i) => !i.descripcion.trim())) {
      setError('Todos los ítems deben tener descripción')
      return
    }

    // Recalcular con impuestos actualizados
    const finalItems: QuotationFormItem[] = items.map((item) => {
      const base = item.cantidad * item.precioUnitario - item.descuento
      return { ...item, impuestos: buildItemTaxes(Math.max(0, base), item.iva_pct) }
    })

    const totals = calcTotals(finalItems)

    setSaving(true)
    try {
      const q = await quotationsApi.create({
        buyer_id_type:  buyerIdType   || undefined,
        buyer_id:       buyerId       || undefined,
        buyer_name:     buyerName     || undefined,
        buyer_email:    buyerEmail    || undefined,
        buyer_address:  buyerAddress  || undefined,
        items:          finalItems.map(({ _id, iva_pct, ...rest }) => rest),
        ...totals,
        payment_method: paymentMethod || undefined,
        notes:          notes         || undefined,
        valid_until:    validUntil    || undefined,
      })
      router.push(`/cotizaciones/${q.id}`)
    } catch (e: any) {
      setError(e.message || 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const totals = calcTotals(items)

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <DashboardLayout>
      <div className="p-6 space-y-5">

        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-1.5 rounded-lg border border-edge text-ink-tertiary hover:text-ink-primary hover:border-edge-strong transition-all"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-ink-primary">Nueva cotización</h1>
            <p className="text-sm text-ink-tertiary mt-0.5">El número se asigna automáticamente</p>
          </div>
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

        {/* Datos del comprador */}
        <div className="card p-5 space-y-4">
          <h2 className="text-[10px] font-semibold uppercase tracking-widest text-ink-tertiary">
            Datos del comprador
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] uppercase tracking-widest text-ink-tertiary font-semibold mb-1.5 block">
                Tipo de ID
              </label>
              <select
                value={buyerIdType}
                onChange={(e) => setBuyerIdType(e.target.value)}
                className="field w-full"
              >
                {ID_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-widest text-ink-tertiary font-semibold mb-1.5 block">
                RUC / Cédula
              </label>
              <input
                type="text"
                value={buyerId}
                onChange={(e) => setBuyerId(e.target.value)}
                className="field w-full"
                placeholder="0000000000001"
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-[10px] uppercase tracking-widest text-ink-tertiary font-semibold mb-1.5 block">
                Razón social / Nombre <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={buyerName}
                onChange={(e) => setBuyerName(e.target.value)}
                className="field w-full"
                placeholder="Empresa o persona"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-widest text-ink-tertiary font-semibold mb-1.5 block">
                Email
              </label>
              <input
                type="email"
                value={buyerEmail}
                onChange={(e) => setBuyerEmail(e.target.value)}
                className="field w-full"
                placeholder="cliente@empresa.com"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-widest text-ink-tertiary font-semibold mb-1.5 block">
                Dirección
              </label>
              <input
                type="text"
                value={buyerAddress}
                onChange={(e) => setBuyerAddress(e.target.value)}
                className="field w-full"
                placeholder="Calle, ciudad"
              />
            </div>
          </div>
        </div>

        {/* Ítems */}
        <div className="card overflow-hidden">
          <div className="px-5 py-3 border-b border-edge-subtle bg-surface-raised flex items-center justify-between">
            <h2 className="text-[10px] font-semibold uppercase tracking-widest text-ink-tertiary">
              Ítems
            </h2>
            <button
              onClick={addItem}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-medium hover:bg-blue-500/20 transition-all"
            >
              <Plus className="w-3 h-3" />
              Agregar ítem
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-edge-subtle">
                  {['Código', 'Descripción', 'Cant.', 'P. Unitario', 'Desc.', 'IVA', 'Subtotal', ''].map((h) => (
                    <th key={h} className="text-left px-3 py-2.5 text-[10px] font-semibold uppercase tracking-widest text-ink-tertiary whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const base     = item.cantidad * item.precioUnitario - item.descuento
                  const ivaVal   = item.iva_pct === 15 ? base * 0.15 : 0
                  const subtotal = base + ivaVal
                  return (
                    <tr key={item._id} className="border-b border-edge-subtle last:border-0">
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={item.codigoPrincipal || ''}
                          onChange={(e) => updateItem(item._id, 'codigoPrincipal', e.target.value)}
                          className="field w-24"
                          placeholder="COD"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={item.descripcion}
                          onChange={(e) => updateItem(item._id, 'descripcion', e.target.value)}
                          className="field w-48"
                          placeholder="Descripción del producto o servicio"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={item.cantidad}
                          onChange={(e) => updateItem(item._id, 'cantidad', parseFloat(e.target.value) || 0)}
                          className="field w-20 text-right"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.precioUnitario}
                          onChange={(e) => updateItem(item._id, 'precioUnitario', parseFloat(e.target.value) || 0)}
                          className="field w-28 text-right"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.descuento}
                          onChange={(e) => updateItem(item._id, 'descuento', parseFloat(e.target.value) || 0)}
                          className="field w-24 text-right"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <select
                          value={item.iva_pct}
                          onChange={(e) => updateItem(item._id, 'iva_pct', parseInt(e.target.value) as 0 | 15)}
                          className="field w-20"
                        >
                          <option value={15}>15%</option>
                          <option value={0}>0%</option>
                        </select>
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-sm font-semibold text-ink-primary tabular-nums whitespace-nowrap">
                        {fmtMoney(Math.max(0, subtotal))}
                      </td>
                      <td className="px-3 py-2">
                        <button
                          onClick={() => removeItem(item._id)}
                          disabled={items.length === 1}
                          className="p-1.5 rounded-lg border border-edge text-ink-tertiary hover:text-red-600 dark:hover:text-red-400 hover:border-red-500/20 hover:bg-red-500/10 disabled:opacity-30 transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Totales */}
          <div className="border-t border-edge-subtle bg-surface-raised px-5 py-4">
            <div className="flex justify-end">
              <div className="space-y-1.5 min-w-[220px]">
                <div className="flex justify-between text-sm">
                  <span className="text-ink-tertiary">Subtotal</span>
                  <span className="font-mono text-ink-primary">{fmtMoney(totals.subtotal)}</span>
                </div>
                {totals.discount_total > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-ink-tertiary">Descuento</span>
                    <span className="font-mono text-red-600 dark:text-red-400">-{fmtMoney(totals.discount_total)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-ink-tertiary">IVA</span>
                  <span className="font-mono text-ink-primary">{fmtMoney(totals.tax_total)}</span>
                </div>
                <div className="flex justify-between text-sm font-bold border-t border-edge-subtle pt-1.5">
                  <span className="text-ink-primary">Total</span>
                  <span className="font-mono text-ink-primary text-base">{fmtMoney(totals.total)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Config adicional */}
        <div className="card p-5 space-y-4">
          <h2 className="text-[10px] font-semibold uppercase tracking-widest text-ink-tertiary">
            Configuración
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-[10px] uppercase tracking-widest text-ink-tertiary font-semibold mb-1.5 block">
                Forma de pago
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="field w-full"
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-widest text-ink-tertiary font-semibold mb-1.5 block">
                Válida hasta
              </label>
              <input
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
                className="field w-full"
              />
            </div>
            <div className="md:col-span-3">
              <label className="text-[10px] uppercase tracking-widest text-ink-tertiary font-semibold mb-1.5 block">
                Notas internas
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="field w-full resize-none"
                placeholder="Condiciones comerciales, observaciones..."
              />
            </div>
          </div>
        </div>

        {/* Acciones */}
        <div className="flex justify-end gap-3">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-edge-subtle border border-edge text-sm text-ink-secondary hover:text-ink-primary hover:border-edge-strong transition-all"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-sm font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 disabled:opacity-50 transition-all"
          >
            {saving
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : <Save className="w-3.5 h-3.5" />
            }
            Guardar cotización
          </button>
        </div>
      </div>
    </DashboardLayout>
  )
}
