import { Trash2, CheckCircle2 } from 'lucide-react'
import { IVA_RATE_LABELS } from '../../types'
import { type LineForm } from '../../types'
import { type TaxCatalogItem } from '../../hooks/useTaxCatalog'

interface LineasProps {
  lines: LineForm[]
  isRetentionAgent: boolean
  retRentaOptions: TaxCatalogItem[]
  retIvaOptions: TaxCatalogItem[]
  onChange: (idx: number, field: keyof LineForm, value: string) => void
  onRemove: (idx: number) => void
}

export function LineasSection({
  lines,
  isRetentionAgent,
  retRentaOptions,
  retIvaOptions,
  onChange,
  onRemove,
}: LineasProps) {
  return (
        <div className="space-y-2">
      {/* Encabezados de columna */}
      <div className="hidden md:grid grid-cols-12 gap-2 px-3 pb-1">
        <div className="col-span-5 text-[10px] font-semibold uppercase tracking-widest text-ink-tertiary">
          Descripción
        </div>
        <div className="col-span-2 text-[10px] font-semibold uppercase tracking-widest text-ink-tertiary text-right">
          Cantidad
        </div>
        <div className="col-span-2 text-[10px] font-semibold uppercase tracking-widest text-ink-tertiary text-right">
          P. unitario
        </div>
        <div className="col-span-2 text-[10px] font-semibold uppercase tracking-widest text-ink-tertiary">
          IVA
        </div>
        <div className="col-span-1" />
      </div>
      {lines.map((line, idx) => (
        <div key={idx} className="card-raised rounded-xl p-3">
          <div className="grid grid-cols-12 gap-2 items-start">
            <div className="col-span-12 md:col-span-5">
              <input
                type="text"
                placeholder="Descripción del producto/servicio"
                value={line.description}
                onChange={(e) => onChange(idx, 'description', e.target.value)}
                className="field"
                required
              />
              <div className="flex items-center gap-2 mt-1">
                <input
                  type="text"
                  placeholder="Código (opcional)"
                  value={line.code}
                  onChange={(e) => onChange(idx, 'code', e.target.value)}
                  className="field text-xs flex-1"
                />
                {line.product_id && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-semibold whitespace-nowrap">
                    <CheckCircle2 className="w-2.5 h-2.5" />
                    Asociado
                  </span>
                )}
              </div>
            </div>
            <div className="col-span-4 md:col-span-2">
              <input type="number" step="0.0001" min="0" placeholder="Cant." value={line.quantity} onChange={(e) => onChange(idx, 'quantity', e.target.value)} className="field text-right" />
            </div>
            <div className="col-span-4 md:col-span-2">
              <input type="number" step="0.0001" min="0" placeholder="Precio" value={line.unit_price} onChange={(e) => onChange(idx, 'unit_price', e.target.value)} className="field text-right" />
            </div>
            <div className="col-span-3 md:col-span-2">
              <select value={line.iva_rate_code} onChange={(e) => onChange(idx, 'iva_rate_code', e.target.value)} className="field text-xs">
                {Object.entries(IVA_RATE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div className="col-span-1">
              <button type="button" onClick={() => onRemove(idx)} disabled={lines.length === 1} className="p-2 rounded-lg text-red-500 hover:bg-red-500/10 disabled:opacity-30 disabled:cursor-not-allowed">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            {/* Retenciones por línea */}
            {isRetentionAgent && (
              <div className="col-span-12 grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
                <div>
                  <label className="block text-[10px] text-ink-tertiary mb-1">R. Fuente</label>
                  <select
                    value={line.ret_renta_code ?? ''}
                    onChange={(e) => {
                      const selected = retRentaOptions.find(r => r.code === e.target.value)
                      onChange(idx, 'ret_renta_code', e.target.value)
                      if (selected?.percentage) onChange(idx, 'ret_renta_pct', String(selected.percentage))
                    }}
                    className="field text-xs"
                  >
                    <option value="">Sin retención</option>
                    {retRentaOptions.map((r) => (
                      <option key={r.code} value={r.code}>{r.code} — {r.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-ink-tertiary mb-1">% R. Fuente</label>
                  <input
                    type="number"
                    step="0.01"
                    value={line.ret_renta_pct ?? ''}
                    onChange={(e) => onChange(idx, 'ret_renta_pct', e.target.value)}
                    className="field text-xs text-right"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-ink-tertiary mb-1">R. IVA</label>
                  <select
                    value={line.ret_iva_code ?? ''}
                    onChange={(e) => {
                      const selected = retIvaOptions.find(r => r.code === e.target.value)
                      onChange(idx, 'ret_iva_code', e.target.value)
                      if (selected?.percentage) onChange(idx, 'ret_iva_pct', String(selected.percentage))
                    }}
                    className="field text-xs"
                  >
                    <option value="">Sin retención</option>
                    {retIvaOptions.map((r) => (
                      <option key={r.code} value={r.code}>{r.code} — {r.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-ink-tertiary mb-1">% R. IVA</label>
                  <input
                    type="number"
                    step="0.01"
                    value={line.ret_iva_pct ?? ''}
                    onChange={(e) => onChange(idx, 'ret_iva_pct', e.target.value)}
                    className="field text-xs text-right"
                    placeholder="0.00"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
