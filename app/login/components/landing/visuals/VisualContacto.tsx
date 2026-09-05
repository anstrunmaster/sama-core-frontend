'use client'
import { MessageCircle, Calendar, ChevronRight, Cpu } from 'lucide-react'
import { GlassPanel } from '../GlassPanel'
import { contactChannels } from '../data'

/* ------------------------------------------------------------------ */
/*  Visual: Contacto                                                   */
/* ------------------------------------------------------------------ */
export function VisualContacto() {
  return (
    <GlassPanel>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #7C3AED, #06B6D4)' }}>
            <MessageCircle size={13} className="text-white" />
          </div>
          <div>
            <p className="text-[10px] text-white/35 uppercase tracking-widest" style={{ fontFamily: "'DM Sans', sans-serif" }}>Contacto</p>
            <p className="text-sm font-semibold text-white mt-0.5">Estamos para ayudarte</p>
          </div>
        </div>
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
      </div>
      {/* Canales */}
      <div className="space-y-2">
        {contactChannels.map(({ icon: Icon, label, value }, i) => (
          <div key={i} className="flex items-center gap-3 rounded-xl px-3 py-2.5 border transition-all hover:bg-white/[0.04] cursor-pointer" style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.06)' }}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(124,58,237,0.12)' }}>
              <Icon size={14} className="text-violet-400" />
            </div>
            <div>
              <p className="text-[10px] text-white/35" style={{ fontFamily: "'DM Sans', sans-serif" }}>{label}</p>
              <p className="text-[12px] font-semibold text-white/85">{value}</p>
            </div>
          </div>
        ))}
      </div>
      {/* CTA agendar */}
      <div className="rounded-xl p-3.5 border flex items-center gap-3" style={{ background: 'rgba(124,58,237,0.06)', borderColor: 'rgba(124,58,237,0.18)' }}>
        <Calendar size={18} className="text-violet-400 shrink-0" />
        <div className="flex-1">
          <p className="text-[12px] font-semibold text-white">Agenda una demo</p>
          <p className="text-[10px] text-white/45" style={{ fontFamily: "'DM Sans', sans-serif" }}>30 min, sin compromiso. Te mostramos todo.</p>
        </div>
        <ChevronRight size={14} className="text-white/40" />
      </div>
      <div className="rounded-xl p-3 border flex items-center gap-2.5" style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.05)' }}>
        <Cpu size={13} className="text-cyan-400 shrink-0" />
        <p className="text-[10px] text-white/45 leading-relaxed" style={{ fontFamily: "'DM Sans', sans-serif" }}>
          ¿Migrando desde otro sistema? Importamos tus clientes y productos sin costo.
        </p>
      </div>
    </GlassPanel>
  )
}
