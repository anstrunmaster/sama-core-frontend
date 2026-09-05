import { api } from './api'
import type { Tenant, UpdateTenantPayload, ApiResponse } from '@/types'

export const tenantsService = {
  me:    () => api.get<ApiResponse<Tenant>>('/tenants/me').then(r => r.data.data),
  stats: () => api.get<ApiResponse<{ tenant: Tenant; userStats: Record<string, number> }>>('/tenants/me/stats').then(r => r.data.data),
  update:(id: string, payload: UpdateTenantPayload) =>
    api.put<ApiResponse<Tenant>>(`/tenants/${id}`, payload).then(r => r.data.data),
}
