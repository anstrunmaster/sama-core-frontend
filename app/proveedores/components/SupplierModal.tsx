'use client'
import { useState, useEffect } from 'react'
import { X, Save, Loader2, AlertCircle, Building2 } from 'lucide-react'
import { suppliersApi } from '../../compras/api'
import {
  type Supplier,
  type SupplierTypeT,
  SUPPLIER_TYPE_LABELS,
  ID_TYPE_LABELS,
} from '../../compras/types'

interface Props {
  supplier: Supplier | null // null = crear, objeto = editar
  onClose: () => void
  onSaved: () => void
}

/**
 * Modal de crear/editar proveedor.
 *
 * Lógica especial:
 *  - Si se elige tipo "Persona Natural" → identification_type defaults a "05" (Cédula)
 *  - Si se elige tipo "Sociedad" → defaults a "04" (RUC)
 *  - Si se elige tipo "Extranjero" → defaults a "06" (Pasaporte)
 *
 * Validación:
 *  - Cédula: 10 dígitos
 *  - RUC: 13 dígitos terminado en "001" o "0001" (o "9999" para extranjeros)
 *  - Pasaporte: 6-20 chars alfanuméricos
 */
export function SupplierModal({ supplier, onClose, onSaved }: Props) {
  const isEdit = !!supplier

  // ─── Form state ──────────────────────────────────────────────────

  const [form, setForm] = useState({
    identification_type: supplier?.identification_type ?? '04',
    identification: supplier?.identification ?? '',
    legal_name: supplier?.legal_name ?? '',
    trade_name: supplier?.trade_name ?? '',
    supplier_type: (supplier?.supplier_type ?? 'SOCIEDAD') as SupplierTypeT,
    is_special_taxpayer: supplier?.is_special_taxpayer ?? false,
    is_withholding_agent: supplier?.is_withholding_agent ?? false,
    is_required_to_account: supplier?.is_required_to_account ?? true,
    email: supplier?.email ?? '',
    phone: supplier?.phone ?? '',
    address: supplier?.address ?? '',
    city: supplier?.city ?? '',
    notes: supplier?.notes ?? '',
  })

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Auto-ajustar identification_type cuando cambia supplier_type
  useEffect(() => {
    if (isEdit) return // no auto-ajustar en edición
    const defaults: Record<SupplierTypeT, string> = {
      PERSONA_NATURAL: '05',
      SOCIEDAD: '04',
      EXTRANJERO: '06',
      CONSUMIDOR_FINAL: '07',
    }
    setForm((f) => ({ ...f, identification_type: defaults[f.supplier_type] }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.supplier_type])

  // ─── Validación ────────────────────────────────────────────────

  function validate(): string | null {
    if (!form.legal_name.trim()) return 'La razón social es obligatoria'
    if (!form.identification.trim()) return 'La identificación es obligatoria'

    const id = form.identification.replace(/\D/g, '')

    if (form.identification_type === '05') {
      // Cédula: 10 dígitos
      if (id.length !== 10) return 'La cédula debe tener 10 dígitos'
    } else if (form.identification_type === '04') {
      // RUC: 13 dígitos
      if (id.length !== 13) return 'El RUC debe tener 13 dígitos'
    }

    if (form.email && !form.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      return 'El email no tiene formato válido'
    }

    return null
  }

  // ─── Submit ──────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const err = validate()
    if (err) {
      setError(err)
      return
    }

    setSaving(true)
    setError('')

    try {
      const payload = {
        identification_type: form.identification_type,
        identification: form.identification.trim(),
        legal_name: form.legal_name.trim(),
        trade_name: form.trade_name.trim() || null,
        supplier_type: form.supplier_type,
        is_special_taxpayer: form.is_special_taxpayer,
        is_withholding_agent: form.is_withholding_agent,
        is_required_to_account: form.is_required_to_account,
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        address: form.address.trim() || null,
        city: form.city.trim() || null,
        notes: form.notes.trim() || null,
      }

      if (isEdit && supplier) {
        await suppliersApi.update(supplier.id, payload)
      } else {
        await suppliersApi.create(payload)
      }

      onSaved()
    } catch (e: any) {
      setError(e.message || 'Error al guardar')
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="card-raised rounded-2xl shadow-2xl max-w-2xl w-full my-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-edge-subtle">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-muted flex items-center justify-center">
              <Building2 className="w-4 h-4 text-blue" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-ink-primary">
                {isEdit ? 'Editar proveedor' : 'Nuevo proveedor'}
              </h2>
              <p className="text-[11px] text-ink-tertiary">
                {isEdit
                  ? 'Actualizá los datos del proveedor'
                  : 'Completá los datos del proveedor para registrar compras'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-ink-tertiary hover:text-ink-primary hover:bg-edge-subtle transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-5 max-h-[70vh] overflow-y-auto">
          {error && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-600 dark:text-red-400">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* ─── Identificación ──────────────────────────── */}
          <div>
            <h3 className="text-[10px] uppercase tracking-widest text-ink-tertiary font-bold mb-3">
              Identificación
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] text-ink-secondary font-medium mb-1 block">
                  Tipo
                </label>
                <select
                  value={form.supplier_type}
                  onChange={(e) =>
                    setForm({ ...form, supplier_type: e.target.value as SupplierTypeT })
                  }
                  className="field w-full text-sm"
                  disabled={isEdit}
                >
                  {Object.entries(SUPPLIER_TYPE_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[11px] text-ink-secondary font-medium mb-1 block">
                  Tipo Identif.
                </label>
                <select
                  value={form.identification_type}
                  onChange={(e) =>
                    setForm({ ...form, identification_type: e.target.value })
                  }
                  className="field w-full text-sm"
                  disabled={isEdit}
                >
                  {Object.entries(ID_TYPE_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[11px] text-ink-secondary font-medium mb-1 block">
                  Número *
                </label>
                <input
                  value={form.identification}
                  onChange={(e) =>
                    setForm({ ...form, identification: e.target.value })
                  }
                  className="field w-full text-sm font-mono"
                  placeholder={form.identification_type === '04' ? '0000000000001' : '0000000000'}
                  required
                  disabled={isEdit}
                />
              </div>
            </div>
            {isEdit && (
              <p className="text-[10px] text-ink-tertiary mt-2 italic">
                La identificación no se puede modificar una vez creada
              </p>
            )}
          </div>

          {/* ─── Nombre ──────────────────────────────────── */}
          <div>
            <h3 className="text-[10px] uppercase tracking-widest text-ink-tertiary font-bold mb-3">
              Nombre
            </h3>
            <div className="grid grid-cols-1 gap-3">
              <div>
                <label className="text-[11px] text-ink-secondary font-medium mb-1 block">
                  Razón social *
                </label>
                <input
                  value={form.legal_name}
                  onChange={(e) => setForm({ ...form, legal_name: e.target.value })}
                  className="field w-full text-sm"
                  placeholder="Empresa S.A. / Apellido Nombre"
                  required
                />
              </div>
              <div>
                <label className="text-[11px] text-ink-secondary font-medium mb-1 block">
                  Nombre comercial
                </label>
                <input
                  value={form.trade_name}
                  onChange={(e) => setForm({ ...form, trade_name: e.target.value })}
                  className="field w-full text-sm"
                  placeholder="(opcional)"
                />
              </div>
            </div>
          </div>

          {/* ─── Características tributarias ───────────────── */}
          <div>
            <h3 className="text-[10px] uppercase tracking-widest text-ink-tertiary font-bold mb-3">
              Características tributarias
            </h3>
            <div className="space-y-2">
              <label className="flex items-start gap-2 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={form.is_special_taxpayer}
                  onChange={(e) => setForm({ ...form, is_special_taxpayer: e.target.checked })}
                  className="accent-blue mt-0.5"
                />
                <div>
                  <div className="text-xs font-medium text-ink-primary group-hover:text-blue transition-colors">
                    Contribuyente especial
                  </div>
                  <div className="text-[10px] text-ink-tertiary">
                    Designado oficialmente por el SRI como contribuyente especial
                  </div>
                </div>
              </label>

              <label className="flex items-start gap-2 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={form.is_withholding_agent}
                  onChange={(e) => setForm({ ...form, is_withholding_agent: e.target.checked })}
                  className="accent-blue mt-0.5"
                />
                <div>
                  <div className="text-xs font-medium text-ink-primary group-hover:text-blue transition-colors">
                    Agente de retención
                  </div>
                  <div className="text-[10px] text-ink-tertiary">
                    El SRI lo designó como agente de retención
                  </div>
                </div>
              </label>

              <label className="flex items-start gap-2 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={form.is_required_to_account}
                  onChange={(e) =>
                    setForm({ ...form, is_required_to_account: e.target.checked })
                  }
                  className="accent-blue mt-0.5"
                />
                <div>
                  <div className="text-xs font-medium text-ink-primary group-hover:text-blue transition-colors">
                    Obligado a llevar contabilidad
                  </div>
                  <div className="text-[10px] text-ink-tertiary">
                    Generalmente sociedades y personas con ingresos altos
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* ─── Contacto ─────────────────────────────────── */}
          <div>
            <h3 className="text-[10px] uppercase tracking-widest text-ink-tertiary font-bold mb-3">
              Contacto (opcional)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-ink-secondary font-medium mb-1 block">
                  Email
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="field w-full text-sm"
                  placeholder="contacto@proveedor.com"
                />
              </div>
              <div>
                <label className="text-[11px] text-ink-secondary font-medium mb-1 block">
                  Teléfono
                </label>
                <input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="field w-full text-sm"
                  placeholder="+593 99 999 9999"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-[11px] text-ink-secondary font-medium mb-1 block">
                  Dirección
                </label>
                <input
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className="field w-full text-sm"
                  placeholder="Calle y número"
                />
              </div>
              <div>
                <label className="text-[11px] text-ink-secondary font-medium mb-1 block">
                  Ciudad
                </label>
                <input
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  className="field w-full text-sm"
                  placeholder="Quito / Guayaquil..."
                />
              </div>
            </div>
          </div>

          {/* ─── Notas ────────────────────────────────────── */}
          <div>
            <label className="text-[11px] text-ink-secondary font-medium mb-1 block">
              Notas internas
            </label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={2}
              className="field w-full text-sm resize-none"
              placeholder="Información adicional..."
            />
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-5 border-t border-edge-subtle">
          <button onClick={onClose} type="button" className="btn btn-ghost" disabled={saving}>
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            type="submit"
            className="btn btn-primary"
            disabled={saving}
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {isEdit ? 'Guardar cambios' : 'Crear proveedor'}
          </button>
        </div>
      </div>
    </div>
  )
}
