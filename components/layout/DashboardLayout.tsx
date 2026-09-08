'use client'
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuthStore } from '@/store/auth.store'
import { Sidebar } from './Sidebar'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://d16rb4jhhui7p6.cloudfront.net/api/v1'

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter()
  const pathname = usePathname()
  const authed   = useAuthStore(s => s.authed)
  const hydrated = useAuthStore(s => s.hydrated)
  const [certOk, setCertOk] = useState<boolean | null>(null)

  useEffect(() => {
    if (hydrated && !authed) router.replace('/login')
  }, [hydrated, authed, router])

  useEffect(() => {
    if (!authed) return
    fetch(`${API_URL}/certificates/status`, {
      credentials: 'include',
    })
      .then(r => {
        if (r.status === 401 || r.status === 403) {
          setCertOk(null)
          return
        }
        return r.json()
      })
      .then(d => {
        if (!d) return
        const payload = d.data ?? d
        setCertOk(payload.hasActiveCertificate === true)
      })
      .catch(() => setCertOk(null))
  }, [authed])

  if (!hydrated) return null
  if (!authed)   return null

  const bloqueado = certOk === false && pathname !== '/facturacion'

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--body-bg)]">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-y-auto min-w-0">
        {bloqueado
          ? <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',flex:1,gap:'24px',padding:'24px'}}>
              <p style={{fontWeight:'bold',fontSize:'18px'}}>Certificado digital no configurado</p>
              <p style={{fontSize:'14px',textAlign:'center',maxWidth:'400px'}}>Para usar el sistema debes subir tu certificado P12. Sin él no es posible firmar ni emitir comprobantes electrónicos.</p>
              <a href="https://www.teusec.com/facturacion" target="_blank" rel="noopener noreferrer" style={{padding:'10px 20px',background:'#3B82F6',color:'white',borderRadius:'8px',fontWeight:'600',textDecoration:'none'}}>Configurar certificado →</a>
            </div>
          : children
        }
      </main>
    </div>
  )
}
