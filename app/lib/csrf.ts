let _csrfToken: string | null = null

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://d16rb4jhhui7p6.cloudfront.net/api/v1'

export async function getCsrfToken(): Promise<string> {
  if (_csrfToken) return _csrfToken

  const res = await fetch(`${API_URL}/auth/csrf-token`, {
    credentials: 'include',
  })

  if (!res.ok) {
    throw new Error('No se pudo obtener el token CSRF')
  }

  const body = await res.json()
  _csrfToken = body.data?.csrfToken ?? body.csrfToken

  if (!_csrfToken) {
    throw new Error('El backend no devolvió un token CSRF')
  }

  return _csrfToken
}

export function clearCsrfToken() {
  _csrfToken = null
}