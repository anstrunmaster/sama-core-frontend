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
  verdict:                 string   // ALERT | WATCH | OK | INFO
  confidence:              number
  primary_reason:          string
  suggested_actions:       string[]
  goals_aligned:           string[]
  samara_confidence_score: number
  signals:                 ReasoningSignal[]
}

export interface CognitiveState {
  profile:   CompanyProfile | null
  reasoning: ReasoningResult | null
  loading:   boolean
  error:     string | null
  refresh:   () => void
}

export function useCognitive(): CognitiveState {
  const [profile,   setProfile]   = useState<CompanyProfile | null>(null)
  const [reasoning, setReasoning] = useState<ReasoningResult | null>(null)
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState<string | null>(null)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [profileRes, reasoningRes] = await Promise.allSettled([
        fetch(`${AI_URL}/api/v1/cognitive/company-profile`, {
          credentials: 'include',
        }),
        fetch(`${AI_URL}/api/v1/cognitive/reasoning`, {
          credentials: 'include',
        }),
      ])

      if (profileRes.status === 'fulfilled' && profileRes.value.ok) {
        const json = await profileRes.value.json()
        setProfile(json.data)
      }

      if (reasoningRes.status === 'fulfilled' && reasoningRes.value.ok) {
        const json = await reasoningRes.value.json()
        setReasoning(json.data)
      }

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

  return { profile, reasoning, loading, error, refresh: fetchAll }
}