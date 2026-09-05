'use client'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Tag, Plus, RefreshCw, ChevronLeft, X, Save,
  Search, CheckCircle2, Pencil, AlertCircle, Package,
  BookOpen, Settings2, ChevronDown, ChevronUp,
} from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://d16rb4jhhui7p6.cloudfront.net/api/v1'

function getToken(): string {
  if (typeof window === 'undefined') return ''
  try {
    return localStorage.getItem('_at') || localStorage.getItem('accessToken') || ''
  } catch { return '' }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`,
      ...(init?.headers ?? {}),
    },
  })
  const body = await res.json().catch(() => null)
  if (!res.ok) {
    const msg = Array.isArray(body?.message) ? body.message[0] : body?.message
    throw new Error(msg || `Error ${res.status}`)
  }
  return (body?.data ?? body) as T
}

// ─── Tipos ───────────────────────────────────────────────────────
interface AccountRef {
  id: string
  code: string
  name: string
}

interface ProductCategory {
  id: string
  code: string
  name: string
  description: string | null
  category_type: 'INVENTORY' | 'SERVICE'
  is_active: boolean
  created_at: string
  _count?: { products: number }
  // Cuentas contables
  account_inventory?:    AccountRef | null
  account_cost?:         AccountRef | null
  account_income?:       AccountRef | null
  account_adjustment?:   AccountRef | null
  account_discount?:     AccountRef | null
  account_return?:       AccountRef | null
  account_internal_use?: AccountRef | null
  account_production?:   AccountRef | null
  account_fixed_asset?:  AccountRef | null
}

interface AccountOption {
  id: string
  code: string
  name: string
}

const emptyForm = {
  code: '',
  name: '',
  description: '',
  category_type: 'INVENTORY' as 'INVENTORY' | 'SERVICE',
  account_inventory_id: '',
  account_cost_id: '',
  account_income_id: '',
  account_adjustment_id: '',
  account_discount_id: '',
  account_return_id: '',
  account_internal_use_id: '',
  account_production_id: '',
  account_fixed_asset_id: '',
}

// ─── Labels de cuentas contables ─────────────────────────────────
const ACCOUNT_FIELDS: Array<{
  key: keyof typeof emptyForm
  label: string
  help: string
  onlyInventory?: boolean
}> = [
  { key: 'account_inventory_id',    label: 'Cuenta Inventario',       help: 'Activo — 1.x',  onlyInventory: true },
  { key: 'account_cost_id',         label: 'Cuenta Costo de Venta',   help: 'Costo — 5.x',   onlyInventory: true },
  { key: 'account_income_id',       label: 'Cuenta Ingreso por Venta',help: 'Ingreso — 4.x' },
  { key: 'account_adjustment_id',   label: 'Cuenta Ajuste Inventario',help: 'Gasto — 5.x',   onlyInventory: true },
  { key: 'account_discount_id',     label: 'Cuenta Descuento Venta',  help: 'Gasto — 5.x' },
  { key: 'account_return_id',       label: 'Cuenta Devolución Venta', help: 'Gasto — 5.x' },
  { key: 'account_internal_use_id', label: 'Cuenta Consumo Interno',  help: 'Futuro — opcional', onlyInventory: true },
  { key: 'account_production_id',   label: 'Cuenta Producción',       help: 'Futuro — opcional', onlyInventory: true },
  { key: 'account_fixed_asset_id',  label: 'Cuenta Activo Fijo',      help: 'Futuro — opcional', onlyInventory: true },
]

export default function CategoriesPage() {
  const router = useRouter()
  const [categories, setCategories]   = useState<ProductCategory[]>([])
  const [accounts, setAccounts]       = useState<AccountOption[]>([])
  const [total, setTotal]             = useState(0)
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState('')
  const [successMsg, setSuccessMsg]   = useState('')
  const [search, setSearch]           = useState('')
  const [showModal, setShowModal]     = useState(false)
  const [editing, setEditing]         = useState<ProductCategory | null>(null)
  const [form, setForm]               = useState(emptyForm)
  const [formError, setFormError]     = useState('')
  const [saving, setSaving]           = useState(false)
  const [showAccounts, setShowAccounts] = useState(false)

  // ── Cargar categorías ──────────────────────────────────────────
  const fetchCategories = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await request<ProductCategory[]>(
        `/product-categories?include_inactive=true`
      )
      const list = Array.isArray(data) ? data : []
      const filtered = search
        ? list.filter(c =>
            c.name.toLowerCase().includes(search.toLowerCase()) ||
            c.code.toLowerCase().includes(search.toLowerCase())
          )
        : list
      setCategories(filtered)
      setTotal(list.length)
    } catch (e: any) {
      setError(e.message || 'Error al cargar categorías')
    } finally {
      setLoading(false)
    }
  }, [search])

  // ── Cargar cuentas contables disponibles ──────────────────────
  const fetchAccounts = useCallback(async () => {
    try {
      const data = await request<AccountOption[]>(
        `/accounting/accounts?only_movement=true`
      )
      setAccounts(Array.isArray(data) ? data : [])
    } catch {
      setAccounts([])
    }
  }, [])

  useEffect(() => {
    const t = setTimeout(fetchCategories, 300)
    return () => clearTimeout(t)
  }, [fetchCategories])

  useEffect(() => { fetchAccounts() }, [fetchAccounts])

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg)
    setTimeout(() => setSuccessMsg(''), 4000)
  }

  // ── Abrir modal crear ─────────────────────────────────────────
  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm)
    setFormError('')
    setShowAccounts(false)
    setShowModal(true)
  }

  // ── Abrir modal editar ────────────────────────────────────────
  const openEdit = (c: ProductCategory) => {
    setEditing(c)
    setForm({
      code:                    c.code,
      name:                    c.name,
      description:             c.description ?? '',
      category_type:           c.category_type,
      account_inventory_id:    c.account_inventory?.id    ?? '',
      account_cost_id:         c.account_cost?.id         ?? '',
      account_income_id:       c.account_income?.id       ?? '',
      account_adjustment_id:   c.account_adjustment?.id   ?? '',
      account_discount_id:     c.account_discount?.id     ?? '',
      account_return_id:       c.account_return?.id       ?? '',
      account_internal_use_id: c.account_internal_use?.id ?? '',
      account_production_id:   c.account_production?.id   ?? '',
      account_fixed_asset_id:  c.account_fixed_asset?.id  ?? '',
    })
    setFormError('')
    setShowAccounts(false)
    setShowModal(true)
  }

  // ── Guardar ───────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!form.code.trim() || !form.name.trim()) {
      setFormError('Código y nombre son obligatorios')
      return
    }
    setSaving(true)
    setFormError('')
    try {
      // Construir payload — solo enviar _id si tiene valor
      const accountFields: Record<string, string | undefined> = {}
      ACCOUNT_FIELDS.forEach(f => {
        const val = form[f.key] as string
        accountFields[f.key] = val || undefined
      })

      const body = editing
        ? { name: form.name, description: form.description || undefined, category_type: form.category_type, ...accountFields }
        : { code: form.code.toUpperCase(), name: form.name, description: form.description || undefined, category_type: form.category_type, ...accountFields }

      if (editing) {
        await request(`/product-categories/${editing.id}`, {
          method: 'PATCH',
          body: JSON.stringify(body),
        })
      } else {
        await request('/product-categories', {
          method: 'POST',
          body: JSON.stringify(body),
        })
      }
      setShowModal(false)
      showSuccess(editing ? 'Categoría actualizada' : 'Categoría creada exitosamente')
      fetchCategories()
    } catch (e: any) {
      setFormError(e.message || 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  // ── Activar/Desactivar ────────────────────────────────────────
  const toggleActive = async (c: ProductCategory) => {
    try {
      await request(`/product-categories/${c.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ is_active: !c.is_active }),
      })
      showSuccess(c.is_active ? 'Categoría desactivada' : 'Categoría activada')
      fetchCategories()
    } catch (e: any) {
      setError(e.message || 'Error al actualizar')
    }
  }

  // ── Contar cuentas configuradas ───────────────────────────────
  const countConfigured = (c: ProductCategory) =>
    [c.account_inventory, c.account_cost, c.account_income,
     c.account_adjustment, c.account_discount, c.account_return]
    .filter(Boolean).length
 // Agrega estado:
