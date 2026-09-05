/**
 * Tipos del módulo Anexos e Impuestos.
 * v2: incluye compras en overview y Form 104.
 */

export interface TaxPeriod {
  year: number
  month: number
}

export interface SalesSection {
  totals: {
    invoice_count: number
    total_subtotal: number
    total_iva: number
    total_invoiced: number
  }
  by_client_type: Array<{
    code: string
    label: string
    count: number
    total: number
  }>
  by_rate: Array<{
    sri_code: string
    label: string
    count: number
    base: number
    iva: number
  }>
}

export interface PurchasesSection {
  totals: {
    purchase_count: number
    total_purchased: number
    total_iva: number
    total_retention_renta: number
    total_retention_iva: number
  }
  by_supplier_type: Array<{
    code: string
    label: string
    count: number
    total: number
  }>
  by_document_type: Array<{
    code: string
    label: string
    count: number
    total: number
  }>
}

export interface OverviewResponse {
  period: { year: number; month: number; from: string; to: string }
  tenant: { ruc: string; name: string }

  // v2: secciones separadas
  sales?: SalesSection
  purchases?: PurchasesSection

  // v1 compat: estos campos siguen presentes pero replicados de sales
  totals: {
    invoice_count: number
    total_subtotal: number
    total_iva: number
    total_invoiced: number
  }
  by_client_type: Array<{
    code: string
    label: string
    count: number
    total: number
  }>
  by_rate: Array<{
    sri_code: string
    label: string
    count: number
    base: number
    iva: number
  }>

  // Warnings de ambas fuentes
  warnings: Array<{
    invoice_id?: string
    id?: string
    source?: 'invoice' | 'purchase'
    ref?: string
    sequential?: string
    issue: string
  }>
  ready_to_generate: boolean
}

export interface CasilleroValue {
  label: string
  value: number
}

export interface RateBreakdown {
  rate: string
  sri_code: string
  base: number
  iva: number
}

export interface Form104Response {
  period: { year: number; month: number }
  tenant: { ruc: string; name: string }
  invoice_count: number
  purchase_count?: number
  total_invoiced: number
  total_purchased?: number
  casilleros: Record<string, CasilleroValue>
  breakdown_by_rate: RateBreakdown[]
  purchases_breakdown_by_rate?: RateBreakdown[]
  notes: string[]
}

// ─── Helpers de período ──────────────────────────────────────────────

export const MESES_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

export function getCurrentPeriod(): TaxPeriod {
  const now = new Date()
  return { year: now.getFullYear(), month: now.getMonth() + 1 }
}

export function getPreviousPeriod(p: TaxPeriod): TaxPeriod {
  if (p.month === 1) return { year: p.year - 1, month: 12 }
  return { year: p.year, month: p.month - 1 }
}

export function periodLabel(p: TaxPeriod): string {
  return `${MESES_ES[p.month - 1]} ${p.year}`
}
