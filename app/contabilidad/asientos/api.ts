import type {
  CreateJournalEntryInput,
  JournalEntry,
  JournalListResponse,
  JournalStats,
  UpdateJournalEntryInput,
} from './types'

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
    throw new Error(msg)
  }

  return (body?.data ?? body) as T
}

export const journalApi = {
  list: (params?: {
    page?: number
    limit?: number
    search?: string
    status?: 'DRAFT' | 'POSTED' | 'REVERSED'
    source?: string
    account_id?: string
    from?: string
    to?: string
  }): Promise<JournalListResponse> => {
    const qs = new URLSearchParams()
    if (params?.page) qs.set('page', String(params.page))
    if (params?.limit) qs.set('limit', String(params.limit))
    if (params?.search) qs.set('search', params.search)
    if (params?.status) qs.set('status', params.status)
    if (params?.source) qs.set('source', params.source)
    if (params?.account_id) qs.set('account_id', params.account_id)
    if (params?.from) qs.set('from', params.from)
    if (params?.to) qs.set('to', params.to)
    const q = qs.toString()
    return request(`/accounting/journal-entries${q ? `?${q}` : ''}`)
  },

  stats: (from?: string, to?: string): Promise<JournalStats> => {
    const qs = new URLSearchParams()
    if (from) qs.set('from', from)
    if (to) qs.set('to', to)
    const q = qs.toString()
    return request(`/accounting/journal-entries/stats${q ? `?${q}` : ''}`)
  },

  getById: (id: string): Promise<JournalEntry> =>
    request(`/accounting/journal-entries/${id}`),

  create: (data: CreateJournalEntryInput): Promise<JournalEntry> =>
    request('/accounting/journal-entries', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: UpdateJournalEntryInput): Promise<JournalEntry> =>
    request(`/accounting/journal-entries/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  post: (id: string): Promise<JournalEntry> =>
    request(`/accounting/journal-entries/${id}/post`, { method: 'POST' }),

  reverse: (id: string, reason?: string): Promise<JournalEntry> =>
    request(`/accounting/journal-entries/${id}/reverse`, {
      method: 'POST',
      body: JSON.stringify({ reason: reason ?? null }),
    }),

  delete: (id: string): Promise<void> =>
    request(`/accounting/journal-entries/${id}`, { method: 'DELETE' }),
}
