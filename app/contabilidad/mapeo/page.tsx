'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  CheckCircle2, AlertCircle, Loader2, RefreshCw, X,
  HelpCircle, Trash2, Link2,
} from 'lucide-react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { AccountPicker } from '../asientos/components/AccountPicker'
import { mappingsApi } from '../api-4c'
import {
  type AccountingMapping,
  type AccountingMappingKey,
  MAPPING_LABELS,
  MAPPING_GROUPS,
} from '../types-4c'
import type { Account } from '../cuentas/types'

export default function MapeoPage() {
  const [mappings, setMappings] = useState<AccountingMapping[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [savingKey, setSavingKey] = useState<AccountingMappingKey | null>(null)

  async function load() {
    setLoading(true)
    setError('')
    try {
      const data = await mappingsApi.list()
      setMappings(data)
    } catch (e: any) {
      setError(e.message || 'Error al cargar mappings')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const byKey = useMemo(() => {
    const m = new Map<AccountingMappingKey, AccountingMapping>()
    for (const map of mappings) m.set(map.key, map)
    return m
  }, [mappings])

  async function handleSet(key: AccountingMappingKey, account: Account | null) {
    if (!account) return
    setError('')
    setSuccess('')
    setSavingKey(key)
    try {
      const updated = await mappingsApi.set(key, account.id)
      setMappings((prev) => [...prev.filter((m) => m.key !== key), updated])
      setSuccess(`Mapeo "${MAPPING_LABELS[key].label}" guardado`)
      setTimeout(() => setSuccess(''), 3000)
    } catch (e: any) {
      setError(e.message || 'Error al guardar')
    } finally {
      setSavingKey(null)
    }
  }

  async function handleUnset(key: AccountingMappingKey) {
    setError('')
    setSavingKey(key)
    try {
      await mappingsApi.unset(key)
      setMappings((prev) => prev.filter((m) => m.key !== key))
    } catch (e: any) {
      setError(e.message || 'Error al eliminar')
    } finally {
      setSavingKey(null)
    }
  }

  const totalKeys = Object.keys(MAPPING_LABELS).length
  const configuredCount = mappings.length

  return (
    <DashboardLayout>
      <div className="p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <Link2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <h1 className="text-lg font-bold text-ink-primary">Mapeo de cuentas</h1>
            </div>
            <p className="text-sm text-ink-tertiary mt-0.5">
              Configura qué cuenta del plan usar para cada concepto contable · {configuredCount} de {totalKeys} configuradas
            </p>
          </div>
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-edge-subtle border border-edge text-sm text-ink-secondary hover:text-ink-primary hover:border-edge-strong disabled:opacity-50 transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Progreso */}
        <div className="card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-ink-secondary">Configuración</span>
            <span className="font-mono text-sm text-ink-primary tabular-nums">
              {configuredCount}/{totalKeys}
            </span>
          </div>
          <div className="h-1.5 bg-edge-subtle rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all duration-300 rounded-full"
              style={{ width: `${(configuredCount / totalKeys) * 100}%` }}
            />
          </div>
          {configuredCount < totalKeys && (
            <p className="text-xs text-ink-tertiary mt-2.5 leading-relaxed">
              Mientras no configures un concepto, los asientos automáticos que lo necesiten van a fallar con un mensaje claro.
            </p>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center justify-between px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-600 dark:text-red-400">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              onClick={() => setError('')}
              className="text-red-600/60 dark:text-red-400/60 hover:text-red-600 dark:hover:text-red-400 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Success */}
        {success && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-green-500/10 border border-green-500/20 text-sm text-green-600 dark:text-green-400">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="card py-16 text-center">
            <Loader2 className="w-6 h-6 text-blue-600 dark:text-blue-400 animate-spin mx-auto mb-3" />
            <p className="text-sm text-ink-tertiary">Cargando configuración...</p>
          </div>
        )}

        {/* Grupos */}
        {!loading && MAPPING_GROUPS.map((groupName, groupIndex) => {
          const keysInGroup = (Object.keys(MAPPING_LABELS) as AccountingMappingKey[]).filter(
            (k) => MAPPING_LABELS[k].group === groupName,
          )
          return (
            // FIX: se quitó `overflow-hidden` (recortaba los desplegables de las
            // últimas filas). Se agrega `relative` + z-index decreciente para que
            // un dropdown abierto quede por encima de los grupos siguientes.
            <div
              key={groupName}
              className="card relative"
              style={{ zIndex: MAPPING_GROUPS.length - groupIndex }}
            >
              {/* rounded-t-[inherit] mantiene las esquinas del header idénticas
                  al radio del card, ahora que ya no hay overflow-hidden */}
              <div className="px-5 py-3 border-b border-edge-subtle bg-surface-raised rounded-t-[inherit]">
                <h3 className="text-[10px] font-semibold uppercase tracking-widest text-ink-tertiary">
                  {groupName}
                </h3>
              </div>
              <div className="divide-y divide-edge-subtle">
                {keysInGroup.map((key) => {
                  const meta = MAPPING_LABELS[key]
                  const current = byKey.get(key)
                  const isSaving = savingKey === key
                  return (
                    <div
                      key={key}
                      className="p-4 flex items-start gap-4 flex-wrap md:flex-nowrap"
                    >
                      {/* Label + descripción */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-ink-primary">
                            {meta.label}
                          </span>
                          {current && (
                            <CheckCircle2 className="w-3.5 h-3.5 text-green-600 dark:text-green-400 shrink-0" />
                          )}
                        </div>
                        <p className="text-[11px] text-ink-tertiary flex items-start gap-1.5 leading-relaxed">
                          <HelpCircle className="w-3 h-3 mt-0.5 shrink-0" />
                          <span>{meta.help}</span>
                        </p>
                      </div>

                      {/* Selector de cuenta */}
                      <div className="w-full md:w-[320px] shrink-0">
                        <AccountPicker
                          value={current?.account_id ?? null}
                          onChange={(acc) => handleSet(key, acc)}
                          disabled={isSaving}
                          placeholder="Sin configurar"
                        />
                      </div>

                      {/* Acción */}
                      <div className="shrink-0 w-8 flex items-center justify-center">
                        {isSaving ? (
                          <Loader2 className="w-4 h-4 animate-spin text-blue-600 dark:text-blue-400" />
                        ) : current ? (
                          <button
                            onClick={() => handleUnset(key)}
                            className="p-1.5 rounded-lg border border-edge text-ink-tertiary hover:text-red-600 dark:hover:text-red-400 hover:border-red-500/20 hover:bg-red-500/10 transition-all"
                            title="Quitar mapeo"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        ) : null}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </DashboardLayout>
  )
}
