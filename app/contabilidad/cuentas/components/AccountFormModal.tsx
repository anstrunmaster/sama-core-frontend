'use client'
import { useEffect, useState } from 'react'
import { X, Loader2, AlertCircle, Save, FolderOpen, FileText, Info } from 'lucide-react'
import { accountsApi } from '../api'
import {
  type Account,
  type AccountType,
  type AccountNature,
  type AccountTaxCategory,
  type CreateAccountInput,
  type UpdateAccountInput,
  ACCOUNT_TYPE_LABELS,
  ACCOUNT_NATURE_LABELS,
  ACCOUNT_TYPE_COLORS,
  TAX_CATEGORY_LABELS,
  TAX_CATEGORY_BY_TYPE,
} from '../types'

interface Props {
  mode: 'create' | 'edit'
  account?: Account | null
  parent?: Account | null // si se crea sub-cuenta de un padre específico
  onClose: () => void
  onSaved: () => void
}

/**
 * Modal de crear/editar cuenta.
 *
 * En modo CREATE: pide todos los campos
 * En modo EDIT: solo permite name, description, allows_movement, allow_negative, is_active
 */
export function AccountFormModal({ mode, account, parent, onClose, onSaved }: Props) {
  const isEdit = mode === 'edit' && !!account

  const [code, setCode] = useState(account?.code ?? '')
  const [name, setName] = useState(account?.name ?? '')
  const [description, setDescription] = useState(account?.description ?? '')
  const [accountType, setAccountType] = useState<AccountType>(
    account?.account_type ?? parent?.account_type ?? 'ASSET',
  )
  const [nature, setNature] = useState<AccountNature>(
    account?.nature ?? parent?.nature ?? 'DEBIT',
  )
  const [allowsMovement, setAllowsMovement] = useState(
    account?.allows_movement ?? true,
  )
  const [allowNegative, setAllowNegative] = useState(
    account?.allow_negative ?? false,
  )
  const [isActive, setIsActive] = useState(account?.is_active ?? true)

  const [saving, setSaving] = useState(false)
    const [taxCategory, setTaxCategory] = useState<AccountTaxCategory | null>(
    account?.tax_category ?? null
  )
  const [isDeductible, setIsDeductible] = useState<boolean | null>(
    account?.is_deductible ?? null
  )
  const [error, setError] = useState('')

  // Si se está creando bajo un padre, sugerir código automático
  useEffect(() => {
    if (!isEdit && parent && !code) {
      // Sugerir el siguiente código disponible
      suggestNextCode(parent.code).then((next) => {
        if (next) setCode(next)
      })
    }
  }, [isEdit, parent])

  async function suggestNextCode(parentCode: string): Promise<string> {
    try {
      const children = await accountsApi.list({ include_inactive: true })
      const siblings = children.filter(
        (c) => c.parent_id !== null && c.code.startsWith(parentCode + '.'),
      )
      const usedSuffixes = new Set(
        siblings
          .map((c) => c.code.replace(parentCode + '.', '').split('.')[0])
          .map((s) => parseInt(s, 10))
          .filter((n) => !isNaN(n)),
      )
      let next = 1
      while (usedSuffixes.has(next)) next++
      const padded = String(next).padStart(2, '0')
      return `${parentCode}.${padded}`
    } catch {
      return ''
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSaving(true)

    try {
      if (isEdit && account) {
        const data: UpdateAccountInput = {
          name,
          description: description || undefined,
          allows_movement: allowsMovement,
          allow_negative: allowNegative,
          is_active: isActive,
          tax_category:  taxCategory,
          is_deductible: isDeductible,
        }
        await accountsApi.update(account.id, data)
      } else {
        const data: CreateAccountInput = {
          code,
          name,
          description: description || undefined,
          account_type: accountType,
          nature,
          parent_id: parent?.id,
          allows_movement: allowsMovement,
          allow_negative: allowNegative,
          is_active: isActive,
        }
        await accountsApi.create(data)
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
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="card-raised rounded-2xl shadow-2xl max-w-lg w-full my-4"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-edge-subtle">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: `${ACCOUNT_TYPE_COLORS[accountType]}15` }}
            >
              {allowsMovement ? (
                <FileText className="w-4 h-4" style={{ color: ACCOUNT_TYPE_COLORS[accountType] }} />
              ) : (
                <FolderOpen className="w-4 h-4" style={{ color: ACCOUNT_TYPE_COLORS[accountType] }} />
              )}
            </div>
            <div>
              <h2 className="text-base font-semibold text-ink-primary">
                {isEdit ? 'Editar cuenta' : parent ? 'Nueva sub-cuenta' : 'Nueva cuenta'}
              </h2>
              {parent && (
                <p className="text-[11px] text-ink-tertiary">
                  Bajo: <span className="font-mono">{parent.code}</span> · {parent.name}
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="p-2 rounded-lg text-ink-tertiary hover:text-ink-primary hover:bg-edge-subtle transition-all disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {error && (
            <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-600 dark:text-red-400">
              <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {isEdit && account?.is_system && (
            <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-blue-muted/40 border border-blue/20 text-xs text-ink-secondary">
              <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-blue" />
              <span>
                Cuenta del plan estándar. Podés renombrarla o desactivarla pero no eliminarla.
              </span>
            </div>
          )}

          {/* Código (solo en create) */}
          {!isEdit && (
            <div>
              <label className="text-[11px] text-ink-secondary font-medium mb-1.5 block">
                Código jerárquico *
              </label>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="field w-full text-sm font-mono"
                placeholder="ej: 1.1.01.03"
                required
                disabled={saving}
              />
              <p className="text-[10px] text-ink-tertiary mt-1">
                Formato Ecuador SRI. Solo dígitos separados por puntos.
              </p>
            </div>
          )}

          {isEdit && (
            <div>
              <label className="text-[11px] text-ink-secondary font-medium mb-1.5 block">
                Código
              </label>
              <input
                value={account?.code ?? ''}
                disabled
                className="field w-full text-sm font-mono opacity-60 cursor-not-allowed"
              />
              <p className="text-[10px] text-ink-tertiary mt-1">
                No se puede cambiar el código de una cuenta existente.
              </p>
            </div>
          )}

          {/* Nombre */}
          <div>
            <label className="text-[11px] text-ink-secondary font-medium mb-1.5 block">
              Nombre *
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="field w-full text-sm"
              placeholder="ej: Banco Pichincha Cta Cte"
              required
              minLength={2}
              maxLength={200}
              disabled={saving}
            />
          </div>

          {/* Tipo y naturaleza (solo en create, o readonly en edit) */}
          {!isEdit ? (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-ink-secondary font-medium mb-1.5 block">
                  Tipo *
                </label>
                <select
                  value={accountType}
                  onChange={(e) => setAccountType(e.target.value as AccountType)}
                  className="field w-full text-sm"
                  disabled={saving || !!parent}
                >
                  {Object.entries(ACCOUNT_TYPE_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
                {parent && (
                  <p className="text-[10px] text-ink-tertiary mt-1">
                    Debe coincidir con el padre
                  </p>
                )}
              </div>

              <div>
                <label className="text-[11px] text-ink-secondary font-medium mb-1.5 block">
                  Naturaleza *
                </label>
                <select
                  value={nature}
                  onChange={(e) => setNature(e.target.value as AccountNature)}
                  className="field w-full text-sm"
                  disabled={saving}
                >
                  <option value="DEBIT">Deudora (Debe)</option>
                  <option value="CREDIT">Acreedora (Haber)</option>
                </select>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-ink-secondary font-medium mb-1.5 block">
                  Tipo
                </label>
                <input
                  value={ACCOUNT_TYPE_LABELS[accountType]}
                  disabled
                  className="field w-full text-sm opacity-60 cursor-not-allowed"
                />
              </div>
              <div>
                <label className="text-[11px] text-ink-secondary font-medium mb-1.5 block">
                  Naturaleza
                </label>
                <input
                  value={ACCOUNT_NATURE_LABELS[nature]}
                  disabled
                  className="field w-full text-sm opacity-60 cursor-not-allowed"
                />
              </div>
            </div>
          )}

          {/* Descripción */}
          <div>
            <label className="text-[11px] text-ink-secondary font-medium mb-1.5 block">
              Descripción (opcional)
            </label>
            <textarea
              value={description ?? ''}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="field w-full text-sm resize-none"
              placeholder="Para qué se usa esta cuenta..."
              disabled={saving}
            />
          </div>
                    {/* Clasificación tributaria — solo para cuentas de ingresos, gastos y costos */}
          {(accountType === 'INCOME' || accountType === 'EXPENSE' || accountType === 'COST' ||
            accountType === 'ASSET' || accountType === 'LIABILITY' || accountType === 'EQUITY') && (
            <div className="rounded-xl border border-edge-subtle bg-surface-raised/40 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-ink-tertiary">
                  Clasificación tributaria (Formulario 101 IR)
                </span>
              </div>
              <div>
                <label className="text-[11px] text-ink-secondary font-medium mb-1.5 block">
                  Categoría tributaria
                </label>
                <select
                  value={taxCategory ?? ''}
                  onChange={e => setTaxCategory((e.target.value || null) as AccountTaxCategory | null)}
                  className="field w-full text-sm"
                  disabled={saving}
                >
                  <option value="">Sin clasificar</option>
                  {(TAX_CATEGORY_BY_TYPE[accountType] ?? Object.keys(TAX_CATEGORY_LABELS) as AccountTaxCategory[])
                    .map(cat => (
                      <option key={cat} value={cat}>{TAX_CATEGORY_LABELS[cat as AccountTaxCategory]}</option>
                    ))
                  }
                </select>
                <p className="text-[10px] text-ink-tertiary mt-1">
                  Usado para calcular el Formulario 101. Sin clasificar = advertencia al calcular.
                </p>
              </div>
              {(accountType === 'EXPENSE' || accountType === 'COST') && (
                <div>
                  <label className="text-[11px] text-ink-secondary font-medium mb-1.5 block">
                    ¿Es deducible para IR?
                  </label>
                  <select
                    value={isDeductible === null ? '' : String(isDeductible)}
                    onChange={e => setIsDeductible(e.target.value === '' ? null : e.target.value === 'true')}
                    className="field w-full text-sm"
                    disabled={saving}
                  >
                    <option value="">Sin definir</option>
                    <option value="true">Sí — deducible</option>
                    <option value="false">No — no deducible</option>
                  </select>
                </div>
              )}
            </div>
          )}

          {/* Toggles */}
          <div className="space-y-2">
            <CheckRow
              label="Permite movimientos contables"
              hint="Si está marcada, esta cuenta admite asientos. Las cuentas padre normalmente NO permiten movimientos."
              checked={allowsMovement}
              onChange={setAllowsMovement}
              disabled={saving}
            />
            <CheckRow
              label="Permite saldo negativo"
              hint="Raro. Solo activá esto si la cuenta puede mostrar saldos en negativo (raro en Ecuador)."
              checked={allowNegative}
              onChange={setAllowNegative}
              disabled={saving}
            />
            <CheckRow
              label="Activa"
              hint="Si está desmarcada, la cuenta no aparece en los selectores de asientos."
              checked={isActive}
              onChange={setIsActive}
              disabled={saving}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-5 border-t border-edge-subtle">
          <button
            type="button"
            onClick={onClose}
            className="btn btn-ghost"
            disabled={saving}
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving || !name.trim() || (!isEdit && !code.trim())}
            className="btn btn-primary"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {isEdit ? 'Guardar cambios' : 'Crear cuenta'}
          </button>
        </div>
      </form>
    </div>
  )
}

function CheckRow({
  label, hint, checked, onChange, disabled,
}: {
  label: string
  hint?: string
  checked: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
}) {
  return (
    <label className="flex items-start gap-3 p-3 rounded-lg hover:bg-edge-subtle transition-colors cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        className="mt-0.5"
      />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-ink-primary">{label}</div>
        {hint && <div className="text-[11px] text-ink-tertiary mt-0.5 leading-relaxed">{hint}</div>}
      </div>
    </label>
  )
}
