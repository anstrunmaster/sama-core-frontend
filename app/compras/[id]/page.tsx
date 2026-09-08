'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft, FileText, Building2, Calendar, Key,
  CheckCircle2, XCircle, Trash2, AlertCircle, Loader2,
  Receipt, Tag, Banknote, DollarSign, Edit3, Info, Wallet, FileSignature,
} from 'lucide-react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { purchasesApi, fmtMoney, fmtDate, fmtNumber } from '../api'
import {
  type Purchase,
  type PurchaseReceipt,
  type ReceiptSummaryLine,
  DOCUMENT_TYPE_LABELS,
  PURCHASE_STATUS_LABELS,
  ID_TYPE_LABELS,
  IVA_RATE_LABELS,
  PAYMENT_FORM_LABELS,
} from '../types'
import { PayPurchaseModal } from './components/PayPurchaseModal'
import { StatusBadge } from '@/components/withholdings/StatusBadge'
import type { Withholding } from '@/types/withholding'

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  'https://d16rb4jhhui7p6.cloudfront.net/api/v1'

// issue_date llega como 'YYYY-MM-DD'; new Date() lo interpreta en UTC y en
// Guayaquil (UTC-5) restaria un dia. Se formatea sin pasar por timezone.
function fmtDateOnly(iso: string): string {
  if (!iso) return '—'
  const [y, m, d] = iso.slice(0, 10).split('-')
  return `${d}/${m}/${y}`
}

interface BankAccountLite {
  id: string
  name: string
  bank_name?: string | null
  account_number?: string | null
  currency?: string | null
  current_balance?: string | number | null
  is_active?: boolean
}

interface WarehouseLite {
  id: string
  name: string
  code: string | null
}

/**
 * Detalle de compra — vista de solo lectura con acciones.
 *
 * Estados manejados:
 *   - DRAFT     → botones "Contabilizar" (register) y "Eliminar"
 *   - REGISTERED → botón "Anular" únicamente
 *   - PAID      → solo vista (no se modifica)
 *   - ANNULLED  → solo vista
 *
 * NO permite editar la compra una vez registrada — solo anular y reingresar.
 */
