'use client'
import { useState, useCallback, useEffect } from 'react'
import {
  AlertCircle, RefreshCw, Plus, ChevronDown, ChevronUp,
  CheckCircle2, Clock, FileText, Pencil, Trash2, X, Info,
} from 'lucide-react'

// ─── API ─────────────────────────────────────────────────────────────────────

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://d16rb4jhhui7p6.cloudfront.net/api/v1'

async function api<T>(path: string, init?: RequestInit): Promise<T> {
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

// ─── TIPOS ───────────────────────────────────────────────────────────────────

interface Form101Summary {
  id: string
  fiscal_year: number
  status: string
  calculated_at: string | null
  reviewed_at: string | null
  notes: string | null
  created_at: string
}

interface FinancialSummary {
  total_income: number
  total_cost: number
  total_expense: number
  accounting_result: number
  total_assets: number
  total_liabilities: number
  total_equity: number
  income_taxable: number
  income_exempt: number
  expense_deductible: number
  expense_non_deduc: number
  unclassified_income: number
  unclassified_expense: number
}

interface TaxReconciliation {
  accounting_result: number
  add_non_deductible: number
  add_other_adjustments: number
  less_exempt_income: number
  less_other_deductions: number
  taxable_base: number
}

interface TaxCalculation {
  taxable_base: number
  tax_rate: number
  tax_caused: number
  advance_ir: number
  withholding_credit: number
  other_credits: number
  total_credits: number
  tax_to_pay: number
  balance_in_favor: number
}

interface Validation {
  type: 'ERROR' | 'WARNING' | 'INFO'
  code: string
  message: string
  detail?: string
}

interface Adjustment {
  id: string
  field: string
  label: string
  original_value: number
  adjusted_value: number
  difference: number
  reason: string
  user_id: string
  created_at: string
}

interface Form101Detail {
  id: string
  fiscal_year: number
  status: string
  calculated_at: string | null
  reviewed_at: string | null
  notes: string | null
  snapshot: {
    financial: FinancialSummary
    reconciliation: TaxReconciliation
    tax_calculation: TaxCalculation
    validations: Validation[]
    tax_rate_used: number
    journal_entries_count: number
    unclassified_accounts: string[]
  } | null
  adjustments: Adjustment[]
}

// ─── HELPERS ────────────────────────────────────────────────────────────────

function fmtMoney(n: number): string {
  return new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n)
}

function fmtPct(n: number): string {
  return `${(n * 100).toFixed(0)}%`
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; icon: typeof Clock }> = {
  DRAFT:      { label: 'Borrador',    color: 'text-ink-tertiary',                       bg: 'bg-edge-subtle',      border: 'border-edge',          icon: FileText },
  CALCULATED: { label: 'Calculado',   color: 'text-blue-600 dark:text-blue-400',        bg: 'bg-blue-500/10',      border: 'border-blue-500/20',   icon: RefreshCw },
  REVIEWED:   { label: 'Revisado',    color: 'text-amber-600 dark:text-amber-400',      bg: 'bg-amber-500/10',     border: 'border-amber-500/20',  icon: Pencil },
  READY:      { label: 'Listo',       color: 'text-green-600 dark:text-green-400',      bg: 'bg-green-500/10',     border: 'border-green-500/20',  icon: CheckCircle2 },
  FILED:      { label: 'Presentado',  color: 'text-purple-600 dark:text-purple-400',    bg: 'bg-purple-500/10',    border: 'border-purple-500/20', icon: CheckCircle2 },
}

