'use client'
import {
  Activity, AlertTriangle, Package, Calendar, Hash, TrendingUp,
  Sparkles, Lightbulb,
} from 'lucide-react'
import { Modal } from './Modal'
import type { AnomalyHit } from './types'
import {
  getDisplayTitle,
  getDisplayMessage,
  getDisplayDetail,
  getActionHint,
  getSeverityLabel,
  getDataFacts,
  hasNLG,
  formatDataFactKey,
  formatDataFactValue,
} from './nlgHelpers'

interface Props {
  open: boolean
  onClose: () => void
  anomaly: AnomalyHit | null
}

type SeverityConfig = { color: string; label: string; description: string }

const SEVERITY_CONFIG: Record<AnomalyHit['severity'], SeverityConfig> = {
  HIGH: {
    color: '#EF4444',
    label: 'Alta',
    description: 'Patrón muy fuera de lo común — revisar urgente',
  },
  MEDIUM: {
    color: '#F59E0B',
    label: 'Media',
    description: 'Patrón inusual — vale la pena revisar',
  },
  LOW: {
    color: '#10B981',
    label: 'Baja',
    description: 'Levemente fuera de patrón — monitorear',
  },
}

const TYPE_LABELS: Record<string, string> = {
  SALE: 'Venta',
  PURCHASE: 'Compra',
  RETURN: 'Devolución',
  ADJUSTMENT: 'Ajuste',
  TRANSFER: 'Transferencia',
}

