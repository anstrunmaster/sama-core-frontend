import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios'

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3002/api/v1'

// ── Token helpers (localStorage — SSR-safe) ───────────────────────────────────
export const tok = {
  getA:  (): string | null => (typeof window !== 'undefined' ? localStorage.getItem('_at') : null),
  getR:  (): string | null => (typeof window !== 'undefined' ? localStorage.getItem('_rt') : null),
  setA:  (t: string) => localStorage.setItem('_at', t),
  setR:  (t: string) => localStorage.setItem('_rt', t),
  clear: ()          => { localStorage.removeItem('_at'); localStorage.removeItem('_rt') },
}

// ── Axios instance ────────────────────────────────────────────────────────────
export const api = axios.create({
  baseURL: BASE,
  timeout: 12_000,
  headers: { 'Content-Type': 'application/json' },
})

// ── Request: attach Bearer ────────────────────────────────────────────────────
api.interceptors.request.use((cfg: InternalAxiosRequestConfig) => {
  const t = tok.getA()
  if (t) cfg.headers.Authorization = `Bearer ${t}`
  return cfg
})

// ── Response: auto-refresh on 401 ────────────────────────────────────────────
type Queued = { resolve: (t: string) => void; reject: (e: unknown) => void }
let refreshing = false
let queue: Queued[] = []

api.interceptors.response.use(
  res => res,
  async (err: AxiosError) => {
    const original = err.config as InternalAxiosRequestConfig & { _r?: boolean }
    if (err.response?.status !== 401 || original._r || original.url === '/auth/refresh') {
      return Promise.reject(err)
    }

    original._r = true
    const rt = tok.getR()
    if (!rt) { tok.clear(); redirect(); return Promise.reject(err) }

    if (refreshing) {
      return new Promise((resolve, reject) => {
        queue.push({
          resolve: (t) => { original.headers.Authorization = `Bearer ${t}`; resolve(api(original)) },
          reject,
        })
      })
    }

    refreshing = true
    try {
      const { data } = await axios.post(`${BASE}/auth/refresh`, { refreshToken: rt })
      const at: string = data.data.accessToken
      const newRt: string = data.data.refreshToken ?? rt
      tok.setA(at); tok.setR(newRt)
      queue.forEach(q => q.resolve(at)); queue = []
      original.headers.Authorization = `Bearer ${at}`
      return api(original)
    } catch (e) {
      queue.forEach(q => q.reject(e)); queue = []
      tok.clear(); redirect()
      return Promise.reject(e)
    } finally {
      refreshing = false
    }
  }
)

const redirect = () => { if (typeof window !== 'undefined') window.location.href = '/login' }
