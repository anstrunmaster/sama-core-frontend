export interface SessionPayload {
  sub: string
  tenantId: string
  email: string
  role: string
  plan: string
  securityLevel: number
  branchId?: string | null
  agenteRetencion?: string | null
}

export function getCurrentSession(): SessionPayload | null {
  try {
    if (typeof window === 'undefined') return null
    const token = localStorage.getItem('_at') || localStorage.getItem('accessToken') || ''
    if (!token) return null
    return JSON.parse(atob(token.split('.')[1])) as SessionPayload
  } catch {
    return null
  }
}
