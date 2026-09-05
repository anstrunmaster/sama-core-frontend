'use client'
import { useState } from 'react'
import { Activity, TrendingUp, Eye, Sparkles } from 'lucide-react'
import { AnomalyModal } from './AnomalyModal'
import type { AnomalyHit } from './types'
import { hasNLG, getDisplayMessage, getSeverityLabel } from './nlgHelpers'

interface Props {
  anomalies: AnomalyHit[]
  nMovementsAnalyzed: number
  usingBaseline: boolean
  loading: boolean
}

const SEVERITY_CONFIG: Record<AnomalyHit['severity'], { color: string; label: string }> = {
  HIGH: { color: '#EF4444', label: 'Alta' },
  MEDIUM: { color: '#F59E0B', label: 'Media' },
  LOW: { color: '#10B981', label: 'Baja' },
}

const TYPE_LABELS: Record<string, string> = {
  SALE: 'Venta',
  PURCHASE: 'Compra',
  RETURN: 'Devolución',
  ADJUSTMENT: 'Ajuste',
  TRANSFER: 'Transferencia',
}

function fmtTimeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'hace instantes'
  if (mins < 60) return `hace ${mins} min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `hace ${hours}h`
  const days = Math.floor(hours / 24)
  return `hace ${days}d`
}

export function AnomaliesCard({ anomalies, nMovementsAnalyzed, usingBaseline, loading }: Props) {
  const [selected, setSelected] = useState<AnomalyHit | null>(null)

  return (
    <>
      <div className="card rounded-2xl p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-red-500/20 to-orange-500/20 flex items-center justify-center">
              <Activity className="w-3.5 h-3.5 text-red-500 dark:text-red-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-ink-primary">Anomalías</h3>
              {!loading && (
                <p className="text-[10px] text-ink-tertiary mt-0.5">
                  {nMovementsAnalyzed} movimientos analizados • últimos 30 días
                </p>
              )}
            </div>
          </div>
          {!loading && (
            <span
              className={`text-[10px] uppercase tracking-widest font-bold px-2 py-1 rounded ${
                anomalies.length > 0
                  ? 'bg-red-500/10 text-red-600 dark:text-red-400'
                  : 'text-ink-tertiary'
              }`}
            >
              {anomalies.length} {anomalies.length === 1 ? 'detectada' : 'detectadas'}
            </span>
          )}
        </div>

        {/* Banner de modo baseline */}
        {!loading && usingBaseline && anomalies.length > 0 && (
          <div className="mb-3 px-3 py-2 rounded-lg bg-blue/5 border border-blue/10 flex items-start gap-2">
            <TrendingUp className="w-3 h-3 text-blue mt-0.5 flex-shrink-0" />
            <p className="text-[10px] text-ink-secondary leading-relaxed">
              Detección estadística (baseline). Cuando tengas más histórico se activará el modelo IsolationForest.
            </p>
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="h-20 bg-edge-subtle rounded-xl animate-pulse" />
            ))}
          </div>
        ) : anomalies.length === 0 ? (
          <div className="py-8 text-center">
            <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-2">
              <Eye className="w-4 h-4 text-emerald-500" />
            </div>
            <p className="text-sm text-ink-primary font-medium mb-1">Movimientos normales</p>
            <p className="text-[11px] text-ink-tertiary">No se detectaron patrones inusuales</p>
          </div>
        ) : (
          <div className="space-y-2">
            {anomalies.slice(0, 5).map((a) => {
              const config = SEVERITY_CONFIG[a.severity]

              // ─── NLG smart resolution ───
              const enriched = hasNLG(a)
              const previewText = enriched
                ? getDisplayMessage(a)
                : a.reasons.join(' • ')

              const severityLabel = enriched ? getSeverityLabel(a) : null

              return (
                <button
                  key={a.movement_id}
                  onClick={() => setSelected(a)}
                  className="w-full text-left p-3 rounded-xl border border-edge-subtle hover:border-edge hover:bg-edge-subtle hover:scale-[1.005] transition-all cursor-pointer"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="w-1 self-stretch rounded-full flex-shrink-0"
                      style={{ background: config.color }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-xs font-semibold text-ink-primary flex-shrink-0">
                            {TYPE_LABELS[a.movement_type] || a.movement_type}
                          </span>
                          <span className="text-xs text-ink-secondary truncate">
                            {a.quantity} u
                          </span>
                          {enriched && (
                            <Sparkles className="w-2.5 h-2.5 text-violet-500 dark:text-violet-400 flex-shrink-0" />
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span
                            className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded font-bold"
                            style={{ background: `${config.color}20`, color: config.color }}
                          >
                            {severityLabel || config.label}
                          </span>
                          <span className="text-[10px] text-ink-tertiary font-mono">
                            {(a.score * 100).toFixed(0)}%
                          </span>
                        </div>
                      </div>
                      <p className="text-[11px] text-ink-secondary leading-relaxed mb-1 line-clamp-2">
                        {previewText}
                      </p>
                      <div className="flex items-center justify-between text-[10px] text-ink-tertiary">
                        <span className="font-mono">
                          Producto {a.product_id.slice(0, 8)}…
                        </span>
                        <span>{fmtTimeAgo(a.created_at)}</span>
                      </div>
                    </div>
                  </div>
                </button>
              )
            })}
            {anomalies.length > 5 && (
              <p className="text-[10px] text-center text-ink-tertiary pt-1">
                + {anomalies.length - 5} más
              </p>
            )}
          </div>
        )}
      </div>

      {/* Modal con detalle */}
      <AnomalyModal
        open={selected !== null}
        onClose={() => setSelected(null)}
        anomaly={selected}
      />
    </>
  )
}
