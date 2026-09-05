'use client'
import { useState } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Eye, FileBadge, FileCode } from 'lucide-react'
import { PeriodSelector } from './components/PeriodSelector'
import { TaxOverview } from './components/TaxOverview'
import { Form104View } from './components/Form104View'
import { AtsDownload } from './components/AtsDownload'
import { getCurrentPeriod, getPreviousPeriod, type TaxPeriod } from './types'
import { Form103View } from './components/Form103View'
import { Form101View } from './components/Form101View'
type Tab = 'overview' | 'form103' | 'form104' | 'ats' | 'form101'
const TABS: Array<{ id: Tab; label: string; icon: typeof Eye }> = [
  { id: 'overview', label: 'Vista previa',      icon: Eye },
  { id: 'form103',  label: 'Formulario 103',    icon: FileBadge },
  { id: 'form104',  label: 'Formulario 104',    icon: FileBadge },
  { id: 'ats',      label: 'ATS (XML SRI)',      icon: FileCode },
  { id: 'form101',  label: 'Formulario 101 IR', icon: FileBadge },
]

export default function AnexosPage() {
  // Por defecto: período anterior (lo que toca declarar este mes)
  const [period, setPeriod] = useState<TaxPeriod>(() => getPreviousPeriod(getCurrentPeriod()))
  const [activeTab, setActiveTab] = useState<Tab>('overview')

  return (
    <DashboardLayout>
      <div className="p-6 space-y-5">
        {/* Header */}
        <div>
          <h1 className="text-xl font-bold text-ink-primary tracking-tight">
            Anexos e Impuestos
          </h1>
          <p className="text-sm text-ink-tertiary mt-0.5">
            Vista previa del período, Formulario 104 y generación del ATS XML para el SRI
          </p>
        </div>

        {/* Selector de período */}
        <PeriodSelector value={period} onChange={setPeriod} />

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
          {activeTab === 'overview' && <TaxOverview period={period} />}
          {activeTab === 'form103' && <Form103View period={period} />}
          {activeTab === 'form104' && <Form104View period={period} />}
          {activeTab === 'ats' && <AtsDownload period={period} />}
          {activeTab === 'form101' && <Form101View />}
        </div>
      </div>
    </DashboardLayout>
  )
}
