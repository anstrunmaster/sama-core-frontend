'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Hexagon, Building2, Mail, Lock, User, Hash, ArrowRight, CheckCircle2, Eye, EyeOff, ArrowLeft, Check } from 'lucide-react'
import { ThemeToggle } from '@/components/ThemeToggle'
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://d16rb4jhhui7p6.cloudfront.net/api/v1'
/* ------------------------------------------------------------------ */
/*  Documentos legales (PDF, abren en nueva pestaña)                   */
/* ------------------------------------------------------------------ */
const legalDocs = {
  privacidad: 'https://teusec-legal-docs.s3.us-east-2.amazonaws.com/POL%C3%8DTICA+DE+PRIVACIDAD.pdf',
  terminos:   'https://teusec-legal-docs.s3.us-east-2.amazonaws.com/T%C3%89RMINOS+Y+CONDICIONES+DE+USO.pdf',
  datos:      'https://teusec-legal-docs.s3.us-east-2.amazonaws.com/ACUERDO+DE+TRATAMIENTO+DE+DATOS+PERSONALES+(DPA).pdf',
}
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
  const [isDark, setIsDark] = useState(true)
  
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
  const [accepted, setAccepted] = useState(false)
  useEffect(() => {
  const updateTheme = () => {
    setIsDark(document.documentElement.classList.contains('dark'))
  }

  updateTheme()

  const observer = new MutationObserver(updateTheme)

  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class'],
  })

  return () => observer.disconnect()
}, [])
  const validate = (): boolean => {
    const e: FormErrors = {}
    if (!form.companyName.trim() || form.companyName.length < 2)
      e.companyName = 'Mínimo 2 caracteres'
    if (!form.ruc.trim() || form.ruc.length < 13)
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
    if (!accepted) return
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
      <div className="min-h-screen flex items-center justify-center bg-[var(--body-bg)]">
        <div className="text-center animate-fade-up">
          <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
          <h2 className="text-xl font-bold text-ink-primary mb-2">¡Empresa creada!</h2>
          <p className="text-sm text-ink-tertiary">Redirigiendo al dashboard...</p>
        </div>
      </div>
    )
  }
  return (
    <div className="min-h-screen flex bg-[var(--body-bg)]">
      <div className="fixed top-6 right-6 z-50">
  <ThemeToggle />
</div>
<div className="fixed top-6 left-6 z-50">
  <button
    onClick={() => router.push('/')}
    className="w-11 h-11 rounded-full
           bg-surface
           border border-edge-subtle
           backdrop-blur-xl
           flex items-center justify-center
           text-ink-primary
           hover:border-violet-500/40
           hover:bg-violet-500/10
           transition-all duration-300"
  >
    <ArrowLeft size={18} className="text-ink-primary" />
  </button>
</div>

      {/* Left panel */}
      <div className="hidden lg:flex w-[42%] flex-col justify-between p-12 bg-surface border-r border-edge-subtle relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.03]" style={{
          backgroundImage: 'linear-gradient(currentColor 1px, transparent 1px), linear-gradient(90deg, currentColor 1px, transparent 1px)',
          backgroundSize: '40px 40px',
          color: 'var(--ink-primary)',
        }} />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] rounded-full bg-blue/[0.06] blur-[120px] pointer-events-none" />
        <div className="relative pt-16">
          <div className="mb-16">
  <img
    src={isDark ? '/logo2.png' : '/logo3.png'}
    alt="Syntra"
    className="h-20 w-auto"
  />
