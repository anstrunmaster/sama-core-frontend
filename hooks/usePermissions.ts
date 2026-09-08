import { useQuery } from '@tanstack/react-query'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://d16rb4jhhui7p6.cloudfront.net/api/v1'

function getUser(): any {
  try {
    const s = localStorage.getItem('saas_auth')
    if (s) return JSON.parse(s).state?.user ?? {}
    return JSON.parse(localStorage.getItem('user') || '{}')
  } catch { return {} }
}

async function fetchPermissions(): Promise<string[]> {
  const user = getUser()

  // ADMIN y SUPER_ADMIN ven todo — no cargar permisos
  if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') {
    return []  // array vacío = ve todo
  }

  const res  = await fetch(`${API_URL}/users/me/permissions`, {
    credentials: 'include',
  })
  const json = await res.json()

  const inner = json.data ?? json
  const perms = inner.data ?? inner
  return Array.isArray(perms) ? perms : []
}

export function usePermissions() {
  return useQuery({
    queryKey: ['permissions'],
    queryFn:  fetchPermissions,
    staleTime: 0,  // ← siempre refetch al montar
    refetchOnMount: true,
    refetchOnWindowFocus: true,  // ← refetch al volver a la pestaña
  })
}

// Helper para verificar si un módulo está permitido
export function canView(permissions: string[] | undefined, module: string): boolean {
  // Sin permisos o array vacío → ve todo
  if (!permissions || !Array.isArray(permissions) || permissions.length === 0) return true

  // ← Ya no hay excepción para dashboard

  const group = module.split('.')[0]

  // Si es un grupo → mostrar si tiene AL MENOS UN ítem del grupo
  if (!module.includes('.')) {
    return permissions.some(p => p === module || p.startsWith(module + '.'))
  }

  // Si es un ítem → verificar ítem exacto o grupo completo
  return permissions.includes(module) || permissions.includes(group)
}
