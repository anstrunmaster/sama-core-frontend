'use client'
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react'
import { MESES_ES, getCurrentPeriod, getPreviousPeriod, type TaxPeriod } from '../types'

interface Props {
  value: TaxPeriod
  onChange: (period: TaxPeriod) => void
}

/**
 * Selector de mes/año con navegación de flechas.
 * Permite ir al mes anterior/siguiente o saltar al período actual.
 */
export function PeriodSelector({ value, onChange }: Props) {
  const current = getCurrentPeriod()
  const isCurrent =
    value.year === current.year && value.month === current.month

  const goPrev = () => onChange(getPreviousPeriod(value))

  const goNext = () => {
    if (isCurrent) return // No avanzar más allá del mes actual
    if (value.month === 12) {
      onChange({ year: value.year + 1, month: 1 })
    } else {
      onChange({ year: value.year, month: value.month + 1 })
    }
  }

  // Lista de años recientes
  const years = Array.from({ length: 5 }, (_, i) => current.year - i)

  return (
    <div className="card-raised rounded-xl p-3 flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-2 px-2 text-ink-tertiary">
        <Calendar className="w-3.5 h-3.5" />
        <span className="text-[11px] uppercase tracking-widest font-semibold">
          Período fiscal
        </span>
      </div>

      <div className="flex items-center gap-1 flex-1">
        <button
          onClick={goPrev}
          className="p-2 rounded-lg text-ink-tertiary hover:text-ink-primary hover:bg-edge-subtle transition-all"
          title="Mes anterior"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <select
          value={value.month}
          onChange={(e) => onChange({ ...value, month: Number(e.target.value) })}
          className="field h-9 text-sm font-medium"
          style={{ width: 140, height: 36 }}
        >
          {MESES_ES.map((m, i) => (
            <option key={m} value={i + 1}>{m}</option>
          ))}
        </select>

        <select
          value={value.year}
          onChange={(e) => onChange({ ...value, year: Number(e.target.value) })}
          className="field h-9 text-sm font-medium"
          style={{ width: 100, height: 36 }}
        >
          {years.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>

        <button
          onClick={goNext}
          disabled={isCurrent}
          className="p-2 rounded-lg text-ink-tertiary hover:text-ink-primary hover:bg-edge-subtle transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          title="Mes siguiente"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {!isCurrent && (
        <button
          onClick={() => onChange(current)}
          className="text-xs text-blue hover:underline px-2"
        >
          Ir al mes actual
        </button>
      )}
    </div>
  )
}
