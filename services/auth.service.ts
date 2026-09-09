import { api } from './api'
import { getCsrfToken } from '@/app/lib/csrf'
import type { AuthUser, Session, AuditLog, PaginatedResponse, ApiResponse } from '@/types'

export const authService = {
  login:      (email: string, password: string) =>
    api.post<ApiResponse<{ user: AuthUser; expiresIn: string }>>('/auth/login', { email, password }).then(r => r.data.data),

  refresh:    async () => {
    const csrfToken = await getCsrfToken()
     return api.post('/auth/refresh', {}, { headers: { 'X-CSRF-Token': csrfToken } }).then(r => r.data.data)
},

  logout: async () => {
  const csrfToken = await getCsrfToken()
  await fetch('https://api.teusec.com/api/v1/auth/logout', {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken,
    },
    body: JSON.stringify({}),
  }).catch(() => {})
},

  logoutAll:  async () => {
    const csrfToken = await getCsrfToken()
     return api.post('/auth/refresh', {}, { headers: { 'X-CSRF-Token': csrfToken } }).then(r => r.data.data)
},

  me:         () =>
    api.get<ApiResponse<{ user: AuthUser }>>('/auth/me').then(r => r.data.data.user),

  sessions:   () =>
    api.get<ApiResponse<Session[]>>('/auth/sessions').then(r => r.data.data),

  revokeSession: (id: string) =>
    api.delete(`/auth/sessions/${id}`),

  audit:      (page = 1) =>
    api.get<ApiResponse<PaginatedResponse<AuditLog>>>('/auth/audit', { params: { page, limit: 100 } })
       .then(r => r.data.data),
}
