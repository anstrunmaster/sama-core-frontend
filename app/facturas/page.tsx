'use client'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  FileText, Download, X, ChevronLeft, ChevronRight,
  FileCode2, AlertTriangle, CheckCircle2, Search, RefreshCw, Mail,
  Upload, FileCheck, Plus, ChevronDown, ChevronUp, Banknote,
} from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://d16rb4jhhui7p6.cloudfront.net/api/v1'

interface Invoice {
  id: string
  access_key: string
  sequential: string
  establishment: string
  emission_point: string
  authorization_number: string | null
  authorization_date: string | null
  sri_status: string
  delivery_status: string
  xml_s3_url: string | null
  pdf_s3_url: string | null
  invoice_data: any
  created_at: string
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

interface ReceivedWithholding {
  id: string
  invoice_id: string
  withholding_number: string
  agent_name: string
  agent_ruc: string
  retention_renta: string
  retention_iva: string
  total_retained: string
  issue_date: string
  status: string
  xml_content: string
}

interface ReconciledMovement {
  id: string
  reconciled_invoice_id: string
  amount: string
  description: string
  movement_date: string
  status: string
  reconciled_at: string
  bank_account: {
    name: string
    bank_name: string
    currency: string
  } | null
}

function getToken(): string {
  return localStorage.getItem('_at') || localStorage.getItem('accessToken') || ''
}

function getUser(): any {
  try {
    const saasAuth = localStorage.getItem('saas_auth')
    if (saasAuth) {
      const parsed = JSON.parse(saasAuth)
      return parsed.state?.user ?? parsed.user ?? parsed
    }
    return JSON.parse(localStorage.getItem('user') || '{}')
  } catch { return {} }
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('es-EC', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

function fmtDateShort(d: string) {
  return new Date(d).toLocaleDateString('es-EC', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })
}

function fmtMoney(n: number) {
  return new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD' }).format(n)
}

function getInvoiceNumber(inv: Invoice) {
  return `${inv.establishment}-${inv.emission_point}-${inv.sequential}`
}

function getCustomerName(inv: Invoice) {
  return inv.invoice_data?.razonSocialComprador || inv.invoice_data?.identificacionComprador || '—'
}

function getTotal(inv: Invoice) {
  return parseFloat(inv.invoice_data?.importeTotal ?? inv.invoice_data?.totalConImpuestos?.[0]?.baseImponible ?? 0)
}

export default function FacturasPage() {
  const router = useRouter()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 0 })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [cancelModal, setCancelModal] = useState<Invoice | null>(null)
  const [cancelling, setCancelling] = useState(false)
  const [downloading, setDownloading] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [filterWithRetention, setFilterWithRetention] = useState(false)

  const [withholdingsMap, setWithholdingsMap] = useState<Record<string, ReceivedWithholding[]>>({})
  const [paymentsMap, setPaymentsMap] = useState<Record<string, ReconciledMovement[]>>({})
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [paymentDetail, setPaymentDetail] = useState<ReconciledMovement | null>(null)
  const [previewInvoice, setPreviewInvoice] = useState<Invoice | null>(null)
  const [collectInvoice, setCollectInvoice] = useState<Invoice | null>(null)
  const [paymentEntryNumber, setPaymentEntryNumber] = useState<string | null>(null)
  const [loadingEntry, setLoadingEntry] = useState(false)

  const openPaymentDetail = async (p: ReconciledMovement) => {
    setPaymentDetail(p)
    setPaymentEntryNumber(null)
    setLoadingEntry(true)
    try {
      const res = await fetch(
        `${API_URL}/accounting/journal-entries?source=MANUAL&search=${p.id}&limit=1`,
        { headers: { Authorization: `Bearer ${getToken()}` } }
      )
      const data = await res.json()
      const entries = data.data?.data ?? data.data ?? []
      if (entries.length > 0) setPaymentEntryNumber(entries[0].entry_number)
    } catch { }
    finally { setLoadingEntry(false) }
  }

  const user = getUser()
  const branchId = user.branchId

