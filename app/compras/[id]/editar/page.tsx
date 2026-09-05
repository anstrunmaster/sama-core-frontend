'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import {
  ArrowLeft, Upload, FileText, Plus, Trash2, AlertCircle,
  CheckCircle2, Save, X, Loader2,
} from 'lucide-react'
import { purchasesApi, suppliersApi, fmtMoney } from '../../api'
import { mappingsApi } from '../../../contabilidad/api-4c'
import {
  type Supplier,
  type ExpenseAccount, type LineForm, type RetentionForm,
  DOCUMENT_TYPE_LABELS, IVA_RATE_LABELS, PAYMENT_FORM_LABELS,
} from '../../types'
// ─── Tipos ───────────────────────────────────────────────────────
const EMPTY_LINE = (n: number): LineForm => ({
  line_number: n,
  code: '',
  description: '',
  quantity: '1',
  unit_price: '0',
  discount: '0',
  iva_rate_code: '4',
})
function ivaRatePct(code: string): number {
  switch (code) {
    case '0': return 0
    case '2': return 12
    case '3': return 14
    case '4': return 15
    case '5': return 5
    case '6': return 0
    case '7': return 0
    case '8': return 8
    default: return 0
  }
}
// ─── Componente principal ─────────────────────────────────────────
export default function EditarBorradorPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const purchaseId = params.id
  const fileInputRef = useRef<HTMLInputElement>(null)
  // Carga inicial del borrador
  const [loadingDraft, setLoadingDraft] = useState(true)
  const [loadError, setLoadError] = useState('')
  // Form state
  const [supplierId, setSupplierId] = useState('')
  const [documentType, setDocumentType] = useState('FACTURA')
  const [establishment, setEstablishment] = useState('001')
  const [emissionPoint, setEmissionPoint] = useState('001')
  const [sequential, setSequential] = useState('')
  const [accessKey, setAccessKey] = useState('')
  const [issueDate, setIssueDate] = useState(new Date().toISOString().slice(0, 10))
  const [paymentForm, setPaymentForm] = useState('01')
  const [notes, setNotes] = useState('')
  const [sourceXml, setSourceXml] = useState('')
  const [lines, setLines] = useState<LineForm[]>([EMPTY_LINE(1)])
  const [retentions, setRetentions] = useState<RetentionForm[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  // UI state
  const [saving, setSaving] = useState(false)
  const [parsing, setParsing] = useState(false)
  const [error, setError] = useState('')
  const [parsedInfo, setParsedInfo] = useState<{
    supplier_ruc: string
    supplier_name: string
    existing_supplier_id: string | null
    obligado_contabilidad: boolean
  } | null>(null)
  // Modal proveedor nuevo
  const [showNewSupplierModal, setShowNewSupplierModal] = useState(false)
  const [creatingSupplier, setCreatingSupplier] = useState(false)
  // Preview contable
  const [accountingPreview, setAccountingPreview] = useState<any | null>(null)
  const [loadingPreview, setLoadingPreview] = useState(false)
  // Drawer de trazabilidad
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerLine, setDrawerLine] = useState<any>(null)
  // Cuenta de gasto
  const [expenseAccounts, setExpenseAccounts] = useState<ExpenseAccount[]>([])
  const [expenseAccountId, setExpenseAccountId] = useState<string>('')
  // ── Cargar datos iniciales ────────────────────────────────────
  useEffect(() => {
    suppliersApi
      .list({ limit: 500, is_active: true })
      .then((res) => setSuppliers(res.data || []))
      .catch(() => setSuppliers([]))
    purchasesApi
      .expenseAccounts()
      .then((accounts) => {
        setExpenseAccounts(accounts)
        if (accounts.length === 1) setExpenseAccountId((prev) => prev || accounts[0].id)
      })
      .catch(() => setExpenseAccounts([]))
    mappingsApi.list()
      .then((mappings) => {
        const expenseMapping = mappings.find((m: any) => m.key === 'EXPENSE_DEFAULT')
        // Solo como fallback — la cuenta guardada en el borrador tiene prioridad
        if (expenseMapping?.account_id) {
          setExpenseAccountId((prev) => prev || expenseMapping.account_id)
        }
      })
      .catch(() => {})
  }, [])
  // ── Cargar el borrador ────────────────────────────────────────
  useEffect(() => {
    if (!purchaseId) return
    purchasesApi.getById(purchaseId).then((p) => {
      if (p.status !== 'DRAFT') {
        router.push(`/compras/${purchaseId}`)
        return
      }
      // Prellenar todos los campos del formulario
      setSupplierId(p.supplier_id)
      setDocumentType(p.document_type)
      setEstablishment(p.establishment)
      setEmissionPoint(p.emission_point)
      setSequential(p.sequential)
      setAccessKey(p.access_key ?? '')
      setIssueDate(p.issue_date.slice(0, 10))
      setPaymentForm(p.payment_form ?? '01')
      setNotes(p.notes ?? '')
      setSourceXml((p as any).source_xml ?? '')
      setLines(
        (p.lines || []).map((l: any) => ({
          line_number: l.line_number,
          code: l.code ?? '',
          description: l.description,
          quantity: String(l.quantity),
          unit_price: String(l.unit_price),
          discount: String(l.discount),
          iva_rate_code: l.iva_rate_code,
          product_id: l.product_id ?? undefined,
          direct_account_id: l.direct_account_id ?? undefined,
        }))
      )
      setRetentions(
        (p.retentions || []).map((r: any) => ({
          type: r.type,
          code: r.code,
          description: r.description ?? '',
          base_amount: String(r.base_amount),
          rate_pct: String(r.rate_pct),
        }))
      )
      if ((p as any).expense_account_id) {
        setExpenseAccountId((p as any).expense_account_id)
      }
    }).catch((e) => {
      setLoadError(e.message || 'Error al cargar el borrador')
    }).finally(() => {
      setLoadingDraft(false)
    })
  }, [purchaseId])
  // ── Preview contable desde el inicio (no espera a guardar) ────
  useEffect(() => {
    if (!purchaseId || loadingDraft || loadError) return
    if (!expenseAccountId) return
    setLoadingPreview(true)
    purchasesApi
      .accountingPreview(purchaseId, expenseAccountId || undefined)
      .then((preview) => {
        setAccountingPreview(preview)
        if (preview?.lines) {
          const expenseLine = preview.lines.find((l: any) => l.mapping_key === 'EXPENSE_DEFAULT')
          if (expenseLine?.account_id) setExpenseAccountId(expenseLine.account_id)
        }
      })
      .catch(() => {
        // preview falla silenciosamente
      })
      .finally(() => setLoadingPreview(false))
  }, [purchaseId, loadingDraft, loadError, expenseAccountId])
  // ── Totales en vivo ───────────────────────────────────────────
  const totals = (() => {
    let subtotal0 = 0, subtotalTaxed = 0, subtotalExempt = 0
    let subtotalNoTax = 0, iva = 0, discount = 0
    for (const l of lines) {
      const qty = parseFloat(l.quantity) || 0
      const price = parseFloat(l.unit_price) || 0
      const disc = parseFloat(l.discount) || 0
      const lineSubtotal = Math.max(0, qty * price - disc)
      discount += disc
      const ratePct = ivaRatePct(l.iva_rate_code)
      switch (l.iva_rate_code) {
        case '0': subtotal0 += lineSubtotal; break
        case '6': subtotalNoTax += lineSubtotal; break
        case '7': subtotalExempt += lineSubtotal; break
        default:
          subtotalTaxed += lineSubtotal
          iva += (lineSubtotal * ratePct) / 100
      }
    }
    const subtotal = subtotal0 + subtotalTaxed + subtotalExempt + subtotalNoTax
    const total = subtotal + iva
    let retentionRenta = 0, retentionIva = 0
    for (const r of retentions) {
      const amount = ((parseFloat(r.base_amount) || 0) * (parseFloat(r.rate_pct) || 0)) / 100
      if (r.type === 'RENTA') retentionRenta += amount
      else retentionIva += amount
    }
    return {
      subtotal0, subtotalTaxed, subtotalExempt, subtotalNoTax,
      iva, discount, subtotal, total,
      retentionRenta, retentionIva,
      netPayable: total - retentionRenta - retentionIva,
    }
  })()
  // ── Upload XML ────────────────────────────────────────────────
  const handleFileUpload = async (file: File) => {
    if (!file) return
    if (!file.name.toLowerCase().endsWith('.xml')) {
      setError('El archivo debe ser un XML')
      return
    }
    setParsing(true)
    setError('')
    try {
      const xml = await file.text()
      const result = await purchasesApi.parseXml(xml)
      const p = result.parsed
      setDocumentType(p.document.document_type)
      setEstablishment(p.document.establishment)
      setEmissionPoint(p.document.emission_point)
      setSequential(p.document.sequential)
      setAccessKey(p.document.access_key)
      setIssueDate(p.document.issue_date)
      setPaymentForm(p.payment_form)
      setSourceXml(xml)
      setLines(
        p.lines.map((l, idx) => ({
          line_number: idx + 1,
          code: l.code ?? '',
          description: l.description,
          quantity: String(l.quantity),
          unit_price: String(l.unit_price),
          discount: String(l.discount),
          iva_rate_code: l.iva_rate_code,
          product_id: undefined,
        })),
      )
      if (result.existing_supplier_id) {
        setSupplierId(result.existing_supplier_id)
      } else {
        setSupplierId('')
      }
      setParsedInfo({
        supplier_ruc: p.supplier.ruc,
        supplier_name: p.supplier.legal_name,
        existing_supplier_id: result.existing_supplier_id,
        obligado_contabilidad: p.obligado_contabilidad,
      })
      if (result.retentions_suggested.applies) {
        setRetentions(
          result.retentions_suggested.suggestions.map((s) => ({
            type: s.type,
            code: s.code,
            description: s.description,
            base_amount: String(s.base_amount),
            rate_pct: String(s.rate_pct),
          })),
        )
      }
      if (!result.existing_supplier_id) {
        setShowNewSupplierModal(true)
      }
    } catch (e: any) {
      setError(e.message || 'No se pudo parsear el XML')
    } finally {
      setParsing(false)
    }
  }
  // ── Crear proveedor desde XML ─────────────────────────────────
  const handleCreateSupplierFromXml = async () => {
    if (!sourceXml) return
    setCreatingSupplier(true)
    setError('')
    try {
      const res = await suppliersApi.createFromXml(sourceXml)
      setSupplierId(res.supplier.id)
      const updated = await suppliersApi.list({ limit: 500, is_active: true })
      setSuppliers(updated.data || [])
      setShowNewSupplierModal(false)
      setParsedInfo((prev) =>
        prev ? { ...prev, existing_supplier_id: res.supplier.id } : null,
      )
    } catch (e: any) {
      setError(e.message || 'Error al crear el proveedor')
    } finally {
      setCreatingSupplier(false)
    }
  }
  // ── Guardar cambios (PATCH) ───────────────────────────────────
  const saveAsDraftWithLines = async (currentLines: LineForm[]) => {
    setSaving(true)
    setError('')
    try {
      const payload = {
        supplier_id: supplierId,
        document_type: documentType,
        establishment,
        emission_point: emissionPoint,
        sequential,
        access_key: accessKey || undefined,
        issue_date: issueDate,
        payment_form: paymentForm,
        expense_account_id: expenseAccountId || undefined,
        notes: notes || undefined,
        source_xml: sourceXml || undefined,
        origin: sourceXml ? 'XML_UPLOAD' : 'MANUAL',
        lines: currentLines.map((l) => ({
          line_number: l.line_number,
          code: l.code || undefined,
          description: l.description,
          quantity: parseFloat(l.quantity),
          unit_price: parseFloat(l.unit_price),
          discount: parseFloat(l.discount) || 0,
          iva_rate_code: l.iva_rate_code,
          ...(l.product_id && { product_id: l.product_id }),
          ...(l.direct_account_id && { direct_account_id: l.direct_account_id }),
        })),
        retentions: retentions.map((r) => ({
          type: r.type,
          code: r.code,
          description: r.description || undefined,
          base_amount: parseFloat(r.base_amount),
          rate_pct: parseFloat(r.rate_pct),
        })),
      }
      await purchasesApi.update(purchaseId, payload)
      // Después de guardar exitosamente, redirigir al detalle
      router.push(`/compras/${purchaseId}`)
    } catch (e: any) {
      setError(e.message || 'Error al guardar')
      setSaving(false)
    }
  }
  // ── Submit principal ──────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!supplierId) { setError('Selecciona un proveedor'); return }
    if (!sequential) { setError('Ingresa el secuencial del documento'); return }
    if (lines.length === 0 || lines.some((l) => !l.description.trim() || parseFloat(l.quantity) <= 0)) {
      setError('Cada línea debe tener descripción y cantidad mayor a 0')
      return
    }
    // En edición no hay flujo de resolución de productos — guardar directo
    await saveAsDraftWithLines(lines)
  }
  // ── Handlers de líneas y retenciones ─────────────────────────
  const handleAddLine = () => setLines([...lines, EMPTY_LINE(lines.length + 1)])
  const handleRemoveLine = (idx: number) => {
    if (lines.length === 1) return
    setLines(lines.filter((_, i) => i !== idx).map((l, i) => ({ ...l, line_number: i + 1 })))
  }
  const handleLineChange = (idx: number, field: keyof LineForm, value: string) => {
    setLines(lines.map((l, i) => i === idx ? { ...l, [field]: value } : l))
  }
  // ── Pantalla de carga inicial ─────────────────────────────────
  if (loadingDraft) {
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
  if (loadError) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <button onClick={() => router.push('/compras')} className="btn btn-ghost mb-4">
            <ArrowLeft className="w-4 h-4" />
            Volver a compras
          </button>
          <div className="card rounded-xl p-4 flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
            <AlertCircle className="w-4 h-4" />
            {loadError}
          </div>
        </div>
      </DashboardLayout>
    )
  }
  return (
    <DashboardLayout>
      <div className="p-6 max-w-5xl mx-auto space-y-5">
        {/* Header */}
        <div>
          <Link href={`/compras/${purchaseId}`} className="inline-flex items-center gap-1 text-xs text-ink-tertiary hover:text-ink-primary mb-2">
            <ArrowLeft className="w-3.5 h-3.5" />
            Volver a compras
          </Link>
          <h1 className="text-xl font-bold text-ink-primary tracking-tight">Editar borrador</h1>
          <p className="text-sm text-ink-tertiary mt-0.5">
            Editando borrador — los cambios reemplazarán el contenido actual
          </p>
        </div>
        {/* Upload XML */}
        <div className="card rounded-2xl p-5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-muted flex items-center justify-center flex-shrink-0">
              <Upload className="w-5 h-5 text-blue" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-ink-primary mb-1">
                Cargar desde XML del proveedor
              </h3>
              <p className="text-xs text-ink-tertiary mb-3">
                Sube el XML que te llegó por correo. El sistema completa el formulario y sugiere retenciones.
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xml,text/xml"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) handleFileUpload(f)
                }}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={parsing}
                className="btn btn-secondary"
              >
                <FileText className="w-4 h-4" />
                {parsing ? 'Procesando XML...' : 'Seleccionar archivo XML'}
              </button>
            </div>
          </div>
          {parsedInfo && (
            <div className="mt-4 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                    XML procesado correctamente
                  </div>
                  <div className="text-[11px] text-ink-secondary mt-1">
                    Proveedor: <strong>{parsedInfo.supplier_name}</strong> · RUC {parsedInfo.supplier_ruc}
                  </div>
                  {!parsedInfo.existing_supplier_id && (
                    <div className="text-[11px] text-amber-600 dark:text-amber-400 mt-2">
                      ⚠ Proveedor nuevo detectado — pendiente de confirmar creación.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="card rounded-xl p-3 flex items-start gap-2 text-xs text-red-600 dark:text-red-400">
              <AlertCircle className="w-3.5 h-3.5 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
          {/* Datos del documento */}
          <Section title="Datos del documento">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="Proveedor" required>
                <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} className="field" required>
                  <option value="">Selecciona un proveedor...</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>{s.legal_name} ({s.identification})</option>
                  ))}
                </select>
              </Field>
              <Field label="Tipo de documento">
                <select value={documentType} onChange={(e) => setDocumentType(e.target.value)} className="field">
                  {Object.entries(DOCUMENT_TYPE_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </Field>
            </div>
            <div className="grid grid-cols-3 md:grid-cols-4 gap-3 mt-3">
              <Field label="Estab.">
                <input type="text" value={establishment} onChange={(e) => setEstablishment(e.target.value.padStart(3, '0').slice(0, 3))} className="field font-mono" />
              </Field>
              <Field label="Pto. emis.">
                <input type="text" value={emissionPoint} onChange={(e) => setEmissionPoint(e.target.value.padStart(3, '0').slice(0, 3))} className="field font-mono" />
              </Field>
              <Field label="Secuencial" required>
                <input type="text" value={sequential} onChange={(e) => setSequential(e.target.value)} className="field font-mono" placeholder="000000123" required />
              </Field>
              <Field label="Fecha emisión" required>
                <input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} className="field" required />
              </Field>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
              <Field label="Clave de acceso (opcional)">
                <input type="text" value={accessKey} onChange={(e) => setAccessKey(e.target.value)} className="field font-mono text-xs" placeholder="49 dígitos" maxLength={49} />
              </Field>
              <Field label="Forma de pago">
                <select value={paymentForm} onChange={(e) => setPaymentForm(e.target.value)} className="field">
                  {Object.entries(PAYMENT_FORM_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </Field>
            </div>
          </Section>
          {/* Líneas */}
          <Section
            title="Detalle"
            action={
              <button type="button" onClick={handleAddLine} className="btn btn-ghost text-xs">
                <Plus className="w-3.5 h-3.5" /> Agregar línea
              </button>
            }
          >
            <div className="space-y-2">
              {lines.map((line, idx) => (
                <div key={idx} className="card-raised rounded-xl p-3">
                  <div className="grid grid-cols-12 gap-2 items-start">
                    <div className="col-span-12 md:col-span-5">
                      <input
                        type="text"
                        placeholder="Descripción del producto/servicio"
                        value={line.description}
                        onChange={(e) => handleLineChange(idx, 'description', e.target.value)}
                        className="field"
                        required
                      />
                      <div className="flex items-center gap-2 mt-1">
                        <input
                          type="text"
                          placeholder="Código (opcional)"
                          value={line.code}
                          onChange={(e) => handleLineChange(idx, 'code', e.target.value)}
                          className="field text-xs flex-1"
                        />
                        {/* Badge producto asociado */}
                        {line.product_id && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-semibold whitespace-nowrap">
                            <CheckCircle2 className="w-2.5 h-2.5" />
                            Asociado
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="col-span-4 md:col-span-2">
                      <input type="number" step="0.0001" min="0" placeholder="Cant." value={line.quantity} onChange={(e) => handleLineChange(idx, 'quantity', e.target.value)} className="field text-right" />
                    </div>
                    <div className="col-span-4 md:col-span-2">
                      <input type="number" step="0.0001" min="0" placeholder="Precio" value={line.unit_price} onChange={(e) => handleLineChange(idx, 'unit_price', e.target.value)} className="field text-right" />
                    </div>
                    <div className="col-span-3 md:col-span-2">
                      <select value={line.iva_rate_code} onChange={(e) => handleLineChange(idx, 'iva_rate_code', e.target.value)} className="field text-xs">
                        {Object.entries(IVA_RATE_LABELS).map(([k, v]) => (
                          <option key={k} value={k}>{v}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-1">
                      <button type="button" onClick={() => handleRemoveLine(idx)} disabled={lines.length === 1} className="p-2 rounded-lg text-red-500 hover:bg-red-500/10 disabled:opacity-30 disabled:cursor-not-allowed">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Section>
          {/* Totales */}
          <Section title="Totales">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <TotalRow label="Subtotal sin impuestos" value={totals.subtotal} />
              <TotalRow label="Subtotal 0%" value={totals.subtotal0} />
              <TotalRow label="Subtotal gravado IVA" value={totals.subtotalTaxed} />
              <TotalRow label="Descuento" value={totals.discount} negative />
              <TotalRow label="IVA cobrado" value={totals.iva} />
              <TotalRow label="Total factura" value={totals.total} bold />
              <TotalRow label="(-) Retención RENTA" value={totals.retentionRenta} negative />
              <TotalRow label="(-) Retención IVA" value={totals.retentionIva} negative />
              <div className="md:col-span-2 mt-3 pt-3 border-t border-edge-subtle">
                <TotalRow label="Neto a pagar al proveedor" value={totals.netPayable} highlight />
              </div>
            </div>
          </Section>
          {/* Notas */}
          <Section title="Notas (opcional)">
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notas internas sobre esta compra..." className="field py-2" rows={2} style={{ height: 'auto', minHeight: 60 }} />
          </Section>
          {/* Preview contable — visible desde el inicio */}
          <Section title="Vista previa del asiento contable">
            {!expenseAccountId ? (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-400">
                <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <span>No es posible generar la vista previa porque esta compra aún no tiene una cuenta contable asignada. Selecciona una cuenta de gasto para continuar.</span>
              </div>
            ) : loadingPreview ? (
              <div className="flex items-center gap-2 py-4 text-xs text-ink-tertiary">
                <Loader2 className="w-4 h-4 animate-spin" /> Calculando cuentas...
              </div>
            ) : accountingPreview ? (
              <div className="space-y-3">
                {!accountingPreview.allConfigured && (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-400">
                    <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    <span>Algunas cuentas no están configuradas. <Link href="/contabilidad/mapeo" className="underline font-semibold">Ir a Mapeo de cuentas →</Link></span>
                  </div>
                )}
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-edge-subtle">
                      <th className="text-left py-2 px-3 text-[10px] uppercase tracking-widest text-ink-tertiary font-semibold">Cuenta</th>
                      <th className="text-left py-2 px-3 text-[10px] uppercase tracking-widest text-ink-tertiary font-semibold">Descripción</th>
                      <th className="text-right py-2 px-3 text-[10px] uppercase tracking-widest text-ink-tertiary font-semibold">Débito</th>
                      <th className="text-right py-2 px-3 text-[10px] uppercase tracking-widest text-ink-tertiary font-semibold">Crédito</th>
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
                        <td className="py-2.5 px-3">
                          {line.mapping_key === 'EXPENSE_DEFAULT' ? (
                            <div>
                              <span className="font-mono text-ink-primary">{expenseAccounts.find(a => a.id === expenseAccountId)?.code ?? line.code ?? '—'}</span>
                              <span className="ml-2 text-ink-secondary">{expenseAccounts.find(a => a.id === expenseAccountId)?.name ?? line.name ?? '—'}</span>
                              {line.line_details && (
                                <span className="ml-2 w-1.5 h-1.5 rounded-full bg-blue inline-block" title="Clic para ver origen" />
                              )}
                            </div>
                          ) : line.configured ? (
                            <div>
                              <span className="font-mono text-ink-primary">{line.code}</span>
                              <span className="ml-2 text-ink-secondary">{line.name}</span>
                              {line.line_details && (
                                <span className="ml-2 w-1.5 h-1.5 rounded-full bg-blue inline-block" title="Clic para ver origen" />
                              )}
                            </div>
                          ) : (
                            <span className="text-amber-600 dark:text-amber-400">{line.name}</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-ink-tertiary">{line.description}</td>
                        <td className="py-2.5 px-3 text-right tabular-nums text-ink-primary">{line.type === 'DEBIT' ? fmtMoney(line.amount) : '—'}</td>
                        <td className="py-2.5 px-3 text-right tabular-nums text-ink-primary">{line.type === 'CREDIT' ? fmtMoney(line.amount) : '—'}</td>
                      </tr>
                    ))}
                    <tr className="border-t-2 border-edge bg-surface-raised">
                      <td colSpan={2} className="py-2 px-3 text-xs font-semibold text-ink-secondary">Totales</td>
                      <td className="py-2 px-3 text-right tabular-nums font-bold text-ink-primary">{fmtMoney(accountingPreview.total_debit)}</td>
                      <td className="py-2 px-3 text-right tabular-nums font-bold text-ink-primary">{fmtMoney(accountingPreview.total_credit)}</td>
                    </tr>
                  </tbody>
                </table>
                <p className="text-[11px] text-ink-tertiary pt-1">
                  Este asiento se generará automáticamente al registrar la compra. Para cambiar las cuentas, <Link href="/contabilidad/mapeo" className="underline">configura el mapeo contable</Link>.
                </p>
              </div>
            ) : null}
          </Section>
          {/* Footer */}
          <div className="flex items-center justify-end gap-2 pt-3">
            <Link href={`/compras/${purchaseId}`} className="btn btn-ghost">Cancelar</Link>
            <button type="submit" disabled={saving} className="btn btn-primary">
              <Save className="w-4 h-4" />
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        </form>
      </div>
      {/* ── Modal proveedor nuevo ───────────────────────────────── */}
      {showNewSupplierModal && parsedInfo && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-surface border border-edge rounded-xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-ink-primary">Nuevo proveedor detectado</h3>
                <p className="text-xs text-ink-tertiary mt-0.5">No está registrado en tu sistema</p>
              </div>
            </div>
            <div className="bg-surface-raised rounded-lg p-3 mb-4 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-ink-tertiary">Razón social</span>
                <span className="font-semibold text-ink-primary">{parsedInfo.supplier_name}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-ink-tertiary">RUC</span>
                <span className="font-mono text-ink-primary">{parsedInfo.supplier_ruc}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-ink-tertiary">Obligado a contabilidad</span>
                <span className="text-ink-primary">{parsedInfo.obligado_contabilidad ? 'Sí' : 'No'}</span>
              </div>
            </div>
            <p className="text-xs text-ink-tertiary mb-4">
              El proveedor será creado con la información del comprobante. Podrás completar o editar sus datos posteriormente desde el módulo Proveedores.
            </p>
            {error && (
              <div className="mb-3 p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-600 dark:text-red-400">{error}</div>
            )}
            <div className="flex gap-3">
              <button onClick={() => setShowNewSupplierModal(false)} className="flex-1 py-2.5 rounded-lg border border-edge text-sm text-ink-secondary hover:text-ink-primary transition-all">
                Cancelar
              </button>
              <button onClick={handleCreateSupplierFromXml} disabled={creatingSupplier} className="flex-1 py-2.5 rounded-lg bg-blue hover:bg-blue-hover disabled:opacity-50 text-sm font-semibold text-white transition-all flex items-center justify-center gap-2">
                {creatingSupplier ? <><Loader2 className="w-4 h-4 animate-spin" /> Creando...</> : 'Crear proveedor'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ── Drawer de trazabilidad ─────────────────────────────── */}
      {drawerOpen && drawerLine && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 z-40 bg-black/20"
            onClick={() => setDrawerOpen(false)}
          />
          {/* Panel lateral */}
          <div className="fixed right-0 top-0 h-full w-full max-w-sm z-50 bg-surface border-l border-edge shadow-2xl flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-edge-subtle">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-ink-tertiary font-semibold">Origen de la cuenta</p>
                <p className="text-sm font-bold text-ink-primary mt-0.5">
                  <span className="font-mono">{drawerLine.code}</span>
                  <span className="ml-2 text-ink-secondary font-normal">{drawerLine.name}</span>
                </p>
              </div>
              <button onClick={() => setDrawerOpen(false)} className="text-ink-tertiary hover:text-ink-primary">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Contenido */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <p className="text-xs text-ink-tertiary">
                Esta cuenta recibe <span className="font-semibold text-ink-primary">{fmtMoney(drawerLine.amount)}</span> — desglose por línea:
              </p>

              {drawerLine.line_details?.map((detail: any, idx: number) => (
                <div key={idx} className="card rounded-xl p-4 space-y-3">
                  {/* Descripción de la línea */}
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-ink-tertiary font-semibold mb-1">Línea del documento</p>
                    <p className="text-sm font-medium text-ink-primary">{detail.description}</p>
                    <p className="text-xs text-ink-tertiary mt-0.5 font-mono">{fmtMoney(detail.amount)}</p>
                  </div>

                  {/* Origen */}
                  <div className="border-t border-edge-subtle pt-3">
                    <p className="text-[10px] uppercase tracking-widest text-ink-tertiary font-semibold mb-2">Origen contable</p>

                    {detail.origin === 'cuenta_directa' && (
                      <div className="space-y-1.5 text-xs">
                        <div className="flex items-center gap-2 text-ink-secondary">
                          <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                          Sin producto del catálogo
                        </div>
                        <div className="flex items-center gap-2 text-ink-secondary">
                          <span className="w-2 h-2 rounded-full bg-blue shrink-0" />
                          Cuenta directa asignada
                        </div>
                        <div className="ml-4 font-mono text-ink-primary font-semibold">
                          {detail.direct_account_code} — {detail.direct_account_name}
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
                        <div className="flex items-center gap-2 ml-3">
                          <span className="w-1.5 h-1.5 rounded-full bg-edge shrink-0" />
                          <span className="text-ink-tertiary">↓</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-purple-400 shrink-0" />
                          <span className="text-ink-secondary">Categoría:</span>
                          <span className="font-mono font-semibold text-ink-primary">{detail.category_code}</span>
                          <span className="text-ink-tertiary">{detail.category_name}</span>
                        </div>
                        <div className="flex items-center gap-2 ml-3">
                          <span className="w-1.5 h-1.5 rounded-full bg-edge shrink-0" />
                          <span className="text-ink-tertiary">↓</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-blue shrink-0" />
                          <span className="text-ink-secondary">Cuenta:</span>
                          <span className="font-mono font-semibold text-ink-primary">{drawerLine.code}</span>
                          <span className="text-ink-tertiary">{drawerLine.name}</span>
                        </div>
                      </div>
                    )}

                    {detail.origin === 'fallback' && (
                      <div className="space-y-1.5 text-xs">
                        <div className="flex items-center gap-2 text-ink-secondary">
                          <span className="w-2 h-2 rounded-full bg-edge shrink-0" />
                          Sin producto ni cuenta directa asignada
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
// ─── Subcomponentes ───────────────────────────────────────────────
function Section({ title, action, children }: {
  title: string; action?: React.ReactNode; children: React.ReactNode
}) {
  return (
    <div className="card rounded-2xl">
      <div className="flex items-center justify-between p-5 border-b border-edge-subtle">
        <h3 className="text-sm font-semibold text-ink-primary">{title}</h3>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}
function Field({ label, required, children }: {
  label: string; required?: boolean; children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-[11px] font-semibold uppercase tracking-widest text-ink-tertiary mb-1.5">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}
function TotalRow({ label, value, bold, highlight, negative }: {
  label: string; value: number; bold?: boolean; highlight?: boolean; negative?: boolean
}) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className={`text-xs ${highlight ? 'text-blue font-semibold' : bold ? 'text-ink-primary font-semibold' : 'text-ink-secondary'}`}>
        {label}
      </span>
      <span className={`text-sm font-mono ${
        highlight ? 'text-blue font-bold text-base' :
        bold ? 'text-ink-primary font-bold' :
        negative ? 'text-red-600 dark:text-red-400' :
        'text-ink-primary'
      }`}>
        {fmtMoney(value)}
      </span>
    </div>
  )
}
