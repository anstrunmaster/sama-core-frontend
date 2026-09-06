'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { FileText, ChevronRight } from 'lucide-react'
import { StatNumber } from './helpers'
import { navItems, navContent, features } from './data'
import { VisualInicio } from './visuals/VisualInicio'
import { VisualSoluciones } from './visuals/VisualSoluciones'
import { VisualPrecios } from './visuals/VisualPrecios'
import { VisualContacto } from './visuals/VisualContacto'

/* ------------------------------------------------------------------ */
/*  Home (modelo de la imagen)                                         */
/* ------------------------------------------------------------------ */
export function Home({ onLogin }: { onLogin: () => void }) {
  const [activeNav, setActiveNav] = useState('Inicio')
  const content = navContent[activeNav]
  const handlePrimary = () => {
    if (activeNav === 'Precios') {
      window.location.href = 'https://www.teusec.com/register'
    } else {
      onLogin()
    }
  }
  const renderVisual = () => {
    switch (activeNav) {
      case 'Soluciones': return <VisualSoluciones />
      case 'Precios':    return <VisualPrecios />
      case 'Contacto':   return <VisualContacto />
      default:           return <VisualInicio />
    }
  }
  return (
    <div className="min-h-screen bg-[#070815] text-white overflow-hidden flex flex-col select-none" style={{ fontFamily: "'Sora', sans-serif" }}>
      {/* Ambient glows */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full opacity-20" style={{ background: 'radial-gradient(circle, #7C3AED 0%, transparent 70%)' }} />
        <div className="absolute -bottom-40 -right-20 w-[500px] h-[500px] rounded-full opacity-10" style={{ background: 'radial-gradient(circle, #06B6D4 0%, transparent 70%)' }} />
      </div>
      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-6 sm:px-8 py-4 border-b border-white/0">
          {/* Logo */}
<div className="ml-3 w-[192px]">
  
  <img
    src="/logo2.png"
    alt="Syntra"
    className="w-full h-auto object-contain"
  />
</div>
        <div
  className="hidden md:flex rounded-full p-[2px]"
  style={{
    background:
      'linear-gradient(135deg, #000000 0%, #1f1238 20%, #7C3AED 50%, #1f1238 80%, #000000 100%)',
    boxShadow:
      '0 0 35px rgba(124,58,237,.22)'
  }}
>
  <div
    className="flex items-center gap-1 rounded-full px-4 py-4"
    style={{
      background: 'rgba(7,8,21,.96)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)'
    }}
  >
    {navItems.map((item) => (
      <button
        key={item}
        onClick={() => setActiveNav(item)}
        className={`px-5 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
          activeNav === item
            ? 'text-white shadow-lg'
            : 'text-white/55 hover:text-white'
        }`}
        style={
          activeNav === item
            ? {
                background:
                  'linear-gradient(135deg, rgba(124,58,237,.28), rgba(124,58,237,.12))',
                border: '1px solid rgba(124,58,237,.35)',
                boxShadow:
                  '0 0 18px rgba(124,58,237,.28), inset 0 1px 0 rgba(255,255,255,.08)'
              }
            : {}
        }
      >
        {item}
      </button>
    ))}
  </div>
</div>
        <div className="flex items-center gap-3">
          <button onClick={onLogin} className="text-sm text-white/50 hover:text-white transition-colors px-3 py-2">
            IngresarRR
          </button>
          <button
            onClick={() => window.location.href = 'https://www.teusec.com/register'}
            className="text-sm text-white px-5 py-2.5 rounded-full font-semibold transition-all hover:opacity-90 hover:scale-[1.02] active:scale-[0.97]"
            style={{ background: 'linear-gradient(135deg, #7C3AED, #06B6D4)' }}
          >
            Comenzar gratis
          </button>
        </div>
      </nav>
      {/* Hero — two columns */}
      <div className="relative z-10 flex-1 grid lg:grid-cols-[1fr_1fr] gap-6 px-6 sm:px-8 py-6 overflow-hidden">
        {/* Left */}
        <div className="flex flex-col justify-center gap-6 lg:pr-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeNav + '-left'}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.35 }}
              className="flex flex-col gap-6"
            >
              <div>
                <span className="inline-flex items-center gap-2 border text-xs font-medium px-3.5 py-1.5 rounded-full" style={{ background: 'rgba(124,58,237,0.1)', borderColor: 'rgba(124,58,237,0.25)', color: '#A78BFA' }}>
                  <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
                  {content.badge}
                </span>
              </div>
              <h1 className="text-[2.6rem] sm:text-[3.2rem] font-extrabold leading-[1.05] tracking-tight text-white">
                {content.title}
              </h1>
              <p className="text-[15px] text-white/45 leading-relaxed max-w-[380px]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                {content.desc}
              </p>
              <div className="flex items-center gap-3">
                <button
                  onClick={handlePrimary}
                  className="flex items-center gap-2 text-white px-6 py-3 rounded-xl font-semibold text-sm transition-all hover:opacity-90 hover:scale-[1.02] active:scale-[0.97] shadow-lg"
                  style={{ background: 'linear-gradient(135deg, #7C3AED, #06B6D4)', boxShadow: '0 0 32px rgba(124,58,237,0.35)' }}
                >
                  {content.primaryCta}
                  <ChevronRight size={15} />
                </button>
              </div>
            </motion.div>
          </AnimatePresence>
          {/* Stats — fijos, presentes en todas las secciones */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.7, delay: 0.45 }} className="flex items-center gap-10 pt-1 border-t border-white/5">
            {[
              { value: 7000, suffix: '+', label: 'Facturas emitidas' },
              { value: 32, suffix: '+', label: 'Empresas activas' },
              { value: 99, suffix: '% uptime', label: 'Disponibilidad garantizada' },
            ].map((s, i) => (
              <div key={i} className="flex flex-col gap-0.5 pt-4">
                <span className="text-xl font-bold text-white tracking-tight">
                  <StatNumber value={s.value} suffix={s.suffix} />
                </span>
                <span className="text-[11px] text-white/35" style={{ fontFamily: "'DM Sans', sans-serif" }}>{s.label}</span>
              </div>
            ))}
          </motion.div>
        </div>
        {/* Right — visual cambia según activeNav */}
        <div className="hidden lg:flex items-center justify-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeNav + '-right'}
              initial={{ opacity: 0, x: 28, y: 4 }}
              animate={{ opacity: 1, x: 0, y: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              className="w-full flex items-center justify-center"
            >
              {renderVisual()}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
      {/* Bottom feature strip */}
      <div className="relative z-10 border-t border-white/5 px-8 py-3 hidden sm:flex items-center justify-around">
        {features.map(({ icon: Icon, label }, i) => (
          <div key={i} className="flex items-center gap-2 text-white/30 hover:text-white/60 transition-colors cursor-default">
            <Icon size={13} />
            <span className="text-xs" style={{ fontFamily: "'DM Sans', sans-serif" }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
