/**
 * Helpers HTTP centralizados para el módulo Banco.
 *
 * Reusa el patrón del resto del proyecto:
 *   - Lee el token del localStorage (_at o accessToken)
 *   - URL configurable via NEXT_PUBLIC_API_URL
 *   - Devuelve directamente el `.data` (TransformInterceptor del backend)
 */

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  'https://d16rb4jhhui7p6.cloudfront.net/api/v1'

function getToken(): string {
  return localStorage.getItem('_at') || localStorage.getItem('accessToken') || ''
}

export class ApiError extends Error {
  constructor(message: string, public statusCode: number) {
    super(message)
  }
}

async function request<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`,
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

  // El backend envuelve todo en { success, data, timestamp }
  return (body?.data ?? body) as T
}

export const bankApi = {
  // Cuentas
  listAccounts: (params?: Record<string, any>) => {
    const q = new URLSearchParams(
      Object.entries(params || {}).reduce((acc, [k, v]) => {
        if (v !== undefined && v !== null && v !== '') acc[k] = String(v)
        return acc
      }, {} as Record<string, string>),
    ).toString()
    return request<any>(`/bank/accounts${q ? `?${q}` : ''}`)
  },
  createAccount: (data: any) =>
    request<any>('/bank/accounts', { method: 'POST', body: JSON.stringify(data) }),
  updateAccount: (id: string, data: any) =>
    request<any>(`/bank/accounts/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  archiveAccount: (id: string) =>
    request<void>(`/bank/accounts/${id}`, { method: 'DELETE' }),

  // Movimientos
  listMovements: (params?: Record<string, any>) => {
    const q = new URLSearchParams(
      Object.entries(params || {}).reduce((acc, [k, v]) => {
        if (v !== undefined && v !== null && v !== '') acc[k] = String(v)
        return acc
      }, {} as Record<string, string>),
    ).toString()
    return request<any>(`/bank/movements${q ? `?${q}` : ''}`)
  },
  createMovement: (accountId: string, data: any) =>
    request<any>(`/bank/accounts/${accountId}/movements`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateMovement: (id: string, data: any) =>
    request<any>(`/bank/movements/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteMovement: (id: string) =>
    request<void>(`/bank/movements/${id}`, { method: 'DELETE' }),

  // Conciliación
  reconcileMovement: (id: string, invoiceId: string) =>
    request<any>(`/bank/movements/${id}/reconcile`, {
      method: 'POST',
      body: JSON.stringify({ invoice_id: invoiceId }),
    }),
  ignoreMovement: (id: string) =>
    request<any>(`/bank/movements/${id}/ignore`, { method: 'POST' }),
  listReconcilableInvoices: () =>
    request<any[]>('/bank/reconcilable-invoices'),
  listReconcilablePurchases: () =>
    request<any[]>('/purchases?status=REGISTERED&limit=200'),

    // Anticipos
  createAdvance: (data: any) =>
    request<any>('/bank/advances', { method: 'POST', body: JSON.stringify(data) }),
  listAdvances: (params?: Record<string, any>) => {
    const q = new URLSearchParams(
      Object.entries(params || {}).reduce((acc, [k, v]) => {
        if (v !== undefined && v !== null && v !== '') acc[k] = String(v)
        return acc
      }, {} as Record<string, string>),
    ).toString()
    return request<any>(`/bank/advances${q ? `?${q}` : ''}`)
  },

  // Resumen
  getSummary: () => request<any>('/bank/summary'),
}

export function fmtMoney(value: number | string, currency = 'USD') {
  const n = typeof value === 'string' ? parseFloat(value) : value
  return new Intl.NumberFormat('es-EC', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(n)
}

export function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-EC', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}
