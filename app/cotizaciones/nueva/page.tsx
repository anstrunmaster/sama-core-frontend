'use client'
import React, { useState, useEffect, useRef, useCallback } from 'react'
import ReactDOM from 'react-dom'
import { useRouter } from 'next/navigation'
import {
  ChevronLeft, Plus, Trash2, AlertCircle, X, Loader2, Save,
  Search, UserPlus, CheckCircle2, Pencil, Package,
} from 'lucide-react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { quotationsApi } from '../api-cotizaciones'
import {
  type QuotationFormItem, type QuotationPaymentTerm, type QuotationAdditionalInfo,
  EMPTY_ITEM, PAYMENT_METHODS, ID_TYPES, TIME_UNITS,
  buildItemTaxes, calcTotals, fmtMoney, round4,
} from '../types-cotizaciones'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://d16rb4jhhui7p6.cloudfront.net/api/v1'

function getToken(): string {
  if (typeof window === 'undefined') return ''
  return localStorage.getItem('_at') || localStorage.getItem('accessToken') || ''
}

interface CustomerOption {
  id: string
  name: string
  identification: string
  identification_type: string
  email?: string | null
  phone?: string | null
  address?: string | null
  city?: string | null
  addresses?: Array<{ label: string; address: string; is_default?: boolean }> | null
}

interface InventoryProduct {
  id: string
  code: string
  name: string
  price: number
  stock: number
}

const IVA_OPTIONS = [
  { value: 15, label: '15%' },
  { value: 5,  label: '5%'  },
  { value: 0,  label: '0%'  },
]

const LBL = 'text-[10px] uppercase tracking-widest text-ink-tertiary font-semibold mb-1.5 block'

