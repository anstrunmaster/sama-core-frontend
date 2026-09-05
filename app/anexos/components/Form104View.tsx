'use client'
import { useEffect, useState } from 'react'
import { Receipt, AlertCircle, Info, FileText, Printer, ShoppingCart } from 'lucide-react'
import { taxReportsApi, fmtMoney, fmtNumber } from '../api'
import { periodLabel, type Form104Response, type TaxPeriod } from '../types'

interface Props {
  period: TaxPeriod
}

/**
 * Visor del Formulario 104 con casilleros oficiales del SRI.
 * v2: incluye casilleros de compras (500-599) con valores reales.
 */
export function Form104View({ period }: Props) {
  const [data, setData] = useState<Form104Response | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    taxReportsApi
      .form104(period)
      .then((d) => { if (!cancelled) setData(d) })
      .catch((e) => { if (!cancelled) setError(e.message || 'Error') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [period.year, period.month])

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="card rounded-2xl p-6 h-32 animate-pulse" />
        <div className="card rounded-2xl p-6 h-64 animate-pulse" />
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

  if (!data) return null

  const saldoFavor = data.casilleros['699']?.value ?? 0
  const ivaAPagar = data.casilleros['609']?.value ?? 0
  const isCreditPosition = saldoFavor > 0

  return (
    <div className="space-y-4">
      {/* Header del formulario */}
      <div className="card rounded-2xl p-5">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-ink-tertiary font-semibold mb-1">
              Formulario 104
            </div>
            <h2 className="text-base font-bold text-ink-primary">
              Declaración del Impuesto al Valor Agregado
            </h2>
            <div className="text-xs text-ink-tertiary mt-1">
              {data.tenant.name} · RUC {data.tenant.ruc} · {periodLabel(period)}
            </div>
          </div>
          <button onClick={() => window.print()} className="btn btn-ghost" title="Imprimir">
            <Printer className="w-4 h-4" />
            Imprimir
          </button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-5 pt-5 border-t border-edge-subtle">
          <Stat label="Facturas autorizadas" value={fmtNumber(data.invoice_count)} />
          <Stat label="Compras registradas" value={fmtNumber(data.purchase_count ?? 0)} />
          <Stat label="Total facturado" value={fmtMoney(data.total_invoiced)} />
          <Stat
            label={isCreditPosition ? 'Saldo a favor' : 'IVA a pagar'}
            value={fmtMoney(isCreditPosition ? saldoFavor : ivaAPagar)}
            highlight
            variant={isCreditPosition ? 'success' : 'primary'}
          />
        </div>
      </div>

      {/* Casilleros — VENTAS */}
      <FormSection title="Ventas y operaciones gravadas">
        <CasilleroRow code="401" data={data.casilleros['401']} />
        <CasilleroRow code="403" data={data.casilleros['403']} />
        <CasilleroRow code="409" data={data.casilleros['409']} />
        <CasilleroRow code="411" data={data.casilleros['411']} />
        <CasilleroRow code="413" data={data.casilleros['413']} />
        <CasilleroRow code="415" data={data.casilleros['415']} />
        <CasilleroRow code="429" data={data.casilleros['429']} subtotal />
      </FormSection>

      {/* Casilleros — IVA */}
      <FormSection title="Impuesto causado en ventas">
        <CasilleroRow code="421" data={data.casilleros['421']} highlight />
      </FormSection>

      {/* Detalle por tarifa - VENTAS */}
      {data.breakdown_by_rate && data.breakdown_by_rate.length > 0 && (
        <div className="card rounded-2xl">
          <div className="p-5 border-b border-edge-subtle">
            <h3 className="text-sm font-semibold text-ink-primary">
              Desglose del IVA cobrado por tarifa
            </h3>
          </div>
          <RateTable rows={data.breakdown_by_rate} />
        </div>
      )}

      {/* Casilleros — COMPRAS (v2: con datos reales) */}
      <FormSection
        title="Compras y crédito tributario"
        icon={ShoppingCart}
        empty={(data.purchase_count ?? 0) === 0}
      >
        <CasilleroRow code="500" data={data.casilleros['500']} />
        <CasilleroRow code="507" data={data.casilleros['507']} />
        <CasilleroRow code="511" data={data.casilleros['511']} />
        <CasilleroRow code="513" data={data.casilleros['513']} />
        <CasilleroRow code="521" data={data.casilleros['521']} highlight />
        <CasilleroRow code="531" data={data.casilleros['531']} subtotal />
      </FormSection>

      {/* Detalle por tarifa - COMPRAS */}
      {data.purchases_breakdown_by_rate && data.purchases_breakdown_by_rate.length > 0 && (
        <div className="card rounded-2xl">
          <div className="p-5 border-b border-edge-subtle">
            <h3 className="text-sm font-semibold text-ink-primary">
              Desglose del IVA pagado en compras por tarifa
            </h3>
          </div>
          <RateTable rows={data.purchases_breakdown_by_rate} />
        </div>
      )}

      {/* Casilleros — RESULTADO */}
      <FormSection title="Resultado de la declaración">
        <CasilleroRow code="601" data={data.casilleros['601']} subtotal />
        <CasilleroRow code="605" data={data.casilleros['605']} />
        {!isCreditPosition && <CasilleroRow code="609" data={data.casilleros['609']} highlight />}
        {isCreditPosition && (
          <CasilleroRow code="699" data={data.casilleros['699']} highlight variant="success" />
        )}
      </FormSection>

      {/* Notas */}
      <div className="card rounded-xl p-4 bg-blue-muted border-blue/20">
        <div className="flex items-start gap-2">
          <Info className="w-4 h-4 text-blue mt-0.5 flex-shrink-0" />
          <div className="text-[11px] text-ink-secondary leading-relaxed space-y-1">
            {data.notes.map((note, i) => (
              <p key={i}>· {note}</p>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// Subcomponentes
// ─────────────────────────────────────────────────────────────────

function Stat({
  label, value, highlight, variant = 'primary',
}: { label: string; value: string; highlight?: boolean; variant?: 'primary' | 'success' }) {
  const color = variant === 'success' ? 'text-emerald-600 dark:text-emerald-400' : 'text-blue'
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-ink-tertiary font-medium mb-1">
        {label}
      </div>
      <div className={`text-lg font-bold tracking-tight ${highlight ? color : 'text-ink-primary'}`}>
        {value}
      </div>
    </div>
  )
}

function FormSection({
  title, children, icon: Icon, empty,
}: { title: string; children: React.ReactNode; icon?: any; empty?: boolean }) {
  return (
    <div className={`card rounded-2xl ${empty ? 'opacity-60' : ''}`}>
      <div className="p-4 border-b border-edge-subtle bg-surface-raised flex items-center gap-2">
        {Icon && <Icon className="w-3.5 h-3.5 text-ink-tertiary" />}
        <h3 className="text-xs font-bold uppercase tracking-widest text-ink-secondary">
          {title}
          {empty && (
            <span className="ml-2 text-[10px] normal-case tracking-normal text-ink-tertiary font-medium">
              · sin compras en el período
            </span>
          )}
        </h3>
      </div>
      <div className="divide-y divide-edge-subtle">
        {children}
      </div>
    </div>
  )
}

function CasilleroRow({
  code, data, subtotal, highlight, variant = 'primary',
}: {
  code: string
  data?: { label: string; value: number }
  subtotal?: boolean
  highlight?: boolean
  variant?: 'primary' | 'success'
}) {
  if (!data) return null

  const highlightColor = variant === 'success'
    ? 'text-emerald-600 dark:text-emerald-400'
    : 'text-blue'

  return (
    <div className={`flex items-center justify-between px-4 py-3 ${
      highlight
        ? variant === 'success' ? 'bg-emerald-500/5' : 'bg-blue-muted'
        : subtotal ? 'bg-edge-subtle' : ''
    }`}>
      <div className="flex items-center gap-3">
        <span className="font-mono text-[10px] font-bold px-2 py-1 rounded bg-edge text-ink-secondary">
          {code}
        </span>
        <span className={`text-sm ${
          highlight ? `font-bold ${highlightColor}`
          : subtotal ? 'font-semibold text-ink-primary'
          : 'text-ink-secondary'
        }`}>
          {data.label}
        </span>
      </div>
      <span className={`text-sm font-mono ${
        highlight ? `${highlightColor} font-bold text-base`
        : subtotal ? 'text-ink-primary font-bold'
        : 'text-ink-secondary font-medium'
      }`}>
        {fmtMoney(data.value)}
      </span>
    </div>
  )
}

function RateTable({ rows }: { rows: Array<{ rate: string; sri_code: string; base: number; iva: number }> }) {
  return (
    <table className="w-full">
      <thead className="bg-surface-raised">
        <tr className="border-b border-edge-subtle">
          {['Tarifa', 'Base imponible', 'IVA'].map((h) => (
            <th key={h} className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-ink-tertiary">
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.sri_code} className="border-b border-edge-subtle hover:bg-edge-subtle transition-colors">
            <td className="px-4 py-3 text-sm font-medium text-ink-primary">{r.rate}</td>
            <td className="px-4 py-3 text-sm text-ink-secondary">{fmtMoney(r.base)}</td>
            <td className="px-4 py-3 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
              {fmtMoney(r.iva)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
