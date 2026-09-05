'use client'
import { useCallback, useEffect, useState } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Banknote, Clock, CheckCircle2 } from 'lucide-react'
import { bankApi } from './api'
import type { BankAccount } from './types'
import { BankSummaryCards } from './components/BankSummaryCards'
import { BankAccountsTab } from './components/BankAccountsTab'
import { BankMovementsTab } from './components/BankMovementsTab'
import { ReconciliationTab } from './components/ReconciliationTab'

type Tab = 'accounts' | 'movements' | 'reconciliation'

const TABS: Array<{ id: Tab; label: string; icon: typeof Banknote }> = [
  { id: 'accounts', label: 'Cuentas', icon: Banknote },
  { id: 'movements', label: 'Movimientos', icon: Clock },
  { id: 'reconciliation', label: 'Conciliación', icon: CheckCircle2 },
]

export default function BancoPage() {
  const [activeTab, setActiveTab] = useState<Tab>('accounts')

  // refreshKey: incrementar para forzar recarga global (resumen + tabs)
  const [refreshKey, setRefreshKey] = useState(0)
  const triggerRefresh = useCallback(() => setRefreshKey((k) => k + 1), [])

  // Cuentas compartidas entre tabs (para evitar refetch en cada tab)
  const [accounts, setAccounts] = useState<BankAccount[]>([])

  useEffect(() => {
    bankApi
      .listAccounts({ limit: 200, is_active: true })
      .then((res) => setAccounts(res.data || []))
      .catch(() => setAccounts([]))
  }, [refreshKey])

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-xl font-bold text-ink-primary tracking-tight">
            Banco
          </h1>
          <p className="text-sm text-ink-tertiary mt-0.5">
            Gestión de cuentas bancarias, movimientos y conciliación con facturas
          </p>
        </div>

        {/* KPIs */}
        <BankSummaryCards refreshKey={refreshKey} />

        {/* Tabs */}
        <div className="flex items-center gap-1 border-b border-edge-subtle">
          {TABS.map(({ id, label, icon: Icon }) => {
            const active = activeTab === id
            return (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`relative flex items-center gap-2 px-4 py-3 text-xs font-semibold transition-all ${
                  active
                    ? 'text-ink-primary'
                    : 'text-ink-tertiary hover:text-ink-secondary'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
                {active && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue" />
                )}
              </button>
            )
          })}
        </div>

        {/* Contenido del tab */}
        <div className="animate-fade-in">
          {activeTab === 'accounts' && (
            <BankAccountsTab
              refreshKey={refreshKey}
              onChange={triggerRefresh}
            />
          )}
          {activeTab === 'movements' && (
            <BankMovementsTab
              accounts={accounts}
              refreshKey={refreshKey}
              onChange={triggerRefresh}
            />
          )}
          {activeTab === 'reconciliation' && (
            <ReconciliationTab
              accounts={accounts}
              refreshKey={refreshKey}
              onChange={triggerRefresh}
            />
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
