// types/rrhh.ts — Tipos del módulo de Talento Humano (Fase RH-A)

export type EmployeeIdType = 'CEDULA' | 'PASAPORTE';
export type MaritalStatus =
  | 'SOLTERO'
  | 'CASADO'
  | 'DIVORCIADO'
  | 'VIUDO'
  | 'UNION_LIBRE';
export type Gender = 'MASCULINO' | 'FEMENINO' | 'OTRO';
export type BankAccountType = 'AHORROS' | 'CORRIENTE';
export type ContractType = 'INDEFINIDO' | 'TEMPORAL' | 'SERVICIOS' | 'EVENTUAL';
export type EmploymentStatus =
  | 'ACTIVO'
  | 'SUSPENDIDO'
  | 'VACACIONES'
  | 'DESVINCULADO';

export interface Department {
  id: string;
  tenant_id: string;
  branch_id: string | null;
  parent_id: string | null;
  code: string;
  name: string;
  description: string | null;
  cost_center: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // opcionales según el include del backend
  _count?: { employees: number; positions: number };
  children?: Department[];
  parent?: Department | null;
}

export interface Position {
  id: string;
  tenant_id: string;
  department_id: string | null;
  code: string;
  name: string;
  description: string | null;
  // OJO: el backend manda Decimal como string
  salary_min: string | number | null;
  salary_max: string | number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  department?: { id: string; name: string; code: string } | null;
  _count?: { employees: number };
}

export interface Employee {
  id: string;
  tenant_id: string;
  employee_global_id: string;
  employee_code: string;

  first_name: string;
  last_name: string;
  id_type: EmployeeIdType;
  id_number: string;
  birth_date: string | null;
  marital_status: MaritalStatus | null;
  gender: Gender | null;
  nationality: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;

  branch_id: string | null;
  department_id: string | null;
  position_id: string | null;
  supervisor_id: string | null;
  cost_center: string | null;
  hire_date: string;
  contract_type: ContractType;
  employment_status: EmploymentStatus;
  termination_date: string | null;

  bank_name: string | null;
  bank_account_type: BankAccountType | null;
  bank_account_number: string | null;

  tax_id: string | null;
  has_withholding: boolean;
  withholding_notes: string | null;

  is_active: boolean;
  created_at: string;
  updated_at: string;

  department?: { id: string; name: string; code: string } | null;
  position?: { id: string; name: string; code: string } | null;
  supervisor?: {
    id: string;
    first_name: string;
    last_name: string;
    employee_code?: string;
  } | null;
  subordinates?: {
    id: string;
    first_name: string;
    last_name: string;
    employee_code: string;
  }[];
}

export interface EmployeeListResponse {
  data: Employee[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface EmployeeFilters {
  search?: string;
  department_id?: string;
  position_id?: string;
  employment_status?: EmploymentStatus;
  page?: number;
  limit?: number;
}

// Payloads de creación/edición
export type CreateDepartmentPayload = Omit<
  Department,
  'id' | 'tenant_id' | 'created_at' | 'updated_at' | '_count' | 'children' | 'parent'
>;
export type CreatePositionPayload = {
  department_id?: string | null;
  code: string;
  name: string;
  description?: string | null;
  salary_min?: number | null;
  salary_max?: number | null;
  is_active?: boolean;
};
export type CreateEmployeePayload = Omit<
  Employee,
  | 'id'
  | 'tenant_id'
  | 'employee_global_id'
  | 'employee_code'
  | 'is_active'
  | 'created_at'
  | 'updated_at'
  | 'department'
  | 'position'
  | 'supervisor'
  | 'subordinates'
>;
