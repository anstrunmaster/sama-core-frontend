'use client'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  FileText, X, ChevronLeft, ChevronRight,
  FileCode2, CheckCircle2, Search, RefreshCw, Plus
} from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://d16rb4jhhui7p6.cloudfront.net/api/v1'

interface DebitNote {
  id: string
  access_key: string
  sequential: string
  establishment: string
  emission_point: string
  authorization_number: string | null
  sri_status: string
  delivery_status: string
  xml_s3_url: string | null
  invoice_data: any
  reference_access_key: string | null
  reference_motivo: string | null
  created_at: string
}

interface Pagination {
  page: number; limit: number; total: number; totalPages: number
}

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
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}
function fmtMoney(n: number) {
  return new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD' }).format(n)
}
function getNoteNumber(note: DebitNote) {
  return `${note.establishment}-${note.emission_point}-${note.sequential}`
}
function getCustomerName(note: DebitNote) {
  return note.invoice_data?.razonSocialComprador || note.invoice_data?.identificacionComprador || '—'
}
function getTotal(note: DebitNote) {
  return note.invoice_data?.valorTotal ?? note.invoice_data?.importeTotal ?? 0
}

export default function NotasDebitoPage() {
  const router = useRouter()
  const [notes, setNotes]           = useState<DebitNote[]>([])
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 0 })
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const [downloading, setDownloading] = useState<string | null>(null)
  const [error, setError]           = useState('')

  const user     = getUser()
  const branchId = user.branchId

  const fetchNotes = useCallback(async (page = 1) => {
    if (!branchId) { setError('No hay sucursal asignada'); setLoading(false); return }
    setLoading(true); setError('')
    try {
      const res  = await fetch(`${API_URL}/debit-notes?page=${page}&limit=20`, {
        headers: { Authorization: `Bearer ${getToken()}` }
      })
      const data    = await res.json()
      const payload = data.data ?? data
      if (payload.success !== false) {
        setNotes(Array.isArray(payload.data) ? payload.data : [])
        setPagination(payload.pagination ?? { page: 1, limit: 20, total: 0, totalPages: 0 })
      } else {
        setError(payload.error || 'Error al cargar notas de débito')
      }
    } catch { setError('Error de conexión') }
    finally { setLoading(false) }
  }, [branchId])

  useEffect(() => { fetchNotes(1) }, [fetchNotes])

  const downloadXml = async (note: DebitNote) => {
    setDownloading(note.id + '-xml')
    try {
      const res = await fetch(`${API_URL}/debit-notes/${note.id}/xml`, {
        headers: { Authorization: `Bearer ${getToken()}` }
      })
      if (!res.ok) throw new Error('Error al descargar XML')
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href = url; a.download = `nota-debito-${getNoteNumber(note)}.xml`; a.click()
      URL.revokeObjectURL(url)
    } catch { alert('Error al descargar el XML') }
    finally { setDownloading(null) }
  }

  const filtered = notes.filter(n => {
    if (!search) return true
    const q = search.toLowerCase()
    return getNoteNumber(n).includes(q) || getCustomerName(n).toLowerCase().includes(q) || (n.reference_motivo || '').toLowerCase().includes(q)
  })

  const statusBadge = (status: string) => status === 'AUTORIZADO' ? (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20">
      <CheckCircle2 className="w-3 h-3" /> Autorizada
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
      <X className="w-3 h-3" /> No autorizada
    </span>
  )

  return (
    <DashboardLayout>
      <div className="p-6 space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()}
              className="p-1.5 rounded-lg border border-edge text-ink-tertiary hover:text-ink-primary hover:border-edge-strong transition-all">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-lg font-bold text-ink-primary">Notas de Débito</h1>
              <p className="text-sm text-ink-tertiary mt-0.5">
                {pagination.total} nota{pagination.total !== 1 ? 's' : ''} emitida{pagination.total !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => fetchNotes(pagination.page)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-edge-subtle border border-edge text-sm text-ink-secondary hover:text-ink-primary hover:border-edge-strong transition-all">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Actualizar
            </button>
            <button onClick={() => router.push('/notas-debito/nueva')}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue text-sm font-semibold text-white hover:bg-blue/90 transition-all">
              <Plus className="w-3.5 h-3.5" /> Nueva Nota
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-ghost pointer-events-none" />
          <input type="text" placeholder="Buscar por número, cliente o motivo..."
            value={search} onChange={e => setSearch(e.target.value)} className="field pl-10" />
        </div>

        {error && <div className="px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-600 dark:text-red-400">{error}</div>}

        {/* Table */}
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-surface-raised">
                <tr className="border-b border-edge-subtle">
                  {['N° Nota', 'Cliente', 'Factura Original', 'Motivo(s)', 'Total', 'Fecha', 'Estado', 'Acciones'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-ink-tertiary">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b border-edge-subtle">
                      {Array.from({ length: 8 }).map((_, j) => (
                        <td key={j} className="px-4 py-3.5">
                          <div className="h-4 bg-edge-subtle rounded animate-pulse" style={{ width: `${50 + j * 8}%` }} />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-16 text-center">
                      <FileText className="w-10 h-10 text-ink-ghost mx-auto mb-3" />
                      <p className="text-sm text-ink-tertiary">
                        {search ? 'No se encontraron notas de débito' : 'Aún no hay notas de débito emitidas'}
                      </p>
                      <button onClick={() => router.push('/notas-debito/nueva')}
                        className="mt-4 text-sm font-medium text-blue hover:underline">
                        Emitir primera nota →
                      </button>
                    </td>
                  </tr>
                ) : filtered.map(note => (
                  <tr key={note.id} className="border-b border-edge-subtle hover:bg-edge-subtle transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="font-mono text-sm font-semibold text-ink-primary">{getNoteNumber(note)}</div>
                      <div className="font-mono text-[10px] text-ink-ghost mt-0.5 truncate max-w-[140px]" title={note.access_key}>
                        {note.access_key}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="text-sm text-ink-primary font-medium">{getCustomerName(note)}</div>
                      <div className="text-[11px] text-ink-tertiary mt-0.5">{note.invoice_data?.identificacionComprador}</div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="font-mono text-xs text-ink-secondary truncate max-w-[130px]" title={note.reference_access_key || ''}>
                        {note.reference_access_key ? note.reference_access_key.slice(0, 18) + '...' : '—'}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="text-sm text-ink-secondary max-w-[160px] truncate" title={note.reference_motivo || ''}>
                        {note.reference_motivo || '—'}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="text-sm font-bold text-ink-primary">{fmtMoney(getTotal(note))}</div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="text-sm text-ink-secondary">{fmtDate(note.created_at)}</div>
                    </td>
                    <td className="px-4 py-3.5">{statusBadge(note.sri_status)}</td>
                    <td className="px-4 py-3.5">
                      <button onClick={() => downloadXml(note)} disabled={!!downloading || !note.xml_s3_url}
                        title="Descargar XML"
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-medium hover:bg-amber-500/20 disabled:opacity-50 transition-all">
                        {downloading === note.id + '-xml'
                          ? <RefreshCw className="w-3 h-3 animate-spin" />
                          : <FileCode2 className="w-3 h-3" />}
                        XML
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-edge-subtle">
              <span className="text-xs text-ink-tertiary">Página {pagination.page} de {pagination.totalPages} · {pagination.total} registros</span>
              <div className="flex items-center gap-2">
                <button onClick={() => fetchNotes(pagination.page - 1)} disabled={pagination.page <= 1 || loading}
                  className="p-1.5 rounded-lg border border-edge text-ink-tertiary hover:text-ink-primary disabled:opacity-30 transition-all">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button onClick={() => fetchNotes(pagination.page + 1)} disabled={pagination.page >= pagination.totalPages || loading}
                  className="p-1.5 rounded-lg border border-edge text-ink-tertiary hover:text-ink-primary disabled:opacity-30 transition-all">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
