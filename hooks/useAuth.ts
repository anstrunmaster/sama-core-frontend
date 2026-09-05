'use client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useAuthStore } from '@/store/auth.store'
import { authService } from '@/services/auth.service'
import { toast } from 'sonner'

export function useAuth() {
  const router = useRouter()
  const { user, authed, setUser, clear } = useAuthStore()
  const [loading, setLoading] = useState(false)

  const login = async (email: string, password: string) => {
    setLoading(true)
    try {
      const tokens = await authService.login(email, password)
      setUser(tokens.user, tokens.accessToken, tokens.refreshToken)
      router.replace('/facturacion')
    } catch (e: any) {
      const msg = e?.response?.data?.message
      toast.error(Array.isArray(msg) ? msg[0] : msg ?? 'Credenciales inválidas')
      throw e
    } finally {
      setLoading(false)
    }
  }

  const logout = async () => {
    await authService.logout()
    clear()
    router.replace('/login')
  }

  const logoutAll = async () => {
    await authService.logoutAll()
    clear()
    toast.success('Todas las sesiones cerradas')
    router.replace('/login')
  }

  return { user, authed, loading, login, logout, logoutAll }
}
