import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios'
import { clearCsrfToken, getCsrfToken } from '@/app/lib/csrf'

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3002/api/v1'

// ── Axios instance ────────────────────────────────────────────────────────────
export const api = axios.create({
  baseURL: BASE,
  timeout: 12_000,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
})

// ── Response: auto-refresh on 401 ────────────────────────────────────────────
type Queued = { resolve: () => void; reject: (e: unknown) => void }
let refreshing = false
let queue: Queued[] = []

api.interceptors.response.use(
  res => res,
  async (err: AxiosError) => {
    const original = err.config as InternalAxiosRequestConfig & { _r?: boolean }
    if (err.response?.status !== 401 || original._r || original.url === '/auth/refresh' || original.url === '/auth/logout') {
      return Promise.reject(err)
    }

    original._r = true

    if (refreshing) {
      return new Promise((resolve, reject) => {
        queue.push({
          resolve: () => resolve(api(original)),
          reject,
        })
      })
    }

    refreshing = true
    try {
      const csrfToken = await getCsrfToken()
console.log('REFRESH BODY:', JSON.stringify({}))
await api.post('/auth/refresh', {}, {
  headers: { 'X-CSRF-Token': csrfToken },
})
      queue.forEach(q => q.resolve()); queue = []
      return api(original)
    } catch (e) {
      clearCsrfToken()
      queue.forEach(q => q.reject(e)); queue = []
      redirect()
      return Promise.reject(e)
    } finally {
      refreshing = false
    }
  }
)

const redirect = () => { if (typeof window !== 'undefined') window.location.href = '/login' }
