'use client'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Plus, Trash2, Save, RefreshCw } from 'lucide-react'
import type { SriConcept, WithholdingTaxType } from '@/types/withholding'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://d16rb4jhhui7p6.cloudfront.net/api/v1'

function getToken(): string {
  return localStorage.getItem('_at') || localStorage.getItem('accessToken') || ''
}

interface LineDraft {
  tax_type: WithholdingTaxType
  concept_code: string
  concept_name: string
  base_amount: string
  percentage: string
  fiscal_period_doc: string
}

interface Supplier {
  id: string
  business_name?: string
  legal_name?: string
  name?: string
  document_number?: string
  ruc?: string
}

const SUPPORT_DOC_TYPES = [
  { value: '01', label: 'Factura' },
  { value: '02', label: 'Nota de venta' },
  { value: '03', label: 'Liquidación de compra' },
  { value: '04', label: 'Nota de crédito' },
  { value: '05', label: 'Nota de débito' },
]

// Por esto:
function todayIso(): string {
  const ec = new Date(Date.now() - 5 * 60 * 60 * 1000)
  return ec.toISOString().slice(0, 10)
}
function defaultFiscalPeriod(issueDate: string): string {
  const [year, month] = issueDate.split('-')
  return `${month}/${year}`
}

const emptyLine = (taxType: WithholdingTaxType, fiscal: string): LineDraft => ({
  tax_type: taxType,
  concept_code: '',
  concept_name: '',
  base_amount: '',
  percentage: '',
  fiscal_period_doc: fiscal,
})

