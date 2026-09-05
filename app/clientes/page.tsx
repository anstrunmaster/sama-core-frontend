'use client'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { useState, useEffect, useCallback } from 'react'
import {
  Users, Search, Plus, Pencil, Trash2, X, Save,
  ChevronLeft, ChevronRight, RefreshCw, AlertTriangle, CheckCircle2
} from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://d16rb4jhhui7p6.cloudfront.net/api/v1'

interface Customer {
  id: string
  identification_type: string
  identification: string
  name: string
  email?: string
  phone?: string
  address?: string
  status: string
  created_at: string
  createdAt?: string
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

const ID_TYPE_LABEL: Record<string, string> = {
  '04': 'RUC',
  '05': 'Cédula',
  '07': 'Consumidor Final',
}

function getToken(): string {
  return localStorage.getItem('_at') || localStorage.getItem('accessToken') || ''
}

function fmtDate(d?: string) {
  if (!d) return '—'
  try {
    return new Date(d).toLocaleDateString('es-EC', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    })
  } catch { return '—' }
}

export default function ClientesPage() {
  const [customers, setCustomers]     = useState<Customer[]>([])
  const [pagination, setPagination]   = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 0 })
  const [loading, setLoading]         = useState(true)
  const [search, setSearch]           = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [error, setError]             = useState('')
  const [successMsg, setSuccessMsg]   = useState('')
  const [personType, setPersonType]   = useState<'natural' | 'juridica'>('natural')

  const [form, setForm] = useState({
    identification_type: '05',
    identification: '',
    firstName: '',
    lastName: '',
    businessName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    accounting_account_id: '',
    addresses: [] as Array<{ label: string; address: string; is_default?: boolean }>,
  })

  const [modal, setModal]     = useState<'create' | 'edit' | null>(null)
  const [editId, setEditId]   = useState<string | null>(null)
  const [saving, setSaving]   = useState(false)
  const [formError, setFormError] = useState('')
  const [accountingAccounts, setAccountingAccounts] = useState<{ id: string; code: string; name: string }[]>([])
  const [defaultReceivableId, setDefaultReceivableId] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null)
  const [deleting, setDeleting]         = useState(false)

  const fetchCustomers = useCallback(async (page = 1, q = search) => {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20', ...(q ? { search: q } : {}) })
      const res = await fetch(`${API_URL}/customers?${params}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      })
      const data = await res.json()
      const payload = data.data ?? data
      setCustomers(Array.isArray(payload.data) ? payload.data : payload.customers || payload.items || [])
      setPagination(payload.pagination ?? { page, limit: 20, total: payload.total || 0, totalPages: Math.ceil((payload.total || 0) / 20) })
    } catch {
      setError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }, [search])

  useEffect(() => { fetchCustomers(1) }, [fetchCustomers])

  useEffect(() => {
    fetch(`${API_URL}/accounting/accounts?only_movement=true&account_type=ASSET`, {
      headers: { Authorization: `Bearer ${getToken()}` }
    })
      .then(r => r.json())
      .then(d => setAccountingAccounts(Array.isArray(d.data) ? d.data : []))
      .catch(() => setAccountingAccounts([]))

    fetch(`${API_URL}/accounting/mappings`, {
      headers: { Authorization: `Bearer ${getToken()}` }
    })
      .then(r => r.json())
      .then(d => {
        const mappings = d.data ?? d
        const receivable = Array.isArray(mappings) ? mappings.find((m: any) => m.key === 'RECEIVABLE') : null
        if (receivable?.account_id) setDefaultReceivableId(receivable.account_id)
      })
      .catch(() => {})
  }, [])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setSearch(searchInput)
    fetchCustomers(1, searchInput)
  }

  const clearSearch = () => {
    setSearch(''); setSearchInput('')
    fetchCustomers(1, '')
  }

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg)
    setTimeout(() => setSuccessMsg(''), 4000)
  }

  const resetForm = () => {
    setPersonType('natural')
    setForm({
      identification_type: '05', identification: '', firstName: '', lastName: '',
      businessName: '', email: '', phone: '', address: '', city: '',
      accounting_account_id: '',
      addresses: [] as Array<{ label: string; address: string; is_default?: boolean }>
    })
    setFormError('')
  }

  const openCreate = () => {
    resetForm()
    setEditId(null)
    setForm(f => ({ ...f, accounting_account_id: defaultReceivableId }))
    setModal('create')
  }

  const openEdit = (c: Customer) => {
    const isJuridica = c.identification_type === '04'
    setPersonType(isJuridica ? 'juridica' : 'natural')
    const parts = c.name.trim().split(' ')
    setForm({
      identification_type: c.identification_type,
      identification: c.identification,
      firstName:    isJuridica ? '' : parts.slice(0, Math.ceil(parts.length / 2)).join(' '),
      lastName:     isJuridica ? '' : parts.slice(Math.ceil(parts.length / 2)).join(' '),
      businessName: isJuridica ? c.name : '',
      email:   c.email   || '',
      phone:   c.phone   || '',
      address: c.address || '',
      city:    (c as any).city || '',
      addresses: (c as any).addresses ?? [],
      accounting_account_id: (c as any).accounting_account_id ?? defaultReceivableId,
    })
    setEditId(c.id)
    setFormError('')
    setModal('edit')
  }

  const validateId = (id: string, type: string): string | null => {
    if (!id) return 'La identificación es obligatoria'
    if (type === '05' && id.length !== 10) return 'La cédula debe tener exactamente 10 dígitos'
    if (type === '04' && id.length !== 13) return 'El RUC debe tener exactamente 13 dígitos'
    return null
  }

  const saveCustomer = async () => {
    setFormError('')
    const name = personType === 'juridica'
      ? form.businessName.trim()
      : `${form.firstName.trim()} ${form.lastName.trim()}`.trim()
    if (!name) {
      setFormError(personType === 'juridica' ? 'La razón social es obligatoria' : 'Nombre y apellido son obligatorios')
      return
    }
    if (modal === 'create') {
      const idError = validateId(form.identification, form.identification_type)
      if (idError) { setFormError(idError); return }
      try {
        const checkRes = await fetch(
          `${API_URL}/customers/identification?identification=${form.identification}`,
          { headers: { Authorization: `Bearer ${getToken()}` } }
        )
        const checkData = await checkRes.json()
        const checkPayload = checkData.data ?? checkData
        if (checkPayload.success && checkPayload.data) {
          setFormError(`Ya existe un cliente con esta identificación: ${checkPayload.data.name}`)
          return
        }
      } catch {}
    }
    setSaving(true)
    try {
      const url    = modal === 'create' ? `${API_URL}/customers` : `${API_URL}/customers/${editId}`
      const method = modal === 'create' ? 'POST' : 'PUT'
      const body = modal === 'create'
        ? {
            identificationType: form.identification_type,
            identification: form.identification,
            name,
            email: form.email || undefined,
            phone: form.phone || undefined,
            address: form.address || undefined,
            city: form.city || undefined,
            accounting_account_id: form.accounting_account_id || undefined,
            addresses: form.addresses?.length > 0 ? form.addresses : undefined,
          }
        : {
            name,
            email: form.email || undefined,
            phone: form.phone || undefined,
            address: form.address || undefined,
            city: form.city || undefined,
            accounting_account_id: form.accounting_account_id || undefined,
            addresses: form.addresses?.length > 0 ? form.addresses : undefined,
          }
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      const payload = data.data ?? data
      if (!res.ok) throw new Error(Array.isArray(payload.message) ? payload.message[0] : payload.message || payload.error || 'Error')
      setModal(null)
      showSuccess(modal === 'create' ? 'Cliente creado exitosamente' : 'Cliente actualizado exitosamente')
      fetchCustomers(pagination.page)
    } catch (e: any) {
      setFormError(e.message || 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const deleteCustomer = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await fetch(`${API_URL}/customers/${deleteTarget.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${getToken()}` },
      })
      if (!res.ok) throw new Error('Error al eliminar')
      setDeleteTarget(null)
      showSuccess('Cliente eliminado')
      fetchCustomers(pagination.page)
    } catch {
      setError('Error al eliminar el cliente')
      setDeleteTarget(null)
    } finally {
      setDeleting(false)
    }
  }

  const isConsumidorFinal = (c: Customer) => c.identification === '9999999999999'
  const inputClass = "field"
  const labelClass = "block text-xs font-semibold uppercase tracking-wider text-ink-tertiary mb-2"

  return (
    <DashboardLayout>
      <div className="p-6 space-y-5">
        {successMsg && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-green-500/10 border border-green-500/20 text-sm text-green-600 dark:text-green-400 animate-fade-up">
            <CheckCircle2 className="w-4 h-4 shrink-0" />{successMsg}
          </div>
        )}
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-ink-primary">Clientes</h1>
            <p className="text-sm text-ink-tertiary mt-0.5">{pagination.total} cliente{pagination.total !== 1 ? 's' : ''} registrados</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => fetchCustomers(pagination.page)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-edge-subtle border border-edge text-sm text-ink-secondary hover:text-ink-primary hover:border-edge-strong transition-all">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Actualizar
            </button>
            <button onClick={openCreate}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue text-sm font-semibold text-white hover:bg-blue-hover transition-all">
              <Plus className="w-3.5 h-3.5" /> Nuevo Cliente
            </button>
          </div>
        </div>
        {/* Search */}
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-ghost pointer-events-none" />
            <input type="text" placeholder="Buscar por nombre, RUC, cédula o email..."
              value={searchInput} onChange={e => setSearchInput(e.target.value)}
              className="field pl-10" />
          </div>
          <button type="submit" className="px-4 py-2 rounded-lg bg-edge-subtle border border-edge text-sm text-ink-secondary hover:text-ink-primary hover:border-edge-strong transition-all">Buscar</button>
          {search && (
            <button type="button" onClick={clearSearch} className="px-3 py-2 rounded-lg bg-edge-subtle border border-edge text-sm text-ink-secondary hover:text-ink-primary transition-all">
              <X className="w-4 h-4" />
            </button>
          )}
        </form>
        {error && <div className="px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-600 dark:text-red-400">{error}</div>}
        {/* Table */}
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-edge-subtle">
                  {['Tipo', 'Identificación', 'Nombre / Razón Social', 'Email', 'Teléfono', 'Dirección', 'Registrado', 'Acciones'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-ink-tertiary">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i} className="border-b border-edge-subtle">
                      {Array.from({ length: 7 }).map((_, j) => (
                        <td key={j} className="px-4 py-3.5"><div className="h-4 bg-edge-subtle rounded animate-pulse" style={{ width: `${50 + j * 8}%` }} /></td>
                      ))}
                    </tr>
                  ))
                ) : customers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-16 text-center">
                      <Users className="w-10 h-10 text-ink-ghost mx-auto mb-3" />
                      <p className="text-sm text-ink-tertiary">{search ? `No se encontraron clientes para "${search}"` : 'No hay clientes registrados'}</p>
                    </td>
                  </tr>
                ) : customers.map(c => (
                  <tr key={c.id} className="border-b border-edge-subtle hover:bg-edge-subtle transition-colors" style={{ opacity: isConsumidorFinal(c) ? 0.45 : 1 }}>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        c.identification_type === '04'
                          ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                          : c.identification_type === '05'
                            ? 'bg-blue-muted text-blue border border-blue/20'
                            : 'bg-edge-subtle text-ink-tertiary border border-edge-subtle'
                      }`}>
                        {ID_TYPE_LABEL[c.identification_type] || c.identification_type}
                      </span>
                    </td>
                    <td className="px-4 py-3.5"><span className="font-mono text-sm text-ink-secondary">{c.identification}</span></td>
                    <td className="px-4 py-3.5"><span className="text-sm font-medium text-ink-primary">{c.name}</span></td>
                    <td className="px-4 py-3.5"><span className="text-sm text-ink-tertiary">{c.email || '—'}</span></td>
                    <td className="px-4 py-3.5"><span className="text-sm text-ink-tertiary">{c.phone || '—'}</span></td>
                    <td className="px-4 py-3.5"><span className="text-sm text-ink-tertiary">{c.address || '—'}</span></td>
                    <td className="px-4 py-3.5"><span className="text-sm text-ink-tertiary">{fmtDate(c.created_at || c.createdAt)}</span></td>
                    <td className="px-4 py-3.5">
                      {!isConsumidorFinal(c) && (
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => openEdit(c)} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-muted border border-blue/20 text-blue text-xs font-medium hover:bg-blue/20 transition-all">
                            <Pencil className="w-3 h-3" /> Editar
                          </button>
                          <button onClick={() => setDeleteTarget(c)} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-medium hover:bg-red-500/20 transition-all">
                            <Trash2 className="w-3 h-3" /> Eliminar
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-edge-subtle">
              <span className="text-xs text-ink-tertiary">Página {pagination.page} de {pagination.totalPages} · {pagination.total} registros</span>
              <div className="flex items-center gap-2">
                <button onClick={() => fetchCustomers(pagination.page - 1)} disabled={pagination.page <= 1 || loading}
                  className="p-1.5 rounded-lg border border-edge text-ink-tertiary hover:text-ink-primary disabled:opacity-30 transition-all">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button onClick={() => fetchCustomers(pagination.page + 1)} disabled={pagination.page >= pagination.totalPages || loading}
                  className="p-1.5 rounded-lg border border-edge text-ink-tertiary hover:text-ink-primary disabled:opacity-30 transition-all">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Modal Crear / Editar ─────────────────────────────────────────── */}
      {modal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="card-raised w-full max-w-md mx-4 p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-base font-bold text-ink-primary">{modal === 'create' ? 'Nuevo Cliente' : 'Editar Cliente'}</h3>
              <button onClick={() => setModal(null)} className="text-ink-tertiary hover:text-ink-primary transition-colors"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-4">
              {/* Tipo de persona */}
              <div>
                <label className={labelClass}>Tipo de persona</label>
                <div className="grid grid-cols-2 gap-2">
                  {[{ value: 'natural', label: 'Persona Natural' }, { value: 'juridica', label: 'Persona Jurídica' }].map(o => (
                    <button key={o.value}
                      onClick={() => { setPersonType(o.value as any); setForm(f => ({ ...f, identification_type: o.value === 'juridica' ? '04' : '05' })) }}
                      className={`py-2.5 rounded-lg text-xs font-medium transition-all border ${
                        personType === o.value
                          ? 'bg-blue-muted border-blue/30 text-blue'
                          : 'bg-edge-subtle border-edge text-ink-tertiary hover:text-ink-primary'
                      }`}>
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>
              {/* Identificación — solo crear */}
              {modal === 'create' && (
                <div>
                  <label className={labelClass}>{personType === 'juridica' ? 'RUC (13 dígitos) *' : 'Cédula (10 dígitos) *'}</label>
                  <input
                    value={form.identification}
                    onChange={e => setForm(f => ({ ...f, identification: e.target.value.replace(/\D/g, '').slice(0, 13) }))}
                    placeholder={personType === 'juridica' ? '0000000000001' : '0000000000'}
                    className={`field font-mono ${
                      form.identification.length > 0 &&
                      ((personType === 'natural' && form.identification.length !== 10) ||
                       (personType === 'juridica' && form.identification.length !== 13))
                        ? 'field-error' : ''
                    }`}
                  />
                  {form.identification.length > 0 && personType === 'natural' && form.identification.length !== 10 && (
                    <p className="text-[11px] text-red-600 dark:text-red-400 mt-1">{form.identification.length}/10 dígitos</p>
                  )}
                  {form.identification.length > 0 && personType === 'juridica' && form.identification.length !== 13 && (
                    <p className="text-[11px] text-red-600 dark:text-red-400 mt-1">{form.identification.length}/13 dígitos</p>
                  )}
                </div>
              )}
              {/* Nombres */}
              {personType === 'natural' ? (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Nombres *</label>
                    <input value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} placeholder="Juan Carlos" className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Apellidos *</label>
                    <input value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} placeholder="Pérez García" className={inputClass} />
                  </div>
                </div>
              ) : (
                <div>
                  <label className={labelClass}>Razón Social *</label>
                  <input value={form.businessName} onChange={e => setForm(f => ({ ...f, businessName: e.target.value }))} placeholder="Empresa S.A." className={inputClass} />
                </div>
              )}
              {/* Email */}
              <div>
                <label className={labelClass}>Email</label>
                <input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} type="email" placeholder="cliente@email.com" className={inputClass} />
              </div>
              {/* Teléfono */}
              <div>
                <label className={labelClass}>Teléfono</label>
                <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="0999999999" className={inputClass} />
              </div>
              {/* Dirección y Ciudad */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Dirección</label>
                  <input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Av. Principal 123" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Ciudad</label>
                  <input value={form.city ?? ''} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} placeholder="Guayaquil" className={inputClass} />
                </div>
              </div>
              {/* Sucursales — solo persona jurídica */}
              {personType === 'juridica' && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className={labelClass}>Sucursales (opcional)</label>
                    <button
                      type="button"
                      onClick={() => setForm(f => ({
                        ...f,
                        addresses: [...(f.addresses ?? []), { label: '', address: '', is_default: false }]
                      }))}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg bg-edge-subtle border border-edge text-xs text-ink-secondary hover:text-ink-primary transition-all"
                    >
                      <Plus className="w-3 h-3" /> Agregar sucursal
                    </button>
                  </div>
                  {(form.addresses ?? []).length === 0 ? (
                    <p className="text-[11px] text-ink-ghost italic">Sin sucursales registradas</p>
                  ) : (
                    <div className="space-y-2">
                      {(form.addresses ?? []).map((s, idx) => (
                        <div key={idx} className="flex items-start gap-2 p-3 rounded-lg bg-edge-subtle border border-edge">
                          <div className="flex-1 space-y-2">
                            <input
                              value={s.label}
                              onChange={e => setForm(f => ({
                                ...f,
                                addresses: (f.addresses ?? []).map((a, i) => i === idx ? { ...a, label: e.target.value } : a)
                              }))}
                              placeholder="Ej: Sucursal Quito"
                              className={inputClass + ' text-xs'}
                            />
                            <input
                              value={s.address}
                              onChange={e => setForm(f => ({
                                ...f,
                                addresses: (f.addresses ?? []).map((a, i) => i === idx ? { ...a, address: e.target.value } : a)
                              }))}
                              placeholder="Dirección de la sucursal"
                              className={inputClass + ' text-xs'}
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => setForm(f => ({
                              ...f,
                              addresses: (f.addresses ?? []).filter((_, i) => i !== idx)
                            }))}
                            className="p-1.5 rounded text-ink-ghost hover:text-red-500 hover:bg-red-500/10 transition-all mt-0.5"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {/* Cuenta contable */}
              <div>
                <label className={labelClass}>Cuenta contable asociada</label>
                <select
                  value={form.accounting_account_id}
                  onChange={e => setForm(f => ({ ...f, accounting_account_id: e.target.value }))}
                  className="field"
                >
                  <option value="">Sin cuenta asociada</option>
                  {accountingAccounts.map(a => (
                    <option key={a.id} value={a.id}>{a.code} — {a.name}</option>
                  ))}
                </select>
                <p className="text-[10px] text-ink-ghost mt-1">Por defecto: cuenta de clientes del mapeo contable</p>
              </div>
              {formError && (
                <div className="px-3 py-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-600 dark:text-red-400">{formError}</div>
              )}
              <div className="flex gap-3 pt-2">
                <button onClick={() => setModal(null)} className="flex-1 py-2.5 rounded-lg border border-edge text-sm text-ink-secondary hover:text-ink-primary hover:border-edge-strong transition-all">Cancelar</button>
                <button onClick={saveCustomer} disabled={saving}
                  className="flex-1 py-2.5 rounded-lg bg-blue text-sm font-semibold text-white hover:bg-blue-hover disabled:opacity-50 transition-all flex items-center justify-center gap-2">
                  {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <><Save className="w-3.5 h-3.5" />{modal === 'create' ? 'Guardar' : 'Actualizar'}</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Eliminar ───────────────────────────────────────────────── */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="card-raised w-full max-w-md mx-4 p-6 shadow-2xl">
            <div className="flex items-start gap-4 mb-5">
              <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-ink-primary">Eliminar cliente</h3>
                <p className="text-sm text-ink-tertiary mt-1">Esta acción no se puede deshacer.</p>
              </div>
            </div>
            <div className="bg-edge-subtle border border-edge-subtle rounded-lg p-3 mb-5 space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-ink-tertiary">Nombre</span>
                <span className="font-medium text-ink-primary">{deleteTarget.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-ink-tertiary">Identificación</span>
                <span className="font-mono text-ink-secondary">{deleteTarget.identification}</span>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 py-2.5 rounded-lg border border-edge text-sm text-ink-secondary hover:text-ink-primary hover:border-edge-strong transition-all">Cancelar</button>
              <button onClick={deleteCustomer} disabled={deleting}
                className="flex-1 py-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-sm font-semibold text-red-600 dark:text-red-400 hover:bg-red-500/20 disabled:opacity-50 transition-all">
                {deleting ? 'Eliminando...' : 'Sí, eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
