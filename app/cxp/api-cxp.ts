/**
 * api-cxp.ts — Cliente HTTP para Cuentas por Pagar (CxP)
 *
 * Reutiliza el patrón de autenticación del proyecto:
 * lee el token del localStorage (_at o accessToken).
 */

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  'https://d16rb4jhhui7p6.cloudfront.net/api/v1'

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
    throw new Error(msg)
  }
  return (body?.data ?? body) as T
}

/** Parámetros de consulta para CxP */
export interface PayablesParams {
  supplier_id?: string
  date_from?:   string
  date_to?:     string
  /** current | 1_30 | 31_60 | 61_90 | 90_plus */
  bucket?:      string
  page?:        number
  limit?:       number
}

/** Resumen de aging */
export interface PayablesSummary {
  total_payable: number
  current:       number
  days_1_30:     number
  days_31_60:    number
  days_61_90:    number
  days_90_plus:  number
  count:         number
}

/** Fila de cartera — una compra con saldo pendiente */
export interface PayableRow {
  purchase_id: string
  sequential:  string
  issue_date:  string
  supplier:    { id: string; legal_name: string; identification: string } | null
  total:       number
  paid:        number
  balance:     number
  days_age:    number
  /** current | 1_30 | 31_60 | 61_90 | 90_plus */
  bucket:      string
}

export interface PayablesResponse {
  summary:    PayablesSummary
  data:       PayableRow[]
  pagination: { page: number; limit: number; total: number; pages: number }
}

export const cxpApi = {
  /**
   * Lista compras con saldo pendiente, aging y summary consolidado.
   * Solo retorna compras POSTED o APPROVED con balance > 0.
   */
  getPayables: (params?: PayablesParams): Promise<PayablesResponse> => {
    const q = new URLSearchParams(
      Object.entries(params || {}).reduce((acc, [k, v]) => {
        if (v !== undefined && v !== null && v !== '') acc[k] = String(v)
        return acc
      }, {} as Record<string, string>),
    ).toString()
    return request<PayablesResponse>(`/payables${q ? `?${q}` : ''}`)
  },
}

// ── Helpers de formato ────────────────────────────────────────────────────

export function fmtMoney(n: number): string {
  return new Intl.NumberFormat('es-EC', {
    style: 'currency', currency: 'USD',
    minimumFractionDigits: 2,
  }).format(n)
}

export function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-EC', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

/**
 * Retorna clases de color Tailwind según el bucket de aging.
 * Idéntico a CxC — misma lógica de colores.
 */
export function bucketColor(bucket: string): {
  bg: string; text: string; border: string; label: string
} {
  switch (bucket) {
    case 'current':  return { bg: 'bg-green-500/10',  text: 'text-green-600 dark:text-green-400',  border: 'border-green-500/20',  label: 'Al día' }
    case '1_30':     return { bg: 'bg-blue-500/10',   text: 'text-blue-600 dark:text-blue-400',    border: 'border-blue-500/20',   label: '1-30 días' }
    case '31_60':    return { bg: 'bg-amber-500/10',  text: 'text-amber-600 dark:text-amber-400',  border: 'border-amber-500/20',  label: '31-60 días' }
    case '61_90':    return { bg: 'bg-orange-500/10', text: 'text-orange-600 dark:text-orange-400',border: 'border-orange-500/20', label: '61-90 días' }
    case '90_plus':  return { bg: 'bg-red-500/10',    text: 'text-red-600 dark:text-red-400',      border: 'border-red-500/20',    label: '+90 días' }
    default:         return { bg: 'bg-edge-subtle',   text: 'text-ink-tertiary',                   border: 'border-edge',          label: bucket }
  }
}
