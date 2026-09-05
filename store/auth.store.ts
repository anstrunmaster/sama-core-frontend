import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AuthUser } from '@/types'
import { tok } from '@/services/api'

interface AuthState {
  user:        AuthUser | null
  authed:      boolean
  hydrated:    boolean
  setUser:     (u: AuthUser, at: string, rt: string) => void
  clear:       () => void
  setHydrated: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user:     null,
      authed:   false,
      hydrated: false,

      setUser: (user, at, rt) => {
        tok.setA(at); tok.setR(rt)
        set({ user, authed: true })
      },

      clear: () => {
        tok.clear()
        set({ user: null, authed: false })
      },

      setHydrated: () => set({ hydrated: true }),
    }),
    {
      name:       'saas_auth',
      partialize: (s) => ({ user: s.user, authed: s.authed }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated()
      },
    }
  )
)