</div>
          <h2 className="text-[36px] font-bold text-ink-primary leading-[1.15] tracking-tight mb-4">
            Empieza a facturar<br />en minutos.<br />
            <span className="text-blue">Sin complicaciones.</span>
          </h2>
          <p className="text-ink-tertiary text-base leading-relaxed max-w-sm">
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
              <span className="text-[11px] font-mono font-bold text-blue mt-0.5 w-6 shrink-0">{s.step}</span>
              <div>
                <div className="text-sm font-semibold text-ink-primary">{s.title}</div>
                <div className="text-xs text-ink-tertiary mt-0.5">{s.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
      {/* Right — form */}
      <div className="flex-1 flex items-center justify-center p-6 overflow-y-auto">
        <div className="w-full max-w-[420px] py-8">
          {/* Mobile logo */}
          <div className="mb-8 lg:hidden">
  <img
    src={isDark ? '/logo2.png' : '/logo3.png'}
    alt="Syntra"
    className="h-16 w-auto"
  />
</div>
          <div className="mb-7">
            <h1 className="text-[22px] font-bold text-ink-primary tracking-tight">Crear nueva empresa</h1>
            <p className="text-sm text-ink-tertiary mt-1">
              ¿Ya tienes cuenta?{' '}
              <a href="/login" className="text-blue font-medium hover:underline">Inicia sesión</a>
            </p>
          </div>
          {errors.general && (
            <div className="mb-4 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-600 dark:text-red-400">
              {errors.general}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Company section */}
            <div className="pb-1">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-ink-ghost mb-3">Datos de la empresa</p>
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
            <div className="border-t border-edge-subtle" />
            {/* Admin section */}
            <div className="pb-1">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-ink-ghost mb-3">Administrador</p>
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
                  <label className="block text-xs font-medium text-ink-secondary mb-1.5">Contraseña</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-ghost pointer-events-none">
                      <Lock className="w-4 h-4" />
                    </span>
                    <input
                      type={showPw ? 'text' : 'password'}
                      placeholder="Mín. 8 chars, 1 mayúsc, 1 núm, 1 símbolo"
                      value={form.password}
                      onChange={set('password')}
                      className={`field pl-10 pr-10 ${errors.password ? 'field-error' : ''}`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw(v => !v)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-ghost hover:text-ink-secondary transition-colors"
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
                            style={{ background: i <= pwStrength ? strengthColor : 'var(--edge-strong)' }}
                          />
                        ))}
                      </div>
                      <p className="text-[11px] mt-1" style={{ color: strengthColor }}>{strengthLabel}</p>
                    </div>
                  )}
                  {errors.password && <p className="text-xs text-red-600 dark:text-red-400 mt-1">{errors.password}</p>}
                </div>
              </div>
            </div>
            <button
              type="submit"
              disabled={loading || !accepted}
              className="w-full flex items-center justify-center gap-2 bg-blue hover:bg-blue-hover disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm rounded-lg py-3 mt-2 transition-all duration-150 shadow-[0_0_20px_rgba(59,130,246,0.3)]"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <ArrowRight className="w-4 h-4" />
              )}
              {loading ? 'Creando empresa...' : 'Crear empresa'}
            </button>
            {/* Aceptación de términos legales — requerido para habilitar el registro */}
            <label className="flex items-start gap-2.5 mt-3 cursor-pointer group select-none">
              <input
                type="checkbox"
                checked={accepted}
                onChange={e => setAccepted(e.target.checked)}
                className="peer sr-only"
              />
              <span className="mt-[1px] w-4 h-4 rounded-[5px] border border-edge-strong flex items-center justify-center shrink-0 transition-all group-hover:border-violet-400 peer-checked:bg-violet-500 peer-checked:border-violet-500 peer-focus-visible:ring-2 peer-focus-visible:ring-violet-400/50">
                <Check size={11} className={`text-white transition-opacity ${accepted ? 'opacity-100' : 'opacity-0'}`} />
              </span>
              <span className="text-xs text-ink-tertiary leading-relaxed" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                Al registrarme acepto la{' '}
                <a href={legalDocs.privacidad} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="font-medium hover:underline" style={{ color: '#A78BFA' }}>Política de Privacidad</a>, los{' '}
                <a href={legalDocs.terminos} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="font-medium hover:underline" style={{ color: '#A78BFA' }}>Términos y Condiciones</a> y el{' '}
                <a href={legalDocs.datos} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="font-medium hover:underline" style={{ color: '#A78BFA' }}>Tratamiento de Datos Personales</a>
              </span>
            </label>
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
      <label className="block text-xs font-medium text-ink-secondary mb-1.5">{label}</label>
      <div className="relative">
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-ghost pointer-events-none">
          {icon}
        </span>
        <input
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          maxLength={maxLength}
          className={`field pl-10 ${error ? 'field-error' : ''}`}
        />
      </div>
      {error && <p className="text-xs text-red-600 dark:text-red-400 mt-1">{error}</p>}
    </div>
  )
}
