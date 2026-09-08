'use client'
import { useEffect, useState } from 'react'
import { X, ArrowUpRight, ArrowDownLeft, Save, AlertCircle } from 'lucide-react'
import { bankApi } from '../api'
import type { BankAccount, BankMovementDirection } from '../types'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://d16rb4jhhui7p6.cloudfront.net/api/v1'

interface Props {
  open: boolean
  onClose: () => void
  accounts: BankAccount[]
  onSaved: () => void
}

interface FormState {
  bank_account_id: string
  movement_date: string
  direction: BankMovementDirection
  amount: string
  description: string
  reference: string
  transaction_type: string
  beneficiary: string
  accounting_account_id: string
}

interface AccountOption {
  id: string
  code: string
  name: string
}

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

const EMPTY_FORM: FormState = {
  bank_account_id: '',
  movement_date: todayStr(),
  direction: 'CREDIT',
  amount: '',
  description: '',
  reference: '',
  transaction_type: '',
  beneficiary: '',
  accounting_account_id: '',
}

export function BankMovementModal({ open, onClose, accounts, onSaved }: Props) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [accountOptions, setAccountOptions] = useState<AccountOption[]>([])

  // Cargar cuentas contables
  useEffect(() => {
    fetch(`${API_URL}/accounting/accounts?only_movement=true`, {
      credentials: 'include',
    })
      .then(r => r.json())
      .then(d => setAccountOptions(Array.isArray(d.data) ? d.data : []))
      .catch(() => {})
  }, [])

  // Reset cuando se abre
  useEffect(() => {
    if (!open) return
    setError('')
    setForm({
      ...EMPTY_FORM,
      bank_account_id: accounts[0]?.id || '',
    })
  }, [open, accounts])

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
    if (!form.bank_account_id) {
      setError('Elegí una cuenta'); return
    }
    const amount = parseFloat(form.amount)
    if (!amount || amount <= 0) {
      setError('El monto debe ser mayor a 0'); return
    }
    if (!form.description.trim()) {
      setError('Ingresá una descripción'); return
    }
    setSaving(true)
    try {
      await bankApi.createMovement(form.bank_account_id, {
        movement_date:         form.movement_date,
        direction:             form.direction,
        amount,
        description:           form.description.trim(),
        reference:             form.reference.trim() || undefined,
        transaction_type:      form.transaction_type || undefined,
        beneficiary:           form.beneficiary.trim() || undefined,
        accounting_account_id: form.accounting_account_id || undefined,
      })
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
        className="relative w-full max-w-lg bg-surface border border-edge rounded-2xl shadow-2xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-edge-subtle shrink-0">
          <div>
            <h2 className="text-base font-semibold text-ink-primary tracking-tight">
              Registrar movimiento
            </h2>
            <p className="text-xs text-ink-tertiary mt-0.5">
              Ingresá manualmente un movimiento de tu extracto bancario
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-ink-tertiary hover:text-ink-primary hover:bg-edge-subtle transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-5 space-y-4 overflow-y-auto flex-1">
            {error && (
              <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-600 dark:text-red-400">
                <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Cuenta bancaria */}
            <Field label="Cuenta bancaria" required>
              <select
                value={form.bank_account_id}
                onChange={(e) => setForm({ ...form, bank_account_id: e.target.value })}
                className="field"
                required
              >
                <option value="">Elegí una cuenta...</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} — {a.bank_name} ({a.currency})
                  </option>
                ))}
              </select>
            </Field>

            {/* Ingreso / Egreso */}
            <Field label="Dirección">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, direction: 'CREDIT' })}
                  className={`p-3 rounded-xl border transition-all text-left ${
                    form.direction === 'CREDIT'
                      ? 'border-emerald-500/40 bg-emerald-500/10'
                      : 'border-edge-subtle bg-edge-subtle hover:bg-edge'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <ArrowDownLeft className={`w-4 h-4 ${form.direction === 'CREDIT' ? 'text-emerald-600 dark:text-emerald-400' : 'text-ink-tertiary'}`} />
                    <div>
                      <div className="text-xs font-semibold text-ink-primary">Ingreso</div>
                      <div className="text-[10px] text-ink-tertiary">Entra dinero</div>
                    </div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, direction: 'DEBIT' })}
                  className={`p-3 rounded-xl border transition-all text-left ${
                    form.direction === 'DEBIT'
                      ? 'border-red-500/40 bg-red-500/10'
                      : 'border-edge-subtle bg-edge-subtle hover:bg-edge'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <ArrowUpRight className={`w-4 h-4 ${form.direction === 'DEBIT' ? 'text-red-600 dark:text-red-400' : 'text-ink-tertiary'}`} />
                    <div>
                      <div className="text-xs font-semibold text-ink-primary">Egreso</div>
                      <div className="text-[10px] text-ink-tertiary">Sale dinero</div>
                    </div>
                  </div>
                </button>
              </div>
            </Field>

            {/* Fecha y monto */}
            <div className="grid grid-cols-2 gap-3">
              <Field label="Fecha" required>
                <input
                  type="date"
                  value={form.movement_date}
                  onChange={(e) => setForm({ ...form, movement_date: e.target.value })}
                  className="field"
                  required
                />
              </Field>
              <Field label="Monto" required>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  placeholder="0.00"
                  className="field"
                  required
                />
              </Field>
            </div>

            {/* Descripción */}
            <Field label="Descripción" required>
              <input
                type="text"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Ej: Transferencia recibida de cliente ABC"
                className="field"
                required
                maxLength={500}
              />
            </Field>

            {/* Beneficiario */}
            <Field label="Beneficiario / Pagador" hint="Nombre de quien recibe o envía el dinero">
              <input
                type="text"
                value={form.beneficiary}
                onChange={(e) => setForm({ ...form, beneficiary: e.target.value })}
                placeholder="Ej: Juan Pérez, Empresa ABC S.A."
                className="field"
                maxLength={200}
              />
            </Field>

            {/* Cuenta contable */}
            <Field label="Cuenta contable" hint="Cuenta del plan de cuentas asociada al movimiento">
              <select
                value={form.accounting_account_id}
                onChange={(e) => setForm({ ...form, accounting_account_id: e.target.value })}
                className="field"
              >
                <option value="">Sin asignar</option>
                {accountOptions.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.code} · {a.name}
                  </option>
                ))}
              </select>
            </Field>

            {/* Tipo de transacción */}
            <Field label="Tipo de transacción">
              <select
                value={form.transaction_type}
                onChange={(e) => setForm({ ...form, transaction_type: e.target.value })}
                className="field"
              >
                <option value="">Sin especificar</option>
                <option value="TRANSFER">Transferencia bancaria</option>
                <option value="CHECK">Cheque</option>
                <option value="CASH">Efectivo</option>
                <option value="CARD">Tarjeta de débito/crédito</option>
                <option value="DEPOSIT">Depósito bancario</option>
                <option value="WITHDRAWAL">Retiro bancario</option>
                <option value="OTHER">Otro</option>
              </select>
            </Field>

            {/* Referencia */}
            <Field label="Referencia (opcional)" hint="Número de operación o comprobante del banco">
              <input
                type="text"
                value={form.reference}
                onChange={(e) => setForm({ ...form, reference: e.target.value })}
                placeholder="TRX-2026-05123"
                className="field"
                maxLength={100}
              />
            </Field>
          </div>

          <div className="flex items-center justify-end gap-2 p-4 border-t border-edge-subtle shrink-0">
            <button type="button" onClick={onClose} className="btn btn-ghost">
              Cancelar
            </button>
            <button type="submit" disabled={saving} className="btn btn-primary">
              <Save className="w-4 h-4" />
              {saving ? 'Guardando...' : 'Registrar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

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