export default function NewWithholdingPage() {
  const router = useRouter()

  // Form state
  const [supplierId, setSupplierId] = useState('')
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [establishment, setEstablishment] = useState('001')
  const [emissionPoint, setEmissionPoint] = useState('001')
  const [issueDate, setIssueDate] = useState(todayIso())
  const [supportDocType, setSupportDocType] = useState('01')
  const [supportDocNumber, setSupportDocNumber] = useState('')
  const [supportDocAuth, setSupportDocAuth] = useState('')
  const [supportDocDate, setSupportDocDate] = useState(todayIso())
  const [supportDocTotal, setSupportDocTotal] = useState('')
  const [paymentDate, setPaymentDate] = useState(todayIso())
  const [lines, setLines] = useState<LineDraft[]>([])
  const [concepts, setConcepts] = useState<SriConcept[]>([])

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Fetch catálogos
  const fetchConcepts = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/withholdings/concepts`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      })
      const data = await res.json()
      const p = data.data ?? data
      setConcepts(Array.isArray(p.items) ? p.items : [])
    } catch {}
  }, [])

  const fetchSuppliers = useCallback(async () => {
    try {
      // Endpoint estándar de proveedores; si el path difiere ajustar acá.
      const res = await fetch(`${API_URL}/suppliers?limit=200`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      })
      const data = await res.json()
      const p = data.data ?? data
      const items = p.items ?? p.data ?? p
      setSuppliers(Array.isArray(items) ? items : [])
    } catch {
      setSuppliers([])
    }
  }, [])

  useEffect(() => { fetchConcepts(); fetchSuppliers() }, [fetchConcepts, fetchSuppliers])

  const totalWithheld = useMemo(
    () => lines.reduce((acc, l) => acc + (Number(l.base_amount) * Number(l.percentage) / 100 || 0), 0),
    [lines],
  )

  const addLine = (taxType: WithholdingTaxType) => {
    const fiscal = defaultFiscalPeriod(issueDate)
    const candidates = concepts.filter((c) => c.taxType === taxType)
    const first = candidates[0]
    setLines((prev) => [
      ...prev,
      {
        ...emptyLine(taxType, fiscal),
        concept_code: first?.code ?? '',
        concept_name: first?.name ?? '',
        percentage: String(first?.defaultPercentage ?? ''),
      },
    ])
  }

  const updateLine = (idx: number, patch: Partial<LineDraft>) => {
    setLines((prev) => {
      const next = [...prev]
      next[idx] = { ...next[idx], ...patch }
      if (patch.concept_code) {
        const c = concepts.find((x) => x.code === patch.concept_code)
        if (c) {
          next[idx].concept_name = c.name
          if (patch.percentage === undefined) next[idx].percentage = String(c.defaultPercentage)
        }
      }
      return next
    })
  }

  const removeLine = (idx: number) => setLines((prev) => prev.filter((_, i) => i !== idx))

  const canSubmit =
    supplierId &&
    /^\d{3}-\d{3}-\d{9}$/.test(supportDocNumber.trim()) &&
    Number(supportDocTotal) > 0 &&
    lines.length > 0 &&
    lines.every((l) => Number(l.base_amount) >= 0 && Number(l.percentage) > 0 && l.concept_code)

  const submit = async () => {
    setError('')
    setSaving(true)
    try {
      const body = {
        supplier_id: supplierId,
        establishment,
        emission_point: emissionPoint,
        issue_date: issueDate,
        support_doc_type: supportDocType,
        support_doc_number: supportDocNumber.trim(),
        support_doc_authorization: supportDocAuth.trim() || undefined,
        support_doc_date: supportDocDate,
        support_doc_total: Number(supportDocTotal),
        payment_date: paymentDate,
        lines: lines.map((l) => ({
          tax_type: l.tax_type,
          concept_code: l.concept_code,
          concept_name: l.concept_name,
          base_amount: Number(l.base_amount),
          percentage: Number(l.percentage),
          fiscal_period_doc: l.fiscal_period_doc,
        })),
      }
      const res = await fetch(`${API_URL}/withholdings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) {
        const msg = Array.isArray(data.message) ? data.message[0] : data.message
        setError(msg || 'Error creando la retención')
        return
      }
      const created = data.data ?? data
      router.push(`/retenciones/${created.id}`)
    } catch (e: any) {
      setError(e?.message || 'Error de conexión')
    } finally {
      setSaving(false)
    }
  }

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
              <h1 className="text-lg font-bold text-ink-primary">Nueva retención</h1>
              <p className="text-sm text-ink-tertiary mt-0.5">
                Se creará en borrador. Después podés firmarla y enviarla al SRI.
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div className="px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        {/* Datos del documento */}
        <div className="card rounded-xl p-4 space-y-3">
          <p className="text-[11px] text-ink-tertiary uppercase tracking-widest">Datos del documento</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-3">
              <label className="block text-xs font-medium text-ink-secondary mb-1.5">Proveedor *</label>
              <select
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                className="field"
              >
                <option value="">Seleccionar proveedor...</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {(s.business_name ?? s.legal_name ?? s.name ?? '—')}
                    {(s.document_number ?? s.ruc) ? ` — ${s.document_number ?? s.ruc}` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-secondary mb-1.5">Establecimiento</label>
              <input
                className="field"
                value={establishment}
                onChange={(e) => setEstablishment(e.target.value.replace(/\D/g, '').slice(0, 3).padStart(3, '0'))}
                maxLength={3}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-secondary mb-1.5">Punto de emisión</label>
              <input
                className="field"
                value={emissionPoint}
                onChange={(e) => setEmissionPoint(e.target.value.replace(/\D/g, '').slice(0, 3).padStart(3, '0'))}
                maxLength={3}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-secondary mb-1.5">Fecha emisión</label>
              <input type="date" className="field" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-secondary mb-1.5">Fecha de pago</label>
              <input type="date" className="field" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
            </div>
          </div>
        </div>

        {/* Documento sustento */}
        <div className="card rounded-xl p-4 space-y-3">
          <p className="text-[11px] text-ink-tertiary uppercase tracking-widest">Documento sustento (factura del proveedor)</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-ink-secondary mb-1.5">Tipo</label>
              <select className="field" value={supportDocType} onChange={(e) => setSupportDocType(e.target.value)}>
                {SUPPORT_DOC_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.value} — {t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-secondary mb-1.5">Número (001-001-000000123)</label>
              <input
                className="field font-mono"
                value={supportDocNumber}
                onChange={(e) => setSupportDocNumber(e.target.value)}
                placeholder="001-001-000000123"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-secondary mb-1.5">Fecha emisión doc.</label>
              <input type="date" className="field" value={supportDocDate} onChange={(e) => setSupportDocDate(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-secondary mb-1.5">Total documento (USD)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                className="field"
                value={supportDocTotal}
                onChange={(e) => setSupportDocTotal(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-ink-secondary mb-1.5">
                Autorización SRI del documento (opcional)
              </label>
              <input
                className="field font-mono text-xs"
                value={supportDocAuth}
                onChange={(e) => setSupportDocAuth(e.target.value)}
                placeholder="Clave de acceso o número de autorización"
              />
            </div>
          </div>
        </div>

        {/* Líneas */}
        <div className="card rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[11px] text-ink-tertiary uppercase tracking-widest">Retenciones</p>
            <div className="flex gap-2">
              <button
                onClick={() => addLine('RENTA')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-edge text-ink-secondary hover:text-ink-primary text-xs font-semibold transition-all"
              >
                <Plus className="w-3 h-3" /> Renta
              </button>
              <button
                onClick={() => addLine('IVA')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-edge text-ink-secondary hover:text-ink-primary text-xs font-semibold transition-all"
              >
                <Plus className="w-3 h-3" /> IVA
              </button>
              <button
                onClick={() => addLine('ISD')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-edge text-ink-secondary hover:text-ink-primary text-xs font-semibold transition-all"
              >
                <Plus className="w-3 h-3" /> ISD
              </button>
            </div>
          </div>

          {lines.length === 0 ? (
            <p className="text-center text-sm text-ink-tertiary py-8">
              Aún no hay líneas. Agregá una de Renta o IVA para empezar.
            </p>
          ) : (
            <div className="space-y-3">
              {lines.map((line, idx) => {
                const conceptOptions = concepts.filter((c) => c.taxType === line.tax_type)
                const withheld = Number(line.base_amount) * Number(line.percentage) / 100 || 0
                return (
                  <div key={idx} className="bg-surface-raised border border-edge-subtle rounded-xl p-3">
                    <div className="flex items-center justify-between mb-3">
                      <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold border bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20">
                        {line.tax_type}
                      </span>
                      <button onClick={() => removeLine(idx)} className="text-ink-tertiary hover:text-red-500 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="grid grid-cols-12 gap-3">
                      <div className="col-span-12 md:col-span-5">
                        <label className="block text-[11px] text-ink-tertiary mb-1">Concepto</label>
                        <select
                          className="w-full bg-surface border border-edge rounded-lg px-3 py-2 text-xs text-ink-primary outline-none focus:border-blue/60 transition-all"
                          value={line.concept_code}
                          onChange={(e) => updateLine(idx, { concept_code: e.target.value })}
                        >
                          <option value="">Seleccionar...</option>
                          {conceptOptions.map((c) => (
                            <option key={c.code} value={c.code}>{c.code} — {c.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="col-span-4 md:col-span-2">
                        <label className="block text-[11px] text-ink-tertiary mb-1">Base</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          className="w-full bg-surface border border-edge rounded-lg px-3 py-2 text-sm text-right text-ink-primary outline-none focus:border-blue/60 transition-all"
                          value={line.base_amount}
                          onChange={(e) => updateLine(idx, { base_amount: e.target.value })}
                        />
                      </div>
                      <div className="col-span-3 md:col-span-1">
                        <label className="block text-[11px] text-ink-tertiary mb-1">%</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          className="w-full bg-surface border border-edge rounded-lg px-3 py-2 text-sm text-right text-ink-primary outline-none focus:border-blue/60 transition-all"
                          value={line.percentage}
                          onChange={(e) => updateLine(idx, { percentage: e.target.value })}
                        />
                      </div>
                      <div className="col-span-3 md:col-span-2">
                        <label className="block text-[11px] text-ink-tertiary mb-1">Período</label>
                        <input
                          className="w-full bg-surface border border-edge rounded-lg px-3 py-2 text-xs text-ink-primary outline-none focus:border-blue/60 transition-all"
                          value={line.fiscal_period_doc}
                          onChange={(e) => updateLine(idx, { fiscal_period_doc: e.target.value })}
                          placeholder="MM/YYYY"
                        />
                      </div>
                      <div className="col-span-2 md:col-span-2 text-right">
                        <label className="block text-[11px] text-ink-tertiary mb-1">Retenido</label>
                        <p className="text-sm font-bold text-ink-primary pt-2">${withheld.toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                )
              })}

              <div className="flex justify-end pt-3 border-t border-edge-subtle">
                <div className="text-right">
                  <p className="text-[11px] text-ink-tertiary uppercase tracking-widest">Total a retener</p>
                  <p className="text-2xl font-bold text-ink-primary mt-1">${totalWithheld.toFixed(2)}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Acciones */}
        <div className="flex justify-end gap-3">
          <button
            onClick={() => router.push('/retenciones')}
            className="px-4 py-2 rounded-lg border border-edge text-sm text-ink-secondary hover:text-ink-primary transition-all"
          >
            Cancelar
          </button>
          <button
            disabled={!canSubmit || saving}
            onClick={submit}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue hover:bg-blue-hover disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold transition-all"
          >
            {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            {saving ? 'Guardando...' : 'Crear borrador'}
          </button>
        </div>
      </div>
    </DashboardLayout>
  )
}
