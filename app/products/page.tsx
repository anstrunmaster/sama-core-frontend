'use client'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { useState, useEffect, useCallback, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Package, Plus, RefreshCw, ChevronLeft, ChevronDown,
  X, Save, Search, CheckCircle2, Pencil, Sparkles, AlertCircle
} from 'lucide-react'
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://d16rb4jhhui7p6.cloudfront.net/api/v1'
interface Product {
  id:          string
  code:        string
  name:        string
  description: string | null
  type:        'PRODUCT' | 'SERVICE'
  price:       number
  cost_price:  number | null
  unit:        string | null
  category_id: string | null
  is_active:   boolean
  created_at:  string
}
interface Category {
  id:            string
  code:          string
  name:          string
  category_type: string
}
function getToken(): string {
  if (typeof window === 'undefined') return ''
  try {
    return localStorage.getItem('_at') || localStorage.getItem('accessToken') || ''
  } catch {
    return ''
  }
}
/**
 * Formato de moneda con punto para miles y coma para decimales: $1.234,56
 * (formato usado en Ecuador). Se define manualmente para garantizar el
 * separador correcto independientemente del entorno de ejecución.
 */
function fmtMoney(n: number) {
  const safe = Number.isFinite(n) ? n : 0
  const [intPart, decPart] = Math.abs(safe).toFixed(2).split('.')
  const withThousands = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `${safe < 0 ? '-' : ''}$${withThousands},${decPart}`
}
/** Unidades disponibles para productos (los servicios no requieren unidad). */
const UNIT_OPTIONS = [
  'UND', 'KG', 'G', 'LB', 'L', 'ML',
  'M', 'CM', 'M2', 'M3', 'CAJA', 'PAQ',
  'DOC', 'PAR', 'ROLLO', 'GAL', 'SACO',
]
/** Máximo de caracteres permitidos en el código del producto. */
const MAX_CODE_LENGTH = 20
/** Máximo de cifras enteras permitidas en los precios (6 cifras => hasta 999999.99). */
const MAX_INTEGER_DIGITS = 6
const MAX_PRICE = 999999.99
/**
 * Sanitiza la entrada de un precio: acepta coma o punto como separador decimal
 * (se normaliza a punto para poder parsear con Number), máximo 2 decimales y
 * como máximo 6 cifras enteras. Devuelve null si el valor no es admisible
 * (para ignorar la pulsación y no cambiar el estado).
 */
function sanitizePrice(value: string): string | null {
  if (value === '') return ''
  // Normaliza coma -> punto para el separador decimal.
  const normalized = value.replace(',', '.')
  if (!/^\d*\.?\d{0,2}$/.test(normalized)) return null
  const intPart = normalized.split('.')[0]
  if (intPart.length > MAX_INTEGER_DIGITS) return null
  return normalized
}
/**
 * Normaliza texto para búsqueda: minúsculas y sin tildes/diacríticos.
 * Permite que "credito" encuentre "Crédito", etc.
 */
function normalizeText(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}
/**
 * Selector de categoría con búsqueda (combobox / autocomplete).
 * - Filtra en tiempo real por código o nombre mientras el usuario escribe.
 * - Búsqueda insensible a mayúsculas y tildes (los datos ya están en memoria,
 *   por lo que el filtrado es instantáneo desde el primer carácter).
 * - Navegación con teclado: ↑/↓ para moverse, Enter para seleccionar, Esc para cerrar.
 * - Usa los mismos tokens de diseño del sistema (field, card-raised, ink-*, edge-*).
 * Recibe la lista YA filtrada por tipo de producto; este componente solo
 * resuelve la búsqueda y la selección.
 */
