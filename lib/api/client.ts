// lib/api/client.ts
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://d16rb4jhhui7p6.cloudfront.net/api/v1';

function getToken(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('_at') || localStorage.getItem('accessToken') || '';
}

/**
 * Wrapper de fetch que:
 *  - inyecta Authorization Bearer automáticamente
 *  - destrambuca el envelope { success, data } del TransformInterceptor
 *  - lanza Error con mensaje del backend en caso de fallo
 *  - soporta respuestas binarias (PDFs, etc.) devolviendo Blob
 */
export async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string> | undefined),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, { ...init, headers });

  if (!res.ok) {
    let msg = `${res.status} ${res.statusText}`;
    try {
      const body = await res.json();
      msg = body?.message || body?.error || msg;
    } catch { /* respuesta no JSON */ }
    throw new Error(msg);
  }

  const contentType = res.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    return (await res.blob()) as unknown as T;
  }
  const body = await res.json();
  return (body?.data ?? body) as T;
}
