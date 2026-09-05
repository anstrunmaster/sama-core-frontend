/**
 * Tipos del módulo Reportes Financieros.
 * Espejo de los DTOs y respuestas del backend.
 */

export type SalesGroupBy = 'day' | 'month' | 'customer' | 'product'

export interface Period {
  from: string
  to: string
  days?: number
}

export interface SummaryResponse {
  period: Period
  revenue: {
    total: number
    subtotal: number
    iva: number
    previous: number
    growth_pct: number
  }
  invoices: {
    count: number
    avg_ticket: number
    previous_count: number
    growth_pct: number
  }
  collection: {
    total_collected: number
    reconciled_movements: number
    total_movements: number
    pending_collection: number
  }
}

export interface SalesSeriesItem {
  key: string
  label: string
  total: number
  subtotal: number
  iva: number
  count: number
  extra?: any
}

export interface SalesResponse {
  period: Period
  group_by: SalesGroupBy
  totals: {
    total: number
    subtotal: number
    iva: number
    invoice_count: number
    avg_ticket: number
  }
  series: SalesSeriesItem[]
}

export interface TaxSummaryItem {
  sri_code: string
  label: string
  rate_pct: number
  base_amount: number
  iva_amount: number
  total: number
  line_count: number
}

export interface TaxDetailItem {
  invoice_id: string
  sequential: string
  access_key: string
  date: string
  customer_id: string | null
  customer_name: string | null
  subtotal: number
  iva: number
  total: number
}

export interface TaxResponse {
  period: Period
  summary: TaxSummaryItem[]
  totals: {
    total_base: number
    total_iva: number
    total_invoiced: number
    invoice_count: number
  }
  detail: TaxDetailItem[]
}

export interface CashFlowDayItem {
  date: string
  credit: number
  debit: number
  net: number
}

export interface CashFlowAccountItem {
  bank_account_id: string
  name: string
  currency: string
  credit: number
  debit: number
  net: number
}

export interface CashFlowResponse {
  period: Period
  totals: {
    total_credit: number
    total_debit: number
    net_flow: number
    movement_count: number
  }
  series: CashFlowDayItem[]
  by_account: CashFlowAccountItem[]
}

// ─── Períodos predefinidos ───────────────────────────────────────────

export type PresetPeriod = 'this_month' | 'last_month' | 'last_30d' | 'last_90d' | 'this_year' | 'custom'

export interface DateRange {
  from: string  // YYYY-MM-DD
  to: string
}

export function presetToRange(preset: PresetPeriod): DateRange {
  const now = new Date()
  const today = now.toISOString().slice(0, 10)

  switch (preset) {
    case 'this_month': {
      const from = new Date(now.getFullYear(), now.getMonth(), 1)
      return { from: from.toISOString().slice(0, 10), to: today }
    }
    case 'last_month': {
      const from = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const to = new Date(now.getFullYear(), now.getMonth(), 0)
      return {
        from: from.toISOString().slice(0, 10),
        to: to.toISOString().slice(0, 10),
      }
    }
    case 'last_30d': {
      const from = new Date(now.getTime() - 30 * 86400000)
      return { from: from.toISOString().slice(0, 10), to: today }
    }
    case 'last_90d': {
      const from = new Date(now.getTime() - 90 * 86400000)
      return { from: from.toISOString().slice(0, 10), to: today }
    }
    case 'this_year': {
      const from = new Date(now.getFullYear(), 0, 1)
      return { from: from.toISOString().slice(0, 10), to: today }
    }
    case 'custom':
    default: {
      const from = new Date(now.getFullYear(), now.getMonth(), 1)
      return { from: from.toISOString().slice(0, 10), to: today }
    }
  }
}
