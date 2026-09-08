'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import {
  ArrowLeft, Upload, FileText, Plus, Save,
  AlertCircle, CheckCircle2, Loader2,
} from 'lucide-react'
import { purchasesApi, suppliersApi, fmtMoney } from '../api'
import { mappingsApi } from '../../contabilidad/api-4c'
import {
  type Supplier,
  type ExpenseAccount, type LineForm, type RetentionForm,
} from '../types'
import { useTaxCatalog } from '../hooks/useTaxCatalog'
import { getCurrentSession } from '@/lib/session'
import { DocumentoSection } from './components/DocumentoSection'
import { LineasSection } from './components/LineasSection'
import { TotalesSection } from './components/TotalesSection'
import { PreviewContable } from './components/PreviewContable'
import { ModalProveedor } from './components/ModalProveedor'
import { ModalProductos } from './components/ModalProductos'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://d16rb4jhhui7p6.cloudfront.net/api/v1'

interface UnresolvedLine {
  lineIndex: number
  description: string
  xmlCode: string | null
  quantity: string
  unit_price: string
  resolvedProductId: string | null
  resolvedProductName: string | null
}

interface ProductResult {
  id: string
  code: string
  name: string
  type: string
  unit: string | null
}

interface CategoryOption {
  id: string
  code: string
  name: string
  category_type: string
}

const emptyProductForm = {
  code: '', name: '',
  type: 'PRODUCT' as 'PRODUCT' | 'SERVICE',
  category_id: '', unit: '', price: '', cost_price: '',
}

const EMPTY_LINE = (n: number): LineForm => ({
  line_number: n, code: '', description: '',
  quantity: '1', unit_price: '0', discount: '0', iva_rate_code: '4',
})

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

