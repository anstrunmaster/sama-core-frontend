import type {
  Account,
  AccountStats,
  AccountWithChildren,
  CreateAccountInput,
  UpdateAccountInput,
} from './types'

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  'https://d16rb4jhhui7p6.cloudfront.net/api/v1'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
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
    throw new Error(msg)
  }

  // Backend wraps response: { success, data, timestamp }
  return (body?.data ?? body) as T
}

export const accountsApi = {
  list: (params?: {
    search?: string
    account_type?: string
    only_movement?: boolean
    include_inactive?: boolean
  }): Promise<Account[]> => {
    const qs = new URLSearchParams()
    if (params?.search) qs.set('search', params.search)
    if (params?.account_type) qs.set('account_type', params.account_type)
    if (params?.only_movement) qs.set('only_movement', 'true')
    if (params?.include_inactive) qs.set('include_inactive', 'true')
    const q = qs.toString()
    return request(`/accounting/accounts${q ? `?${q}` : ''}`)
  },

  tree: (): Promise<AccountWithChildren[]> =>
    request('/accounting/accounts/tree'),

  stats: (): Promise<AccountStats> =>
    request('/accounting/accounts/stats'),

  getById: (id: string): Promise<AccountWithChildren> =>
    request(`/accounting/accounts/${id}`),

  create: (data: CreateAccountInput): Promise<Account> =>
    request('/accounting/accounts', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  seed: (): Promise<{ created: number; skipped: boolean }> =>
    request('/accounting/accounts/seed', { method: 'POST' }),

  update: (id: string, data: UpdateAccountInput): Promise<Account> =>
    request(`/accounting/accounts/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  delete: (id: string): Promise<void> =>
    request(`/accounting/accounts/${id}`, { method: 'DELETE' }),
}