function CategorySelect({
  categories,
  value,
  onChange,
  disabled = false,
}: {
  categories: Category[]
  value: string
  onChange: (id: string) => void
  disabled?: boolean
}) {
  const [open, setOpen]               = useState(false)
  const [query, setQuery]             = useState('')
  const [activeIndex, setActiveIndex] = useState(-1)
  const wrapRef  = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const listRef  = useRef<HTMLUListElement | null>(null)
  const selected = categories.find(c => c.id === value) ?? null
  // Filtrado en tiempo real por código o nombre (insensible a mayúsculas/tildes).
  const q = normalizeText(query.trim())
  const filtered = q
    ? categories.filter(c =>
        normalizeText(c.code).includes(q) || normalizeText(c.name).includes(q))
    : categories
  // Opciones renderizadas: "Sin categoría" siempre disponible al inicio
  // (solo cuando no se está buscando, para no estorbar los resultados).
  type Option = { id: string; label: string; cat: Category | null }
  const options: Option[] = [
    ...(q ? [] : [{ id: '', label: 'Sin categoría', cat: null }]),
    ...filtered.map(c => ({ id: c.id, label: `${c.code} — ${c.name}`, cat: c })),
  ]
  // Cerrar al hacer click fuera del componente.
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false)
        setQuery('')
        setActiveIndex(-1)
      }
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])
  // Mantener visible la opción activa al navegar con teclado.
  useEffect(() => {
    if (!open || activeIndex < 0 || !listRef.current) return
    const el = listRef.current.children[activeIndex] as HTMLElement | undefined
    el?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex, open])
  const openList = () => {
    if (disabled) return
    setOpen(true)
    setQuery('')
    setActiveIndex(-1)
  }
  const selectOption = (opt: Option) => {
    onChange(opt.id)
    setOpen(false)
    setQuery('')
    setActiveIndex(-1)
    inputRef.current?.blur()
  }
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open && (e.key === 'ArrowDown' || e.key === 'Enter')) {
      e.preventDefault()
      openList()
      return
    }
    if (!open) return
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setActiveIndex(i => Math.min(i + 1, options.length - 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setActiveIndex(i => Math.max(i - 1, 0))
        break
      case 'Enter':
        e.preventDefault()
        if (activeIndex >= 0 && options[activeIndex]) selectOption(options[activeIndex])
        break
      case 'Escape':
        e.preventDefault()
        setOpen(false)
        setQuery('')
        setActiveIndex(-1)
        break
    }
  }
  return (
    <div ref={wrapRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-ghost pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
          disabled={disabled}
          value={open ? query : (selected ? `${selected.code} — ${selected.name}` : '')}
          onChange={e => {
            setQuery(e.target.value)
            setActiveIndex(-1)
            if (!open) setOpen(true)
          }}
          onFocus={openList}
          onKeyDown={handleKeyDown}
          placeholder="Buscar por código o nombre..."
          className="field pl-9 pr-14"
        />
        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {selected && !open && (
            <button
              type="button"
              onClick={() => onChange('')}
              className="p-0.5 rounded text-ink-tertiary hover:text-ink-primary transition-colors"
              title="Quitar categoría"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <ChevronDown
            className={`w-3.5 h-3.5 text-ink-ghost pointer-events-none transition-transform ${open ? 'rotate-180' : ''}`}
          />
        </div>
      </div>
      {open && (
        <ul
          ref={listRef}
          role="listbox"
          className="card-raised absolute z-50 mt-1 w-full max-h-52 overflow-y-auto py-1 shadow-xl"
        >
          {options.length === 0 ? (
            <li className="px-3 py-2.5 text-sm text-ink-tertiary">
              Sin resultados para «{query.trim()}»
            </li>
          ) : (
            options.map((opt, i) => {
              const isActive   = i === activeIndex
              const isSelected = opt.id === value && (opt.id !== '' || value === '')
              return (
                <li
                  key={opt.id || '__none__'}
                  role="option"
                  aria-selected={isSelected}
                  onMouseDown={e => e.preventDefault()}
                  onClick={() => selectOption(opt)}
                  onMouseEnter={() => setActiveIndex(i)}
                  className={`px-3 py-2 text-sm cursor-pointer flex items-center justify-between gap-2 transition-colors ${
                    isActive ? 'bg-edge-subtle text-ink-primary' : 'text-ink-secondary'
                  }`}
                >
                  {opt.cat ? (
                    <span className="truncate">
                      <span className="font-mono font-semibold text-ink-primary">{opt.cat.code}</span>
                      <span className="text-ink-tertiary"> — </span>
                      {opt.cat.name}
                    </span>
                  ) : (
                    <span className="text-ink-tertiary italic">{opt.label}</span>
                  )}
                  {opt.id === value && opt.id !== '' && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue shrink-0" />
                  )}
                </li>
              )
            })
          )}
        </ul>
      )}
    </div>
  )
}
const emptyForm = {
  code: '', name: '', description: '',
  type: 'PRODUCT' as 'PRODUCT' | 'SERVICE',
  price: '', cost_price: '', unit: '',
  category_id: '',
}
/**
 * Fallback simple para el Suspense boundary.
 * Se muestra mientras Next.js evalúa los searchParams en SSG/SSR.
 */
function ProductsLoading() {
  return (
    <DashboardLayout>
      <div className="p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-edge-subtle animate-pulse" />
          <div>
            <div className="h-5 w-48 bg-edge-subtle rounded animate-pulse" />
            <div className="h-3 w-20 bg-edge-subtle rounded animate-pulse mt-2" />
          </div>
        </div>
        <div className="h-10 bg-edge-subtle rounded-lg animate-pulse" />
        <div className="card overflow-hidden">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-14 border-b border-edge-subtle bg-edge-subtle/40 animate-pulse" />
          ))}
        </div>
      </div>
    </DashboardLayout>
  )
}
/**
 * Componente interno que usa useSearchParams.
 * Debe estar adentro de <Suspense> para que Next.js 14 pueda hacer SSG.
 */
function ProductsPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const highlightId = searchParams.get('highlight')
  const [products, setProducts]     = useState<Product[]>([])
  const [total, setTotal]           = useState(0)
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [search, setSearch]         = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [showModal, setShowModal]   = useState(false)
  const [editing, setEditing]       = useState<Product | null>(null)
  const [form, setForm]             = useState(emptyForm)
  const [formError, setFormError]   = useState('')
  const [saving, setSaving]         = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  // Highlight: ref a la fila destacada para scroll automático
  const highlightedRowRef = useRef<HTMLTableRowElement | null>(null)
  // Estado para fade-out después del primer scroll (mejor UX)
  const [highlightActive, setHighlightActive] = useState(true)
  const fetchProducts = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams()
      if (search)     params.set('search', search)
      if (typeFilter) params.set('type', typeFilter)
      const res  = await fetch(`${API_URL}/products?${params}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        const msg = Array.isArray(errData.message) ? errData.message[0] : errData.message
        throw new Error(msg || `Error ${res.status} al cargar productos`)
      }
      const data = await res.json()
      const payload = data.data ?? data
      setProducts(Array.isArray(payload.items) ? payload.items : Array.isArray(payload) ? payload : [])
      setTotal(payload.total ?? 0)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar productos')
    } finally {
      setLoading(false)
    }
  }, [search, typeFilter])
  useEffect(() => {
    const t = setTimeout(fetchProducts, 300)
    return () => clearTimeout(t)
  }, [fetchProducts])
  // Carga de categorías (una sola vez al montar la página)
  useEffect(() => {
    fetch(`${API_URL}/product-categories`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
      .then(r => r.json())
      .then(d => setCategories(Array.isArray(d.data ?? d) ? (d.data ?? d) : []))
      .catch(() => setCategories([]))
  }, [])
  // Cuando cambia el highlightId o se cargan los productos:
  //  1) scrollear a la fila
  //  2) reactivar la animación de highlight (por si el usuario navega entre productos)
  useEffect(() => {
    if (!highlightId || loading || products.length === 0) return
    setHighlightActive(true)
    // Pequeño delay para que el DOM termine de renderizar
    const t = setTimeout(() => {
      if (highlightedRowRef.current) {
        highlightedRowRef.current.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        })
      }
    }, 100)
    // Auto-fade después de 4 segundos para no distraer
    const fadeT = setTimeout(() => setHighlightActive(false), 4000)
    return () => {
      clearTimeout(t)
      clearTimeout(fadeT)
    }
  }, [highlightId, loading, products])
  const showSuccess = (msg: string) => {
    setSuccessMsg(msg)
    setTimeout(() => setSuccessMsg(''), 4000)
  }
  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm)
    setFormError('')
    setShowModal(true)
  }
  const openEdit = (p: Product) => {
    setEditing(p)
    setForm({
      code:        p.code,
      name:        p.name,
      description: p.description ?? '',
      type:        p.type,
      price:       String(p.price),
      cost_price:  p.cost_price ? String(p.cost_price) : '',
      unit:        p.unit ?? '',
      category_id: p.category_id ?? '',
    })
    setFormError('')
    setShowModal(true)
  }
  /**
   * Categorías compatibles con el tipo seleccionado en el formulario:
   * PRODUCT (inventario) -> INVENTORY | SERVICE -> SERVICE.
   * El usuario solo ve categorías contables válidas para el tipo de producto.
   */
  const compatibleCategories = categories.filter(c =>
    form.type === 'SERVICE' ? c.category_type === 'SERVICE' : c.category_type === 'INVENTORY'
  )
  // Cambiar tipo. Al pasar a SERVICE limpiamos la unidad (los servicios no la usan).
  // Si la categoría seleccionada no es compatible con el nuevo tipo, se limpia
  // para evitar guardar una combinación inválida.
  const setType = (t: 'PRODUCT' | 'SERVICE') => {
    setForm(f => {
      const cat = categories.find(c => c.id === f.category_id)
      const catCompatible = cat
        ? (t === 'SERVICE' ? cat.category_type === 'SERVICE' : cat.category_type === 'INVENTORY')
        : false
      return {
        ...f,
        type: t,
        unit: t === 'SERVICE' ? '' : f.unit,
        category_id: catCompatible ? f.category_id : '',
      }
    })
  }
  // Actualiza un precio validando cifras/decimales antes de escribir en el estado.
  const setPrice = (field: 'price' | 'cost_price', value: string) => {
    const clean = sanitizePrice(value)
    if (clean === null) return
    setForm(f => ({ ...f, [field]: clean }))
  }
  /**
   * Validación del formulario. Devuelve un mensaje de error o null si todo es válido.
   * Mantiene la misma filosofía: código, nombre y precio de venta obligatorios.
   */
  const validateForm = (): string | null => {
    if (!form.code.trim())  return 'El código es obligatorio'
    if (form.code.trim().length > MAX_CODE_LENGTH) return `El código no puede superar los ${MAX_CODE_LENGTH} caracteres`
    if (!form.name.trim())  return 'El nombre es obligatorio'
    if (!form.price)        return 'El precio de venta es obligatorio'
    const price = Number(form.price)
    if (Number.isNaN(price) || price <= 0) return 'El precio de venta debe ser mayor a 0'
    if (price > MAX_PRICE)  return `El precio de venta no puede superar las ${MAX_INTEGER_DIGITS} cifras (máx. ${fmtMoney(MAX_PRICE)})`
    if (form.cost_price) {
      const cost = Number(form.cost_price)
      if (Number.isNaN(cost) || cost < 0) return 'El precio de costo no es válido'
      if (cost > MAX_PRICE) return `El precio de costo no puede superar las ${MAX_INTEGER_DIGITS} cifras (máx. ${fmtMoney(MAX_PRICE)})`
    }
    return null
  }
const handleSubmit = async () => {
  const validationError = validateForm()
  if (validationError) {
    setFormError(validationError)
    return
  }
  setSaving(true)
  setError('')
  setFormError('')
  try {
    const body: any = editing
      ? {
          // PATCH: NO enviar code ni type
          name: form.name,
          price: Number(form.price),
          ...(form.description && { description: form.description }),
          ...(form.cost_price && { cost_price: Number(form.cost_price) }),
          ...(form.unit && { unit: form.unit }),
          ...(form.category_id && { category_id: form.category_id }),
        }
      : {
          // POST: enviar todos los campos requeridos
          code: form.code,
          name: form.name,
          type: form.type,
          price: Number(form.price),
          ...(form.description && { description: form.description }),
          ...(form.cost_price && { cost_price: Number(form.cost_price) }),
          ...(form.unit && { unit: form.unit }),
          ...(form.category_id && { category_id: form.category_id }),
        }
const url = editing
  ? `${API_URL}/products/${editing.id}`
  : `${API_URL}/products`
const method = editing ? 'PATCH' : 'POST'
const res = await fetch(url, {
  method,
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${getToken()}`,
  },
  body: JSON.stringify(body),
})
const data = await res.json().catch(() => ({}))
if (!res.ok) {
  const msg = Array.isArray(data.message) ? data.message[0] : data.message
  setFormError(msg || 'Error al guardar producto')
  return
}
      setShowModal(false)
      showSuccess(editing ? 'Producto actualizado' : 'Producto creado exitosamente')
      fetchProducts()
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Error de conexión')
    } finally {
      setSaving(false)
    }
  }
  const handleDelete = async (id: string) => {
    if (!confirm('¿Desactivar este producto?')) return
    setError('')
    try {
      const res = await fetch(`${API_URL}/products/${id}`, {
        method:  'DELETE',
        headers: { Authorization: `Bearer ${getToken()}` },
      })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        const msg = Array.isArray(errData.message) ? errData.message[0] : errData.message
        throw new Error(msg || 'Error al desactivar')
      }
      showSuccess('Producto desactivado')
      fetchProducts()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al desactivar')
    }
  }
  // Limpiar el ?highlight de la URL después del scroll/highlight (UX limpia)
  const clearHighlight = () => {
    if (highlightId) {
      router.replace('/products')
    }
  }
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
            <h1 className="text-lg font-bold text-ink-primary">Productos y Servicios</h1>
            <p className="text-sm text-ink-tertiary mt-0.5">{total} registro{total !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchProducts}
            className="p-2 rounded-lg bg-edge-subtle border border-edge text-ink-secondary hover:text-ink-primary transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue hover:bg-blue-hover text-white text-sm font-semibold transition-all"
          >
            <Plus className="w-4 h-4" />
            Nuevo
          </button>
        </div>
      </div>
      {/* Banner cuando viene desde una anomalía detectada por IA */}
      {highlightId && highlightActive && (
        <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-lg bg-violet-500/10 border border-violet-500/20">
          <div className="flex items-center gap-2 text-sm">
            <Sparkles className="w-4 h-4 text-violet-500 dark:text-violet-400 shrink-0" />
            <span className="text-ink-primary">
              Producto destacado por <span className="text-violet-500 dark:text-violet-400 font-semibold">Inteligencia IA</span> — anomalía detectada
            </span>
          </div>
          <button
            onClick={clearHighlight}
            className="p-1 rounded-md text-violet-500 dark:text-violet-400 hover:bg-violet-500/10 transition-all"
            title="Cerrar destacado"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      {/* Success / Error */}
      {successMsg && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-green-500/10 border border-green-500/20 text-sm text-green-600 dark:text-green-400">
          <CheckCircle2 className="w-4 h-4 shrink-0" />{successMsg}
        </div>
      )}
      {error && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-600 dark:text-red-400">
          <AlertCircle className="w-4 h-4 shrink-0" />{error}
        </div>
      )}
      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-ghost pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar por nombre o código..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="field pl-10"
          />
        </div>
        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
          className="field w-auto"
        >
          <option value="">Todos</option>
          <option value="PRODUCT">Productos</option>
          <option value="SERVICE">Servicios</option>
        </select>
      </div>
      {/* Table */}
      <div className="card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-edge-subtle">
              {['Código', 'Nombre', 'Tipo', 'Precio', 'Unidad', ''].map(h => (
                <th key={h} className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-ink-tertiary">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i} className="border-b border-edge-subtle">
                  {Array.from({ length: 6 }).map((_, j) => (
                    <td key={j} className="px-4 py-3.5">
                      <div className="h-4 bg-edge-subtle rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : products.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-16 text-center">
                  <Package className="w-10 h-10 text-ink-ghost mx-auto mb-3" />
                  <p className="text-sm text-ink-tertiary">No hay productos registrados</p>
                  <button onClick={openCreate} className="mt-3 text-sm text-blue hover:underline">
                    Crear primer producto
                  </button>
                </td>
              </tr>
            ) : (
              products.map(p => {
                const isHighlighted = p.id === highlightId
                return (
                  <tr
                    key={p.id}
                    ref={isHighlighted ? highlightedRowRef : null}
                    className={`border-b transition-all duration-500 ${
                      isHighlighted && highlightActive
                        ? 'bg-violet-500/15 border-violet-500/40 shadow-[inset_4px_0_0_0_rgb(139_92_246)] animate-pulse'
                        : isHighlighted
                          ? 'bg-violet-500/5 border-violet-500/20 shadow-[inset_3px_0_0_0_rgb(139_92_246/0.5)]'
                          : 'border-edge-subtle hover:bg-edge-subtle'
                    }`}
                  >
                    <td className="px-4 py-3.5">
                      <span className="font-mono text-sm font-semibold text-ink-primary">{p.code}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="text-sm font-medium text-ink-primary flex items-center gap-2">
                        {p.name}
                        {isHighlighted && (
                          <Sparkles className="w-3 h-3 text-violet-500 dark:text-violet-400 shrink-0" />
                        )}
                      </div>
                      {p.description && <div className="text-[11px] text-ink-tertiary mt-0.5">{p.description}</div>}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                        p.type === 'PRODUCT'
                          ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                          : 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20'
                      }`}>
                        {p.type === 'PRODUCT' ? 'Producto' : 'Servicio'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-sm font-bold text-ink-primary">{fmtMoney(p.price)}</span>
                      {p.cost_price && (
                        <div className="text-[11px] text-ink-tertiary mt-0.5">Costo: {fmtMoney(p.cost_price)}</div>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-sm text-ink-secondary">{p.unit || '—'}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => openEdit(p)}
                          className="p-1.5 rounded-lg text-ink-tertiary hover:text-blue hover:bg-blue-muted transition-all"
                          title="Editar"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(p.id)}
                          className="p-1.5 rounded-lg text-ink-tertiary hover:text-red-500 dark:hover:text-red-400 hover:bg-red-500/10 transition-all"
                          title="Desactivar"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="card-raised w-full max-w-lg mx-4 p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-bold text-ink-primary">
                {editing ? 'Editar producto' : 'Nuevo producto / servicio'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-ink-tertiary hover:text-ink-primary transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            {/* Error del formulario (validación o respuesta del servidor) */}
            {formError && (
              <div className="flex items-center gap-2 px-4 py-3 mb-4 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-600 dark:text-red-400">
                <AlertCircle className="w-4 h-4 shrink-0" />{formError}
              </div>
            )}
            <div className="space-y-4">
              {/* Tipo */}
              <div className="flex gap-3">
                {(['PRODUCT', 'SERVICE'] as const).map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setType(t)}
                    className={`flex-1 py-2.5 rounded-lg border text-sm font-semibold transition-all ${
                      form.type === t
                        ? 'border-blue bg-blue-muted text-blue'
                        : 'border-edge text-ink-tertiary hover:border-edge-strong'
                    }`}
                  >
                    {t === 'PRODUCT' ? '📦 Producto' : '⚙️ Servicio'}
                  </button>
                ))}
              </div>
              {/* Código + Unidad. La unidad (dropdown) solo aplica a productos. */}
              <div className={form.type === 'PRODUCT' ? 'grid grid-cols-2 gap-3' : ''}>
                <div>
                  <label className="block text-xs font-medium text-ink-secondary mb-1.5">Código *</label>
                  <input
                    value={form.code}
                    onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase().slice(0, MAX_CODE_LENGTH) }))}
                    placeholder="PROD-001"
                    maxLength={MAX_CODE_LENGTH}
                    disabled={!!editing}
                    className="field font-mono"
                  />
                </div>
                {form.type === 'PRODUCT' && (
                  <div>
                    <label className="block text-xs font-medium text-ink-secondary mb-1.5">Unidad</label>
                    <select
                      value={form.unit}
                      onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}
                      className="field"
                    >
                      <option value="">Selecciona una unidad</option>
                      {UNIT_OPTIONS.map(u => (
                        <option key={u} value={u}>{u}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-ink-secondary mb-1.5">Nombre *</label>
                <input
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Nombre del producto o servicio"
                  className="field"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-ink-secondary mb-1.5">Descripción</label>
                <input
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Opcional"
                  className="field"
                />
              </div>
              {/* Categoría contable (opcional). Combobox con búsqueda por código o
                  nombre, filtrado según el tipo: PRODUCT -> INVENTORY, SERVICE -> SERVICE. */}
              <div>
                <label className="block text-xs font-medium text-ink-secondary mb-1.5">Categoría</label>
                <CategorySelect
                  categories={compatibleCategories}
                  value={form.category_id}
                  onChange={id => setForm(f => ({ ...f, category_id: id }))}
                />
                <p className="text-[10px] text-ink-ghost mt-1">
                  {form.type === 'PRODUCT'
                    ? 'Solo categorías de inventario'
                    : 'Solo categorías de servicios'}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-ink-secondary mb-1.5">Precio de venta *</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={form.price}
                    onChange={e => setPrice('price', e.target.value)}
                    placeholder="0.00"
                    className="field"
                  />
                  <p className="text-[10px] text-ink-ghost mt-1">Máx. {MAX_INTEGER_DIGITS} cifras</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-ink-secondary mb-1.5">Precio de costo</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={form.cost_price}
                    onChange={e => setPrice('cost_price', e.target.value)}
                    placeholder="0.00"
                    className="field"
                  />
                  <p className="text-[10px] text-ink-ghost mt-1">Máx. {MAX_INTEGER_DIGITS} cifras</p>
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="btn btn-secondary flex-1 h-[42px]"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                disabled={saving || !form.code || !form.name || !form.price}
                className="btn btn-primary flex-1 h-[42px]"
              >
                {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                {editing ? 'Guardar cambios' : 'Crear'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
   </DashboardLayout>
  )
}
/**
 * Componente exportado por defecto: envuelve el componente interno en Suspense.
 * Esto es REQUERIDO por Next.js 14 cuando se usa useSearchParams() en una página
 * que se pre-renderiza estáticamente (SSG).
 */
export default function ProductsPage() {
  return (
    <Suspense fallback={<ProductsLoading />}>
      <ProductsPageInner />
    </Suspense>
  )
}
