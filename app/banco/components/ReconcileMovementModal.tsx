'use client'
import { useEffect, useState, useMemo } from 'react'
import { X, FileText, Search, Check, AlertCircle, Sparkles } from 'lucide-react'
import { bankApi, fmtMoney, fmtDate } from '../api'
import type { BankMovement, ReconcilableInvoice } from '../types'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://d16rb4jhhui7p6.cloudfront.net/api/v1'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    const msg = Array.isArray(body?.message) ? body.message[0] : body?.message || `Error ${res.status}`
    throw new Error(msg)
  }
  return (body?.data ?? body) as T
}

interface Props {
  open: boolean
  onClose: () => void
  movement: BankMovement | null
  onReconciled: () => void
}

export function ReconcileMovementModal({ open, onClose, movement, onReconciled }: Props) {
  const [invoices, setInvoices]                   = useState<ReconcilableInvoice[]>([])
  const [purchases, setPurchases]                 = useState<any[]>([])
  const [loading, setLoading]                     = useState(false)
  const [loadingPurchases, setLoadingPurchases]   = useState(false)
  const [search, setSearch]                       = useState('')
  const [selectedId, setSelectedId]               = useState<string | null>(null)
  const [selectedPurchaseId, setSelectedPurchaseId] = useState<string | null>(null)
  const [saving, setSaving]                       = useState(false)
  const [error, setError]                         = useState('')

  useEffect(() => {
    if (!open || !movement) return
    setError('')
    setSelectedId(null)
    setSelectedPurchaseId(null)
    setSearch('')

    if (movement.direction === 'CREDIT') {
      setLoading(true)
      bankApi.listReconcilableInvoices()
        .then((data) => setInvoices(data || []))
        .catch((e) => setError(e.message || 'Error al cargar facturas'))
        .finally(() => setLoading(false))
    } else {
      setLoadingPurchases(true)
      bankApi.listReconcilablePurchases()
        .then((data: any) => {
          const list = Array.isArray(data?.data) ? data.data
            : Array.isArray(data) ? data : []
          setPurchases(list)
        })
        .catch((e) => setError(e.message || 'Error al cargar compras'))
        .finally(() => setLoadingPurchases(false))
    }
  }, [open, movement])

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  const filtered = useMemo(() => {
    if (!movement) return invoices
    const movAmount = parseFloat(movement.amount)
    const q = search.toLowerCase().trim()
    const matches = invoices.filter((inv) => {
      if (!q) return true
      const haystack = [
        inv.sequential,
        inv.customer?.name,
        inv.customer?.identification,
        inv.invoice_data?.razonSocialComprador,
      ].filter(Boolean).join(' ').toLowerCase()
      return haystack.includes(q)
    })
    return matches.sort((a, b) => {
      const ta = parseFloat(a.invoice_data?.importeTotal ?? '0')
      const tb = parseFloat(b.invoice_data?.importeTotal ?? '0')
      const aMatch = Math.abs(ta - movAmount) < 0.01 ? 1 : 0
      const bMatch = Math.abs(tb - movAmount) < 0.01 ? 1 : 0
      if (aMatch !== bMatch) return bMatch - aMatch
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })
  }, [invoices, search, movement])

  if (!open || !movement) return null

  const movAmount = parseFloat(movement.amount)
  const isDebit   = movement.direction === 'DEBIT'
  const canSubmit = isDebit ? !!selectedPurchaseId : !!selectedId

  const handleReconcile = async () => {
    if (!canSubmit) { setError(isDebit ? 'Elegí una compra' : 'Elegí una factura'); return }
    setSaving(true)
    setError('')
    try {
      if (!isDebit) {
        // CREDIT → conciliar contra factura emitida
        await bankApi.reconcileMovement(movement.id, selectedId!)
      } else {
        // DEBIT → pagar la compra desde el banco + ignorar movimiento original
        await request<any>(`/purchases/${selectedPurchaseId}/pay`, {
          method: 'POST',
          body: JSON.stringify({
            bank_account_id: movement.bank_account_id,
            payment_date:    movement.movement_date,
            reference:       movement.reference ?? undefined,
          }),
        })
        await bankApi.ignoreMovement(movement.id)
      }
      onReconciled()
      onClose()
    } catch (e: any) {
      setError(e.message || 'Error al procesar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 dark:bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl bg-surface border border-edge rounded-2xl shadow-2xl flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-edge-subtle shrink-0">
          <div>
            <h2 className="text-base font-semibold text-ink-primary tracking-tight">
              {isDebit ? 'Registrar pago de compra' : 'Conciliar movimiento'}
            </h2>
            <p className="text-xs text-ink-tertiary mt-0.5">
              {isDebit
                ? 'Seleccioná la compra que pagaste con este egreso'
                : 'Seleccioná la factura que corresponde a este ingreso'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-ink-tertiary hover:text-ink-primary hover:bg-edge-subtle transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Resumen del movimiento */}
        <div className="px-5 py-4 bg-surface-raised border-b border-edge-subtle shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] uppercase tracking-widest text-ink-tertiary font-medium mb-0.5">
                Movimiento a conciliar
              </div>
              <div className="text-sm font-semibold text-ink-primary">{movement.description}</div>
              <div className="text-[11px] text-ink-tertiary mt-0.5">
                {fmtDate(movement.movement_date)}{movement.reference && ` · Ref: ${movement.reference}`}
              </div>
            </div>
            <div className="text-right">
              <div className={`text-lg font-bold ${isDebit ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                {fmtMoney(movAmount, movement.bank_account?.currency || 'USD')}
              </div>
              <div className="text-[10px] text-ink-tertiary uppercase tracking-wider">
                {isDebit ? 'Egreso' : 'Ingreso'}
              </div>
            </div>
          </div>
        </div>

        {/* Buscador — solo para ingresos */}
        {!isDebit && (
          <div className="p-5 border-b border-edge-subtle shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-ghost pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por secuencial, cliente, RUC..."
                className="field pl-10"
              />
            </div>
          </div>
        )}

        {/* Lista */}
        <div className="flex-1 overflow-y-auto p-5 space-y-2">
          {error && (
            <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-600 dark:text-red-400">
              <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {isDebit ? (
            // ── EGRESOS: mostrar compras impagas ──────────────────────
            loadingPurchases ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-16 bg-edge-subtle rounded-xl animate-pulse" />
              ))
            ) : purchases.length === 0 ? (
              <div className="py-12 text-center">
                <FileText className="w-8 h-8 text-ink-ghost mx-auto mb-2" />
                <p className="text-sm font-semibold text-ink-primary mb-1">No hay compras pendientes de pago</p>
                <p className="text-xs text-ink-tertiary">Solo se muestran compras en estado REGISTRADA</p>
              </div>
            ) : (
              purchases.map((p: any) => {
                const total        = parseFloat(p.total ?? '0')
                const isAmountMatch = Math.abs(total - movAmount) < 0.01
                const isSelected   = selectedPurchaseId === p.id
                return (
                  <button
                    key={p.id}
                    onClick={() => setSelectedPurchaseId(p.id)}
                    className={`w-full text-left p-3 rounded-xl border transition-all ${
                      isSelected
                        ? 'border-blue/40 bg-blue/10'
                        : 'border-edge-subtle hover:border-edge hover:bg-edge-subtle'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        isSelected ? 'bg-blue text-white' : 'bg-blue-muted text-blue'
                      }`}>
                        {isSelected ? <Check className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-ink-primary truncate">
                            {p.supplier?.legal_name ?? 'Proveedor desconocido'}
                          </span>
                          {isAmountMatch && (
                            <span className="flex items-center gap-1 text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                              <Sparkles className="w-2.5 h-2.5" />
                              Monto coincide
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="font-mono text-[10px] text-ink-tertiary">
                            {p.sequential ?? p.id.slice(0, 8)}
                          </span>
                          <span className="text-[10px] text-ink-ghost">·</span>
                          <span className="text-[10px] text-ink-tertiary">{fmtDate(p.issue_date)}</span>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="text-sm font-bold text-ink-primary">{fmtMoney(total)}</div>
                      </div>
                    </div>
                  </button>
                )
              })
            )
          ) : (
            // ── INGRESOS: mostrar facturas emitidas ───────────────────
            loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-16 bg-edge-subtle rounded-xl animate-pulse" />
              ))
            ) : filtered.length === 0 ? (
              <div className="py-12 text-center">
                <FileText className="w-8 h-8 text-ink-ghost mx-auto mb-2" />
                <p className="text-sm text-ink-primary font-medium mb-1">
                  {invoices.length === 0
                    ? 'No hay facturas para conciliar'
                    : 'Sin resultados para tu búsqueda'}
                </p>
                {invoices.length === 0 && (
                  <p className="text-xs text-ink-tertiary">
                    Solo se muestran facturas autorizadas y sin conciliar
                  </p>
                )}
              </div>
            ) : (
              filtered.map((inv) => {
                const total        = parseFloat(inv.invoice_data?.importeTotal ?? '0')
                const isAmountMatch = Math.abs(total - movAmount) < 0.01
                const isSelected   = selectedId === inv.id
                return (
                  <button
                    key={inv.id}
                    onClick={() => setSelectedId(inv.id)}
                    className={`w-full text-left p-3 rounded-xl border transition-all ${
                      isSelected
                        ? 'border-blue/40 bg-blue/10'
                        : 'border-edge-subtle hover:border-edge hover:bg-edge-subtle'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        isSelected ? 'bg-blue text-white' : 'bg-blue-muted text-blue'
                      }`}>
                        {isSelected ? <Check className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-ink-primary truncate">
                            {inv.customer?.name || inv.invoice_data?.razonSocialComprador || '—'}
                          </span>
                          {isAmountMatch && (
                            <span className="flex items-center gap-1 text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                              <Sparkles className="w-2.5 h-2.5" />
                              Monto coincide
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="font-mono text-[10px] text-ink-tertiary">{inv.sequential}</span>
                          <span className="text-[10px] text-ink-ghost">·</span>
                          <span className="text-[10px] text-ink-tertiary">{fmtDate(inv.created_at)}</span>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="text-sm font-bold text-ink-primary">{fmtMoney(total, 'USD')}</div>
                      </div>
                    </div>
                  </button>
                )
              })
            )
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-4 border-t border-edge-subtle shrink-0">
          <button onClick={onClose} className="btn btn-ghost">
            Cancelar
          </button>
          <button
            onClick={handleReconcile}
            disabled={saving || !canSubmit}
            className="btn btn-primary"
          >
            <Check className="w-4 h-4" />
            {saving ? 'Procesando...' : isDebit ? 'Registrar pago' : 'Conciliar'}
          </button>
        </div>
      </div>
    </div>
  )
}