export default function PurchaseDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()

  const [purchase, setPurchase] = useState<Purchase | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Acciones en curso (deshabilita botones)
  const [actionLoading, setActionLoading] = useState<
    'register' | 'annul' | 'delete' | null
  >(null)

  // Modal de confirmación para acciones destructivas
  const [confirm, setConfirm] = useState<
    null | { action: 'annul' | 'delete'; title: string; body: string }
  >(null)

  // Modal de pago
  const [payModalOpen, setPayModalOpen] = useState(false)
  const [bankAccounts, setBankAccounts] = useState<BankAccountLite[]>([])

  const [accountingPreview, setAccountingPreview] = useState<any>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerLine, setDrawerLine] = useState<any>(null)

  // ─── Recepción de mercadería ────────────────────────────────────
  const [receiptSummary, setReceiptSummary] = useState<ReceiptSummaryLine[]>([])
  const [receipts, setReceipts] = useState<PurchaseReceipt[]>([])
  const [showReceiptForm, setShowReceiptForm] = useState(false)
  const [receiptLines, setReceiptLines] = useState<Record<string, { quantity: string; warehouse_id: string }>>({})
  const [warehouses, setWarehouses] = useState<WarehouseLite[]>([])
  const [submittingReceipt, setSubmittingReceipt] = useState(false)
  const [receiptError, setReceiptError] = useState('')
  const [receiptSuccess, setReceiptSuccess] = useState('')

  // ─── Comprobantes de retención ──────────────────────────────────
  const [withholdings, setWithholdings] = useState<Withholding[]>([])
  const [issuingWithholding, setIssuingWithholding] = useState(false)
  const [withholdingError, setWithholdingError] = useState('')

  // Carga resumen de recepción, historial y bodegas.
  // Cada rama tiene su propio .catch para que el fallo de una
  // no tumbe a las otras dos.
  const loadReceiptData = async (purchaseId: string) => {
    const [summary, receiptList, warehouseList] = await Promise.all([
      purchasesApi
        .getReceiptSummary(purchaseId)
        .catch(() => [] as ReceiptSummaryLine[]),
      purchasesApi
        .getReceipts(purchaseId)
        .catch(() => [] as PurchaseReceipt[]),
      fetch(`${API_URL}/warehouses?is_active=true`, {
        credentials: 'include',
      })
        .then(r => r.json())
        .then(d => {
          const p = d.data ?? d
          return Array.isArray(p?.items) ? p.items : Array.isArray(p) ? p : []
        })
        .catch(() => [] as WarehouseLite[]),
    ])

    setReceiptSummary(summary)
    setReceipts(receiptList)
    setWarehouses(warehouseList)

    // Inicializar receiptLines con quantity_pending y sin bodega
    const initial: Record<string, { quantity: string; warehouse_id: string }> = {}
    for (const line of summary) {
      if (!line.is_complete) {
        initial[line.purchase_line_id] = {
          quantity: String(line.quantity_pending),
          warehouse_id: '',
        }
      }
    }
    setReceiptLines(initial)
  }

  // Comprobantes de retención emitidos para esta compra.
  const loadWithholdings = async (purchaseId: string) => {
    try {
      const res = await fetch(`${API_URL}/withholdings?purchase_id=${purchaseId}`, {
        credentials: 'include',
      })
      const d = await res.json()
      const p = d.data ?? d
      setWithholdings(Array.isArray(p?.items) ? p.items : Array.isArray(p) ? p : [])
    } catch {
      setWithholdings([])
    }
  }

  useEffect(() => {
    if (!params.id) return
    let cancelled = false

    setLoading(true)
    purchasesApi
      .getById(params.id)
      .then((p) => {
  if (!cancelled) {
    setPurchase(p)
    // Cargar preview contable
    purchasesApi
      .accountingPreview(p.id)
      .then(setAccountingPreview)
      .catch(() => {})
    // Cargar resumen de recepción, historial y bodegas
    loadReceiptData(p.id).catch(() => {})
    // Cargar comprobantes de retención asociados
    loadWithholdings(p.id)
  }
})
      .catch((e) => { if (!cancelled) setError(e.message || 'Error al cargar') })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [params.id])

  // Cargar cuentas bancarias cuando la compra está en REGISTERED (para habilitar Pagar)
  useEffect(() => {
    if (!purchase || purchase.status !== 'REGISTERED') return
    fetchBankAccounts()
      .then(setBankAccounts)
      .catch(() => setBankAccounts([])) // si falla, modal mostrará "no hay cuentas"
  }, [purchase?.status])

  // ─── Acciones ───────────────────────────────────────────────────

  async function handleRegister() {
    if (!purchase) return
    setActionLoading('register')
    setError('')
    try {
      const updated = await purchasesApi.register(purchase.id)
      setPurchase(updated)
    } catch (e: any) {
      setError(e.message || 'Error al contabilizar')
    } finally {
      setActionLoading(null)
    }
  }

  async function handleAnnul() {
    if (!purchase) return
    setConfirm(null)
    setActionLoading('annul')
    setError('')
    try {
      const updated = await purchasesApi.annul(purchase.id)
      setPurchase(updated)
    } catch (e: any) {
      setError(e.message || 'Error al anular')
    } finally {
      setActionLoading(null)
    }
  }

  async function handleDelete() {
    if (!purchase) return
    setConfirm(null)
    setActionLoading('delete')
    setError('')
    try {
      await purchasesApi.delete(purchase.id)
      router.push('/compras')
    } catch (e: any) {
      setError(e.message || 'Error al eliminar')
      setActionLoading(null)
    }
  }

  const handleCreateReceipt = async () => {
    setReceiptError('')

    // Filtrar solo líneas con cantidad > 0 y bodega seleccionada
    const linesToReceive = Object.entries(receiptLines)
      .filter(([, v]) => parseFloat(v.quantity) > 0 && v.warehouse_id)
      .map(([purchase_line_id, v]) => ({
        purchase_line_id,
        quantity: parseFloat(v.quantity),
        warehouse_id: v.warehouse_id,
      }))

    if (linesToReceive.length === 0) {
      setReceiptError('Ingresa cantidad y bodega para al menos una línea')
      return
    }

    setSubmittingReceipt(true)
    try {
      await purchasesApi.createReceipt(purchase!.id, {
        idempotency_key: crypto.randomUUID(),
        lines: linesToReceive,
        notes: undefined,
      })
      setReceiptSuccess('Recepción registrada correctamente')
      setShowReceiptForm(false)
      await loadReceiptData(purchase!.id)
      // Recargar la compra para actualizar reception_status
      const updated = await purchasesApi.getById(purchase!.id)
      setPurchase(updated)
      setTimeout(() => setReceiptSuccess(''), 4000)
    } catch (e: any) {
      setReceiptError(e.message || 'Error al registrar recepción')
    } finally {
      setSubmittingReceipt(false)
    }
  }

  const handleIssueWithholding = async () => {
    if (!purchase) return
    setWithholdingError('')
    setIssuingWithholding(true)
    try {
      const res = await fetch(`${API_URL}/withholdings/from-purchase/${purchase.id}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      })
      const data = await res.json()
      if (!res.ok) {
        const msg = Array.isArray(data?.message) ? data.message[0] : data?.message
        setWithholdingError(msg || `Error ${res.status} al emitir la retención`)
        return
      }
      await loadWithholdings(purchase.id)
    } catch (e: any) {
      setWithholdingError(e?.message || 'Error de conexión al emitir la retención')
    } finally {
      setIssuingWithholding(false)
    }
  }

  // ─── Estados de carga / error ───────────────────────────────────

  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-6 space-y-4">
          <div className="h-8 bg-edge-subtle rounded w-64 animate-pulse" />
          <div className="card rounded-2xl p-6 h-48 animate-pulse" />
          <div className="card rounded-2xl p-6 h-64 animate-pulse" />
        </div>
      </DashboardLayout>
    )
  }

  if (error && !purchase) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <button onClick={() => router.push('/compras')} className="btn btn-ghost mb-4">
            <ArrowLeft className="w-4 h-4" />
            Volver a compras
          </button>
          <div className="card rounded-xl p-4 flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (!purchase) return null

  // ─── Datos derivados ────────────────────────────────────────────

  const supplier = purchase.supplier
  const lines = purchase.lines || []
  const retentions = purchase.retentions || []

  // Separar retenciones por tipo
  const retencionesRenta = retentions.filter((r) => r.type === 'RENTA')
  const retencionesIva = retentions.filter((r) => r.type === 'IVA')

  // Determinar acciones disponibles según estado
  const canRegister = purchase.status === 'DRAFT'
  const canPay = purchase.status === 'REGISTERED'
  const canAnnul = purchase.status === 'REGISTERED' || purchase.status === 'PAID'
  const canDelete = purchase.status === 'DRAFT'
  const canIssueWithholding = purchase.status === 'REGISTERED' || purchase.status === 'PAID'

  // Numerador del documento: 001-001-000000123
  const docNumber = `${purchase.establishment}-${purchase.emission_point}-${purchase.sequential}`

  return (
    <DashboardLayout>
      <div className="p-6 space-y-5">

        {/* Header con botón volver */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/compras')}
            className="btn btn-ghost"
          >
            <ArrowLeft className="w-4 h-4" />
            Compras
          </button>
        </div>

        {/* Error inline */}
        {error && (
          <div className="card rounded-xl p-3 flex items-center gap-2 text-sm text-red-600 dark:text-red-400 bg-red-500/5 border-red-500/20">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
            <button
              onClick={() => setError('')}
              className="ml-auto text-ink-tertiary hover:text-ink-primary"
            >
              ×
            </button>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════
            CARD 1: HEADER — datos del documento y proveedor
            ═══════════════════════════════════════════════════════ */}
        <div className="card rounded-2xl">
          <div className="p-5 border-b border-edge-subtle">
            <div className="flex flex-wrap items-start justify-between gap-4">

              {/* Identificación de la compra */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] uppercase tracking-widest text-ink-tertiary font-semibold">
                    {DOCUMENT_TYPE_LABELS[purchase.document_type]}
                  </span>
                  <StatusPill status={purchase.status} />
                </div>
                <h1 className="text-xl font-bold text-ink-primary tracking-tight font-mono">
                  {docNumber}
                </h1>
                <div className="flex items-center gap-3 mt-2 text-xs text-ink-tertiary">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Emitida: {fmtDate(purchase.issue_date)}
                  </span>
                  <span className="text-ink-ghost">·</span>
                  <span>Registrada: {fmtDate(purchase.registration_date)}</span>
                </div>
              </div>

              {/* Acciones */}
              <div className="flex items-center gap-2">
              {canDelete && (
                <Link
                  href={`/compras/${purchase.id}/editar`}
                  className="btn btn-secondary"
                >
                  <Edit3 className="w-4 h-4" />
                  Editar
                </Link>
              )}
                {canRegister && (
                  <button
                    onClick={handleRegister}
                    disabled={!!actionLoading}
                    className="btn btn-primary"
                  >
                    {actionLoading === 'register' ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4" />
                    )}
                    Contabilizar
                  </button>
                )}

                {canPay && (
                  <button
                    onClick={() => setPayModalOpen(true)}
                    disabled={!!actionLoading}
                    className="btn btn-primary bg-emerald-500 hover:bg-emerald-600"
                  >
                    <Banknote className="w-4 h-4" />
                    Pagar
                  </button>
                )}

                {canAnnul && (
                  <button
                    onClick={() =>
                      setConfirm({
                        action: 'annul',
                        title: 'Anular compra',
                        body: 'Una compra anulada NO se puede revertir. Tampoco se incluirá en el ATS ni en el Form 104.',
                      })
                    }
                    disabled={!!actionLoading}
                    className="btn btn-ghost text-amber-600 dark:text-amber-400"
                  >
                    {actionLoading === 'annul' ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <XCircle className="w-4 h-4" />
                    )}
                    Anular
                  </button>
                )}

                {canDelete && (
                  <button
                    onClick={() =>
                      setConfirm({
                        action: 'delete',
                        title: 'Eliminar borrador',
                        body: 'Vas a eliminar permanentemente este borrador. Esta acción no se puede deshacer.',
                      })
                    }
                    disabled={!!actionLoading}
                    className="btn btn-ghost text-red-600 dark:text-red-400"
                  >
                    {actionLoading === 'delete' ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                    Eliminar
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Datos del proveedor */}
          {supplier && (
            <div className="p-5 grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div>
                <div className="text-[10px] uppercase tracking-widest text-ink-tertiary font-semibold mb-2">
                  Proveedor
                </div>
                <div className="flex items-start gap-2">
                  <Building2 className="w-4 h-4 text-ink-tertiary mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="text-sm font-semibold text-ink-primary">
                      {supplier.legal_name}
                    </div>
                    {supplier.trade_name && (
                      <div className="text-xs text-ink-tertiary mt-0.5">
                        {supplier.trade_name}
                      </div>
                    )}
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-edge-subtle text-ink-secondary">
                        {ID_TYPE_LABELS[supplier.identification_type] ?? supplier.identification_type}
                      </span>
                      <span className="text-xs font-mono text-ink-secondary">
                        {supplier.identification}
                      </span>
                    </div>
                    {supplier.is_withholding_agent && (
                      <span className="inline-block mt-2 text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-blue-muted text-blue font-bold">
                        Agente de retención
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <div className="text-[10px] uppercase tracking-widest text-ink-tertiary font-semibold mb-2">
                  Datos adicionales
                </div>
                <dl className="space-y-1.5 text-xs">
                  {purchase.access_key && (
                    <div className="flex items-start gap-2">
                      <Key className="w-3.5 h-3.5 text-ink-tertiary mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <dt className="text-ink-tertiary">Clave de acceso</dt>
                        <dd className="font-mono text-ink-secondary break-all text-[10px] mt-0.5">
                          {purchase.access_key}
                        </dd>
                      </div>
                    </div>
                  )}
                  {purchase.payment_form && (
                    <div className="flex items-center gap-2">
                      <Banknote className="w-3.5 h-3.5 text-ink-tertiary flex-shrink-0" />
                      <dt className="text-ink-tertiary">Forma de pago:</dt>
                      <dd className="text-ink-primary font-medium">
                        {PAYMENT_FORM_LABELS[purchase.payment_form] ?? purchase.payment_form}
                      </dd>
                    </div>
                  )}
                </dl>
              </div>
            </div>
          )}
        </div>

        {/* ═══════════════════════════════════════════════════════
            CARD 1.5: COMPROBANTE DE RETENCIÓN
            ═══════════════════════════════════════════════════════ */}
        {(withholdings.length > 0 || canIssueWithholding) && (
          <div className="card rounded-2xl overflow-hidden">
            <div className="p-5 border-b border-edge-subtle flex items-center gap-2">
              <FileSignature className="w-4 h-4 text-ink-tertiary" />
              <h2 className="text-sm font-semibold text-ink-primary">
                Comprobante de retención
              </h2>
              {withholdings.length > 1 && (
                <span className="text-[10px] text-ink-tertiary ml-auto">
                  {withholdings.length} comprobantes
                </span>
              )}
            </div>

            {withholdingError && (
              <div className="px-5 pt-4">
                <div className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-600 dark:text-red-400">
                  {withholdingError}
                </div>
              </div>
            )}

            {withholdings.length > 0 ? (
              <div className="divide-y divide-edge-subtle">
                {withholdings.map((w) => (
                  <div key={w.id} className="flex flex-wrap items-center gap-3 px-5 py-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-semibold text-ink-primary">
                          {w.document_number}
                        </span>
                        <StatusBadge status={w.status} />
                      </div>
                      <div className="text-[11px] text-ink-tertiary mt-1">
                        Emitido {fmtDateOnly(w.issue_date)}
                      </div>
                    </div>
                    <div className="ml-auto text-right">
                      <div className="text-[10px] uppercase tracking-widest text-ink-tertiary font-semibold">
                        Total retenido
                      </div>
                      <div className="text-sm font-mono font-bold text-amber-600 dark:text-amber-400">
                        {fmtMoney(w.total_withheld)}
                      </div>
                    </div>
                    <Link href={`/retenciones/${w.id}`} className="btn btn-ghost text-xs">
                      Ver comprobante →
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-5 py-5 flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-ink-tertiary">
                  Esta compra todavía no tiene comprobante de retención emitido.
                </p>
                <button
                  type="button"
                  onClick={handleIssueWithholding}
                  disabled={issuingWithholding}
                  className="btn btn-primary"
                >
                  {issuingWithholding ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <FileSignature className="w-4 h-4" />
                  )}
                  {issuingWithholding ? 'Emitiendo...' : 'Emitir retención'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════
            CARD 2: LÍNEAS
            ═══════════════════════════════════════════════════════ */}
        <div className="card rounded-2xl overflow-hidden">
          <div className="p-5 border-b border-edge-subtle flex items-center gap-2">
            <FileText className="w-4 h-4 text-ink-tertiary" />
            <h2 className="text-sm font-semibold text-ink-primary">
              Detalle ({lines.length} {lines.length === 1 ? 'línea' : 'líneas'})
            </h2>
          </div>

          {lines.length === 0 ? (
            <div className="p-8 text-center text-sm text-ink-tertiary">
              Sin líneas registradas
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-surface-raised">
                  <tr className="border-b border-edge-subtle">
                    {['#', 'Descripción', 'Cant.', 'P. unit.', 'Desc.', 'Subtotal', 'IVA', 'Total línea'].map((h) => (
                      <th
                        key={h}
                        className="text-left px-3 py-2 text-[10px] font-semibold uppercase tracking-widest text-ink-tertiary"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {lines.map((l) => {
                    const subtotal = parseFloat(l.subtotal) || 0
                    const ivaAmt = parseFloat(l.iva_amount) || 0
                    return (
                      <tr key={l.id} className="border-b border-edge-subtle">
                        <td className="px-3 py-3 text-xs text-ink-tertiary font-mono">
                          {l.line_number}
                        </td>
                        <td className="px-3 py-3 text-xs text-ink-primary">
                          <div className="font-medium">{l.description}</div>
                          {l.code && (
                            <div className="text-[10px] text-ink-tertiary font-mono mt-0.5">
                              {l.code}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-3 text-xs text-ink-secondary font-mono">
                          {fmtNumber(l.quantity)}
                        </td>
                        <td className="px-3 py-3 text-xs text-ink-secondary font-mono">
                          {fmtMoney(l.unit_price)}
                        </td>
                        <td className="px-3 py-3 text-xs text-ink-tertiary font-mono">
                          {parseFloat(l.discount) > 0 ? fmtMoney(l.discount) : '—'}
                        </td>
                        <td className="px-3 py-3 text-xs text-ink-primary font-mono font-semibold">
                          {fmtMoney(subtotal)}
                        </td>
                        <td className="px-3 py-3 text-xs">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-edge-subtle text-ink-secondary self-start">
                              {IVA_RATE_LABELS[l.iva_rate_code] ?? `${l.iva_rate_pct}%`}
                            </span>
                            {ivaAmt > 0 && (
                              <span className="text-ink-secondary font-mono">
                                {fmtMoney(ivaAmt)}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-3 text-xs text-ink-primary font-mono font-bold">
                          {fmtMoney(subtotal + ivaAmt)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ═══════════════════════════════════════════════════════
            CARD 2.5: RECEPCIÓN DE MERCADERÍA
            ═══════════════════════════════════════════════════════ */}
        {receiptSummary.length > 0 && (
          <div className="card overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-edge-subtle">
              <div>
                <h2 className="text-sm font-semibold text-ink-primary">
                  Recepción de mercadería
                </h2>
                <p className="text-xs text-ink-tertiary mt-0.5">
                  {receiptSummary.every(l => l.is_complete)
                    ? 'Toda la mercadería fue recibida'
                    : `${receiptSummary.filter(l => l.is_complete).length} de ${receiptSummary.length} líneas completadas`
                  }
                </p>
              </div>
              {!receiptSummary.every(l => l.is_complete) &&
               (purchase?.status === 'REGISTERED' || purchase?.status === 'PAID') && (
                <button
                  onClick={() => setShowReceiptForm(!showReceiptForm)}
                  className="btn btn-primary text-sm"
                >
                  {showReceiptForm ? 'Cancelar' : 'Registrar recepción'}
                </button>
              )}
            </div>

            {/* Tabla de estado por línea */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-surface-raised">
                  <tr className="border-b border-edge-subtle">
                    {['Producto', 'Comprado', 'Recibido', 'Pendiente', 'Estado'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-ink-tertiary">
                        {h}
                      </th>
                    ))}
                    {showReceiptForm && (
                      <>
                        <th className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-ink-tertiary">
                          Cantidad a recibir
                        </th>
                        <th className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-ink-tertiary">
                          Bodega
                        </th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {receiptSummary.map(line => (
                    <tr key={line.purchase_line_id} className="border-b border-edge-subtle">
                      <td className="px-4 py-3 text-sm text-ink-primary">{line.description}</td>
                      <td className="px-4 py-3 text-sm text-ink-secondary tabular-nums">{line.quantity_purchased}</td>
                      <td className="px-4 py-3 text-sm text-ink-secondary tabular-nums">{line.quantity_received}</td>
                      <td className={`px-4 py-3 text-sm tabular-nums font-medium ${
                        line.quantity_pending > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-ink-tertiary'
                      }`}>
                        {line.quantity_pending}
                      </td>
                      <td className="px-4 py-3">
                        {line.is_complete ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20">
                            Completo
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                            Pendiente
                          </span>
                        )}
                      </td>
                      {showReceiptForm && (
                        <>
                          <td className="px-4 py-3">
                            {!line.is_complete ? (
                              <input
                                type="number"
                                min="0"
                                max={line.quantity_pending}
                                step="0.0001"
                                value={receiptLines[line.purchase_line_id]?.quantity ?? ''}
                                onChange={e => setReceiptLines(prev => ({
                                  ...prev,
                                  [line.purchase_line_id]: {
                                    ...prev[line.purchase_line_id],
                                    quantity: e.target.value
                                  }
                                }))}
                                className="field w-24 text-right"
                              />
                            ) : (
                              <span className="text-ink-ghost text-xs">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {!line.is_complete ? (
                              <select
                                value={receiptLines[line.purchase_line_id]?.warehouse_id ?? ''}
                                onChange={e => setReceiptLines(prev => ({
                                  ...prev,
                                  [line.purchase_line_id]: {
                                    ...prev[line.purchase_line_id],
                                    warehouse_id: e.target.value
                                  }
                                }))}
                                className="field"
                              >
                                <option value="">Seleccionar...</option>
                                {warehouses.map(w => (
                                  <option key={w.id} value={w.id}>
                                    {w.code ? `${w.code} — ${w.name}` : w.name}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <span className="text-ink-ghost text-xs">—</span>
                            )}
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Formulario de confirmación */}
            {showReceiptForm && (
              <div className="px-5 py-4 border-t border-edge-subtle bg-surface-raised/40">
                {receiptError && (
                  <div className="mb-3 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-600 dark:text-red-400">
                    {receiptError}
                  </div>
                )}
                <div className="flex items-center justify-end gap-3">
                  <button
                    onClick={() => { setShowReceiptForm(false); setReceiptError('') }}
                    className="btn btn-ghost"
                    disabled={submittingReceipt}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleCreateReceipt}
                    disabled={submittingReceipt}
                    className="btn btn-primary"
                  >
                    {submittingReceipt ? 'Registrando...' : 'Confirmar recepción'}
                  </button>
                </div>
              </div>
            )}

            {/* Historial de recepciones */}
            {receipts.length > 0 && (
              <div className="px-5 py-4 border-t border-edge-subtle">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-ink-tertiary mb-3">
                  Historial de recepciones ({receipts.length})
                </p>
                <div className="space-y-2">
                  {receipts.map(r => (
                    <div key={r.id} className="flex items-center justify-between text-xs text-ink-secondary py-1">
                      <span>{new Date(r.received_at).toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                      <span>{r.inventory_movements.length} movimiento(s)</span>
                      {r.notes && <span className="text-ink-ghost italic">{r.notes}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {receiptSuccess && (
              <div className="px-5 py-3 border-t border-edge-subtle bg-green-500/5 text-xs text-green-600 dark:text-green-400">
                {receiptSuccess}
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════
            CARD 3: RETENCIONES (si las hay)
            ═══════════════════════════════════════════════════════ */}
        {retentions.length > 0 && (
          <div className="card rounded-2xl overflow-hidden">
            <div className="p-5 border-b border-edge-subtle flex items-center gap-2">
              <Tag className="w-4 h-4 text-ink-tertiary" />
              <h2 className="text-sm font-semibold text-ink-primary">
                Retenciones aplicadas
              </h2>
            </div>

            {/* RENTA */}
            {retencionesRenta.length > 0 && (
              <div>
                <div className="px-5 py-2 bg-surface-raised text-[10px] uppercase tracking-widest text-ink-tertiary font-bold border-b border-edge-subtle">
                  Retención en la Fuente (RENTA)
                </div>
                <table className="w-full">
                  <thead className="bg-surface-raised">
                    <tr className="border-b border-edge-subtle">
                      {['Código', 'Descripción', 'Base', '% Ret.', 'Valor retenido'].map((h) => (
                        <th key={h} className="text-left px-4 py-2 text-[10px] font-semibold uppercase tracking-widest text-ink-tertiary">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {retencionesRenta.map((r) => (
                      <tr key={r.id} className="border-b border-edge-subtle">
                        <td className="px-4 py-3">
                          <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-edge-subtle text-ink-secondary">
                            {r.code}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-ink-secondary">
                          {r.description || '—'}
                        </td>
                        <td className="px-4 py-3 text-xs text-ink-secondary font-mono">
                          {fmtMoney(r.base_amount)}
                        </td>
                        <td className="px-4 py-3 text-xs text-ink-primary font-mono font-semibold">
                          {parseFloat(r.rate_pct).toFixed(2)}%
                        </td>
                        <td className="px-4 py-3 text-xs text-emerald-600 dark:text-emerald-400 font-mono font-bold">
                          {fmtMoney(r.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* IVA */}
            {retencionesIva.length > 0 && (
              <div>
                <div className="px-5 py-2 bg-surface-raised text-[10px] uppercase tracking-widest text-ink-tertiary font-bold border-b border-edge-subtle border-t">
                  Retención de IVA
                </div>
                <table className="w-full">
                  <thead className="bg-surface-raised">
                    <tr className="border-b border-edge-subtle">
                      {['Código', 'Descripción', 'Base', '% Ret.', 'Valor retenido'].map((h) => (
                        <th key={h} className="text-left px-4 py-2 text-[10px] font-semibold uppercase tracking-widest text-ink-tertiary">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {retencionesIva.map((r) => (
                      <tr key={r.id} className="border-b border-edge-subtle">
                        <td className="px-4 py-3">
                          <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-edge-subtle text-ink-secondary">
                            {r.code}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-ink-secondary">
                          {r.description || '—'}
                        </td>
                        <td className="px-4 py-3 text-xs text-ink-secondary font-mono">
                          {fmtMoney(r.base_amount)}
                        </td>
                        <td className="px-4 py-3 text-xs text-ink-primary font-mono font-semibold">
                          {parseFloat(r.rate_pct).toFixed(2)}%
                        </td>
                        <td className="px-4 py-3 text-xs text-emerald-600 dark:text-emerald-400 font-mono font-bold">
                          {fmtMoney(r.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════
            CARD 4: TOTALES
            ═══════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          <div className="lg:col-span-2 card rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Receipt className="w-4 h-4 text-ink-tertiary" />
              <h2 className="text-sm font-semibold text-ink-primary">Resumen</h2>
            </div>

            <dl className="space-y-2 text-sm">
              {/* Cuenta contable de gasto */}
              {(purchase as any).expense_account && (
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-edge-subtle">
                  <dt className="text-xs text-ink-tertiary flex items-center gap-1.5">
                    <Wallet className="w-3 h-3" />
                    Cuenta de gasto
                  </dt>
                  <dd className="text-xs text-ink-primary text-right">
                    <span className="font-mono font-bold">{(purchase as any).expense_account.code}</span>
                    <span className="ml-1.5 text-ink-secondary">{(purchase as any).expense_account.name}</span>
                  </dd>
                </div>
              )}
              <TotalRow label="Subtotal sin impuestos" value={fmtMoney(purchase.subtotal_no_tax)} />
              {parseFloat(purchase.subtotal_zero) > 0 && (
                <TotalRow label="Subtotal IVA 0%" value={fmtMoney(purchase.subtotal_zero)} subtle />
              )}
              {parseFloat(purchase.subtotal_taxed) > 0 && (
                <TotalRow label="Subtotal gravado IVA" value={fmtMoney(purchase.subtotal_taxed)} subtle />
              )}
              {parseFloat(purchase.subtotal_exempt) > 0 && (
                <TotalRow label="Subtotal exento" value={fmtMoney(purchase.subtotal_exempt)} subtle />
              )}
              {parseFloat(purchase.total_discount) > 0 && (
                <TotalRow
                  label="Descuento total"
                  value={`− ${fmtMoney(purchase.total_discount)}`}
                  subtle
                />
              )}
              {parseFloat(purchase.iva_amount) > 0 && (
                <TotalRow label="IVA" value={fmtMoney(purchase.iva_amount)} />
              )}
              {parseFloat(purchase.ice_amount) > 0 && (
                <TotalRow label="ICE" value={fmtMoney(purchase.ice_amount)} />
              )}

              <div className="border-t border-edge-subtle pt-2 mt-2" />

              <TotalRow label="Total factura" value={fmtMoney(purchase.total)} bold />

              {/* Retenciones — solo si hay */}
              {(parseFloat(purchase.retention_renta_total) > 0 ||
                parseFloat(purchase.retention_iva_total) > 0) && (
                <>
                  <div className="border-t border-edge-subtle pt-2 mt-3" />
                  {parseFloat(purchase.retention_renta_total) > 0 && (
                    <TotalRow
                      label="(−) Retención RENTA"
                      value={`− ${fmtMoney(purchase.retention_renta_total)}`}
                      retention
                    />
                  )}
                  {parseFloat(purchase.retention_iva_total) > 0 && (
                    <TotalRow
                      label="(−) Retención IVA"
                      value={`− ${fmtMoney(purchase.retention_iva_total)}`}
                      retention
                    />
                  )}
                </>
              )}
            </dl>
          </div>

          {/* Neto a pagar — destacado */}
          <div className="card rounded-2xl p-5 bg-blue-muted border-blue/30">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-4 h-4 text-blue" />
              <h2 className="text-[10px] uppercase tracking-widest text-ink-secondary font-bold">
                Neto a pagar al proveedor
              </h2>
            </div>
            <div className="text-3xl font-bold text-blue tracking-tight">
              {fmtMoney(purchase.net_payable)}
            </div>
            <p className="text-[11px] text-ink-tertiary mt-3 leading-relaxed">
              Es el monto a transferir al proveedor después de descontar las retenciones aplicadas.
            </p>
          </div>
        </div>

        {/* Notas */}
        {purchase.notes && (
          <div className="card rounded-xl p-4">
            <div className="flex items-start gap-2">
              <Edit3 className="w-3.5 h-3.5 text-ink-tertiary mt-1 flex-shrink-0" />
              <div>
                <div className="text-[10px] uppercase tracking-widest text-ink-tertiary font-semibold mb-1">
                  Notas
                </div>
                <p className="text-sm text-ink-secondary whitespace-pre-wrap">
                  {purchase.notes}
                </p>
              </div>
            </div>
          </div>
        )}

    {/* Preview contable */}
{accountingPreview && (
  <div className="card rounded-2xl overflow-hidden">
    <div className="p-5 border-b border-edge-subtle flex items-center gap-2">
      <Receipt className="w-4 h-4 text-ink-tertiary" />
      <h2 className="text-sm font-semibold text-ink-primary">Asiento contable</h2>
      {accountingPreview.line_details && (
        <span className="text-[10px] text-ink-tertiary ml-auto">
          Clic en una cuenta para ver el origen
        </span>
      )}
    </div>
    <table className="w-full text-xs">
      <thead>
        <tr className="border-b border-edge-subtle bg-surface-raised">
          <th className="text-left py-2 px-4 text-[10px] uppercase tracking-widest text-ink-tertiary font-semibold">Cuenta</th>
          <th className="text-left py-2 px-4 text-[10px] uppercase tracking-widest text-ink-tertiary font-semibold">Descripción</th>
          <th className="text-right py-2 px-4 text-[10px] uppercase tracking-widest text-ink-tertiary font-semibold">Débito</th>
          <th className="text-right py-2 px-4 text-[10px] uppercase tracking-widest text-ink-tertiary font-semibold">Crédito</th>
        </tr>
      </thead>
      <tbody>
        {accountingPreview.lines.map((line: any, idx: number) => (
          <tr
            key={idx}
            className={`border-b border-edge-subtle last:border-0 ${line.line_details ? 'cursor-pointer hover:bg-blue/5 transition-colors' : ''}`}
            onClick={() => {
              if (line.line_details) {
                setDrawerLine(line)
                setDrawerOpen(true)
              }
            }}
          >
            <td className="py-2.5 px-4">
              {line.configured ? (
                <div className="flex items-center gap-2">
                  <span className="font-mono text-ink-primary">{line.code}</span>
                  <span className="text-ink-secondary">{line.name}</span>
                  {line.line_details && (
                    <span className="w-1.5 h-1.5 rounded-full bg-blue shrink-0" />
                  )}
                </div>
              ) : (
                <span className="text-amber-600 dark:text-amber-400">{line.name}</span>
              )}
            </td>
            <td className="py-2.5 px-4 text-ink-tertiary">{line.description}</td>
            <td className="py-2.5 px-4 text-right tabular-nums text-ink-primary">{line.type === 'DEBIT' ? fmtMoney(line.amount) : '—'}</td>
            <td className="py-2.5 px-4 text-right tabular-nums text-ink-primary">{line.type === 'CREDIT' ? fmtMoney(line.amount) : '—'}</td>
          </tr>
        ))}
        <tr className="border-t-2 border-edge bg-surface-raised">
          <td colSpan={2} className="py-2 px-4 text-xs font-semibold text-ink-secondary">Totales</td>
          <td className="py-2 px-4 text-right tabular-nums font-bold text-ink-primary">{fmtMoney(accountingPreview.total_debit)}</td>
          <td className="py-2 px-4 text-right tabular-nums font-bold text-ink-primary">{fmtMoney(accountingPreview.total_credit)}</td>
        </tr>
      </tbody>
    </table>
  </div>
)}

        {/* Info post-contabilización */}
        {purchase.status === 'REGISTERED' && (
          <div className="card rounded-xl p-3 flex items-start gap-2 bg-blue-muted/40 border-blue/20">
            <Info className="w-4 h-4 text-blue mt-0.5 flex-shrink-0" />
            <div className="text-[11px] text-ink-secondary leading-relaxed">
              <strong className="text-ink-primary">Compra contabilizada.</strong>{' '}
              Esta compra ya aparece en el ATS y Form 104 del período {fmtDate(purchase.issue_date)}.
              Cuando le pagues al proveedor, usá el botón <strong>Pagar</strong> arriba —
              se generará automáticamente el movimiento bancario.
            </div>
          </div>
        )}

        {/* Info post-pago */}
        {purchase.status === 'PAID' && (
          <div className="card rounded-xl p-3 flex items-start gap-2 bg-emerald-500/5 border-emerald-500/20">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
            <div className="text-[11px] text-ink-secondary leading-relaxed">
              <strong className="text-emerald-700 dark:text-emerald-400">Compra pagada.</strong>{' '}
              El movimiento bancario fue registrado. Podés verlo en Banco {'→'} Movimientos.
            </div>
          </div>
        )}
      </div>

      {/* Modal de confirmación */}
      {confirm && (
        <ConfirmModal
          title={confirm.title}
          body={confirm.body}
          confirmLabel={confirm.action === 'annul' ? 'Anular' : 'Eliminar'}
          variant={confirm.action === 'annul' ? 'warning' : 'danger'}
          onCancel={() => setConfirm(null)}
          onConfirm={confirm.action === 'annul' ? handleAnnul : handleDelete}
        />
      )}

      {/* Modal de pago */}
      {payModalOpen && purchase && (
        <PayPurchaseModal
          purchase={purchase}
          bankAccounts={bankAccounts}
          onClose={() => setPayModalOpen(false)}
          onPaid={(updated) => {
            setPurchase(updated)
            setPayModalOpen(false)
          }}
        />
      )}

      {/* Drawer trazabilidad */}
{drawerOpen && drawerLine && (
  <>
    <div className="fixed inset-0 z-40 bg-black/20" onClick={() => setDrawerOpen(false)} />
    <div className="fixed right-0 top-0 h-full w-full max-w-sm z-50 bg-surface border-l border-edge shadow-2xl flex flex-col">
      <div className="flex items-center justify-between p-5 border-b border-edge-subtle">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-ink-tertiary font-semibold">Origen de la cuenta</p>
          <p className="text-sm font-bold text-ink-primary mt-0.5">
            <span className="font-mono">{drawerLine.code}</span>
            <span className="ml-2 text-ink-secondary font-normal">{drawerLine.name}</span>
          </p>
        </div>
        <button onClick={() => setDrawerOpen(false)} className="text-ink-tertiary hover:text-ink-primary">
          <XCircle className="w-5 h-5" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        <p className="text-xs text-ink-tertiary">
          Esta cuenta recibe <span className="font-semibold text-ink-primary">{fmtMoney(drawerLine.amount)}</span> — desglose por línea:
        </p>
        {drawerLine.line_details?.map((detail: any, idx: number) => (
          <div key={idx} className="card rounded-xl p-4 space-y-3">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-ink-tertiary font-semibold mb-1">Línea del documento</p>
              <p className="text-sm font-medium text-ink-primary">{detail.description}</p>
              <p className="text-xs text-ink-tertiary mt-0.5 font-mono">{fmtMoney(detail.amount)}</p>
            </div>
            <div className="border-t border-edge-subtle pt-3">
              <p className="text-[10px] uppercase tracking-widest text-ink-tertiary font-semibold mb-2">Origen contable</p>
              {detail.origin === 'cuenta_directa' && (
                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center gap-2 text-ink-secondary">
                    <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                    Sin producto del catálogo
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue shrink-0" />
                    <span className="text-ink-secondary">Cuenta directa:</span>
                    <span className="font-mono font-semibold text-ink-primary">{detail.direct_account_code} — {detail.direct_account_name}</span>
                  </div>
                </div>
              )}
              {detail.origin === 'categoria' && (
                <div className="space-y-1.5 text-xs">
                  {detail.product_code && (
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                      <span className="text-ink-secondary">Producto:</span>
                      <span className="font-mono font-semibold text-ink-primary">{detail.product_code}</span>
                      <span className="text-ink-tertiary">{detail.product_name}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 ml-4">
                    <span className="text-ink-tertiary text-[10px]">↓ Categoría</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-purple-400 shrink-0" />
                    <span className="text-ink-secondary">Categoría:</span>
                    <span className="font-mono font-semibold text-ink-primary">{detail.category_code}</span>
                    <span className="text-ink-tertiary">{detail.category_name}</span>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <span className="text-ink-tertiary text-[10px]">↓ Cuenta</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue shrink-0" />
                    <span className="text-ink-secondary">Cuenta:</span>
                    <span className="font-mono font-semibold text-ink-primary">{drawerLine.code} — {drawerLine.name}</span>
                  </div>
                </div>
              )}
              {detail.origin === 'fallback' && (
                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center gap-2 text-ink-secondary">
                    <span className="w-2 h-2 rounded-full bg-edge shrink-0" />
                    Sin producto ni cuenta directa
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                    <span className="text-ink-secondary">Cuenta por defecto del mapeo contable</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  </>
)}
    </DashboardLayout>
  )
}

// ─────────────────────────────────────────────────────────────────
// Subcomponentes
// ─────────────────────────────────────────────────────────────────

function StatusPill({ status }: { status: Purchase['status'] }) {
  const config: Record<Purchase['status'], { bg: string; text: string; label: string }> = {
    DRAFT: {
      bg: 'bg-amber-500/10',
      text: 'text-amber-600 dark:text-amber-400',
      label: PURCHASE_STATUS_LABELS.DRAFT,
    },
    REGISTERED: {
      bg: 'bg-emerald-500/10',
      text: 'text-emerald-600 dark:text-emerald-400',
      label: PURCHASE_STATUS_LABELS.REGISTERED,
    },
    PAID: {
      bg: 'bg-blue-muted',
      text: 'text-blue',
      label: PURCHASE_STATUS_LABELS.PAID,
    },
    ANNULLED: {
      bg: 'bg-edge-subtle',
      text: 'text-ink-tertiary line-through',
      label: PURCHASE_STATUS_LABELS.ANNULLED,
    },
  }
  const c = config[status]
  return (
    <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-bold ${c.bg} ${c.text}`}>
      {c.label}
    </span>
  )
}

function TotalRow({
  label, value, bold, subtle, retention,
}: { label: string; value: string; bold?: boolean; subtle?: boolean; retention?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <dt className={`${subtle ? 'text-xs text-ink-tertiary' : retention ? 'text-xs text-amber-600 dark:text-amber-400 font-medium' : bold ? 'text-sm font-semibold text-ink-primary' : 'text-sm text-ink-secondary'}`}>
        {label}
      </dt>
      <dd className={`font-mono ${bold ? 'text-base font-bold text-ink-primary' : retention ? 'text-sm font-semibold text-amber-600 dark:text-amber-400' : subtle ? 'text-xs text-ink-tertiary' : 'text-sm text-ink-primary'}`}>
        {value}
      </dd>
    </div>
  )
}

function ConfirmModal({
  title, body, confirmLabel, variant, onCancel, onConfirm,
}: {
  title: string
  body: string
  confirmLabel: string
  variant: 'warning' | 'danger'
  onCancel: () => void
  onConfirm: () => void
}) {
  const variantClasses =
    variant === 'danger'
      ? 'bg-red-500 hover:bg-red-600 text-white'
      : 'bg-amber-500 hover:bg-amber-600 text-white'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        className="card-raised rounded-2xl p-6 max-w-md w-full shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-base font-semibold text-ink-primary mb-2">{title}</h3>
        <p className="text-sm text-ink-secondary leading-relaxed mb-5">{body}</p>
        <div className="flex items-center justify-end gap-2">
          <button onClick={onCancel} className="btn btn-ghost">
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className={`btn ${variantClasses} px-4 py-2 rounded-lg font-medium text-sm transition-all`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// API call para cuentas bancarias
// ─────────────────────────────────────────────────────────────────

/**
 * Fetch lista de cuentas bancarias del tenant.
 *
 * Usa el mismo patrón de auth del resto del frontend (token en localStorage).
 * Si el endpoint de banco cambia, ajustar la URL acá.
 */
async function fetchBankAccounts(): Promise<BankAccountLite[]> {
  const API_URL =
    process.env.NEXT_PUBLIC_API_URL ||
    'https://d16rb4jhhui7p6.cloudfront.net/api/v1'

  const res = await fetch(`${API_URL}/bank/accounts`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
  })

  if (!res.ok) {
    throw new Error(`Error ${res.status} al cargar cuentas`)
  }

  const body = await res.json()
  // Backend wraps response: { success, data, timestamp }
  const data = body?.data ?? body
  // Algunos endpoints devuelven { data: [...], pagination } — manejar ambos casos
  const list = Array.isArray(data) ? data : data?.data ?? []
  return list as BankAccountLite[]
}
