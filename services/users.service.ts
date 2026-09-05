import { api } from './api'
import type { User, CreateUserPayload, UpdateUserPayload, PaginatedResponse, UserStats, ApiResponse } from '@/types'

export const usersService = {
  list: (params?: { page?: number; limit?: number; search?: string; status?: string }) =>
    api.get<ApiResponse<PaginatedResponse<User>>>('/users', { params: { limit: 50, ...params } })
       .then(r => r.data.data),

  stats: () =>
    api.get<ApiResponse<UserStats>>('/users/stats').then(r => r.data.data),

  create: (payload: CreateUserPayload) =>
    api.post<ApiResponse<User>>('/users', payload).then(r => r.data.data),

  update: (id: string, payload: UpdateUserPayload) =>
    api.put<ApiResponse<User>>(`/users/${id}`, payload).then(r => r.data.data),

  deactivate: (id: string) => api.delete(`/users/${id}`),
}
