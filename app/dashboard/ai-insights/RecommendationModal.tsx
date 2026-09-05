'use client'
import {
  Sparkles, AlertTriangle, AlertCircle, Info, CheckCircle2,
  ArrowUpRight, Package, TrendingUp, Database, Lightbulb,
} from 'lucide-react'
import { Modal } from './Modal'
import type { Recommendation } from './types'
import {
  getDisplayTitle,
  getDisplayMessage,
  getDisplayDetail,
  getActionHint,
  getSeverityLabel,
  hasNLG,
} from './nlgHelpers'

interface Props {
  open: boolean
  onClose: () => void
  recommendation: Recommendation | null
}

type PriorityConfig = { color: string; bg: string; Icon: typeof AlertTriangle; label: string }

const PRIORITY_CONFIG: Record<Recommendation['priority'], PriorityConfig> = {
  CRITICAL: { color: '#EF4444', bg: 'bg-red-500/10',    Icon: AlertCircle,   label: 'Crítico' },
  HIGH:     { color: '#F59E0B', bg: 'bg-amber-500/10',  Icon: AlertTriangle, label: 'Alto' },
  MEDIUM:   { color: '#3B82F6', bg: 'bg-blue-500/10',   Icon: Info,          label: 'Medio' },
  LOW:      { color: '#10B981', bg: 'bg-emerald-500/10', Icon: CheckCircle2,  label: 'Bajo' },
  INFO:     { color: '#52525B', bg: 'bg-edge-subtle',   Icon: Info,          label: 'Info' },
}

type CategoryConfig = { Icon: typeof Package; label: string }

const CATEGORY_ICON: Record<Recommendation['category'], CategoryConfig> = {
  stock: { Icon: Package, label: 'Inventario' },
  anomaly: { Icon: AlertTriangle, label: 'Anomalía' },
  revenue: { Icon: TrendingUp, label: 'Ingresos' },
  data_quality: { Icon: Database, label: 'Calidad de datos' },
}

const ROUTE_BY_CATEGORY: Record<Recommendation['category'], string | null> = {
  stock: '/inventory',
  anomaly: '/inventory',
  revenue: '/facturas',
  data_quality: null,
}

export function RecommendationModal({ open, onClose, recommendation }: Props) {
  if (!recommendation) return null

  const config = PRIORITY_CONFIG[recommendation.priority]
  const categoryConfig = CATEGORY_ICON[recommendation.category]
  const PriorityIcon = config.Icon
  const CategoryIcon = categoryConfig.Icon
  const route = ROUTE_BY_CATEGORY[recommendation.category]

  // ─── NLG smart resolution ───
  const isEnriched = hasNLG(recommendation)
  const title = getDisplayTitle(recommendation)
  const message = getDisplayMessage(recommendation)
  const detail = getDisplayDetail(recommendation)
  const actionHint = getActionHint(recommendation)
  const nlgSeverityLabel = getSeverityLabel(recommendation)

  const subtitle = nlgSeverityLabel
    ? `${categoryConfig.label} • ${nlgSeverityLabel}`
    : `${categoryConfig.label} • Prioridad ${config.label}`

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      icon={
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: `${config.color}15` }}
        >
          <PriorityIcon className="w-4 h-4" style={{ color: config.color }} />
        </div>
      }
      primaryAction={
        route
          ? {
              label: `Ir a ${categoryConfig.label}`,
              onClick: () => {
                window.location.href = route
              },
              variant: 'default',
            }
          : undefined
      }
    >
      <div className="space-y-4">
        {/* NLG: Banner cuando es contenido enriquecido por IA */}
        {isEnriched && (
          <div className="rounded-xl border border-violet-500/20 bg-violet-500/10 p-4">
            <div className="flex items-center gap-1.5 mb-2">
              <Sparkles className="w-3 h-3 text-violet-500 dark:text-violet-400" />
              <span className="text-[10px] uppercase tracking-widest text-violet-600 dark:text-violet-400 font-medium">
                Análisis IA
              </span>
            </div>
            <p className="text-sm text-ink-primary leading-relaxed">{message}</p>
          </div>
        )}

        {/* Detalle expandido — sólo si hay y es distinto al message */}
        {detail && detail !== message && (
          <div>
            <h3 className="text-[10px] uppercase tracking-widest text-ink-tertiary font-medium mb-2">
              {isEnriched ? 'Detalle del análisis' : 'Detalle'}
            </h3>
            <p className="text-sm text-ink-secondary leading-relaxed">{detail}</p>
          </div>
        )}

        {/* Si NO hay NLG, el message va acá como detalle estándar */}
        {!isEnriched && message && (
          <div>
            <h3 className="text-[10px] uppercase tracking-widest text-ink-tertiary font-medium mb-2">
              Detalle
            </h3>
            <p className="text-sm text-ink-primary leading-relaxed">{message}</p>
          </div>
        )}

        {/* Acción sugerida */}
        {actionHint && actionHint !== 'No requiere acción.' && (
          <div className={`rounded-xl border border-edge-subtle ${config.bg} p-4`}>
            <div className="flex items-start gap-2.5">
              <Lightbulb className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: config.color }} />
              <div>
                <h3 className="text-[10px] uppercase tracking-widest mb-1 font-medium" style={{ color: config.color }}>
                  Acción sugerida
                </h3>
                <p className="text-sm text-ink-primary leading-relaxed">{actionHint}</p>
              </div>
            </div>
          </div>
        )}

        {/* Metadata */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <div className="bg-edge-subtle rounded-xl border border-edge-subtle p-3">
            <div className="flex items-center gap-2 mb-1">
              <CategoryIcon className="w-3.5 h-3.5 text-ink-tertiary" />
              <span className="text-[10px] uppercase tracking-widest text-ink-tertiary font-medium">
                Categoría
              </span>
            </div>
            <p className="text-xs font-semibold text-ink-primary">{categoryConfig.label}</p>
          </div>

          <div className="bg-edge-subtle rounded-xl border border-edge-subtle p-3">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] uppercase tracking-widest text-ink-tertiary font-medium">
                Afectados
              </span>
            </div>
            <p className="text-xs font-semibold text-ink-primary">
              {recommendation.affected_count > 0
                ? `${recommendation.affected_count} elemento${recommendation.affected_count !== 1 ? 's' : ''}`
                : 'No aplica'}
            </p>
          </div>
        </div>
      </div>
    </Modal>
  )
}
