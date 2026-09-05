/**
 * Tipos del módulo de Contabilidad - Fase 4D
 * Balance General + Estado de Resultados + Balanza + Cierre del ejercicio
 */

// ─── Balance General ────────────────────────────────────────────

export interface BalanceLine {
  account_id: string
  code: string
  name: string
  account_type: string
  nature: 'DEBIT' | 'CREDIT'
  balance: number
}

export interface BalanceSheet {
  as_of: string
  assets: {
    accounts: BalanceLine[]
    total: number
  }
  liabilities: {
    accounts: BalanceLine[]
    total: number
  }
  equity: {
    accounts: BalanceLine[]
    current_year_earnings: number
    total: number
  }
  totals: {
    assets: number
    liabilities_and_equity: number
    difference: number
    is_balanced: boolean
  }
}

// ─── Estado de Resultados ───────────────────────────────────────

export interface IncomeStatement {
  period: { from: string; to: string }
  income: { accounts: BalanceLine[]; total: number }
  cost_of_sales: { accounts: BalanceLine[]; total: number }
  gross_profit: number
  gross_margin_pct: number
  operating_expenses: { accounts: BalanceLine[]; total: number }
  net_income: number
  net_margin_pct: number
}

// ─── Balanza de Comprobación ────────────────────────────────────

export interface TrialBalanceRow {
  account_id: string
  code: string
  name: string
  account_type: string
  nature: 'DEBIT' | 'CREDIT'
  total_debit: number
  total_credit: number
  balance: number
}

export interface TrialBalance {
  as_of: string
  rows: TrialBalanceRow[]
  totals: {
    total_debit: number
    total_credit: number
    difference: number
    is_balanced: boolean
  }
}

// ─── Cierre del ejercicio ──────────────────────────────────────

export interface ClosingAccountInfo {
  account_id: string
  code: string
  name: string
  account_type: string
  nature: 'DEBIT' | 'CREDIT'
  total_debit: number
  total_credit: number
  balance: number
}

export interface ClosingStatus {
  year: number
  is_closed: boolean
  closing_entry: {
    id: string
    entry_number: string
    entry_date: string
    status: string
    description: string
    total: number
    posted_at: string | null
  } | null
}

export interface ClosingPreview {
  year: number
  retained_earnings_account: {
    id: string
    code: string
    name: string
    nature: 'DEBIT' | 'CREDIT'
  } | null
  income_accounts: ClosingAccountInfo[]
  expense_accounts: ClosingAccountInfo[]
  totals: {
    total_income: number
    total_expense: number
    net_result: number
    result_type: 'UTILITY' | 'LOSS'
  }
  will_create_lines: number
}

export interface ClosingExecuteResult {
  entry: {
    id: string
    entry_number: string
    entry_date: string
    description: string
    status: string
    total_debit: number | string
    total_credit: number | string
    lines: Array<{
      id: string
      line_number: number
      description: string | null
      debit: number | string
      credit: number | string
      account: {
        id: string
        code: string
        name: string
        nature: 'DEBIT' | 'CREDIT'
      }
    }>
  }
  summary: {
    year: number
    total_income: number
    total_expense: number
    net_result: number
    result_type: 'UTILITY' | 'LOSS'
    lines_count: number
  }
}

// ─── Helpers ────────────────────────────────────────────────────

export function fmtMoney(n: number | string | null | undefined): string {
  const v = typeof n === 'string' ? parseFloat(n) : (n ?? 0)
  if (!Number.isFinite(v)) return '$0.00'
  return new Intl.NumberFormat('es-EC', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(v as number)
}

export function fmtPct(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return '—'
  return `${n.toFixed(1)}%`
}

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' })
}
