'use client'
import { useState } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { BarChart3, TrendingUp, Receipt, Activity } from 'lucide-react'
import { DateRangeFilter } from './components/DateRangeFilter'
import { FinancialSummary } from './components/FinancialSummary'
import { SalesReport } from './components/SalesReport'
import { TaxReport } from './components/TaxReport'
import { CashFlowReport } from './components/CashFlowReport'
import { presetToRange, type DateRange } from './types'

type Tab = 'summary' | 'sales' | 'tax' | 'cashflow'

const TABS: Array<{ id: Tab; label: string; icon: typeof BarChart3 }> = [
  { id: 'summary', label: 'Resumen', icon: BarChart3 },
  { id: 'sales', label: 'Ventas', icon: TrendingUp },
  { id: 'tax', label: 'IVA', icon: Receipt },
  { id: 'cashflow', label: 'Flujo de caja', icon: Activity },
]

export default function ReportesPage() {
  const [activeTab, setActiveTab] = useState<Tab>('summary')
  const [range, setRange] = useState<DateRange>(() => presetToRange('this_month'))

  return (
    <DashboardLayout>
      <div className="p-6 space-y-5">
        {/* Header */}
        <div>
          <h1 className="text-xl font-bold text-ink-primary tracking-tight">Reportes financieros</h1>
          <p className="text-sm text-ink-tertiary mt-0.5">
            Análisis de ventas, IVA y flujo de caja del período
          </p>
        </div>

        {/* Filtro de fechas (global a todos los tabs) */}
        <DateRangeFilter value={range} onChange={setRange} />

        {/* Tabs */}
        <div className="flex items-center gap-1 border-b border-edge-subtle overflow-x-auto">
          {TABS.map(({ id, label, icon: Icon }) => {
            const active = activeTab === id
            return (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`relative flex items-center gap-2 px-4 py-3 text-xs font-semibold transition-all whitespace-nowrap ${
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

        {/* Contenido */}
        <div className="animate-fade-in">
          {activeTab === 'summary' && <FinancialSummary range={range} />}
          {activeTab === 'sales' && <SalesReport range={range} />}
          {activeTab === 'tax' && <TaxReport range={range} />}
          {activeTab === 'cashflow' && <CashFlowReport range={range} />}
        </div>
      </div>
    </DashboardLayout>
  )
}
