/**
 * Tipos del módulo de Contabilidad - Fase 4C
 * Mapping de cuentas + Pendientes + Libro Mayor
 */

export type AccountingMappingKey =
  | 'RECEIVABLE'
  | 'PAYABLE'
  | 'CASH'
  | 'BANK_DEFAULT'
  | 'SALES_REVENUE'
  | 'IVA_PAYABLE'
  | 'EXPENSE_DEFAULT'
  | 'INVENTORY'
  | 'IVA_CREDIT'
  | 'WITHHOLDING_VAT_RECEIVED'
  | 'WITHHOLDING_INCOME_RECEIVED'
  | 'WITHHOLDING_VAT_PAYABLE'
  | 'WITHHOLDING_INCOME_PAYABLE'
  | 'CURRENT_YEAR_EARNINGS'
  | 'RETAINED_EARNINGS'
  | 'PAYROLL_EXPENSE'
  | 'PAYROLL_IESS_EMPLOYER_EXPENSE'
  | 'PAYROLL_BENEFITS_EXPENSE'
  | 'PAYROLL_NET_PAYABLE'
  | 'PAYROLL_IESS_PERSONAL_PAYABLE'
  | 'PAYROLL_IESS_EMPLOYER_PAYABLE'
  | 'PAYROLL_DECIMO_TERCERO_PAYABLE'
  | 'PAYROLL_DECIMO_CUARTO_PAYABLE'
  | 'PAYROLL_VACACIONES_PAYABLE'
  | 'ADVANCE_CUSTOMER'
  | 'ADVANCE_SUPPLIER'

export const MAPPING_LABELS: Record<AccountingMappingKey, { label: string; help: string; group: string }> = {
  RECEIVABLE: {
    label: 'Clientes (Cuentas por cobrar)',
    help: 'Cuenta donde se acumula lo que los clientes te deben (1.1.2)',
    group: 'Cobros y pagos',
  },
  PAYABLE: {
    label: 'Proveedores (Cuentas por pagar)',
    help: 'Cuenta donde se acumula lo que le debés a proveedores (2.1.1)',
    group: 'Cobros y pagos',
  },
  CASH: {
    label: 'Caja general',
    help: 'Cuenta para movimientos en efectivo (1.1.1)',
    group: 'Cobros y pagos',
  },
  BANK_DEFAULT: {
    label: 'Banco por defecto',
    help: 'Cuenta de banco principal (1.1.2)',
    group: 'Cobros y pagos',
  },
  SALES_REVENUE: {
    label: 'Ventas generales',
    help: 'Donde se registran tus ingresos por ventas (4.1.x)',
    group: 'Ventas',
  },
  IVA_PAYABLE: {
    label: 'IVA por pagar',
    help: 'IVA cobrado en facturas que tenés que pagar al SRI (2.1.5)',
    group: 'Ventas',
  },
  EXPENSE_DEFAULT: {
    label: 'Gastos por defecto',
    help: 'Donde se registran tus compras y gastos (5.x)',
    group: 'Compras',
  },
  INVENTORY: {
    label: 'Inventario',
    help: 'Para compras que entran a stock (1.1.4)',
    group: 'Compras',
  },
  IVA_CREDIT: {
    label: 'IVA crédito tributario',
    help: 'IVA que pagaste en compras y podés deducir (1.1.6)',
    group: 'Compras',
  },
  WITHHOLDING_VAT_RECEIVED: {
    label: 'Retención IVA recibida (de clientes)',
    help: 'Cuando un cliente te retiene IVA (1.1.7)',
    group: 'Retenciones que te hacen',
  },
  WITHHOLDING_INCOME_RECEIVED: {
    label: 'Retención IR recibida (de clientes)',
    help: 'Cuando un cliente te retiene impuesto a la renta (1.1.7)',
    group: 'Retenciones que te hacen',
  },
  WITHHOLDING_VAT_PAYABLE: {
    label: 'Retención IVA a pagar (a proveedores)',
    help: 'Cuando vos le retenés IVA a un proveedor (2.1.7)',
    group: 'Retenciones que hacés',
  },
  WITHHOLDING_INCOME_PAYABLE: {
    label: 'Retención IR a pagar (a proveedores)',
    help: 'Cuando vos le retenés IR a un proveedor (2.1.7)',
    group: 'Retenciones que hacés',
  },
  CURRENT_YEAR_EARNINGS: {
    label: 'Utilidad del ejercicio en curso',
    help: 'Cuenta donde se acumula la utilidad o pérdida del año actual (3.3.x)',
    group: 'Cierre del ejercicio',
  },
  RETAINED_EARNINGS: {
    label: 'Utilidades acumuladas',
    help: 'Cuenta donde se transfiere la utilidad al cerrar el ejercicio (3.3.x)',
    group: 'Cierre del ejercicio',
  },
  PAYROLL_EXPENSE: {
    label: 'Sueldos y Salarios (gasto)',
    help: 'Cuenta de gasto por sueldos del rol de pagos (5.1.01.01)',
    group: 'Nómina',
  },
  PAYROLL_IESS_EMPLOYER_EXPENSE: {
    label: 'Aporte Patronal IESS (gasto)',
    help: 'Gasto por aporte patronal al IESS (5.1.01.03)',
    group: 'Nómina',
  },
  PAYROLL_BENEFITS_EXPENSE: {
    label: 'Décimos y Vacaciones (gasto)',
    help: 'Gasto por décimos, vacaciones y fondos de reserva (5.1.01.04)',
    group: 'Nómina',
  },
  PAYROLL_NET_PAYABLE: {
    label: 'Sueldos por Pagar',
    help: 'Pasivo por neto a pagar al empleado (2.1.04.01)',
    group: 'Nómina',
  },
  PAYROLL_IESS_PERSONAL_PAYABLE: {
    label: 'Aporte Personal IESS por Pagar',
    help: 'Pasivo por aporte personal del empleado al IESS (2.1.04.02)',
    group: 'Nómina',
  },
  PAYROLL_IESS_EMPLOYER_PAYABLE: {
    label: 'Aporte Patronal IESS por Pagar',
    help: 'Pasivo por aporte patronal al IESS (2.1.04.03)',
    group: 'Nómina',
  },
  PAYROLL_DECIMO_TERCERO_PAYABLE: {
    label: 'Décimo Tercer Sueldo por Pagar',
    help: 'Pasivo por décimo tercer sueldo acumulado (2.1.04.04)',
    group: 'Nómina',
  },
  PAYROLL_DECIMO_CUARTO_PAYABLE: {
    label: 'Décimo Cuarto Sueldo por Pagar',
    help: 'Pasivo por décimo cuarto sueldo acumulado (2.1.04.05)',
    group: 'Nómina',
  },
    PAYROLL_VACACIONES_PAYABLE: {
    label: 'Vacaciones por Pagar',
    help: 'Pasivo por vacaciones acumuladas (2.1.04.06)',
    group: 'Nómina',
  },
  ADVANCE_CUSTOMER: {
    label: 'Anticipos de clientes',
    help: 'Pasivo donde se registran los anticipos recibidos de clientes antes de emitir factura (2.01.10.x)',
    group: 'Anticipos',
  },
  ADVANCE_SUPPLIER: {
    label: 'Anticipos a proveedores',
    help: 'Activo donde se registran los anticipos entregados a proveedores antes de recibir factura (1.01.02.x)',
    group: 'Anticipos',
  },
}

