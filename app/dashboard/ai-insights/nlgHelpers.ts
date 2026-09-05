/**
 * Helper centralizado para resolver campos de display con fallback inteligente.
 *
 * Patrón: si la alerta tiene campos NLG (nuevos, generados por factura-iq),
 * usarlos. Si no (alertas viejas pre-NLG), caer al `message`/`title` original.
 *
 * Esto permite migración progresiva sin migración de datos: las alertas
 * existentes siguen mostrándose como antes, las nuevas se ven enriquecidas.
 */
import type {
  AiAlert,
  AnomalyHit,
  Recommendation,
  NLGFields,
} from './types'

// Tipo común para cualquier objeto que pueda tener campos NLG + originales
type NLGCandidate = Partial<NLGFields> & {
  title?: string
  message?: string
  action_hint?: string
  payload?: Record<string, unknown>
}

/**
 * Extrae los campos NLG de un objeto. Si están en el nivel raíz, los usa
 * directamente. Si están dentro de `payload`, los lee de ahí.
 */
function extractNLG(obj: NLGCandidate): Partial<NLGFields> {
  // Caso AiAlert: NLG está en payload
  if (obj.payload && typeof obj.payload === 'object') {
    const p = obj.payload as Partial<NLGFields>
    if (p.nlg_title || p.nlg_message) {
      return {
        nlg_title: p.nlg_title,
        nlg_message: p.nlg_message,
        nlg_detail: p.nlg_detail,
        nlg_action_hint: p.nlg_action_hint,
        nlg_severity_label: p.nlg_severity_label,
        nlg_data_facts: p.nlg_data_facts,
        nlg_template_id: p.nlg_template_id,
      }
    }
  }
  // Caso Recommendation/AnomalyHit: NLG en raíz
  if (obj.nlg_title || obj.nlg_message) {
    return obj as Partial<NLGFields>
  }
  return {}
}

/** Devuelve el título a mostrar — preferentemente NLG, sino original. */
export function getDisplayTitle(obj: NLGCandidate): string {
  const nlg = extractNLG(obj)
  return nlg.nlg_title || obj.title || 'Alerta del sistema'
}

/** Devuelve el mensaje resumen a mostrar (típicamente para cards). */
export function getDisplayMessage(obj: NLGCandidate): string {
  const nlg = extractNLG(obj)
  return nlg.nlg_message || obj.message || ''
}

/** Devuelve el detalle expandido (típicamente para modales). */
export function getDisplayDetail(obj: NLGCandidate): string {
  const nlg = extractNLG(obj)
  return nlg.nlg_detail || nlg.nlg_message || obj.message || ''
}

/** Devuelve el action_hint si está disponible. */
export function getActionHint(obj: NLGCandidate): string | null {
  const nlg = extractNLG(obj)
  return nlg.nlg_action_hint || obj.action_hint || null
}

/** Devuelve la etiqueta human-readable de severidad si NLG la generó. */
export function getSeverityLabel(obj: NLGCandidate): string | null {
  const nlg = extractNLG(obj)
  return nlg.nlg_severity_label || null
}

/** Devuelve los data_facts auditables para mostrar como tabla en el modal. */
export function getDataFacts(obj: NLGCandidate): Record<string, unknown> | null {
  const nlg = extractNLG(obj)
  return nlg.nlg_data_facts || null
}

/** True si esta alerta tiene contenido NLG enriquecido. */
export function hasNLG(obj: NLGCandidate): boolean {
  const nlg = extractNLG(obj)
  return Boolean(nlg.nlg_title || nlg.nlg_message)
}

/**
 * Formatea data_facts para mostrar en una tabla de detalle.
 * Convierte snake_case a Title Case y formatea valores comunes.
 */
export function formatDataFactKey(key: string): string {
  const map: Record<string, string> = {
    product_id: 'ID Producto',
    product_name: 'Producto',
    movement_id: 'ID Movimiento',
    movement_type: 'Tipo de movimiento',
    severity: 'Severidad',
    score: 'Score de anomalía',
    quantity: 'Cantidad',
    current_stock: 'Stock actual',
    days_until_stockout: 'Días hasta quiebre',
    sales_last_7d: 'Ventas últimos 7 días',
    sales_last_30d: 'Ventas últimos 30 días',
    avg_daily_sales: 'Promedio ventas/día',
    avg_quantity: 'Cantidad promedio histórica',
    multiplier_vs_avg: 'Multiplicador vs promedio',
    safety_stock: 'Stock de seguridad',
    confidence: 'Confianza',
    forecast_next_7d: 'Proyección 7 días (USD)',
    forecast_next_30d: 'Proyección 30 días (USD)',
    actual_last_7d: 'Real últimos 7 días (USD)',
    trend: 'Tendencia',
    trend_pct: 'Variación %',
    days_of_history: 'Días de historial',
    days_required: 'Días requeridos',
    n_samples: 'Muestras',
  }
  return map[key] || key.replace(/_/g, ' ')
}

/** Formatea un valor de data_facts para display. */
export function formatDataFactValue(key: string, value: unknown): string {
  if (value === null || value === undefined) return '—'
  if (typeof value === 'boolean') return value ? 'Sí' : 'No'

  // Valores monetarios (formato Ecuador)
  if (
    typeof value === 'number' &&
    (key.includes('forecast') || key.includes('actual_last') || key.includes('USD'))
  ) {
    return new Intl.NumberFormat('es-EC', {
      style: 'currency',
      currency: 'USD',
    }).format(value)
  }

  // Porcentajes
  if (typeof value === 'number' && key.includes('pct')) {
    const pct = Math.abs(value) <= 1 ? value * 100 : value
    const sign = pct >= 0 ? '+' : ''
    return `${sign}${pct.toFixed(1)}%`
  }

  // Confianza (0-1 → percentage)
  if (typeof value === 'number' && key === 'confidence') {
    return `${(value * 100).toFixed(0)}%`
  }

  // Score 0-1
  if (typeof value === 'number' && key === 'score') {
    return value.toFixed(3)
  }

  // Días con un decimal
  if (typeof value === 'number' && key.includes('days')) {
    return value % 1 === 0 ? String(value) : value.toFixed(1)
  }

  // Cantidades enteras
  if (typeof value === 'number' && Number.isInteger(value)) {
    return new Intl.NumberFormat('es-EC').format(value)
  }

  // Cantidades decimales
  if (typeof value === 'number') {
    return value.toFixed(2).replace('.', ',')
  }

  return String(value)
}
