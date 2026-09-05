'use client'
import { useEffect, useState } from 'react'
import { Receipt, AlertCircle, FileBadge, Info } from 'lucide-react'
import { reportsApi, fmtMoney, fmtNumber, fmtDate } from '../api'
import type { DateRange, TaxResponse } from '../types'

interface Props {
  range: DateRange
}

const RATE_COLORS: Record<string, string> = {
  '0': '#71717A',   // 0% - gris
  '2': '#3B82F6',   // 12% - azul (legacy)
  '3': '#8B5CF6',   // 14% - violeta
  '4': '#10B981',   // 15% - verde (vigente)
  '5': '#F59E0B',   // 5%
  '6': '#71717A',   // no sujeto
  '7': '#71717A',   // exento
  '8': '#F59E0B',   // 8%
}

export function TaxReport({ range }: Props) {
  const [data, setData] = useState<TaxResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showDetail, setShowDetail] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    reportsApi
      .tax(range)
      .then((d) => { if (!cancelled) setData(d) })
      .catch((e) => { if (!cancelled) setError(e.message || 'Error') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [range.from, range.to])

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card rounded-2xl p-5 animate-pulse">
              <div className="h-3 bg-edge-subtle rounded w-20 mb-3" />
              <div className="h-8 bg-edge-subtle rounded w-28" />
            </div>
          ))}
        </div>
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

  return (
    <div className="space-y-4">
      {/* Banner informativo */}
      <div className="card rounded-xl p-3 flex items-start gap-2 bg-blue-muted border-blue/20">
        <Info className="w-4 h-4 text-blue mt-0.5 flex-shrink-0" />
        <div className="text-[11px] text-ink-secondary leading-relaxed">
          Este reporte agrupa el IVA por código de tarifa SRI. Sirve como base para
          preparar el <strong className="text-ink-primary">Anexo Transaccional Simplificado (ATS)</strong> y
          el Formulario 104 de declaración mensual de IVA.
        </div>
      </div>

      {/* Totales */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Total facturado"
          value={fmtMoney(data.totals.total_invoiced)}
          icon={Receipt}
          color="#10B981"
        />
        <KpiCard
          label="Base imponible"
          value={fmtMoney(data.totals.total_base)}
          icon={FileBadge}
          color="#3B82F6"
        />
        <KpiCard
          label="IVA cobrado"
          value={fmtMoney(data.totals.total_iva)}
          icon={Receipt}
          color="#F59E0B"
        />
        <KpiCard
          label="# Facturas"
          value={fmtNumber(data.totals.invoice_count)}
          icon={FileBadge}
          color="#A855F7"
        />
      </div>

      {/* Desglose por tarifa */}
      <div className="card rounded-2xl">
        <div className="p-5 border-b border-edge-subtle">
          <h3 className="text-sm font-semibold text-ink-primary">Desglose por tarifa</h3>
          <p className="text-[11px] text-ink-tertiary mt-0.5">
            IVA agrupado por código de porcentaje del SRI
          </p>
        </div>

        {data.summary.length === 0 ? (
          <div className="py-12 text-center">
            <Receipt className="w-8 h-8 text-ink-ghost mx-auto mb-2" />
            <p className="text-sm font-medium text-ink-primary mb-1">Sin datos</p>
            <p className="text-xs text-ink-tertiary">
              No hay facturas en este período
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-surface-raised">
                <tr className="border-b border-edge-subtle">
                  {['Código SRI', 'Tarifa', 'Base imponible', 'IVA', 'Total', '# Líneas'].map((h) => (
                    <th
                      key={h}
                      className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-ink-tertiary"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.summary.map((row) => {
                  const color = RATE_COLORS[row.sri_code] || '#71717A'
                  return (
                    <tr
                      key={row.sri_code}
                      className="border-b border-edge-subtle hover:bg-edge-subtle transition-colors"
                    >
                      <td className="px-4 py-3">
                        <span
                          className="font-mono text-[10px] font-bold px-2 py-1 rounded"
                          style={{ background: `${color}20`, color }}
                        >
                          {row.sri_code}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-ink-primary">
                        {row.label}
                      </td>
                      <td className="px-4 py-3 text-sm text-ink-secondary">
                        {fmtMoney(row.base_amount)}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium" style={{ color }}>
                        {fmtMoney(row.iva_amount)}
                      </td>
                      <td className="px-4 py-3 text-sm font-bold text-ink-primary">
                        {fmtMoney(row.total)}
                      </td>
                      <td className="px-4 py-3 text-xs text-ink-tertiary">
                        {fmtNumber(row.line_count)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="bg-surface-raised">
                  <td colSpan={2} className="px-4 py-3 text-[10px] uppercase tracking-widest text-ink-tertiary font-semibold">
                    Total general
                  </td>
                  <td className="px-4 py-3 text-sm font-bold text-ink-primary">
                    {fmtMoney(data.totals.total_base)}
                  </td>
                  <td className="px-4 py-3 text-sm font-bold text-ink-primary">
                    {fmtMoney(data.totals.total_iva)}
                  </td>
                  <td className="px-4 py-3 text-sm font-bold text-ink-primary">
                    {fmtMoney(data.totals.total_invoiced)}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Detalle por factura (colapsable) */}
      <div className="card rounded-2xl">
        <button
          onClick={() => setShowDetail(!showDetail)}
          className="w-full p-5 text-left border-b border-edge-subtle flex items-center justify-between hover:bg-edge-subtle transition-all"
        >
          <div>
            <h3 className="text-sm font-semibold text-ink-primary">
              Detalle por factura
            </h3>
            <p className="text-[11px] text-ink-tertiary mt-0.5">
              {data.detail.length} {data.detail.length === 1 ? 'factura' : 'facturas'} en el período
            </p>
          </div>
          <span className="text-xs text-blue">
            {showDetail ? 'Ocultar' : 'Mostrar'}
          </span>
        </button>

        {showDetail && (
          <div className="overflow-x-auto max-h-96 overflow-y-auto">
            <table className="w-full">
              <thead className="bg-surface-raised sticky top-0">
                <tr className="border-b border-edge-subtle">
                  {['Fecha', 'Secuencial', 'Cliente', 'Subtotal', 'IVA', 'Total'].map((h) => (
                    <th
                      key={h}
                      className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-ink-tertiary"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.detail.map((inv) => (
                  <tr
                    key={inv.invoice_id}
                    className="border-b border-edge-subtle hover:bg-edge-subtle transition-colors"
                  >
                    <td className="px-4 py-2 text-xs text-ink-secondary whitespace-nowrap">
                      {fmtDate(inv.date)}
                    </td>
                    <td className="px-4 py-2 font-mono text-xs text-ink-secondary">
                      {inv.sequential}
                    </td>
                    <td className="px-4 py-2 text-xs text-ink-primary truncate max-w-xs">
                      {inv.customer_name || '—'}
                      {inv.customer_id && (
                        <div className="text-[10px] text-ink-ghost font-mono">{inv.customer_id}</div>
                      )}
                    </td>
                    <td className="px-4 py-2 text-xs text-ink-secondary">{fmtMoney(inv.subtotal)}</td>
                    <td className="px-4 py-2 text-xs text-ink-tertiary">{fmtMoney(inv.iva)}</td>
                    <td className="px-4 py-2 text-xs font-bold text-ink-primary">{fmtMoney(inv.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function KpiCard({
  label, value, icon: Icon, color,
}: { label: string; value: string; icon: any; color: string }) {
  return (
    <div className="card rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] font-semibold uppercase tracking-widest text-ink-tertiary">
          {label}
        </span>
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ background: `${color}15` }}
        >
          <Icon className="w-3.5 h-3.5" style={{ color }} />
        </div>
      </div>
      <div className="text-2xl font-bold text-ink-primary tracking-tight">{value}</div>
    </div>
  )
}
