'use client'
import { useEffect, useState } from 'react'
import { Calendar } from 'lucide-react'
import { presetToRange, type DateRange, type PresetPeriod } from '../types'

interface Props {
  value: DateRange
  onChange: (range: DateRange) => void
}

const PRESETS: Array<{ id: PresetPeriod; label: string }> = [
  { id: 'this_month', label: 'Este mes' },
  { id: 'last_month', label: 'Mes anterior' },
  { id: 'last_30d', label: 'Últimos 30 días' },
  { id: 'last_90d', label: 'Últimos 90 días' },
  { id: 'this_year', label: 'Este año' },
  { id: 'custom', label: 'Personalizado' },
]

/**
 * Filtro de rango de fechas con presets + custom.
 *
 * Lo monta cada tab en la parte de arriba del reporte. Cuando cambia,
 * el componente padre vuelve a llamar a la API.
 */
export function DateRangeFilter({ value, onChange }: Props) {
  const [activePreset, setActivePreset] = useState<PresetPeriod>('this_month')

  const handlePreset = (preset: PresetPeriod) => {
    setActivePreset(preset)
    if (preset !== 'custom') {
      onChange(presetToRange(preset))
    }
  }

  return (
    <div className="card-raised rounded-xl p-3 flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-2 px-2 text-ink-tertiary">
        <Calendar className="w-3.5 h-3.5" />
        <span className="text-[11px] uppercase tracking-widest font-semibold">
          Período
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-1">
        {PRESETS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => handlePreset(id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activePreset === id
                ? 'bg-blue text-white'
                : 'text-ink-tertiary hover:text-ink-primary hover:bg-edge-subtle'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {activePreset === 'custom' && (
        <div className="flex items-center gap-2 ml-auto">
          <input
            type="date"
            value={value.from}
            onChange={(e) => onChange({ ...value, from: e.target.value })}
            className="field h-9 text-xs"
            style={{ width: 140, height: 36 }}
          />
          <span className="text-ink-tertiary text-xs">→</span>
          <input
            type="date"
            value={value.to}
            onChange={(e) => onChange({ ...value, to: e.target.value })}
            className="field h-9 text-xs"
            style={{ width: 140, height: 36 }}
          />
        </div>
      )}
    </div>
  )
}
