/**
 * Cliente HTTP del módulo Anexos e Impuestos.
 */

import type { OverviewResponse, Form104Response, TaxPeriod } from './types'

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  'https://d16rb4jhhui7p6.cloudfront.net/api/v1'

function getToken(): string {
  return localStorage.getItem('_at') || localStorage.getItem('accessToken') || ''
}

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
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`,
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

export const taxReportsApi = {
  overview: (period: TaxPeriod) =>
    get<OverviewResponse>('/tax-reports/overview', period),

  form103: async (period: TaxPeriod) => {
  const res = await fetch(
    `${API_URL}/tax-reports/form-103?year=${period.year}&month=${period.month}`,
    { headers: { Authorization: `Bearer ${getToken()}` } }
  )
  const data = await res.json()
  return data.data ?? data
},

  form104: (period: TaxPeriod) =>
    get<Form104Response>('/tax-reports/form-104', period),

  /**
   * Descarga el XML del ATS.
   * Usa fetch directo (no JSON) y desencadena el download del navegador.
   */
  downloadAts: async (period: TaxPeriod) => {
    const q = new URLSearchParams({
      year: String(period.year),
      month: String(period.month),
    }).toString()

    const res = await fetch(`${API_URL}/tax-reports/ats?${q}`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    })

    if (!res.ok) {
      let msg = `Error ${res.status}`
      try {
        const body = await res.json()
        msg = body?.message || body?.error || msg
      } catch { /* binary response */ }
      throw new ApiError(msg, res.status)
    }

    // Extraer filename del Content-Disposition
    const dispo = res.headers.get('Content-Disposition') || ''
    const match = dispo.match(/filename="?([^"]+)"?/)
    const filename = match?.[1] || `ATS_${period.year}_${period.month}.xml`

    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    return { filename, size: blob.size }
  },
  
}



// ─── Helpers de formato ─────────────────────────────────────────────

export function fmtMoney(value: number) {
  return new Intl.NumberFormat('es-EC', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(value || 0)
}

export function fmtNumber(n: number) {
  return new Intl.NumberFormat('es-EC').format(n)
}
