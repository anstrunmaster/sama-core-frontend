'use client'
import { useEffect, useState } from 'react'
import { X, Building2, Save, AlertCircle } from 'lucide-react'
import { bankApi } from '../api'
import { ACCOUNT_TYPE_LABELS, type BankAccount, type BankAccountType } from '../types'

interface Props {
  open: boolean
  onClose: () => void
  /** Si viene una cuenta, modo edición. Si no, modo creación. */
  account?: BankAccount | null
  /** Callback al guardar exitosamente */
  onSaved: () => void
}

interface FormState {
  name: string
  bank_name: string
  account_number: string
  type: BankAccountType
  currency: string
  opening_balance: string
  notes: string
  accounting_account_id: string 
}

const EMPTY_FORM: FormState = {
  name: '',
  bank_name: '',
  account_number: '',
  type: 'CHECKING',
  currency: 'USD',
  opening_balance: '0',
  notes: '',
  accounting_account_id: '',  
}

export function BankAccountModal({ open, onClose, account, onSaved }: Props) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [accountingAccounts, setAccountingAccounts] = useState<{ id: string; code: string; name: string }[]>([])

  const isEdit = !!account

  // Reset / preload cuando se abre el modal
  useEffect(() => {
  if (!open) return
  setError('')
  // Cargar cuentas contables tipo hoja
  fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://d16rb4jhhui7p6.cloudfront.net/api/v1'}/accounting/accounts?only_movement=true`, {
    credentials: 'include',
  })
    .then(r => r.json())
    .then(d => {
      const list = Array.isArray(d.data) ? d.data.filter((a: any) => a.code.startsWith('1.01.01.02')) : []
      setAccountingAccounts(list)
    })
    .catch(() => setAccountingAccounts([]))

  if (account) {
    setForm({
      name: account.name,
      bank_name: account.bank_name,
      account_number: account.account_number,
      type: account.type,
      currency: account.currency,
      opening_balance: String(account.opening_balance),
      notes: account.notes ?? '',
      accounting_account_id: account.accounting_account_id ?? '',
    })
  } else {
    setForm(EMPTY_FORM)
  }
}, [open, account])

  // ESC para cerrar
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!form.name.trim() || !form.bank_name.trim() || !form.account_number.trim()) {
      setError('Completa nombre, banco y número de cuenta')
      return
    }
    if (!form.accounting_account_id) {
      setError('Selecciona una cuenta contable asociada')
      return
    }
    setSaving(true)
    try {
      if (isEdit && account) {
        const { opening_balance, ...editable } = form
        await bankApi.updateAccount(account.id, editable)
      } else {
        await bankApi.createAccount({
          ...form,
          opening_balance: parseFloat(form.opening_balance) || 0,
        })
      }
      onSaved()
      onClose()
    } catch (e: any) {
      setError(e.message || 'Error al guardar')
    } finally {
      setSaving(false)
    }

    
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 dark:bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg bg-surface border border-edge rounded-2xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-edge-subtle">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-muted flex items-center justify-center">
              <Building2 className="w-4 h-4 text-blue" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-ink-primary tracking-tight">
                {isEdit ? 'Editar cuenta bancaria' : 'Nueva cuenta bancaria'}
              </h2>
              <p className="text-xs text-ink-tertiary mt-0.5">
                {isEdit ? 'Actualizá los datos de la cuenta' : 'Registrá una cuenta para empezar a operar'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-ink-tertiary hover:text-ink-primary hover:bg-edge-subtle transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit}>
          <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
            {error && (
              <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-600 dark:text-red-400">
                <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <Field label="Nombre interno" required>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ej: Cuenta Corriente Pichincha"
                className="field"
                required
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Banco" required>
                <input
                  type="text"
                  value={form.bank_name}
                  onChange={(e) => setForm({ ...form, bank_name: e.target.value })}
                  placeholder="Banco Pichincha"
                  className="field"
                  required
                />
              </Field>
              <Field label="N° de cuenta" required>
                <input
                  type="text"
                  value={form.account_number}
                  onChange={(e) => setForm({ ...form, account_number: e.target.value })}
                  placeholder="2100012345"
                  className="field"
                  required
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Tipo de cuenta">
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value as BankAccountType })}
                  className="field"
                >
                  {(Object.keys(ACCOUNT_TYPE_LABELS) as BankAccountType[]).map((t) => (
                    <option key={t} value={t}>{ACCOUNT_TYPE_LABELS[t]}</option>
                  ))}
                </select>
              </Field>
              <Field label="Moneda">
                <select
                  value={form.currency}
                  onChange={(e) => setForm({ ...form, currency: e.target.value })}
                  className="field"
                >
                  <option value="USD">USD - Dólar</option>
                  <option value="EUR">EUR - Euro</option>
                  <option value="COP">COP - Peso Colombiano</option>
                  <option value="PEN">PEN - Sol Peruano</option>
                </select>
              </Field>
            </div>

            {!isEdit && (
              <Field
                label="Saldo inicial"
                hint="Saldo al momento de registrar la cuenta. No se puede editar después."
              >
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.opening_balance}
                  onChange={(e) => setForm({ ...form, opening_balance: e.target.value })}
                  className="field"
                />
              </Field>
            )}

            <Field label="Cuenta contable asociada" required>
              <select
                value={form.accounting_account_id}
                onChange={(e) => setForm({ ...form, accounting_account_id: e.target.value })}
                className="field"
                required
              >
                <option value="">Selecciona una cuenta...</option>
                {accountingAccounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.code} — {a.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Notas (opcional)">
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Cuenta principal de operación"
                className="field py-2"
                rows={2}
                style={{ height: 'auto', minHeight: 44 }}
              />
            </Field>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 p-4 border-t border-edge-subtle">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-ghost"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="btn btn-primary"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// Subcomponente Field
// ─────────────────────────────────────────────────────────────────

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string
  hint?: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-[11px] font-semibold uppercase tracking-widest text-ink-tertiary mb-1.5">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {hint && <p className="text-[10px] text-ink-ghost mt-1">{hint}</p>}
    </div>
  )
}
