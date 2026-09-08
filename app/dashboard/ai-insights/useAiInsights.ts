'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import type {
  RecommendationsResponse,
  AnomaliesResponse,
  AiInsightsState,
} from './types'

/**
 * URL del servicio factura-iq vía CloudFront /ai/*
 * Si NEXT_PUBLIC_API_URL = https://d1.../api/v1, AI_URL queda como https://d1.../ai
 */
const AI_URL =
  process.env.NEXT_PUBLIC_AI_URL ||
  (process.env.NEXT_PUBLIC_API_URL || 'https://d16rb4jhhui7p6.cloudfront.net/api/v1')
    .replace(/\/api\/v1\/?$/, '') + '/ai'

/** URL del backend NestJS para acknowledgements (sigue por API normal). */
const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  'https://d16rb4jhhui7p6.cloudfront.net/api/v1'

/** Polling cada 5 minutos. */
const POLLING_INTERVAL_MS = 5 * 60 * 1000

export function useAiInsights(): AiInsightsState {
  const [recommendations, setRecommendations] =
    useState<RecommendationsResponse | null>(null)
  const [anomalies, setAnomalies] = useState<AnomaliesResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  /** Ref para mantener el interval ID y poder limpiarlo. */
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  /** Ref para evitar refetches concurrentes. */
  const inFlightRef = useRef<boolean>(false)

  const fetchAll = useCallback(async () => {
    if (inFlightRef.current) return // ya hay un fetch corriendo
    inFlightRef.current = true

    setError(null)

    try {
      const [recsRes, anomaliesRes] = await Promise.allSettled([
        fetch(`${AI_URL}/api/v1/recommendations?lookback_hours=48`, {
          credentials: 'include',
        }),
        fetch(`${AI_URL}/api/v1/detect/anomalies`, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ lookback_days: 30 }),
        }),
      ])

      let anyError = false

      if (recsRes.status === 'fulfilled' && recsRes.value.ok) {
        setRecommendations(await recsRes.value.json())
      } else if (recsRes.status === 'fulfilled') {
        anyError = true
      }

      if (anomaliesRes.status === 'fulfilled' && anomaliesRes.value.ok) {
        setAnomalies(await anomaliesRes.value.json())
      } else if (anomaliesRes.status === 'fulfilled') {
        anyError = true
      }

      if (anyError) {
        setError('Algunas predicciones no se pudieron cargar')
      }

      setLastUpdated(new Date())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error de conexión')
    } finally {
      setLoading(false)
      inFlightRef.current = false
    }
  }, [])

  /**
   * Reconocer una alerta (marcarla como vista por el usuario).
   * Llama al backend NestJS, no a factura-iq directamente.
   */
  const acknowledgeAlert = useCallback(
    async (alertId: string): Promise<boolean> => {
      try {
        const res = await fetch(`${API_URL}/ai-alerts/${alertId}/ack`, {
          method: 'PATCH',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        })
        return res.ok
      } catch {
        return false
      }
    },
    []
  )

  /** Initial fetch + polling. */
  useEffect(() => {
    fetchAll()

    // Setup polling
    intervalRef.current = setInterval(() => {
      fetchAll()
    }, POLLING_INTERVAL_MS)

    // Cleanup
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [fetchAll])

  return {
    recommendations,
    anomalies,
    loading,
    error,
    lastUpdated,
    refresh: fetchAll,
    acknowledgeAlert,
  }
}
