'use client'
import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Topbar } from '@/components/layout/Topbar'
import BillingIframe from '@/components/BillingIframe'
import { Upload, X, Eye, EyeOff, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://d16rb4jhhui7p6.cloudfront.net/api/v1'

export default function FacturacionPage() {
  const [certOk, setCertOk]       = useState<boolean | null>(null)
  const [checking, setChecking]   = useState(true)
  const [file, setFile]           = useState<File | null>(null)
  const [password, setPassword]   = useState('')
  const [showPass, setShowPass]   = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError]         = useState('')
  const [success, setSuccess]     = useState(false)

const checkCert = async () => {
  // Si ya verificamos en esta sesión, usar ese resultado
  const cached = sessionStorage.getItem('cert_ok')
  if (cached !== null) {
    setCertOk(cached === 'true')
    setChecking(false)
    return
  }

  setChecking(true)
  try {
    const res  = await fetch(`${API_URL}/certificates/status`, {
      credentials: 'include',
    })
    const data = await res.json()
    const payload = data.data ?? data
    const cert = payload.certificate

    if (!cert) {
      sessionStorage.setItem('cert_ok', 'true')
      setCertOk(true)
      return
    }

    const vigente = new Date(cert.valid_until) > new Date()
    sessionStorage.setItem('cert_ok', String(vigente))
    setCertOk(vigente)
  } catch {
    sessionStorage.setItem('cert_ok', 'true')
    setCertOk(true)
  } finally {
    setChecking(false)
  }
}

  useEffect(() => { checkCert() }, [])

  const handleUpload = async () => {
    if (!file || !password.trim()) {
      setError('Debes seleccionar el archivo P12 e ingresar la contraseña')
      return
    }
    setUploading(true)
    setError('')
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('password', password)
      const res  = await fetch(`${API_URL}/certificates/upload`, {
        method:  'POST',
        credentials: 'include',
        body:    formData,
      })
      const data    = await res.json()
      const payload = data.data ?? data
      if (payload.success) {
        sessionStorage.removeItem('cert_ok')
        setSuccess(true)
        setTimeout(() => { setCertOk(true) }, 1500)
      } else {
        setError(payload.error || 'Error al subir el certificado')
      }
    } catch {
      setError('Error de conexión')
    } finally {
      setUploading(false)
    }
  }

  return (
    <DashboardLayout>
      <Topbar title="Facturación" subtitle="Gestión de facturas" />
      <div className="p-6 h-full relative">

        {/* Modal certificado */}
        {!checking && !certOk && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm rounded-lg">
            <div className="bg-surface-raised border border-edge rounded-xl shadow-2xl w-full max-w-md mx-4 p-6">

              {success ? (
                <div className="flex flex-col items-center gap-4 py-4">
                  <div className="w-14 h-14 rounded-full bg-green-500/10 flex items-center justify-center">
                    <CheckCircle2 className="w-7 h-7 text-green-500" />
                  </div>
                  <p className="text-base font-semibold text-ink-primary">¡Certificado configurado!</p>
                  <p className="text-sm text-ink-tertiary">Cargando el facturador...</p>
                </div>
              ) : (
                <>
                  <div className="flex items-start gap-4 mb-5">
                    <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0">
                      <AlertTriangle className="w-5 h-5 text-amber-500" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-ink-primary">
                        Certificado digital requerido
                      </h3>
                      <p className="text-sm text-ink-tertiary mt-1">
                        Para emitir comprobantes electrónicos necesitas subir tu certificado P12 vigente.
                      </p>
                    </div>
                  </div>

                  {error && (
                    <div className="mb-4 px-3 py-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-500">
                      {error}
                    </div>
                  )}

                  {/* Archivo */}
                  <div className="mb-4">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-ink-tertiary mb-2">
                      Archivo .p12
                    </label>
                    <label className="flex items-center gap-3 px-4 py-3 rounded-lg border border-dashed border-edge hover:border-blue/50 cursor-pointer transition-all bg-surface">
                      <Upload className="w-4 h-4 text-ink-ghost shrink-0" />
                      <span className="text-sm text-ink-tertiary truncate">
                        {file ? file.name : 'Seleccionar archivo .p12'}
                      </span>
                      <input
                        type="file"
                        accept=".p12"
                        className="hidden"
                        onChange={e => { setFile(e.target.files?.[0] || null); setError('') }}
                      />
                    </label>
                  </div>

                  {/* Contraseña */}
                  <div className="mb-6">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-ink-tertiary mb-2">
                      Contraseña del certificado
                    </label>
                    <div className="relative">
                      <input
                        type={showPass ? 'text' : 'password'}
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="Contraseña del P12"
                        className="w-full bg-surface border border-edge rounded-lg px-3 py-2.5 pr-10 text-sm text-ink-primary placeholder-ink-ghost outline-none focus:border-blue/50 focus:ring-1 focus:ring-blue/20 transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPass(p => !p)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-ghost hover:text-ink-secondary transition-colors"
                      >
                        {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    onClick={handleUpload}
                    disabled={uploading || !file || !password.trim()}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-blue text-sm font-semibold text-white hover:bg-blue/90 disabled:opacity-50 transition-all"
                  >
                    {uploading
                      ? <><RefreshCw className="w-4 h-4 animate-spin" /> Subiendo...</>
                      : <><Upload className="w-4 h-4" /> Subir certificado</>
                    }
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        <BillingIframe />
      </div>
    </DashboardLayout>
  )
}
