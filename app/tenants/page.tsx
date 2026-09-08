'use client'
import { useState, useEffect, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Topbar } from '@/components/layout/Topbar'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { Spinner } from '@/components/ui/Spinner'
import { useTenant, useUpdateTenant } from '@/hooks/useTenant'
import { fmtDate } from '@/lib/utils'
import {
  Building2, Globe, Hash, Calendar, ShieldCheck,
  Save, MapPin, Phone, X, Pencil, AlertTriangle, Camera, ListOrdered,
  FileText, Receipt
} from 'lucide-react'
import type { Plan } from '@/types'
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://d16rb4jhhui7p6.cloudfront.net/api/v1'
function getUser(): any {
  try {
    const s = localStorage.getItem('saas_auth')
    if (s) return JSON.parse(s).state?.user ?? {}
    return JSON.parse(localStorage.getItem('user') || '{}')
  } catch { return {} }
}
// ── Editable row component ────────────────────────────────────────────────────
function EditableRow({
  label, icon: Icon, field, value, editing, mono,
  onEdit, onChange, onSave, onCancel,
}: {
  label:    string
  icon:     any
  field:    string
  value:    string
  editing:  boolean
  mono?:    boolean
  onEdit:   () => void
  onChange: (v: string) => void
  onSave:   () => void
  onCancel: () => void
}) {
  return (
    <div className="flex items-center justify-between py-3">
      <div className="flex items-center gap-2.5 text-ink-tertiary">
        <Icon className="w-4 h-4" />
        <span className="text-sm">{label}</span>
      </div>
      {editing ? (
        <div className="flex items-center gap-2">
          <input
            autoFocus
            value={value}
            onChange={e => onChange(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter')  onSave()
              if (e.key === 'Escape') onCancel()
            }}
            className={`field text-sm py-1 px-2 h-7 w-48 ${mono ? 'font-mono' : ''}`}
          />
          <button onClick={onSave} className="text-blue hover:text-blue-hover transition-colors" title="Guardar">
            <Save className="w-3.5 h-3.5" />
          </button>
          <button onClick={onCancel} className="text-ink-tertiary hover:text-ink-primary transition-colors" title="Cancelar">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <span
          onClick={onEdit}
          className={`text-sm text-ink-primary font-medium cursor-pointer hover:text-blue transition-colors group flex items-center gap-1 ${mono ? 'font-mono' : ''}`}
          title="Clic para editar"
        >
          <Pencil className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity mr-1" />
          {value || <span className="text-ink-tertiary">—</span>}
        </span>
      )}
    </div>
  )
}
// ── Plan meta ─────────────────────────────────────────────────────────────────
const planMeta: Record<Plan, { label: string; badge: 'muted' | 'blue' | 'green'; desc: string }> = {
  BASIC:      { label: 'Básico',     badge: 'muted',  desc: 'Hasta 10 usuarios, funciones esenciales' },
  PREMIUM:    { label: 'Premium',    badge: 'blue',   desc: 'Hasta 50 usuarios, API acccess, 2FA' },
  ENTERPRISE: { label: 'Enterprise', badge: 'green',  desc: 'Usuarios ilimitados, SLAs, soporte prioritario' },
}
const REGIMEN_OPTIONS = [
  { value: 'GENERAL',              label: 'Régimen General' },
  { value: 'RIMPE_EMPRENDEDOR',    label: 'RIMPE Emprendedor' },
  { value: 'RIMPE_NEGOCIO_POPULAR', label: 'RIMPE Negocio Popular' },
]
type EditableField = 'name' | 'ruc' | 'address' | 'city' | 'phone'
// ── Page ──────────────────────────────────────────────────────────────────────
export default function TenantsPage() {
  const { data: tenant, isLoading } = useTenant()
  const { mutate: update, isPending } = useUpdateTenant()
  const { register, handleSubmit, reset } = useForm<{ security_level: number }>()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [editingField, setEditingField]     = useState<string | null>(null)
  const [showRucWarning, setShowRucWarning] = useState(false)
  const [logoPreview, setLogoPreview]       = useState<string | null>(null)
  const [logoError, setLogoError]           = useState('')
  const [logoSaving, setLogoSaving]         = useState(false)
  const [fieldValues, setFieldValues] = useState({
    name: '', ruc: '', address: '', city: '', phone: '',
  })
  // ── Sequential state ──────────────────────────────────────────────────────
  const [sequential, setSequential]         = useState<number | null>(null)
  const [showSeqWarning, setShowSeqWarning] = useState(false)
  const [seqValue, setSeqValue]             = useState('')
  const [seqSaving, setSeqSaving]           = useState(false)
  const [seqError, setSeqError]             = useState('')
  // ── Tributary state ───────────────────────────────────────────────────────
  const [tributario, setTributario] = useState({
    tipo_regimen:           'GENERAL',
    obligado_contabilidad:  false,
    contribuyente_especial: '',
    agente_retencion:       '',
  })
  const [tributarioSaving, setTributarioSaving] = useState(false)
  const [tributarioMsg, setTributarioMsg]       = useState('')
  // ── Branches state ────────────────────────────────────────────────────────
  const [branches, setBranches]         = useState<any[]>([])
  const [branchesLoading, setBranchesLoading] = useState(false)
  const [showBranchModal, setShowBranchModal] = useState(false)
  const [editingBranch, setEditingBranch]     = useState<any>(null)
  const [branchForm, setBranchForm] = useState({
    name: '', establishment: '', address: '', city: '', phone: '', emission_point: '001', sequential: 0,
  })
  const [branchSaving, setBranchSaving] = useState(false)
  const [branchError, setBranchError]   = useState('')
  const [branchSuccess, setBranchSuccess] = useState('')
  // ── Cargar sucursales ─────────────────────────────────────────────────────
  const loadBranches = async () => {
    setBranchesLoading(true)
    try {
      const res  = await fetch(`${API_URL}/branches`, {
        credentials: 'include',
      })
      const json = await res.json()
      setBranches(json.data ?? [])
    } catch {}
    finally { setBranchesLoading(false) }
  }
  useEffect(() => {
    if (tenant) {
      reset({ security_level: tenant.security_level })
      setFieldValues({
        name:    tenant.name             ?? '',
        ruc:     tenant.ruc              ?? '',
        address: (tenant as any).address ?? '',
        city:    (tenant as any).city    ?? '',
        phone:   (tenant as any).phone   ?? '',
      })
      setLogoPreview((tenant as any).logo ?? null)
      setTributario({
        tipo_regimen:           (tenant as any).tipo_regimen           ?? 'GENERAL',
        obligado_contabilidad:  (tenant as any).obligado_contabilidad  ?? false,
        contribuyente_especial: (tenant as any).contribuyente_especial ?? '',
        agente_retencion:       (tenant as any).agente_retencion       ?? '',
      })
      // Cargar secuencial actual
      fetch(`${API_URL}/branches/current`, {
        credentials: 'include',
      })
        .then(r => r.json())
        .then(json => {
          const seq = json.data?.branch?.sequential ?? json.branch?.sequential
          if (seq !== undefined && seq !== null) {
            setSequential(parseInt(String(seq)))
          }
        })
        .catch(() => {})
      loadBranches()
    }
  }, [tenant, reset])
  const saveField = (field: EditableField) => {
    if (!tenant) return
    update({ id: tenant.id, payload: { [field]: fieldValues[field] } as any })
    setEditingField(null)
  }
  const startEdit = (field: EditableField) => {
    setFieldValues(v => ({ ...v, [field]: (tenant as any)?.[field] ?? '' }))
    setEditingField(field)
  }
  const onSubmit = (data: any) => {
    if (!tenant) return
    update({ id: tenant.id, payload: { security_level: Number(data.security_level) } })
  }
  // ── Tributary save ────────────────────────────────────────────────────────
  const saveTributario = () => {
    if (!tenant) return
    setTributarioSaving(true)
    setTributarioMsg('')
    update(
      {
        id: tenant.id,
        payload: {
          tipo_regimen:           tributario.tipo_regimen,
          obligado_contabilidad:  tributario.obligado_contabilidad,
          contribuyente_especial: tributario.contribuyente_especial || null,
          agente_retencion:       tributario.agente_retencion || null,
        } as any,
      },
      {
        onSuccess: () => { setTributarioMsg('Guardado correctamente') },
        onError:   () => { setTributarioMsg('Error al guardar') },
        onSettled: () => { setTributarioSaving(false); setTimeout(() => setTributarioMsg(''), 3000) },
      }
    )
  }
  // ── Logo handlers ─────────────────────────────────────────────────────────
  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLogoError('')
    const file = e.target.files?.[0]
    if (!file) return
    if (!['image/jpeg', 'image/jpg', 'image/png'].includes(file.type)) {
      setLogoError('Solo JPG o PNG')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      setLogoError('Máx 2MB')
      return
    }
    const reader = new FileReader()
    reader.onload = (ev) => {
      const base64 = ev.target?.result as string
      setLogoPreview(base64)
      if (tenant) {
        setLogoSaving(true)
        update(
          { id: tenant.id, payload: { logo: base64 } as any },
          { onSettled: () => setLogoSaving(false) }
        )
      }
    }
    reader.readAsDataURL(file)
  }
  // ── Sequential handlers ───────────────────────────────────────────────────
  const saveSequential = async () => {
    setSeqError('')
    const val = parseInt(seqValue)
    if (isNaN(val) || val < 0) {
      setSeqError('Ingresa un número válido mayor o igual a 0')
      return
    }
    if (sequential !== null && val < sequential) {
      setSeqError(`No puede ser menor al actual (${sequential}). La próxima factura sería la ${sequential + 1}.`)
      return
    }
    const user = getUser()
    const branchId = user?.branchId
    if (!branchId) {
      setSeqError('No se pudo obtener la sucursal del usuario')
      return
    }
    setSeqSaving(true)
    try {
      const res = await fetch(`${API_URL}/branches/${branchId}/sequential`, {
        method:  'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ sequential: val }),
      })
      const json = await res.json()
      if (json.success) {
        setSequential(val)
        setShowSeqWarning(false)
        setSeqValue('')
        setSeqError('')
      } else {
        setSeqError(json.error || 'Error al guardar el secuencial')
      }
    } catch {
      setSeqError('Error de conexión')
    } finally {
      setSeqSaving(false)
    }
  }
  // ── Branch handlers ───────────────────────────────────────────────────────
  // ── Guardar sucursal (crear o editar) ─────────────────────────────────────
  const saveBranch = async () => {
    setBranchError('')
    if (!branchForm.name.trim()) { setBranchError('El nombre es obligatorio'); return }
    if (!branchForm.establishment.trim()) { setBranchError('El establecimiento es obligatorio'); return }

    setBranchSaving(true)
    try {
      const isEdit = !!editingBranch
      const url    = isEdit ? `${API_URL}/branches/${editingBranch.id}` : `${API_URL}/branches`
      const method = isEdit ? 'PUT' : 'POST'
      const res    = await fetch(url, {
        method,
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(branchForm),
      })
      const json = await res.json()
      if (!json.success) { setBranchError(json.message?.[0] ?? json.error ?? 'Error al guardar'); return }
      setBranchSuccess(isEdit ? 'Sucursal actualizada' : 'Sucursal creada')
      setShowBranchModal(false)
      setEditingBranch(null)
      setBranchForm({ name: '', establishment: '', address: '', city: '', phone: '', emission_point: '001', sequential: 0 })
      loadBranches()
      setTimeout(() => setBranchSuccess(''), 3000)
    } catch { setBranchError('Error de conexión') }
    finally { setBranchSaving(false) }
  }

  // ── Desactivar sucursal ───────────────────────────────────────────────────
  const deactivateBranch = async (branchId: string) => {
    if (!confirm('¿Desactivar esta sucursal? Los usuarios asignados perderán acceso.')) return
    try {
      const res  = await fetch(`${API_URL}/branches/${branchId}`, {
        method:  'DELETE',
        credentials: 'include',
          credentials: 'include',
      })
      const json = await res.json()
      if (json.success) { loadBranches() }
      else alert(json.error ?? 'No se pudo desactivar')
    } catch { alert('Error de conexión') }
  }

  // ── Abrir modal de edición ────────────────────────────────────────────────
  const openEditBranch = (branch: any) => {
    setEditingBranch(branch)
    setBranchForm({
      name:          branch.name          ?? '',
      establishment: branch.establishment ?? '',
      address:       branch.address       ?? '',
      city:          branch.city          ?? '',
      phone:         branch.phone         ?? '',
      emission_point: '001',
      sequential:    0,
    })
    setBranchError('')
    setShowBranchModal(true)
  }
  const pm = tenant ? planMeta[tenant.plan] ?? planMeta.BASIC : null
  return (
    <DashboardLayout>
      <Topbar title="Mi Empresa" subtitle="Configuración y detalles de tu organización" />
      <div className="p-6 space-y-5">
        <div className="flex gap-5 items-start">
          {/* ── Columna izquierda ─────────────────────────────────────── */}
          <div className="flex-1 space-y-5">
            {/* Overview card */}
            <div className="card p-6 animate-fade-up">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-ink-tertiary mb-5">Información</h2>
              {isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 7 }).map((_, i) => (
                    <Skeleton key={i} className="h-5 w-full" />
                  ))}
                </div>
              ) : tenant ? (
                <div className="divide-y divide-edge-subtle">
                  <EditableRow label="Nombre" icon={Building2} field="name" value={fieldValues.name}
                    editing={editingField === 'name'} onEdit={() => startEdit('name')}
                    onChange={v => setFieldValues(f => ({ ...f, name: v }))}
                    onSave={() => saveField('name')} onCancel={() => setEditingField(null)} />
                  <div className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-2.5 text-ink-tertiary">
                      <Globe className="w-4 h-4" /><span className="text-sm">Slug</span>
                    </div>
                    <span className="text-sm font-mono text-ink-secondary">{tenant.slug}</span>
                  </div>
                  <EditableRow label="RUC" icon={Hash} field="ruc" value={fieldValues.ruc}
                    editing={editingField === 'ruc'} mono onEdit={() => startEdit('ruc')}
                    onChange={v => setFieldValues(f => ({ ...f, ruc: v }))}
                    onSave={() => setShowRucWarning(true)} onCancel={() => setEditingField(null)} />
                  <EditableRow label="Dirección" icon={MapPin} field="address" value={fieldValues.address}
                    editing={editingField === 'address'} onEdit={() => startEdit('address')}
                    onChange={v => setFieldValues(f => ({ ...f, address: v }))}
                    onSave={() => saveField('address')} onCancel={() => setEditingField(null)} />
                  <EditableRow label="Ciudad" icon={MapPin} field="city" value={fieldValues.city}
                    editing={editingField === 'city'} onEdit={() => startEdit('city')}
                    onChange={v => setFieldValues(f => ({ ...f, city: v }))}
                    onSave={() => saveField('city')} onCancel={() => setEditingField(null)} />
                  <EditableRow label="Teléfono" icon={Phone} field="phone" value={fieldValues.phone}
                    editing={editingField === 'phone'} onEdit={() => startEdit('phone')}
                    onChange={v => setFieldValues(f => ({ ...f, phone: v }))}
                    onSave={() => saveField('phone')} onCancel={() => setEditingField(null)} />
                  <div className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-2.5 text-ink-tertiary">
                      <Calendar className="w-4 h-4" /><span className="text-sm">Creado</span>
                    </div>
                    <span className="text-sm text-ink-primary font-medium">{fmtDate(tenant.created_at)}</span>
                  </div>
                  <div className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-2.5 text-ink-tertiary">
                      <ShieldCheck className="w-4 h-4" /><span className="text-sm">Plan activo</span>
                    </div>
                    <Badge variant={pm?.badge ?? 'muted'}>{pm?.label ?? tenant.plan}</Badge>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-red-600 dark:text-red-400">No se pudo cargar la información.</p>
              )}
            </div>
            {/* Plan details */}
            {tenant && pm && (
              <div className="card p-5 !border-blue/20 animate-fade-up" style={{ animationDelay: '80ms' }}>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-ink-primary">Plan {pm.label}</h3>
                    <p className="text-sm text-ink-tertiary mt-1">{pm.desc}</p>
                  </div>
                  <Badge variant={pm.badge}>{tenant.plan}</Badge>
                </div>
              </div>
            )}
            {/* ── Tributario ────────────────────────────────────────────── */}
            <div className="card p-6 animate-fade-up" style={{ animationDelay: '100ms' }}>
              <div className="flex items-center gap-2 mb-5">
                <Receipt className="w-4 h-4 text-ink-tertiary" />
                <h2 className="text-xs font-semibold uppercase tracking-widest text-ink-tertiary">Tributario</h2>
              </div>
              <div className="space-y-4">
                {/* Régimen */}
                <div>
                  <label className="block text-xs font-medium text-ink-secondary mb-2">
                    Régimen tributario
                  </label>
                  <select
                    value={tributario.tipo_regimen}
                    onChange={e => setTributario(t => ({ ...t, tipo_regimen: e.target.value }))}
                    className="field"
                  >
                    {REGIMEN_OPTIONS.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                  <p className="text-[10px] text-ink-ghost mt-1">
                    {tributario.tipo_regimen === 'RIMPE_EMPRENDEDOR' && 'Ingresos entre $20.001 y $300.000 anuales — emite facturas'}
                    {tributario.tipo_regimen === 'RIMPE_NEGOCIO_POPULAR' && 'Ingresos hasta $20.000 anuales — emite notas de venta'}
                    {tributario.tipo_regimen === 'GENERAL' && 'Ingresos superiores a $300.000 o actividades excluidas de RIMPE'}
                  </p>
                </div>
                {/* Obligado a llevar contabilidad */}
                <div className="flex items-center justify-between py-2 border-t border-edge-subtle">
                  <div>
                    <p className="text-sm text-ink-secondary">Obligado a llevar contabilidad</p>
                    <p className="text-[10px] text-ink-ghost mt-0.5">Aparece en el XML como SI o NO</p>
                  </div>
                  <button
                    onClick={() => setTributario(t => ({ ...t, obligado_contabilidad: !t.obligado_contabilidad }))}
                    className={`relative w-10 h-5 rounded-full transition-colors ${
                      tributario.obligado_contabilidad ? 'bg-blue' : 'bg-edge-strong'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${
                        tributario.obligado_contabilidad ? 'left-5' : 'left-0.5'
                      }`}
                    />
                  </button>
                </div>
                {/* Contribuyente especial */}
                <div className="border-t border-edge-subtle pt-4">
                  <label className="block text-xs font-medium text-ink-secondary mb-2">
                    Número contribuyente especial
                    <span className="ml-2 text-ink-ghost font-normal">— dejar vacío si no aplica</span>
                  </label>
                  <input
                    type="text"
                    value={tributario.contribuyente_especial}
                    onChange={e => setTributario(t => ({ ...t, contribuyente_especial: e.target.value }))}
                    className="field font-mono"
                    placeholder="Ej: 5368"
                  />
                </div>
                {/* Agente de retención */}
                <div>
                  <label className="block text-xs font-medium text-ink-secondary mb-2">
                    Número agente de retención
                    <span className="ml-2 text-ink-ghost font-normal">— dejar vacío si no aplica</span>
                  </label>
                  <input
                    type="text"
                    value={tributario.agente_retencion}
                    onChange={e => setTributario(t => ({ ...t, agente_retencion: e.target.value }))}
                    className="field font-mono"
                    placeholder="Ej: 1234"
                  />
                </div>
                {/* Guardar tributario */}
                <div className="flex items-center gap-3 pt-2">
                  <button
                    onClick={saveTributario}
                    disabled={tributarioSaving}
                    className="btn btn-primary"
                  >
                    {tributarioSaving ? <Spinner size="sm" /> : <Save className="w-3.5 h-3.5" />}
                    Guardar
                  </button>
                  {tributarioMsg && (
                    <span className={`text-xs ${tributarioMsg.includes('Error') ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                      {tributarioMsg}
                    </span>
                  )}
                </div>
              </div>
            </div>
            {/* Configuración */}
            <div className="card p-6 animate-fade-up" style={{ animationDelay: '120ms' }}>
              <h2 className="text-xs font-semibold uppercase tracking-widest text-ink-tertiary mb-5">Configuración</h2>
              <div className="space-y-5">
                {/* Secuencial */}
                <div>
                  <label className="block text-xs font-medium text-ink-secondary mb-1">
                    Secuencial de facturación
                    <span className="ml-2 text-ink-tertiary font-normal">
                      — próxima factura será la {sequential !== null ? String(sequential + 1).padStart(9, '0') : '—'}
                    </span>
                  </label>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-raised border border-edge">
                      <ListOrdered className="w-3.5 h-3.5 text-ink-tertiary" />
                      <span className="text-sm font-mono text-ink-secondary">
                        {sequential !== null ? String(sequential).padStart(9, '0') : '—'}
                      </span>
                    </div>
                    <button
                      onClick={() => { setSeqValue(String(sequential ?? 0)); setSeqError(''); setShowSeqWarning(true) }}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-edge text-xs text-ink-secondary hover:text-ink-primary hover:border-edge-strong transition-all"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      Ajustar
                    </button>
                  </div>
                </div>
                {/* Nivel de seguridad */}
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-ink-secondary mb-2">
                      Nivel de seguridad
                      <span className="ml-2 text-ink-tertiary font-normal">— 0 básico · 1 medio · 2 máximo (require 2FA)</span>
                    </label>
                    <select {...register('security_level')} className="field">
                      <option value={0}>0 — Básico</option>
                      <option value={1}>1 — Medio</option>
                      <option value={2}>2 — Máximo (2FA obligatorio)</option>
                    </select>
                  </div>
                  <div className="pt-2">
                    <button type="submit" disabled={isPending || isLoading} className="btn btn-primary">
                      {isPending ? <Spinner size="sm" /> : <Save className="w-3.5 h-3.5" />}
                      Guardar cambios
                    </button>
                  </div>
                </form>
              </div>
            </div>
            {/* ── Sucursales ──────────────────────────────────────────────────── */}
            <div className="card p-6 animate-fade-up" style={{ animationDelay: '140ms' }}>
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-ink-tertiary" />
                  <h2 className="text-xs font-semibold uppercase tracking-widest text-ink-tertiary">Sucursales</h2>
                </div>
                <button
                  onClick={() => {
                    setEditingBranch(null)
                    setBranchForm({ name: '', establishment: '', address: '', city: '', phone: '', emission_point: '001', sequential: 0 })
                    setBranchError('')
                    setShowBranchModal(true)
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue text-xs font-semibold text-white hover:bg-blue/90 transition-all"
                >
                  <FileText className="w-3.5 h-3.5" /> Nueva sucursal
                </button>
              </div>

              {branchSuccess && (
                <div className="mb-4 px-4 py-2.5 rounded-lg bg-green-500/10 border border-green-500/20 text-xs text-green-600 dark:text-green-400">
                  {branchSuccess}
                </div>
              )}

              {branchesLoading ? (
                <div className="space-y-2">
                  {[1, 2].map(i => <div key={i} className="h-14 bg-edge-subtle rounded-lg animate-pulse" />)}
                </div>
              ) : branches.length === 0 ? (
                <p className="text-sm text-ink-tertiary text-center py-6">Sin sucursales adicionales</p>
              ) : (
                <div className="divide-y divide-edge-subtle">
                  {branches.map(b => (
                    <div key={b.id} className="flex items-center justify-between py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue/10 flex items-center justify-center">
                          <Building2 className="w-4 h-4 text-blue" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-ink-primary">{b.name}</p>
                            {b.is_main && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue/10 text-blue font-semibold">
                                Principal
                              </span>
                            )}
                            {b.status === 'INACTIVE' && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-500/10 text-red-500 font-semibold">
                                Inactiva
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-ink-tertiary">
                            {b.address ?? '—'}{b.city ? ` · ${b.city}` : ''}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEditBranch(b)}
                          className="p-1.5 rounded-lg border border-edge text-ink-tertiary hover:text-ink-primary hover:border-edge-strong transition-all"
                          title="Editar"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        {!b.is_main && b.status === 'ACTIVE' && (
                          <button
                            onClick={() => deactivateBranch(b.id)}
                            className="p-1.5 rounded-lg border border-red-500/20 text-red-500/60 hover:text-red-500 hover:border-red-500/40 transition-all"
                            title="Desactivar"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          {/* ── Columna derecha — logo ─────────────────────────────────── */}
          <div className="w-56 shrink-0 animate-fade-up" style={{ animationDelay: '60ms' }}>
            <div className="card p-5 flex flex-col items-center gap-4">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-ink-tertiary self-start">Logo</h2>
              <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                <div className="w-36 h-36 rounded-full bg-white flex items-center justify-center overflow-hidden shadow-[0_0_0_3px_rgba(59,130,246,0.2)] hover:shadow-[0_0_0_3px_rgba(59,130,246,0.5)] transition-all">
                  {logoPreview ? (
                    <img src={logoPreview} alt="Logo empresa" className="w-full h-full object-contain p-3" />
                  ) : (
                    <div className="flex flex-col items-center gap-1 text-zinc-500">
                      <Building2 className="w-10 h-10 text-zinc-300" />
                      <span className="text-[10px]">Sin logo</span>
                    </div>
                  )}
                </div>
                <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  {logoSaving ? <Spinner size="sm" /> : (
                    <div className="flex flex-col items-center gap-1">
                      <Camera className="w-6 h-6 text-white" />
                      <span className="text-[10px] text-white font-medium">Cambiar</span>
                    </div>
                  )}
                </div>
              </div>
              <input ref={fileInputRef} type="file" accept="image/jpeg,image/jpg,image/png" onChange={handleLogoChange} className="hidden" />
              <div className="text-center space-y-1">
                <p className="text-[11px] text-ink-tertiary">Clic para cambiar</p>
                <p className="text-[10px] text-ink-ghost">JPG o PNG · Máx 2MB</p>
                <p className="text-[10px] text-ink-ghost">Se mostrará en facturas</p>
              </div>
              {logoError && <p className="text-[11px] text-red-600 dark:text-red-400 text-center">{logoError}</p>}
              {logoPreview && (
                <button
                  onClick={() => {
                    setLogoPreview(null)
                    update({ id: tenant!.id, payload: { logo: null } as any })
                    if (fileInputRef.current) fileInputRef.current.value = ''
                  }}
                  className="text-[11px] text-ink-tertiary hover:text-red-500 dark:hover:text-red-400 transition-colors"
                >
                  Eliminar logo
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
      {/* ── Modal RUC ─────────────────────────────────────────────────────── */}
      {showRucWarning && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="card-raised w-full max-w-md mx-4 p-6 shadow-2xl">
            <div className="flex items-start gap-4 mb-5">
              <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-ink-primary">Cambiar RUC</h3>
                <p className="text-sm text-ink-tertiary mt-1">El RUC se usa en todos los XMLs enviados al SRI. Cambiarlo afectará las próximas facturas. ¿Estás seguro?</p>
              </div>
            </div>
            <div className="bg-edge-subtle border border-edge-subtle rounded-lg px-4 py-3 mb-5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-ink-tertiary">Nuevo RUC</span>
                <span className="font-mono font-bold text-amber-600 dark:text-amber-400">{fieldValues.ruc}</span>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowRucWarning(false)} className="flex-1 py-2.5 rounded-lg border border-edge text-sm text-ink-secondary hover:text-ink-primary hover:border-edge-strong transition-all">Cancelar</button>
              <button onClick={() => { saveField('ruc'); setShowRucWarning(false) }} className="flex-1 py-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-sm font-semibold text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 transition-all">Confirmar cambio</button>
            </div>
          </div>
        </div>
      )}
      {/* ── Modal secuencial ──────────────────────────────────────────────── */}
      {showSeqWarning && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="card-raised w-full max-w-md mx-4 p-6 shadow-2xl">
            <div className="flex items-start gap-4 mb-5">
              <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-ink-primary">Ajustar secuencial</h3>
                <p className="text-sm text-ink-tertiary mt-1">Usa esto si ya venías facturando con otro sistema. Ingresa el último número usado — la próxima factura continuará desde ahí.</p>
              </div>
            </div>
            <div className="space-y-3 mb-5">
              <div>
                <label className="block text-xs text-ink-tertiary mb-1.5">Último secuencial usado</label>
                <input type="number" min={sequential ?? 0} value={seqValue}
                  onChange={e => { setSeqValue(e.target.value); setSeqError('') }}
                  onKeyDown={e => { if (e.key === 'Enter') saveSequential() }}
                  className="field font-mono" placeholder="Ej: 1000" autoFocus />
                {seqError && <p className="text-xs text-red-600 dark:text-red-400 mt-1">{seqError}</p>}
              </div>
              <div className="bg-edge-subtle border border-edge-subtle rounded-lg px-4 py-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-ink-tertiary">Próxima factura será</span>
                  <span className="font-mono font-bold text-amber-600 dark:text-amber-400">{String((parseInt(seqValue) || 0) + 1).padStart(9, '0')}</span>
                </div>
                <div className="flex items-center justify-between text-sm mt-1.5">
                  <span className="text-ink-tertiary">Secuencial actual</span>
                  <span className="font-mono text-ink-tertiary">{sequential !== null ? String(sequential).padStart(9, '0') : '—'}</span>
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setShowSeqWarning(false); setSeqError(''); setSeqValue('') }} className="flex-1 py-2.5 rounded-lg border border-edge text-sm text-ink-secondary hover:text-ink-primary hover:border-edge-strong transition-all">Cancelar</button>
              <button onClick={saveSequential} disabled={seqSaving} className="flex-1 py-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-sm font-semibold text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 transition-all">
                {seqSaving ? 'Guardando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ── Modal sucursal ───────────────────────────────────────────────────── */}
      {showBranchModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="card-raised w-full max-w-md mx-4 p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-bold text-ink-primary">
                {editingBranch ? 'Editar sucursal' : 'Nueva sucursal'}
              </h3>
              <button onClick={() => setShowBranchModal(false)} className="text-ink-tertiary hover:text-ink-primary transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-ink-secondary mb-1.5">
                  Nombre <span className="text-red-400">*</span>
                </label>
                <input
                  value={branchForm.name}
                  onChange={e => setBranchForm(f => ({ ...f, name: e.target.value }))}
                  className="field" placeholder="Ej: Sucursal Norte"
                />
              </div>

              {!editingBranch && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-ink-secondary mb-1.5">
                      Establecimiento <span className="text-red-400">*</span>
                    </label>
                    <input
                      value={branchForm.establishment}
                      onChange={e => setBranchForm(f => ({ ...f, establishment: e.target.value }))}
                      className="field font-mono" placeholder="002"
                      maxLength={3}
                    />
                    <p className="text-[10px] text-ink-ghost mt-1">Asignado por el SRI</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-ink-secondary mb-1.5">
                      Punto de emisión
                    </label>
                    <input
                      value={branchForm.emission_point}
                      onChange={e => setBranchForm(f => ({ ...f, emission_point: e.target.value }))}
                      className="field font-mono" placeholder="001"
                      maxLength={3}
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-ink-secondary mb-1.5">Dirección</label>
                <input
                  value={branchForm.address}
                  onChange={e => setBranchForm(f => ({ ...f, address: e.target.value }))}
                  className="field" placeholder="Av. Principal 123"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-ink-secondary mb-1.5">Ciudad</label>
                  <input
                    value={branchForm.city}
                    onChange={e => setBranchForm(f => ({ ...f, city: e.target.value }))}
                    className="field" placeholder="Quito"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-ink-secondary mb-1.5">Teléfono</label>
                  <input
                    value={branchForm.phone}
                    onChange={e => setBranchForm(f => ({ ...f, phone: e.target.value }))}
                    className="field" placeholder="+593..."
                  />
                </div>
              </div>

              {!editingBranch && (
                <div>
                  <label className="block text-xs font-medium text-ink-secondary mb-1.5">
                    Secuencial inicial
                    <span className="ml-2 text-ink-ghost font-normal">— 0 si empiezas desde cero</span>
                  </label>
                  <input
                    type="number" min={0}
                    value={branchForm.sequential}
                    onChange={e => setBranchForm(f => ({ ...f, sequential: parseInt(e.target.value) || 0 }))}
                    className="field font-mono"
                  />
                </div>
              )}

              {branchError && (
                <p className="text-xs text-red-600 dark:text-red-400">{branchError}</p>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowBranchModal(false)}
                className="flex-1 py-2.5 rounded-lg border border-edge text-sm text-ink-secondary hover:text-ink-primary transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={saveBranch}
                disabled={branchSaving}
                className="flex-1 py-2.5 rounded-lg bg-blue text-sm font-semibold text-white hover:bg-blue/90 disabled:opacity-50 transition-all"
              >
                {branchSaving ? 'Guardando...' : editingBranch ? 'Guardar cambios' : 'Crear sucursal'}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
