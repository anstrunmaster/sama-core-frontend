/**
 * Cliente HTTP del módulo Reportes.
 */

import type {
  SummaryResponse, SalesResponse, TaxResponse, CashFlowResponse,
  SalesGroupBy, DateRange,
} from './types'

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  'https://d16rb4jhhui7p6.cloudfront.net/api/v1'

export class ApiError extends Error {
  constructor(message: string, public statusCode: number) { super(message) }
}

async function get<T>(path: string, params?: Record<string, any>): Promise<T> {
  const q = new URLSearchParams(
    Object.entries(params || {}).reduce((acc, [k, v]) => {
      if (v !== undefined && v !== null && v !== '') acc[k] = String(v)
      return acc
    }, {} as Record<string, string>),
  ).toString()

  const url = `${API_URL}${path}${q ? `?${q}` : ''}`
  const res = await fetch(url, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
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

export const reportsApi = {
  summary: (range: DateRange) =>
    get<SummaryResponse>('/reports/summary', {
      date_from: range.from,
      date_to: range.to,
    }),
  sales: (range: DateRange, groupBy: SalesGroupBy) =>
    get<SalesResponse>('/reports/sales', {
      date_from: range.from,
      date_to: range.to,
      group_by: groupBy,
    }),
  tax: (range: DateRange) =>
    get<TaxResponse>('/reports/tax', {
      date_from: range.from,
      date_to: range.to,
    }),
  cashFlow: (range: DateRange) =>
    get<CashFlowResponse>('/reports/cash-flow', {
      date_from: range.from,
      date_to: range.to,
    }),
}

// Helpers de formato (reutilizables)

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

export function fmtNumber(n: number) {
  return new Intl.NumberFormat('es-EC').format(n)
}
