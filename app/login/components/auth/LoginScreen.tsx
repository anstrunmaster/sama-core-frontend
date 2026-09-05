'use client'
import { motion } from 'motion/react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuth } from '@/hooks/useAuth'
import { Spinner } from '@/components/ui/Spinner'
import { FileText, Mail, Lock, ArrowRight, ArrowLeft, ArrowUpRight } from 'lucide-react'
import { legalLinks } from '../../lib/legal'

/* ------------------------------------------------------------------ */
/*  Login form                                                         */
/* ------------------------------------------------------------------ */
const schema = z.object({
  email:    z.string().email('Email inválido'),
  password: z.string().min(1, 'Requerido'),
})
type F = z.infer<typeof schema>

export function LoginScreen({ onBack }: { onBack: () => void }) {
  const { login, loading } = useAuth()
  const { register, handleSubmit, formState: { errors } } = useForm<F>({ resolver: zodResolver(schema) })
  return (
    <div className="relative min-h-screen w-full flex bg-[#070815] text-white overflow-hidden" style={{ fontFamily: "'Sora', sans-serif" }}>
      {/* Ambient glows — mismo lenguaje visual que la Home */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full opacity-20" style={{ background: 'radial-gradient(circle, #7C3AED 0%, transparent 70%)' }} />
        <div className="absolute -bottom-40 -right-20 w-[500px] h-[500px] rounded-full opacity-10" style={{ background: 'radial-gradient(circle, #06B6D4 0%, transparent 70%)' }} />
      </div>
      {/* Top bar: regreso */}
      <div className="absolute top-0 inset-x-0 z-20 flex items-center justify-between px-6 sm:px-8 py-5">
        <button
  onClick={onBack}
  className="absolute top-8 left-8 z-20
             w-10 h-10
             rounded-full
             bg-black/20
             backdrop-blur-xl
             border border-white/10
             hover:border-violet-500/40
             hover:bg-violet-500/10
             transition-all duration-300"
>
  <ArrowLeft className="mx-auto" size={18} />
</button>
      </div>
      {/* Left — branding */}
      <div className="hidden lg:flex w-[46%] flex-col justify-between p-12 relative border-r border-white/5">
        <div className="absolute inset-0 opacity-[0.04]" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }} />
        <div className="relative pt-20">
         <div className="mb-16">
  <img
    src="/logo2.png"
    alt="Syntra"
    className="h-24 w-auto"
  />
</div>
          <h2 className="text-[2.6rem] font-extrabold leading-[1.1] tracking-tight">
              Inteligencia<br />
              <span
                className="bg-clip-text text-transparent"
                style={{ backgroundImage: 'linear-gradient(90deg, #A78BFA, #22D3EE)' }}
              >
                para empresas modernas.
              </span>
            </h2>
          <p className="text-white/45 text-[15px] leading-relaxed max-w-sm mt-5" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            En Ecuador o cualquier lugar del mundo gestiona todo desde aquí.
          </p>
        </div>
        {/* Documentos legales — abren en nueva pestaña */}
        <div className="relative space-y-3">
          {legalLinks.map((l) => (
            <a
              key={l.label}
              href={l.href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 text-sm w-fit group transition-colors"
            >
              <span className="w-1.5 h-1.5 rounded-full shrink-0 transition-transform group-hover:scale-125" style={{ background: '#A78BFA' }} />
              <span className="text-white/60 group-hover:text-white transition-colors" style={{ fontFamily: "'DM Sans', sans-serif" }}>{l.label}</span>
              <ArrowUpRight size={13} className="text-white/25 group-hover:text-violet-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
            </a>
          ))}
        </div>
      </div>
      {/* Right — form */}
      <div className="relative flex-1 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="w-full max-w-[380px]"
        >
          <div className="mb-10 lg:hidden">
  <img
    src="/logo2.png"
    alt="Syntra"
    className="h-20 w-auto"
  />
</div>
          <div className="mb-8">
            <h1 className="text-[24px] font-bold tracking-tight">Bienvenido de vuelta</h1>
            <p className="text-sm text-white/45 mt-1" style={{ fontFamily: "'DM Sans', sans-serif" }}>Ingresa tus credenciales para continuar</p>
          </div>
          <form onSubmit={handleSubmit(d => login(d.email, d.password))} className="space-y-4">
            <div>
              <label htmlFor="login-email" className="block text-xs font-semibold text-white/60 mb-2 uppercase tracking-wider">Email</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 pointer-events-none" />
                <input
                  id="login-email"
                  {...register('email')}
                  type="email"
                  placeholder="admin@empresa.com"
                  autoComplete="email"
                  aria-invalid={!!errors.email}
                  className="w-full h-11 pl-10 pr-3.5 rounded-xl bg-white/[0.04] border border-white/10 text-sm text-white placeholder:text-white/25 outline-none transition-all focus:border-violet-400/60 focus:bg-white/[0.06]"
                />
              </div>
              {errors.email && <p className="text-xs text-red-400 mt-1.5">{errors.email.message}</p>}
            </div>
            <div>
              <label htmlFor="login-password" className="block text-xs font-semibold text-white/60 mb-2 uppercase tracking-wider">Contraseña</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 pointer-events-none" />
                <input
                  id="login-password"
                  {...register('password')}
                  type="password"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  aria-invalid={!!errors.password}
                  className="w-full h-11 pl-10 pr-3.5 rounded-xl bg-white/[0.04] border border-white/10 text-sm text-white placeholder:text-white/25 outline-none transition-all focus:border-violet-400/60 focus:bg-white/[0.06]"
                />
              </div>
              {errors.password && <p className="text-xs text-red-400 mt-1.5">{errors.password.message}</p>}
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 flex items-center justify-center gap-2 text-white rounded-xl font-semibold text-sm transition-all hover:opacity-90 hover:scale-[1.01] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100 mt-6"
              style={{ background: 'linear-gradient(135deg, #7C3AED, #06B6D4)', boxShadow: '0 0 32px rgba(124,58,237,0.35)' }}
            >
              {loading ? <Spinner size="sm" /> : <ArrowRight className="w-4 h-4" />}
              {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
            </button>
          </form>

          <div className="mt-8 p-4 rounded-xl border border-white/8 bg-white/[0.03]">
            <p className="text-[11px] font-semibold text-white/30 uppercase tracking-widest mb-2">Hecho para ti</p>
            <div className="font-mono text-xs text-white/45 space-y-1">
              <p><span className="text-white/30">email</span>    demo@inteligenciaweb.com</p>
              <p><span className="text-white/30">pass </span>    Admin123!</p>
            </div>
          </div>
          <div className="mt-4 text-center">
            <span className="text-sm text-white/45" style={{ fontFamily: "'DM Sans', sans-serif" }}>¿Primera vez? </span>
            <a href="/register" className="text-sm font-medium hover:underline" style={{ color: '#A78BFA' }}>Crear empresa nueva</a>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