const VALIDATION_CONFIG = {
  ERROR:   { color: 'text-red-600 dark:text-red-400',    bg: 'bg-red-500/10',    border: 'border-red-500/20',    icon: AlertCircle },
  WARNING: { color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', icon: AlertCircle },
  INFO:    { color: 'text-blue-600 dark:text-blue-400',  bg: 'bg-blue-500/10',   border: 'border-blue-500/20',  icon: Info },
}

const CURRENT_YEAR = new Date().getFullYear()
const YEARS = Array.from({ length: CURRENT_YEAR - 2019 }, (_, i) => CURRENT_YEAR - i)

const ADJUSTABLE_FIELDS = [
  { field: 'add_non_deductible',    label: 'Gastos no deducibles adicionales' },
  { field: 'add_other_adjustments', label: 'Otros ajustes tributarios (+)' },
  { field: 'less_exempt_income',    label: 'Ingresos exentos (-)' },
  { field: 'less_other_deductions', label: 'Otras deducciones (-)' },
  { field: 'advance_ir',            label: 'Anticipo IR pagado' },
  { field: 'other_credits',         label: 'Otros créditos tributarios' },
]

// ─── COMPONENTES AUXILIARES ───────────────────────────────────────────────────

function MoneyRow({ label, value, highlight, negative, indent }: {
  label: string; value: number; highlight?: boolean; negative?: boolean; indent?: boolean
}) {
  const textColor = highlight
    ? (value >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400')
    : negative ? 'text-red-600 dark:text-red-400' : 'text-ink-primary'

  return (
    <div className={`flex justify-between items-center py-2 px-4 ${indent ? 'pl-8' : ''} ${highlight ? 'border-t border-edge-subtle bg-edge-subtle/30 font-semibold' : ''}`}>
      <span className="text-xs text-ink-secondary">{label}</span>
      <span className={`font-mono text-xs ${textColor} tabular-nums`}>{fmtMoney(value)}</span>
    </div>
  )
}

function SectionCard({ title, children, defaultOpen = true }: {
  title: string; children: React.ReactNode; defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="card overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-3 border-b border-edge-subtle bg-surface-raised hover:bg-edge-subtle/40 transition-colors"
      >
        <span className="text-[10px] font-semibold uppercase tracking-widest text-ink-tertiary">{title}</span>
        {open ? <ChevronUp className="w-3.5 h-3.5 text-ink-ghost" /> : <ChevronDown className="w-3.5 h-3.5 text-ink-ghost" />}
      </button>
      {open && <div className="divide-y divide-edge-subtle">{children}</div>}
    </div>
  )
}

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────

export function Form101View() {
  const [selectedYear, setSelectedYear] = useState(CURRENT_YEAR - 1)
  const [forms, setForms] = useState<Form101Summary[]>([])
  const [detail, setDetail] = useState<Form101Detail | null>(null)
  const [loading, setLoading] = useState(false)
  const [calculating, setCalculating] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Ajustes manuales
  const [showAdjustment, setShowAdjustment] = useState(false)
  const [adjField, setAdjField]   = useState(ADJUSTABLE_FIELDS[0].field)
  const [adjValue, setAdjValue]   = useState('')
  const [adjReason, setAdjReason] = useState('')
  const [savingAdj, setSavingAdj] = useState(false)

  // Carga la lista de formularios del tenant
  const loadForms = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await api<Form101Summary[]>('/tax-reports/form-101')
      setForms(data)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadForms() }, [loadForms])

  // Carga el detalle del formulario del año seleccionado
  const loadDetail = useCallback(async (id: string) => {
    setLoading(true)
    setError('')
    try {
      const data = await api<Form101Detail>(`/tax-reports/form-101/${id}`)
      setDetail(data)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  // Formulario activo del año seleccionado
  const activeForm = forms.find(f => f.fiscal_year === selectedYear)

  useEffect(() => {
    if (activeForm) loadDetail(activeForm.id)
    else setDetail(null)
  }, [activeForm?.id])

  const showMsg = (msg: string) => {
    setSuccess(msg)
    setTimeout(() => setSuccess(''), 4000)
  }

  // Crear borrador
  const handleCreate = async () => {
    setError('')
    try {
      await api('/tax-reports/form-101', {
        method: 'POST',
        body: JSON.stringify({ fiscal_year: selectedYear }),
      })
      showMsg(`Borrador ${selectedYear} creado.`)
      await loadForms()
    } catch (e: any) {
      setError(e.message)
    }
  }

  // Calcular / recalcular
  const handleCalculate = async () => {
    if (!activeForm) return
    setCalculating(true)
    setError('')
    try {
      await api(`/tax-reports/form-101/${activeForm.id}/calculate`, { method: 'POST' })
      showMsg('Cálculo completado.')
      await loadForms()
      await loadDetail(activeForm.id)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setCalculating(false)
    }
  }

  // Marcar como revisado
  const handleReview = async () => {
    if (!activeForm) return
    try {
      await api(`/tax-reports/form-101/${activeForm.id}/review`, { method: 'POST', body: JSON.stringify({}) })
      showMsg('Marcado como revisado.')
      await loadForms()
      await loadDetail(activeForm.id)
    } catch (e: any) {
      setError(e.message)
    }
  }

  // Marcar como listo
  const handleReady = async () => {
    if (!activeForm) return
    try {
      await api(`/tax-reports/form-101/${activeForm.id}/ready`, { method: 'POST' })
      showMsg('Declaración marcada como lista.')
      await loadForms()
      await loadDetail(activeForm.id)
    } catch (e: any) {
      setError(e.message)
    }
  }

  // Agregar ajuste
  const handleAddAdjustment = async () => {
    if (!activeForm || !adjValue || !adjReason.trim()) return
    setSavingAdj(true)
    try {
      const fieldMeta = ADJUSTABLE_FIELDS.find(f => f.field === adjField)!
      await api(`/tax-reports/form-101/${activeForm.id}/adjustments`, {
        method: 'POST',
        body: JSON.stringify({
          field:          adjField,
          label:          fieldMeta.label,
          adjusted_value: parseFloat(adjValue),
          reason:         adjReason.trim(),
        }),
      })
      setShowAdjustment(false)
      setAdjValue('')
      setAdjReason('')
      showMsg('Ajuste guardado.')
      await loadDetail(activeForm.id)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSavingAdj(false)
    }
  }

  // Eliminar ajuste
  const handleRemoveAdjustment = async (adjId: string) => {
    if (!activeForm) return
    try {
      await api(`/tax-reports/form-101/${activeForm.id}/adjustments/${adjId}`, { method: 'DELETE' })
      showMsg('Ajuste eliminado.')
      await loadDetail(activeForm.id)
    } catch (e: any) {
      setError(e.message)
    }
  }

  const snap = detail?.snapshot
  const statusCfg = activeForm ? (STATUS_CONFIG[activeForm.status] ?? STATUS_CONFIG.DRAFT) : null

  return (
    <div className="space-y-5">

      {/* Header con selector de año */}
      <div className="card p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-sm font-bold text-ink-primary">Formulario 101 — Impuesto a la Renta</h2>
            <p className="text-xs text-ink-tertiary mt-0.5">Declaración anual para Sociedades · Normativa SRI Ecuador</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {/* Selector de ejercicio */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-ink-tertiary whitespace-nowrap">Ejercicio fiscal</span>
              <select
                value={selectedYear}
                onChange={e => setSelectedYear(Number(e.target.value))}
                className="field text-sm"
              >
                {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>

            {/* Badge de estado */}
            {statusCfg && (
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${statusCfg.bg} ${statusCfg.color} ${statusCfg.border}`}>
                {statusCfg.label}
              </span>
            )}
          </div>
        </div>

        {/* Acciones */}
        <div className="flex items-center gap-2 mt-4 flex-wrap">
          {!activeForm ? (
            <button onClick={handleCreate}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue text-sm font-semibold text-white hover:bg-blue-hover transition-all">
              <Plus className="w-3.5 h-3.5" /> Crear borrador {selectedYear}
            </button>
          ) : (
            <>
              <button onClick={handleCalculate} disabled={calculating || activeForm.status === 'FILED'}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue text-sm font-semibold text-white hover:bg-blue-hover disabled:opacity-50 transition-all">
                {calculating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                {activeForm.status === 'DRAFT' ? 'Calcular' : 'Recalcular'}
              </button>

              {activeForm.status === 'CALCULATED' && (
                <button onClick={handleReview}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-sm font-semibold text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 transition-all">
                  <Pencil className="w-3.5 h-3.5" /> Marcar revisado
                </button>
              )}

              {activeForm.status === 'REVIEWED' && (
                <button onClick={handleReady}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-500/10 border border-green-500/20 text-sm font-semibold text-green-600 dark:text-green-400 hover:bg-green-500/20 transition-all">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Marcar como lista
                </button>
              )}

              {snap && activeForm.status !== 'FILED' && (
                <button onClick={() => setShowAdjustment(true)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-edge-subtle border border-edge text-xs text-ink-secondary hover:text-ink-primary transition-all">
                  <Plus className="w-3 h-3" /> Ajuste manual
                </button>
              )}
            </>
          )}

          <button onClick={loadForms} disabled={loading}
            className="p-2 rounded-lg bg-edge-subtle border border-edge text-ink-tertiary hover:text-ink-primary transition-all">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Metadatos */}
        {activeForm && (
          <div className="flex items-center gap-4 mt-3 text-[11px] text-ink-ghost flex-wrap">
            {activeForm.calculated_at && <span>Calculado: {fmtDate(activeForm.calculated_at)}</span>}
            {activeForm.reviewed_at   && <span>Revisado: {fmtDate(activeForm.reviewed_at)}</span>}
            {snap && <span>{snap.journal_entries_count} líneas contables procesadas</span>}
          </div>
        )}
      </div>

      {/* Mensajes */}
      {error && (
        <div className="flex items-center justify-between px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-600 dark:text-red-400">
          <div className="flex items-center gap-2"><AlertCircle className="w-4 h-4 shrink-0" /><span>{error}</span></div>
          <button onClick={() => setError('')}><X className="w-3.5 h-3.5" /></button>
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-green-500/10 border border-green-500/20 text-sm text-green-600 dark:text-green-400">
          <CheckCircle2 className="w-4 h-4 shrink-0" /><span>{success}</span>
        </div>
      )}

      {/* Sin formulario */}
      {!activeForm && !loading && (
        <div className="card py-16 text-center">
          <FileText className="w-10 h-10 text-ink-ghost mx-auto mb-3" />
          <p className="text-sm font-medium text-ink-primary mb-1">No hay declaración para {selectedYear}</p>
          <p className="text-xs text-ink-tertiary">Crea un borrador para comenzar el proceso de declaración anual.</p>
        </div>
      )}

      {/* Resumen superior — solo si hay snapshot */}
      {snap && (
        <>
          {/* Cards resumen */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: 'Resultado contable',  value: snap.financial.accounting_result,     highlight: true },
              { label: 'Ajustes tributarios', value: snap.reconciliation.add_non_deductible + snap.reconciliation.add_other_adjustments - snap.reconciliation.less_exempt_income - snap.reconciliation.less_other_deductions },
              { label: 'Base imponible',      value: snap.reconciliation.taxable_base,      highlight: true },
              { label: 'Impuesto causado',    value: snap.tax_calculation.tax_caused },
              { label: 'Créditos tributarios',value: snap.tax_calculation.total_credits,   },
              { label: 'Saldo final',         value: snap.tax_calculation.tax_to_pay > 0 ? snap.tax_calculation.tax_to_pay : -snap.tax_calculation.balance_in_favor, highlight: true },
            ].map(({ label, value, highlight }) => (
              <div key={label} className={`card p-4 ${highlight ? 'ring-1 ring-blue-500/20' : ''}`}>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-ink-tertiary mb-1">{label}</p>
                <p className={`text-lg font-bold tabular-nums ${value < 0 ? 'text-red-600 dark:text-red-400' : value > 0 ? 'text-ink-primary' : 'text-ink-tertiary'}`}>
                  {fmtMoney(value)}
                </p>
              </div>
            ))}
          </div>

          {/* Sección: Información financiera */}
          <SectionCard title="Información financiera">
            <MoneyRow label="Total ingresos"       value={snap.financial.total_income} />
            <MoneyRow label="Total costos"         value={snap.financial.total_cost}    indent />
            <MoneyRow label="Total gastos"         value={snap.financial.total_expense} indent />
            <MoneyRow label="Resultado contable"   value={snap.financial.accounting_result} highlight />
            <div className="px-4 py-2 bg-edge-subtle/20">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-ink-tertiary mb-1">Balance general</p>
            </div>
            <MoneyRow label="Total activos"        value={snap.financial.total_assets} />
            <MoneyRow label="Total pasivos"        value={snap.financial.total_liabilities} />
            <MoneyRow label="Patrimonio"           value={snap.financial.total_equity} />
          </SectionCard>

          {/* Sección: Conciliación tributaria */}
          <SectionCard title="Conciliación tributaria">
            <MoneyRow label="Resultado contable"              value={snap.reconciliation.accounting_result} />
            <MoneyRow label="+ Gastos no deducibles"         value={snap.reconciliation.add_non_deductible}    indent />
            <MoneyRow label="+ Otros ajustes tributarios"    value={snap.reconciliation.add_other_adjustments} indent />
            <MoneyRow label="− Ingresos exentos"             value={snap.reconciliation.less_exempt_income}    indent negative />
            <MoneyRow label="− Otras deducciones"            value={snap.reconciliation.less_other_deductions} indent negative />
            <MoneyRow label="Base imponible"                 value={snap.reconciliation.taxable_base}          highlight />
            {snap.unclassified_accounts.length > 0 && (
              <div className="px-4 py-2.5 bg-amber-500/5 border-t border-amber-500/10">
                <p className="text-[10px] text-amber-600 dark:text-amber-400">
                  ⚠ {snap.unclassified_accounts.length} cuenta(s) sin clasificación tributaria —
                  pueden afectar la exactitud: {snap.unclassified_accounts.slice(0, 5).join(', ')}
                  {snap.unclassified_accounts.length > 5 && '...'}
                </p>
              </div>
            )}
          </SectionCard>

          {/* Sección: Impuesto causado */}
          <SectionCard title="Cálculo del impuesto">
            <MoneyRow label="Base imponible"                                        value={snap.tax_calculation.taxable_base} />
            <div className="flex justify-between items-center py-2 px-4">
              <span className="text-xs text-ink-secondary">Tarifa aplicada</span>
              <span className="font-mono text-xs text-ink-primary">{fmtPct(snap.tax_calculation.tax_rate)}</span>
            </div>
            <MoneyRow label="Impuesto causado"                                      value={snap.tax_calculation.tax_caused} highlight />
            <MoneyRow label="− Anticipo IR"                                         value={snap.tax_calculation.advance_ir}         indent negative />
            <MoneyRow label="− Retenciones en la fuente recibidas"                 value={snap.tax_calculation.withholding_credit} indent negative />
            <MoneyRow label="− Otros créditos"                                      value={snap.tax_calculation.other_credits}      indent negative />
            <MoneyRow label="Total créditos"                                        value={snap.tax_calculation.total_credits}      highlight />
            {snap.tax_calculation.tax_to_pay > 0
              ? <MoneyRow label="🔴 IMPUESTO A PAGAR" value={snap.tax_calculation.tax_to_pay}       highlight />
              : <MoneyRow label="🟢 SALDO A FAVOR"    value={snap.tax_calculation.balance_in_favor} highlight />
            }
          </SectionCard>

          {/* Sección: Validaciones */}
          <SectionCard title={`Validaciones y observaciones (${snap.validations.length})`} defaultOpen={snap.validations.some(v => v.type === 'ERROR' || v.type === 'WARNING')}>
            {snap.validations.length === 0 ? (
              <div className="px-4 py-4 text-xs text-ink-ghost italic">Sin observaciones.</div>
            ) : snap.validations.map(v => {
              const cfg = VALIDATION_CONFIG[v.type]
              const Icon = cfg.icon
              return (
                <div key={v.code} className={`flex items-start gap-3 px-4 py-3 ${cfg.bg} border-l-2 ${cfg.border}`}>
                  <Icon className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${cfg.color}`} />
                  <div>
                    <p className={`text-xs font-semibold ${cfg.color}`}>{v.type} — {v.message}</p>
                    {v.detail && <p className="text-[11px] text-ink-tertiary mt-0.5">{v.detail}</p>}
                  </div>
                </div>
              )
            })}
          </SectionCard>

          {/* Sección: Ajustes manuales */}
          {detail && detail.adjustments.length > 0 && (
            <SectionCard title={`Ajustes manuales (${detail.adjustments.length})`}>
              {detail.adjustments.map(adj => (
                <div key={adj.id} className="flex items-start justify-between gap-4 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-ink-primary">{adj.label}</p>
                    <div className="flex items-center gap-3 mt-0.5 text-[11px] text-ink-tertiary flex-wrap">
                      <span>Original: {fmtMoney(adj.original_value)}</span>
                      <span>→ Ajustado: {fmtMoney(adj.adjusted_value)}</span>
                      <span className={adj.difference >= 0 ? 'text-red-500' : 'text-green-500'}>
                        ({adj.difference >= 0 ? '+' : ''}{fmtMoney(adj.difference)})
                      </span>
                    </div>
                    <p className="text-[11px] text-ink-ghost mt-0.5 italic">"{adj.reason}"</p>
                  </div>
                  {activeForm?.status !== 'FILED' && (
                    <button onClick={() => handleRemoveAdjustment(adj.id)}
                      className="p-1.5 rounded text-ink-ghost hover:text-red-500 hover:bg-red-500/10 transition-all shrink-0">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </SectionCard>
          )}
        </>
      )}

      {/* Modal ajuste manual */}
      {showAdjustment && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="card-raised w-full max-w-md shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-ink-primary">Ajuste manual</h3>
              <button onClick={() => setShowAdjustment(false)} className="text-ink-tertiary hover:text-ink-primary">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-widest text-ink-tertiary font-semibold block mb-1.5">Campo a ajustar</label>
              <select value={adjField} onChange={e => setAdjField(e.target.value)} className="field w-full">
                {ADJUSTABLE_FIELDS.map(f => <option key={f.field} value={f.field}>{f.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-widest text-ink-tertiary font-semibold block mb-1.5">Valor ajustado final</label>
              <input type="number" step="0.01" value={adjValue} onChange={e => setAdjValue(e.target.value)}
                className="field w-full text-right" placeholder="0.00" />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-widest text-ink-tertiary font-semibold block mb-1.5">Motivo <span className="text-red-500">*</span></label>
              <textarea value={adjReason} onChange={e => setAdjReason(e.target.value)}
                rows={3} className="field w-full resize-none" placeholder="Explica el motivo del ajuste..." />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowAdjustment(false)}
                className="flex-1 py-2.5 rounded-lg border border-edge text-sm text-ink-secondary hover:text-ink-primary transition-all">
                Cancelar
              </button>
              <button onClick={handleAddAdjustment} disabled={savingAdj || !adjValue || !adjReason.trim()}
                className="flex-1 py-2.5 rounded-lg bg-blue text-white text-sm font-semibold hover:bg-blue-hover disabled:opacity-50 transition-all flex items-center justify-center gap-2">
                {savingAdj ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                Guardar ajuste
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
