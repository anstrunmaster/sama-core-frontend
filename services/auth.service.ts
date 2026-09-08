import { api } from './api'
import { getCsrfToken } from '@/app/lib/csrf'
import type { AuthUser, Session, AuditLog, PaginatedResponse, ApiResponse } from '@/types'

export const authService = {
  login:      (email: string, password: string) =>
    api.post<ApiResponse<{ user: AuthUser; expiresIn: string }>>('/auth/login', { email, password }).then(r => r.data.data),

  refresh:    async () => {
    const csrfToken = await getCsrfToken()
    return api.post('/auth/refresh', null, { headers: { 'X-CSRF-Token': csrfToken } }).then(r => r.data.data)
  },

  logout:     async () => {
    const csrfToken = await getCsrfToken()
    return api.post('/auth/logout', null, { headers: { 'X-CSRF-Token': csrfToken } }).catch(() => {})
  },

  logoutAll:  async () => {
    const csrfToken = await getCsrfToken()
    return api.post('/auth/logout-all', null, { headers: { 'X-CSRF-Token': csrfToken } }).catch(() => {})
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
