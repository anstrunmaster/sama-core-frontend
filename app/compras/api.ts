/**
 * Cliente HTTP del módulo Compras + Proveedores.
 */

import type {
  ParseXmlResponse,
  Purchase,
  Supplier,
  PurchaseReceipt,
  CreateReceiptDto,
  ReceiptSummaryLine,
} from './types'

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  'https://d16rb4jhhui7p6.cloudfront.net/api/v1'

export class ApiError extends Error {
  constructor(message: string, public statusCode: number) { super(message) }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  })

  let body: any
  try { body = await res.json() } catch { body = null }

  if (!res.ok) {
    const msg =
      (Array.isArray(body?.message) ? body.message[0] : body?.message) ||
      body?.error ||
      `Error ${res.status}`
    throw new ApiError(msg, res.status)
  }

  return (body?.data ?? body) as T
}

function buildQuery(params?: Record<string, any>): string {
  if (!params) return ''
  const q = new URLSearchParams(
    Object.entries(params).reduce((acc, [k, v]) => {
      if (v !== undefined && v !== null && v !== '') acc[k] = String(v)
      return acc
    }, {} as Record<string, string>),
  ).toString()
  return q ? `?${q}` : ''
}

// ─── Suppliers ──────────────────────────────────────────────────────

export const suppliersApi = {
  list: (params?: Record<string, any>) =>
    request<{ data: Supplier[]; pagination: any }>(`/suppliers${buildQuery(params)}`),

  create: (data: any) =>
    request<Supplier>('/suppliers', { method: 'POST', body: JSON.stringify(data) }),

  createFromXml: (xml_content: string) =>
    request<{ supplier: Supplier }>('/suppliers/from-xml', {
      method: 'POST',
      body: JSON.stringify({ xml_content }),
    }),

  getById: (id: string) => request<Supplier>(`/suppliers/${id}`),

  update: (id: string, data: any) =>
    request<Supplier>(`/suppliers/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  archive: (id: string) =>
    request<void>(`/suppliers/${id}`, { method: 'DELETE' }),
}

// ─── Purchases ──────────────────────────────────────────────────────

export const purchasesApi = {
  list: (params?: Record<string, any>) =>
    request<{ data: Purchase[]; pagination: any }>(`/purchases${buildQuery(params)}`),

  getById: (id: string) => request<Purchase>(`/purchases/${id}`),

  create: (data: any) =>
    request<Purchase>('/purchases', { method: 'POST', body: JSON.stringify(data) }),

  update: (id: string, data: any) =>
  request<Purchase>(`/purchases/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  register: (id: string) =>
    request<Purchase>(`/purchases/${id}/register`, { method: 'POST' }),

  annul: (id: string) =>
    request<Purchase>(`/purchases/${id}/annul`, { method: 'POST' }),

  pay: (
    id: string,
    data: {
      bank_account_id: string
      payment_date?: string
      reference?: string
      notes?: string
    },
  ) =>
    request<{ purchase: Purchase; movement: any }>(
      `/purchases/${id}/pay`,
      { method: 'POST', body: JSON.stringify(data) },
    ),

  delete: (id: string) =>
    request<void>(`/purchases/${id}`, { method: 'DELETE' }),

  parseXml: (xml_content: string) =>
    request<ParseXmlResponse>('/purchases/parse-xml', {
      method: 'POST',
      body: JSON.stringify({ xml_content }),
    }),

  suggestRetentions: (input: {
    supplier_id: string
    subtotal_taxed: number
    subtotal_zero: number
    iva_amount: number
    has_services: boolean
  }) =>
    request<any>('/purchases/suggest-retentions', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  // Agregar en purchasesApi:
accountingPreview: (id: string, expenseAccountId?: string) =>
  request<any>(`/purchases/${id}/accounting-preview${expenseAccountId ? `?expense_account_id=${expenseAccountId}` : ''}`),

  // Cuentas de gasto disponibles para el selector
expenseAccounts: () =>
  request<Array<{ id: string; code: string; name: string; account_type: string }>>(
    '/purchases/expense-accounts'
  ),

  // ─── Recepciones de mercadería ───
  createReceipt: (purchaseId: string, dto: CreateReceiptDto) =>
    request<PurchaseReceipt>(`/purchases/${purchaseId}/receipts`, {
      method: 'POST',
      body: JSON.stringify(dto),
    }),

  getReceipts: (purchaseId: string) =>
    request<PurchaseReceipt[]>(`/purchases/${purchaseId}/receipts`),

  getReceiptSummary: (purchaseId: string) =>
    request<ReceiptSummaryLine[]>(`/purchases/${purchaseId}/receipt-summary`),
}

// ─── Helpers de formato ─────────────────────────────────────────────

export function fmtMoney(value: number | string, currency = 'USD') {
  const n = typeof value === 'string' ? parseFloat(value) : value
  return new Intl.NumberFormat('es-EC', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(n || 0)
}

export function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-EC', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

export function fmtNumber(n: number | string) {
  const v = typeof n === 'string' ? parseFloat(n) : n
  return new Intl.NumberFormat('es-EC').format(v || 0)
}
