import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AuthUser } from '@/types'

interface AuthState {
  user:        AuthUser | null
  authed:      boolean
  hydrated:    boolean
  setUser:     (u: AuthUser) => void
  clear:       () => void
  setHydrated: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user:     null,
      authed:   false,
      hydrated: false,

      setUser: (user) => set({ user, authed: true }),

      clear: () => {
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
