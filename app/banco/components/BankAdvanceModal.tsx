'use client'
import { useState } from 'react'
import { X, Wallet, Loader2 } from 'lucide-react'
import { bankApi } from '../api'
import { type BankAccount } from '../types'

interface Props {
  open: boolean
  onClose: () => void
  accounts: BankAccount[]
  onSaved: () => void
}

const LBL = 'text-[10px] uppercase tracking-widest text-ink-tertiary font-semibold mb-1.5 block'

export function BankAdvanceModal({ open, onClose, accounts, onSaved }: Props) {
  const [type, setType]                   = useState<'CUSTOMER' | 'SUPPLIER'>('CUSTOMER')
  const [bankAccountId, setBankAccountId] = useState('')
  const [amount, setAmount]               = useState('')
  const [movementDate, setMovementDate]   = useState(new Date().toISOString().slice(0, 10))
  const [counterpartName, setCounterpartName] = useState('')
  const [notes, setNotes]                 = useState('')
  const [saving, setSaving]               = useState(false)
  const [error, setError]                 = useState('')

  const reset = () => {
    setType('CUSTOMER')
    setBankAccountId('')
    setAmount('')
    setMovementDate(new Date().toISOString().slice(0, 10))
    setCounterpartName('')
    setNotes('')
    setError('')
  }

  const handleClose = () => { reset(); onClose() }

  const handleSave = async () => {
    setError('')
    if (!bankAccountId)       { setError('Selecciona una cuenta bancaria'); return }
    if (!counterpartName.trim()) { setError('Ingresa el nombre del cliente o proveedor'); return }
    const amt = parseFloat(amount)
    if (!amt || amt <= 0)     { setError('El monto debe ser mayor a 0'); return }
    if (!movementDate)        { setError('Selecciona una fecha'); return }

    setSaving(true)
    try {
      await bankApi.createAdvance({
        type,
        bank_account_id:  bankAccountId,
        amount:           amt,
        movement_date:    movementDate,
        counterpart_name: counterpartName.trim(),
        notes:            notes.trim() || undefined,
      })
      onSaved()
      handleClose()
    } catch (e: any) {
      setError(e.message || 'Error al registrar el anticipo')
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null

  const isCustomer = type === 'CUSTOMER'

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="card-raised w-full max-w-md mx-4 p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Wallet className="w-4 h-4 text-amber-500" />
            <h3 className="text-base font-bold text-ink-primary">Registrar anticipo</h3>
          </div>
          <button onClick={handleClose} className="text-ink-tertiary hover:text-ink-primary transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4">

          {/* Tipo de anticipo */}
          <div>
            <label className={LBL}>Tipo de anticipo</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 'CUSTOMER', label: '📥 De cliente', sub: 'Entra dinero' },
                { value: 'SUPPLIER', label: '📤 A proveedor', sub: 'Sale dinero' },
              ].map(o => (
                <button key={o.value} onClick={() => setType(o.value as any)}
                  className={`py-3 px-3 rounded-xl text-left transition-all border ${
                    type === o.value
                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400'
                      : 'bg-edge-subtle border-edge text-ink-tertiary hover:text-ink-primary'
                  }`}>
                  <p className="text-xs font-semibold">{o.label}</p>
                  <p className="text-[10px] opacity-70 mt-0.5">{o.sub}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Cuenta bancaria */}
          <div>
            <label className={LBL}>Cuenta bancaria *</label>
            <select value={bankAccountId} onChange={e => setBankAccountId(e.target.value)} className="field w-full">
              <option value="">Seleccionar cuenta...</option>
              {accounts.map(a => (
                <option key={a.id} value={a.id}>{a.name} — {a.bank_name}</option>
              ))}
            </select>
          </div>

          {/* Cliente / Proveedor */}
          <div>
            <label className={LBL}>{isCustomer ? 'Cliente *' : 'Proveedor *'}</label>
            <input
              type="text"
              value={counterpartName}
              onChange={e => setCounterpartName(e.target.value)}
              placeholder={isCustomer ? 'Nombre del cliente o empresa' : 'Nombre del proveedor'}
              className="field w-full"
            />
          </div>

          {/* Monto y Fecha */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LBL}>Monto *</label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0.00"
                className="field w-full text-right"
              />
            </div>
            <div>
              <label className={LBL}>Fecha *</label>
              <input
                type="date"
                value={movementDate}
                onChange={e => setMovementDate(e.target.value)}
                className="field w-full"
              />
            </div>
          </div>

          {/* Notas */}
          <div>
            <label className={LBL}>Concepto / notas</label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Anticipo para futura compra..."
              className="field w-full"
            />
          </div>

          {/* Info contable */}
          <div className="rounded-lg bg-edge-subtle border border-edge px-3 py-2.5 text-[11px] text-ink-tertiary">
            {isCustomer
              ? '📒 Asiento: Débito Banco · Crédito Anticipos de clientes'
              : '📒 Asiento: Débito Anticipos a proveedores · Crédito Banco'
            }
          </div>

          {/* Error */}
          {error && (
            <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
          )}

          {/* Acciones */}
          <div className="flex gap-3 pt-2">
            <button onClick={handleClose}
              className="flex-1 py-2.5 rounded-lg border border-edge text-sm text-ink-secondary hover:text-ink-primary hover:border-edge-strong transition-all">
              Cancelar
            </button>
            <button onClick={handleSave} disabled={saving}
              className="flex-1 py-2.5 rounded-lg bg-amber-500 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-50 transition-all flex items-center justify-center gap-2">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wallet className="w-3.5 h-3.5" />}
              Registrar anticipo
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
