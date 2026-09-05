'use client'
import { useState } from 'react'
import { Sparkles, AlertTriangle, AlertCircle, Info, CheckCircle2, ArrowUpRight } from 'lucide-react'
import { RecommendationModal } from './RecommendationModal'
import type { Recommendation } from './types'
import { hasNLG, getDisplayTitle, getDisplayMessage, getActionHint } from './nlgHelpers'

interface Props {
  recommendations: Recommendation[]
  summary: string
  loading: boolean
}

type PriorityConfig = { color: string; bg: string; border: string; Icon: typeof AlertTriangle; label: string }

const PRIORITY_CONFIG: Record<Recommendation['priority'], PriorityConfig> = {
  CRITICAL: { color: '#EF4444', bg: 'bg-red-500/10',     border: 'border-red-500/20',     Icon: AlertCircle,   label: 'Crítico' },
  HIGH:     { color: '#F59E0B', bg: 'bg-amber-500/10',   border: 'border-amber-500/20',   Icon: AlertTriangle, label: 'Alto' },
  MEDIUM:   { color: '#3B82F6', bg: 'bg-blue-500/10',    border: 'border-blue-500/20',    Icon: Info,          label: 'Medio' },
  LOW:      { color: '#10B981', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', Icon: CheckCircle2,  label: 'Bajo' },
  INFO:     { color: '#52525B', bg: 'bg-edge-subtle',    border: 'border-edge-subtle',    Icon: Info,          label: 'Info' },
}

export function RecommendationsCard({ recommendations, summary, loading }: Props) {
  const [selected, setSelected] = useState<Recommendation | null>(null)

  const orderedRecs = [...recommendations].sort((a, b) => {
    const order = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3, INFO: 4 }
    return order[a.priority] - order[b.priority]
  })

  return (
    <>
      <div className="card rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500/20 to-purple-500/20 flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-violet-500 dark:text-violet-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-ink-primary">Recomendaciones IA</h3>
              {!loading && summary && (
                <p className="text-[10px] text-ink-tertiary mt-0.5">{summary}</p>
              )}
            </div>
          </div>
          <span className="text-[10px] uppercase tracking-widest text-ink-tertiary font-medium">
            {loading ? '—' : recommendations.length}
          </span>
        </div>

        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-16 bg-edge-subtle rounded-xl animate-pulse" />
            ))}
          </div>
        ) : recommendations.length === 0 ? (
          <div className="py-8 text-center">
            <CheckCircle2 className="w-8 h-8 text-emerald-500/40 mx-auto mb-2" />
            <p className="text-sm text-ink-tertiary">Todo en orden — sin alertas</p>
          </div>
        ) : (
          <div className="space-y-2">
            {orderedRecs.map((rec, i) => {
              const config = PRIORITY_CONFIG[rec.priority]
              const Icon = config.Icon
              const enriched = hasNLG(rec)
              const title = getDisplayTitle(rec)
              const message = getDisplayMessage(rec)
              const actionHint = getActionHint(rec)
              const isClickable = rec.priority !== 'INFO' || (actionHint && actionHint !== 'No requiere acción.')

              return (
                <button
                  key={i}
                  onClick={() => isClickable && setSelected(rec)}
                  disabled={!isClickable}
                  className={`group w-full text-left p-3 rounded-xl border ${config.border} ${config.bg} transition-all ${
                    isClickable
                      ? 'hover:bg-edge-subtle hover:scale-[1.005] cursor-pointer'
                      : 'cursor-default'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{ background: `${config.color}20` }}
                    >
                      <Icon className="w-3.5 h-3.5" style={{ color: config.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold text-ink-primary truncate">
                          {title}
                        </span>
                        {enriched && (
                          <Sparkles className="w-2.5 h-2.5 text-violet-500 dark:text-violet-400 flex-shrink-0" />
                        )}
                        <span
                          className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded font-bold flex-shrink-0 ml-auto"
                          style={{ background: `${config.color}20`, color: config.color }}
                        >
                          {config.label}
                        </span>
                      </div>
                      <p className="text-[11px] text-ink-secondary leading-relaxed mb-1.5 line-clamp-2">
                        {message}
                      </p>
                      {actionHint && actionHint !== 'No requiere acción.' && (
                        <div className="flex items-center gap-1 text-[10px] text-ink-tertiary group-hover:text-ink-primary transition-colors">
                          <ArrowUpRight className="w-3 h-3" />
                          <span className="line-clamp-1">{actionHint}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      <RecommendationModal
        open={selected !== null}
        onClose={() => setSelected(null)}
        recommendation={selected}
      />
    </>
  )
}
