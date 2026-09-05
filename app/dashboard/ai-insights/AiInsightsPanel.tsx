'use client'
import { useState, useEffect } from 'react'
import { RefreshCw, Sparkles, AlertCircle } from 'lucide-react'
import { useAiInsights } from './useAiInsights'
import { RecommendationsCard } from './RecommendationsCard'
import { AnomaliesCard } from './AnomaliesCard'

/**
 * Panel de IA Insights con:
 *  - Polling cada 5 min
 *  - Indicador de "última actualización"
 *  - Refresh manual
 *  - Click en cards → modales con detalle
 */
export function AiInsightsPanel() {
  const { recommendations, anomalies, loading, error, lastUpdated, refresh } = useAiInsights()

  // Estado para forzar re-render del "hace X min" cada 30s
  const [, setTick] = useState(0)
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 30000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="space-y-3">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-gradient-to-br from-violet-500/20 to-purple-500/20 flex items-center justify-center">
            <Sparkles className="w-3 h-3 text-violet-500 dark:text-violet-400" />
          </div>
          <h2 className="text-sm font-semibold text-ink-primary tracking-tight">
            Inteligencia
          </h2>
          <span className="text-[10px] uppercase tracking-widest text-ink-tertiary font-medium">
            powered by IA
          </span>
          {lastUpdated && !loading && (
            <span className="text-[10px] text-ink-tertiary ml-2">
              • actualizado {fmtTimeAgo(lastUpdated)}
            </span>
          )}
        </div>
        <button
          onClick={refresh}
          disabled={loading}
          className="p-1.5 rounded-lg bg-edge-subtle border border-edge text-ink-tertiary hover:text-ink-primary transition-all disabled:opacity-50"
          title="Actualizar predicciones"
        >
          <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <AlertCircle className="w-3 h-3 text-amber-600 dark:text-amber-400 flex-shrink-0" />
          <span className="text-[10px] text-amber-600 dark:text-amber-400">{error}</span>
        </div>
      )}

      {/* Cards grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RecommendationsCard
          recommendations={recommendations?.recommendations ?? []}
          summary={recommendations?.summary ?? ''}
          loading={loading}
        />
        <AnomaliesCard
          anomalies={anomalies?.anomalies ?? []}
          nMovementsAnalyzed={anomalies?.n_movements_analyzed ?? 0}
          usingBaseline={anomalies?.using_baseline ?? false}
          loading={loading}
        />
      </div>
    </div>
  )
}

function fmtTimeAgo(date: Date): string {
  const diff = Date.now() - date.getTime()
  const secs = Math.floor(diff / 1000)
  if (secs < 30) return 'recién'
  if (secs < 60) return `hace ${secs}s`
  const mins = Math.floor(secs / 60)
  if (mins < 60) return `hace ${mins} min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `hace ${hours}h`
  return `hace ${Math.floor(hours / 24)}d`
}
