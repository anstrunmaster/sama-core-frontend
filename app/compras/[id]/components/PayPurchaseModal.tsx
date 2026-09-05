'use client'
import { useState } from 'react'
import {
  X, Banknote, Loader2, AlertCircle, Calendar, FileText, Wallet,
  CreditCard, CheckCircle2,
} from 'lucide-react'
import { purchasesApi, fmtMoney } from '../../api'
import type { Purchase } from '../../types'

interface BankAccountLite {
  id: string
  name: string
  bank_name?: string | null
  account_number?: string | null
  currency?: string | null
  current_balance?: string | number | null
  is_active?: boolean
}

interface Props {
  purchase: Purchase
  bankAccounts: BankAccountLite[]
  onClose: () => void
  onPaid: (updated: Purchase) => void
}

/**
 * Modal de pago de compra.
 *
 * Pasos:
 *  1. Mostrar resumen de la compra (proveedor, neto a pagar)
 *  2. Seleccionar cuenta bancaria
 *  3. Confirmar fecha + referencia opcional
 *  4. Generar movimiento DEBIT + status PAID
 */
export function PayPurchaseModal({ purchase, bankAccounts, onClose, onPaid }: Props) {
  const [selectedAccountId, setSelectedAccountId] = useState<string>(
    bankAccounts.find((a) => a.is_active !== false)?.id ?? '',
  )
  const [paymentDate, setPaymentDate] = useState<string>(
    new Date().toISOString().slice(0, 10),
  )
  const [reference, setReference] = useState('')
  const [notes, setNotes] = useState('')

  const [paying, setPaying] = useState(false)
  const [error, setError] = useState('')

  const netPayable = parseFloat(purchase.net_payable) || 0
  const selectedAccount = bankAccounts.find((a) => a.id === selectedAccountId)
  const accountBalance =
    selectedAccount?.current_balance !== undefined && selectedAccount?.current_balance !== null
      ? parseFloat(String(selectedAccount.current_balance))
      : null
  const balanceAfter = accountBalance !== null ? accountBalance - netPayable : null
  const isOverdraft = balanceAfter !== null && balanceAfter < 0

  async function handlePay() {
    if (!selectedAccountId) {
      setError('Seleccioná una cuenta bancaria')
      return
    }

    setPaying(true)
    setError('')

    try {
      const result: any = await purchasesApi.pay(purchase.id, {
        bank_account_id: selectedAccountId,
        payment_date: paymentDate,
        reference: reference.trim() || undefined,
        notes: notes.trim() || undefined,
      })

      // El backend devuelve { purchase, movement }
      const updated: Purchase = result?.purchase ?? result
      onPaid(updated)
    } catch (e: any) {
      setError(e.message || 'Error al procesar el pago')
      setPaying(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="card-raised rounded-2xl shadow-2xl max-w-lg w-full my-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-edge-subtle">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <Banknote className="w-4 h-4 text-emerald-500" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-ink-primary">
                Pagar compra
              </h2>
              <p className="text-[11px] text-ink-tertiary">
                Genera el movimiento bancario y cambia el status a PAGADA
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={paying}
            className="p-2 rounded-lg text-ink-tertiary hover:text-ink-primary hover:bg-edge-subtle transition-all disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-5">
          {/* Resumen de la compra */}
          <div className="card rounded-xl p-4 bg-edge-subtle">
            <div className="flex items-start gap-3">
              <FileText className="w-4 h-4 text-ink-tertiary mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-[10px] uppercase tracking-widest text-ink-tertiary font-bold mb-1">
                  Pagar a
                </div>
                <div className="text-sm font-semibold text-ink-primary truncate">
                  {purchase.supplier?.legal_name ?? 'Proveedor'}
                </div>
                <div className="text-xs text-ink-tertiary font-mono mt-1">
                  {purchase.establishment}-{purchase.emission_point}-{purchase.sequential}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] uppercase tracking-widest text-ink-tertiary font-bold mb-1">
                  Neto a pagar
                </div>
                <div className="text-xl font-bold text-blue">
                  {fmtMoney(netPayable)}
                </div>
              </div>
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-600 dark:text-red-400">
              <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Cuenta bancaria */}
          <div>
            <label className="text-[11px] text-ink-secondary font-medium mb-1.5 flex items-center gap-1.5">
              <Wallet className="w-3 h-3" />
              Cuenta bancaria *
            </label>
            {bankAccounts.length === 0 ? (
              <div className="card rounded-lg p-4 text-center">
                <AlertCircle className="w-5 h-5 text-amber-500 mx-auto mb-2" />
                <p className="text-xs text-ink-secondary">
                  No tenés cuentas bancarias activas.
                </p>
                <p className="text-[10px] text-ink-tertiary mt-1">
                  Andá a Banco y agregá una para poder pagar.
                </p>
              </div>
            ) : (
              <select
                value={selectedAccountId}
                onChange={(e) => setSelectedAccountId(e.target.value)}
                className="field w-full text-sm"
                disabled={paying}
              >
                <option value="">— Seleccioná una cuenta —</option>
                {bankAccounts.map((a) => (
                  <option key={a.id} value={a.id} disabled={a.is_active === false}>
                    {a.name}
                    {a.bank_name ? ` · ${a.bank_name}` : ''}
                    {a.account_number ? ` (${a.account_number.slice(-4)})` : ''}
                    {a.is_active === false ? ' [inactiva]' : ''}
                  </option>
                ))}
              </select>
            )}

            {/* Saldo de cuenta (si tenemos balance) */}
            {selectedAccount && accountBalance !== null && (
              <div className="mt-2 flex items-center justify-between text-[11px]">
                <span className="text-ink-tertiary">
                  Saldo actual: <strong className="text-ink-primary">{fmtMoney(accountBalance)}</strong>
                </span>
                {balanceAfter !== null && (
                  <span
                    className={
                      isOverdraft
                        ? 'text-red-600 dark:text-red-400 font-semibold'
                        : 'text-ink-tertiary'
                    }
                  >
                    Saldo después: <strong>{fmtMoney(balanceAfter)}</strong>
                  </span>
                )}
              </div>
            )}

            {isOverdraft && (
              <div className="mt-2 flex items-start gap-2 px-2.5 py-1.5 rounded-lg bg-red-500/5 border border-red-500/20 text-[11px] text-red-600 dark:text-red-400">
                <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                <span>
                  El saldo de la cuenta no alcanza para cubrir el pago. Podés continuar
                  igual, pero la cuenta quedará en negativo.
                </span>
              </div>
            )}
          </div>

          {/* Fecha y referencia */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-ink-secondary font-medium mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3 h-3" />
                Fecha del pago
              </label>
              <input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                max={new Date().toISOString().slice(0, 10)}
                className="field w-full text-sm"
                disabled={paying}
              />
            </div>

            <div>
              <label className="text-[11px] text-ink-secondary font-medium mb-1.5 flex items-center gap-1.5">
                <CreditCard className="w-3 h-3" />
                Referencia (opcional)
              </label>
              <input
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                className="field w-full text-sm font-mono"
                placeholder="N° transferencia, cheque..."
                disabled={paying}
              />
            </div>
          </div>

          {/* Notas */}
          <div>
            <label className="text-[11px] text-ink-secondary font-medium mb-1.5 block">
              Notas (opcional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="field w-full text-sm resize-none"
              placeholder="Información adicional del pago..."
              disabled={paying}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-5 border-t border-edge-subtle">
          <button
            onClick={onClose}
            type="button"
            className="btn btn-ghost"
            disabled={paying}
          >
            Cancelar
          </button>
          <button
            onClick={handlePay}
            type="button"
            disabled={paying || !selectedAccountId || bankAccounts.length === 0}
            className="btn btn-primary"
          >
            {paying ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}
            Confirmar pago de {fmtMoney(netPayable)}
          </button>
        </div>
      </div>
    </div>
  )
}
