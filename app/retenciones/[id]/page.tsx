'use client'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ChevronLeft, FileSignature, Send, CheckCircle2, FileText, Loader2, Ban, AlertTriangle,
  RefreshCw, X,
} from 'lucide-react'
import { StatusBadge } from '@/components/withholdings/StatusBadge'
import type { Withholding } from '@/types/withholding'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://d16rb4jhhui7p6.cloudfront.net/api/v1'

function getToken(): string {
  return localStorage.getItem('_at') || localStorage.getItem('accessToken') || ''
}

function num(v: any): number {
  if (typeof v === 'number') return v
  if (typeof v === 'string') return parseFloat(v)
  if (typeof v?.toNumber === 'function') return v.toNumber()
  return 0
}
function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  // Si es solo fecha YYYY-MM-DD, parsear directamente sin timezone
  const dateOnly = iso.slice(0, 10)
  const [year, month, day] = dateOnly.split('-')
  return `${day}/${month}/${year}`
}
function fmtMoney(v: any): string {
  return num(v).toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

async function postAction(id: string, action: string): Promise<Withholding> {
  const res = await fetch(`${API_URL}/withholdings/${id}/${action}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
  })
  const data = await res.json()
  if (!res.ok) throw new Error((Array.isArray(data.message) ? data.message[0] : data.message) || 'Error')
  return data.data ?? data
}

async function voidAction(id: string, reason: string): Promise<Withholding> {
  const res = await fetch(`${API_URL}/withholdings/${id}/void`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
    body: JSON.stringify({ reason }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error((Array.isArray(data.message) ? data.message[0] : data.message) || 'Error')
  return data.data ?? data
}

export default function WithholdingDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const id = params?.id as string

  const [doc, setDoc] = useState<Withholding | null>(null)
  const [loading, setLoading] = useState(true)
  const [action, setAction] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [showVoid, setShowVoid] = useState(false)
  const [voidReason, setVoidReason] = useState('')

  const refresh = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${API_URL}/withholdings/${id}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'No se pudo cargar')
      setDoc(data.data ?? data)
    } catch (e: any) {
      setError(e?.message || 'Error cargando retención')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { if (id) refresh() }, [id, refresh])

  const run = async (fn: () => Promise<Withholding>, name: string) => {
    setAction(name)
    setError('')
    try {
      setDoc(await fn())
    } catch (e: any) {
      setError(e?.message || 'Error en la operación')
    } finally {
      setAction(null)
    }
  }

  if (loading && !doc) {
    return (
      <DashboardLayout>
        <div className="p-6 flex items-center justify-center min-h-[400px]">
          <RefreshCw className="w-5 h-5 animate-spin text-ink-tertiary" />
        </div>
      </DashboardLayout>
    )
  }
  if (!doc) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <p className="text-sm text-ink-tertiary">Retención no encontrada.</p>
        </div>
      </DashboardLayout>
    )
  }

  const canSign = doc.status === 'DRAFT'
  const canSend = doc.status === 'SIGNED'
  const canAuthorize = doc.status === 'SENT' || doc.status === 'REJECTED'
  const canProcess = doc.status === 'DRAFT'
  const canVoid = doc.status === 'AUTHORIZED'

  return (
    <DashboardLayout>
      <div className="p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/retenciones')}
              className="p-1.5 rounded-lg border border-edge text-ink-tertiary hover:text-ink-primary hover:border-edge-strong transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-lg font-bold text-ink-primary font-mono">{doc.document_number}</h1>
                <StatusBadge status={doc.status} />
              </div>
              <p className="text-sm text-ink-tertiary mt-0.5">
                Interno: <span className="font-mono">{doc.internal_number}</span> · Emitido {fmtDate(doc.issue_date)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={refresh}
              className="p-2 rounded-lg bg-edge-subtle border border-edge text-ink-secondary hover:text-ink-primary transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
{doc.status === 'AUTHORIZED' && (
  <button
    onClick={async () => {
      try {
        const res = await fetch(`${API_URL}/withholdings/${doc.id}/ride.pdf`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        })
        if (!res.ok) throw new Error('Error al descargar el RIDE')
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        window.open(url, '_blank')
        setTimeout(() => URL.revokeObjectURL(url), 10000)
      } catch (e: any) {
        setError(e.message || 'Error al descargar el RIDE')
      }
    }}
    className="flex items-center gap-2 px-4 py-2 rounded-lg border border-edge text-ink-secondary hover:text-ink-primary text-sm font-semibold transition-all"
  >
    <FileText className="w-4 h-4" /> Ver RIDE
  </button>
)}
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-3 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-600 dark:text-red-400">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Acciones SRI */}
        <div className="card rounded-xl p-4">
          <p className="text-[11px] text-ink-tertiary uppercase tracking-widest mb-3">Acciones SRI</p>
          <div className="flex flex-wrap gap-2">
            <button
              disabled={!canProcess || action !== null}
              onClick={() => run(() => postAction(doc.id, 'process'), 'process')}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue hover:bg-blue-hover disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold transition-all"
            >
              {action === 'process' ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Procesar (firma + envío + autorización)
            </button>
            <button
              disabled={!canSign || action !== null}
              onClick={() => run(() => postAction(doc.id, 'sign'), 'sign')}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-edge text-ink-secondary hover:text-ink-primary disabled:opacity-40 disabled:cursor-not-allowed text-sm font-semibold transition-all"
            >
              {action === 'sign' ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSignature className="w-4 h-4" />}
              Solo firmar
            </button>
            <button
              disabled={!canSend || action !== null}
              onClick={() => run(() => postAction(doc.id, 'send'), 'send')}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-edge text-ink-secondary hover:text-ink-primary disabled:opacity-40 disabled:cursor-not-allowed text-sm font-semibold transition-all"
            >
              {action === 'send' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Solo enviar
            </button>
            <button
              disabled={!canAuthorize || action !== null}
              onClick={() => run(() => postAction(doc.id, 'authorize'), 'authorize')}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-edge text-ink-secondary hover:text-ink-primary disabled:opacity-40 disabled:cursor-not-allowed text-sm font-semibold transition-all"
            >
              {action === 'authorize' ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Consultar autorización
            </button>
            {canVoid && (
              <button
                onClick={() => setShowVoid(true)}
                className="ml-auto flex items-center gap-2 px-4 py-2 rounded-lg border border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-500/10 text-sm font-semibold transition-all"
              >
                <Ban className="w-4 h-4" /> Anular
              </button>
            )}
          </div>
        </div>

        {/* Modal anular */}
        {showVoid && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="card-raised w-full max-w-md mx-4 p-6 shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-ink-primary">Anular retención</h3>
                <button onClick={() => { setShowVoid(false); setVoidReason('') }} className="text-ink-tertiary hover:text-ink-primary">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-xs text-ink-tertiary mb-4">
                Esta acción marca la retención como anulada y emite un evento para reversar el asiento contable. Es irreversible.
              </p>
              <label className="block text-xs font-medium text-ink-secondary mb-1.5">Motivo (mín. 5 caracteres)</label>
              <textarea
                className="field min-h-[80px] mb-4"
                placeholder="Ej: error en la base imponible"
                value={voidReason}
                onChange={(e) => setVoidReason(e.target.value)}
              />
              <div className="flex gap-3">
                <button
                  onClick={() => { setShowVoid(false); setVoidReason('') }}
                  className="flex-1 py-2.5 rounded-lg border border-edge text-sm text-ink-secondary hover:text-ink-primary transition-all"
                >
                  Cancelar
                </button>
                <button
                  disabled={voidReason.trim().length < 5 || action !== null}
                  onClick={async () => {
                    await run(() => voidAction(doc.id, voidReason.trim()), 'void')
                    setShowVoid(false)
                    setVoidReason('')
                  }}
                  className="flex-1 py-2.5 rounded-lg bg-red-500 hover:bg-red-600 disabled:opacity-50 text-sm font-semibold text-white transition-all"
                >
                  Confirmar anulación
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Datos */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="card rounded-xl p-4">
            <p className="text-[11px] text-ink-tertiary uppercase tracking-widest mb-3">Documento sustento</p>
            <dl className="space-y-2 text-sm">
              <Row label="Tipo">{doc.support_doc_type}</Row>
              <Row label="Número"><span className="font-mono text-xs">{doc.support_doc_number}</span></Row>
              <Row label="Autorización"><span className="font-mono text-[11px] break-all">{doc.support_doc_authorization ?? '—'}</span></Row>
              <Row label="Fecha emisión">{fmtDate(doc.support_doc_date)}</Row>
              <Row label="Total">${fmtMoney(doc.support_doc_total)}</Row>
              <Row label="Fecha pago">{fmtDate(doc.payment_date)}</Row>
              <Row label="Período fiscal">{doc.fiscal_period}</Row>
            </dl>
          </div>
          <div className="card rounded-xl p-4">
            <p className="text-[11px] text-ink-tertiary uppercase tracking-widest mb-3">Estado SRI</p>
            <dl className="space-y-2 text-sm">
              <Row label="Clave acceso"><span className="font-mono text-[11px] break-all">{doc.access_key ?? '—'}</span></Row>
              <Row label="Autorización"><span className="font-mono text-[11px] break-all">{doc.authorization_number ?? '—'}</span></Row>
              <Row label="Mensaje SRI">{doc.sri_status ?? '—'}</Row>
              <Row label="Firmado">{fmtDate(doc.signed_at)}</Row>
              <Row label="Enviado">{fmtDate(doc.sent_at)}</Row>
              <Row label="Autorizado">{fmtDate(doc.authorized_at)}</Row>
            </dl>
            {Array.isArray(doc.sri_messages) && doc.sri_messages.length > 0 && (
              <div className="mt-3 p-3 bg-edge-subtle rounded-lg text-[11px] space-y-1">
                {doc.sri_messages.map((m: any, i: number) => (
                  <div key={i}>
                    <span className="font-semibold text-ink-secondary">{m.identificador ?? m.tipo ?? '·'}:</span>{' '}
                    <span className="text-ink-tertiary">{m.mensaje ?? JSON.stringify(m)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Líneas */}
        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b border-edge-subtle">
            <p className="text-[11px] text-ink-tertiary uppercase tracking-widest">Retenciones aplicadas</p>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-edge-subtle">
                {['Tipo', 'Concepto', 'Base', '%', 'Retenido'].map((h, i) => (
                  <th
                    key={h}
                    className={`px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-ink-tertiary ${i >= 2 ? 'text-right' : 'text-left'}`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {doc.lines.map((l) => (
                <tr key={l.id} className="border-b border-edge-subtle">
                  <td className="px-4 py-3.5">
                    <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold border bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20">
                      {l.tax_type}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="font-mono text-[11px] text-ink-tertiary">{l.concept_code}</span>
                    <span className="ml-2 text-sm text-ink-secondary">{l.concept_name}</span>
                  </td>
                  <td className="px-4 py-3.5 text-right text-sm text-ink-secondary">${fmtMoney(l.base_amount)}</td>
                  <td className="px-4 py-3.5 text-right text-sm text-ink-secondary">{num(l.percentage).toFixed(2)}%</td>
                  <td className="px-4 py-3.5 text-right text-sm font-semibold text-ink-primary">${fmtMoney(l.withheld_amount)}</td>
                </tr>
              ))}
              <tr>
                <td colSpan={4} className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-widest text-ink-tertiary">
                  Total retenido:
                </td>
                <td className="px-4 py-3 text-right text-base font-bold text-ink-primary">${fmtMoney(doc.total_withheld)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between items-start gap-3">
      <dt className="text-[11px] text-ink-tertiary uppercase tracking-wide shrink-0">{label}</dt>
      <dd className="text-ink-secondary text-right">{children}</dd>
    </div>
  )
}
