import { api } from './api'
import type { AuthTokens, AuthUser, Session, AuditLog, PaginatedResponse, ApiResponse } from '@/types'

export const authService = {
  login:      (email: string, password: string) =>
    api.post<ApiResponse<AuthTokens>>('/auth/login', { email, password }).then(r => r.data.data),

  refresh:    (refreshToken: string) =>
    api.post<ApiResponse<AuthTokens>>('/auth/refresh', { refreshToken }).then(r => r.data.data),

  logout:     () => api.post('/auth/logout').catch(() => {}),

  logoutAll:  () => api.post('/auth/logout-all').catch(() => {}),

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
