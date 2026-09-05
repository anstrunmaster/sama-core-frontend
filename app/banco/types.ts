/**
 * Tipos compartidos del módulo Banco.
 * Reflejan exactamente los modelos del backend (src/bank/*).
 */

export type BankAccountType = 'CHECKING' | 'SAVINGS' | 'CREDIT' | 'CASH' | 'OTHER'

export type BankMovementDirection = 'CREDIT' | 'DEBIT'

export type BankMovementStatus = 'PENDING' | 'RECONCILED' | 'IGNORED'

export interface BankAccount {
  id: string
  tenant_id: string
  branch_id: string | null
  name: string
  bank_name: string
  account_number: string
  type: BankAccountType
  currency: string
  opening_balance: string  // Prisma Decimal viene como string del API
  current_balance: string
  is_active: boolean
  notes: string | null
  created_at: string
  updated_at: string
}

export interface BankMovement {
  id: string
  tenant_id: string
  bank_account_id: string
  movement_date: string
  direction: BankMovementDirection
  amount: string
  balance_after: string
  description: string
  reference: string | null
  status: BankMovementStatus
  reconciled_invoice_id: string | null
  reconciled_at: string | null
  reconciled_by: string | null
  created_at: string
  updated_at: string

  // Cuando viene con include
  bank_account?: {
    id: string
    name: string
    bank_name: string
    currency: string
  }
  reconciled_invoice?: {
    id: string
    sequential: string
    access_key: string
    invoice_data: any
  } | null
}

export interface BankSummary {
  total_accounts: number
  total_pending_movements: number
  balances_by_currency: Record<string, number>
  accounts: Array<{
    id: string
    name: string
    bank_name: string
    account_number: string
    type: BankAccountType
    currency: string
    current_balance: string
    pending_movements: number
  }>
}

export interface ReconcilableInvoice {
  id: string
  sequential: string
  access_key: string
  invoice_data: any
  created_at: string
  customer: {
    name: string
    identification: string
  }
}

export interface Pagination {
  page: number
  limit: number
  total: number
  pages: number
}

// ────────────────────────────────────────────────────────────────────
// Constantes de display
// ────────────────────────────────────────────────────────────────────

export const ACCOUNT_TYPE_LABELS: Record<BankAccountType, string> = {
  CHECKING: 'Cuenta corriente',
  SAVINGS: 'Ahorros',
  CREDIT: 'Crédito',
  CASH: 'Caja chica',
  OTHER: 'Otro',
}

export const MOVEMENT_STATUS_LABELS: Record<BankMovementStatus, string> = {
  PENDING: 'Pendiente',
  RECONCILED: 'Conciliado',
  IGNORED: 'Ignorado',
}

export const DIRECTION_LABELS: Record<BankMovementDirection, string> = {
  CREDIT: 'Ingreso',
  DEBIT: 'Egreso',
}

export interface ReconcilablePurchase {
  id: string
  sequential: string | null
  document_type: string
  issue_date: string
  total: string
  status: string
  supplier: {
    legal_name: string
    identification: string
  } | null
}
