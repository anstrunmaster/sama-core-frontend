'use client'
import { useEffect, useState } from 'react'
import {
  Wallet, Banknote, AlertCircle, FileSearch, RefreshCw,
} from 'lucide-react'
import { bankApi, fmtMoney } from '../api'
import type { BankSummary } from '../types'

interface Props {
  /**
   * Cuándo el padre cambia este valor, el componente recarga el resumen.
   * Sirve para refrescar después de crear/editar cuentas o movimientos.
   */
  refreshKey?: number
}

/**
 * Cards de resumen del módulo Banco.
 * Se monta arriba de los tabs y muestra los datos más importantes de un vistazo.
 */
export function BankSummaryCards({ refreshKey = 0 }: Props) {
  const [summary, setSummary] = useState<BankSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    bankApi
      .getSummary()
      .then((data) => { if (!cancelled) setSummary(data) })
      .catch((e) => { if (!cancelled) setError(e.message || 'Error al cargar resumen') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [refreshKey])

  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card rounded-2xl p-5 animate-pulse">
            <div className="h-3 bg-edge-subtle rounded w-24 mb-4" />
            <div className="h-8 bg-edge-subtle rounded w-32" />
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="card rounded-xl p-4 flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
        <AlertCircle className="w-4 h-4" />
        {error}
      </div>
    )
  }

  if (!summary) return null

  // Saldo total en USD (caso típico Ecuador). Si hay otras monedas, mostramos solo el USD aquí.
  const totalUsd = summary.balances_by_currency['USD'] ?? 0
  const otherCurrencies = Object.keys(summary.balances_by_currency).filter(c => c !== 'USD')

  const kpis = [
    {
      title: 'Saldo total (USD)',
      value: fmtMoney(totalUsd, 'USD'),
      icon: Wallet,
      color: '#10B981',
      sub: otherCurrencies.length > 0 ? `+ ${otherCurrencies.length} monedas` : undefined,
    },
    {
      title: 'Cuentas activas',
      value: String(summary.total_accounts),
      icon: Banknote,
      color: '#3B82F6',
    },
    {
      title: 'Movimientos pendientes',
      value: String(summary.total_pending_movements),
      icon: FileSearch,
      color: '#F59E0B',
      sub: 'sin conciliar',
    },
    {
      title: 'Por moneda',
      value: `${Object.keys(summary.balances_by_currency).length} monedas`,
      icon: RefreshCw,
      color: '#A855F7',
    },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {kpis.map((k, i) => {
        const Icon = k.icon
        return (
          <div key={i} className="card rounded-2xl p-5 hover:border-edge-strong transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-semibold uppercase tracking-widest text-ink-tertiary">
                {k.title}
              </span>
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: `${k.color}15` }}
              >
                <Icon className="w-3.5 h-3.5" style={{ color: k.color }} />
              </div>
            </div>
            <div className="text-2xl font-bold text-ink-primary tracking-tight">
              {k.value}
            </div>
            {k.sub && <div className="text-[11px] text-ink-tertiary mt-1">{k.sub}</div>}
          </div>
        )
      })}
    </div>
  )
}