const [seeding, setSeeding] = useState(false)

// Agrega función:
const handleSeed = async () => {
  if (!confirm('¿Cargar las 34 categorías estándar Ecuador? Solo funciona si no hay categorías creadas.')) return
  setSeeding(true)
  try {
    const res = await request<{ created: number; skipped: boolean }>('/product-categories/seed', {
      method: 'POST',
    })
    if (res.skipped) {
      setError('Ya existen categorías — el seed solo aplica a tenants sin categorías.')
    } else {
      showSuccess(`${res.created} categorías estándar cargadas exitosamente`)
      fetchCategories()
    }
  } catch (e: any) {
    setError(e.message || 'Error al cargar categorías estándar')
  } finally {
    setSeeding(false)
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
              <h1 className="text-lg font-bold text-ink-primary">Categorías de Productos</h1>
              <p className="text-sm text-ink-tertiary mt-0.5">
                {total} categoría{total !== 1 ? 's' : ''} · Define el comportamiento contable por categoría
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
  <button
    onClick={fetchCategories}
    className="p-2 rounded-lg bg-edge-subtle border border-edge text-ink-secondary hover:text-ink-primary transition-all"
  >
    <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
  </button>
  {/* Botón seed — solo visible si no hay categorías */}
  {total === 0 && (
    <button
      onClick={handleSeed}
      disabled={seeding}
      className="flex items-center gap-2 px-4 py-2 rounded-lg border border-edge text-ink-secondary hover:text-ink-primary text-sm font-semibold transition-all"
    >
      {seeding ? <RefreshCw className="w-4 h-4 animate-spin" /> : <BookOpen className="w-4 h-4" />}
      {seeding ? 'Cargando...' : 'Cargar estándar'}
    </button>
  )}
  <button
    onClick={openCreate}
    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue hover:bg-blue-hover text-white text-sm font-semibold transition-all"
  >
    <Plus className="w-4 h-4" />
    Nueva categoría
  </button>
</div>
        </div>

        {/* Info */}
        <div className="card rounded-xl p-4 flex items-start gap-3 bg-blue-muted/30 border-blue/20">
          <BookOpen className="w-4 h-4 text-blue mt-0.5 shrink-0" />
          <div className="text-xs text-ink-secondary leading-relaxed">
            <strong className="text-ink-primary">¿Cómo funciona?</strong> Cada producto pertenece a una categoría.
            La categoría define automáticamente las cuentas contables que se afectan al comprar, vender o ajustar ese producto.
            Configurá una vez y todos los productos heredan el comportamiento.
          </div>
        </div>

        {/* Success / Error */}
        {successMsg && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-green-500/10 border border-green-500/20 text-sm text-green-600 dark:text-green-400">
            <CheckCircle2 className="w-4 h-4 shrink-0" />{successMsg}
          </div>
        )}
        {error && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-600 dark:text-red-400">
            <AlertCircle className="w-4 h-4 shrink-0" />{error}
            <button onClick={() => setError('')} className="ml-auto"><X className="w-3.5 h-3.5" /></button>
          </div>
        )}

        {/* Búsqueda */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-ghost pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar por nombre o código..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="field pl-10 w-full"
          />
        </div>

        {/* Tabla */}
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-edge-subtle">
                {['Código', 'Nombre', 'Tipo', 'Cuentas', 'Productos', 'Estado', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-ink-tertiary">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} className="border-b border-edge-subtle">
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-4 py-3.5">
                        <div className="h-4 bg-edge-subtle rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : categories.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center">
                    <Tag className="w-10 h-10 text-ink-ghost mx-auto mb-3" />
                    <p className="text-sm text-ink-tertiary">No hay categorías registradas</p>
                    <button onClick={openCreate} className="mt-3 text-sm text-blue hover:underline">
                      Crear primera categoría
                    </button>
                  </td>
                </tr>
              ) : (
                categories.map(c => {
                  const configured = countConfigured(c)
                  const total6 = 6
                  return (
                    <tr key={c.id} className={`border-b border-edge-subtle hover:bg-edge-subtle transition-colors ${!c.is_active ? 'opacity-50' : ''}`}>
                      <td className="px-4 py-3.5">
                        <span className="font-mono text-sm font-semibold text-ink-primary">{c.code}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="text-sm font-medium text-ink-primary">{c.name}</div>
                        {c.description && <div className="text-[11px] text-ink-tertiary mt-0.5">{c.description}</div>}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                          c.category_type === 'INVENTORY'
                            ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
                            : 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20'
                        }`}>
                          {c.category_type === 'INVENTORY' ? 'Inventario' : 'Servicio'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-edge-subtle rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${configured === total6 ? 'bg-emerald-500' : configured > 0 ? 'bg-amber-400' : 'bg-edge'}`}
                              style={{ width: `${(configured / total6) * 100}%` }}
                            />
                          </div>
                          <span className="text-[11px] text-ink-tertiary tabular-nums">{configured}/{total6}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1 text-xs text-ink-secondary">
                          <Package className="w-3 h-3" />
                          {c._count?.products ?? 0}
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                          c.is_active
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                            : 'bg-edge-subtle text-ink-tertiary'
                        }`}>
                          {c.is_active ? 'Activa' : 'Inactiva'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => openEdit(c)}
                            className="p-1.5 rounded-lg text-ink-tertiary hover:text-blue hover:bg-blue-muted transition-all"
                            title="Editar"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => toggleActive(c)}
                            className="p-1.5 rounded-lg text-ink-tertiary hover:text-amber-500 hover:bg-amber-500/10 transition-all"
                            title={c.is_active ? 'Desactivar' : 'Activar'}
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
      </div>

      {/* Modal crear/editar */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="card-raised w-full max-w-2xl shadow-2xl overflow-y-auto max-h-[90vh]">
            {/* Header modal */}
            <div className="flex items-center justify-between p-6 border-b border-edge-subtle">
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-blue" />
                <h3 className="text-base font-bold text-ink-primary">
                  {editing ? 'Editar categoría' : 'Nueva categoría'}
                </h3>
              </div>
              <button onClick={() => setShowModal(false)} className="text-ink-tertiary hover:text-ink-primary">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {formError && (
                <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-600 dark:text-red-400">
                  <AlertCircle className="w-4 h-4 shrink-0" />{formError}
                </div>
              )}

              {/* Tipo */}
              <div className="flex gap-3">
                {(['INVENTORY', 'SERVICE'] as const).map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, category_type: t }))}
                    className={`flex-1 py-2.5 rounded-lg border text-sm font-semibold transition-all ${
                      form.category_type === t
                        ? 'border-blue bg-blue-muted text-blue'
                        : 'border-edge text-ink-tertiary hover:border-edge-strong'
                    }`}
                  >
                    {t === 'INVENTORY' ? '📦 Inventario' : '⚙️ Servicio'}
                  </button>
                ))}
              </div>

              {/* Código + Nombre */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-ink-secondary mb-1.5">Código *</label>
                  <input
                    value={form.code}
                    onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase().slice(0, 20) }))}
                    placeholder="MERC"
                    disabled={!!editing}
                    className="field font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-ink-secondary mb-1.5">Nombre *</label>
                  <input
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="Mercaderías"
                    className="field"
                  />
                </div>
              </div>

              {/* Descripción */}
              <div>
                <label className="block text-xs font-medium text-ink-secondary mb-1.5">Descripción (opcional)</label>
                <input
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Descripción de la categoría"
                  className="field"
                />
              </div>

              {/* Configuración contable — colapsable */}
              <div className="border border-edge rounded-xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowAccounts(v => !v)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-surface-raised hover:bg-edge-subtle transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Settings2 className="w-4 h-4 text-ink-tertiary" />
                    <span className="text-sm font-semibold text-ink-primary">Comportamiento contable</span>
                    <span className="text-[11px] text-ink-tertiary">
                      ({ACCOUNT_FIELDS.filter(f =>
                        form.category_type === 'INVENTORY' || !f.onlyInventory
                      ).filter(f => (form[f.key] as string)).length} configuradas)
                    </span>
                  </div>
                  {showAccounts ? <ChevronUp className="w-4 h-4 text-ink-tertiary" /> : <ChevronDown className="w-4 h-4 text-ink-tertiary" />}
                </button>

                {showAccounts && (
                  <div className="p-4 space-y-3 border-t border-edge-subtle">
                    <p className="text-[11px] text-ink-tertiary leading-relaxed">
                      Seleccioná la cuenta contable para cada concepto. Los productos de esta categoría heredarán automáticamente estas cuentas.
                    </p>
                    {ACCOUNT_FIELDS
                      .filter(f => form.category_type === 'INVENTORY' || !f.onlyInventory)
                      .map(f => (
                        <div key={f.key}>
                          <label className="block text-xs font-medium text-ink-secondary mb-1">
                            {f.label}
                            <span className="ml-1.5 text-ink-ghost font-normal">{f.help}</span>
                          </label>
                          <select
                            value={form[f.key] as string}
                            onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                            className="field text-sm"
                          >
                            <option value="">Sin configurar</option>
                            {accounts.map(a => (
                              <option key={a.id} value={a.id}>
                                {a.code} — {a.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>

            {/* Footer modal */}
            <div className="flex gap-3 px-6 pb-6">
              <button
                onClick={() => setShowModal(false)}
                className="btn btn-secondary flex-1 h-[42px]"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                disabled={saving || !form.code.trim() || !form.name.trim()}
                className="btn btn-primary flex-1 h-[42px]"
              >
                {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                {editing ? 'Guardar cambios' : 'Crear categoría'}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
