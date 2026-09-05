import { Plus, X, Sparkles, Info } from 'lucide-react'
import { fmtMoney } from '../../api'
import { type RetentionForm, type RetentionTypeT } from '../../types'
import { type RetentionSuggestions } from '../../types'

interface RetencionesProps {
  retentions: RetentionForm[]
  retentionInfo: RetentionSuggestions | null
  onAdd: () => void
  onRemove: (idx: number) => void
  onChange: (idx: number, field: keyof RetentionForm, value: string) => void
}

export function RetencionesSection({
  retentions,
  retentionInfo,
  onAdd,
  onRemove,
  onChange,
}: RetencionesProps) {
  return (
    <>
      {retentionInfo && retentionInfo.applies && retentionInfo.suggestions.length > 0 && (
        <div className="card-raised rounded-xl p-3 flex items-start gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-blue mt-0.5 flex-shrink-0" />
          <div className="text-[11px] text-ink-secondary leading-relaxed">
            <strong className="text-ink-primary">Retenciones sugeridas automáticamente</strong> según el tipo de proveedor y tu condición de agente de retención.
          </div>
        </div>
      )}
      {retentionInfo && !retentionInfo.applies && (
        <div className="card-raised rounded-xl p-3 flex items-start gap-2 mb-3">
          <Info className="w-4 h-4 text-ink-tertiary mt-0.5 flex-shrink-0" />
          <div className="text-[11px] text-ink-secondary">{retentionInfo.reason}</div>
        </div>
      )}
      {retentions.length === 0 ? (
        <div className="text-center py-6 text-xs text-ink-tertiary">No hay retenciones aplicadas</div>
      ) : (
        <div className="space-y-2">
          {retentions.map((r, idx) => {
            const amount = ((parseFloat(r.base_amount) || 0) * (parseFloat(r.rate_pct) || 0)) / 100
            return (
              <div key={idx} className="card-raised rounded-xl p-3">
                <div className="grid grid-cols-12 gap-2 items-start">
                  <div className="col-span-3 md:col-span-2">
                    <select value={r.type} onChange={(e) => onChange(idx, 'type', e.target.value)} className="field">
                      <option value="RENTA">Renta</option>
                      <option value="IVA">IVA</option>
                    </select>
                  </div>
                  <div className="col-span-3 md:col-span-2">
                    <input type="text" placeholder="Código" value={r.code} onChange={(e) => onChange(idx, 'code', e.target.value)} className="field font-mono text-xs" required />
                  </div>
                  <div className="col-span-12 md:col-span-3">
                    <input type="text" placeholder="Descripción" value={r.description} onChange={(e) => onChange(idx, 'description', e.target.value)} className="field text-xs" />
                  </div>
                  <div className="col-span-4 md:col-span-2">
                    <input type="number" step="0.01" min="0" placeholder="Base" value={r.base_amount} onChange={(e) => onChange(idx, 'base_amount', e.target.value)} className="field text-right text-xs" />
                  </div>
                  <div className="col-span-4 md:col-span-1">
                    <input type="number" step="0.01" min="0" placeholder="%" value={r.rate_pct} onChange={(e) => onChange(idx, 'rate_pct', e.target.value)} className="field text-right text-xs" />
                  </div>
                  <div className="col-span-3 md:col-span-1 flex items-center gap-1">
                    <span className="text-xs font-mono text-amber-600 dark:text-amber-400 truncate">{fmtMoney(amount)}</span>
                    <button type="button" onClick={() => onRemove(idx)} className="p-1 rounded text-red-500 hover:bg-red-500/10">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}