function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString('es-EC', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function AnomalyModal({ open, onClose, anomaly }: Props) {
  if (!anomaly) return null

  const config = SEVERITY_CONFIG[anomaly.severity]
  const typeLabel = TYPE_LABELS[anomaly.movement_type] || anomaly.movement_type

  // ─── NLG smart resolution ───
  const isEnriched = hasNLG(anomaly)
  const nlgTitle = isEnriched ? getDisplayTitle(anomaly) : null
  const nlgMessage = isEnriched ? getDisplayMessage(anomaly) : null
  const nlgDetail = isEnriched ? getDisplayDetail(anomaly) : null
  const nlgAction = getActionHint(anomaly)
  const nlgSeverityLabel = getSeverityLabel(anomaly)
  const dataFacts = getDataFacts(anomaly)

  // Título del modal: prefiere NLG, sino fallback al texto fijo anterior
  const modalTitle = nlgTitle || `${typeLabel} anómala detectada`
  const modalSubtitle = isEnriched
    ? (nlgSeverityLabel || `Severidad ${config.label}`)
    : `Movimiento de ${anomaly.quantity} unidades`

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={modalTitle}
      subtitle={modalSubtitle}
      icon={
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: `${config.color}15` }}
        >
          <Activity className="w-4 h-4" style={{ color: config.color }} />
        </div>
      }
      primaryAction={{
        label: 'Ver producto',
        onClick: () => {
          window.location.href = `/products?highlight=${anomaly.product_id}`
        },
        variant: 'default',
      }}
    >
      <div className="space-y-4">
        {/* NLG: Mensaje principal enriquecido — sólo si hay NLG */}
        {isEnriched && nlgMessage && (
          <div className="rounded-xl border border-violet-500/20 bg-violet-500/10 p-4">
            <div className="flex items-center gap-1.5 mb-2">
              <Sparkles className="w-3 h-3 text-violet-500 dark:text-violet-400" />
              <span className="text-[10px] uppercase tracking-widest text-violet-600 dark:text-violet-400 font-medium">
                Análisis IA
              </span>
            </div>
            <p className="text-sm text-ink-primary leading-relaxed">{nlgMessage}</p>
          </div>
        )}

        {/* Score con barra visual */}
        <div className="bg-edge-subtle rounded-xl border border-edge-subtle p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] uppercase tracking-widest text-ink-tertiary font-medium">
              Score de anomalía
            </span>
            <span
              className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded font-bold"
              style={{ background: `${config.color}20`, color: config.color }}
            >
              Severidad {config.label}
            </span>
          </div>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-3xl font-bold text-ink-primary tracking-tight">
              {(anomaly.score * 100).toFixed(0)}
              <span className="text-lg text-ink-tertiary">%</span>
            </span>
          </div>
          <div className="w-full h-1.5 bg-edge rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${anomaly.score * 100}%`,
                background: config.color,
              }}
            />
          </div>
          <p className="text-[10px] text-ink-secondary mt-2">{config.description}</p>
        </div>

        {/* NLG: Detalle expandido (sólo si hay NLG y es distinto del message) */}
        {isEnriched && nlgDetail && nlgDetail !== nlgMessage && (
          <div>
            <h3 className="text-[10px] uppercase tracking-widest text-ink-tertiary font-medium mb-2">
              Detalle del análisis
            </h3>
            <p className="text-sm text-ink-secondary leading-relaxed">{nlgDetail}</p>
          </div>
        )}

        {/* Acción sugerida (NLG) */}
        {nlgAction && (
          <div className="bg-blue/10 border border-blue/20 rounded-xl p-4">
            <div className="flex items-start gap-2.5">
              <Lightbulb className="w-4 h-4 text-blue mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="text-[10px] uppercase tracking-widest text-blue font-medium mb-1">
                  Acción sugerida
                </h3>
                <p className="text-sm text-ink-primary leading-relaxed">{nlgAction}</p>
              </div>
            </div>
          </div>
        )}

        {/* Razones (solo si hay y no se duplican con el detalle NLG) */}
        {anomaly.reasons.length > 0 && (
          <div>
            <h3 className="text-[10px] uppercase tracking-widest text-ink-tertiary font-medium mb-2">
              Factores detectados
            </h3>
            <ul className="space-y-1.5">
              {anomaly.reasons.map((reason, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-sm text-ink-secondary"
                >
                  <AlertTriangle
                    className="w-3.5 h-3.5 mt-0.5 flex-shrink-0"
                    style={{ color: config.color }}
                  />
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Metadata grid */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <MetadataItem
            Icon={TrendingUp}
            label="Tipo"
            value={typeLabel}
          />
          <MetadataItem
            Icon={Hash}
            label="Cantidad"
            value={`${anomaly.quantity} u`}
          />
          <MetadataItem
            Icon={Package}
            label="Producto"
            value={anomaly.product_id.slice(0, 8) + '…'}
            mono
          />
          <MetadataItem
            Icon={Calendar}
            label="Fecha"
            value={fmtDateTime(anomaly.created_at)}
          />
        </div>

        {/* Datos auditables (solo si NLG generó data_facts) */}
        {dataFacts && Object.keys(dataFacts).length > 0 && (
          <details className="group pt-2 border-t border-edge-subtle">
            <summary className="cursor-pointer text-[10px] uppercase tracking-widest text-ink-tertiary font-medium hover:text-ink-secondary transition-colors flex items-center gap-1">
              <span>Datos referenciados</span>
              <span className="text-ink-ghost">({Object.keys(dataFacts).length})</span>
            </summary>
            <div className="mt-2 grid grid-cols-2 gap-1.5">
              {Object.entries(dataFacts).map(([key, value]) => (
                <div
                  key={key}
                  className="text-[11px] text-ink-secondary flex justify-between items-center bg-edge-subtle px-2 py-1 rounded"
                >
                  <span className="text-ink-tertiary">{formatDataFactKey(key)}</span>
                  <span className="font-mono text-ink-primary">
                    {formatDataFactValue(key, value)}
                  </span>
                </div>
              ))}
            </div>
          </details>
        )}

        {/* ID del movimiento (debug) */}
        <div className="pt-2 border-t border-edge-subtle">
          <p className="text-[10px] text-ink-tertiary">
            ID del movimiento:{' '}
            <span className="font-mono text-ink-secondary">{anomaly.movement_id}</span>
          </p>
        </div>
      </div>
    </Modal>
  )
}

function MetadataItem({
  Icon,
  label,
  value,
  mono,
}: {
  Icon: typeof Package
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div className="bg-edge-subtle rounded-xl border border-edge-subtle p-3">
      <div className="flex items-center gap-2 mb-1">
        <Icon className="w-3.5 h-3.5 text-ink-tertiary" />
        <span className="text-[10px] uppercase tracking-widest text-ink-tertiary font-medium">
          {label}
        </span>
      </div>
      <p className={`text-xs font-semibold text-ink-primary ${mono ? 'font-mono' : ''}`}>
        {value}
      </p>
    </div>
  )
}
