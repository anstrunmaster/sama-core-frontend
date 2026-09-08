'use client'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Plus, Trash2, RefreshCw } from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://d16rb4jhhui7p6.cloudfront.net/api/v1'
function num(v: any): number {
  if (typeof v === 'number') return v
  if (typeof v === 'string') return parseFloat(v)
  if (typeof v?.toNumber === 'function') return v.toNumber()
  return 0
}

interface Department { id: string; name: string }
interface Position {
  id: string
  code: string
  name: string
  salary_min: string | number | null
  salary_max: string | number | null
  department?: { id: string; name: string; code: string } | null
  _count?: { employees: number }
}

export default function CargosPage() {
  const router = useRouter()
  const [positions, setPositions] = useState<Position[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({ code: '', name: '', department_id: '', salary_min: '', salary_max: '' })

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [posRes, depRes] = await Promise.all([
        fetch(`${API_URL}/rrhh/positions`, { credentials: 'include' }),
        fetch(`${API_URL}/rrhh/departments`, { credentials: 'include' }),
      ])
      const posData = await posRes.json()
      const depData = await depRes.json()
      const posPayload = posData.data ?? posData
      const depPayload = depData.data ?? depData
      setPositions(Array.isArray(posPayload) ? posPayload : [])
      setDepartments(Array.isArray(depPayload) ? depPayload : [])
    } catch {
      setError('Error al cargar cargos')
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
        ...(form.department_id && { department_id: form.department_id }),
        ...(form.salary_min && { salary_min: Number(form.salary_min) }),
        ...(form.salary_max && { salary_max: Number(form.salary_max) }),
      }
      const res = await fetch(`${API_URL}/rrhh/positions`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) {
        const msg = Array.isArray(data.message) ? data.message[0] : data.message
        setError(msg || 'No se pudo crear el cargo')
        return
      }
      setForm({ code: '', name: '', department_id: '', salary_min: '', salary_max: '' })
      setShowForm(false)
      fetchData()
    } catch {
      setError('Error de conexión')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar este cargo?')) return
    try {
      const res = await fetch(`${API_URL}/rrhh/positions/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      const data = await res.json()
      if (!res.ok) {
        const msg = Array.isArray(data.message) ? data.message[0] : data.message
        alert(msg || 'No se pudo eliminar')
        return
      }
      fetchData()
    } catch {
      alert('Error de conexión')
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
              <h1 className="text-lg font-bold text-ink-primary">Cargos</h1>
              <p className="text-sm text-ink-tertiary mt-0.5">Catálogo de cargos y bandas salariales referenciales</p>
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
              <Plus className="w-3.5 h-3.5" /> Nuevo cargo
            </button>
          </div>
        </div>

        {error && (
          <div className="px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-600 dark:text-red-400">{error}</div>
        )}

        {showForm && (
          <div className="card p-5 space-y-4">
            <h2 className="font-semibold text-ink-primary">Nuevo cargo</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm text-ink-secondary mb-1.5">Código *</label>
                <input className="field" value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="DEV-SR" />
              </div>
              <div>
                <label className="block text-sm text-ink-secondary mb-1.5">Nombre *</label>
                <input className="field" value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Desarrollador Senior" />
              </div>
              <div>
                <label className="block text-sm text-ink-secondary mb-1.5">Departamento</label>
                <select className="field" value={form.department_id}
                  onChange={(e) => setForm({ ...form, department_id: e.target.value })}>
                  <option value="">Sin departamento</option>
                  {departments.map((d) => (<option key={d.id} value={d.id}>{d.name}</option>))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-ink-secondary mb-1.5">Salario mín.</label>
                  <input className="field" type="number" value={form.salary_min}
                    onChange={(e) => setForm({ ...form, salary_min: e.target.value })} placeholder="1200" />
                </div>
                <div>
                  <label className="block text-sm text-ink-secondary mb-1.5">Salario máx.</label>
                  <input className="field" type="number" value={form.salary_max}
                    onChange={(e) => setForm({ ...form, salary_max: e.target.value })} placeholder="2500" />
                </div>
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

        {/* Tabla */}
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-surface-raised">
                <tr className="border-b border-edge-subtle">
                  {['Código', 'Cargo', 'Departamento', 'Banda salarial', 'Empleados', ''].map((h, i) => (
                    <th key={i} className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-ink-tertiary">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} className="px-4 py-16 text-center text-sm text-ink-tertiary">Cargando...</td></tr>
                ) : positions.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-16 text-center text-sm text-ink-tertiary">Aún no hay cargos registrados.</td></tr>
                ) : positions.map((p) => (
                  <tr key={p.id} className="border-b border-edge-subtle hover:bg-edge-subtle transition-colors">
                    <td className="px-4 py-3.5 font-mono text-sm text-ink-secondary">{p.code}</td>
                    <td className="px-4 py-3.5 text-sm font-medium text-ink-primary">{p.name}</td>
                    <td className="px-4 py-3.5 text-sm text-ink-secondary">{p.department?.name ?? '—'}</td>
                    <td className="px-4 py-3.5 text-sm text-ink-secondary">
                      {p.salary_min || p.salary_max
                        ? `$${num(p.salary_min).toFixed(2)} – $${num(p.salary_max).toFixed(2)}`
                        : '—'}
                    </td>
                    <td className="px-4 py-3.5 text-sm text-ink-secondary">{p._count?.employees ?? 0}</td>
                    <td className="px-4 py-3.5 text-right">
                      <button onClick={() => handleDelete(p.id)} title="Eliminar"
                        className="p-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 hover:bg-red-500/20 transition-all">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
