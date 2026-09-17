'use client'
import { Brain, TrendingUp, TrendingDown, Minus, AlertTriangle, Eye, CheckCircle, Info } from 'lucide-react'
import type { CompanyProfile, ReasoningResult, IvaForecast, CashFlowForecast } from './useCognitive'

interface Props {
  profile:     CompanyProfile | null
  reasoning:   ReasoningResult | null
  ivaForecast: IvaForecast | null
  cashFlow:    CashFlowForecast | null
  loading:     boolean
}

export function SamaraScoresCard({ profile, reasoning, ivaForecast, cashFlow, loading }: Props) {
    
  if (loading) return <SamaraScoresSkeleton />

  return (
    <div className="card p-4 space-y-4 col-span-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-gradient-to-br from-blue/20 to-cyan-500/20 flex items-center justify-center">
            <Brain className="w-3.5 h-3.5 text-blue" />
          </div>
          <span className="text-sm font-semibold text-ink-primary">Samara Intelligence</span>
          <span className="text-[10px] uppercase tracking-widest text-ink-tertiary">cognitive v2</span>
        </div>
        {reasoning && (
          <VerdictBadge verdict={reasoning.verdict} confidence={reasoning.samara_confidence_score} />
        )}
      </div>

    {/* Veredicto principal */}
      {reasoning && (
        <div className={`px-4 py-3 rounded-lg border text-sm ${verdictBg(reasoning.verdict)}`}>
          <div className="flex items-start gap-2">
            <VerdictIcon verdict={reasoning.verdict} />
            <div className="flex-1">
              <p className="font-medium">
                {reasoning.nlg_title || reasoning.primary_reason}
              </p>
              {reasoning.nlg_message && reasoning.nlg_message !== reasoning.primary_reason && (
                <p className="text-[12px] mt-1 opacity-80">{reasoning.nlg_message}</p>
              )}
              {reasoning.suggested_actions.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {reasoning.suggested_actions.slice(0, 3).map((action, i) => (
                    <li key={i} className="text-[11px] opacity-80 flex items-center gap-1.5">
                      <span className="w-1 h-1 rounded-full bg-current flex-shrink-0" />
                      {action}
                    </li>
                  ))}
                </ul>
              )}
              {reasoning.nlg_action_hint && (
                <p className="text-[11px] mt-2 font-medium opacity-90">
                  → {reasoning.nlg_action_hint}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Scores grid */}
      {profile && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <ScoreCard
            label="Estabilidad"
            value={profile.business_stability_index}
            max={100}
            good="high"
            format="score"
          />
          <ScoreCard
            label="Estrés de caja"
            value={profile.cash_stress_index}
            max={100}
            good="low"
            format="score"
          />
          <ScoreCard
            label="Carga nómina"
            value={Math.min(profile.payroll_burden_index, 100)}
            max={100}
            good="low"
            format="score"
          />
          <ScoreCard
            label="Liquidez"
            value={profile.current_ratio}
            max={3}
            good="high"
            format="ratio"
          />
        </div>
      )}

      {/* KPIs secundarios */}
      {profile && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-1 border-t border-edge-subtle">
          <KpiMini label="Ingresos / mes" value={`$${fmtNum(profile.avg_monthly_revenue)}`} />
          <KpiMini label="Gastos / mes"   value={`$${fmtNum(profile.avg_monthly_expenses)}`} />
          <KpiMini label="Nómina / mes"   value={`$${fmtNum(profile.avg_monthly_payroll)}`} />
          <KpiMini
            label="Tendencia"
            value={fmtTrend(profile.growth_trend)}
            icon={<TrendIcon trend={profile.growth_trend} />}
          />
        </div>
      )}


            {/* IVA Forecast */}
      {ivaForecast && ivaForecast.method !== 'insufficient_data' && (
        <div className="pt-3 border-t border-edge-subtle">
          <p className="text-[10px] text-ink-tertiary uppercase tracking-wider mb-2">
            Proyección IVA — {ivaForecast.period_forecast}
          </p>
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-edge-subtle rounded-lg p-2 text-center">
              <p className="text-[10px] text-ink-ghost">IVA cobrado</p>
              <p className="text-sm font-medium text-ink-primary">${fmtNum(ivaForecast.iva_collected_forecast ?? 0)}</p>
            </div>
            <div className="bg-edge-subtle rounded-lg p-2 text-center">
              <p className="text-[10px] text-ink-ghost">IVA pagado</p>
              <p className="text-sm font-medium text-ink-primary">${fmtNum(ivaForecast.iva_paid_forecast ?? 0)}</p>
            </div>
            <div className={`rounded-lg p-2 text-center ${(ivaForecast.iva_balance_forecast ?? 0) >= 0 ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
              <p className="text-[10px] text-ink-ghost">Balance</p>
              <p className={`text-sm font-medium ${(ivaForecast.iva_balance_forecast ?? 0) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                ${fmtNum(ivaForecast.iva_balance_forecast ?? 0)}
              </p>
            </div>
          </div>
          {ivaForecast.alert_message && (
            <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-2">{ivaForecast.alert_message}</p>
          )}
        </div>
      )}

      {/* Cash Flow Forecast */}
      {cashFlow && cashFlow.forecast_30d && (
        <div className="pt-3 border-t border-edge-subtle">
          <p className="text-[10px] text-ink-tertiary uppercase tracking-wider mb-2">
            Flujo de caja proyectado
          </p>
          <div className="grid grid-cols-3 gap-2">
            {([
              { label: '30 días', data: cashFlow.forecast_30d },
              { label: '60 días', data: cashFlow.forecast_60d },
              { label: '90 días', data: cashFlow.forecast_90d },
            ] as const).map(({ label, data }) => data && (
              <div key={label} className={`rounded-lg p-2 text-center ${data.net >= 0 ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                <p className="text-[10px] text-ink-ghost">{label}</p>
                <p className={`text-sm font-medium ${data.net >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  ${fmtNum(data.net)}
                </p>
                <p className="text-[9px] text-ink-ghost">{(data.confidence * 100).toFixed(0)}% conf.</p>
              </div>
            ))}
          </div>
          {cashFlow.alert_message && (
            <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-2">{cashFlow.alert_message}</p>
          )}
        </div>
      )}

      {/* Alertas operacionales */}
      {reasoning && (reasoning.context_used.customers_critical > 0 || reasoning.context_used.suppliers_critical > 0) && (
        <div className="pt-3 border-t border-edge-subtle space-y-2">
          <p className="text-[10px] text-ink-tertiary uppercase tracking-wider">Alertas operacionales</p>
          {reasoning.context_used.customers_critical > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20">
              <AlertTriangle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
              <span className="text-[12px] text-red-700 dark:text-red-300">
                {reasoning.context_used.customers_critical} cliente{reasoning.context_used.customers_critical > 1 ? 's' : ''} en riesgo crítico de pérdida
              </span>
            </div>
          )}
          {reasoning.context_used.suppliers_critical > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <Eye className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
              <span className="text-[12px] text-amber-700 dark:text-amber-300">
                {reasoning.context_used.suppliers_critical} proveedor{reasoning.context_used.suppliers_critical > 1 ? 'es' : ''} con comportamiento crítico
              </span>
            </div>
          )}
        </div>
      )}

      {/* Señales del reasoning */}
      {reasoning && reasoning.signals.length > 0 && (
        <details className="group">
          <summary className="text-[11px] text-ink-tertiary cursor-pointer hover:text-ink-secondary transition-colors select-none">
            Ver señales de los engines ({reasoning.signals.length})
          </summary>
          <div className="mt-2 space-y-1">
            {reasoning.signals.map((sig, i) => (
              <div key={i} className="flex items-center gap-2 text-[11px] text-ink-tertiary py-1 border-b border-edge-subtle last:border-0">
                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${verdictDot(sig.verdict)}`} />
                <span className="font-mono text-[10px] text-ink-ghost w-28 flex-shrink-0">{sig.engine}</span>
                <span className="flex-1">{sig.reason}</span>
                <span className="text-ink-ghost">{sig.confidence}%</span>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  )
}

// ── Sub-componentes ───────────────────────────────────────────────────────────

function ScoreCard({
  label, value, max, good, format,
}: {
  label: string
  value: number
  max: number
  good: 'high' | 'low'
  format: 'score' | 'ratio'
}) {
  const pct = Math.min(100, (value / max) * 100)
  const isGood = good === 'high' ? pct >= 60 : pct <= 40
  const isMid  = good === 'high' ? pct >= 40 && pct < 60 : pct > 40 && pct <= 60
  const color  = isGood ? 'bg-green-500' : isMid ? 'bg-amber-500' : 'bg-red-500'
  const textColor = isGood
    ? 'text-green-600 dark:text-green-400'
    : isMid
    ? 'text-amber-600 dark:text-amber-400'
    : 'text-red-600 dark:text-red-400'

  return (
    <div className="bg-edge-subtle rounded-lg p-3">
      <p className="text-[10px] text-ink-tertiary uppercase tracking-wider mb-2">{label}</p>
      <p className={`text-xl font-semibold ${textColor} mb-2`}>
        {format === 'ratio' ? value.toFixed(2) : Math.round(value)}
        {format === 'score' && <span className="text-xs font-normal text-ink-ghost">/100</span>}
      </p>
      <div className="h-1 rounded-full bg-edge w-full overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function KpiMini({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] text-ink-tertiary uppercase tracking-wider">{label}</p>
      <div className="flex items-center gap-1 mt-0.5">
        {icon}
        <p className="text-sm font-medium text-ink-primary">{value}</p>
      </div>
    </div>
  )
}

function VerdictBadge({ verdict, confidence }: { verdict: string; confidence: number }) {
  const styles: Record<string, string> = {
    ALERT: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
    WATCH: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    OK:    'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20',
    INFO:  'bg-blue-500/10 text-blue border-blue/20',
  }
  return (
    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-semibold ${styles[verdict] || styles.OK}`}>
      <span>{verdict}</span>
      <span className="opacity-60">{confidence.toFixed(0)}%</span>
    </div>
  )
}

function VerdictIcon({ verdict }: { verdict: string }) {
  const cls = 'w-4 h-4 flex-shrink-0 mt-0.5'
  if (verdict === 'ALERT') return <AlertTriangle className={`${cls} text-red-500`} />
  if (verdict === 'WATCH') return <Eye className={`${cls} text-amber-500`} />
  if (verdict === 'INFO')  return <Info className={`${cls} text-blue`} />
  return <CheckCircle className={`${cls} text-green-500`} />
}

function TrendIcon({ trend }: { trend: string }) {
  if (trend === 'growing')   return <TrendingUp  className="w-3.5 h-3.5 text-green-500" />
  if (trend === 'declining') return <TrendingDown className="w-3.5 h-3.5 text-red-500" />
  return <Minus className="w-3.5 h-3.5 text-ink-tertiary" />
}

function SamaraScoresSkeleton() {
  return (
    <div className="card p-4 col-span-full animate-pulse space-y-3">
      <div className="h-4 bg-edge-subtle rounded w-40" />
      <div className="h-16 bg-edge-subtle rounded" />
      <div className="grid grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-edge-subtle rounded" />)}
      </div>
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function verdictBg(verdict: string): string {
  const map: Record<string, string> = {
    ALERT: 'bg-red-500/10 border-red-500/20 text-red-700 dark:text-red-300',
    WATCH: 'bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-300',
    OK:    'bg-green-500/10 border-green-500/20 text-green-700 dark:text-green-300',
    INFO:  'bg-blue/10 border-blue/20 text-blue',
  }
  return map[verdict] || map.OK
}

function verdictDot(verdict: string): string {
  const map: Record<string, string> = {
    ALERT: 'bg-red-500',
    WATCH: 'bg-amber-500',
    OK:    'bg-green-500',
    INFO:  'bg-blue',
  }
  return map[verdict] || 'bg-ink-ghost'
}

function fmtNum(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k'
  return n.toFixed(2)
}

function fmtTrend(trend: string): string {
  const map: Record<string, string> = {
    growing:  'Creciendo',
    stable:   'Estable',
    declining:'Declinando',
    unknown:  'Sin datos',
  }
  return map[trend] || trend
}