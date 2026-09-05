// ─── Enums ────────────────────────────────────────────────────────────────────
export type QuotationStatus =
  | 'DRAFT'
  | 'SENT'
  | 'APPROVED'
  | 'REJECTED'
  | 'INVOICED'
  | 'EXPIRED'

// ─── Status config ────────────────────────────────────────────────────────────
export const STATUS_CONFIG: Record<QuotationStatus, { label: string; classes: string }> = {
  DRAFT:    { label: 'Borrador',  classes: 'bg-edge-subtle border-edge text-ink-tertiary' },
  SENT:     { label: 'Enviada',   classes: 'bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400' },
  APPROVED: { label: 'Aprobada',  classes: 'bg-green-500/10 border-green-500/20 text-green-600 dark:text-green-400' },
  REJECTED: { label: 'Rechazada', classes: 'bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400' },
  INVOICED: { label: 'Facturada', classes: 'bg-purple-500/10 border-purple-500/20 text-purple-600 dark:text-purple-400' },
  EXPIRED:  { label: 'Vencida',   classes: 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400' },
}

// ─── Item ─────────────────────────────────────────────────────────────────────
export interface QuotationItemTax {
  codigo:           string
  codigoPorcentaje: string
  tarifa:           string
  baseImponible:    number
  valor:            number
}

export interface QuotationItem {
  codigoPrincipal?:   string
  descripcion:        string
  detallesAdicionales?: string
  cantidad:           number
  precioUnitario:     number
  descuento:          number
  impuestos:          QuotationItemTax[]
  productId?: string   
  stock?: number   
}

// ─── Payment term ─────────────────────────────────────────────────────────────
export interface QuotationPaymentTerm {
  medio:        string
  valor:        number
  plazo?:       string
  unidad_tiempo?: string
}

// ─── Additional info ──────────────────────────────────────────────────────────
export interface QuotationAdditionalInfo {
  label: string
  value: string
}

// ─── Quotation ────────────────────────────────────────────────────────────────
export interface Quotation {
  id:             string
  tenant_id:      string
  branch_id:      string
  customer_id:    string | null
  number:         string
  status:         QuotationStatus

  // Comprador
  buyer_id_type:        string | null
  buyer_id:             string | null
  buyer_name:           string | null
  buyer_email:          string | null
  buyer_address:        string | null
  buyer_phone:          string | null
  buyer_city:           string | null
  buyer_address_branch: string | null

  // Condiciones comerciales
  issue_date:   string | null
  due_date:     string | null
  credit_days:  number | null
  seller:       string | null

  // Items y totales
  items:          QuotationItem[]
  subtotal:       string
  discount_total: string
  tax_total:      string
  total:          string

  // Formas de pago
  payment_terms:  QuotationPaymentTerm[] | null
  payment_method: string | null

  // Extras
  notes:           string | null
  valid_until:     string | null
  additional_info: QuotationAdditionalInfo[] | null

  // Trazabilidad
  invoice_id:         string | null
  invoice_access_key: string | null
  created_by:         string | null
  created_at:         string
  updated_at:         string

  customer?: {
    id:             string
    name:           string
    identification: string
    phone?:         string | null
    email?:         string | null
    address?:       string | null
    addresses?:     Array<{ label: string; address: string; is_default?: boolean }> | null
  } | null
}

// ─── Pagination ───────────────────────────────────────────────────────────────
export interface PaginatedQuotations {
  data: Quotation[]
  pagination: {
    page:       number
    limit:      number
    total:      number
    totalPages: number
  }
}

// ─── Form state ───────────────────────────────────────────────────────────────
export interface QuotationFormItem extends QuotationItem {
  _id:     string
  iva_pct: 0 | 5 | 15
}

export interface QuotationTotals {
  subtotal:       number
  discount_total: number
  tax_total:      number
  total:          number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
export function num(v: any): number {
  if (typeof v === 'number') return v
  if (typeof v === 'string') return parseFloat(v) || 0
  return 0
}

export function fmtMoney(n: number | string): string {
  return new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD' }).format(num(n))
}

export function fmtDate(d: string): string {
  return new Date(d).toLocaleDateString('es-EC', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })
}

/** Calcula totales con 4 decimales internamente */
export function calcTotals(items: QuotationFormItem[]): QuotationTotals {
  let subtotal       = 0
  let discount_total = 0
  let tax_total      = 0

  for (const item of items) {
    const base = round4(item.cantidad * item.precioUnitario)
    const disc = round4(item.descuento)
    const net  = round4(base - disc)
    subtotal       += net
    discount_total += disc
    tax_total      += item.impuestos.reduce((s, t) => s + t.valor, 0)
  }

  return {
    subtotal:       round4(subtotal),
    discount_total: round4(discount_total),
    tax_total:      round4(tax_total),
    total:          round4(subtotal + tax_total),
  }
}

/** Construye el array de impuestos para un item */
export function buildItemTaxes(baseImponible: number, iva_pct: 0 | 5 | 15): QuotationItemTax[] {
  const codigo = '2'
  const base   = round4(baseImponible)

  if (iva_pct === 0) {
    return [{ codigo, codigoPorcentaje: '0', tarifa: '0', baseImponible: base, valor: 0 }]
  }
  if (iva_pct === 5) {
    return [{ codigo, codigoPorcentaje: '5', tarifa: '5', baseImponible: base, valor: round4(base * 0.05) }]
  }
  return [{ codigo, codigoPorcentaje: '4', tarifa: '15', baseImponible: base, valor: round4(base * 0.15) }]
}

/** Redondeo a 4 decimales para cálculos internos */
export function round4(n: number): number {
  return Math.round(n * 10000) / 10000
}

/** ID único para filas del formulario */
export function uid(): string {
  return Math.random().toString(36).slice(2, 9)
}

export const EMPTY_ITEM = (): QuotationFormItem => ({
  _id:              uid(),
  codigoPrincipal:  '',
  descripcion:      '',
  detallesAdicionales: '',
  cantidad:         1,
  precioUnitario:   0,
  descuento:        0,
  iva_pct:          15,
  impuestos:        [],
})

export const PAYMENT_METHODS: { value: string; label: string }[] = [
  { value: '01', label: 'Efectivo' },
  { value: '19', label: 'Crédito' },
  { value: '17', label: 'Transferencia bancaria' },
  { value: '16', label: 'Tarjeta de débito' },
  { value: '18', label: 'Tarjeta de crédito' },
  { value: '20', label: 'Otros con utilización del sistema financiero' },
]

export const ID_TYPES: { value: string; label: string }[] = [
  { value: '04', label: 'RUC' },
  { value: '05', label: 'Cédula' },
  { value: '07', label: 'Consumidor Final' },
  { value: '06', label: 'Pasaporte' },
]

export const TIME_UNITS: { value: string; label: string }[] = [
  { value: 'dias',  label: 'Días' },
  { value: 'meses', label: 'Meses' },
]
