/**
 * Tipos del módulo Plan de Cuentas (Contabilidad Fase 4A).
 */

export type AccountType =
  | 'ASSET'
  | 'LIABILITY'
  | 'EQUITY'
  | 'INCOME'
  | 'EXPENSE'
  | 'COST'
  | 'ORDER'

export type AccountNature = 'DEBIT' | 'CREDIT'

export interface Account {
  id: string
  tenant_id: string
  code: string
  name: string
  description: string | null
  level: number
  account_type: AccountType
  nature: AccountNature
  parent_id: string | null
  allows_movement: boolean
  allow_negative: boolean
  is_active: boolean
  is_system: boolean
  tax_category:  AccountTaxCategory | null
  is_deductible: boolean | null
  created_at: string
  updated_at: string
}

export interface AccountWithChildren extends Account {
  children?: AccountWithChildren[]
  parent?: { id: string; code: string; name: string }
}

export interface AccountStats {
  total: number
  by_type: Record<AccountType, number>
  active: number
  movement_accounts: number
}

export interface CreateAccountInput {
  code: string
  name: string
  description?: string
  account_type: AccountType
  nature: AccountNature
  parent_id?: string
  allows_movement?: boolean
  allow_negative?: boolean
  is_active?: boolean
}

export interface UpdateAccountInput {
  name?: string
  description?: string
  allows_movement?: boolean
  allow_negative?: boolean
  is_active?: boolean
  tax_category?: AccountTaxCategory | null
  is_deductible?: boolean | null
}

// ─── Labels y colores ──────────────────────────────────────────────

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  ASSET: 'Activo',
  LIABILITY: 'Pasivo',
  EQUITY: 'Patrimonio',
  INCOME: 'Ingreso',
  EXPENSE: 'Gasto',
  COST: 'Costo',
  ORDER: 'Orden',
}

export const ACCOUNT_TYPE_COLORS: Record<AccountType, string> = {
  ASSET: '#3B82F6',     // azul
  LIABILITY: '#F97316', // naranja
  EQUITY: '#A855F7',    // morado
  INCOME: '#10B981',    // verde
  EXPENSE: '#EF4444',   // rojo
  COST: '#F59E0B',      // ámbar
  ORDER: '#6B7280',     // gris
}

export const ACCOUNT_NATURE_LABELS: Record<AccountNature, string> = {
  DEBIT: 'Deudora',
  CREDIT: 'Acreedora',
}
// ─── Clasificación tributaria para Formulario 101 ──────────────────
export type AccountTaxCategory =
  | 'INCOME_TAXABLE'
  | 'INCOME_EXEMPT'
  | 'COST'
  | 'EXPENSE_DEDUCTIBLE'
  | 'EXPENSE_NON_DEDUC'
  | 'ASSET_CURRENT'
  | 'ASSET_NON_CURRENT'
  | 'LIABILITY_CURRENT'
  | 'LIABILITY_NON_CURRENT'
  | 'EQUITY'
  | 'TAX_ADVANCE'
  | 'TAX_CREDIT'
  | 'OTHER'

export const TAX_CATEGORY_LABELS: Record<AccountTaxCategory, string> = {
  INCOME_TAXABLE:        'Ingreso gravado IR',
  INCOME_EXEMPT:         'Ingreso exento IR',
  COST:                  'Costo de ventas',
  EXPENSE_DEDUCTIBLE:    'Gasto deducible',
  EXPENSE_NON_DEDUC:     'Gasto no deducible',
  ASSET_CURRENT:         'Activo corriente',
  ASSET_NON_CURRENT:     'Activo no corriente',
  LIABILITY_CURRENT:     'Pasivo corriente',
  LIABILITY_NON_CURRENT: 'Pasivo no corriente',
  EQUITY:                'Patrimonio',
  TAX_ADVANCE:           'Anticipo IR',
  TAX_CREDIT:            'Crédito tributario IR',
  OTHER:                 'Otro',
}

/** Categorías sugeridas según account_type — ayuda al usuario a elegir */
export const TAX_CATEGORY_BY_TYPE: Partial<Record<AccountType, AccountTaxCategory[]>> = {
  INCOME:    ['INCOME_TAXABLE', 'INCOME_EXEMPT', 'OTHER'],
  EXPENSE:   ['EXPENSE_DEDUCTIBLE', 'EXPENSE_NON_DEDUC', 'OTHER'],
  COST:      ['COST', 'OTHER'],
  ASSET:     ['ASSET_CURRENT', 'ASSET_NON_CURRENT', 'TAX_ADVANCE', 'TAX_CREDIT', 'OTHER'],
  LIABILITY: ['LIABILITY_CURRENT', 'LIABILITY_NON_CURRENT', 'OTHER'],
  EQUITY:    ['EQUITY', 'OTHER'],
}
