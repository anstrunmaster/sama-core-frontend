'use client'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import {
  ChevronLeft, Pencil, Save, X, RefreshCw, CheckCircle2,
  User, Briefcase, Landmark, Receipt, Trash2,
} from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://d16rb4jhhui7p6.cloudfront.net/api/v1'

type EmploymentStatus = 'ACTIVO' | 'SUSPENDIDO' | 'VACACIONES' | 'DESVINCULADO'

interface Department { id: string; name: string; code: string }
interface Position { id: string; name: string; code: string }
interface MiniEmployee { id: string; first_name: string; last_name: string; employee_code?: string }

interface Employee {
  id: string
  employee_code: string
  employee_global_id: string
  first_name: string
  last_name: string
  id_type: 'CEDULA' | 'PASAPORTE'
  id_number: string
  birth_date: string | null
  marital_status: string | null
  gender: string | null
  nationality: string | null
  address: string | null
  phone: string | null
  email: string | null
  emergency_contact_name: string | null
  emergency_contact_phone: string | null
  branch_id: string | null
  department_id: string | null
  position_id: string | null
  supervisor_id: string | null
  cost_center: string | null
  hire_date: string
  contract_type: string
  employment_status: EmploymentStatus
  termination_date: string | null
  salary: string | null
  iess_affiliate: boolean
  iess_number: string | null
  bank_name: string | null
  bank_account_type: string | null
  bank_account_number: string | null
  tax_id: string | null
  has_withholding: boolean
  withholding_notes: string | null
  department?: Department | null
  position?: Position | null
  supervisor?: MiniEmployee | null
}

