import type {
  AccountLedger,
  AccountingMapping,
  AccountingMappingKey,
  BatchResult,
  PendingDocument,
  PendingSummary,
} from './types-4c'

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  'https://d16rb4jhhui7p6.cloudfront.net/api/v1'

function getToken(): string {
  if (typeof window === 'undefined') return ''
  return localStorage.getItem('_at') || localStorage.getItem('accessToken') || ''
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken()
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: token ? `Bearer ${token}` : '',
      ...(init?.headers ?? {}),
    },
  })

  if (res.status === 401) {
    if (typeof window !== 'undefined') {
      localStorage.clear()
      window.location.href = '/login'
    }
    throw new Error('No autorizado')
  }

  const body = await res.json().catch(() => null)
  if (!res.ok) {
    const msg =
      body?.message ||
      body?.error ||
      (Array.isArray(body?.errors) ? body.errors.join('. ') : null) ||
      `Error ${res.status}`
    throw new Error(Array.isArray(msg) ? msg.join('. ') : msg)
  }

  return (body?.data ?? body) as T
}

export const mappingsApi = {
  list: (): Promise<AccountingMapping[]> => request('/accounting/mappings'),
  set: (key: AccountingMappingKey, account_id: string): Promise<AccountingMapping> =>
    request('/accounting/mappings', {
      method: 'POST',
      body: JSON.stringify({ key, account_id }),
    }),
  unset: (key: AccountingMappingKey): Promise<void> =>
    request(`/accounting/mappings/${key}`, { method: 'DELETE' }),
}

export const pendingApi = {
  summary: (): Promise<PendingSummary> => request('/accounting/pending/summary'),
  invoices: (limit = 100): Promise<PendingDocument[]> =>
    request(`/accounting/pending/invoices?limit=${limit}`),
  purchases: (limit = 100): Promise<PendingDocument[]> =>
    request(`/accounting/pending/purchases?limit=${limit}`),

  generateInvoice: (id: string): Promise<{ entry_number: string }> =>
    request(`/accounting/pending/generate/invoice/${id}`, { method: 'POST' }),

  generatePurchase: (id: string): Promise<{ entry_number: string }> =>
    request(`/accounting/pending/generate/purchase/${id}`, { method: 'POST' }),

  generateBatch: (invoice_ids: string[], purchase_ids: string[]): Promise<BatchResult> =>
    request('/accounting/pending/generate/batch', {
      method: 'POST',
      body: JSON.stringify({ invoice_ids, purchase_ids }),
    }),
}

export const ledgerApi = {
  byAccount: (accountId: string, from?: string, to?: string): Promise<AccountLedger> => {
    const qs = new URLSearchParams()
    if (from) qs.set('from', from)
    if (to) qs.set('to', to)
    const q = qs.toString()
    return request(`/accounting/ledger/account/${accountId}${q ? `?${q}` : ''}`)
  },
}

export interface SriDocument extends PendingDocument {
  subtotal:           number
  iva:                number
  clave_acceso:       string
  fecha_autorizacion: string | null
  xml_disponible:     boolean
}

export const sriApi = {
  pendingDocuments: (limit = 500): Promise<SriDocument[]> =>
    request(`/sri/documents/pending?limit=${limit}`),
  detalles: (claveAcceso: string): Promise<{ detalles: any[]; error?: string }> =>
    request(`/sri/documents/${claveAcceso}/detalles`),
}
