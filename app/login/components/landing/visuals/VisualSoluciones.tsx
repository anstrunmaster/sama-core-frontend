'use client'
import { Brain, Sparkles, Activity } from 'lucide-react'
import { LineChart, Line, XAxis, ResponsiveContainer, Tooltip } from 'recharts'
import { GlassPanel } from '../GlassPanel'
import { CustomTooltip } from '../helpers'
import { forecastData, solutionModules } from '../data'

/* ------------------------------------------------------------------ */
/*  Visual: Soluciones (data inteligente + forecast AI)                */
/* ------------------------------------------------------------------ */
export function VisualSoluciones() {
  return (
    <GlassPanel>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #7C3AED, #06B6D4)' }}>
            <Brain size={13} className="text-white" />
          </div>
          <div>
            <p className="text-[10px] text-white/35 uppercase tracking-widest" style={{ fontFamily: "'DM Sans', sans-serif" }}>AI Insights</p>
            <p className="text-sm font-semibold text-white mt-0.5">Análisis predictivo</p>
          </div>
        </div>
        <span className="text-[9px] px-2 py-1 rounded-full font-medium flex items-center gap-1" style={{ background: 'rgba(124,58,237,0.12)', color: '#A78BFA' }}>
          <Sparkles size={9} /> En vivo
        </span>
      </div>
      {/* NLG insight card */}
      <div className="rounded-xl p-3 border flex items-start gap-2.5" style={{ background: 'rgba(124,58,237,0.06)', borderColor: 'rgba(124,58,237,0.18)' }}>
        <Activity size={14} className="text-violet-400 mt-0.5 shrink-0" />
        <p className="text-[11px] text-white/70 leading-relaxed" style={{ fontFamily: "'DM Sans', sans-serif" }}>
          Tus ventas crecen <span className="text-white font-semibold">17%</span> sostenido. Si el ritmo sigue, <span className="text-white font-semibold">Agosto cerraría en $104K</span>.
        </p>
      </div>
      {/* Forecast chart: real vs predicción */}
      <div className="rounded-xl p-3 border" style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.05)' }}>
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] text-white/35" style={{ fontFamily: "'DM Sans', sans-serif" }}>Forecast de ingresos</p>
          <div className="flex items-center gap-3">
            <span className="text-[9px] text-white/50 flex items-center gap-1"><span className="w-2 h-[2px] rounded-full" style={{ background: '#22D3EE' }} />Real</span>
            <span className="text-[9px] text-white/50 flex items-center gap-1"><span className="w-2 h-[2px] rounded-full" style={{ background: '#A78BFA' }} />Predicción</span>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={84}>
          <LineChart data={forecastData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <XAxis dataKey="mes" tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 8, fontFamily: "'DM Sans', sans-serif" }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.08)' }} />
            <Line type="monotone" dataKey="real" stroke="#22D3EE" strokeWidth={2} dot={{ r: 2, fill: '#22D3EE' }} connectNulls />
            <Line type="monotone" dataKey="pred" stroke="#A78BFA" strokeWidth={2} strokeDasharray="4 3" dot={{ r: 2, fill: '#A78BFA' }} connectNulls />
          </LineChart>
        </ResponsiveContainer>
      </div>
      {/* Módulos del ecosistema */}
      <div className="grid grid-cols-2 gap-2">
        {solutionModules.map(({ icon: Icon, title, desc, color }, i) => (
          <div key={i} className="rounded-xl p-2.5 border transition-all hover:bg-white/[0.04] cursor-pointer group" style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.06)' }}>
            <div className="w-6 h-6 rounded-lg flex items-center justify-center mb-1.5" style={{ background: `${color}1a` }}>
              <Icon size={12} style={{ color }} />
            </div>
            <p className="text-[11px] font-semibold text-white/85 leading-tight">{title}</p>
            <p className="text-[9px] text-white/35 mt-0.5 leading-tight" style={{ fontFamily: "'DM Sans', sans-serif" }}>{desc}</p>
          </div>
        ))}
      </div>
    </GlassPanel>
  )
}