export default function NuevaCompraPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── Session ───────────────────────────────────────────────────
  const session = getCurrentSession()
  const isRetentionAgent = session?.agenteRetencion != null
  const resolucionRetencion = session?.agenteRetencion ?? null

  // ── Form state ────────────────────────────────────────────────
  const [supplierId, setSupplierId] = useState('')
  const [documentType, setDocumentType] = useState('FACTURA')
  const [establishment, setEstablishment] = useState('001')
  const [emissionPoint, setEmissionPoint] = useState('001')
  const [sequential, setSequential] = useState('')
  const [accessKey, setAccessKey] = useState('')
  const [issueDate, setIssueDate] = useState(new Date().toISOString().slice(0, 10))
  const [paymentForm, setPaymentForm] = useState('01')
  const [notes, setNotes] = useState('')
  const [codSustento, setCodSustento] = useState('')
  const [sourceXml, setSourceXml] = useState('')
  const [lines, setLines] = useState<LineForm[]>([EMPTY_LINE(1)])
  const [retentions, setRetentions] = useState<RetentionForm[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])

  // ── UI state ──────────────────────────────────────────────────
  const [saving, setSaving] = useState(false)
  const [parsing, setParsing] = useState(false)
  const [error, setError] = useState('')
  const [parsedInfo, setParsedInfo] = useState<{
    supplier_ruc: string; supplier_name: string
    existing_supplier_id: string | null; obligado_contabilidad: boolean
  } | null>(null)
  const [showNewSupplierModal, setShowNewSupplierModal] = useState(false)
  const [creatingSupplier, setCreatingSupplier] = useState(false)
  const [savedDraftId, setSavedDraftId] = useState<string | null>(null)
  const [accountingPreview, setAccountingPreview] = useState<any | null>(null)
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [expenseAccounts, setExpenseAccounts] = useState<ExpenseAccount[]>([])
  const [expenseAccountId, setExpenseAccountId] = useState<string>('')

  // ── Modal productos ───────────────────────────────────────────
  const [unresolvedLines, setUnresolvedLines] = useState<UnresolvedLine[]>([])
  const [showProductModal, setShowProductModal] = useState(false)
  const [resolvingIndex, setResolvingIndex] = useState(0)
  const [productSearch, setProductSearch] = useState('')
  const [productResults, setProductResults] = useState<ProductResult[]>([])
  const [searchingProducts, setSearchingProducts] = useState(false)
  const [showCreateProduct, setShowCreateProduct] = useState(false)
  const [directAccountId, setDirectAccountId] = useState<string>('')
  const [directAccounts, setDirectAccounts] = useState<{ id: string; code: string; name: string }[]>([])
  const [newProductForm, setNewProductForm] = useState(emptyProductForm)
  const [creatingProduct, setCreatingProduct] = useState(false)
  const [categories, setCategories] = useState<CategoryOption[]>([])
  const [categoryId, setCategoryId] = useState('')

  // ── Catálogos ─────────────────────────────────────────────────
  const { items: supportCodes } = useTaxCatalog('SUPPORT_CODE')
  const { items: retRentaOptions } = useTaxCatalog('RETENTION_RENTA')
  const { items: retIvaOptions } = useTaxCatalog('RETENTION_IVA')

  // ── Totales ───────────────────────────────────────────────────
  const totals = (() => {
    let subtotal0 = 0, subtotalTaxed = 0, subtotalExempt = 0
    let subtotalNoTax = 0, iva = 0, discount = 0

    for (const l of lines) {
      const qty = parseFloat(l.quantity) || 0
      const price = parseFloat(l.unit_price) || 0
      const disc = parseFloat(l.discount) || 0
      const lineSubtotal = Math.max(0, qty * price - disc)
      discount += disc

      const pct = (c: string) => ({ '2': 12, '3': 14, '4': 15, '5': 5, '8': 8 }[c] ?? 0)

      switch (l.iva_rate_code) {
        case '0': subtotal0 += lineSubtotal; break
        case '6': subtotalNoTax += lineSubtotal; break
        case '7': subtotalExempt += lineSubtotal; break
        default: subtotalTaxed += lineSubtotal; iva += (lineSubtotal * pct(l.iva_rate_code)) / 100
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

    return { subtotal0, subtotalTaxed, subtotalExempt, subtotalNoTax, iva, discount, subtotal, total, retentionRenta, retentionIva, netPayable: total - retentionRenta - retentionIva }
  })()

  // ── Cargar datos iniciales ────────────────────────────────────
  useEffect(() => {
    suppliersApi.list({ limit: 500, is_active: true }).then((res) => setSuppliers(res.data || [])).catch(() => setSuppliers([]))

    purchasesApi.expenseAccounts().then((accounts) => {
      setExpenseAccounts(accounts)
      setDirectAccounts(accounts)
      if (accounts.length === 1) setExpenseAccountId(accounts[0].id)
    }).catch(() => { setExpenseAccounts([]); setDirectAccounts([]) })

    mappingsApi.list().then((mappings) => {
      const m = mappings.find((m: any) => m.key === 'EXPENSE_DEFAULT')
      if (m?.account_id) setExpenseAccountId(m.account_id)
    }).catch(() => {})

    fetch(`${API_URL}/product-categories`, { credentials: 'include' })
      .then(r => r.json())
      .then(d => setCategories(Array.isArray(d.data ?? d) ? (d.data ?? d) : []))
      .catch(() => setCategories([]))
  }, [])

  // ── Búsqueda productos ────────────────────────────────────────
  const searchProducts = useCallback(async (q: string) => {
    if (!q.trim()) { setProductResults([]); return }
    setSearchingProducts(true)
    try {
      const res = await fetch(`${API_URL}/products?search=${encodeURIComponent(q)}&limit=10`, { credentials: 'include' })
      const data = await res.json()
      const payload = data.data ?? data
      setProductResults(Array.isArray(payload.items) ? payload.items : Array.isArray(payload) ? payload : [])
    } catch { setProductResults([]) }
    finally { setSearchingProducts(false) }
  }, [])

  useEffect(() => {
    const t = setTimeout(() => searchProducts(productSearch), 300)
    return () => clearTimeout(t)
  }, [productSearch, searchProducts])

  // ── Handlers ──────────────────────────────────────────────────
  const handleFileUpload = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.xml')) { setError('El archivo debe ser un XML'); return }
    setParsing(true); setError('')
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

      setLines(p.lines.map((l, idx) => ({
        line_number: idx + 1, code: l.code ?? '', description: l.description,
        quantity: String(l.quantity), unit_price: String(l.unit_price),
        discount: String(l.discount), iva_rate_code: l.iva_rate_code, product_id: undefined,
      })))

      setSupplierId(result.existing_supplier_id ?? '')
      setParsedInfo({
        supplier_ruc: p.supplier.ruc, supplier_name: p.supplier.legal_name,
        existing_supplier_id: result.existing_supplier_id,
        obligado_contabilidad: p.obligado_contabilidad,
      })

      if (result.retentions_suggested.applies) {
        setRetentions(result.retentions_suggested.suggestions.map((s) => ({
          type: s.type, code: s.code, description: s.description,
          base_amount: String(s.base_amount), rate_pct: String(s.rate_pct),
        })))
      }

      if (!result.existing_supplier_id) setShowNewSupplierModal(true)
    } catch (e: any) { setError(e.message || 'No se pudo parsear el XML') }
    finally { setParsing(false) }
  }

  const handleCreateSupplierFromXml = async () => {
    if (!sourceXml) return
    setCreatingSupplier(true); setError('')
    try {
      const res = await suppliersApi.createFromXml(sourceXml)
      setSupplierId(res.supplier.id)
      const updated = await suppliersApi.list({ limit: 500, is_active: true })
      setSuppliers(updated.data || [])
      setShowNewSupplierModal(false)
      setParsedInfo(prev => prev ? { ...prev, existing_supplier_id: res.supplier.id } : null)
    } catch (e: any) { setError(e.message || 'Error al crear el proveedor') }
    finally { setCreatingSupplier(false) }
  }

  const saveAsDraftWithLines = async (currentLines: LineForm[]) => {
    setSaving(true); setError('')
    try {
      const payload = {
        supplier_id: supplierId, document_type: documentType,
        establishment, emission_point: emissionPoint, sequential,
        access_key: accessKey || undefined, issue_date: issueDate,
        payment_form: paymentForm, cod_sustento: codSustento || undefined,
        expense_account_id: expenseAccountId || undefined,
        notes: notes || undefined, source_xml: sourceXml || undefined,
        origin: sourceXml ? 'XML_UPLOAD' : 'MANUAL',
        lines: currentLines.map((l) => ({
          line_number: l.line_number, code: l.code || undefined,
          description: l.description, quantity: parseFloat(l.quantity),
          unit_price: parseFloat(l.unit_price), discount: parseFloat(l.discount) || 0,
          iva_rate_code: l.iva_rate_code,
          ...(l.product_id && { product_id: l.product_id }),
          ...(l.direct_account_id && { direct_account_id: l.direct_account_id }),
          ...(l.category_id && { category_id: l.category_id }),
          ...(l.ret_renta_code && { ret_renta_code: l.ret_renta_code }),
          ...(l.ret_renta_pct && { ret_renta_pct: parseFloat(l.ret_renta_pct) }),
          ...(l.ret_iva_code && { ret_iva_code: l.ret_iva_code }),
          ...(l.ret_iva_pct && { ret_iva_pct: parseFloat(l.ret_iva_pct) }),
        })),
        retentions: retentions.map((r) => ({
          type: r.type, code: r.code, description: r.description || undefined,
          base_amount: parseFloat(r.base_amount), rate_pct: parseFloat(r.rate_pct),
        })),
      }

      const created = await purchasesApi.create(payload)
      setSavedDraftId(created.id)

      setLoadingPreview(true)
      try {
        const preview = await purchasesApi.accountingPreview(created.id, expenseAccountId || undefined)
        setAccountingPreview(preview)
        if (preview?.lines) {
          const el = preview.lines.find((l: any) => l.mapping_key === 'EXPENSE_DEFAULT')
          if (el?.account_id) setExpenseAccountId(el.account_id)
        }
      } catch {} finally { setLoadingPreview(false) }
    } catch (e: any) { setError(e.message || 'Error al guardar') }
    finally { setSaving(false) }
  }

  const buildUnresolvedLines = (): UnresolvedLine[] =>
    lines.filter(l => l.description.trim() && !l.product_id).map(l => ({
      lineIndex: l.line_number - 1, description: l.description,
      xmlCode: l.code || null, quantity: l.quantity, unit_price: l.unit_price,
      resolvedProductId: null, resolvedProductName: null,
    }))

  // Limpia el estado del modal al pasar a la siguiente línea
  const resetResolverFields = () => {
    setProductSearch('')
    setProductResults([])
    setShowCreateProduct(false)
    setDirectAccountId('')
    setCategoryId('')
  }

  const resolveLineWithProduct = (product: ProductResult) => {
    const current = unresolvedLines[resolvingIndex]
    if (!current) return

    const updatedLines = lines.map((l, i) =>
      i === current.lineIndex
        ? { ...l, product_id: product.id, direct_account_id: undefined, category_id: undefined }
        : l
    )
    setLines(updatedLines)

    const updated = unresolvedLines.map((ul, i) =>
      i === resolvingIndex ? { ...ul, resolvedProductId: product.id, resolvedProductName: `${product.code} — ${product.name}` } : ul
    )
    setUnresolvedLines(updated)

    const next = updated.findIndex((ul, i) => i > resolvingIndex && !ul.resolvedProductId)
    if (next >= 0) { setResolvingIndex(next); resetResolverFields() }
    else { setShowProductModal(false); saveAsDraftWithLines(updatedLines) }
  }

  const resolveLineWithAccount = (accountId: string, accountCode: string, accountName: string) => {
    const current = unresolvedLines[resolvingIndex]
    if (!current) return

    const updatedLines = lines.map((l, i) =>
      i === current.lineIndex
        ? { ...l, direct_account_id: accountId, product_id: undefined, category_id: undefined }
        : l
    )
    setLines(updatedLines)

    const updatedUnresolved = unresolvedLines.map((ul, i) =>
      i === resolvingIndex ? { ...ul, resolvedProductId: `ACCOUNT:${accountId}`, resolvedProductName: `${accountCode} — ${accountName}` } : ul
    )
    setUnresolvedLines(updatedUnresolved)

    const next = updatedUnresolved.findIndex((ul, i) => i > resolvingIndex && !ul.resolvedProductId)
    if (next >= 0) { setResolvingIndex(next); resetResolverFields() }
    else { setShowProductModal(false); saveAsDraftWithLines(updatedLines) }
  }

  const resolveLineWithCategory = (categoryId: string, categoryCode: string, categoryName: string) => {
    const current = unresolvedLines[resolvingIndex]
    if (!current) return

    const updatedLines = lines.map((l, i) =>
      i === current.lineIndex
        ? { ...l, category_id: categoryId, product_id: undefined, direct_account_id: undefined }
        : l
    )
    setLines(updatedLines)

    const updatedUnresolved = unresolvedLines.map((ul, i) =>
      i === resolvingIndex
        ? { ...ul, resolvedProductId: `CATEGORY:${categoryId}`, resolvedProductName: `${categoryCode} — ${categoryName}` }
        : ul
    )
    setUnresolvedLines(updatedUnresolved)

    const next = updatedUnresolved.findIndex((ul, i) => i > resolvingIndex && !ul.resolvedProductId)
    if (next >= 0) { setResolvingIndex(next); resetResolverFields() }
    else { setShowProductModal(false); saveAsDraftWithLines(updatedLines) }
  }

  const skipLine = () => {
    const next = unresolvedLines.findIndex((ul, i) => i > resolvingIndex && !ul.resolvedProductId)
    if (next >= 0) { setResolvingIndex(next); resetResolverFields() }
    else { setShowProductModal(false); saveAsDraftWithLines(lines) }
  }

  const handleCreateNewProduct = async () => {
    if (!newProductForm.code.trim() || !newProductForm.name.trim() || !newProductForm.price) return
    setCreatingProduct(true)
    try {
      const res = await fetch(`${API_URL}/products`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: newProductForm.code.toUpperCase(), name: newProductForm.name,
          type: newProductForm.type, price: parseFloat(newProductForm.price),
          ...(newProductForm.cost_price && { cost_price: parseFloat(newProductForm.cost_price) }),
          ...(newProductForm.unit && { unit: newProductForm.unit }),
          ...(newProductForm.category_id && { category_id: newProductForm.category_id }),
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(Array.isArray(data.message) ? data.message[0] : data.message); return }
      const created = data.data ?? data
      resolveLineWithProduct({ id: created.id, code: created.code, name: created.name, type: created.type, unit: created.unit })
      setShowCreateProduct(false)
      setNewProductForm(emptyProductForm)
    } catch (e: any) { setError(e.message || 'Error al crear el producto') }
    finally { setCreatingProduct(false) }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError('')

    if (!supplierId) { setError('Selecciona un proveedor'); return }
    if (!sequential) { setError('Ingresa el secuencial del documento'); return }
    if (lines.some((l) => !l.description.trim() || parseFloat(l.quantity) <= 0)) {
      setError('Cada línea debe tener descripción y cantidad mayor a 0'); return
    }

    if (sourceXml) {
      const unresolved = buildUnresolvedLines()
      if (unresolved.length > 0) {
        setUnresolvedLines(unresolved); setResolvingIndex(0)
        resetResolverFields()
        setShowProductModal(true); return
      }
    }

    await saveAsDraftWithLines(lines)
  }

  return (
    <DashboardLayout>
      <div className="p-6 max-w-screen-2xl mx-auto space-y-5">

        {/* Header */}
        <div>
          <Link href="/compras" className="inline-flex items-center gap-1 text-xs text-ink-tertiary hover:text-ink-primary mb-2">
            <ArrowLeft className="w-3.5 h-3.5" /> Volver a compras
          </Link>
          <h1 className="text-xl font-bold text-ink-primary tracking-tight">Nueva compra</h1>
          <p className="text-sm text-ink-tertiary mt-0.5">Carga manualmente o sube el XML que te envió el proveedor</p>
        </div>

        {/* Upload XML */}
        <div className="card rounded-2xl p-5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-muted flex items-center justify-center flex-shrink-0">
              <Upload className="w-5 h-5 text-blue" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-ink-primary mb-1">Cargar desde XML del proveedor</h3>
              <p className="text-xs text-ink-tertiary mb-3">Sube el XML que te llegó por correo. El sistema completa el formulario y sugiere retenciones.</p>
              <input ref={fileInputRef} type="file" accept=".xml,text/xml" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload(f) }} className="hidden" />
              <button onClick={() => fileInputRef.current?.click()} disabled={parsing} className="btn btn-secondary">
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
                  <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">XML procesado correctamente</div>
                  <div className="text-[11px] text-ink-secondary mt-1">Proveedor: <strong>{parsedInfo.supplier_name}</strong> · RUC {parsedInfo.supplier_ruc}</div>
                  {!parsedInfo.existing_supplier_id && (
                    <div className="text-[11px] text-amber-600 dark:text-amber-400 mt-2">⚠ Proveedor nuevo detectado — pendiente de confirmar creación.</div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">

          {error && (
            <div className="card rounded-xl p-3 flex items-start gap-2 text-xs text-red-600 dark:text-red-400">
              <AlertCircle className="w-3.5 h-3.5 mt-0.5" /><span>{error}</span>
            </div>
          )}

          <Section title="Datos del documento">
            <DocumentoSection
              supplierId={supplierId} documentType={documentType}
              establishment={establishment} emissionPoint={emissionPoint}
              sequential={sequential} accessKey={accessKey}
              issueDate={issueDate} paymentForm={paymentForm}
              codSustento={codSustento} suppliers={suppliers}
              supportCodes={supportCodes} isRetentionAgent={isRetentionAgent}
              resolucionRetencion={resolucionRetencion}
              onSupplierChange={setSupplierId} onDocumentTypeChange={setDocumentType}
              onEstablishmentChange={setEstablishment} onEmissionPointChange={setEmissionPoint}
              onSequentialChange={setSequential} onAccessKeyChange={setAccessKey}
              onIssueDateChange={setIssueDate} onPaymentFormChange={setPaymentForm}
              onCodSustentoChange={setCodSustento}
            />
          </Section>

          <Section
            title="Detalle"
            action={<button type="button" onClick={() => setLines([...lines, EMPTY_LINE(lines.length + 1)])} className="btn btn-ghost text-xs"><Plus className="w-3.5 h-3.5" /> Agregar línea</button>}
          >
            <LineasSection
              lines={lines} isRetentionAgent={false}
              retRentaOptions={retRentaOptions} retIvaOptions={retIvaOptions}
              onChange={(idx, field, value) => setLines(lines.map((l, i) => i === idx ? { ...l, [field]: value } : l))}
              onRemove={(idx) => { if (lines.length === 1) return; setLines(lines.filter((_, i) => i !== idx).map((l, i) => ({ ...l, line_number: i + 1 }))) }}
            />
          </Section>

          <Section title="Totales">
            <TotalesSection totals={totals} />
          </Section>

          <Section title="Notas (opcional)">
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notas internas sobre esta compra..." className="field py-2" rows={2} style={{ height: 'auto', minHeight: 60 }} />
          </Section>

          {savedDraftId && (
            <Section title="Vista previa del asiento contable">
              <PreviewContable
                expenseAccountId={expenseAccountId} expenseAccounts={expenseAccounts}
                loadingPreview={loadingPreview} accountingPreview={accountingPreview}
              />
            </Section>
          )}

          <div className="flex items-center justify-end gap-2 pt-3">
            <Link href="/compras" className="btn btn-ghost">Cancelar</Link>
            {!savedDraftId ? (
              <button type="submit" disabled={saving} className="btn btn-primary">
                <Save className="w-4 h-4" />
                {saving ? 'Guardando...' : 'Guardar como borrador'}
              </button>
            ) : (
              <button type="button" onClick={() => router.push(`/compras/${savedDraftId}`)} className="btn btn-primary">
                Ver detalle →
              </button>
            )}
          </div>

        </form>
      </div>

      {showNewSupplierModal && parsedInfo && (
        <ModalProveedor
          parsedInfo={parsedInfo} error={error}
          creatingSupplier={creatingSupplier}
          onCancel={() => setShowNewSupplierModal(false)}
          onCreate={handleCreateSupplierFromXml}
        />
      )}

      {showProductModal && unresolvedLines[resolvingIndex] && (
        <ModalProductos
          unresolvedLines={unresolvedLines} resolvingIndex={resolvingIndex}
          productSearch={productSearch} productResults={productResults}
          searchingProducts={searchingProducts} showCreateProduct={showCreateProduct}
          directAccountId={directAccountId} directAccounts={directAccounts}
          categoryId={categoryId}
          newProductForm={newProductForm} creatingProduct={creatingProduct}
          categories={categories}
          onClose={() => setShowProductModal(false)}
          onSearchChange={setProductSearch}
          onResolveWithProduct={resolveLineWithProduct}
          onResolveWithAccount={resolveLineWithAccount}
          onResolveWithCategory={resolveLineWithCategory}
          onDirectAccountChange={setDirectAccountId}
          onCategoryChange={setCategoryId}
          onSkip={skipLine}
          onShowCreateProduct={() => {
            setShowCreateProduct(true)
            setNewProductForm({
              ...emptyProductForm,
              name: unresolvedLines[resolvingIndex].description,
              price: unresolvedLines[resolvingIndex].unit_price,
              code: unresolvedLines[resolvingIndex].xmlCode ?? '',
            })
          }}
          onHideCreateProduct={() => setShowCreateProduct(false)}
          onNewProductFormChange={setNewProductForm}
          onCreateProduct={handleCreateNewProduct}
          onNavigate={(idx) => { setResolvingIndex(idx); resetResolverFields() }}
        />
      )}
    </DashboardLayout>
  )
}
