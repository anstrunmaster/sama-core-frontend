// lib/rrhh-api.ts — Cliente de API del módulo RRHH
// Usa el helper request<T>() existente, que ya extrae body.data y mete el JWT.

import { request } from '@/lib/api';
import type {
  Department,
  Position,
  Employee,
  EmployeeListResponse,
  EmployeeFilters,
  CreateDepartmentPayload,
  CreatePositionPayload,
  CreateEmployeePayload,
} from '@/lib/rrhh-types';

// ---------------- Departamentos ----------------
export const departmentsApi = {
  list: () => request<Department[]>('/rrhh/departments'),
  tree: () => request<Department[]>('/rrhh/departments/tree'),
  get: (id: string) => request<Department>(`/rrhh/departments/${id}`),
  create: (payload: Partial<CreateDepartmentPayload>) =>
    request<Department>('/rrhh/departments', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  update: (id: string, payload: Partial<CreateDepartmentPayload>) =>
    request<Department>(`/rrhh/departments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  remove: (id: string) =>
    request<Department>(`/rrhh/departments/${id}`, { method: 'DELETE' }),
};

// ---------------- Cargos ----------------
export const positionsApi = {
  list: () => request<Position[]>('/rrhh/positions'),
  get: (id: string) => request<Position>(`/rrhh/positions/${id}`),
  create: (payload: Partial<CreatePositionPayload>) =>
    request<Position>('/rrhh/positions', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  update: (id: string, payload: Partial<CreatePositionPayload>) =>
    request<Position>(`/rrhh/positions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  remove: (id: string) =>
    request<Position>(`/rrhh/positions/${id}`, { method: 'DELETE' }),
};

// ---------------- Empleados ----------------
function buildQuery(filters: EmployeeFilters = {}): string {
  const params = new URLSearchParams();
  if (filters.search) params.set('search', filters.search);
  if (filters.department_id) params.set('department_id', filters.department_id);
  if (filters.position_id) params.set('position_id', filters.position_id);
  if (filters.employment_status)
    params.set('employment_status', filters.employment_status);
  if (filters.page) params.set('page', String(filters.page));
  if (filters.limit) params.set('limit', String(filters.limit));
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export const employeesApi = {
  list: (filters?: EmployeeFilters) =>
    request<EmployeeListResponse>(`/rrhh/employees${buildQuery(filters)}`),
  get: (id: string) => request<Employee>(`/rrhh/employees/${id}`),
  create: (payload: Partial<CreateEmployeePayload>) =>
    request<Employee>('/rrhh/employees', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  update: (id: string, payload: Partial<CreateEmployeePayload>) =>
    request<Employee>(`/rrhh/employees/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  remove: (id: string) =>
    request<Employee>(`/rrhh/employees/${id}`, { method: 'DELETE' }),
};

// Helper num() del proyecto: los Decimal llegan como string
export function num(v: any): number {
  if (typeof v === 'number') return v;
  if (typeof v === 'string') return parseFloat(v);
  if (typeof v?.toNumber === 'function') return v.toNumber();
  return 0;
}
