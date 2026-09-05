'use client'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Warehouse, Plus, RefreshCw, ChevronLeft,
  X, Save, Pencil, CheckCircle2
} from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://d16rb4jhhui7p6.cloudfront.net/api/v1'

interface WarehouseItem {
  id:          string
  name:        string
  code:        string
  description: string | null
  branch_id:   string
  is_active:   boolean
  created_at:  string
}

function getToken(): string {
  return localStorage.getItem('_at') || localStorage.getItem('accessToken') || ''
}

function getUser(): any {
  try {
    const s = localStorage.getItem('saas_auth')
    if (s) return JSON.parse(s).state?.user ?? {}
    return JSON.parse(localStorage.getItem('user') || '{}')
  } catch { return {} }
}

const emptyForm = { name: '', code: '', description: '' }

export default function WarehousesPage() {
  const router = useRouter()
  const [warehouses, setWarehouses] = useState<WarehouseItem[]>([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [showModal, setShowModal]   = useState(false)
  const [editing, setEditing]       = useState<WarehouseItem | null>(null)
  const [form, setForm]             = useState(emptyForm)
  const [saving, setSaving]         = useState(false)

  const user = getUser()

  const fetchWarehouses = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res  = await fetch(`${API_URL}/warehouses`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      })
      const data = await res.json()
      const payload = data.data ?? data
      setWarehouses(Array.isArray(payload) ? payload : [])
    } catch {
      setError('Error al cargar bodegas')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchWarehouses() }, [fetchWarehouses])

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg)
    setTimeout(() => setSuccessMsg(''), 4000)
  }

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm)
    setShowModal(true)
  }

  const handleSubmit = async () => {
    if (!form.name || !form.code) return
    setSaving(true)
    try {
      const res = await fetch(`${API_URL}/warehouses`, {
        method:  'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization:  `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          name:        form.name,
          code:        form.code,
          description: form.description || undefined,
          branch_id:   user.branchId,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        const msg = Array.isArray(data.message) ? data.message[0] : data.message
        setError(msg || 'Error al crear bodega')
        return
      }
      setShowModal(false)
      showSuccess('Bodega creada exitosamente')
      fetchWarehouses()
    } catch {
      setError('Error de conexión')
    } finally {
      setSaving(false)
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
              <h1 className="text-lg font-bold text-ink-primary">Bodegas</h1>
              <p className="text-sm text-ink-tertiary mt-0.5">{warehouses.length} bodega{warehouses.length !== 1 ? 's' : ''} registrada{warehouses.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchWarehouses}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-edge-subtle border border-edge text-sm text-ink-secondary hover:text-ink-primary transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={openCreate}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue hover:bg-blue-hover text-white text-sm font-semibold transition-all"
            >
              <Plus className="w-4 h-4" />
              Nueva bodega
            </button>
          </div>
        </div>

        {/* Success */}
        {successMsg && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-green-500/10 border border-green-500/20 text-sm text-green-600 dark:text-green-400">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            {successMsg}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        {/* Table */}
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-edge-subtle">
                {['Código', 'Nombre', 'Descripción', 'Estado'].map(h => (
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
                    {Array.from({ length: 4 }).map((_, j) => (
                      <td key={j} className="px-4 py-3.5">
                        <div className="h-4 bg-edge-subtle rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : warehouses.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-16 text-center">
                    <Warehouse className="w-10 h-10 text-ink-ghost mx-auto mb-3" />
                    <p className="text-sm text-ink-tertiary">No hay bodegas registradas</p>
                    <button
                      onClick={openCreate}
                      className="mt-3 text-sm text-blue hover:underline"
                    >
                      Crear primera bodega
                    </button>
                  </td>
                </tr>
              ) : (
                warehouses.map(w => (
                  <tr key={w.id} className="border-b border-edge-subtle hover:bg-edge-subtle transition-colors">
                    <td className="px-4 py-3.5">
                      <span className="font-mono text-sm font-semibold text-ink-primary">{w.code}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-sm font-medium text-ink-primary">{w.name}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-sm text-ink-tertiary">{w.description || '—'}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                        w.is_active
                          ? 'bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20'
                          : 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20'
                      }`}>
                        {w.is_active ? 'Activa' : 'Inactiva'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Modal crear bodega */}
        {showModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="card-raised w-full max-w-md mx-4 p-6 shadow-2xl">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-base font-bold text-ink-primary">Nueva bodega</h3>
                <button onClick={() => setShowModal(false)} className="text-ink-tertiary hover:text-ink-primary transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-ink-secondary mb-1.5">Nombre *</label>
                  <input
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="Bodega Principal"
                    className="field"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-ink-secondary mb-1.5">Código *</label>
                  <input
                    value={form.code}
                    onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                    placeholder="BOD-001"
                    className="field font-mono"
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
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 rounded-lg border border-edge text-sm text-ink-secondary hover:text-ink-primary transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={saving || !form.name || !form.code}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-blue hover:bg-blue-hover disabled:opacity-50 text-sm font-semibold text-white transition-all"
                >
                  {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  Crear bodega
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
