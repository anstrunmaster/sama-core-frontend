'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Hexagon, Building2, Mail, Lock, User, Hash, ArrowRight, CheckCircle2, Eye, EyeOff } from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://d16rb4jhhui7p6.cloudfront.net/api/v1'

interface FormData {
  companyName: string
  ruc: string
  fullName: string
  email: string
  password: string
}

interface FormErrors {
  companyName?: string
  ruc?: string
  fullName?: string
  email?: string
  password?: string
  general?: string
}

export default function RegisterPage() {
  const router = useRouter()
  const [form, setForm] = useState<FormData>({
    companyName: '',
    ruc: '',
    fullName: '',
    email: '',
    password: '',
  })
  const [errors, setErrors] = useState<FormErrors>({})
  const [loading, setLoading] = useState(false)
  const [showPw, setShowPw] = useState(false)
  const [success, setSuccess] = useState(false)

  const validate = (): boolean => {
    const e: FormErrors = {}
    if (!form.companyName.trim() || form.companyName.length < 2)
      e.companyName = 'Mínimo 2 caracteres'
    if (!form.ruc.trim() || form.ruc.length < 10)
      e.ruc = 'RUC inválido'
    if (!form.fullName.trim() || form.fullName.length < 2)
      e.fullName = 'Mínimo 2 caracteres'
    if (!form.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      e.email = 'Email inválido'
    if (!form.password || form.password.length < 8)
      e.password = 'Mínimo 8 caracteres'
    else if (!/^(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])/.test(form.password))
      e.password = 'Necesita mayúscula, número y símbolo (!@#$%^&*)'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    setErrors({})
    try {
      const res = await fetch(`${API_URL}/onboarding`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) {
        const msg = Array.isArray(data.message) ? data.message[0] : data.message
        setErrors({ general: msg || 'Error al crear la empresa' })
        return
      }
      // Store tokens
      const { accessToken, refreshToken, user } = data.data
      localStorage.setItem('accessToken', accessToken)
      localStorage.setItem('refreshToken', refreshToken)
      localStorage.setItem('user', JSON.stringify(user))
      setSuccess(true)
      setTimeout(() => router.push('/dashboard'), 2000)
    } catch {
      setErrors({ general: 'Error de conexión. Intenta de nuevo.' })
    } finally {
      setLoading(false)
    }
  }

  const set = (field: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(f => ({ ...f, [field]: e.target.value }))
    if (errors[field]) setErrors(er => ({ ...er, [field]: undefined }))
  }

  // Password strength
  const pwStrength = (() => {
    const p = form.password
    if (!p) return 0
    let s = 0
    if (p.length >= 8) s++
    if (/[A-Z]/.test(p)) s++
    if (/[0-9]/.test(p)) s++
    if (/[!@#$%^&*]/.test(p)) s++
    return s
  })()
  const strengthLabel = ['', 'Débil', 'Regular', 'Buena', 'Fuerte'][pwStrength]
  const strengthColor = ['', '#EF4444', '#F59E0B', '#3B82F6', '#10B981'][pwStrength]

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#09090B]">
        <div className="text-center animate-fade-up">
          <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-green-400" />
          </div>
          <h2 className="text-xl font-bold text-[#FAFAFA] mb-2">¡Empresa creada!</h2>
          <p className="text-sm text-[#52525B]">Redirigiendo al dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex bg-[#09090B]">
      {/* Left panel */}
      <div className="hidden lg:flex w-[42%] flex-col justify-between p-12 bg-[#0A0A0C] border-r border-white/[0.05] relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }} />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] rounded-full bg-blue-500/[0.06] blur-[120px] pointer-events-none" />

        <div className="relative">
          <div className="flex items-center gap-3 mb-16">
            <div className="w-9 h-9 rounded-[10px] bg-[#3B82F6] flex items-center justify-center shadow-[0_0_20px_rgba(59,130,246,0.5)]">
              <Hexagon className="w-5 h-5 text-white" strokeWidth={2} />
            </div>
            <span className="font-bold text-[17px] text-[#FAFAFA] tracking-tight">FacturaSaaS</span>
          </div>

          <h2 className="text-[36px] font-bold text-[#FAFAFA] leading-[1.15] tracking-tight mb-4">
            Empieza a facturar<br />en minutos.<br />
            <span className="text-[#3B82F6]">Sin complicaciones.</span>
          </h2>
          <p className="text-[#52525B] text-base leading-relaxed max-w-sm">
            Crea tu empresa, configura usuarios y emite facturas electrónicas desde el primer día.
          </p>
        </div>

        <div className="relative space-y-5">
          {[
            { step: '01', title: 'Crea tu empresa', desc: 'Registra tu RUC y datos en segundos' },
            { step: '02', title: 'Configura usuarios', desc: 'Invita a tu equipo con roles específicos' },
            { step: '03', title: 'Emite facturas', desc: 'Conecta con el SRI y empieza a facturar' },
          ].map(s => (
            <div key={s.step} className="flex items-start gap-4">
              <span className="text-[11px] font-mono font-bold text-[#3B82F6] mt-0.5 w-6 shrink-0">{s.step}</span>
              <div>
                <div className="text-sm font-semibold text-[#FAFAFA]">{s.title}</div>
                <div className="text-xs text-[#52525B] mt-0.5">{s.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right — form */}
      <div className="flex-1 flex items-center justify-center p-6 overflow-y-auto">
        <div className="w-full max-w-[420px] py-8">
          {/* Mobile logo */}
          <div className="flex items-center gap-2.5 mb-8 lg:hidden">
            <div className="w-8 h-8 rounded-[8px] bg-[#3B82F6] flex items-center justify-center">
              <Hexagon className="w-4 h-4 text-white" strokeWidth={2} />
            </div>
            <span className="font-bold text-[15px] text-[#FAFAFA]">FacturaSaaS</span>
          </div>

          <div className="mb-7">
            <h1 className="text-[22px] font-bold text-[#FAFAFA] tracking-tight">Crear nueva empresa</h1>
            <p className="text-sm text-[#52525B] mt-1">
              ¿Ya tienes cuenta?{' '}
              <a href="/login" className="text-[#3B82F6] font-medium hover:underline">Inicia sesión</a>
            </p>
          </div>

          {errors.general && (
            <div className="mb-4 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400">
              {errors.general}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Company section */}
            <div className="pb-1">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[#3F3F46] mb-3">Datos de la empresa</p>
              <div className="space-y-3">
                <Field
                  icon={<Building2 className="w-4 h-4" />}
                  label="Razón social"
                  placeholder="Mi Empresa S.A."
                  value={form.companyName}
                  onChange={set('companyName')}
                  error={errors.companyName}
                />
                <Field
                  icon={<Hash className="w-4 h-4" />}
                  label="RUC"
                  placeholder="1234567890001"
                  value={form.ruc}
                  onChange={set('ruc')}
                  error={errors.ruc}
                  maxLength={13}
                />
              </div>
            </div>

            <div className="border-t border-white/[0.05]" />

            {/* Admin section */}
            <div className="pb-1">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[#3F3F46] mb-3">Administrador</p>
              <div className="space-y-3">
                <Field
                  icon={<User className="w-4 h-4" />}
                  label="Nombre completo"
                  placeholder="Juan Pérez"
                  value={form.fullName}
                  onChange={set('fullName')}
                  error={errors.fullName}
                />
                <Field
                  icon={<Mail className="w-4 h-4" />}
                  label="Email"
                  type="email"
                  placeholder="juan@empresa.com"
                  value={form.email}
                  onChange={set('email')}
                  error={errors.email}
                />
                <div>
                  <label className="block text-xs font-medium text-[#A1A1AA] mb-1.5">Contraseña</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#3F3F46] pointer-events-none">
                      <Lock className="w-4 h-4" />
                    </span>
                    <input
                      type={showPw ? 'text' : 'password'}
                      placeholder="Mín. 8 chars, 1 mayúsc, 1 núm, 1 símbolo"
                      value={form.password}
                      onChange={set('password')}
                      className={`w-full bg-[#18181B] border ${errors.password ? 'border-red-500/50' : 'border-white/[0.08]'} rounded-lg pl-10 pr-10 py-2.5 text-sm text-[#FAFAFA] placeholder-[#3F3F46] outline-none focus:border-[#3B82F6]/60 focus:ring-1 focus:ring-[#3B82F6]/20 transition-all`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw(v => !v)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#3F3F46] hover:text-[#A1A1AA] transition-colors"
                    >
                      {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {/* Strength bar */}
                  {form.password && (
                    <div className="mt-2">
                      <div className="flex gap-1">
                        {[1, 2, 3, 4].map(i => (
                          <div
                            key={i}
                            className="h-1 flex-1 rounded-full transition-all duration-300"
                            style={{ background: i <= pwStrength ? strengthColor : '#27272A' }}
                          />
                        ))}
                      </div>
                      <p className="text-[11px] mt-1" style={{ color: strengthColor }}>{strengthLabel}</p>
                    </div>
                  )}
                  {errors.password && <p className="text-xs text-red-400 mt-1">{errors.password}</p>}
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-[#3B82F6] hover:bg-[#2563EB] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm rounded-lg py-3 mt-2 transition-all duration-150 shadow-[0_0_20px_rgba(59,130,246,0.3)]"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <ArrowRight className="w-4 h-4" />
              )}
              {loading ? 'Creando empresa...' : 'Crear empresa'}
            </button>

            <p className="text-center text-[11px] text-[#3F3F46] mt-2">
              Al registrarte aceptas los términos de servicio. Plan TRIAL gratuito por 30 días.
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}

function Field({
  icon, label, type = 'text', placeholder, value, onChange, error, maxLength,
}: {
  icon: React.ReactNode
  label: string
  type?: string
  placeholder: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  error?: string
  maxLength?: number
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-[#A1A1AA] mb-1.5">{label}</label>
      <div className="relative">
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#3F3F46] pointer-events-none">
          {icon}
        </span>
        <input
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          maxLength={maxLength}
          className={`w-full bg-[#18181B] border ${error ? 'border-red-500/50' : 'border-white/[0.08]'} rounded-lg pl-10 pr-4 py-2.5 text-sm text-[#FAFAFA] placeholder-[#3F3F46] outline-none focus:border-[#3B82F6]/60 focus:ring-1 focus:ring-[#3B82F6]/20 transition-all`}
        />
      </div>
      {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
    </div>
  )
}