const GENDER = ['MASCULINO', 'FEMENINO', 'OTRO']
const MARITAL = ['SOLTERO', 'CASADO', 'DIVORCIADO', 'VIUDO', 'UNION_LIBRE']
const CONTRACT = ['INDEFINIDO', 'TEMPORAL', 'SERVICIOS', 'EVENTUAL']
const BANK_TYPE = ['AHORROS', 'CORRIENTE']
const STATUS = ['ACTIVO', 'SUSPENDIDO', 'VACACIONES', 'DESVINCULADO']

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
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${map[status]}`}>
      {STATUS_LABEL[status]}
    </span>
  )
}
function pretty(v: string | null | undefined) {
  if (!v) return '—'
  return v.charAt(0) + v.slice(1).toLowerCase().replace(/_/g, ' ')
}
function fmtDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

// Campo de solo lectura
function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-ink-ghost mb-0.5">{label}</div>
      <div className="text-sm text-ink-primary">{value}</div>
    </div>
  )
}

export default function EmpleadoDetallePage() {
  const router = useRouter()
  const params = useParams()
  const id = params?.id as string

  const [emp, setEmp] = useState<Employee | null>(null)
  const [departments, setDepartments] = useState<Department[]>([])
  const [positions, setPositions] = useState<Position[]>([])
  const [supervisors, setSupervisors] = useState<MiniEmployee[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  const [form, setForm] = useState<Partial<Employee>>({})

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${API_URL}/rrhh/employees/${id}`, {
        credentials: 'include',
      })
      const data = await res.json()
      if (!res.ok) {
        setError('No se pudo cargar el empleado')
        return
      }
      const payload = data.data ?? data
      setEmp(payload)
      setForm(payload)
    } catch {
      setError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { if (id) load() }, [id, load])

  useEffect(() => {
    fetch(`${API_URL}/rrhh/departments`, { credentials: 'include' })
      .then((r) => r.json()).then((d) => setDepartments(Array.isArray(d.data ?? d) ? (d.data ?? d) : [])).catch(() => {})
    fetch(`${API_URL}/rrhh/positions`, { credentials: 'include' })
      .then((r) => r.json()).then((d) => setPositions(Array.isArray(d.data ?? d) ? (d.data ?? d) : [])).catch(() => {})
    fetch(`${API_URL}/rrhh/employees?limit=100`, { credentials: 'include' })
      .then((r) => r.json()).then((d) => {
        const payload = d.data ?? d
        setSupervisors(Array.isArray(payload.data) ? payload.data : [])
      }).catch(() => {})
  }, [])

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg)
    setTimeout(() => setSuccessMsg(''), 4000)
  }

  const startEdit = () => { setForm(emp ?? {}); setEditing(true); setError('') }
  const cancelEdit = () => { setForm(emp ?? {}); setEditing(false); setError('') }

  const set = (k: keyof Employee, v: any) => setForm((f) => ({ ...f, [k]: v }))

  const handleSave = async () => {
    setError('')
    if (!form.first_name?.trim() || !form.last_name?.trim() || !form.id_number?.trim() || !form.hire_date) {
      setError('Nombres, apellidos, cédula y fecha de ingreso son obligatorios')
      return
    }
    setSaving(true)
    try {
      // Solo mandamos los campos editables (no relaciones ni códigos generados)
      const body: any = {
        first_name: form.first_name?.trim(),
        last_name: form.last_name?.trim(),
        id_type: form.id_type,
        id_number: form.id_number?.trim(),
        birth_date: form.birth_date || null,
        marital_status: form.marital_status || null,
        gender: form.gender || null,
        nationality: form.nationality || null,
        address: form.address || null,
        phone: form.phone || null,
        email: form.email || null,
        emergency_contact_name: form.emergency_contact_name || null,
        emergency_contact_phone: form.emergency_contact_phone || null,
        department_id: form.department_id || null,
        position_id: form.position_id || null,
        supervisor_id: form.supervisor_id || null,
        cost_center: form.cost_center || null,
        hire_date: form.hire_date,
        contract_type: form.contract_type,
        employment_status: form.employment_status,
        termination_date: form.termination_date || null,
        bank_name: form.bank_name || null,
        bank_account_type: form.bank_account_type || null,
        bank_account_number: form.bank_account_number || null,
        tax_id: form.tax_id || null,
        has_withholding: !!form.has_withholding,
        withholding_notes: form.withholding_notes || null,
        salary: form.salary ? parseFloat(form.salary as string) : null,
        iess_affiliate: !!form.iess_affiliate,
        iess_number: form.iess_number || null,
      }
      const res = await fetch(`${API_URL}/rrhh/employees/${id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) {
        const msg = Array.isArray(data.message) ? data.message[0] : data.message
        setError(msg || 'No se pudo guardar')
        return
      }
      setEditing(false)
      showSuccess('Ficha actualizada')
      load()
    } catch {
      setError('Error de conexión')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('¿Desvincular a este empleado? Quedará marcado como DESVINCULADO.')) return
    try {
      const res = await fetch(`${API_URL}/rrhh/employees/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (!res.ok) { alert('No se pudo desvincular'); return }
      router.push('/rrhh/empleados')
    } catch {
      alert('Error de conexión')
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-6 space-y-5">
          <div className="h-8 w-48 bg-edge-subtle rounded animate-pulse" />
          <div className="card h-64 animate-pulse" />
        </div>
      </DashboardLayout>
    )
  }

  if (!emp) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <button onClick={() => router.push('/rrhh/empleados')} className="text-sm text-blue hover:underline">
            ← Volver a empleados
          </button>
          <p className="mt-4 text-sm text-ink-tertiary">{error || 'Empleado no encontrado'}</p>
        </div>
      </DashboardLayout>
    )
  }

  // input reutilizable de edición
  const inp = (k: keyof Employee, props: any = {}) => (
    <input className="field" value={(form[k] as string) ?? ''} onChange={(e) => set(k, e.target.value)} {...props} />
  )
  const sel = (k: keyof Employee, opts: string[], placeholder = 'Sin asignar') => (
    <select className="field" value={(form[k] as string) ?? ''} onChange={(e) => set(k, e.target.value)}>
      <option value="">{placeholder}</option>
      {opts.map((o) => (<option key={o} value={o}>{pretty(o)}</option>))}
    </select>
  )

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
            <button onClick={() => router.push('/rrhh/empleados')}
              className="p-1.5 rounded-lg border border-edge text-ink-tertiary hover:text-ink-primary hover:border-edge-strong transition-all">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-ink-primary">{emp.first_name} {emp.last_name}</h1>
                {statusBadge(emp.employment_status)}
              </div>
              <p className="text-sm text-ink-tertiary mt-0.5 font-mono">{emp.employee_code}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!editing ? (
              <>
                <button onClick={handleDelete}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-sm hover:bg-red-500/20 transition-all">
                  <Trash2 className="w-3.5 h-3.5" /> Desvincular
                </button>
                <button onClick={startEdit}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue text-sm font-semibold text-white hover:bg-blue/90 transition-all">
                  <Pencil className="w-3.5 h-3.5" /> Editar
                </button>
              </>
            ) : (
              <>
                <button onClick={cancelEdit} disabled={saving}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-edge-subtle border border-edge text-sm text-ink-secondary hover:text-ink-primary transition-all">
                  <X className="w-3.5 h-3.5" /> Cancelar
                </button>
                <button onClick={handleSave} disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue text-sm font-semibold text-white hover:bg-blue/90 disabled:opacity-50 transition-all">
                  {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  {saving ? 'Guardando...' : 'Guardar'}
                </button>
              </>
            )}
          </div>
        </div>

        {error && (
          <div className="px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-600 dark:text-red-400">{error}</div>
        )}

        {/* Datos personales */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <User className="w-4 h-4 text-blue" />
            <h2 className="font-semibold text-ink-primary">Datos personales</h2>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {editing ? (
              <>
                <div><label className="block text-sm text-ink-secondary mb-1.5">Nombres *</label>{inp('first_name')}</div>
                <div><label className="block text-sm text-ink-secondary mb-1.5">Apellidos *</label>{inp('last_name')}</div>
                <div><label className="block text-sm text-ink-secondary mb-1.5">Tipo ID</label>{sel('id_type', ['CEDULA', 'PASAPORTE'], 'Cédula')}</div>
                <div><label className="block text-sm text-ink-secondary mb-1.5">Cédula / Pasaporte *</label>{inp('id_number')}</div>
                <div><label className="block text-sm text-ink-secondary mb-1.5">Fecha de nacimiento</label>{inp('birth_date', { type: 'date' })}</div>
                <div><label className="block text-sm text-ink-secondary mb-1.5">Género</label>{sel('gender', GENDER)}</div>
                <div><label className="block text-sm text-ink-secondary mb-1.5">Estado civil</label>{sel('marital_status', MARITAL)}</div>
                <div><label className="block text-sm text-ink-secondary mb-1.5">Nacionalidad</label>{inp('nationality')}</div>
                <div><label className="block text-sm text-ink-secondary mb-1.5">Teléfono</label>{inp('phone')}</div>
                <div className="md:col-span-2"><label className="block text-sm text-ink-secondary mb-1.5">Email</label>{inp('email', { type: 'email' })}</div>
                <div><label className="block text-sm text-ink-secondary mb-1.5">Dirección</label>{inp('address')}</div>
                <div><label className="block text-sm text-ink-secondary mb-1.5">Contacto emergencia</label>{inp('emergency_contact_name')}</div>
                <div><label className="block text-sm text-ink-secondary mb-1.5">Tel. emergencia</label>{inp('emergency_contact_phone')}</div>
              </>
            ) : (
              <>
                <Field label="Tipo ID" value={pretty(emp.id_type)} />
                <Field label="Cédula / Pasaporte" value={emp.id_number} />
                <Field label="Fecha de nacimiento" value={fmtDate(emp.birth_date)} />
                <Field label="Género" value={pretty(emp.gender)} />
                <Field label="Estado civil" value={pretty(emp.marital_status)} />
                <Field label="Nacionalidad" value={emp.nationality ?? '—'} />
                <Field label="Teléfono" value={emp.phone ?? '—'} />
                <Field label="Email" value={emp.email ?? '—'} />
                <Field label="Dirección" value={emp.address ?? '—'} />
                <Field label="Contacto emergencia" value={emp.emergency_contact_name ?? '—'} />
                <Field label="Tel. emergencia" value={emp.emergency_contact_phone ?? '—'} />
              </>
            )}
          </div>
        </div>

        {/* Datos laborales */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Briefcase className="w-4 h-4 text-blue" />
            <h2 className="font-semibold text-ink-primary">Datos laborales</h2>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
           {editing ? (
  <>
    <div><label className="block text-sm text-ink-secondary mb-1.5">Departamento</label>
      <select className="field" value={form.department_id ?? ''} onChange={(e) => set('department_id', e.target.value)}>
        <option value="">Sin asignar</option>
        {departments.map((d) => (<option key={d.id} value={d.id}>{d.name}</option>))}
      </select>
    </div>
    <div><label className="block text-sm text-ink-secondary mb-1.5">Cargo</label>
      <select className="field" value={form.position_id ?? ''} onChange={(e) => set('position_id', e.target.value)}>
        <option value="">Sin asignar</option>
        {positions.map((p) => (<option key={p.id} value={p.id}>{p.name}</option>))}
      </select>
    </div>
    <div><label className="block text-sm text-ink-secondary mb-1.5">Supervisor</label>
      <select className="field" value={form.supervisor_id ?? ''} onChange={(e) => set('supervisor_id', e.target.value)}>
        <option value="">Sin asignar</option>
        {supervisors.filter((s) => s.id !== emp.id).map((s) => (
          <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>
        ))}
      </select>
    </div>
    <div><label className="block text-sm text-ink-secondary mb-1.5">Fecha de ingreso *</label>{inp('hire_date', { type: 'date' })}</div>
    <div><label className="block text-sm text-ink-secondary mb-1.5">Tipo de contrato</label>{sel('contract_type', CONTRACT, 'Indefinido')}</div>
    <div><label className="block text-sm text-ink-secondary mb-1.5">Estado laboral</label>{sel('employment_status', STATUS, 'Activo')}</div>
    <div><label className="block text-sm text-ink-secondary mb-1.5">Centro de costo</label>{inp('cost_center')}</div>
    <div><label className="block text-sm text-ink-secondary mb-1.5">Fecha de salida</label>{inp('termination_date', { type: 'date' })}</div>
    <div>
      <label className="block text-sm text-ink-secondary mb-1.5">Sueldo mensual (USD)</label>
      <input className="field" type="number" step="0.01" min="0"
        value={(form.salary as string) ?? ''}
        onChange={(e) => set('salary', e.target.value)}
        placeholder="0.00" />
    </div>
    <div className="flex items-center gap-2 pt-6">
      <input type="checkbox" id="iess" checked={!!form.iess_affiliate}
        onChange={(e) => set('iess_affiliate', e.target.checked)} className="h-4 w-4" />
      <label htmlFor="iess" className="text-sm text-ink-secondary">Afiliado al IESS</label>
    </div>
    <div>
      <label className="block text-sm text-ink-secondary mb-1.5">N° afiliación IESS</label>
      {inp('iess_number')}
    </div>
  </>
) : (
              <>
                <Field label="Departamento" value={emp.department?.name ?? '—'} />
                <Field label="Cargo" value={emp.position?.name ?? '—'} />
                <Field label="Supervisor" value={emp.supervisor ? `${emp.supervisor.first_name} ${emp.supervisor.last_name}` : '—'} />
                <Field label="Fecha de ingreso" value={fmtDate(emp.hire_date)} />
                <Field label="Tipo de contrato" value={pretty(emp.contract_type)} />
                <Field label="Estado laboral" value={pretty(emp.employment_status)} />
                <Field label="Centro de costo" value={emp.cost_center ?? '—'} />
                <Field label="Fecha de salida" value={fmtDate(emp.termination_date)} />
                <Field label="Sueldo mensual" value={emp.salary ? `$${parseFloat(emp.salary).toFixed(2)}` : '—'} />
                <Field label="Afiliado IESS" value={emp.iess_affiliate ? 'Sí' : 'No'} />
                <Field label="N° IESS" value={emp.iess_number ?? '—'} />
              </>
            )}
          </div>
        </div>

        {/* Datos bancarios */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Landmark className="w-4 h-4 text-blue" />
            <h2 className="font-semibold text-ink-primary">Datos bancarios</h2>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {editing ? (
              <>
                <div><label className="block text-sm text-ink-secondary mb-1.5">Banco</label>{inp('bank_name')}</div>
                <div><label className="block text-sm text-ink-secondary mb-1.5">Tipo de cuenta</label>{sel('bank_account_type', BANK_TYPE)}</div>
                <div><label className="block text-sm text-ink-secondary mb-1.5">N° de cuenta</label>{inp('bank_account_number')}</div>
              </>
            ) : (
              <>
                <Field label="Banco" value={emp.bank_name ?? '—'} />
                <Field label="Tipo de cuenta" value={pretty(emp.bank_account_type)} />
                <Field label="N° de cuenta" value={emp.bank_account_number ?? '—'} />
              </>
            )}
          </div>
        </div>

        {/* Datos tributarios */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Receipt className="w-4 h-4 text-blue" />
            <h2 className="font-semibold text-ink-primary">Datos tributarios</h2>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {editing ? (
              <>
                <div><label className="block text-sm text-ink-secondary mb-1.5">RUC / ID fiscal</label>{inp('tax_id')}</div>
                <div className="flex items-center gap-2 pt-6">
                  <input type="checkbox" id="hw" checked={!!form.has_withholding}
                    onChange={(e) => set('has_withholding', e.target.checked)} className="h-4 w-4" />
                  <label htmlFor="hw" className="text-sm text-ink-secondary">Aplica retenciones</label>
                </div>
                <div className="md:col-span-3"><label className="block text-sm text-ink-secondary mb-1.5">Notas de retención</label>{inp('withholding_notes')}</div>
              </>
            ) : (
              <>
                <Field label="RUC / ID fiscal" value={emp.tax_id ?? '—'} />
                <Field label="Aplica retenciones" value={emp.has_withholding ? 'Sí' : 'No'} />
                <Field label="Notas de retención" value={emp.withholding_notes ?? '—'} />
              </>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
