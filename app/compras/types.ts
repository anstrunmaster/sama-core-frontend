/**
 * Tipos del módulo Compras + Proveedores.
 */

export type SupplierTypeT = 'PERSONA_NATURAL' | 'SOCIEDAD' | 'EXTRANJERO' | 'CONSUMIDOR_FINAL'
export type PurchaseDocumentTypeT = 'FACTURA' | 'NOTA_VENTA' | 'LIQUIDACION_COMPRA' | 'REEMBOLSO_GASTOS'
export type PurchaseStatusT = 'DRAFT' | 'REGISTERED' | 'PAID' | 'ANNULLED'
export type RetentionTypeT = 'RENTA' | 'IVA'

export interface Supplier {
  id: string
  tenant_id: string
  identification_type: string
  identification: string
  legal_name: string
  trade_name: string | null
  supplier_type: SupplierTypeT
  is_special_taxpayer: boolean
  is_withholding_agent: boolean
  is_required_to_account: boolean
  email: string | null
  phone: string | null
  address: string | null
  city: string | null
  notes: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface PurchaseLine {
  id: string
  purchase_id: string
  line_number: number
  code: string | null
  description: string
  quantity: string
  unit_price: string
  discount: string
  subtotal: string
  iva_rate_code: string
  iva_rate_pct: string
  iva_amount: string
  ice_amount: string
  product_id: string | null
  direct_account_id?: string | null
  category_id?: string | null
}

export interface PurchaseRetention {
  id: string
  purchase_id: string
  type: RetentionTypeT
  code: string
  description: string | null
  base_amount: string
  rate_pct: string
  amount: string
}

export interface Purchase {
  id: string
  tenant_id: string
  supplier_id: string
  document_type: PurchaseDocumentTypeT
  establishment: string
  emission_point: string
  sequential: string
  access_key: string | null
  issue_date: string
  registration_date: string
  subtotal_no_tax: string
  subtotal_zero: string
  subtotal_taxed: string
  subtotal_exempt: string
  iva_amount: string
  ice_amount: string
  total_discount: string
  total: string
  retention_renta_total: string
  retention_iva_total: string
  net_payable: string
  status: PurchaseStatusT
  payment_form: string | null
  notes: string | null
  reception_status?: PurchaseReceptionStatus
  created_at: string
  updated_at: string

  // relaciones
  supplier?: Supplier
  lines?: PurchaseLine[]
  retentions?: PurchaseRetention[]
}

// ─── Tipos del parser ────────────────────────────────────────────────

export interface ParsedSupplierInvoice {
  supplier: {
    ruc: string
    legal_name: string
  }
  document: {
    document_type: string
    establishment: string
    emission_point: string
    sequential: string
    access_key: string
    issue_date: string
    environment: 'TEST' | 'PRODUCTION'
  }
  totals: {
    subtotal_no_tax: number
    subtotal_zero: number
    subtotal_taxed: number
    subtotal_exempt: number
    iva_amount: number
    total_discount: number
    total: number
  }
  lines: Array<{
    line_number: number
    code?: string
    description: string
    quantity: number
    unit_price: number
    discount: number
    subtotal: number
    iva_rate_code: string
    iva_rate_pct: number
    iva_amount: number
  }>
  payment_form: string
  payments: Array<{ formaPago: string; total: number }>
  obligado_contabilidad: boolean
}

export interface RetentionSuggestion {
  type: RetentionTypeT
  code: string
  description: string
  base_amount: number
  rate_pct: number
  amount: number
  editable: boolean
}

export interface RetentionSuggestions {
  applies: boolean
  reason: string
  suggestions: RetentionSuggestion[]
  totals: { renta: number; iva: number }
}

export interface ParseXmlResponse {
  parsed: ParsedSupplierInvoice
  existing_supplier_id: string | null
  retentions_suggested: RetentionSuggestions
}

// ─── Constantes de display ───────────────────────────────────────────

export const SUPPLIER_TYPE_LABELS: Record<SupplierTypeT, string> = {
  PERSONA_NATURAL: 'Persona Natural',
  SOCIEDAD: 'Sociedad',
  EXTRANJERO: 'Extranjero',
  CONSUMIDOR_FINAL: 'Consumidor Final',
}

export const DOCUMENT_TYPE_LABELS: Record<PurchaseDocumentTypeT, string> = {
  FACTURA: 'Factura',
  NOTA_VENTA: 'Nota de Venta',
  LIQUIDACION_COMPRA: 'Liquidación de Compra',
  REEMBOLSO_GASTOS: 'Reembolso de Gastos',
}

export const PURCHASE_STATUS_LABELS: Record<PurchaseStatusT, string> = {
  DRAFT: 'Borrador',
  REGISTERED: 'Registrada',
  PAID: 'Pagada',
  ANNULLED: 'Anulada',
}

export const ID_TYPE_LABELS: Record<string, string> = {
  '04': 'RUC',
  '05': 'Cédula',
  '06': 'Pasaporte',
  '08': 'Identif. Exterior',
}

export const IVA_RATE_LABELS: Record<string, string> = {
  '0': '0%',
  '2': '12%',
  '3': '14%',
  '4': '15%',
  '5': '5%',
  '6': 'No sujeto',
  '7': 'Exento',
  '8': '8%',
}

export const PAYMENT_FORM_LABELS: Record<string, string> = {
  '01': 'Efectivo',
  '15': 'Compensación de deudas',
  '16': 'Tarjeta de débito',
  '17': 'Dinero electrónico',
  '18': 'Tarjeta prepago',
  '19': 'Tarjeta de crédito',
  '20': 'Otros con utilización del sistema financiero',
  '21': 'Endoso de títulos',
}

// Cuenta contable de gasto
export interface ExpenseAccount {
  id: string
  code: string
  name: string
  account_type: string
}

// ─── Recepciones de mercadería ───────────────────────────────────────

export type PurchaseReceptionStatus =
  'PENDING_RECEPTION' | 'PARTIALLY_RECEIVED' | 'RECEIVED'

export interface PurchaseReceipt {
  id: string
  purchase_id: string
  idempotency_key: string
  received_at: string
  received_by: string | null
  notes: string | null
  inventory_movements: Array<{
    id: string
    product_id: string
    warehouse_id: string
    quantity: string
    type: string
    reference: string | null
  }>
}

export interface CreateReceiptLine {
  purchase_line_id: string
  quantity: number
  warehouse_id: string
}

export interface CreateReceiptDto {
  idempotency_key: string
  lines: CreateReceiptLine[]
  notes?: string
}

export interface ReceiptSummaryLine {
  purchase_line_id: string
  description: string
  quantity_purchased: number
  quantity_received: number
  quantity_pending: number
  is_complete: boolean
  unit_price: number
  product_id: string
}

// ─── Formularios (compartidos con los componentes de compras) ────────

export interface LineForm {
  line_number: number
  code: string
  description: string
  quantity: string
  unit_price: string
  discount: string
  iva_rate_code: string
  product_id?: string
  direct_account_id?: string
  category_id?: string
  ret_renta_code?: string
  ret_renta_pct?: string
  ret_iva_code?: string
  ret_iva_pct?: string
}

export interface RetentionForm {
  type: RetentionTypeT
  code: string
  description: string
  base_amount: string
  rate_pct: string
}