export default function NuevaCotizacionPage() {
  const router = useRouter()

  // ── Clientes ──────────────────────────────────────────────────────────────
  const [customers, setCustomers]               = useState<CustomerOption[]>([])
  const [customerId, setCustomerId]             = useState('')
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerOption | null>(null)
  const [selectedBranch, setSelectedBranch]             = useState('')
  const [selectedBranchAddress, setSelectedBranchAddress] = useState('')

  const [customerSearch, setCustomerSearch] = useState('')
  const [showDropdown, setShowDropdown]     = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [customerSaved, setCustomerSaved]   = useState(false)
  const [editingCustomer, setEditingCustomer]       = useState(false)
  const [savingCustomerEdit, setSavingCustomerEdit] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)

  const [newCustomer, setNewCustomer] = useState({
    identification_type: '04', identification: '', name: '',
    email: '', phone: '', address: '', city: '',
  })
  const [savingCustomer, setSavingCustomer] = useState(false)
  const [customerError, setCustomerError]   = useState('')

  // Datos del comprador (snapshot)
  const [buyerIdType,  setBuyerIdType]  = useState('04')
  const [buyerId,      setBuyerId]      = useState('')
  const [buyerName,    setBuyerName]    = useState('')
  const [buyerEmail,   setBuyerEmail]   = useState('')
  const [buyerPhone,   setBuyerPhone]   = useState('')
  const [buyerAddress, setBuyerAddress] = useState('')
  const [buyerCity,    setBuyerCity]    = useState('')

  // ── Ítems ─────────────────────────────────────────────────────────────────
  const [items, setItems] = useState<QuotationFormItem[]>([EMPTY_ITEM()])

  // ── Inventario cacheado — FIX #5: una sola carga al inicio ───────────────
  const [inventoryCache, setInventoryCache] = useState<any[]>([])

  // Buscador de productos — FIX #4: keys separadas para código y descripción
  const [productSuggestions, setProductSuggestions]     = useState<Record<string, InventoryProduct[]>>({})
  const [showProductDropdown, setShowProductDropdown]   = useState<Record<string, boolean>>({})
  const [productSearchLoading, setProductSearchLoading] = useState<Record<string, boolean>>({})
  const productSearchTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  // ── Condiciones + config ──────────────────────────────────────────────────
  const [issueDate,      setIssueDate]      = useState(new Date().toISOString().slice(0, 10))
  const [dueDate,        setDueDate]        = useState('')
  const [creditDays,     setCreditDays]     = useState('')
  const [seller,         setSeller]         = useState('')
  const [validUntil,     setValidUntil]     = useState('')
  const [notes,          setNotes]          = useState('')
  const [paymentTerms,   setPaymentTerms]   = useState<QuotationPaymentTerm[]>([
    { medio: '01', valor: 0, plazo: '0', unidad_tiempo: 'dias' }
  ])
  const [additionalInfo, setAdditionalInfo] = useState<QuotationAdditionalInfo[]>([])

  // ── UI ────────────────────────────────────────────────────────────────────
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')

  // ── Cargar clientes e inventario al inicio ────────────────────────────────
  useEffect(() => {
    fetch(`${API_URL}/customers?limit=500`, {
      headers: { Authorization: `Bearer ${getToken()}` }
    })
      .then(r => r.json())
      .then(d => {
        const payload = d.data ?? d
        setCustomers(Array.isArray(payload.data) ? payload.data : [])
      })
      .catch(() => setCustomers([]))

    // FIX #5: cachear inventario una vez al cargar la página
    fetch(`${API_URL}/inventory`, {
      headers: { Authorization: `Bearer ${getToken()}` }
    })
      .then(r => r.json())
      .then(d => setInventoryCache(d.data || []))
      .catch(() => setInventoryCache([]))
  }, [])

  // Cerrar dropdown cliente al click fuera
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node))
        setShowDropdown(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // ── Sincronización días ↔ fecha vencimiento ───────────────────────────────
  const handleCreditDaysChange = (val: string) => {
    setCreditDays(val)
    if (val && issueDate) {
      const d = new Date(issueDate)
      d.setDate(d.getDate() + parseInt(val))
      setDueDate(d.toISOString().slice(0, 10))
    } else if (!val) {
      setDueDate('')
    }
  }

  const handleDueDateChange = (val: string) => {
    setDueDate(val)
    if (val && issueDate) {
      const issue = new Date(issueDate)
      const due   = new Date(val)
      const diff  = Math.round((due.getTime() - issue.getTime()) / (1000 * 60 * 60 * 24))
      setCreditDays(diff > 0 ? String(diff) : '')
    } else {
      setCreditDays('')
    }
  }

  const handleIssueDateChange = (val: string) => {
    setIssueDate(val)
    if (creditDays && val) {
      const d = new Date(val)
      d.setDate(d.getDate() + parseInt(creditDays))
      setDueDate(d.toISOString().slice(0, 10))
    }
  }

  // ── Clientes ──────────────────────────────────────────────────────────────
  const filteredCustomers = customerSearch.length >= 2
    ? customers.filter(c =>
        (c.name?.toLowerCase() || '').includes(customerSearch.toLowerCase()) ||
        (c.identification || '').includes(customerSearch)
      ).slice(0, 8)
    : []

  const handleCustomerChange = (id: string) => {
    setCustomerId(id)
    setSelectedBranch('')
    setSelectedBranchAddress('')
    setEditingCustomer(false)
    if (!id) { setSelectedCustomer(null); return }
    const c = customers.find(c => c.id === id) ?? null
    setSelectedCustomer(c)
    if (c) {
      setBuyerIdType(c.identification_type)
      setBuyerId(c.identification)
      setBuyerName(c.name)
      setBuyerEmail(c.email ?? '')
      setBuyerPhone(c.phone ?? '')
      setBuyerAddress(c.address ?? '')
      setBuyerCity(c.city ?? '')
    }
  }

  const handleCustomerSelect = (c: CustomerOption) => {
    setCustomerSearch(c.name)
    setShowDropdown(false)
    setShowCreateForm(false)
    setCustomerSaved(false)
    handleCustomerChange(c.id)
  }

  const handleSearchChange = (val: string) => {
    setCustomerSearch(val)
    setShowDropdown(val.length >= 2)
    if (!val) { handleCustomerChange(''); setShowCreateForm(false) }
  }

  const handleBranchChange = (label: string) => {
    setSelectedBranch(label)
    if (!label || !selectedCustomer?.addresses) {
      setBuyerAddress(selectedCustomer?.address ?? '')
      setBuyerCity(selectedCustomer?.city ?? '')
      setSelectedBranchAddress('')
      return
    }
    const branch = selectedCustomer.addresses.find(a => a.label === label)
    if (branch) {
      setBuyerAddress(branch.address)
      setSelectedBranchAddress(branch.address)
      setBuyerCity(branch.label)
    }
  }

  const handleCreateCustomer = async () => {
    setCustomerError('')
    if (!newCustomer.identification.trim()) { setCustomerError('La identificación es obligatoria'); return }
    if (!newCustomer.name.trim()) { setCustomerError('El nombre es obligatorio'); return }
    setSavingCustomer(true)
    try {
      const res = await fetch(`${API_URL}/customers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({
          identificationType: newCustomer.identification_type,
          identification:     newCustomer.identification,
          name:               newCustomer.name,
          email:              newCustomer.email   || undefined,
          phone:              newCustomer.phone   || undefined,
          address:            newCustomer.address || undefined,
          city:               newCustomer.city    || undefined,
        }),
      })
      const data = await res.json()
      const payload = data.data ?? data
      if (!res.ok) throw new Error(Array.isArray(payload.message) ? payload.message[0] : payload.message || 'Error')
      const newC: CustomerOption = {
        id: payload.data?.id ?? payload.id,
        name: newCustomer.name, identification: newCustomer.identification,
        identification_type: newCustomer.identification_type,
        email: newCustomer.email || null, phone: newCustomer.phone || null,
        address: newCustomer.address || null, city: newCustomer.city || null,
      }
      setCustomers(prev => [newC, ...prev])
      setCustomerSearch(newCustomer.name)
      setShowCreateForm(false)
      setCustomerSaved(true)
      handleCustomerChange(newC.id)
      setNewCustomer({ identification_type: '04', identification: '', name: '', email: '', phone: '', address: '', city: '' })
    } catch (e: any) {
      setCustomerError(e.message || 'Error al crear cliente')
    } finally {
      setSavingCustomer(false)
    }
  }

  const handleSaveCustomerEdit = async () => {
    if (!customerId) return
    setSavingCustomerEdit(true)
    try {
      await fetch(`${API_URL}/customers/${customerId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({
          name:    buyerName    || undefined,
          email:   buyerEmail   || undefined,
          phone:   buyerPhone   || undefined,
          address: buyerAddress || undefined,
          city:    buyerCity    || undefined,
        }),
      })
      setEditingCustomer(false)
    } catch {
      // silencioso — snapshot ya actualizado
    } finally {
      setSavingCustomerEdit(false)
    }
  }

  // ── Productos — FIX #4 y #5 ───────────────────────────────────────────────
  // dropdownKey: 'desc_{id}' para descripción, 'code_{id}' para código
  const searchProducts = async (dropdownKey: string, query: string) => {
    if (!query || query.length < 2) {
      setProductSuggestions(s => ({ ...s, [dropdownKey]: [] }))
      setShowProductDropdown(d => ({ ...d, [dropdownKey]: false }))
      return
    }
    setProductSearchLoading(l => ({ ...l, [dropdownKey]: true }))
    try {
      const res = await fetch(`${API_URL}/products?search=${encodeURIComponent(query)}&limit=8`, {
        headers: { Authorization: `Bearer ${getToken()}` }
      })
      const prodData = await res.json()
      const rawItems = prodData.data?.items || prodData.data?.data || []

      // FIX #5: usar inventario cacheado en lugar de fetch por búsqueda
      const prods: InventoryProduct[] = rawItems.map((p: any) => {
        const stock = inventoryCache
          .filter((i: any) => i.product_id === p.id)
          .reduce((s: number, i: any) => s + Number(i.stock_quantity || 0), 0)
        return { id: p.id, code: p.code, name: p.name, price: Number(p.price), stock }
      })
      setProductSuggestions(s => ({ ...s, [dropdownKey]: prods }))
      setShowProductDropdown(d => ({ ...d, [dropdownKey]: prods.length > 0 }))
    } catch {
      setProductSuggestions(s => ({ ...s, [dropdownKey]: [] }))
    } finally {
      setProductSearchLoading(l => ({ ...l, [dropdownKey]: false }))
    }
  }

  const handleDescripcionChange = (itemId: string, value: string) => {
    updateItem(itemId, 'descripcion', value)
    updateItem(itemId, 'productId', undefined)
    updateItem(itemId, 'stock', undefined)
    const key = `desc_${itemId}`
    clearTimeout(productSearchTimers.current[key])
    productSearchTimers.current[key] = setTimeout(() => searchProducts(key, value), 300)
  }

  const handleCodigoChange = (itemId: string, value: string) => {
    updateItem(itemId, 'codigoPrincipal', value)
    const key = `code_${itemId}`
    clearTimeout(productSearchTimers.current[key])
    productSearchTimers.current[key] = setTimeout(() => searchProducts(key, value), 300)
  }

  const selectProduct = (itemId: string, product: InventoryProduct) => {
    setItems(prev => prev.map(item => {
      if (item._id !== itemId) return item
      const base = round4(item.cantidad * product.price - item.descuento)
      return {
        ...item,
        codigoPrincipal: product.code || item.codigoPrincipal,
        descripcion:     product.name,
        precioUnitario:  product.price,
        productId:       product.id,
        stock:           product.stock,
        impuestos:       buildItemTaxes(Math.max(0, base), item.iva_pct),
      }
    }))
    // Cerrar ambos dropdowns del ítem
    setShowProductDropdown(d => ({ ...d, [`desc_${itemId}`]: false, [`code_${itemId}`]: false }))
    setProductSuggestions(s => ({ ...s, [`desc_${itemId}`]: [], [`code_${itemId}`]: [] }))
  }

  // ── Items ─────────────────────────────────────────────────────────────────
  function updateItem(id: string, field: keyof QuotationFormItem, value: any) {
    setItems(prev => prev.map(item => {
      if (item._id !== id) return item
      const updated = { ...item, [field]: value }
      if (['cantidad', 'precioUnitario', 'descuento', 'iva_pct'].includes(field)) {
        const base = round4(updated.cantidad * updated.precioUnitario - updated.descuento)
        updated.impuestos = buildItemTaxes(Math.max(0, base), updated.iva_pct)
      }
      return updated
    }))
  }

  // ── Pagos ─────────────────────────────────────────────────────────────────
  const updatePaymentTerm = (idx: number, field: keyof QuotationPaymentTerm, value: any) =>
    setPaymentTerms(prev => prev.map((p, i) => i === idx ? { ...p, [field]: value } : p))
  const removePaymentTerm = (idx: number) =>
    setPaymentTerms(prev => prev.filter((_, i) => i !== idx))

  const totals = calcTotals(items)

  useEffect(() => {
    if (paymentTerms.length === 1)
      setPaymentTerms(prev => prev.map((p, i) => i === 0 ? { ...p, valor: totals.total } : p))
  }, [totals.total])

  // ── Submit — FIX #2 y #6 ─────────────────────────────────────────────────
  async function handleSave() {
    setError('')
    if (!buyerName.trim()) { setError('El nombre del comprador es obligatorio'); return }
    if (buyerIdType !== '07' && !buyerId.trim()) { setError('La identificación es obligatoria'); return }
    if (buyerIdType === '05' && buyerId.length !== 10) { setError('La cédula debe tener 10 dígitos'); return }
    if (buyerIdType === '04' && buyerId.length !== 13) { setError('El RUC debe tener 13 dígitos'); return }
    if (items.some(i => !i.descripcion.trim())) { setError('Todos los ítems deben tener descripción'); return }
    if (items.some(i => i.cantidad <= 0)) { setError('La cantidad debe ser mayor a 0'); return }
    if (dueDate && dueDate < issueDate) { setError('La fecha de vencimiento no puede ser anterior a la emisión'); return }

    // FIX #6: validar stock antes de guardar
    const itemsConStockInsuficiente = items.filter(
      i => i.productId && i.stock !== undefined && i.cantidad > i.stock
    )
    if (itemsConStockInsuficiente.length > 0) {
      setError(`Stock insuficiente en: ${itemsConStockInsuficiente.map(i => i.descripcion).join(', ')}. Ajusta las cantidades antes de continuar.`)
      return
    }

    const sumPayments = round4(paymentTerms.reduce((s, p) => s + Number(p.valor), 0))
    if (Math.abs(sumPayments - totals.total) > 0.01) {
      setError(`La suma de formas de pago (${sumPayments.toFixed(2)}) no coincide con el total (${totals.total.toFixed(2)})`); return
    }

    const finalItems = items.map(item => {
      const base = round4(item.cantidad * item.precioUnitario - item.descuento)
      const { _id, iva_pct, stock, ...rest } = item
      return { ...rest, impuestos: buildItemTaxes(Math.max(0, base), iva_pct) }
    })

    setSaving(true)
    try {
      const q = await quotationsApi.create({
        customer_id:          customerId || undefined,
        buyer_id_type:        buyerIdType || undefined,
        buyer_id:             buyerId || undefined,
        buyer_name:           buyerName || undefined,
        buyer_email:          buyerEmail || undefined,
        buyer_phone:          buyerPhone || undefined,
        buyer_address:        buyerAddress || undefined,
        buyer_city:           buyerCity || undefined,
        buyer_address_branch: selectedBranchAddress || undefined,
        issue_date:           issueDate || undefined,
        due_date:             dueDate || undefined,
        credit_days:          creditDays ? parseInt(creditDays) : undefined,
        seller:               seller || undefined,
        items:                finalItems,
        ...totals,
        payment_terms:        paymentTerms,
        payment_method:       paymentTerms[0]?.medio || undefined,
        notes:                notes || undefined,
        valid_until:          validUntil || undefined,
        additional_info:      additionalInfo.length > 0 ? additionalInfo : undefined,
        // FIX #2: pasar inventoryItems para descuento de stock al convertir
        inventory_items: finalItems
          .filter((i: any) => i.productId)
          .map((i: any) => ({ productId: i.productId, quantity: i.cantidad })),
      })
      router.push(`/cotizaciones/${q.id}`)
    } catch (e: any) {
      setError(e.message || 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  // ── Render helper: dropdown productos via portal ──────────────────────────
  // Portal evita el clipping del overflow-x-auto de la tabla
  const ProductDropdown = ({ dropdownKey, itemId, anchorRef }: {
    dropdownKey: string
    itemId: string
    anchorRef: React.RefObject<HTMLInputElement>
  }) => {
    const [pos, setPos] = useState<{ top: number; left: number } | null>(null)

    useEffect(() => {
      if (!showProductDropdown[dropdownKey] || !anchorRef.current) return
      const rect = anchorRef.current.getBoundingClientRect()
      setPos({
        top:  rect.bottom + window.scrollY + 4,
        left: rect.left  + window.scrollX,
      })
    }, [showProductDropdown[dropdownKey]])

    if (!showProductDropdown[dropdownKey] || !productSuggestions[dropdownKey]?.length || !pos) return null

    return ReactDOM.createPortal(
      <div
        style={{ position: 'absolute', top: pos.top, left: pos.left, zIndex: 9999, width: 288 }}
        className="rounded-xl border border-edge bg-surface-raised shadow-2xl overflow-hidden"
      >
        {productSuggestions[dropdownKey].map((prod) => (
          <button key={prod.id} onMouseDown={() => selectProduct(itemId, prod)}
            className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-edge-subtle transition-colors text-left gap-3 border-b border-edge-subtle last:border-0">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <Package className="w-2.5 h-2.5 text-blue-500/60 shrink-0" />
                <span className="text-xs font-medium text-ink-primary truncate">{prod.name}</span>
              </div>
              <span className="text-[10px] text-ink-tertiary font-mono">{prod.code}</span>
            </div>
            <div className="shrink-0 text-right">
              <div className="text-xs font-semibold text-ink-primary">${prod.price.toFixed(2)}</div>
              <div className={`text-[10px] ${prod.stock > 0 ? 'text-green-500' : 'text-red-400'}`}>
                Stock: {prod.stock}
              </div>
            </div>
          </button>
        ))}
      </div>,
      document.body
    )
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <DashboardLayout>
      <div className="p-6 space-y-5">

        {/* Header */}
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()}
            className="p-1.5 rounded-lg border border-edge text-ink-tertiary hover:text-ink-primary hover:border-edge-strong transition-all">
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
            <div className="flex items-center gap-2"><AlertCircle className="w-4 h-4 shrink-0" /><span>{error}</span></div>
            <button onClick={() => setError('')}><X className="w-3.5 h-3.5" /></button>
          </div>
        )}

        {/* ── CLIENTE ───────────────────────────────────────────────────────── */}
        <div className="card p-5 space-y-4">
          <h2 className="text-[10px] font-semibold uppercase tracking-widest text-ink-tertiary">Cliente</h2>

          {/* Buscador */}
          <div ref={searchRef} className="relative">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-ghost pointer-events-none" />
              <input
                type="text"
                value={customerSearch}
                onChange={e => handleSearchChange(e.target.value)}
                onFocus={() => customerSearch.length >= 2 && setShowDropdown(true)}
                placeholder="Buscar por nombre, cédula o RUC..."
                className="field w-full pl-9 pr-9"
              />
              {customerSearch && (
                <button onClick={() => { setCustomerSearch(''); handleCustomerChange(''); setShowCreateForm(false); setCustomerSaved(false) }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-ghost hover:text-ink-tertiary transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Dropdown clientes */}
            {showDropdown && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-surface-raised border border-edge rounded-xl shadow-2xl z-20 overflow-hidden">
                {filteredCustomers.length > 0 ? (
                  <>
                    {filteredCustomers.map(c => (
                      <button key={c.id} onClick={() => handleCustomerSelect(c)}
                        className="w-full flex items-center justify-between px-4 py-3 hover:bg-edge-subtle transition-colors text-left border-b border-edge-subtle last:border-0">
                        <div>
                          <p className="text-sm font-medium text-ink-primary">{c.name || '—'}</p>
                          <p className="text-[11px] text-ink-tertiary font-mono mt-0.5">{c.identification || '—'}</p>
                        </div>
                        <span className="text-[10px] text-ink-ghost">
                          {c.identification_type === '04' ? 'RUC' : c.identification_type === '05' ? 'Cédula' : 'CF'}
                        </span>
                      </button>
                    ))}
                    <button onClick={() => { setShowDropdown(false); setShowCreateForm(true) }}
                      className="w-full flex items-center gap-2 px-4 py-3 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-500/5 transition-colors border-t border-edge-subtle">
                      <UserPlus className="w-3.5 h-3.5" /> Crear nuevo cliente
                    </button>
                  </>
                ) : (
                  <div className="px-4 py-4">
                    <p className="text-sm text-ink-tertiary mb-3">No encontramos "{customerSearch}"</p>
                    <button onClick={() => { setShowDropdown(false); setShowCreateForm(true); setNewCustomer(f => ({ ...f, name: customerSearch })) }}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 transition-all">
                      <UserPlus className="w-3.5 h-3.5" /> Crear "{customerSearch}" como nuevo cliente
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Badge cliente seleccionado */}
          {customerId && !showCreateForm && (
            <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-green-500/5 border border-green-500/20">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" />
                <span className="text-xs text-green-600 dark:text-green-400">
                  {customerSaved ? 'Cliente creado y seleccionado' : 'Cliente seleccionado'} — {buyerName}
                </span>
              </div>
              {!editingCustomer ? (
                <button onClick={() => setEditingCustomer(true)}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg bg-edge-subtle border border-edge text-xs text-ink-secondary hover:text-ink-primary transition-all">
                  <Pencil className="w-3 h-3" /> Editar
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button onClick={() => setEditingCustomer(false)} className="text-xs text-ink-ghost hover:text-ink-tertiary transition-colors">Cancelar</button>
                  <button onClick={handleSaveCustomerEdit} disabled={savingCustomerEdit}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg bg-blue text-xs font-semibold text-white hover:bg-blue-hover disabled:opacity-50 transition-all">
                    {savingCustomerEdit ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />} Guardar
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Formulario nuevo cliente */}
          {showCreateForm && (
            <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-widest">Nuevo cliente</p>
                <button onClick={() => setShowCreateForm(false)} className="text-ink-ghost hover:text-ink-tertiary"><X className="w-3.5 h-3.5" /></button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className={LBL}>Tipo de ID</label>
                  <select value={newCustomer.identification_type} onChange={e => setNewCustomer(f => ({ ...f, identification_type: e.target.value }))} className="field w-full text-sm">
                    {ID_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className={LBL}>RUC / Cédula *</label>
                  <input type="text" value={newCustomer.identification} onChange={e => setNewCustomer(f => ({ ...f, identification: e.target.value }))} className="field w-full font-mono text-sm" placeholder="0000000000001" />
                </div>
                <div className="md:col-span-2">
                  <label className={LBL}>Razón social / Nombre *</label>
                  <input type="text" value={newCustomer.name} onChange={e => setNewCustomer(f => ({ ...f, name: e.target.value }))} className="field w-full text-sm" placeholder="Empresa S.A." />
                </div>
                <div>
                  <label className={LBL}>Email</label>
                  <input type="email" value={newCustomer.email} onChange={e => setNewCustomer(f => ({ ...f, email: e.target.value }))} className="field w-full text-sm" placeholder="cliente@empresa.com" />
                </div>
                <div>
                  <label className={LBL}>Teléfono</label>
                  <input type="text" value={newCustomer.phone} onChange={e => setNewCustomer(f => ({ ...f, phone: e.target.value }))} className="field w-full text-sm" placeholder="0999999999" />
                </div>
                <div>
                  <label className={LBL}>Dirección</label>
                  <input type="text" value={newCustomer.address} onChange={e => setNewCustomer(f => ({ ...f, address: e.target.value }))} className="field w-full text-sm" placeholder="Av. Principal 123" />
                </div>
                <div>
                  <label className={LBL}>Ciudad</label>
                  <input type="text" value={newCustomer.city} onChange={e => setNewCustomer(f => ({ ...f, city: e.target.value }))} className="field w-full text-sm" placeholder="Guayaquil" />
                </div>
              </div>
              {customerError && <p className="text-xs text-red-600 dark:text-red-400">{customerError}</p>}
              <button onClick={handleCreateCustomer} disabled={savingCustomer}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue text-sm font-semibold text-white hover:bg-blue-hover disabled:opacity-50 transition-all">
                {savingCustomer ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
                Guardar cliente y continuar
              </button>
            </div>
          )}

          {/* Sucursal */}
          {selectedCustomer?.addresses && selectedCustomer.addresses.length > 0 && (
            <div>
              <label className={LBL}>Sucursal</label>
              <select value={selectedBranch} onChange={e => handleBranchChange(e.target.value)} className="field w-full">
                <option value="">Dirección matriz</option>
                {selectedCustomer.addresses.map(a => (
                  <option key={a.label} value={a.label}>{a.label}</option>
                ))}
              </select>
            </div>
          )}

          {/* Campos del comprador */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={LBL}>Tipo de ID</label>
              <select value={buyerIdType} onChange={e => setBuyerIdType(e.target.value)}
                disabled={!!customerId && !editingCustomer}
                className="field w-full disabled:opacity-60 disabled:cursor-not-allowed">
                {ID_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className={LBL}>RUC / Cédula</label>
              <input type="text" value={buyerId} onChange={e => setBuyerId(e.target.value)}
                disabled={!!customerId}
                className="field w-full disabled:opacity-60 disabled:cursor-not-allowed"
                placeholder="0000000000001" />
            </div>
            <div className="md:col-span-2">
              <label className={LBL}>Razón social / Nombre <span className="text-red-500">*</span></label>
              <input type="text" value={buyerName} onChange={e => setBuyerName(e.target.value)}
                disabled={!!customerId && !editingCustomer}
                className="field w-full disabled:opacity-60 disabled:cursor-not-allowed"
                placeholder="Empresa o persona" />
            </div>
            <div>
              <label className={LBL}>Email</label>
              <input type="email" value={buyerEmail} onChange={e => setBuyerEmail(e.target.value)}
                disabled={!!customerId && !editingCustomer}
                className="field w-full disabled:opacity-60 disabled:cursor-not-allowed"
                placeholder="cliente@empresa.com" />
            </div>
            <div>
              <label className={LBL}>Teléfono</label>
              <input type="text" value={buyerPhone} onChange={e => setBuyerPhone(e.target.value)}
                disabled={!!customerId && !editingCustomer}
                className="field w-full disabled:opacity-60 disabled:cursor-not-allowed"
                placeholder="0999999999" />
            </div>
            <div>
              <label className={LBL}>Dirección</label>
              <input type="text" value={buyerAddress} onChange={e => setBuyerAddress(e.target.value)}
                disabled={!!customerId && !editingCustomer}
                className="field w-full disabled:opacity-60 disabled:cursor-not-allowed"
                placeholder="Calle, ciudad" />
            </div>
            <div>
              <label className={LBL}>Ciudad</label>
              <input type="text" value={buyerCity} onChange={e => setBuyerCity(e.target.value)}
                disabled={!!customerId && !editingCustomer}
                className="field w-full disabled:opacity-60 disabled:cursor-not-allowed"
                placeholder="Guayaquil" />
            </div>
          </div>
        </div>

        {/* ── ÍTEMS ─────────────────────────────────────────────────────────── */}
        <div className="card overflow-hidden">
          <div className="px-5 py-3 border-b border-edge-subtle bg-surface-raised flex items-center justify-between">
            <h2 className="text-[10px] font-semibold uppercase tracking-widest text-ink-tertiary">Ítems</h2>
            <button onClick={() => setItems(prev => [...prev, EMPTY_ITEM()])}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-medium hover:bg-blue-500/20 transition-all">
              <Plus className="w-3 h-3" /> Agregar ítem
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-edge-subtle">
                  {['Código', 'Descripción', 'Detalle', 'Cant.', 'P. Unitario', 'Desc.', 'IVA', 'Subtotal', ''].map(h => (
                    <th key={h} className="text-left px-3 py-2.5 text-[10px] font-semibold uppercase tracking-widest text-ink-tertiary whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map(item => {
                  const base        = round4(item.cantidad * item.precioUnitario - item.descuento)
                  const ivaVal      = round4(Math.max(0, base) * (item.iva_pct / 100))
                  const subtotal    = round4(Math.max(0, base) + ivaVal)
                  const hasLowStock = item.productId && item.stock !== undefined && item.cantidad > item.stock
                  const descKey     = `desc_${item._id}`
                  const codeKey     = `code_${item._id}`
                  // refs para posicionar el portal
                  const codeInputRef = React.createRef<HTMLInputElement>()
                  const descInputRef = React.createRef<HTMLInputElement>()

                  return (
                    <React.Fragment key={item._id}>
                      <tr className="border-b border-edge-subtle">

                        {/* Código — busca por código */}
                        <td className="px-3 py-2 align-top">
                          <div className="relative">
                            {productSearchLoading[codeKey] && (
                              <div className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 border border-blue-400/40 border-t-blue-500 rounded-full animate-spin" />
                            )}
                            <input
                              ref={codeInputRef}
                              type="text"
                              value={item.codigoPrincipal || ''}
                              onChange={e => handleCodigoChange(item._id, e.target.value)}
                              onFocus={() => productSuggestions[codeKey]?.length > 0 && setShowProductDropdown(d => ({ ...d, [codeKey]: true }))}
                              onBlur={() => setTimeout(() => setShowProductDropdown(d => ({ ...d, [codeKey]: false })), 200)}
                              className="field w-24"
                              placeholder="COD"
                            />
                            <ProductDropdown dropdownKey={codeKey} itemId={item._id} anchorRef={codeInputRef} />
                          </div>
                        </td>

                        {/* Descripción — busca por nombre */}
                        <td className="px-3 py-2 align-top">
                          <div className="relative">
                            {item.productId && (
                              <Package className="absolute left-2 top-3 w-3 h-3 text-blue-500/60 pointer-events-none" />
                            )}
                            {productSearchLoading[descKey] && (
                              <div className="absolute right-2 top-3 w-3 h-3 border border-blue-400/40 border-t-blue-500 rounded-full animate-spin" />
                            )}
                            <input
                              ref={descInputRef}
                              type="text"
                              value={item.descripcion}
                              onChange={e => handleDescripcionChange(item._id, e.target.value)}
                              onFocus={() => productSuggestions[descKey]?.length > 0 && setShowProductDropdown(d => ({ ...d, [descKey]: true }))}
                              onBlur={() => setTimeout(() => setShowProductDropdown(d => ({ ...d, [descKey]: false })), 200)}
                              className={`field w-44 ${item.productId ? 'pl-6 text-blue-600 dark:text-blue-400' : ''}`}
                              placeholder="Descripción..."
                            />
                            <ProductDropdown dropdownKey={descKey} itemId={item._id} anchorRef={descInputRef} />
                            {/* Indicador vinculado */}
                            {item.productId && !hasLowStock && (
                              <div className="flex items-center gap-1 mt-0.5">
                                <Package className="w-2.5 h-2.5 text-blue-500/50" />
                                <span className="text-[10px] text-blue-600/60 dark:text-blue-400/60">Se descontará al facturar</span>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Detalle adicional */}
                        <td className="px-3 py-2 align-top">
                          <input
                            type="text"
                            value={item.detallesAdicionales || ''}
                            onChange={e => updateItem(item._id, 'detallesAdicionales', e.target.value)}
                            className="field w-36 text-xs"
                            placeholder="Detalle opcional"
                          />
                        </td>

                        <td className="px-3 py-2 align-top">
                          <input type="number" min="0.0001" step="0.0001" value={item.cantidad}
                            onChange={e => updateItem(item._id, 'cantidad', parseFloat(e.target.value) || 0)}
                            className="field w-20 text-right" />
                        </td>
                        <td className="px-3 py-2 align-top">
                          <input type="number" min="0" step="0.0001" value={item.precioUnitario}
                            onChange={e => updateItem(item._id, 'precioUnitario', parseFloat(e.target.value) || 0)}
                            className="field w-28 text-right" />
                        </td>
                        <td className="px-3 py-2 align-top">
                          <input type="number" min="0" step="0.0001" value={item.descuento}
                            onChange={e => updateItem(item._id, 'descuento', parseFloat(e.target.value) || 0)}
                            className="field w-24 text-right" />
                        </td>
                        <td className="px-3 py-2 align-top">
                          <select value={item.iva_pct}
                            onChange={e => updateItem(item._id, 'iva_pct', parseInt(e.target.value) as 0 | 5 | 15)}
                            className="field w-20">
                            {IVA_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                          </select>
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-sm font-semibold text-ink-primary tabular-nums whitespace-nowrap align-top pt-3">
                          {fmtMoney(Math.max(0, subtotal))}
                        </td>
                        <td className="px-3 py-2 align-top">
                          <button onClick={() => { if (items.length > 1) setItems(prev => prev.filter(i => i._id !== item._id)) }}
                            disabled={items.length === 1}
                            className="p-1.5 rounded-lg border border-edge text-ink-tertiary hover:text-red-600 dark:hover:text-red-400 hover:border-red-500/20 hover:bg-red-500/10 disabled:opacity-30 transition-all">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>

                      {/* FIX #6: Alerta stock insuficiente como fila separada */}
                      {hasLowStock && (
                        <tr>
                          <td colSpan={9} className="px-3 pb-2">
                            <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-amber-500/10 border border-amber-500/20">
                              <AlertCircle className="w-3 h-3 text-amber-500 shrink-0" />
                              <span className="text-[10px] text-amber-600 dark:text-amber-400">
                                Stock disponible: {item.stock} — solicitado: {item.cantidad}. Se bloqueará al guardar.
                              </span>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
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

        {/* ── CONFIGURACIÓN ─────────────────────────────────────────────────── */}
        <div className="card p-5 space-y-4">
          <h2 className="text-[10px] font-semibold uppercase tracking-widest text-ink-tertiary">Configuración</h2>

          {/* Formas de pago */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className={LBL}>Formas de pago</label>
              <button onClick={() => setPaymentTerms(prev => [...prev, { medio: '01', valor: 0, plazo: '0', unidad_tiempo: 'dias' }])}
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-edge-subtle border border-edge text-xs text-ink-secondary hover:text-ink-primary transition-all">
                <Plus className="w-3 h-3" /> Agregar
              </button>
            </div>
            {paymentTerms.map((p, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                <div className="col-span-5">
                  <select value={p.medio} onChange={e => updatePaymentTerm(idx, 'medio', e.target.value)} className="field w-full text-sm">
                    {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <input type="number" min="0" step="0.01" value={p.valor}
                    onChange={e => updatePaymentTerm(idx, 'valor', parseFloat(e.target.value) || 0)}
                    className="field w-full text-right text-sm" placeholder="Valor" />
                </div>
                <div className="col-span-2">
                  <input type="number" min="0" value={p.plazo ?? ''}
                    onChange={e => updatePaymentTerm(idx, 'plazo', e.target.value)}
                    className="field w-full text-sm" placeholder="Plazo" />
                </div>
                <div className="col-span-2">
                  <select value={p.unidad_tiempo ?? 'dias'}
                    onChange={e => updatePaymentTerm(idx, 'unidad_tiempo', e.target.value)}
                    className="field w-full text-sm">
                    {TIME_UNITS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
                  </select>
                </div>
                <div className="col-span-1 flex justify-end">
                  {paymentTerms.length > 1 && (
                    <button onClick={() => removePaymentTerm(idx)} className="p-1.5 rounded text-ink-ghost hover:text-red-500 hover:bg-red-500/10 transition-all">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
            {paymentTerms.length > 1 && (() => {
              const sum = round4(paymentTerms.reduce((s, p) => s + Number(p.valor), 0))
              if (Math.abs(sum - totals.total) > 0.01) return (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  ⚠ La suma de pagos ({fmtMoney(sum)}) no coincide con el total ({fmtMoney(totals.total)})
                </p>
              )
              return null
            })()}
          </div>

          {/* Condiciones comerciales — sincronizadas */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className={LBL}>Fecha emisión</label>
              <input type="date" value={issueDate} onChange={e => handleIssueDateChange(e.target.value)} className="field w-full" />
            </div>
            <div>
              <label className={LBL}>
                Días de crédito
                {creditDays && dueDate && (
                  <span className="ml-1 normal-case font-normal text-ink-ghost">→ vence {dueDate}</span>
                )}
              </label>
              <input type="number" min="0" value={creditDays}
                onChange={e => handleCreditDaysChange(e.target.value)}
                className="field w-full" placeholder="0 = contado" />
            </div>
            <div>
              <label className={LBL}>
                Fecha vencimiento
                {creditDays && <span className="ml-1 normal-case font-normal text-ink-ghost">({creditDays}d)</span>}
              </label>
              <input type="date" value={dueDate} onChange={e => handleDueDateChange(e.target.value)} className="field w-full" />
            </div>
            <div>
              <label className={LBL}>Vendedor</label>
              <input type="text" value={seller} onChange={e => setSeller(e.target.value)} className="field w-full" placeholder="Nombre del vendedor" />
            </div>
            <div>
              <label className={LBL}>Válida hasta</label>
              <input type="date" value={validUntil} onChange={e => setValidUntil(e.target.value)} className="field w-full" />
            </div>
          </div>

          {/* Notas */}
          <div>
            <label className={LBL}>Notas internas</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
              className="field w-full resize-none" placeholder="Condiciones comerciales, observaciones..." />
          </div>

          {/* Información adicional */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className={LBL}>Información adicional</label>
              <button onClick={() => setAdditionalInfo(prev => [...prev, { label: '', value: '' }])}
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-edge-subtle border border-edge text-xs text-ink-secondary hover:text-ink-primary transition-all">
                <Plus className="w-3 h-3" /> Agregar campo
              </button>
            </div>
            {additionalInfo.map((ai, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input type="text" value={ai.label}
                  onChange={e => setAdditionalInfo(prev => prev.map((a, i) => i === idx ? { ...a, label: e.target.value } : a))}
                  className="field flex-1 text-sm" placeholder="Etiqueta (ej: Orden de compra)" />
                <input type="text" value={ai.value}
                  onChange={e => setAdditionalInfo(prev => prev.map((a, i) => i === idx ? { ...a, value: e.target.value } : a))}
                  className="field flex-1 text-sm" placeholder="Valor" />
                <button onClick={() => setAdditionalInfo(prev => prev.filter((_, i) => i !== idx))}
                  className="p-1.5 rounded text-ink-ghost hover:text-red-500 hover:bg-red-500/10 transition-all">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* ── ACCIONES ──────────────────────────────────────────────────────── */}
        <div className="flex justify-end gap-3">
          <button onClick={() => router.back()}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-edge-subtle border border-edge text-sm text-ink-secondary hover:text-ink-primary hover:border-edge-strong transition-all">
            Cancelar
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue text-sm font-semibold text-white hover:bg-blue-hover disabled:opacity-50 transition-all">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Guardar cotización
          </button>
        </div>

      </div>
    </DashboardLayout>
  )
}
