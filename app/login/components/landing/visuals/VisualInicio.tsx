'use client'
import {
  FileText, Users, TrendingUp, Bell, Settings, CheckCircle2, Clock,
} from 'lucide-react'
import { BarChart, Bar, XAxis, ResponsiveContainer, Tooltip } from 'recharts'
import { GlassPanel } from '../GlassPanel'
import { CustomTooltip } from '../helpers'
import { revenueData, invoices } from '../data'

/* ------------------------------------------------------------------ */
/*  Visual: Inicio (dashboard mockup)                                  */
/* ------------------------------------------------------------------ */
export function VisualInicio() {
  return (
    <GlassPanel>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] text-white/35 uppercase tracking-widest" style={{ fontFamily: "'DM Sans', sans-serif" }}>Panel de control</p>
          <p className="text-sm font-semibold text-white mt-0.5">Junio 2024</p>
        </div>
        <div className="flex items-center gap-1.5">
          <button className="w-7 h-7 rounded-lg flex items-center justify-center text-white/30 hover:text-white transition-colors" style={{ background: 'rgba(255,255,255,0.05)' }}><Bell size={12} /></button>
          <button className="w-7 h-7 rounded-lg flex items-center justify-center text-white/30 hover:text-white transition-colors" style={{ background: 'rgba(255,255,255,0.05)' }}><Settings size={12} /></button>
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white ml-1" style={{ background: 'linear-gradient(135deg, #7C3AED, #06B6D4)' }}>MJ</div>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Ingresos', value: '$89,420', change: '+18%', Icon: TrendingUp, color: '#10B981' },
          { label: 'Facturas', value: '1,248', change: '+12%', Icon: FileText, color: '#A78BFA' },
          { label: 'Clientes', value: '342', change: '+7%', Icon: Users, color: '#22D3EE' },
        ].map(({ label, value, change, Icon, color }, i) => (
          <div key={i} className="rounded-xl p-3 border" style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.06)' }}>
            <div className="flex items-center justify-between mb-2">
              <Icon size={11} style={{ color }} />
              <span className="text-[9px] font-semibold" style={{ color: '#10B981' }}>{change}</span>
            </div>
            <p className="text-sm font-bold text-white">{value}</p>
            <p className="text-[10px] text-white/35 mt-0.5" style={{ fontFamily: "'DM Sans', sans-serif" }}>{label}</p>
          </div>
        ))}
      </div>
      <div className="rounded-xl p-3 border" style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.05)' }}>
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] text-white/35" style={{ fontFamily: "'DM Sans', sans-serif" }}>Ingresos mensuales (USD)</p>
          <span className="text-[9px] text-violet-400 font-medium">+32% vs anterior</span>
        </div>
        <ResponsiveContainer width="100%" height={72}>
          <BarChart data={revenueData} barSize={9} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#7C3AED" stopOpacity={1} />
                <stop offset="100%" stopColor="#06B6D4" stopOpacity={0.6} />
              </linearGradient>
            </defs>
            <XAxis dataKey="mes" tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 8, fontFamily: "'DM Sans', sans-serif" }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
            <Bar dataKey="valor" fill="url(#barGrad)" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="space-y-1">
        <p className="text-[10px] text-white/35 uppercase tracking-widest" style={{ fontFamily: "'DM Sans', sans-serif" }}>Facturas recientes</p>
        {invoices.map((inv, i) => (
          <div key={i} className="flex items-center justify-between rounded-xl px-2.5 py-2 cursor-pointer transition-all hover:bg-white/[0.04] group">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.06)' }}><FileText size={10} className="text-white/40" /></div>
              <div>
                <p className="text-[11px] font-semibold text-white/80 group-hover:text-white transition-colors leading-tight">{inv.client}</p>
                <p className="text-[9px] text-white/25">{inv.id}</p>
              </div>
            </div>
            <div className="text-right flex flex-col items-end gap-0.5">
              <p className="text-[11px] font-semibold text-white/80">{inv.amount}</p>
              <span className="text-[9px] px-2 py-0.5 rounded-full font-medium flex items-center gap-1" style={inv.status === 'Pagada' ? { background: 'rgba(16,185,129,0.12)', color: '#34D399' } : { background: 'rgba(245,158,11,0.12)', color: '#FCD34D' }}>
                {inv.status === 'Pagada' ? <CheckCircle2 size={8} /> : <Clock size={8} />}
                {inv.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </GlassPanel>
  )
}
