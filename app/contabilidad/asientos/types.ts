/**
 * Tipos del módulo de Asientos contables y Libro Diario.
 * Fase 4B del módulo Contabilidad.
 */

export type JournalEntryStatus = 'DRAFT' | 'POSTED' | 'REVERSED'

export type JournalSource =
  | 'MANUAL'
  | 'INVOICE'
  | 'PURCHASE'
  | 'BANK'
  | 'PAYROLL'
  | 'REVERSAL'
  | 'OPENING'
  | 'CLOSING'

export interface AccountSummary {
  id: string
  code: string
  name: string
  account_type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'INCOME' | 'EXPENSE' | 'COST' | 'ORDER'
  nature: 'DEBIT' | 'CREDIT'
}

export interface JournalLine {
  id: string
  line_number: number
  account_id: string
  account?: AccountSummary
  description: string | null
  debit: string // Decimal viene como string del backend
  credit: string
}

export interface JournalEntry {
  id: string
  tenant_id: string
  entry_number: string
  entry_date: string
  description: string
  reference: string | null
  status: JournalEntryStatus
  source: JournalSource
  source_id: string | null
  total_debit: string
  total_credit: string
  reverses_entry_id: string | null
  reverses_entry?: {
    id: string
    entry_number: string
    entry_date: string
    description: string
  } | null
  reversed_by?: {
    id: string
    entry_number: string
    entry_date: string
  } | null
  posted_at: string | null
  posted_by: string | null
  reversed_at: string | null
  reversed_by_user: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  lines: JournalLine[]
}

export interface JournalLineInput {
  account_id: string
  description?: string
  debit: number
  credit: number
}

export interface CreateJournalEntryInput {
  entry_date: string // YYYY-MM-DD
  description: string
  reference?: string
  lines: JournalLineInput[]
}

export interface UpdateJournalEntryInput {
  entry_date?: string
  description?: string
  reference?: string
  lines?: JournalLineInput[]
}

export interface JournalListResponse {
  data: JournalEntry[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
}

export interface JournalStats {
  counts: {
    draft: number
    posted: number
    reversed: number
    total: number
  }
  posted_totals: {
    total_debit: number
    total_credit: number
  }
}

// ─── Labels y colores ──────────────────────────────────────────────

export const STATUS_LABELS: Record<JournalEntryStatus, string> = {
  DRAFT: 'Borrador',
  POSTED: 'Contabilizado',
  REVERSED: 'Reversado',
}

export const STATUS_COLORS: Record<JournalEntryStatus, string> = {
  DRAFT: '#F59E0B',     // ámbar
  POSTED: '#10B981',    // verde
  REVERSED: '#6B7280',  // gris
}

export const SOURCE_LABELS: Record<JournalSource, string> = {
  MANUAL: 'Manual',
  INVOICE: 'Factura',
  PURCHASE: 'Compra',
  BANK: 'Banco',
  PAYROLL: 'Nómina',
  REVERSAL: 'Reversión',
  OPENING: 'Apertura',
  CLOSING: 'Cierre',
}

// ─── Helpers ────────────────────────────────────────────────────────

export function fmtMoney(n: number | string): string {
  const v = typeof n === 'string' ? parseFloat(n) : n
  if (!Number.isFinite(v)) return '$0.00'
  return new Intl.NumberFormat('es-EC', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(v)
}

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function fmtDateShort(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

/**
 * Convierte el decimal-string del backend a número plano.
 */
export function num(v: string | number | null | undefined): number {
  if (v === null || v === undefined) return 0
  const n = typeof v === 'string' ? parseFloat(v) : v
  return Number.isFinite(n) ? n : 0
}
