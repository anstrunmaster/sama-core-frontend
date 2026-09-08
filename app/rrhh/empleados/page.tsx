'use client'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Search, Plus, Building2, Briefcase, ChevronLeft, ChevronRight,
  RefreshCw, FileText, X, Save, CheckCircle2,
} from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://d16rb4jhhui7p6.cloudfront.net/api/v1'

type EmploymentStatus = 'ACTIVO' | 'SUSPENDIDO' | 'VACACIONES' | 'DESVINCULADO'

interface Department { id: string; code: string; name: string }
interface Position { id: string; code: string; name: string }
interface Employee {
  id: string
  employee_code: string
  first_name: string
  last_name: string
  id_number: string
  employment_status: EmploymentStatus
  department?: { id: string; name: string; code: string } | null
  position?: { id: string; name: string; code: string } | null
}

const STATUS_LABEL: Record<EmploymentStatus, string> = {
  ACTIVO: 'Activo', SUSPENDIDO: 'Suspendido', VACACIONES: 'Vacaciones', DESVINCULADO: 'Desvinculado',
}

function statusBadge(status: EmploymentStatus) {
  const map: Record<EmploymentStatus, string> = {
    ACTIVO: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20',
    SUSPENDIDO: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    VACACIONES: 'bg-blue/10 text-blue border-blue/20',
    DESVINCULADO: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${map[status]}`}>
      {STATUS_LABEL[status]}
    </span>
  )
}

const emptyForm = {
  first_name: '',
  last_name: '',
  id_number: '',
  hire_date: '',
  department_id: '',
  position_id: '',
}

export default function EmpleadosPage() {
  const router = useRouter()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [positions, setPositions] = useState<Position[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [search, setSearch] = useState('')
  const [deptFilter, setDeptFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  // Modal de alta
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [form, setForm] = useState(emptyForm)

  const fetchEmployees = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (deptFilter) params.set('department_id', deptFilter)
      if (statusFilter) params.set('employment_status', statusFilter)
      params.set('page', String(page))
      params.set('limit', '20')

      const res = await fetch(`${API_URL}/rrhh/employees?${params}`, {
        credentials: 'include',
      })
      const data = await res.json()
      const payload = data.data ?? data
      setEmployees(Array.isArray(payload.data) ? payload.data : [])
      setTotalPages(payload.pagination?.totalPages ?? 1)
      setTotal(payload.pagination?.total ?? 0)
    } catch {
      setError('Error al cargar empleados')
    } finally {
      setLoading(false)
    }
  }, [search, deptFilter, statusFilter, page])

  useEffect(() => {
    const t = setTimeout(fetchEmployees, 300)
    return () => clearTimeout(t)
  }, [fetchEmployees])

  // Cargar departamentos y cargos (para los selects del modal y el filtro)
  useEffect(() => {
    fetch(`${API_URL}/rrhh/departments`, { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => {
        const payload = d.data ?? d
        setDepartments(Array.isArray(payload) ? payload : [])
      })
      .catch(() => {})
    fetch(`${API_URL}/rrhh/positions`, { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => {
        const payload = d.data ?? d
        setPositions(Array.isArray(payload) ? payload : [])
      })
      .catch(() => {})
  }, [])

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg)
    setTimeout(() => setSuccessMsg(''), 4000)
  }

  const openCreate = () => {
    setForm(emptyForm)
    setFormError('')
    setShowModal(true)
  }

  const handleSubmit = async () => {
    setFormError('')
    if (!form.first_name.trim() || !form.last_name.trim() || !form.id_number.trim() || !form.hire_date) {
      setFormError('Nombres, apellidos, cédula y fecha de ingreso son obligatorios')
      return
    }
    setSaving(true)
    try {
      const body: any = {
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        id_number: form.id_number.trim(),
        hire_date: form.hire_date,
        ...(form.department_id && { department_id: form.department_id }),
        ...(form.position_id && { position_id: form.position_id }),
      }
      const res = await fetch(`${API_URL}/rrhh/employees`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) {
        const msg = Array.isArray(data.message) ? data.message[0] : data.message
        setFormError(msg || 'No se pudo crear el empleado')
        return
      }
      setShowModal(false)
      showSuccess('Empleado registrado exitosamente')
      fetchEmployees()
    } catch {
      setFormError('Error de conexión')
    } finally {
      setSaving(false)
    }
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-5">
        {successMsg && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-green-500/10 border border-green-500/20 text-sm text-green-600 dark:text-green-400">
            <CheckCircle2 className="w-4 h-4 shrink-0" />{successMsg}
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()}
              className="p-1.5 rounded-lg border border-edge text-ink-tertiary hover:text-ink-primary hover:border-edge-strong transition-all">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-lg font-bold text-ink-primary">Empleados</h1>
              <p className="text-sm text-ink-tertiary mt-0.5">
                {total} colaborador{total !== 1 ? 'es' : ''} registrado{total !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/rrhh/organigrama"
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-edge-subtle border border-edge text-sm text-ink-secondary hover:text-ink-primary hover:border-edge-strong transition-all">
              <Building2 className="w-3.5 h-3.5" /> Organigrama
            </Link>
            <Link href="/rrhh/cargos"
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-edge-subtle border border-edge text-sm text-ink-secondary hover:text-ink-primary hover:border-edge-strong transition-all">
              <Briefcase className="w-3.5 h-3.5" /> Cargos
            </Link>
            <button onClick={fetchEmployees}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-edge-subtle border border-edge text-sm text-ink-secondary hover:text-ink-primary hover:border-edge-strong transition-all">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={openCreate}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue text-sm font-semibold text-white hover:bg-blue/90 transition-all">
              <Plus className="w-3.5 h-3.5" /> Nuevo empleado
            </button>
          </div>
        </div>

        {error && (
          <div className="px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-600 dark:text-red-400">{error}</div>
        )}

        {/* Filtros */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-ghost pointer-events-none" />
            <input type="text" placeholder="Buscar por nombre, código o cédula..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              className="field pl-10" />
          </div>
          <select className="field md:w-56" value={deptFilter}
            onChange={(e) => { setDeptFilter(e.target.value); setPage(1) }}>
            <option value="">Todos los departamentos</option>
            {departments.map((d) => (<option key={d.id} value={d.id}>{d.name}</option>))}
          </select>
          <select className="field md:w-44" value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}>
            <option value="">Todos los estados</option>
            {Object.entries(STATUS_LABEL).map(([k, v]) => (<option key={k} value={k}>{v}</option>))}
          </select>
        </div>

        {/* Tabla */}
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-surface-raised">
                <tr className="border-b border-edge-subtle">
                  {['Código', 'Nombre', 'Cédula / Pasaporte', 'Departamento', 'Cargo', 'Estado'].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-ink-tertiary">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b border-edge-subtle">
                      {Array.from({ length: 6 }).map((_, j) => (
                        <td key={j} className="px-4 py-3.5">
                          <div className="h-4 bg-edge-subtle rounded animate-pulse" style={{ width: `${50 + j * 8}%` }} />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : employees.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-16 text-center">
                      <FileText className="w-10 h-10 text-ink-ghost mx-auto mb-3" />
                      <p className="text-sm text-ink-tertiary">
                        {search || deptFilter || statusFilter
                          ? 'No se encontraron empleados con ese filtro'
                          : 'Aún no hay empleados registrados'}
                      </p>
                      <button onClick={openCreate}
                        className="mt-4 text-sm font-medium text-blue hover:underline">
                        Registrar primer empleado →
                      </button>
                    </td>
                  </tr>
                ) : employees.map((emp) => (
                  <tr key={emp.id} className="border-b border-edge-subtle hover:bg-edge-subtle transition-colors">
                    <td className="px-4 py-3.5 font-mono text-sm font-semibold text-ink-primary">{emp.employee_code}</td>
                    <td className="px-4 py-3.5">
                      <Link href={`/rrhh/empleados/${emp.id}`} className="text-sm font-medium text-ink-primary hover:text-blue">
                        {emp.first_name} {emp.last_name}
                      </Link>
                    </td>
                    <td className="px-4 py-3.5 text-sm text-ink-secondary">{emp.id_number}</td>
                    <td className="px-4 py-3.5 text-sm text-ink-secondary">{emp.department?.name ?? '—'}</td>
                    <td className="px-4 py-3.5 text-sm text-ink-secondary">{emp.position?.name ?? '—'}</td>
                    <td className="px-4 py-3.5">{statusBadge(emp.employment_status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-edge-subtle">
              <span className="text-xs text-ink-tertiary">Página {page} de {totalPages} · {total} registros</span>
              <div className="flex items-center gap-2">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1 || loading}
                  className="p-1.5 rounded-lg border border-edge text-ink-tertiary hover:text-ink-primary disabled:opacity-30 transition-all">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages || loading}
                  className="p-1.5 rounded-lg border border-edge text-ink-tertiary hover:text-ink-primary disabled:opacity-30 transition-all">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal de alta */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => !saving && setShowModal(false)}>
          <div className="w-full max-w-lg card p-0 overflow-hidden"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-edge-subtle">
              <h2 className="text-base font-bold text-ink-primary">Nuevo empleado</h2>
              <button onClick={() => !saving && setShowModal(false)}
                className="p-1.5 rounded-lg text-ink-tertiary hover:text-ink-primary hover:bg-edge-subtle transition-all">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {formError && (
                <div className="px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-600 dark:text-red-400">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm text-ink-secondary mb-1.5">Nombres *</label>
                  <input className="field" value={form.first_name}
                    onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                    placeholder="Miguel" autoFocus />
                </div>
                <div>
                  <label className="block text-sm text-ink-secondary mb-1.5">Apellidos *</label>
                  <input className="field" value={form.last_name}
                    onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                    placeholder="Pallo Jaramillo" />
                </div>
                <div>
                  <label className="block text-sm text-ink-secondary mb-1.5">Cédula / Pasaporte *</label>
                  <input className="field" value={form.id_number}
                    onChange={(e) => setForm({ ...form, id_number: e.target.value })}
                    placeholder="1312345678" />
                </div>
                <div>
                  <label className="block text-sm text-ink-secondary mb-1.5">Fecha de ingreso *</label>
                  <input className="field" type="date" value={form.hire_date}
                    onChange={(e) => setForm({ ...form, hire_date: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm text-ink-secondary mb-1.5">Departamento</label>
                  <select className="field" value={form.department_id}
                    onChange={(e) => setForm({ ...form, department_id: e.target.value })}>
                    <option value="">Sin asignar</option>
                    {departments.map((d) => (<option key={d.id} value={d.id}>{d.name}</option>))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-ink-secondary mb-1.5">Cargo</label>
                  <select className="field" value={form.position_id}
                    onChange={(e) => setForm({ ...form, position_id: e.target.value })}>
                    <option value="">Sin asignar</option>
                    {positions.map((p) => (<option key={p.id} value={p.id}>{p.name}</option>))}
                  </select>
                </div>
              </div>

              <p className="text-xs text-ink-ghost">
                El código de empleado se genera automáticamente. El resto de la ficha
                (datos personales, bancarios y tributarios) se completa luego desde el detalle.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-edge-subtle">
              <button onClick={() => setShowModal(false)} disabled={saving}
                className="px-4 py-2 rounded-lg bg-edge-subtle border border-edge text-sm text-ink-secondary hover:text-ink-primary transition-all">
                Cancelar
              </button>
              <button onClick={handleSubmit} disabled={saving}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue text-sm font-semibold text-white hover:bg-blue/90 disabled:opacity-50 transition-all">
                {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
