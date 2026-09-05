import type {
  Quotation, PaginatedQuotations, QuotationStatus,
  QuotationItem, QuotationPaymentTerm, QuotationAdditionalInfo,
} from './types-cotizaciones'

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  'https://d16rb4jhhui7p6.cloudfront.net/api/v1'

function getToken(): string {
  return localStorage.getItem('_at') || localStorage.getItem('accessToken') || ''
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization:  `Bearer ${getToken()}`,
      ...options.headers,
    },
  })
  const json = await res.json()
  const payload = json.data ?? json
  if (!res.ok) {
    const msg = Array.isArray(payload?.message)
      ? payload.message[0]
      : payload?.message || payload?.error || 'Error desconocido'
    throw new Error(msg)
  }
  return payload as T
}

// ─── Create body ──────────────────────────────────────────────────────────────
export interface CreateQuotationBody {
  customer_id?:         string
  buyer_id_type?:       string
  buyer_id?:            string
  buyer_name?:          string
  buyer_email?:         string
  buyer_address?:       string
  buyer_phone?:         string
  buyer_city?:          string
  buyer_address_branch?: string
  issue_date?:          string
  due_date?:            string
  credit_days?:         number
  seller?:              string
  items:                QuotationItem[]
  subtotal:             number
  discount_total:       number
  tax_total:            number
  total:                number
  payment_terms?:       QuotationPaymentTerm[]
  payment_method?:      string
  notes?:               string
  valid_until?:         string
  additional_info?:     QuotationAdditionalInfo[]
}

// ─── API ──────────────────────────────────────────────────────────────────────
export const quotationsApi = {
  list(params: {
    page?:   number
    limit?:  number
    status?: QuotationStatus
    search?: string
  } = {}): Promise<PaginatedQuotations> {
    const q = new URLSearchParams()
    if (params.page)   q.set('page',   String(params.page))
    if (params.limit)  q.set('limit',  String(params.limit))
    if (params.status) q.set('status', params.status)
    if (params.search) q.set('search', params.search)
    const qs = q.toString() ? `?${q}` : ''
    return request<PaginatedQuotations>(`/quotations${qs}`)
  },

  get(id: string): Promise<Quotation> {
    return request<Quotation>(`/quotations/${id}`)
  },

  create(body: CreateQuotationBody): Promise<Quotation> {
    return request<Quotation>('/quotations', {
      method: 'POST',
      body:   JSON.stringify(body),
    })
  },

  update(id: string, body: Partial<CreateQuotationBody>): Promise<Quotation> {
    return request<Quotation>(`/quotations/${id}`, {
      method: 'PUT',
      body:   JSON.stringify(body),
    })
  },

  delete(id: string): Promise<{ deleted: boolean }> {
    return request(`/quotations/${id}`, { method: 'DELETE' })
  },

  changeStatus(
    id: string,
    status: Extract<QuotationStatus, 'SENT' | 'APPROVED' | 'REJECTED'>,
  ): Promise<Quotation> {
    return request<Quotation>(`/quotations/${id}/status`, {
      method: 'PATCH',
      body:   JSON.stringify({ status }),
    })
  },

  convert(id: string): Promise<{ quotation_id: string; access_key: string; invoice_data: any }> {
    return request(`/quotations/${id}/convert`, { method: 'POST' })
  },

  sendEmail(id: string): Promise<{ sent: boolean; email: string; number: string }> {
    return request(`/quotations/${id}/email`, { method: 'POST' })
  },
}
