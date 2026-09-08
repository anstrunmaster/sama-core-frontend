// ── Primitives ────────────────────────────────────────────────────────────────
export type UserRole   = 'SUPER_ADMIN' | 'ADMIN' | 'USER' | 'VIEWER'
export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'PENDING_VERIFICATION'
export type Plan       = 'BASIC' | 'PREMIUM' | 'ENTERPRISE'

// ── Auth ──────────────────────────────────────────────────────────────────────
export interface LoginCredentials { email: string; password: string }

export interface AuthUser {
  userId:        string
  email:         string
  name?:         string
  role:          UserRole
  tenantId:      string
  tenantName:    string
  plan:          Plan
  securityLevel: number
  sessionId:     string
  branchId:     string
}

export interface AuthTokens {
  expiresIn?:   string
  user:         AuthUser
}

// ── User ──────────────────────────────────────────────────────────────────────
export interface User {
  id:             string
  tenant_id:      string
  email:          string
  name:           string
  role:           UserRole
  status:         UserStatus
  email_verified: boolean
  two_fa_enabled: boolean
  last_login_at:  string | null
  created_at:     string
  updated_at:     string
}

export interface CreateUserPayload {
  email:    string
  name:     string
  password: string
  role?:    UserRole
}

export interface UpdateUserPayload {
  name?:   string
  role?:   UserRole
  status?: UserStatus
}

// ── Session ───────────────────────────────────────────────────────────────────
export interface Session {
  id:           string
  ip_address:   string | null
  device_name:  string | null
  user_agent:   string | null
  created_at:   string
  last_used_at?: string
  expires_at:   string
}

// ── Tenant ────────────────────────────────────────────────────────────────────
export interface Tenant {
  id:             string
  name:           string
  slug:           string
  ruc:            string
  email:          string | null
  plan:           Plan
  status:         string
  security_level: number
  created_at:     string
  updated_at:     string
  address?:       string | null
  city?:          string | null
  phone?:         string | null
  logo?:          string | null
}

export interface UpdateTenantPayload {
  name?:           string
  plan?:           Plan
  security_level?: number
  address?:        string
  city?:           string
  phone?:          string
  logo?:           string
  tipo_regimen?:           string
  obligado_contabilidad?:  boolean
  contribuyente_especial?: string | null
  agente_retencion?:       string | null
}

// ── Audit ─────────────────────────────────────────────────────────────────────
export type AuditAction =
  | 'LOGIN_SUCCESS' | 'LOGIN_FAILED' | 'LOGOUT' | 'LOGOUT_ALL'
  | 'TOKEN_REFRESH' | 'TOKEN_REVOKED' | 'SESSION_REVOKED'
  | 'PASSWORD_CHANGED' | 'PASSWORD_RESET_REQUEST' | 'PASSWORD_RESET_COMPLETE'
  | 'USER_CREATED' | 'USER_UPDATED' | 'USER_DELETED' | 'USER_SUSPENDED'
  | 'TENANT_CREATED' | 'TENANT_UPDATED' | 'RATE_LIMITED'
  | 'TWO_FA_ENABLED' | 'TWO_FA_DISABLED' | 'TWO_FA_SUCCESS' | 'TWO_FA_FAILED'
  | 'API_KEY_CREATED' | 'API_KEY_REVOKED'

export interface AuditLog {
  id:         string
  tenant_id:  string
  user_id:    string | null
  action:     AuditAction
  ip_address: string | null
  user_agent: string | null
  metadata:   Record<string, unknown> | null
  created_at: string
  user?:      { id: string; name: string; email: string } | null
}

// ── API wrappers ──────────────────────────────────────────────────────────────
export interface ApiResponse<T> { success: boolean; data: T; timestamp: string }
export interface PaginatedResponse<T> {
  items: T[]; total: number; page: number; limit: number; pages: number
}

export interface UserStats {
  total: number; active: number; inactive: number; admins: number
}
