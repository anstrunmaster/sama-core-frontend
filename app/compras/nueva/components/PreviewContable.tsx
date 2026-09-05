import Link from 'next/link'
import { AlertCircle, Loader2 } from 'lucide-react'
import { fmtMoney } from '../../api'
import { type ExpenseAccount } from '../../types'

interface PreviewContableProps {
  expenseAccountId: string
  expenseAccounts: ExpenseAccount[]
  loadingPreview: boolean
  accountingPreview: any
}

export function PreviewContable({
  expenseAccountId,
  expenseAccounts,
  loadingPreview,
  accountingPreview,
}: PreviewContableProps) {
  if (!expenseAccountId) {
    return (
      <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-400">
        <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
        <span>No es posible generar la vista previa porque esta compra aún no tiene una cuenta contable asignada.</span>
      </div>
    )
  }

  if (loadingPreview) {
    return (
      <div className="flex items-center gap-2 py-4 text-xs text-ink-tertiary">
        <Loader2 className="w-4 h-4 animate-spin" /> Calculando cuentas...
      </div>
    )
  }

  if (!accountingPreview) return null

  return (
    <div className="space-y-3">
      {!accountingPreview.allConfigured && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-400">
          <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <span>Algunas cuentas no están configuradas. <Link href="/contabilidad/mapeo" className="underline font-semibold">Ir a Mapeo de cuentas →</Link></span>
        </div>
      )}
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-edge-subtle">
            <th className="text-left py-2 px-3 text-[10px] uppercase tracking-widest text-ink-tertiary font-semibold">Cuenta</th>
            <th className="text-left py-2 px-3 text-[10px] uppercase tracking-widest text-ink-tertiary font-semibold">Descripción</th>
            <th className="text-right py-2 px-3 text-[10px] uppercase tracking-widest text-ink-tertiary font-semibold">Débito</th>
            <th className="text-right py-2 px-3 text-[10px] uppercase tracking-widest text-ink-tertiary font-semibold">Crédito</th>
          </tr>
        </thead>
        <tbody>
          {accountingPreview.lines.map((line: any, idx: number) => (
            <tr key={idx} className="border-b border-edge-subtle last:border-0">
              <td className="py-2.5 px-3">
                {line.mapping_key === 'EXPENSE_DEFAULT' ? (
                  <div>
                    <span className="font-mono text-ink-primary">{expenseAccounts.find(a => a.id === expenseAccountId)?.code ?? line.code ?? '—'}</span>
                    <span className="ml-2 text-ink-secondary">{expenseAccounts.find(a => a.id === expenseAccountId)?.name ?? line.name ?? '—'}</span>
                  </div>
                ) : line.configured ? (
                  <div>
                    <span className="font-mono text-ink-primary">{line.code}</span>
                    <span className="ml-2 text-ink-secondary">{line.name}</span>
                  </div>
                ) : (
                  <span className="text-amber-600 dark:text-amber-400">{line.name}</span>
                )}
              </td>
              <td className="py-2.5 px-3 text-ink-tertiary">{line.description}</td>
              <td className="py-2.5 px-3 text-right tabular-nums text-ink-primary">{line.type === 'DEBIT' ? fmtMoney(line.amount) : '—'}</td>
              <td className="py-2.5 px-3 text-right tabular-nums text-ink-primary">{line.type === 'CREDIT' ? fmtMoney(line.amount) : '—'}</td>
            </tr>
          ))}
          <tr className="border-t-2 border-edge bg-surface-raised">
            <td colSpan={2} className="py-2 px-3 text-xs font-semibold text-ink-secondary">Totales</td>
            <td className="py-2 px-3 text-right tabular-nums font-bold text-ink-primary">{fmtMoney(accountingPreview.total_debit)}</td>
            <td className="py-2 px-3 text-right tabular-nums font-bold text-ink-primary">{fmtMoney(accountingPreview.total_credit)}</td>
          </tr>
        </tbody>
      </table>
      <p className="text-[11px] text-ink-tertiary pt-1">
        Este asiento se generará automáticamente al registrar la compra. Para cambiar las cuentas, <Link href="/contabilidad/mapeo" className="underline">configura el mapeo contable</Link>.
      </p>
    </div>
  )
}