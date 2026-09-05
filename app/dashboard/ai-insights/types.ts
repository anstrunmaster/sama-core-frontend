/**
 * Types compartidos entre componentes del módulo ai-insights.
 * Sincronizar con factura-iq/app/api/schemas.py y app/nlg/types.py
 */

// ─── NLG (Natural Language Generation) ────────────────────────────────────
// Campos enriquecidos que vienen en payload cuando factura-iq corre con NLG.
// Son OPCIONALES: alertas viejas pre-NLG no los tienen y los componentes
// hacen fallback al `message` original.

export interface NLGFields {
  nlg_title?: string
  nlg_message?: string
  nlg_detail?: string
  nlg_action_hint?: string
  nlg_severity_label?: string
  nlg_data_facts?: Record<string, unknown>
  nlg_template_id?: string
}

// ─── Recomendaciones ───────────────────────────────────────────────────────

export interface Recommendation {
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO'
  category: 'stock' | 'anomaly' | 'revenue' | 'data_quality'
  title: string
  message: string
  action_hint: string
  affected_count: number

  // NLG opcional
  nlg_title?: string
  nlg_message?: string
  nlg_detail?: string
  nlg_action_hint?: string
  nlg_severity_label?: string
}

export interface RecommendationsResponse {
  prediction_id: string
  summary: string
  recommendations: Recommendation[]
  generated_at: string
  explanation?: Record<string, unknown>
  model_version?: string
}

// ─── Anomalías ─────────────────────────────────────────────────────────────

export interface AnomalyHit {
  movement_id: string
  product_id: string
  created_at: string
  movement_type: string
  quantity: number
  score: number
  severity: 'LOW' | 'MEDIUM' | 'HIGH'
  reasons: string[]

  // NLG opcional (cuando viene del backend con factura-iq NLG-enabled)
  nlg_title?: string
  nlg_message?: string
  nlg_detail?: string
  nlg_action_hint?: string
  nlg_severity_label?: string
}

export interface AnomaliesResponse {
  prediction_id: string
  n_movements_analyzed: number
  n_anomalies: number
  anomalies: AnomalyHit[]
  using_baseline: boolean
  generated_at: string
  explanation?: Record<string, unknown>
}

// ─── State del hook ────────────────────────────────────────────────────────

export interface AiInsightsState {
  recommendations: RecommendationsResponse | null
  anomalies: AnomaliesResponse | null
  loading: boolean
  error: string | null
  lastUpdated: Date | null
  refresh: () => Promise<void>
  acknowledgeAlert: (alertId: string) => Promise<boolean>
}

/** Backend API alert (lo que viene de NestJS Be1-env vía AI Client) */
export interface AiAlert {
  id: string
  alert_type: string
  severity: 'INFO' | 'WARNING' | 'CRITICAL'
  title: string
  message: string
  payload: Record<string, unknown> & Partial<NLGFields>
  status: 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED'
  created_at: string
}
