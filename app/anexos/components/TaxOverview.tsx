'use client'
import { useEffect, useState } from 'react'
import {
  CheckCircle2, AlertTriangle, FileText, Users,
  Receipt, DollarSign, AlertCircle, Building2, Info,
  ShoppingCart, TrendingDown, Tag,
} from 'lucide-react'
import { taxReportsApi, fmtMoney, fmtNumber } from '../api'
import { periodLabel, type OverviewResponse, type TaxPeriod } from '../types'

interface Props {
  period: TaxPeriod
}

export function TaxOverview({ period }: Props) {
  const [data, setData] = useState<OverviewResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    taxReportsApi
      .overview(period)
      .then((d) => { if (!cancelled) setData(d) })
      .catch((e) => { if (!cancelled) setError(e.message || 'Error') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [period.year, period.month])

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
        <div className="card rounded-2xl p-6 h-48 animate-pulse" />
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

  // Soporta tanto el formato v2 (data.sales, data.purchases) como el v1 (data.totals)
  const sales = data.sales ?? {
    totals: data.totals,
    by_client_type: data.by_client_type,
    by_rate: data.by_rate,
  }
  const purchases = data.purchases ?? null

  const isEmptyAll =
    sales.totals.invoice_count === 0 &&
    (!purchases || purchases.totals.purchase_count === 0)

  return (
    <div className="space-y-4">
      {/* Header empresa */}
      <div className="card rounded-2xl p-5 flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-muted flex items-center justify-center flex-shrink-0">
          <Building2 className="w-5 h-5 text-blue" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-ink-primary">{data.tenant.name}</div>
          <div className="text-[11px] font-mono text-ink-tertiary mt-0.5">
            RUC {data.tenant.ruc}
          </div>
          <div className="text-xs text-ink-secondary mt-1">
            Período: <strong className="text-ink-primary">{periodLabel(period)}</strong>
          </div>
        </div>
        <StatusPill ready={data.ready_to_generate} />
      </div>

      {isEmptyAll ? (
        <div className="card rounded-2xl py-16 text-center">
          <FileText className="w-10 h-10 text-ink-ghost mx-auto mb-3" />
          <p className="text-sm font-semibold text-ink-primary mb-1">
            Sin actividad en este período
          </p>
          <p className="text-xs text-ink-tertiary">
            No hay facturas ni compras en {periodLabel(period)}
          </p>
        </div>
      ) : (
        <>
          {/* ═══════════════════════════════════════════════════════
              SECCIÓN VENTAS
              ═══════════════════════════════════════════════════════ */}
          <SectionHeader
            title="Ventas"
            subtitle="Facturas autorizadas del período"
            icon={Receipt}
          />

          {sales.totals.invoice_count === 0 ? (
            <EmptyMini text="Sin facturas en el período" />
          ) : (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiCard
                  label="Facturas autorizadas"
                  value={fmtNumber(sales.totals.invoice_count)}
                  icon={FileText}
                  color="#3B82F6"
                />
                <KpiCard
                  label="Total facturado"
                  value={fmtMoney(sales.totals.total_invoiced)}
                  icon={DollarSign}
                  color="#10B981"
                />
                <KpiCard
                  label="Base imponible"
                  value={fmtMoney(sales.totals.total_subtotal)}
                  icon={Receipt}
                  color="#A855F7"
                />
                <KpiCard
                  label="IVA cobrado"
                  value={fmtMoney(sales.totals.total_iva)}
                  icon={Receipt}
                  color="#F59E0B"
                />
              </div>

              {/* Por tipo de cliente */}
              {sales.by_client_type && sales.by_client_type.length > 0 && (
                <div className="card rounded-2xl">
                  <div className="p-5 border-b border-edge-subtle flex items-center gap-2">
                    <Users className="w-4 h-4 text-ink-tertiary" />
                    <h3 className="text-sm font-semibold text-ink-primary">
                      Composición por tipo de cliente
                    </h3>
                  </div>
                  <CompactTable
                    headers={['Tipo identificación', 'Código SRI', '# Facturas', 'Total facturado']}
                    rows={sales.by_client_type.map((row: any) => [
                      row.label,
                      <CodeTag key="code" code={row.code} />,
                      fmtNumber(row.count),
                      <strong key="total" className="text-ink-primary">{fmtMoney(row.total)}</strong>,
                    ])}
                  />
                </div>
              )}

              {/* Por tarifa */}
              {sales.by_rate && sales.by_rate.length > 0 && (
                <div className="card rounded-2xl">
                  <div className="p-5 border-b border-edge-subtle flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-ink-tertiary" />
                    <h3 className="text-sm font-semibold text-ink-primary">
                      Composición por tarifa IVA
                    </h3>
                  </div>
                  <CompactTable
                    headers={['Tarifa', 'Código SRI', '# Líneas', 'Base imponible', 'IVA']}
                    rows={sales.by_rate.map((row: any) => [
                      row.label,
                      <CodeTag key="code" code={row.sri_code} />,
                      <span key="cnt" className="text-ink-tertiary">{fmtNumber(row.count)}</span>,
                      fmtMoney(row.base),
                      <span
                        key="iva"
                        className="font-semibold"
                        style={{ color: row.iva > 0 ? '#10B981' : '#71717A' }}
                      >
                        {fmtMoney(row.iva)}
                      </span>,
                    ])}
                  />
                </div>
              )}
            </>
          )}

          {/* ═══════════════════════════════════════════════════════
              SECCIÓN COMPRAS  (NUEVO v2)
              ═══════════════════════════════════════════════════════ */}
          {purchases && (
            <>
              <SectionHeader
                title="Compras"
                subtitle="Compras registradas y pagadas del período"
                icon={ShoppingCart}
              />

              {purchases.totals.purchase_count === 0 ? (
                <EmptyMini text="Sin compras registradas en el período" />
              ) : (
                <>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <KpiCard
                      label="Compras registradas"
                      value={fmtNumber(purchases.totals.purchase_count)}
                      icon={ShoppingCart}
                      color="#F97316"
                    />
                    <KpiCard
                      label="Total compras"
                      value={fmtMoney(purchases.totals.total_purchased)}
                      icon={TrendingDown}
                      color="#EC4899"
                    />
                    <KpiCard
                      label="IVA pagado (crédito)"
                      value={fmtMoney(purchases.totals.total_iva)}
                      icon={Receipt}
                      color="#10B981"
                    />
                    <KpiCard
                      label="Retenciones aplicadas"
                      value={fmtMoney(
                        purchases.totals.total_retention_renta +
                          purchases.totals.total_retention_iva,
                      )}
                      icon={Tag}
                      color="#6366F1"
                    />
                  </div>

                  {/* Por tipo de proveedor */}
                  {purchases.by_supplier_type && purchases.by_supplier_type.length > 0 && (
                    <div className="card rounded-2xl">
                      <div className="p-5 border-b border-edge-subtle flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-ink-tertiary" />
                        <h3 className="text-sm font-semibold text-ink-primary">
                          Por tipo de proveedor
                        </h3>
                      </div>
                      <CompactTable
                        headers={['Tipo', '# Compras', 'Total comprado']}
                        rows={purchases.by_supplier_type.map((row: any) => [
                          row.label,
                          fmtNumber(row.count),
                          <strong key="t" className="text-ink-primary">{fmtMoney(row.total)}</strong>,
                        ])}
                      />
                    </div>
                  )}

                  {/* Por tipo de documento */}
                  {purchases.by_document_type && purchases.by_document_type.length > 0 && (
                    <div className="card rounded-2xl">
                      <div className="p-5 border-b border-edge-subtle flex items-center gap-2">
                        <FileText className="w-4 h-4 text-ink-tertiary" />
                        <h3 className="text-sm font-semibold text-ink-primary">
                          Por tipo de documento
                        </h3>
                      </div>
                      <CompactTable
                        headers={['Documento', '# Compras', 'Total']}
                        rows={purchases.by_document_type.map((row: any) => [
                          row.label,
                          fmtNumber(row.count),
                          <strong key="t" className="text-ink-primary">{fmtMoney(row.total)}</strong>,
                        ])}
                      />
                    </div>
                  )}

                  {/* Retenciones desglose */}
                  {(purchases.totals.total_retention_renta > 0 ||
                    purchases.totals.total_retention_iva > 0) && (
                    <div className="card rounded-2xl p-5">
                      <div className="flex items-center gap-2 mb-3">
                        <Tag className="w-4 h-4 text-ink-tertiary" />
                        <h3 className="text-sm font-semibold text-ink-primary">
                          Retenciones del período
                        </h3>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-[10px] uppercase tracking-widest text-ink-tertiary font-medium mb-1">
                            Retención en la Fuente (RENTA)
                          </div>
                          <div className="text-lg font-bold text-blue">
                            {fmtMoney(purchases.totals.total_retention_renta)}
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] uppercase tracking-widest text-ink-tertiary font-medium mb-1">
                            Retención de IVA
                          </div>
                          <div className="text-lg font-bold text-blue">
                            {fmtMoney(purchases.totals.total_retention_iva)}
                          </div>
                        </div>
                      </div>
                      <p className="text-[11px] text-ink-tertiary mt-3 leading-relaxed">
                        Estas retenciones se calcularon y se descontaron del pago al proveedor.
                        Para generar los comprobantes de retención electrónicos, esperá al
                        próximo release (Sprint B).
                      </p>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </>
      )}

      {/* Warnings (combinados ventas + compras) */}
      {data.warnings && data.warnings.length > 0 && (
        <div className="card rounded-2xl border-amber-500/30 bg-amber-500/5">
          <div className="p-5 border-b border-amber-500/20 flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-amber-700 dark:text-amber-400">
                {data.warnings.length} {data.warnings.length === 1 ? 'advertencia' : 'advertencias'}
              </h3>
              <p className="text-[11px] text-ink-tertiary mt-0.5">
                Estos documentos pueden causar errores al subir el ATS al SRI
              </p>
            </div>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {data.warnings.slice(0, 50).map((w: any, i: number) => (
              <div key={i} className="px-5 py-2 border-b border-edge-subtle last:border-0 flex items-center justify-between text-xs">
                <span className="font-mono text-ink-secondary">
                  {(w as any).source === 'purchase' ? '🛒 ' : '📄 '}
                  {w.ref ?? (w as any).sequential}
                </span>
                <span className="text-amber-600 dark:text-amber-400">{w.issue}</span>
              </div>
            ))}
            {data.warnings.length > 50 && (
              <div className="px-5 py-2 text-[11px] text-ink-tertiary italic">
                ...y {data.warnings.length - 50} más
              </div>
            )}
          </div>
        </div>
      )}

      {/* Aviso v2: ATS y Form 104 ahora completos */}
      <div className="card rounded-xl p-3 flex items-start gap-2 bg-emerald-500/5 border-emerald-500/20">
        <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
        <div className="text-[11px] text-ink-secondary leading-relaxed">
          <strong className="text-emerald-700 dark:text-emerald-400">ATS y Formulario 104 completos:</strong>{' '}
          el archivo XML del ATS incluye tanto ventas como compras del período.
          Los casilleros de compras (500-599) del Form 104 también están calculados.
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// Subcomponentes
// ─────────────────────────────────────────────────────────────────

function SectionHeader({
  title, subtitle, icon: Icon,
}: { title: string; subtitle: string; icon: any }) {
  return (
    <div className="flex items-center gap-3 mt-2">
      <div className="w-7 h-7 rounded-lg bg-edge-subtle flex items-center justify-center flex-shrink-0">
        <Icon className="w-3.5 h-3.5 text-ink-secondary" />
      </div>
      <div>
        <h2 className="text-sm font-bold text-ink-primary tracking-tight">
          {title}
        </h2>
        <p className="text-[11px] text-ink-tertiary">{subtitle}</p>
      </div>
    </div>
  )
}

function EmptyMini({ text }: { text: string }) {
  return (
    <div className="card rounded-xl p-6 text-center">
      <p className="text-xs text-ink-tertiary italic">{text}</p>
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
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${color}15` }}>
          <Icon className="w-3.5 h-3.5" style={{ color }} />
        </div>
      </div>
      <div className="text-2xl font-bold text-ink-primary tracking-tight">{value}</div>
    </div>
  )
}

function StatusPill({ ready }: { ready: boolean }) {
  if (ready) {
    return (
      <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
        <CheckCircle2 className="w-3 h-3" />
        Listo para declarar
      </span>
    )
  }
  return (
    <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400">
      <AlertTriangle className="w-3 h-3" />
      Hay advertencias
    </span>
  )
}

function CodeTag({ code }: { code: string }) {
  return (
    <span className="font-mono text-[10px] font-bold px-2 py-1 rounded bg-edge-subtle text-ink-secondary">
      {code}
    </span>
  )
}

function CompactTable({
  headers, rows,
}: { headers: string[]; rows: Array<Array<React.ReactNode>> }) {
  return (
    <table className="w-full">
      <thead className="bg-surface-raised">
        <tr className="border-b border-edge-subtle">
          {headers.map((h) => (
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
        {rows.map((cells, i) => (
          <tr key={i} className="border-b border-edge-subtle hover:bg-edge-subtle transition-colors">
            {cells.map((cell, j) => (
              <td key={j} className="px-4 py-3 text-sm text-ink-secondary">
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