  const fetchInvoices = useCallback(async (page = 1) => {
    if (!branchId) { setError('No hay sucursal asignada al usuario'); setLoading(false); return }
    setLoading(true)
    setError('')
    try {
      const res = await fetch(
        `${API_URL}/invoices?branchId=${branchId}&page=${page}&limit=20`,
        { headers: { Authorization: `Bearer ${getToken()}` } }
      )
      const data = await res.json()
      const payload = data.data ?? data
      if (payload.success) {
        setInvoices(Array.isArray(payload.data) ? payload.data : [])
        setPagination(payload.pagination ?? { page: 1, limit: 20, total: 0, totalPages: 0 })
      } else {
        setError(data.error || 'Error al cargar facturas')
      }
    } catch {
      setError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }, [branchId])

  const fetchAllWithholdings = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/received-withholdings/all`, {
        headers: { Authorization: `Bearer ${getToken()}` }
      })
      if (!res.ok) return
      const data = await res.json()
      const list: ReceivedWithholding[] = Array.isArray(data.data) ? data.data : Array.isArray(data) ? data : []
      const map: Record<string, ReceivedWithholding[]> = {}
      for (const w of list) {
        if (!map[w.invoice_id]) map[w.invoice_id] = []
        map[w.invoice_id].push(w)
      }
      setWithholdingsMap(map)
    } catch { }
  }, [])

  const fetchAllPayments = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/bank/movements?status=RECONCILED&limit=200`, {
        headers: { Authorization: `Bearer ${getToken()}` }
      })
      if (!res.ok) return
      const data = await res.json()
      const list: ReconciledMovement[] = Array.isArray(data.data?.data) ? data.data.data :
        Array.isArray(data.data) ? data.data : Array.isArray(data) ? data : []
      const map: Record<string, ReconciledMovement[]> = {}
      for (const m of list) {
        if (!m.reconciled_invoice_id) continue
        if (!map[m.reconciled_invoice_id]) map[m.reconciled_invoice_id] = []
        map[m.reconciled_invoice_id].push(m)
      }
      setPaymentsMap(map)
    } catch { }
  }, [])

  useEffect(() => { fetchInvoices(1) }, [fetchInvoices])
  useEffect(() => { fetchAllWithholdings() }, [fetchAllWithholdings])
  useEffect(() => { fetchAllPayments() }, [fetchAllPayments])

  const toggleRow = (invoiceId: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev)
      if (next.has(invoiceId)) next.delete(invoiceId)
      else next.add(invoiceId)
      return next
    })
  }

  const getInvoiceBalance = (inv: Invoice) => {
    const total = getTotal(inv)
    const withholdings = withholdingsMap[inv.id] ?? []
    const payments = paymentsMap[inv.id] ?? []
    const totalRetained = withholdings.reduce((s, w) => s + parseFloat(w.total_retained), 0)
    const totalPaid = payments.reduce((s, p) => s + parseFloat(p.amount), 0)
    const balance = Math.round((total - totalRetained - totalPaid) * 100) / 100
    return { total, totalRetained, totalPaid, balance }
  }

  const getCollectionStatus = (inv: Invoice) => {
    const { balance, totalRetained, totalPaid } = getInvoiceBalance(inv)
    if (totalRetained === 0 && totalPaid === 0) return 'PENDIENTE'
    if (balance <= 0.01) return 'COBRADA'
    return 'PARCIAL'
  }

  // ── Retenciones recibidas (modal) ─────────────────────────────────
  const [retentionModal, setRetentionModal] = useState<Invoice | null>(null)
  const [retentions, setRetentions] = useState<ReceivedWithholding[]>([])
  const [loadingRetentions, setLoadingRetentions] = useState(false)
  const [attachingRetention, setAttachingRetention] = useState(false)
  const [retentionXml, setRetentionXml] = useState('')
  const [retentionError, setRetentionError] = useState('')
  const [retentionSuccess, setRetentionSuccess] = useState('')

  const loadRetentions = async (inv: Invoice) => {
    setLoadingRetentions(true)
    setRetentionError('')
    try {
      const res = await fetch(`${API_URL}/received-withholdings/invoices/${inv.id}`, {
        headers: { Authorization: `Bearer ${getToken()}` }
      })
      const data = await res.json()
      const list = Array.isArray(data.data) ? data.data : Array.isArray(data) ? data : []
      setRetentions(list)
      setWithholdingsMap(prev => ({ ...prev, [inv.id]: list }))
    } catch {
      setRetentionError('Error al cargar retenciones')
    } finally {
      setLoadingRetentions(false)
    }
  }

  const openRetentionModal = (inv: Invoice) => {
    setRetentionModal(inv)
    setRetentionXml('')
    setRetentionError('')
    setRetentionSuccess('')
    setRetentions(withholdingsMap[inv.id] ?? [])
    loadRetentions(inv)
  }

  const handleAttachRetention = async () => {
    if (!retentionModal || !retentionXml.trim()) {
      setRetentionError('Selecciona el archivo XML de retención')
      return
    }
    setAttachingRetention(true)
    setRetentionError('')
    setRetentionSuccess('')
    try {
      const res = await fetch(`${API_URL}/received-withholdings/invoices/${retentionModal.id}/attach`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ xml_content: retentionXml }),
      })
      const data = await res.json()
      if (!res.ok) {
        const msg = Array.isArray(data.message) ? data.message[0] : data.message
        throw new Error(msg || 'Error al adjuntar retención')
      }
      setRetentionSuccess('Retención registrada correctamente')
      setRetentionXml('')
      await loadRetentions(retentionModal)
    } catch (e: any) {
      setRetentionError(e.message || 'Error al adjuntar retención')
    } finally {
      setAttachingRetention(false)
    }
  }

  const handleRetentionFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.xml')) {
      setRetentionError('El archivo debe ser un XML')
      return
    }
    const text = await file.text()
    setRetentionXml(text)
    setRetentionError('')
  }

  const downloadPdf = async (inv: Invoice) => {
    setDownloading(inv.access_key + '-pdf')
    try {
      const res = await fetch(`${API_URL}/invoices/${inv.access_key}/pdf`, {
        headers: { Authorization: `Bearer ${getToken()}` }
      })
      const contentType = res.headers.get('content-type') || ''
      if (contentType.includes('application/json')) {
        const data = await res.json()
        const payload = data.data ?? data
        const msg = Array.isArray(payload.message) ? payload.message[0] : payload.message
        throw new Error(msg || 'Error al descargar PDF')
      }
      if (!res.ok) throw new Error('Error al descargar PDF')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `factura-${getInvoiceNumber(inv)}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e: any) {
      alert(e.message || 'Error al descargar el PDF')
    } finally {
      setDownloading(null)
    }
  }

  const downloadXml = async (inv: Invoice) => {
    setDownloading(inv.access_key + '-xml')
    try {
      const res = await fetch(`${API_URL}/invoices/${inv.access_key}/xml`, {
        headers: { Authorization: `Bearer ${getToken()}` }
      })
      if (!res.ok) throw new Error('Error al descargar XML')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `factura-${getInvoiceNumber(inv)}.xml`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      alert('Error al descargar el XML')
    } finally {
      setDownloading(null)
    }
  }

  const [sending, setSending] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState('')

  const sendEmail = async (inv: Invoice) => {
    setSending(inv.access_key)
    try {
      const res = await fetch(`${API_URL}/invoices/${inv.access_key}/send-email`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}` }
      })
      const data = await res.json()
      const payload = data.data ?? data
      if (payload.message) {
        setSuccessMsg(payload.message)
        setTimeout(() => setSuccessMsg(''), 4000)
      } else {
        setSuccessMsg('Error al enviar el email')
      }
    } catch {
      setSuccessMsg('Error de conexión')
    } finally {
      setSending(null)
    }
  }

  const confirmCancel = async () => {
    if (!cancelModal) return
    setCancelling(true)
    try {
      setInvoices(prev =>
        prev.map(inv =>
          inv.access_key === cancelModal.access_key
            ? { ...inv, delivery_status: 'ANULADA' }
            : inv
        )
      )
      setCancelModal(null)
    } finally {
      setCancelling(false)
    }
  }

  const filtered = Array.isArray(invoices) ? invoices.filter(inv => {
    if (search) {
      const q = search.toLowerCase()
      const matchSearch = (
        getInvoiceNumber(inv).includes(q) ||
        getCustomerName(inv).toLowerCase().includes(q) ||
        (inv.invoice_data?.identificacionComprador ?? '').includes(q) ||
        (inv.invoice_data?.razonSocialComprador ?? '').toLowerCase().includes(q) ||
        inv.access_key.includes(q)
      )
      if (!matchSearch) return false
    }
    if (dateFrom) {
      const invDate = new Date(inv.created_at)
      const from = new Date(dateFrom)
      from.setHours(0, 0, 0, 0)
      if (invDate < from) return false
    }
    if (dateTo) {
      const invDate = new Date(inv.created_at)
      const to = new Date(dateTo)
      to.setHours(23, 59, 59, 999)
      if (invDate > to) return false
    }
    if (filterWithRetention) {
      if (!withholdingsMap[inv.id] || withholdingsMap[inv.id].length === 0) return false
    }
    return true
  }) : []

  const statusBadge = (status: string) => {
    if (status === 'ANULADA') return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
        <X className="w-3 h-3" /> Anulada
      </span>
    )
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20">
        <CheckCircle2 className="w-3 h-3" /> Autorizada
      </span>
    )
  }

  const collectionBadge = (status: string) => {
    if (status === 'COBRADA') return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
        <CheckCircle2 className="w-2.5 h-2.5" /> COBRADA
      </span>
    )
    if (status === 'PARCIAL') return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
        PARCIAL
      </span>
    )
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-edge-subtle text-ink-ghost border border-edge">
        PENDIENTE
      </span>
    )
  }

  const RetentionIndicator = ({ inv }: { inv: Invoice }) => {
    const ws = withholdingsMap[inv.id]
    if (!ws || ws.length === 0) return null
    const totalRetained = ws.reduce((s, w) => s + parseFloat(w.total_retained), 0)
    const totalRenta = ws.reduce((s, w) => s + parseFloat(w.retention_renta), 0)
    const totalIva = ws.reduce((s, w) => s + parseFloat(w.retention_iva), 0)
    return (
      <div className="relative group/ret inline-block">
        <button
          onClick={(e) => { e.stopPropagation(); openRetentionModal(inv) }}
          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 hover:bg-purple-500/20 transition-all"
        >
          <FileCheck className="w-2.5 h-2.5" />
          Ret.
        </button>
        <div className="absolute bottom-full left-0 mb-1.5 hidden group-hover/ret:block z-10 w-48 bg-surface-raised border border-edge rounded-lg shadow-xl p-2.5 text-xs">
          <p className="font-semibold text-ink-primary mb-1">
            Retención recibida: {fmtMoney(totalRetained)}
          </p>
          <p className="text-ink-tertiary">
            Renta: {fmtMoney(totalRenta)} · IVA: {fmtMoney(totalIva)}
          </p>
        </div>
      </div>
    )
  }

  const CollectionTraceRow = ({ inv }: { inv: Invoice }) => {
    const withholdings = withholdingsMap[inv.id] ?? []
    const payments = paymentsMap[inv.id] ?? []
    const { total, totalRetained, totalPaid, balance } = getInvoiceBalance(inv)
    const status = getCollectionStatus(inv)
    const hasMovements = withholdings.length > 0 || payments.length > 0
    return (
      <tr className="border-b border-edge-subtle">
        <td colSpan={7} className="p-0">
          <div className="px-6 py-4 bg-surface-raised/40 border-t border-edge-subtle">
            <div className="max-w-2xl rounded-xl border border-edge-subtle bg-surface-raised overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-edge-subtle bg-edge-subtle/40">
                <div className="flex items-center gap-2">
                  <Banknote className="w-3.5 h-3.5 text-ink-tertiary" />
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-ink-tertiary">
                    Trazabilidad de cobranza
                  </span>
                </div>
                {collectionBadge(status)}
              </div>
              <div className="divide-y divide-edge-subtle">
                <div className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-xs font-medium text-ink-secondary">Total factura</span>
                  <span className="font-mono text-xs font-semibold text-ink-primary tabular-nums">
                    {fmtMoney(total)}
                  </span>
                </div>
                {!hasMovements && (
                  <div className="px-4 py-4 text-center">
                    <p className="text-xs text-ink-ghost italic">Sin movimientos de cobranza registrados</p>
                  </div>
                )}
                {withholdings.map(w => (
                  <div key={w.id} className="flex items-center justify-between gap-4 px-4 py-2.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0" />
                      <button
                        onClick={() => openRetentionModal(inv)}
                        className="min-w-0 text-left hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
                      >
                        <p className="text-xs text-ink-secondary truncate hover:text-purple-600 dark:hover:text-purple-400">
                          Retención recibida
                          <span className="font-mono text-ink-tertiary"> · {w.withholding_number}</span>
                        </p>
                        <p className="text-[10px] text-ink-ghost mt-0.5 truncate">
                          {fmtDateShort(w.issue_date)} · {w.agent_name}
                        </p>
                      </button>
                    </div>
                    <span className="font-mono text-xs text-purple-600 dark:text-purple-400 tabular-nums shrink-0">
                      −{fmtMoney(parseFloat(w.total_retained))}
                    </span>
                  </div>
                ))}
                {payments.map(p => (
                  <div key={p.id} className="flex items-center justify-between gap-4 px-4 py-2.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                     <button
                        onClick={() => openPaymentDetail(p)}
                        className="min-w-0 text-left group/pay transition-colors"
                      >
                        <p className="text-xs text-ink-secondary truncate transition-colors">
                          <span className="group-hover/pay:text-emerald-600 dark:group-hover/pay:text-emerald-400 transition-colors">Pago conciliado</span>
                          <span className="font-mono"> · {p.bank_account?.name ?? 'Banco'}</span>
                        </p>
                       <p className="text-[10px] text-ink-ghost mt-0.5 truncate">
                          {fmtDateShort(p.movement_date)}{p.bank_account?.bank_name ? ` · ${p.bank_account.bank_name}` : ''}
                        </p>
                      </button>
                    </div>
                   <button
                      onClick={() => openPaymentDetail(p)}
                      className="font-mono text-xs text-emerald-600 dark:text-emerald-400 tabular-nums shrink-0 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors"
                      title="Ver detalle del pago"
                    >
                      −{fmtMoney(parseFloat(p.amount))}
                    </button>
                  </div>
                ))}
                {hasMovements && (
                  <div className="flex items-center justify-between px-4 py-2 bg-edge-subtle/20">
                    <span className="text-[10px] text-ink-tertiary">
                      Retenido {fmtMoney(totalRetained)} · Cobrado {fmtMoney(totalPaid)}
                    </span>
                    <span className="font-mono text-[10px] text-ink-tertiary tabular-nums">
                      −{fmtMoney(totalRetained + totalPaid)}
                    </span>
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between px-4 py-3 border-t border-edge bg-edge-subtle/40">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-ink-tertiary">
                  Saldo pendiente
                </span>
                <span className={`font-mono text-sm font-bold tabular-nums ${balance <= 0.01 ? 'text-emerald-600 dark:text-emerald-400' : 'text-ink-primary'}`}>
                  {fmtMoney(Math.max(0, balance))}
                </span>
              </div>
            </div>
          </div>
        </td>
      </tr>
    )
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-5">
        {successMsg && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-green-500/10 border border-green-500/20 text-sm text-green-600 dark:text-green-400 animate-fade-up">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            {successMsg}
          </div>
        )}
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="p-1.5 rounded-lg border border-edge text-ink-tertiary hover:text-ink-primary hover:border-edge-strong transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-lg font-bold text-ink-primary">Facturas Emitidas</h1>
              <p className="text-sm text-ink-tertiary mt-0.5">
                {pagination?.total ?? 0} factura{(pagination?.total ?? 0) !== 1 ? 's' : ''} en total
              </p>
            </div>
          </div>
          <button
            onClick={() => fetchInvoices(pagination.page)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-edge-subtle border border-edge text-sm text-ink-secondary hover:text-ink-primary hover:border-edge-strong transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </button>
        </div>
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-ghost pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar por número, RUC, cliente o clave de acceso..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="field pl-10"
          />
        </div>
        {/* Filtros */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <label className="text-xs text-ink-tertiary whitespace-nowrap">Desde</label>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="field text-sm" />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-ink-tertiary whitespace-nowrap">Hasta</label>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="field text-sm" />
          </div>
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={filterWithRetention}
              onChange={e => setFilterWithRetention(e.target.checked)}
              className="rounded border-edge accent-purple-600"
            />
            <span className="text-xs text-ink-secondary">Con retención</span>
          </label>
          {(dateFrom || dateTo || filterWithRetention) && (
            <button
              onClick={() => { setDateFrom(''); setDateTo(''); setFilterWithRetention(false) }}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-edge text-xs text-ink-tertiary hover:text-ink-primary transition-all"
            >
              <X className="w-3 h-3" /> Limpiar filtros
            </button>
          )}
        </div>
        {/* Error */}
        {error && (
          <div className="px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}
        {/* Table */}
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-surface-raised">
                <tr className="border-b border-edge-subtle">
                  {['', 'N° Factura', 'Cliente', 'Total', 'Fecha', 'Estado', 'Acciones'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-ink-tertiary first:w-8 first:px-2">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b border-edge-subtle">
                      {Array.from({ length: 7 }).map((_, j) => (
                        <td key={j} className="px-4 py-3.5">
                          <div className="h-4 bg-edge-subtle rounded animate-pulse" style={{ width: `${60 + j * 10}%` }} />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-16 text-center">
                      <FileText className="w-10 h-10 text-ink-ghost mx-auto mb-3" />
                      <p className="text-sm text-ink-tertiary">
                        {search ? 'No se encontraron facturas' : 'Aún no hay facturas emitidas'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  filtered.flatMap(inv => {
                    const isExpanded = expandedRows.has(inv.id)
                    const collStatus = getCollectionStatus(inv)
                    const rows: React.ReactElement[] = [
                      <tr
                        key={inv.id}
                        onClick={() => toggleRow(inv.id)}
                        className="border-b border-edge-subtle hover:bg-edge-subtle transition-colors group cursor-pointer"
                      >
                        <td className="px-2 py-3.5 w-8">
                          <button
                            onClick={(e) => { e.stopPropagation(); toggleRow(inv.id) }}
                            className="p-1 rounded text-ink-ghost hover:text-ink-tertiary transition-colors"
                          >
                            {isExpanded
                              ? <ChevronUp className="w-3.5 h-3.5" />
                              : <ChevronDown className="w-3.5 h-3.5" />
                            }
                          </button>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2">
                            <div className="font-mono text-sm font-semibold text-ink-primary">
                              {getInvoiceNumber(inv)}
                            </div>
                            <RetentionIndicator inv={inv} />
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <div className="font-mono text-[10px] text-ink-ghost truncate max-w-[140px]" title={inv.access_key}>
                              {inv.access_key}
                            </div>
                            {collStatus !== 'PENDIENTE' && collectionBadge(collStatus)}
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="text-sm text-ink-primary font-medium">{getCustomerName(inv)}</div>
                          <div className="text-[11px] text-ink-tertiary mt-0.5">
                            {inv.invoice_data?.identificacionComprador}
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="text-sm font-bold text-ink-primary">{fmtMoney(getTotal(inv))}</div>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="text-sm text-ink-secondary">{fmtDate(inv.created_at)}</div>
                        </td>
                        <td className="px-4 py-3.5">
                          {statusBadge(inv.delivery_status)}
                        </td>
                        <td className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-1.5">
                                        <button
              onClick={() => setPreviewInvoice(inv)}
              title="Ver detalle de la factura"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-edge-subtle border border-edge text-ink-secondary text-xs font-medium hover:text-ink-primary hover:border-edge-strong transition-all"
            >
              <FileText className="w-3 h-3" />
              Ver
            </button>
                            <button
                              onClick={() => downloadPdf(inv)}
                              disabled={!!downloading}
                              title="Descargar PDF"
                              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-medium hover:bg-blue-500/20 disabled:opacity-50 transition-all"
                            >
                              {downloading === inv.access_key + '-pdf' ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                              PDF
                            </button>
                            <button
                              onClick={() => downloadXml(inv)}
                              disabled={!!downloading || !inv.xml_s3_url}
                              title="Descargar XML"
                              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-medium hover:bg-amber-500/20 disabled:opacity-50 transition-all"
                            >
                              {downloading === inv.access_key + '-xml' ? <RefreshCw className="w-3 h-3 animate-spin" /> : <FileCode2 className="w-3 h-3" />}
                              XML
                            </button>
                            <button
                              onClick={() => sendEmail(inv)}
                              disabled={!!sending}
                              title="Enviar por email"
                              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400 text-xs font-medium hover:bg-green-500/20 disabled:opacity-50 transition-all"
                            >
                              {sending === inv.access_key ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Mail className="w-3 h-3" />}
                              Email
                            </button>
                                        {inv.sri_status === 'AUTORIZADO' && getCollectionStatus(inv) !== 'COBRADA' && (
              <button
                onClick={() => setCollectInvoice(inv)}
                title="Registrar cobro de esta factura"
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-medium hover:bg-emerald-500/20 transition-all"
              >
                <Banknote className="w-3 h-3" />
                Cobrar
              </button>
            )}
                            {inv.sri_status === 'AUTORIZADO' && (
                              <button
                                onClick={() => openRetentionModal(inv)}
                                title="Gestionar retenciones recibidas"
                                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-400 text-xs font-medium hover:bg-purple-500/20 transition-all"
                              >
                                <FileCheck className="w-3 h-3" />
                                Retención
                              </button>
                            )}
                            {inv.delivery_status !== 'ANULADA' && (
                              <button
                                onClick={() => setCancelModal(inv)}
                                title="Anular factura"
                                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-medium hover:bg-red-500/20 transition-all"
                              >
                                <X className="w-3 h-3" />
                                Anular
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ]
                    if (isExpanded) {
                      rows.push(<CollectionTraceRow key={`${inv.id}-trace`} inv={inv} />)
                    }
                    return rows
                  })
                )}
              </tbody>
            </table>
          </div>
          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-edge-subtle">
              <span className="text-xs text-ink-tertiary">
                Página {pagination.page} de {pagination.totalPages} · {pagination.total} registros
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => fetchInvoices(pagination.page - 1)}
                  disabled={pagination.page <= 1 || loading}
                  className="p-1.5 rounded-lg border border-edge text-ink-tertiary hover:text-ink-primary hover:border-edge-strong disabled:opacity-30 transition-all"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => fetchInvoices(pagination.page + 1)}
                  disabled={pagination.page >= pagination.totalPages || loading}
                  className="p-1.5 rounded-lg border border-edge text-ink-tertiary hover:text-ink-primary hover:border-edge-strong disabled:opacity-30 transition-all"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Anular */}
        {cancelModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="card-raised w-full max-w-md mx-4 p-6 shadow-2xl">
              <div className="flex items-start gap-4 mb-5">
                <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-ink-primary">Anular factura</h3>
                  <p className="text-sm text-ink-tertiary mt-1">
                    Esta acción marcará la factura como anulada en el sistema. No afecta el SRI.
                  </p>
                </div>
              </div>
              <div className="bg-edge-subtle border border-edge-subtle rounded-lg p-3 mb-5 space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-ink-tertiary">N° Factura</span>
                  <span className="font-mono font-semibold text-ink-primary">{getInvoiceNumber(cancelModal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-ink-tertiary">Cliente</span>
                  <span className="text-ink-secondary">{getCustomerName(cancelModal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-ink-tertiary">Total</span>
                  <span className="font-bold text-ink-primary">{fmtMoney(getTotal(cancelModal))}</span>
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setCancelModal(null)} className="flex-1 py-2.5 rounded-lg border border-edge text-sm text-ink-secondary hover:text-ink-primary hover:border-edge-strong transition-all">
                  Cancelar
                </button>
                <button onClick={confirmCancel} disabled={cancelling} className="flex-1 py-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-sm font-semibold text-red-600 dark:text-red-400 hover:bg-red-500/20 disabled:opacity-50 transition-all">
                  {cancelling ? 'Anulando...' : 'Confirmar anulación'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Retenciones Recibidas */}
        {retentionModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="card-raised w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]">
              <div className="flex items-center justify-between p-5 border-b border-edge-subtle shrink-0">
                <div>
                  <h3 className="text-base font-bold text-ink-primary">Retenciones recibidas</h3>
                  <p className="text-xs text-ink-tertiary mt-0.5">
                    Factura {getInvoiceNumber(retentionModal)} · {getCustomerName(retentionModal)}
                  </p>
                </div>
                <button onClick={() => setRetentionModal(null)} className="text-ink-tertiary hover:text-ink-primary transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="overflow-y-auto flex-1 p-5 space-y-4">
                {loadingRetentions ? (
                  <div className="flex items-center gap-2 text-xs text-ink-tertiary py-2">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Cargando retenciones...
                  </div>
                ) : retentions.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-[10px] uppercase tracking-widest text-ink-tertiary font-semibold">
                      Retenciones registradas ({retentions.length})
                    </p>
                    {retentions.map((r: any) => (
                      <div key={r.id} className="bg-surface-raised rounded-xl p-4 border border-edge-subtle">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-mono text-sm font-semibold text-ink-primary">{r.withholding_number}</span>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20">
                            <CheckCircle2 className="w-3 h-3" /> {r.status}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                          <div>
                            <p className="text-ink-tertiary">Agente retenedor</p>
                            <p className="text-ink-primary font-medium mt-0.5">{r.agent_name}</p>
                            <p className="text-ink-ghost font-mono">{r.agent_ruc}</p>
                          </div>
                          <div>
                            <p className="text-ink-tertiary">Fecha emisión</p>
                            <p className="text-ink-primary mt-0.5">{new Date(r.issue_date).toLocaleDateString('es-EC')}</p>
                          </div>
                          <div>
                            <p className="text-ink-tertiary">Ret. Renta</p>
                            <p className="text-ink-primary font-mono font-semibold mt-0.5">{fmtMoney(parseFloat(r.retention_renta))}</p>
                          </div>
                          <div>
                            <p className="text-ink-tertiary">Ret. IVA</p>
                            <p className="text-ink-primary font-mono font-semibold mt-0.5">{fmtMoney(parseFloat(r.retention_iva))}</p>
                          </div>
                        </div>
                        <div className="mt-2 pt-2 border-t border-edge-subtle flex justify-between items-center">
                          <span className="text-xs text-ink-tertiary">Total retenido</span>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-ink-primary">{fmtMoney(parseFloat(r.total_retained))}</span>
                            <button
                              onClick={() => {
                                const blob = new Blob([r.xml_content], { type: 'text/xml' })
                                const url = URL.createObjectURL(blob)
                                const a = document.createElement('a')
                                a.href = url
                                a.download = `retencion-${r.withholding_number}.xml`
                                a.click()
                                URL.revokeObjectURL(url)
                              }}
                              className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-edge-subtle border border-edge text-[10px] text-ink-tertiary hover:text-ink-primary hover:border-edge-strong transition-all"
                            >
                              <FileCode2 className="w-3 h-3" />
                              Ver XML
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-xs text-ink-tertiary">
                    No hay retenciones registradas para esta factura
                  </div>
                )}
                <div className="border-t border-edge-subtle pt-4">
                  <p className="text-[10px] uppercase tracking-widest text-ink-tertiary font-semibold mb-3">
                    Adjuntar nueva retención
                  </p>
                  <div
                    className="border-2 border-dashed border-edge rounded-xl p-6 text-center cursor-pointer hover:border-blue/40 hover:bg-blue/5 transition-all"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => { e.preventDefault(); const file = e.dataTransfer.files?.[0]; if (file) handleRetentionFile(file) }}
                    onClick={() => document.getElementById('retention-xml-input')?.click()}
                  >
                    <Upload className="w-6 h-6 text-ink-ghost mx-auto mb-2" />
                    <p className="text-xs text-ink-tertiary">
                      Arrastra el XML de retención aquí o{' '}
                      <span className="text-blue font-medium">selecciona el archivo</span>
                    </p>
                    <input id="retention-xml-input" type="file" accept=".xml,text/xml" className="hidden"
                      onChange={(e) => { const file = e.target.files?.[0]; if (file) handleRetentionFile(file) }}
                    />
                  </div>
                  {retentionXml && (
                    <div className="mt-2 flex items-center gap-2 p-2 rounded-lg bg-green-500/5 border border-green-500/20">
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" />
                      <span className="text-xs text-green-600 dark:text-green-400">XML cargado — {retentionXml.length.toLocaleString()} caracteres</span>
                      <button onClick={() => setRetentionXml('')} className="ml-auto text-ink-ghost hover:text-ink-tertiary">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                  {retentionError && (
                    <div className="mt-2 flex items-center gap-2 p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-600 dark:text-red-400">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      {retentionError}
                    </div>
                  )}
                  {retentionSuccess && (
                    <div className="mt-2 flex items-center gap-2 p-2 rounded-lg bg-green-500/10 border border-green-500/20 text-xs text-green-600 dark:text-green-400">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      {retentionSuccess}
                    </div>
                  )}
                </div>
              </div>
              <div className="p-5 border-t border-edge-subtle flex gap-3 shrink-0">
                <button onClick={() => setRetentionModal(null)} className="flex-1 py-2.5 rounded-lg border border-edge text-sm text-ink-secondary hover:text-ink-primary transition-all">
                  Cerrar
                </button>
                <button
                  onClick={handleAttachRetention}
                  disabled={attachingRetention || !retentionXml}
                  className="flex-1 py-2.5 rounded-lg bg-blue text-white text-sm font-semibold hover:bg-blue-hover disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                >
                  {attachingRetention
                    ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Procesando...</>
                    : retentionXml
                      ? <><CheckCircle2 className="w-3.5 h-3.5" /> XML cargado — Registrar retención</>
                      : <><Plus className="w-3.5 h-3.5" /> Registrar retención</>
                  }
                </button>
              </div>
            </div>
          </div>
        )}
                {collectInvoice && (
          <CollectInvoiceModal
            inv={collectInvoice}
            onClose={() => setCollectInvoice(null)}
            onSuccess={() => {
              setCollectInvoice(null)
              fetchAllPayments()
              setSuccessMsg('Factura cobrada correctamente.')
            }}
          />
        )}
        {previewInvoice && <InvoicePreviewModal inv={previewInvoice} onClose={() => setPreviewInvoice(null)} />}
        {/* Modal detalle de pago */}
        {paymentDetail && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="card-raised w-full max-w-sm shadow-2xl">
              <div className="flex items-center justify-between p-4 border-b border-edge-subtle">
                <h3 className="text-sm font-bold text-ink-primary">Detalle del pago</h3>
                <button onClick={() => setPaymentDetail(null)} className="text-ink-tertiary hover:text-ink-primary transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-4 space-y-3">
                <Row label="Monto" value={fmtMoney(parseFloat(paymentDetail.amount))} />
                <Row label="Fecha" value={fmtDateShort(paymentDetail.movement_date)} />
                <Row label="Banco" value={paymentDetail.bank_account?.bank_name ?? '—'} />
                <Row label="Cuenta" value={paymentDetail.bank_account?.name ?? '—'} />
                <Row label="Moneda" value={paymentDetail.bank_account?.currency ?? 'USD'} />
                <Row label="Estado" value="CONCILIADO" highlight />
                {paymentDetail.reconciled_at && (
                  <Row label="Conciliado el" value={fmtDateShort(paymentDetail.reconciled_at)} />
                )}
                <div className="pt-2 border-t border-edge-subtle">
                  {loadingEntry ? (
                    <div className="flex items-center gap-2 text-xs text-ink-tertiary">
                      <RefreshCw className="w-3 h-3 animate-spin" /> Buscando asiento...
                    </div>
                  ) : paymentEntryNumber ? (
                    <Row label="Asiento contable" value={paymentEntryNumber} mono />
                  ) : (
                    <p className="text-xs text-ink-ghost">Sin asiento contable registrado</p>
                  )}
                </div>
              </div>
              <div className="p-4 border-t border-edge-subtle">
                <button
                  onClick={() => setPaymentDetail(null)}
                  className="w-full py-2 rounded-lg border border-edge text-sm text-ink-secondary hover:text-ink-primary transition-all"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

function Row({ label, value, highlight, mono }: {
  label: string; value: string; highlight?: boolean; mono?: boolean
}) {
  return (
    <div className="flex justify-between items-center text-xs">
      <span className="text-ink-tertiary">{label}</span>
      <span className={`${mono ? 'font-mono' : ''} ${highlight ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-ink-primary font-medium'}`}>
        {value}
      </span>
    </div>
  )
}
interface InvoicePreviewProps {
  inv: {
    id: string
    access_key: string
    establishment: string
    emission_point: string
    sequential: string
    sri_status: string
    delivery_status: string
    invoice_data: any
    created_at: string
  }
  onClose: () => void
}

function InvoicePreviewModal({ inv, onClose }: InvoicePreviewProps) {
  const data = inv.invoice_data ?? {}

  // ── Helpers locales ──────────────────────────────────────────────
  const num = (v: any) => {
    const n = typeof v === 'string' ? parseFloat(v) : Number(v ?? 0)
    return Number.isFinite(n) ? n : 0
  }

  const money = (n: any) =>
    new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD' }).format(num(n))

  const invoiceNumber = `${inv.establishment}-${inv.emission_point}-${inv.sequential}`

  // ── Ítems ────────────────────────────────────────────────────────
    const detalles: any[] = (() => {
    const d = data.detalles ?? data.detalle ?? data.items ?? data.detalleFactura
    if (!d) return []
    if (Array.isArray(d)) return d
    if (Array.isArray(d.detalle)) return d.detalle
    if (typeof d === 'object') return [d]
    return []
  })()

  // ── Impuestos totales ────────────────────────────────────────────
  const taxes: any[] = (() => {
    const raw = data.totalConImpuestos
    if (!raw) return []
    if (Array.isArray(raw)) return raw
    if (Array.isArray(raw.totalImpuesto)) return raw.totalImpuesto
    if (typeof raw === 'object') return [raw]
    return []
  })()

  // ── Pagos ────────────────────────────────────────────────────────
  const pagos: any[] = (() => {
    const raw = data.pagos
    if (!raw) return []
    if (Array.isArray(raw)) return raw
    if (Array.isArray(raw.pago)) return raw.pago
    if (typeof raw === 'object') return [raw]
    return []
  })()

  const PAYMENT_LABELS: Record<string, string> = {
    '01': 'Sin utilización del sistema financiero',
    '15': 'Compensación de deudas',
    '16': 'Tarjeta de débito',
    '17': 'Dinero electrónico',
    '18': 'Tarjeta de prepago',
    '19': 'Tarjeta de crédito',
    '20': 'Otros (sistema financiero)',
    '21': 'Endoso de títulos',
  }

  const IVA_LABELS: Record<string, string> = {
    '0': '0%', '2': '12%', '3': '14%', '4': '15%',
    '5': '5%', '6': 'No objeto', '7': 'Exento', '8': '8%',
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="card-raised w-full max-w-3xl shadow-2xl flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-edge-subtle shrink-0">
          <div>
            <h3 className="text-base font-bold text-ink-primary">
              Factura {invoiceNumber}
            </h3>
            <p className="text-xs text-ink-tertiary mt-0.5">
              {new Date(inv.created_at).toLocaleDateString('es-EC', {
                day: '2-digit', month: 'long', year: 'numeric'
              })}
              {' · '}
              <span className={`font-semibold ${inv.sri_status === 'AUTORIZADO' ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}`}>
                {inv.sri_status}
              </span>
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-ink-tertiary hover:text-ink-primary hover:bg-edge-subtle transition-all">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body scrollable */}
        <div className="overflow-y-auto flex-1 p-5 space-y-5">

          {/* Datos del cliente */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-xl border border-edge-subtle bg-surface-raised p-4 space-y-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-ink-tertiary">Datos del cliente</p>
              <div className="space-y-1.5">
                <PreviewRow label="Razón social" value={data.razonSocialComprador ?? '—'} />
                <PreviewRow label="Identificación" value={data.identificacionComprador ?? '—'} mono />
                <PreviewRow label="Tipo ID" value={
                  data.tipoIdentificacionComprador === '04' ? 'RUC' :
                  data.tipoIdentificacionComprador === '05' ? 'Cédula' : 'Consumidor Final'
                } />
                {data.dirección && <PreviewRow label="Dirección" value={data.dirección} />}
              </div>
            </div>
            <div className="rounded-xl border border-edge-subtle bg-surface-raised p-4 space-y-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-ink-tertiary">Datos del documento</p>
              <div className="space-y-1.5">
                <PreviewRow label="N° Factura" value={invoiceNumber} mono />
                <PreviewRow label="Clave de acceso" value={inv.access_key.slice(0, 20) + '...'} mono />
                <PreviewRow label="Fecha emisión" value={data.fechaEmision ?? new Date(inv.created_at).toLocaleDateString('es-EC')} />
                {data.infoAdicional?.vendedor && <PreviewRow label="Vendedor" value={data.infoAdicional.vendedor} />}
                {data.infoAdicional?.diasCredito && Number(data.infoAdicional.diasCredito) > 0 && (
                  <PreviewRow label="Días crédito" value={data.infoAdicional.diasCredito} />
                )}
              </div>
            </div>
          </div>

          {/* Tabla de ítems */}
          <div className="rounded-xl border border-edge-subtle overflow-hidden">
            <div className="px-4 py-2.5 bg-surface-raised border-b border-edge-subtle">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-ink-tertiary">
                Detalle de ítems ({detalles.length})
              </p>
            </div>
            {detalles.length === 0 ? (
              <div className="px-4 py-6 text-center text-xs text-ink-ghost italic">
                No hay ítems disponibles en esta factura
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-edge-subtle bg-edge-subtle/30">
                      {['Código', 'Descripción', 'Cant.', 'P. Unitario', 'Desc.', 'IVA', 'Subtotal'].map(h => (
                        <th key={h} className="text-left px-3 py-2 text-[10px] font-semibold uppercase tracking-widest text-ink-tertiary whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {detalles.map((item: any, idx: number) => {
                      const codigo = item.codigoPrincipal ?? item.codigo ?? '—'
                      const desc = item.descripcion ?? '—'
                      const cant = num(item.cantidad)
                      const precio = num(item.precioUnitario)
                      const descuento = num(item.descuento)
                      const subtotalSinImp = num(item.precioTotalSinImpuesto)

                      // IVA del ítem
                      const itemTaxes: any[] = (() => {
                        const raw = item.impuestos
                        if (!raw) return []
                        if (Array.isArray(raw)) return raw
                        if (Array.isArray(raw.impuesto)) return raw.impuesto
                        if (typeof raw === 'object') return [raw]
                        return []
                      })()

                      const ivaTax = itemTaxes.find((t: any) => String(t.codigo) === '2')
                      const ivaLabel = ivaTax ? (IVA_LABELS[String(ivaTax.codigoPorcentaje)] ?? '?') : '—'
                      const ivaVal = ivaTax ? num(ivaTax.valor) : 0
                      const total = subtotalSinImp + ivaVal

                      return (
                        <tr key={idx} className="border-b border-edge-subtle last:border-0 hover:bg-edge-subtle/20">
                          <td className="px-3 py-2.5 font-mono text-[11px] text-ink-tertiary whitespace-nowrap">{codigo}</td>
                          <td className="px-3 py-2.5 text-xs text-ink-primary max-w-[200px]">
                            <p className="truncate">{desc}</p>
                            {item.detallesAdicionales && (
                              <p className="text-[10px] text-ink-ghost italic mt-0.5 truncate">{
                                typeof item.detallesAdicionales === 'string'
                                  ? item.detallesAdicionales
                                  : JSON.stringify(item.detallesAdicionales)
                              }</p>
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-xs text-ink-secondary whitespace-nowrap tabular-nums text-right">{cant}</td>
                          <td className="px-3 py-2.5 font-mono text-xs text-ink-secondary whitespace-nowrap tabular-nums text-right">{money(precio)}</td>
                          <td className="px-3 py-2.5 font-mono text-xs text-ink-ghost whitespace-nowrap tabular-nums text-right">
                            {descuento > 0 ? money(descuento) : '—'}
                          </td>
                          <td className="px-3 py-2.5 text-xs text-ink-tertiary whitespace-nowrap text-center">{ivaLabel}</td>
                          <td className="px-3 py-2.5 font-mono text-xs font-semibold text-ink-primary whitespace-nowrap tabular-nums text-right">
                            {money(total)}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Totales + Pagos */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {/* Totales */}
            <div className="rounded-xl border border-edge-subtle bg-surface-raised overflow-hidden">
              <div className="px-4 py-2.5 border-b border-edge-subtle bg-edge-subtle/40">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-ink-tertiary">Resumen de valores</p>
              </div>
              <div className="p-4 space-y-2">
                <PreviewRow label="Subtotal sin impuestos" value={money(data.totalSinImpuestos ?? 0)} mono />
                {data.totalDescuento > 0 && (
                  <PreviewRow label="Descuento" value={`- ${money(data.totalDescuento)}`} mono />
                )}
                {taxes.map((t: any, i: number) => (
                  <PreviewRow
                    key={i}
                    label={`IVA ${IVA_LABELS[String(t.codigoPorcentaje)] ?? t.codigoPorcentaje}`}
                    value={money(t.valor)}
                    mono
                  />
                ))}
                <div className="pt-2 border-t border-edge-subtle">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-bold text-ink-primary">TOTAL</span>
                    <span className="font-mono text-base font-bold text-ink-primary tabular-nums">
                      {money(data.importeTotal ?? 0)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Formas de pago */}
            <div className="rounded-xl border border-edge-subtle bg-surface-raised overflow-hidden">
              <div className="px-4 py-2.5 border-b border-edge-subtle bg-edge-subtle/40">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-ink-tertiary">Formas de pago</p>
              </div>
              <div className="p-4 space-y-2">
                {pagos.length === 0 ? (
                  <p className="text-xs text-ink-ghost italic">Sin información de pago</p>
                ) : pagos.map((p: any, i: number) => (
                  <div key={i} className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs text-ink-secondary truncate">
                        {PAYMENT_LABELS[String(p.medio)] ?? `Forma ${p.medio}`}
                      </p>
                      {p.plazo && Number(p.plazo) > 0 && (
                        <p className="text-[10px] text-ink-ghost">
                          Plazo: {p.plazo} {p.unidadTiempo ?? 'días'}
                        </p>
                      )}
                    </div>
                    <span className="font-mono text-xs font-semibold text-ink-primary tabular-nums shrink-0">
                      {money(p.total)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Info adicional si existe */}
          {data.infoAdicional && Object.keys(data.infoAdicional).length > 0 && (
            <div className="rounded-xl border border-edge-subtle bg-surface-raised overflow-hidden">
              <div className="px-4 py-2.5 border-b border-edge-subtle bg-edge-subtle/40">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-ink-tertiary">Información adicional</p>
              </div>
              <div className="p-4 grid grid-cols-2 gap-2">
                {Object.entries(data.infoAdicional)
                  .filter(([, v]) => v && String(v).trim())
                  .map(([k, v]) => (
                    <PreviewRow key={k} label={k} value={String(v)} />
                  ))
                }
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-edge-subtle shrink-0">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-lg border border-edge text-sm text-ink-secondary hover:text-ink-primary hover:border-edge-strong transition-all"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}

function PreviewRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between items-start gap-3 text-xs">
      <span className="text-ink-tertiary shrink-0">{label}</span>
      <span className={`${mono ? 'font-mono' : 'font-medium'} text-ink-primary text-right`}>{value}</span>
    </div>
  )
}
// ─── CollectInvoiceModal ─────────────────────────────────────────────────────
// Pegar al final de app/facturas/page.tsx después de PreviewRow

interface CollectInvoiceModalProps {
  inv: Invoice
  onClose: () => void
  onSuccess: () => void
}

function CollectInvoiceModal({ inv, onClose, onSuccess }: CollectInvoiceModalProps) {
  const [bankAccounts, setBankAccounts] = useState<any[]>([])
  const [bankAccountId, setBankAccountId] = useState('')
  const [amount, setAmount]               = useState('')
  const [paymentDate, setPaymentDate]     = useState(() => new Date().toISOString().split('T')[0])
  const [reference, setReference]         = useState('')
  const [description, setDescription]     = useState('')
  const [transactionType, setTransactionType] = useState('')
  const [saving, setSaving]               = useState(false)
  const [error, setError]                 = useState('')

  const total         = getTotal(inv)
  const customerName  = getCustomerName(inv)
  const invoiceNumber = getInvoiceNumber(inv)

  // Cargar cuentas bancarias al abrir
  useEffect(() => {
    fetch(`${API_URL}/bank/accounts?limit=50`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
      .then(r => r.json())
      .then(d => {
        const list = Array.isArray(d.data?.data) ? d.data.data
          : Array.isArray(d.data) ? d.data : []
        setBankAccounts(list)
        if (list.length > 0) setBankAccountId(list[0].id)
      })
      .catch(() => setError('Error al cargar cuentas bancarias'))
  }, [])

  // Precargar monto con el total de la factura
  useEffect(() => {
    setAmount(total.toFixed(2))
  }, [total])

  const handleCollect = async () => {
    if (!bankAccountId) { setError('Selecciona una cuenta bancaria'); return }
    if (!amount || parseFloat(amount) <= 0) { setError('El monto debe ser mayor a 0'); return }
    if (!paymentDate) { setError('Selecciona la fecha de cobro'); return }

    setSaving(true)
    setError('')
    try {
      const res = await fetch(`${API_URL}/bank/collect-invoice`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          invoice_id:      inv.id,
          bank_account_id: bankAccountId,
          amount:          parseFloat(amount),
          payment_date:    paymentDate,
          reference:       reference.trim() || undefined,
          description:     description.trim() || undefined,
          transaction_type: transactionType || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        const msg = Array.isArray(data.message) ? data.message[0] : data.message
        throw new Error(msg || 'Error al registrar el cobro')
      }
      onSuccess()
    } catch (e: any) {
      setError(e.message || 'Error al registrar el cobro')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="card-raised w-full max-w-md shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-edge-subtle">
          <div>
            <h3 className="text-base font-bold text-ink-primary flex items-center gap-2">
              <Banknote className="w-4 h-4 text-emerald-500" />
              Registrar cobro
            </h3>
            <p className="text-xs text-ink-tertiary mt-0.5">
              Factura {invoiceNumber} · {customerName}
            </p>
          </div>
          <button onClick={onClose} className="text-ink-tertiary hover:text-ink-primary transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">

          {/* Resumen de la factura */}
          <div className="rounded-xl bg-emerald-500/5 border border-emerald-500/20 p-3 space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-ink-tertiary">Total factura</span>
              <span className="font-mono font-bold text-ink-primary">{fmtMoney(total)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-ink-tertiary">Cliente</span>
              <span className="text-ink-secondary">{customerName}</span>
            </div>
          </div>

          {/* Cuenta bancaria */}
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-widest text-ink-tertiary block mb-1.5">
              Cuenta bancaria *
            </label>
            {bankAccounts.length === 0 ? (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                No hay cuentas bancarias configuradas. Ve a Bancos para crear una.
              </p>
            ) : (
              <select
                value={bankAccountId}
                onChange={e => setBankAccountId(e.target.value)}
                className="field w-full text-sm"
                disabled={saving}
              >
                {bankAccounts.map(acc => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} — {acc.bank_name} · Saldo: {fmtMoney(Number(acc.current_balance))}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Monto y fecha */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-widest text-ink-tertiary block mb-1.5">
                Monto cobrado *
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                className="field w-full text-sm text-right font-mono"
                disabled={saving}
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-widest text-ink-tertiary block mb-1.5">
                Fecha de cobro *
              </label>
              <input
                type="date"
                value={paymentDate}
                onChange={e => setPaymentDate(e.target.value)}
                className="field w-full text-sm"
                disabled={saving}
              />
            </div>
          </div>
                  {/* Tipo de transacción */}
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-widest text-ink-tertiary block mb-1.5">
              Tipo de transacción
            </label>
            <select
              value={transactionType}
              onChange={e => setTransactionType(e.target.value)}
              className="field w-full text-sm"
              disabled={saving}
            >
              <option value="">Sin especificar</option>
              <option value="TRANSFER">Transferencia bancaria</option>
              <option value="CHECK">Cheque</option>
              <option value="CASH">Efectivo</option>
              <option value="CARD">Tarjeta de débito/crédito</option>
              <option value="DEPOSIT">Depósito bancario</option>
              <option value="WITHDRAWAL">Retiro bancario</option>
              <option value="OTHER">Otro</option>
            </select>
          </div>
          {/* Referencia */}
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-widest text-ink-tertiary block mb-1.5">
              N° Referencia <span className="text-ink-ghost font-normal normal-case tracking-normal">(cheque, transferencia, etc.)</span>
            </label>
            <input
              type="text"
              value={reference}
              onChange={e => setReference(e.target.value)}
              className="field w-full text-sm"
              placeholder="Opcional"
              disabled={saving}
            />
          </div>

          {/* Descripción */}
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-widest text-ink-tertiary block mb-1.5">
              Descripción <span className="text-ink-ghost font-normal normal-case tracking-normal">(se genera automáticamente si no se completa)</span>
            </label>
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="field w-full text-sm"
              placeholder={`Cobro factura ${invoiceNumber} — ${customerName}`}
              disabled={saving}
            />
          </div>

          {/* Info contable */}
          <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-blue-500/5 border border-blue-500/15 text-xs text-blue-600 dark:text-blue-400">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>Se creará el movimiento bancario, la conciliación y el asiento contable automáticamente.</span>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-600 dark:text-red-400">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-5 border-t border-edge-subtle">
          <button
            onClick={onClose}
            disabled={saving}
            className="flex-1 py-2.5 rounded-lg border border-edge text-sm text-ink-secondary hover:text-ink-primary hover:border-edge-strong disabled:opacity-50 transition-all"
          >
            Cancelar
          </button>
          <button
            onClick={handleCollect}
            disabled={saving || !bankAccountId || !amount || !paymentDate}
            className="flex-1 py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
          >
            {saving
              ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Registrando...</>
              : <><Banknote className="w-3.5 h-3.5" /> Registrar cobro</>
            }
          </button>
        </div>
      </div>
    </div>
  )
}
