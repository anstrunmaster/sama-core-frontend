'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, FileEdit, CheckCircle2, RotateCcw, Trash2, Loader2,
  AlertCircle, Calendar, Hash, FileText, Info, Edit3, X,
} from 'lucide-react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { journalApi } from '../api'
import {
  type JournalEntry,
  type CreateJournalEntryInput,
  STATUS_LABELS,
  STATUS_COLORS,
  SOURCE_LABELS,
  fmtMoney,
  fmtDate,
  num,
} from '../types'
import { JournalEntryForm } from '../components/JournalEntryForm'
export default function AsientoDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const [entry, setEntry] = useState<JournalEntry | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionLoading, setActionLoading] = useState<'post' | 'reverse' | 'delete' | 'save' | null>(null)
  const [editMode, setEditMode] = useState(false)
  const [confirm, setConfirm] = useState<null | {
    action: 'delete' | 'reverse' | 'post'
    title: string
    body: string
    variant: 'danger' | 'warning' | 'primary'
  }>(null)
  const [reverseReason, setReverseReason] = useState('')
  async function load() {
    if (!params.id) return
    setLoading(true)
    try {
      const e = await journalApi.getById(params.id)
      setEntry(e)
    } catch (e: any) {
      setError(e.message || 'Error al cargar')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id])
  // ─── Acciones ────────────────────────────────────────────────────
  async function handlePost() {
    if (!entry) return
    setActionLoading('post')
    setConfirm(null)
    try {
      const updated = await journalApi.post(entry.id)
      setEntry(updated)
    } catch (e: any) {
      setError(e.message || 'Error al contabilizar')
    } finally {
      setActionLoading(null)
    }
  }
  async function handleReverse() {
    if (!entry) return
    setActionLoading('reverse')
    setConfirm(null)
    try {
      const reversal = await journalApi.reverse(entry.id, reverseReason.trim() || undefined)
      // Navegar al asiento inverso recién creado
      router.push(`/contabilidad/asientos/${reversal.id}`)
    } catch (e: any) {
      setError(e.message || 'Error al reversar')
      setActionLoading(null)
    }
  }
  async function handleDelete() {
    if (!entry) return
    setActionLoading('delete')
    setConfirm(null)
    try {
      await journalApi.delete(entry.id)
      router.push('/contabilidad/asientos')
    } catch (e: any) {
      setError(e.message || 'Error al eliminar')
      setActionLoading(null)
    }
  }
  async function handleSaveEdit(data: CreateJournalEntryInput) {
    if (!entry) return
    setActionLoading('save')
    try {
      const updated = await journalApi.update(entry.id, data)
      setEntry(updated)
      setEditMode(false)
    } catch (e: any) {
      setError(e.message || 'Error al guardar')
    } finally {
      setActionLoading(null)
    }
  }
  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-6 h-6 text-blue-600 dark:text-blue-400 animate-spin" />
        </div>
      </DashboardLayout>
    )
  }
  if (!entry) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <div className="card rounded-2xl p-12 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-ink-primary mb-1">
              Asiento no encontrado
            </h3>
            <Link href="/contabilidad/asientos" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
              Volver a asientos
            </Link>
          </div>
        </div>
      </DashboardLayout>
    )
  }
  const canEdit = entry.status === 'DRAFT'
  const canPost = entry.status === 'DRAFT'
  const canReverse = entry.status === 'POSTED' && entry.source !== 'REVERSAL'
  const canDelete = entry.status === 'DRAFT'
  const statusColor = STATUS_COLORS[entry.status]
  // Modo EDIT
  if (editMode) {
    return (
      <DashboardLayout>
        <div className="p-6 space-y-5">
          <button
            onClick={() => setEditMode(false)}
            className="inline-flex items-center gap-1.5 text-sm text-ink-tertiary hover:text-ink-primary transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Cancelar edición
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <Edit3 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-ink-primary tracking-tight">
                Editar {entry.entry_number}
              </h1>
              <p className="text-sm text-ink-tertiary mt-0.5">
                Solo los borradores se pueden editar
              </p>
            </div>
          </div>
          {error && (
            <div className="flex items-start gap-2 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-600 dark:text-red-400">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
          <JournalEntryForm
            saving={actionLoading === 'save'}
            submitLabel="Guardar cambios"
            initialData={{
              entry_date: entry.entry_date?.slice(0, 10),
              description: entry.description,
              reference: entry.reference ?? undefined,
              lines: entry.lines.map((l) => ({
                account_id: l.account_id,
                account: (l.account as any) ?? null,
                description: l.description,
                debit: num(l.debit),
                credit: num(l.credit),
              })),
            }}
            onSubmit={handleSaveEdit}
            onCancel={() => setEditMode(false)}
          />
        </div>
      </DashboardLayout>
    )
  }
  // Modo VIEW
  return (
    <DashboardLayout>
      <div className="p-6 space-y-5">
        <Link
          href="/contabilidad/asientos"
          className="inline-flex items-center gap-1.5 text-sm text-ink-tertiary hover:text-ink-primary transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a asientos
        </Link>
        {error && (
          <div className="flex items-center justify-between px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-600 dark:text-red-400">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
            <button onClick={() => setError('')} className="text-red-600/60 dark:text-red-400/60 hover:text-red-600 dark:hover:text-red-400 transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
        {/* Cabecera */}
        <div className="card-raised rounded-2xl p-5">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-xl font-bold text-ink-primary tracking-tight font-mono">
                  {entry.entry_number}
                </h1>
                <span
                  className="text-[10px] uppercase tracking-wider px-2 py-1 rounded-full font-bold"
                  style={{ backgroundColor: `${statusColor}15`, color: statusColor }}
                >
                  {STATUS_LABELS[entry.status]}
                </span>
                <span className="text-[10px] uppercase tracking-wider text-ink-tertiary font-semibold">
                  {SOURCE_LABELS[entry.source]}
                </span>
              </div>
              <h2 className="text-sm text-ink-secondary">{entry.description}</h2>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {canEdit && (
                <button
                  onClick={() => setEditMode(true)}
                  disabled={!!actionLoading}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-edge-subtle border border-edge text-sm text-ink-secondary hover:text-ink-primary hover:border-edge-strong disabled:opacity-50 transition-all"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  Editar
                </button>
              )}
              {canPost && (
                <button
                  onClick={() => setConfirm({
                    action: 'post',
                    title: 'Contabilizar asiento',
                    body: `Una vez contabilizado, el asiento no se puede editar. Solo se puede reversar generando un asiento inverso. ¿Continuar?`,
                    variant: 'primary',
                  })}
                  disabled={!!actionLoading}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-sm font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 disabled:opacity-50 transition-all"
                >
                  {actionLoading === 'post' ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  Contabilizar
                </button>
              )}
              {canReverse && (
                <button
                  onClick={() => setConfirm({
                    action: 'reverse',
                    title: 'Reversar asiento',
                    body: `Se creará un asiento inverso (débitos y créditos intercambiados). El asiento original quedará marcado como REVERSADO. ¿Continuar?`,
                    variant: 'warning',
                  })}
                  disabled={!!actionLoading}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-sm font-semibold text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 disabled:opacity-50 transition-all"
                >
                  <RotateCcw className="w-4 h-4" />
                  Reversar
                </button>
              )}
              {canDelete && (
                <button
                  onClick={() => setConfirm({
                    action: 'delete',
                    title: 'Eliminar borrador',
                    body: `Se eliminará permanentemente el asiento ${entry.entry_number}. Esta acción no se puede deshacer. ¿Continuar?`,
                    variant: 'danger',
                  })}
                  disabled={!!actionLoading}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-sm font-semibold text-red-600 dark:text-red-400 hover:bg-red-500/20 disabled:opacity-50 transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                  Eliminar
                </button>
              )}
            </div>
          </div>
          {/* Metadata */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-5 pt-5 border-t border-edge-subtle">
            <MetaItem icon={Calendar} label="Fecha contable" value={fmtDate(entry.entry_date)} />
            {entry.reference && <MetaItem icon={Hash} label="Referencia" value={entry.reference} mono />}
            {entry.posted_at && <MetaItem icon={CheckCircle2} label="Contabilizado" value={fmtDate(entry.posted_at)} />}
            {entry.reversed_at && <MetaItem icon={RotateCcw} label="Reversado" value={fmtDate(entry.reversed_at)} />}
          </div>
        </div>
        {/* Info reversión */}
        {entry.reverses_entry && (
          <div className="card rounded-xl px-4 py-3 flex items-start gap-2 bg-amber-500/5 border-amber-500/20">
            <Info className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-ink-secondary leading-relaxed">
              Este asiento <strong className="text-amber-700 dark:text-amber-400">reversa</strong>{' '}
              al asiento{' '}
              <Link
                href={`/contabilidad/asientos/${entry.reverses_entry.id}`}
                className="font-mono font-semibold text-blue-600 dark:text-blue-400 hover:underline"
              >
                {entry.reverses_entry.entry_number}
              </Link>{' '}
              ({entry.reverses_entry.description}).
            </div>
          </div>
        )}
        {entry.reversed_by && (
          <div className="card rounded-xl px-4 py-3 flex items-start gap-2 bg-amber-500/5 border-amber-500/20">
            <Info className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-ink-secondary leading-relaxed">
              Este asiento fue <strong className="text-amber-700 dark:text-amber-400">reversado</strong>{' '}
              por{' '}
              <Link
                href={`/contabilidad/asientos/${entry.reversed_by.id}`}
                className="font-mono font-semibold text-blue-600 dark:text-blue-400 hover:underline"
              >
                {entry.reversed_by.entry_number}
              </Link>{' '}
              el {fmtDate(entry.reversed_by.entry_date)}.
            </div>
          </div>
        )}
        {/* Líneas */}
        <div className="card rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b border-edge-subtle flex items-center gap-2">
            <FileText className="w-4 h-4 text-ink-tertiary" />
            <h3 className="text-xs font-bold uppercase tracking-widest text-ink-secondary">
              Líneas del asiento ({entry.lines.length})
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-surface-raised">
                <tr className="border-b border-edge-subtle">
                  <th className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-ink-tertiary w-12">#</th>
                  <th className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-ink-tertiary">Cuenta</th>
                  <th className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-ink-tertiary">Descripción</th>
                  <th className="text-right px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-ink-tertiary">Débito</th>
                  <th className="text-right px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-ink-tertiary">Crédito</th>
                </tr>
              </thead>
              <tbody>
                {entry.lines.map((line, idx) => (
                  <tr key={line.id} className="border-b border-edge-subtle last:border-0 hover:bg-edge-subtle transition-colors">
                    <td className="px-4 py-3.5 text-xs text-ink-tertiary tabular-nums">{idx + 1}</td>
                    <td className="px-4 py-3.5">
                      {line.account && (
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-edge-subtle text-ink-secondary flex-shrink-0">
                            {line.account.code}
                          </span>
                          <span className="text-sm text-ink-primary">{line.account.name}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-sm text-ink-secondary max-w-[300px] truncate">
                      {line.description || '—'}
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono text-sm tabular-nums">
                      {num(line.debit) > 0 ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                          {fmtMoney(line.debit)}
                        </span>
                      ) : (
                        <span className="text-ink-ghost">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono text-sm tabular-nums">
                      {num(line.credit) > 0 ? (
                        <span className="text-blue-600 dark:text-blue-400 font-semibold">
                          {fmtMoney(line.credit)}
                        </span>
                      ) : (
                        <span className="text-ink-ghost">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-edge-subtle">
                <tr>
                  <td colSpan={3} className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-widest text-ink-secondary">
                    Totales
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-sm font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
                    {fmtMoney(entry.total_debit)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-sm font-bold text-blue-600 dark:text-blue-400 tabular-nums">
                    {fmtMoney(entry.total_credit)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
      {/* Modal de confirmación */}
      {confirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={() => !actionLoading && setConfirm(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="card-raised rounded-2xl shadow-2xl max-w-md w-full p-5"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                confirm.variant === 'danger' ? 'bg-red-500/10' :
                confirm.variant === 'warning' ? 'bg-amber-500/10' :
                'bg-blue-500/10'
              }`}>
                {confirm.variant === 'danger' && <Trash2 className="w-5 h-5 text-red-500" />}
                {confirm.variant === 'warning' && <RotateCcw className="w-5 h-5 text-amber-500" />}
                {confirm.variant === 'primary' && <CheckCircle2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />}
              </div>
              <h2 className="text-base font-semibold text-ink-primary">{confirm.title}</h2>
            </div>
            <p className="text-sm text-ink-secondary mb-4 leading-relaxed">{confirm.body}</p>
            {confirm.action === 'reverse' && (
              <div className="mb-4">
                <label className="text-xs text-ink-secondary font-medium mb-1.5 block">
                  Razón de la reversión (opcional)
                </label>
                <input
                  value={reverseReason}
                  onChange={(e) => setReverseReason(e.target.value)}
                  className="field w-full text-sm"
                  placeholder="ej: Error en monto, corrección de cuenta..."
                  maxLength={200}
                />
              </div>
            )}
            <div className="flex items-center justify-end gap-2">
              <button onClick={() => setConfirm(null)} disabled={!!actionLoading} className="btn btn-ghost">
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (confirm.action === 'post') handlePost()
                  else if (confirm.action === 'reverse') handleReverse()
                  else if (confirm.action === 'delete') handleDelete()
                }}
                disabled={!!actionLoading}
                className={`btn px-4 py-2 rounded-lg text-sm font-medium ${
                  confirm.variant === 'danger' ? 'bg-red-500 hover:bg-red-600 text-white' :
                  confirm.variant === 'warning' ? 'bg-amber-500 hover:bg-amber-600 text-white' :
                  'btn-primary'
                }`}
              >
                {actionLoading && <Loader2 className="w-4 h-4 animate-spin inline mr-1" />}
                {confirm.action === 'post' && 'Contabilizar'}
                {confirm.action === 'reverse' && 'Reversar'}
                {confirm.action === 'delete' && 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
// ────────────────────────────────────────────────────────────────────
function MetaItem({
  icon: Icon, label, value, mono,
}: { icon: any; label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div className="flex items-center gap-1 text-[10px] uppercase tracking-widest text-ink-tertiary font-bold mb-1">
        <Icon className="w-3 h-3" />
        {label}
      </div>
      <div className={`text-sm text-ink-primary ${mono ? 'font-mono' : ''}`}>{value}</div>
    </div>
  )
}
