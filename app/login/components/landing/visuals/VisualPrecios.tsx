'use client'
import { Check } from 'lucide-react'
import { GlassPanel } from '../GlassPanel'
import { plans } from '../data'

/* ------------------------------------------------------------------ */
/*  Visual: Precios (planes)                                           */
/* ------------------------------------------------------------------ */
export function VisualPrecios() {
  return (
    <GlassPanel>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] text-white/35 uppercase tracking-widest" style={{ fontFamily: "'DM Sans', sans-serif" }}>Planes</p>
          <p className="text-sm font-semibold text-white mt-0.5">Elige el tuyo</p>
        </div>
        <span className="text-[9px] px-2 py-1 rounded-full font-medium" style={{ background: 'rgba(16,185,129,0.12)', color: '#34D399' }}>14 días gratis</span>
      </div>
      <div className="space-y-2">
        {plans.map((plan, i) => (
          <div
            key={i}
            className="rounded-xl p-3 border transition-all hover:bg-white/[0.04] cursor-pointer relative overflow-hidden"
            style={plan.highlight
              ? { background: 'rgba(124,58,237,0.08)', borderColor: 'rgba(124,58,237,0.35)', boxShadow: '0 0 24px rgba(124,58,237,0.18)' }
              : { background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.06)' }}
          >
            {plan.highlight && (
              <span className="absolute top-2.5 right-2.5 text-[8px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider text-white" style={{ background: 'linear-gradient(135deg, #7C3AED, #06B6D4)' }}>
                Popular
              </span>
            )}
            <div className="flex items-baseline gap-1.5 mb-2">
              <p className="text-[12px] font-semibold text-white">{plan.name}</p>
            </div>
            <div className="flex items-baseline gap-0.5 mb-2.5">
              <span className="text-lg font-extrabold text-white tracking-tight">{plan.price}</span>
              <span className="text-[10px] text-white/35" style={{ fontFamily: "'DM Sans', sans-serif" }}>{plan.period}</span>
            </div>
            <div className="space-y-1">
              {plan.features.map((f, j) => (
                <div key={j} className="flex items-center gap-1.5">
                  <Check size={10} className="shrink-0" style={{ color: plan.highlight ? '#A78BFA' : '#34D399' }} />
                  <span className="text-[10px] text-white/55" style={{ fontFamily: "'DM Sans', sans-serif" }}>{f}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </GlassPanel>
  )
}
