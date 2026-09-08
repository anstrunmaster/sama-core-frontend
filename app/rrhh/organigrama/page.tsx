'use client'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, Plus, ChevronRight, Users, RefreshCw } from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://d16rb4jhhui7p6.cloudfront.net/api/v1'

interface Department {
  id: string
  code: string
  name: string
  parent_id: string | null
  children?: Department[]
  _count?: { employees: number; positions: number }
}

function DeptNode({ dept, level }: { dept: Department; level: number }) {
  const [open, setOpen] = useState(true)
  const hasChildren = (dept.children?.length ?? 0) > 0

  return (
    <div>
      <div
        className="flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-edge-subtle transition-colors"
        style={{ paddingLeft: `${level * 20 + 12}px` }}
      >
        {hasChildren ? (
          <button onClick={() => setOpen((o) => !o)} className="text-ink-tertiary">
            <ChevronRight className={`w-4 h-4 transition-transform ${open ? 'rotate-90' : ''}`} />
          </button>
        ) : (
          <span className="inline-block w-4" />
        )}
        <span className="font-medium text-ink-primary">{dept.name}</span>
        <span className="font-mono text-xs text-ink-ghost">{dept.code}</span>
        {dept._count?.employees != null && (
          <span className="ml-auto flex items-center gap-1 text-xs text-ink-tertiary">
            <Users className="w-3 h-3" />
            {dept._count.employees}
          </span>
        )}
      </div>
      {open && dept.children?.map((child) => (
        <DeptNode key={child.id} dept={child} level={level + 1} />
      ))}
    </div>
  )
}

export default function OrganigramaPage() {
  const router = useRouter()
  const [tree, setTree] = useState<Department[]>([])
  const [flat, setFlat] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({ code: '', name: '', parent_id: '', cost_center: '' })

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [treeRes, flatRes] = await Promise.all([
          fetch(`${API_URL}/rrhh/departments/tree`, { credentials: 'include' }),
          fetch(`${API_URL}/rrhh/departments`, { credentials: 'include' }),
      ])
      const treeData = await treeRes.json()
      const flatData = await flatRes.json()
      const treePayload = treeData.data ?? treeData
      const flatPayload = flatData.data ?? flatData
      setTree(Array.isArray(treePayload) ? treePayload : [])
      setFlat(Array.isArray(flatPayload) ? flatPayload : [])
    } catch {
      setError('Error al cargar el organigrama')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  async function handleCreate() {
    setError('')
    if (!form.code.trim() || !form.name.trim()) {
      setError('Código y nombre son obligatorios')
      return
    }
    setSaving(true)
    try {
      const body: any = {
        code: form.code.trim(),
        name: form.name.trim(),
        ...(form.parent_id && { parent_id: form.parent_id }),
        ...(form.cost_center && { cost_center: form.cost_center }),
      }
      const res = await fetch(`${API_URL}/rrhh/departments`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) {
        const msg = Array.isArray(data.message) ? data.message[0] : data.message
        setError(msg || 'No se pudo crear el departamento')
        return
      }
      setForm({ code: '', name: '', parent_id: '', cost_center: '' })
      setShowForm(false)
      fetchData()
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
            <button onClick={() => router.back()}
              className="p-1.5 rounded-lg border border-edge text-ink-tertiary hover:text-ink-primary hover:border-edge-strong transition-all">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-lg font-bold text-ink-primary">Organigrama</h1>
              <p className="text-sm text-ink-tertiary mt-0.5">Estructura jerárquica de departamentos</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={fetchData}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-edge-subtle border border-edge text-sm text-ink-secondary hover:text-ink-primary hover:border-edge-strong transition-all">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Actualizar
            </button>
            <button onClick={() => setShowForm((s) => !s)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue text-sm font-semibold text-white hover:bg-blue/90 transition-all">
              <Plus className="w-3.5 h-3.5" /> Nuevo departamento
            </button>
          </div>
        </div>

        {error && (
          <div className="px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-600 dark:text-red-400">{error}</div>
        )}

        {showForm && (
          <div className="card p-5 space-y-4">
            <h2 className="font-semibold text-ink-primary">Nuevo departamento</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm text-ink-secondary mb-1.5">Código *</label>
                <input className="field" value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="VTAS" />
              </div>
              <div>
                <label className="block text-sm text-ink-secondary mb-1.5">Nombre *</label>
                <input className="field" value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ventas" />
              </div>
              <div>
                <label className="block text-sm text-ink-secondary mb-1.5">Departamento padre</label>
                <select className="field" value={form.parent_id}
                  onChange={(e) => setForm({ ...form, parent_id: e.target.value })}>
                  <option value="">Ninguno (raíz)</option>
                  {flat.map((d) => (<option key={d.id} value={d.id}>{d.name}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-ink-secondary mb-1.5">Centro de costo</label>
                <input className="field" value={form.cost_center}
                  onChange={(e) => setForm({ ...form, cost_center: e.target.value })} placeholder="CC-VENTAS" />
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={handleCreate} disabled={saving}
                className="px-4 py-2 rounded-lg bg-blue text-sm font-semibold text-white hover:bg-blue/90 disabled:opacity-50 transition-all">
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
              <button onClick={() => setShowForm(false)}
                className="px-4 py-2 rounded-lg bg-edge-subtle border border-edge text-sm text-ink-secondary hover:text-ink-primary transition-all">
                Cancelar
              </button>
            </div>
          </div>
        )}

        <div className="card p-4">
          {loading ? (
            <p className="py-10 text-center text-sm text-ink-tertiary">Cargando organigrama...</p>
          ) : tree.length === 0 ? (
            <p className="py-10 text-center text-sm text-ink-tertiary">
              Aún no hay departamentos. Creá el primero para armar el organigrama.
            </p>
          ) : (
            <div className="space-y-1">
              {tree.map((d) => (<DeptNode key={d.id} dept={d} level={0} />))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
