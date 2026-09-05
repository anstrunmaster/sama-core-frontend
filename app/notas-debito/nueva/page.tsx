'use client'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  ChevronLeft, Search, Plus, Trash2, Send, CheckCircle2, AlertCircle, RefreshCw
} from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://d16rb4jhhui7p6.cloudfront.net/api/v1'

interface InvoiceOption {
  id: string; sequential: string; establishment: string
  emission_point: string; access_key: string; invoice_data: any; created_at: string
}
interface Motivo { key: string; razon: string; valor: number }

function getToken(): string {
  return localStorage.getItem('_at') || localStorage.getItem('accessToken') || ''
}
function getUser(): any {
  try {
    const s = localStorage.getItem('saas_auth')
    if (s) { const p = JSON.parse(s); return p.state?.user ?? p.user ?? p }
    return JSON.parse(localStorage.getItem('user') || '{}')
  } catch { return {} }
}
function getInvoiceLabel(inv: InvoiceOption) {
  return `${inv.establishment}-${inv.emission_point}-${inv.sequential}`
}

export default function NuevoNotaDebitoPage() {
  const router = useRouter()

  const [invoiceSearch, setInvoiceSearch]     = useState('')
  const [invoiceResults, setInvoiceResults]   = useState<InvoiceOption[]>([])
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceOption | null>(null)
  const [searching, setSearching]             = useState(false)
  const [taxRate, setTaxRate]                 = useState(15)
  const [nota, setNota]                       = useState('')
  const [motivos, setMotivos]                 = useState<Motivo[]>([{ key: crypto.randomUUID(), razon: '', valor: 0 }])
  const [loading, setLoading]                 = useState(false)
  const [result, setResult]                   = useState<{ ok: boolean; msg: string; seq?: string } | null>(null)

  const user     = getUser()
  const branchId = user.branchId

  const searchInvoices = async (q: string) => {
    if (!q || q.length < 3) { setInvoiceResults([]); return }
    setSearching(true)
    try {
      const res  = await fetch(`${API_URL}/invoices?branchId=${branchId}&page=1&limit=10`, {
        headers: { Authorization: `Bearer ${getToken()}` }
      })
      const data    = await res.json()
      const payload = data.data ?? data
      const all: InvoiceOption[] = Array.isArray(payload.data) ? payload.data : []
      setInvoiceResults(all.filter(inv =>
        inv.sri_status === 'AUTORIZADO' &&
        (`${inv.establishment}-${inv.emission_point}-${inv.sequential}`.includes(q) ||
         (inv.invoice_data?.razonSocialComprador || '').toLowerCase().includes(q.toLowerCase()))
      ).slice(0, 6))
    } catch {} finally { setSearching(false) }
  }

  useEffect(() => {
    const t = setTimeout(() => searchInvoices(invoiceSearch), 400)
    return () => clearTimeout(t)
  }, [invoiceSearch])

  const addMotivo    = () => setMotivos(p => [...p, { key: crypto.randomUUID(), razon: '', valor: 0 }])
  const removeMotivo = (key: string) => setMotivos(p => p.filter(m => m.key !== key))
  const updateMotivo = (key: string, field: keyof Motivo, value: any) =>
    setMotivos(p => p.map(m => m.key === key ? { ...m, [field]: value } : m))

  const totalBase = motivos.reduce((s, m) => s + m.valor, 0)
  const totalIva  = parseFloat((totalBase * taxRate / 100).toFixed(2))
  const total     = parseFloat((totalBase + totalIva).toFixed(2))

  const submit = async () => {
    if (!selectedInvoice) { setResult({ ok: false, msg: 'Selecciona la factura a modificar' }); return }
    if (motivos.some(m => !m.razon.trim() || m.valor <= 0)) {
      setResult({ ok: false, msg: 'Completa todos los motivos con razón y valor mayor a 0' }); return
    }
    setLoading(true); setResult(null)
    try {
      const res = await fetch(`${API_URL}/debit-notes`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({
          invoiceId: selectedInvoice.id,
          motivos:   motivos.map(m => ({ razon: m.razon.trim(), valor: m.valor })),
          taxRate,
          nota: nota.trim() || undefined,
        }),
      })
      const data    = await res.json()
      const payload = data.data ?? data
      if (payload.success) {
        setResult({ ok: true, msg: '¡Nota de débito autorizada por el SRI!', seq: payload.sequential })
        setTimeout(() => router.push('/notas-debito'), 2000)
      } else {
        setResult({ ok: false, msg: payload.error || payload.message || 'Error al emitir' })
      }
    } catch { setResult({ ok: false, msg: 'Error de conexión' }) }
    finally { setLoading(false) }
  }

  const inputClass = "w-full bg-surface border border-edge rounded-lg px-3 py-2.5 text-sm text-ink-primary placeholder-ink-ghost outline-none focus:border-blue/50 focus:ring-1 focus:ring-blue/20 transition-all"
  const labelClass = "block text-xs font-semibold uppercase tracking-wider text-ink-tertiary mb-2"

  return (
    <DashboardLayout>
      <div className="p-6 space-y-5 max-w-4xl mx-auto">

        {/* Header */}
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()}
            className="p-1.5 rounded-lg border border-edge text-ink-tertiary hover:text-ink-primary hover:border-edge-strong transition-all">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-ink-primary">Nueva Nota de Débito</h1>
            <p className="text-sm text-ink-tertiary mt-0.5">Emite cargos adicionales sobre una factura autorizada</p>
          </div>
        </div>

        {/* Result */}
        {result && (
          <div className={`flex items-start gap-3 px-4 py-3 rounded-lg border text-sm ${
            result.ok
              ? 'bg-green-500/10 border-green-500/20 text-green-600 dark:text-green-400'
              : 'bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400'
          }`}>
            {result.ok ? <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />}
            <div>
              <p>{result.msg}</p>
              {result.seq && <p className="text-xs mt-0.5 opacity-80">N° {result.seq}</p>}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-5">

            {/* Factura original */}
            <div className="card p-5">
              <h2 className="text-sm font-semibold text-ink-primary mb-4">Factura a modificar</h2>
              <div className="relative">
                <label className={labelClass}>Buscar factura autorizada</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-ghost pointer-events-none" />
                  <input value={invoiceSearch}
                    onChange={e => { setInvoiceSearch(e.target.value); setSelectedInvoice(null) }}
                    placeholder="Número de factura o nombre del cliente..."
                    className={`${inputClass} pl-9`} />
                  {searching && <RefreshCw className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-ghost animate-spin" />}
                </div>
                {invoiceResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 z-50 mt-1 card-raised shadow-xl overflow-hidden rounded-lg">
                    {invoiceResults.map(inv => (
                      <button key={inv.id} onClick={() => { setSelectedInvoice(inv); setInvoiceSearch(getInvoiceLabel(inv)); setInvoiceResults([]) }}
                        className="w-full flex items-center justify-between px-4 py-3 hover:bg-edge-subtle transition-colors text-left border-b border-edge-subtle last:border-0">
                        <div>
                          <div className="text-sm font-semibold text-ink-primary font-mono">{getInvoiceLabel(inv)}</div>
                          <div className="text-xs text-ink-tertiary">{inv.invoice_data?.razonSocialComprador || '—'}</div>
                        </div>
                        <div className="text-xs text-ink-tertiary">{new Date(inv.created_at).toLocaleDateString('es-EC')}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {selectedInvoice && (
                <div className="mt-3 p-3 rounded-lg bg-green-500/5 border border-green-500/20">
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                    <span className="font-semibold text-ink-primary font-mono">{getInvoiceLabel(selectedInvoice)}</span>
                    <span className="text-ink-tertiary">— {selectedInvoice.invoice_data?.razonSocialComprador || '—'}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Motivos */}
            <div className="card p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-ink-primary">Cargos adicionales</h2>
                <button onClick={addMotivo}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-edge-subtle border border-edge text-xs font-medium text-ink-secondary hover:text-ink-primary hover:border-edge-strong transition-all">
                  <Plus className="w-3.5 h-3.5" /> Agregar cargo
                </button>
              </div>

              <div className="space-y-3">
                {motivos.map(m => (
                  <div key={m.key} className="grid grid-cols-12 gap-2 items-center">
                    <input value={m.razon} onChange={e => updateMotivo(m.key, 'razon', e.target.value)}
                      placeholder="Razón del cargo (ej: Intereses por mora)"
                      className={`${inputClass} col-span-8`} />
                    <input type="number" min="0" step="0.01" value={m.valor}
                      onChange={e => updateMotivo(m.key, 'valor', Number(e.target.value))}
                      placeholder="0.00" className={`${inputClass} col-span-3 text-right`} />
                    <div className="col-span-1 flex justify-end">
                      {motivos.length > 1 && (
                        <button onClick={() => removeMotivo(m.key)}
                          className="p-1 rounded text-ink-ghost hover:text-red-500 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* IVA y nota */}
            <div className="card p-5 space-y-4">
              <div>
                <label className={labelClass}>Tarifa IVA sobre cargos</label>
                <div className="grid grid-cols-2 gap-2">
                  {[{ value: 0, label: 'IVA 0%' }, { value: 15, label: 'IVA 15%' }].map(o => (
                    <button key={o.value} onClick={() => setTaxRate(o.value)}
                      className={`py-2.5 rounded-lg text-xs font-medium transition-all border ${
                        taxRate === o.value
                          ? 'bg-blue/10 border-blue/30 text-blue'
                          : 'bg-edge-subtle border-edge text-ink-tertiary'
                      }`}>
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className={labelClass}>Nota adicional (opcional)</label>
                <textarea value={nota} onChange={e => setNota(e.target.value)}
                  rows={2} placeholder="Información adicional..."
                  className={`${inputClass} resize-none`} />
              </div>
            </div>
          </div>

          {/* Resumen */}
          <div>
            <div className="card p-5 sticky top-6">
              <h2 className="text-sm font-semibold text-ink-primary mb-5">Resumen</h2>
              <div className="space-y-3 mb-5 pb-4 border-b border-edge-subtle">
                <div className="flex justify-between text-sm">
                  <span className="text-ink-tertiary">Base imponible</span>
                  <span className="text-ink-primary">${totalBase.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-ink-tertiary">IVA {taxRate}%</span>
                  <span className="text-ink-primary">${totalIva.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-base font-bold">
                  <span className="text-ink-primary">Total</span>
                  <span className="text-blue">${total.toFixed(2)}</span>
                </div>
              </div>
              <button onClick={submit} disabled={loading || !selectedInvoice}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-blue text-sm font-semibold text-white hover:bg-blue/90 disabled:opacity-50 transition-all">
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <><Send className="w-4 h-4" /> Emitir al SRI</>}
              </button>
              <p className="text-xs text-center text-ink-ghost mt-3">Firmado con certificado digital</p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
