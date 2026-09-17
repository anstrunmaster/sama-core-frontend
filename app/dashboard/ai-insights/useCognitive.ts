'use client'
import { useState, useEffect, useCallback } from 'react'

const AI_URL =
  process.env.NEXT_PUBLIC_AI_URL ||
  (process.env.NEXT_PUBLIC_API_URL || 'https://api.teusec.com/api/v1')
    .replace(/\/api\/v1\/?$/, '')

export interface CompanyProfile {
  active_employees:         number
  active_customers:         number
  active_suppliers:         number
  avg_monthly_revenue:      number
  avg_monthly_expenses:     number
  avg_monthly_payroll:      number
  business_stability_index: number
  cash_stress_index:        number
  payroll_burden_index:     number
  current_ratio:            number
  working_capital:          number
  growth_trend:             string
  computed_at:              string
}

export interface ReasoningSignal {
  engine:     string
  priority:   number
  verdict:    string
  confidence: number
  reason:     string
}

export interface ReasoningResult {
  verdict:                 string
  confidence:              number
  primary_reason:          string
  suggested_actions:       string[]
  goals_aligned:           string[]
  samara_confidence_score: number
  signals:                 ReasoningSignal[]
  // NLG
  nlg_title:               string
  nlg_message:             string
  nlg_detail:              string
  nlg_action_hint:         string
  nlg_severity_label:      string
  nlg_template_id:         string
  context_used:            Record<string, number>  // ← agregar esto
  data_facts:              Record<string, number>  // ← y esto
}

export interface CognitiveState {
  profile:     CompanyProfile | null
  reasoning:   ReasoningResult | null
  ivaForecast: IvaForecast | null
  cashFlow:    CashFlowForecast | null
  atRisk:      AtRiskData | null       // ← nuevo
  loading:     boolean
  error:       string | null
  refresh:     () => void
}
export interface IvaForecast {
  period_forecast:        string | null
  iva_collected_forecast: number | null
  iva_paid_forecast:      number | null
  iva_balance_forecast:   number | null
  confidence:             number
  method:                 string
  periods_used:           number
  alert:                  string | null
  alert_message:          string | null
}

export interface CashFlowHorizon {
  revenue:    number
  expenses:   number
  payroll:    number
  net:        number
  confidence: number
}

export interface CashFlowForecast {
  forecast_30d:    CashFlowHorizon | null
  forecast_60d:    CashFlowHorizon | null
  forecast_90d:    CashFlowHorizon | null
  method:          string
  periods_used:    number
  alert:           string | null
  alert_message:   string | null
}

export interface CognitiveState {
  profile:       CompanyProfile | null
  reasoning:     ReasoningResult | null
  ivaForecast:   IvaForecast | null
  cashFlow:      CashFlowForecast | null
  loading:       boolean
  error:         string | null
  refresh:       () => void
}
export interface CustomerAtRisk {
  customer_id:        string
  customer_name:      string
  churn_risk:         number
  health_score:       number
  behavior:           string
  avg_invoice:        number
  total_invoices:     number
  last_invoice:       string | null
  avg_frequency_days: number | null
  risk_level:         string
  alert_message:      string
}

export interface SupplierAtRisk {
  supplier_id:             string
  supplier_name:           string
  trust_score:             number
  avg_ticket:              number
  ticket_variability_pct:  number
  avg_frequency_days:      number | null
  total_purchases:         number
  last_purchase:           string | null
  behavior:                string
  risk_level:              string
  alert_message:           string
}

export interface AtRiskData {
  customers: CustomerAtRisk[]
  suppliers: SupplierAtRisk[]
}
export function useCognitive(): CognitiveState {
  const [profile,   setProfile]   = useState<CompanyProfile | null>(null)
  const [reasoning, setReasoning] = useState<ReasoningResult | null>(null)
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState<string | null>(null)
  const [ivaForecast, setIvaForecast] = useState<IvaForecast | null>(null)
  const [cashFlow,    setCashFlow]    = useState<CashFlowForecast | null>(null)
  const [atRisk, setAtRisk] = useState<AtRiskData | null>(null)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [profileRes, reasoningRes, ivaRes, cashRes, customersRes, suppliersRes] = await Promise.allSettled([
        fetch(`${AI_URL}/api/v1/cognitive/company-profile`, { credentials: 'include' }),
        fetch(`${AI_URL}/api/v1/cognitive/reasoning`,       { credentials: 'include' }),
        fetch(`${AI_URL}/api/v1/cognitive/iva-forecast`,    { credentials: 'include' }),
        fetch(`${AI_URL}/api/v1/cognitive/cash-flow-forecast`, { credentials: 'include' }),
        fetch(`${AI_URL}/api/v1/cognitive/customers-at-risk`,    { credentials: 'include' }),
        fetch(`${AI_URL}/api/v1/cognitive/suppliers-at-risk`,    { credentials: 'include' }),
      ])

      if (profileRes.status === 'fulfilled' && profileRes.value.ok) {
        const json = await profileRes.value.json()
        setProfile(json.data)
      }
      if (reasoningRes.status === 'fulfilled' && reasoningRes.value.ok) {
        const json = await reasoningRes.value.json()
        setReasoning(json.data)
      }
      if (ivaRes.status === 'fulfilled' && ivaRes.value.ok) {
        const json = await ivaRes.value.json()
        setIvaForecast(json.data)
      }
      if (cashRes.status === 'fulfilled' && cashRes.value.ok) {
        const json = await cashRes.value.json()
        setCashFlow(json.data)
      }
      const atRiskData: AtRiskData = { customers: [], suppliers: [] }
    if (customersRes.status === 'fulfilled' && customersRes.value.ok) {
    const json = await customersRes.value.json()
    atRiskData.customers = json.data.customers || []
    }
    if (suppliersRes.status === 'fulfilled' && suppliersRes.value.ok) {
    const json = await suppliersRes.value.json()
    atRiskData.suppliers = json.data.suppliers || []
    }
    setAtRisk(atRiskData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error de conexión')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAll()
    // Refresh cada 30 minutos
    const interval = setInterval(fetchAll, 30 * 60 * 1000)
    return () => clearInterval(interval)
  }, [fetchAll])

  return { profile, reasoning, ivaForecast, cashFlow, atRisk, loading, error, refresh: fetchAll }
}