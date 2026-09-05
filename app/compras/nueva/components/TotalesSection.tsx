import { fmtMoney } from '../../api'

interface TotalRowProps {
  label: string
  value: number
  bold?: boolean
  highlight?: boolean
  negative?: boolean
}

function TotalRow({ label, value, bold, highlight, negative }: TotalRowProps) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className={`text-xs ${highlight ? 'text-blue font-semibold' : bold ? 'text-ink-primary font-semibold' : 'text-ink-secondary'}`}>
        {label}
      </span>
      <span className={`text-sm font-mono ${
        highlight ? 'text-blue font-bold text-base' :
        bold ? 'text-ink-primary font-bold' :
        negative ? 'text-red-600 dark:text-red-400' :
        'text-ink-primary'
      }`}>
        {fmtMoney(value)}
      </span>
    </div>
  )
}

interface TotalesProps {
  totals: {
    subtotal: number
    subtotal0: number
    subtotalTaxed: number
    discount: number
    iva: number
    total: number
    retentionRenta: number
    retentionIva: number
    netPayable: number
  }
}

export function TotalesSection({ totals }: TotalesProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
      <TotalRow label="Subtotal sin impuestos" value={totals.subtotal} />
      <TotalRow label="Subtotal 0%" value={totals.subtotal0} />
      <TotalRow label="Subtotal gravado IVA" value={totals.subtotalTaxed} />
      <TotalRow label="Descuento" value={totals.discount} negative />
      <TotalRow label="IVA cobrado" value={totals.iva} />
      <TotalRow label="Total factura" value={totals.total} bold />
      <TotalRow label="(-) Retención RENTA" value={totals.retentionRenta} negative />
      <TotalRow label="(-) Retención IVA" value={totals.retentionIva} negative />
      <div className="md:col-span-2 mt-3 pt-3 border-t border-edge-subtle">
        <TotalRow label="Neto a pagar al proveedor" value={totals.netPayable} highlight />
      </div>
    </div>
  )
}