export const MAPPING_GROUPS = [
  'Cobros y pagos',
  'Ventas',
  'Compras',
  'Retenciones que te hacen',
  'Retenciones que haces',
  'Cierre del ejercicio',
  'Nómina',
  'Anticipos',
] as const

export interface AccountingMapping {
  id: string
  key: AccountingMappingKey
  account_id: string
  account: {
    id: string
    code: string
    name: string
    account_type: string
    nature: 'DEBIT' | 'CREDIT'
    allows_movement: boolean
    is_active: boolean
  }
}

export interface PendingDocument {
  id: string
  type: 'INVOICE' | 'PURCHASE'
  number: string
  issue_date: string | null
  counterpart_id: string | null
  total: number
  status: string | null
  customer?: string
}

export interface PendingSummary {
  invoices: { count: number; total: number }
  purchases: { count: number; total: number }
}

export interface BatchResult {
  success: number
  failed: number
  generated: Array<{ source: string; source_id: string; entry_number: string }>
  errors: Array<{ source: string; source_id: string; error: string }>
}

export interface LedgerMovement {
  line_id: string
  entry_id: string
  entry_number: string
  entry_date: string
  entry_description: string
  entry_reference: string | null
  source: string
  line_description: string | null
  debit: number
  credit: number
  balance: number
}

export interface AccountLedger {
  account: {
    id: string
    code: string
    name: string
    account_type: string
    nature: 'DEBIT' | 'CREDIT'
  }
  period: { from: string | null; to: string | null }
  summary: {
    opening_balance: number
    total_debit: number
    total_credit: number
    period_net: number
    closing_balance: number
    movement_count: number
  }
  movements: LedgerMovement[]
}

// ─── Helpers ────────────────────────────────────────────────

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
export interface SriPendingDocument extends PendingDocument {
  claveAcceso: string
  docType: string
  rucEmisor: string | null
  subtotal: number | null
  iva: number | null
  xmlDisponible: boolean
}
