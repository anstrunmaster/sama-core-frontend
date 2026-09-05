import type {
  BalanceSheet,
  ClosingExecuteResult,
  ClosingPreview,
  ClosingStatus,
  IncomeStatement,
  TrialBalance,
} from './types-4d'

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

export const reportsApi = {
  balanceSheet: (asOf?: string): Promise<BalanceSheet> => {
    const q = asOf ? `?as_of=${asOf}` : ''
    return request(`/accounting/reports/balance-sheet${q}`)
  },
  incomeStatement: (from?: string, to?: string): Promise<IncomeStatement> => {
    const qs = new URLSearchParams()
    if (from) qs.set('from', from)
    if (to) qs.set('to', to)
    const q = qs.toString()
    return request(`/accounting/reports/income-statement${q ? `?${q}` : ''}`)
  },
  trialBalance: (asOf?: string): Promise<TrialBalance> => {
    const q = asOf ? `?as_of=${asOf}` : ''
    return request(`/accounting/reports/trial-balance${q}`)
  },
}

export const closingApi = {
  status: (year: number): Promise<ClosingStatus> =>
    request(`/accounting/closing/status?year=${year}`),
  preview: (year: number): Promise<ClosingPreview> =>
    request(`/accounting/closing/preview?year=${year}`),
  execute: (
    year: number,
    closingDate?: string,
    description?: string,
  ): Promise<ClosingExecuteResult> =>
    request('/accounting/closing/execute', {
      method: 'POST',
      body: JSON.stringify({
        year,
        closing_date: closingDate,
        description,
      }),
    }),
}
