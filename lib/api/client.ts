// lib/api/client.ts
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://d16rb4jhhui7p6.cloudfront.net/api/v1';

/**
 * Wrapper de fetch que:
 *  - envía cookies HttpOnly automáticamente
 *  - destrambuca el envelope { success, data } del TransformInterceptor
 *  - lanza Error con mensaje del backend en caso de fallo
 *  - soporta respuestas binarias (PDFs, etc.) devolviendo Blob
 */
export async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string> | undefined),
  };

  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: 'include',
    headers,
  });

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

export function apiFetch(url: string, init: RequestInit = {}) {
  return fetch(url, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });
}
