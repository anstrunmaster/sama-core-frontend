'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ChevronLeft, AlertCircle, X, Loader2, CheckCircle2, AlertTriangle,
  Mail, FileText, Lock, ThumbsUp, ThumbsDown, Trash2,
} from 'lucide-react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { quotationsApi } from '../api-cotizaciones'
import {
  type Quotation, type QuotationPaymentTerm, type QuotationAdditionalInfo,
  STATUS_CONFIG, fmtMoney, fmtDate, PAYMENT_METHODS,
} from '../types-cotizaciones'

export default function CotizacionDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [data,           setData]           = useState<Quotation | null>(null)
  const [loading,        setLoading]        = useState(true)
  const [error,          setError]          = useState('')
  const [success,        setSuccess]        = useState('')
  const [actionBusy,     setActionBusy]     = useState<string | null>(null)
  const [confirmConvert, setConfirmConvert] = useState(false)
  const [confirmDelete,  setConfirmDelete]  = useState(false)

  async function load() {
    setLoading(true)
    try {
      setData(await quotationsApi.get(id))
    } catch (e: any) {
      setError(e.message || 'No se pudo cargar la cotización')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [id])

  async function doAction(key: string, fn: () => Promise<any>, msg?: string) {
    setActionBusy(key)
    setError('')
    setSuccess('')
    try {
      await fn()
      await load()
      if (msg) { setSuccess(msg); setTimeout(() => setSuccess(''), 4000) }
    } catch (e: any) {
      setError(e.message || 'Error al ejecutar acción')
    } finally {
      setActionBusy(null)
    }
  }

  async function handleConvert() {
    setConfirmConvert(false)
    setActionBusy('convert')
    setError('')
    try {
      const result = await quotationsApi.convert(id)
      await load()
      setSuccess(`Factura emitida · Clave: ${result.access_key}`)
    } catch (e: any) {
      setError(e.message || 'Error al convertir')
    } finally {
      setActionBusy(null)
    }
  }

  async function handleDelete() {
    setConfirmDelete(false)
    await doAction('delete', () => quotationsApi.delete(id))
    router.push('/cotizaciones')
  }

  if (loading) return (
    <DashboardLayout>
      <div className="p-6">
        <div className="card py-16 text-center">
          <Loader2 className="w-6 h-6 text-blue-600 dark:text-blue-400 animate-spin mx-auto mb-3" />
          <p className="text-sm text-ink-tertiary">Cargando...</p>
        </div>
      </div>
    </DashboardLayout>
  )

  if (!data) return (
    <DashboardLayout>
      <div className="p-6">
        <div className="card py-16 text-center">
          <AlertCircle className="w-10 h-10 text-ink-ghost mx-auto mb-3" />
          <p className="text-sm text-ink-tertiary">{error || 'Cotización no encontrada'}</p>
        </div>
      </div>
    </DashboardLayout>
  )

  const sc         = STATUS_CONFIG[data.status]
  const items      = data.items as any[]
  const canConvert = ['DRAFT', 'APPROVED'].includes(data.status)
  const canDelete  = data.status === 'DRAFT'

  const paymentTerms: QuotationPaymentTerm[] = Array.isArray(data.payment_terms)
    ? data.payment_terms
    : data.payment_method
      ? [{ medio: data.payment_method, valor: parseFloat(data.total), plazo: '0', unidad_tiempo: 'dias' }]
      : []

  const additionalInfo: QuotationAdditionalInfo[] = Array.isArray(data.additional_info)
    ? data.additional_info : []

  const pmLabel = (medio: string) =>
    PAYMENT_METHODS.find(m => m.value === medio)?.label ?? medio

  return (
    <DashboardLayout>
      <div className="p-6 space-y-5 max-w-screen-xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="p-1.5 rounded-lg border border-edge text-ink-tertiary hover:text-ink-primary hover:border-edge-strong transition-all">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-ink-primary font-mono">{data.number}</h1>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${sc.classes}`}>
                  {sc.label}
                </span>
              </div>
              <p className="text-sm text-ink-tertiary mt-0.5">
                Creada el {fmtDate(data.created_at)}
                {data.valid_until && <> · Válida hasta {fmtDate(data.valid_until)}</>}
              </p>
            </div>
          </div>

          {/* Acciones */}
          <div className="flex items-center gap-2 flex-wrap">
            {data.status === 'DRAFT' && (
              <button
                onClick={() => doAction('sent', () => quotationsApi.changeStatus(id, 'SENT'), 'Marcada como enviada')}
                disabled={!!actionBusy}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 disabled:opacity-50 transition-all"
              >
                {actionBusy === 'sent' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
                Enviar por email
              </button>
            )}
            {data.status === 'SENT' && (
              <>
                <button onClick={() => doAction('approved', () => quotationsApi.changeStatus(id, 'APPROVED'), 'Aprobada')} disabled={!!actionBusy}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-500/10 border border-green-500/20 text-sm font-medium text-green-600 dark:text-green-400 hover:bg-green-500/20 disabled:opacity-50 transition-all">
                  {actionBusy === 'approved' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ThumbsUp className="w-3.5 h-3.5" />}
                  Aprobar
                </button>
                <button onClick={() => doAction('rejected', () => quotationsApi.changeStatus(id, 'REJECTED'), 'Rechazada')} disabled={!!actionBusy}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-500/20 disabled:opacity-50 transition-all">
                  {actionBusy === 'rejected' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ThumbsDown className="w-3.5 h-3.5" />}
                  Rechazar
                </button>
              </>
            )}
            {canConvert && (
              <button onClick={() => setConfirmConvert(true)} disabled={!!actionBusy}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue text-sm font-semibold text-white hover:bg-blue-hover disabled:opacity-50 transition-all">
                <Lock className="w-3.5 h-3.5" />
                Convertir a factura
              </button>
            )}
            {data.status === 'INVOICED' && data.invoice_access_key && (
              <Link href={`/facturas?search=${data.invoice_access_key}`}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-purple-500/10 border border-purple-500/20 text-sm font-medium text-purple-600 dark:text-purple-400 hover:bg-purple-500/20 transition-all">
                <FileText className="w-3.5 h-3.5" />
                Ver factura emitida
              </Link>
            )}
            {canDelete && (
              <button onClick={() => setConfirmDelete(true)} disabled={!!actionBusy}
                className="p-2 rounded-lg border border-edge text-ink-tertiary hover:text-red-600 dark:hover:text-red-400 hover:border-red-500/20 hover:bg-red-500/10 transition-all">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Mensajes */}
        {error && (
          <div className="flex items-center justify-between px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-600 dark:text-red-400">
            <div className="flex items-center gap-2"><AlertCircle className="w-4 h-4 shrink-0" /><span>{error}</span></div>
            <button onClick={() => setError('')} className="text-red-600/60 hover:text-red-600 transition-colors"><X className="w-3.5 h-3.5" /></button>
          </div>
        )}
        {success && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-green-500/10 border border-green-500/20 text-sm text-green-600 dark:text-green-400">
            <CheckCircle2 className="w-4 h-4 shrink-0" /><span>{success}</span>
          </div>
        )}

        {/* ── DATOS DEL CLIENTE ─────────────────────────────────────────────── */}
        <div className="card p-5">
          <h2 className="text-[10px] font-semibold uppercase tracking-widest text-ink-tertiary mb-4">Cliente</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <InfoField label="Razón social" value={data.buyer_name} />
            <InfoField label="Identificación" value={data.buyer_id} mono />
            <InfoField label="Tipo de ID" value={data.buyer_id_type} />
            <InfoField label="Email" value={data.buyer_email} />
            <InfoField label="Teléfono" value={data.buyer_phone} />
            <InfoField label="Ciudad" value={data.buyer_city} />
            <div className="md:col-span-2">
              <InfoField label="Dirección" value={data.buyer_address_branch || data.buyer_address} />
              {data.buyer_address_branch && data.buyer_address && (
                <p className="text-[10px] text-ink-ghost mt-0.5">Sucursal seleccionada</p>
              )}
            </div>
          </div>
        </div>

        {/* ── CONDICIONES COMERCIALES ───────────────────────────────────────── */}
        {(data.issue_date || data.due_date || data.credit_days || data.seller || data.valid_until) && (
          <div className="card p-5">
            <h2 className="text-[10px] font-semibold uppercase tracking-widest text-ink-tertiary mb-4">Condiciones comerciales</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {data.issue_date   && <InfoField label="Fecha de emisión"     value={fmtDate(data.issue_date)} />}
              {data.due_date     && <InfoField label="Fecha de vencimiento" value={fmtDate(data.due_date)} />}
              {data.credit_days  && <InfoField label="Días de crédito"      value={`${data.credit_days} días`} />}
              {data.seller       && <InfoField label="Vendedor"             value={data.seller} />}
              {data.valid_until  && <InfoField label="Válida hasta"         value={fmtDate(data.valid_until)} />}
            </div>
            {data.notes && (
              <div className="mt-3 pt-3 border-t border-edge-subtle">
                <p className="text-[10px] uppercase tracking-widest text-ink-tertiary font-semibold mb-1">Notas</p>
                <p className="text-sm text-ink-secondary">{data.notes}</p>
              </div>
            )}
          </div>
        )}

        {/* ── DETALLE DE ÍTEMS ──────────────────────────────────────────────── */}
        <div className="card overflow-hidden">
          <div className="px-5 py-3 border-b border-edge-subtle bg-surface-raised">
            <h2 className="text-[10px] font-semibold uppercase tracking-widest text-ink-tertiary">Detalle</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-surface-raised">
                <tr className="border-b border-edge-subtle">
                  {['Código', 'Descripción', 'Cant.', 'P. Unit.', 'Desc.', 'IVA', 'Total'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-ink-tertiary">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((item: any, i: number) => {
                  const tax    = item.impuestos?.[0]
                  const tarifa = parseInt(tax?.tarifa ?? '0')
                  const base   = item.cantidad * item.precioUnitario - item.descuento
                  const ivaVal = base * (tarifa / 100)
                  const sub    = base + ivaVal
                  return (
                    <tr key={i} className="border-b border-edge-subtle last:border-0">
                      <td className="px-4 py-3 font-mono text-xs text-ink-tertiary">{item.codigoPrincipal || '—'}</td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-ink-primary">{item.descripcion}</p>
                        {item.detallesAdicionales && (
                          <p className="text-[11px] text-ink-tertiary mt-0.5">{item.detallesAdicionales}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-ink-secondary tabular-nums">{item.cantidad}</td>
                      <td className="px-4 py-3 font-mono text-sm text-ink-primary tabular-nums">{fmtMoney(item.precioUnitario)}</td>
                      <td className="px-4 py-3 font-mono text-sm text-ink-secondary tabular-nums">
                        {item.descuento > 0 ? fmtMoney(item.descuento) : <span className="text-ink-ghost">—</span>}
                      </td>
                      <td className="px-4 py-3 text-sm text-ink-tertiary">{tarifa}%</td>
                      <td className="px-4 py-3 font-mono text-sm font-semibold text-ink-primary tabular-nums">{fmtMoney(sub)}</td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot className="bg-edge-subtle/50">
                <tr>
                  <td colSpan={6} className="px-4 py-2.5 text-right text-[10px] font-semibold uppercase tracking-widest text-ink-tertiary">Subtotal sin impuestos</td>
                  <td className="px-4 py-2.5 font-mono text-sm text-ink-primary tabular-nums">{fmtMoney(data.subtotal)}</td>
                </tr>
                {parseFloat(data.discount_total) > 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-2 text-right text-[10px] font-semibold uppercase tracking-widest text-ink-tertiary">Descuento</td>
                    <td className="px-4 py-2 font-mono text-sm text-red-600 dark:text-red-400 tabular-nums">-{fmtMoney(data.discount_total)}</td>
                  </tr>
                )}
                <tr>
                  <td colSpan={6} className="px-4 py-2 text-right text-[10px] font-semibold uppercase tracking-widest text-ink-tertiary">IVA</td>
                  <td className="px-4 py-2 font-mono text-sm text-ink-primary tabular-nums">{fmtMoney(data.tax_total)}</td>
                </tr>
                <tr>
                  <td colSpan={6} className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-widest text-ink-primary">Total</td>
                  <td className="px-4 py-3 font-mono text-base font-bold text-ink-primary tabular-nums">{fmtMoney(data.total)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* ── FORMAS DE PAGO ────────────────────────────────────────────────── */}
        {paymentTerms.length > 0 && (
          <div className="card p-5">
            <h2 className="text-[10px] font-semibold uppercase tracking-widest text-ink-tertiary mb-4">Formas de pago</h2>
            <div className="divide-y divide-edge-subtle">
              {paymentTerms.map((p, i) => (
                <div key={i} className="flex items-center justify-between py-2.5 text-sm">
                  <div>
                    <span className="text-ink-primary font-medium">{pmLabel(p.medio)}</span>
                    {p.plazo && p.plazo !== '0' && (
                      <span className="text-ink-tertiary text-xs ml-2">· {p.plazo} {p.unidad_tiempo ?? 'días'}</span>
                    )}
                  </div>
                  <span className="font-mono font-semibold text-ink-primary">{fmtMoney(p.valor)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── INFORMACIÓN ADICIONAL ─────────────────────────────────────────── */}
        {additionalInfo.length > 0 && (
          <div className="card p-5">
            <h2 className="text-[10px] font-semibold uppercase tracking-widest text-ink-tertiary mb-4">Información adicional</h2>
            <div className="divide-y divide-edge-subtle">
              {additionalInfo.map((ai, i) => (
                <div key={i} className="flex items-center justify-between py-2.5 text-sm">
                  <span className="text-ink-tertiary">{ai.label}</span>
                  <span className="text-ink-primary font-medium">{ai.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* Modal: Confirmar conversión */}
      {confirmConvert && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="card-raised w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-start gap-4 mb-5">
              <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
                <Lock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-ink-primary">Convertir a factura electrónica</h3>
                <p className="text-sm text-ink-tertiary mt-1">Esta acción emite la factura al SRI y consume el secuencial. No se puede deshacer.</p>
              </div>
            </div>
            <div className="bg-edge-subtle border border-edge-subtle rounded-lg p-3 mb-5 space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-ink-tertiary">Cotización</span>
                <span className="font-mono font-semibold text-ink-primary">{data.number}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-ink-tertiary">Cliente</span>
                <span className="text-ink-secondary">{data.buyer_name || '—'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-ink-tertiary">Total</span>
                <span className="font-mono font-bold text-ink-primary">{fmtMoney(data.total)}</span>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setConfirmConvert(false)} disabled={actionBusy === 'convert'}
                className="flex-1 py-2.5 rounded-lg border border-edge text-sm text-ink-secondary hover:text-ink-primary disabled:opacity-50 transition-all">
                Cancelar
              </button>
              <button onClick={handleConvert} disabled={actionBusy === 'convert'}
                className="flex-1 py-2.5 rounded-lg bg-blue text-sm font-semibold text-white hover:bg-blue-hover disabled:opacity-50 transition-all flex items-center justify-center gap-2">
                {actionBusy === 'convert' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Lock className="w-3.5 h-3.5" />}
                Emitir factura
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Confirmar borrado */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="card-raised w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-start gap-4 mb-5">
              <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-ink-primary">Eliminar cotización</h3>
                <p className="text-sm text-ink-tertiary mt-1">Esta acción no se puede deshacer.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(false)}
                className="flex-1 py-2.5 rounded-lg border border-edge text-sm text-ink-secondary hover:text-ink-primary transition-all">
                Cancelar
              </button>
              <button onClick={handleDelete} disabled={actionBusy === 'delete'}
                className="flex-1 py-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-sm font-semibold text-red-600 dark:text-red-400 hover:bg-red-500/20 disabled:opacity-50 transition-all">
                Confirmar eliminación
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}

function InfoField({ label, value, mono }: {
  label: string
  value: string | number | null | undefined
  mono?: boolean
}) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-widest text-ink-tertiary font-semibold mb-1">{label}</p>
      <p className={`text-sm text-ink-primary ${mono ? 'font-mono' : ''}`}>
        {value ?? <span className="text-ink-ghost">—</span>}
      </p>
    </div>
  )
}
