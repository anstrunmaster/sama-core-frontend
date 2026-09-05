'use client'
import { useMemo, useState } from 'react'
import {
  Plus, Trash2, AlertCircle, CheckCircle2, Loader2, Calendar, FileText, Hash,
} from 'lucide-react'
import { AccountPicker } from './AccountPicker'
import type { CreateJournalEntryInput, JournalLineInput } from '../types'
import type { Account } from '../../cuentas/types'
import { fmtMoney } from '../types'

interface Props {
  initialData?: {
    entry_date?: string
    description?: string
    reference?: string
    lines?: Array<{
      account_id: string
      account?: Account | null
      description?: string | null
      debit: number
      credit: number
    }>
  }
  submitLabel?: string
  saving?: boolean
  onSubmit: (data: CreateJournalEntryInput) => void
  onCancel?: () => void
}

interface LineRow {
  key: string // local id para react keys
  account: Account | null
  description: string
  debit: string // string para input
  credit: string
}

const BALANCE_TOLERANCE = 0.01

/**
 * Form de creación/edición de asiento contable.
 *
 * - Tabla de líneas: mínimo 2, dinámica
 * - Cada línea: cuenta + descripción + débito OR crédito
 * - Balance en vivo: indicador verde cuando débitos = créditos
 * - Submit deshabilitado hasta que esté balanceado y todas las líneas completas
 */
export function JournalEntryForm({
  initialData, submitLabel, saving, onSubmit, onCancel,
}: Props) {
  const [entryDate, setEntryDate] = useState(
    initialData?.entry_date ?? new Date().toISOString().slice(0, 10),
  )
  const [description, setDescription] = useState(initialData?.description ?? '')
  const [reference, setReference] = useState(initialData?.reference ?? '')

  const [lines, setLines] = useState<LineRow[]>(() => {
    if (initialData?.lines && initialData.lines.length > 0) {
      return initialData.lines.map((l, i) => ({
        key: `init-${i}`,
        account: (l.account as Account) ?? null,
        description: l.description ?? '',
        debit: l.debit > 0 ? String(l.debit) : '',
        credit: l.credit > 0 ? String(l.credit) : '',
      }))
    }
    return [
      { key: 'l-0', account: null, description: '', debit: '', credit: '' },
      { key: 'l-1', account: null, description: '', debit: '', credit: '' },
    ]
  })

  // ─── Cálculos en vivo ────────────────────────────────────────────
  const totals = useMemo(() => {
    let debit = 0
    let credit = 0
    for (const l of lines) {
      debit += parseFloat(l.debit) || 0
      credit += parseFloat(l.credit) || 0
    }
    return {
      debit: round2(debit),
      credit: round2(credit),
      diff: round2(debit - credit),
    }
  }, [lines])

  const isBalanced = Math.abs(totals.diff) <= BALANCE_TOLERANCE && totals.debit > 0

  // ─── Validación de formulario ────────────────────────────────────
  const validationError = useMemo(() => {
    if (!description.trim()) return 'Falta la descripción'
    if (lines.length < 2) return 'Mínimo 2 líneas'

    for (let i = 0; i < lines.length; i++) {
      const l = lines[i]
      if (!l.account) return `Línea ${i + 1}: falta cuenta`
      const d = parseFloat(l.debit) || 0
      const c = parseFloat(l.credit) || 0
      if (d > 0 && c > 0) return `Línea ${i + 1}: no puede tener débito y crédito a la vez`
      if (d === 0 && c === 0) return `Línea ${i + 1}: debe tener débito o crédito`
      if (d < 0 || c < 0) return `Línea ${i + 1}: montos deben ser positivos`
    }

    if (!isBalanced) {
      if (totals.debit === 0) return 'El asiento está vacío'
      return `Diferencia: ${fmtMoney(Math.abs(totals.diff))}`
    }

    return null
  }, [description, lines, isBalanced, totals])

  // ─── Acciones sobre líneas ───────────────────────────────────────
  function updateLine(idx: number, patch: Partial<LineRow>) {
    setLines((prev) =>
      prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)),
    )
  }

  function addLine() {
    setLines((prev) => [
      ...prev,
      { key: `l-${Date.now()}`, account: null, description: '', debit: '', credit: '' },
    ])
  }

  function removeLine(idx: number) {
    if (lines.length <= 2) return // mínimo 2
    setLines((prev) => prev.filter((_, i) => i !== idx))
  }

  // Helper: si escriben en débito, limpiar crédito (y viceversa)
  function setDebit(idx: number, value: string) {
    updateLine(idx, { debit: value, credit: value ? '' : lines[idx].credit })
  }
  function setCredit(idx: number, value: string) {
    updateLine(idx, { credit: value, debit: value ? '' : lines[idx].debit })
  }

  // ─── Submit ──────────────────────────────────────────────────────
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (validationError) return

    const data: CreateJournalEntryInput = {
      entry_date: entryDate,
      description: description.trim(),
      reference: reference.trim() || undefined,
      lines: lines.map((l) => ({
        account_id: l.account!.id,
        description: l.description.trim() || undefined,
        debit: parseFloat(l.debit) || 0,
        credit: parseFloat(l.credit) || 0,
      })),
    }
    onSubmit(data)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* ── Cabecera ── */}
      <div className="card rounded-2xl p-5 space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-widest text-ink-secondary">
          Datos del asiento
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-[11px] text-ink-secondary font-medium mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-3 h-3" />
              Fecha contable *
            </label>
            <input
              type="date"
              value={entryDate}
              onChange={(e) => setEntryDate(e.target.value)}
              className="field w-full text-sm"
              required
              disabled={saving}
            />
          </div>

          <div className="md:col-span-2">
            <label className="text-[11px] text-ink-secondary font-medium mb-1.5 flex items-center gap-1.5">
              <Hash className="w-3 h-3" />
              Referencia (opcional)
            </label>
            <input
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              className="field w-full text-sm"
              placeholder="ej: TRF-12345, FAC-001-001-000001234"
              maxLength={200}
              disabled={saving}
            />
          </div>
        </div>

        <div>
          <label className="text-[11px] text-ink-secondary font-medium mb-1.5 flex items-center gap-1.5">
            <FileText className="w-3 h-3" />
            Descripción *
          </label>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="field w-full text-sm"
            placeholder="ej: Pago de arriendo mensual mayo 2026"
            required
            minLength={2}
            maxLength={500}
            disabled={saving}
          />
        </div>
      </div>

      {/* ── Líneas ── */}
      <div className="card rounded-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-edge-subtle flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-widest text-ink-secondary">
            Líneas del asiento ({lines.length})
          </h3>
          <button
            type="button"
            onClick={addLine}
            disabled={saving}
            className="btn btn-ghost text-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            Agregar línea
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-raised">
              <tr className="border-b border-edge-subtle">
                <th className="text-left px-3 py-2 text-[10px] font-semibold uppercase tracking-widest text-ink-tertiary w-12">#</th>
                <th className="text-left px-3 py-2 text-[10px] font-semibold uppercase tracking-widest text-ink-tertiary min-w-[200px]">Cuenta</th>
                <th className="text-left px-3 py-2 text-[10px] font-semibold uppercase tracking-widest text-ink-tertiary min-w-[180px]">Descripción</th>
                <th className="text-right px-3 py-2 text-[10px] font-semibold uppercase tracking-widest text-ink-tertiary min-w-[120px]">Débito</th>
                <th className="text-right px-3 py-2 text-[10px] font-semibold uppercase tracking-widest text-ink-tertiary min-w-[120px]">Crédito</th>
                <th className="px-3 py-2 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line, idx) => (
                <tr key={line.key} className="border-b border-edge-subtle">
                  <td className="px-3 py-2 text-ink-tertiary text-xs tabular-nums">{idx + 1}</td>
                  <td className="px-3 py-2">
                    <AccountPicker
                      value={line.account?.id ?? null}
                      onChange={(a) => updateLine(idx, { account: a })}
                      disabled={saving}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      value={line.description}
                      onChange={(e) => updateLine(idx, { description: e.target.value })}
                      className="field w-full text-sm"
                      placeholder="Opcional"
                      maxLength={500}
                      disabled={saving}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={line.debit}
                      onChange={(e) => setDebit(idx, e.target.value)}
                      className="field w-full text-sm text-right tabular-nums font-mono"
                      placeholder="0.00"
                      disabled={saving}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={line.credit}
                      onChange={(e) => setCredit(idx, e.target.value)}
                      className="field w-full text-sm text-right tabular-nums font-mono"
                      placeholder="0.00"
                      disabled={saving}
                    />
                  </td>
                  <td className="px-3 py-2 text-center">
                    <button
                      type="button"
                      onClick={() => removeLine(idx)}
                      disabled={saving || lines.length <= 2}
                      title={lines.length <= 2 ? 'Mínimo 2 líneas' : 'Eliminar línea'}
                      className="p-1.5 rounded text-ink-tertiary hover:text-red-500 hover:bg-edge-subtle transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-edge-subtle">
              <tr>
                <td colSpan={3} className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-widest text-ink-secondary">
                  Totales
                </td>
                <td className="px-3 py-2.5 text-right font-mono text-sm font-bold text-ink-primary tabular-nums">
                  {fmtMoney(totals.debit)}
                </td>
                <td className="px-3 py-2.5 text-right font-mono text-sm font-bold text-ink-primary tabular-nums">
                  {fmtMoney(totals.credit)}
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* ── Indicador de balance ── */}
      <div
        className={`card rounded-xl p-3 flex items-center gap-3 ${
          isBalanced
            ? 'bg-emerald-500/5 border-emerald-500/20'
            : 'bg-amber-500/5 border-amber-500/20'
        }`}
      >
        {isBalanced ? (
          <>
            <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                Asiento balanceado
              </p>
              <p className="text-[11px] text-ink-tertiary">
                Débitos = Créditos = {fmtMoney(totals.debit)}
              </p>
            </div>
          </>
        ) : (
          <>
            <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">
                {totals.debit === 0 && totals.credit === 0
                  ? 'Completá las líneas'
                  : 'Asiento desbalanceado'}
              </p>
              {totals.debit !== totals.credit && totals.debit + totals.credit > 0 && (
                <p className="text-[11px] text-ink-tertiary">
                  Débitos: {fmtMoney(totals.debit)} · Créditos: {fmtMoney(totals.credit)} · Diferencia: <strong className="text-amber-700 dark:text-amber-400">{fmtMoney(Math.abs(totals.diff))}</strong>
                </p>
              )}
            </div>
          </>
        )}
      </div>

      {/* ── Validation error (más específico) ── */}
      {validationError && validationError !== `Diferencia: ${fmtMoney(Math.abs(totals.diff))}` && (
        <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-600 dark:text-red-400">
          <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
          <span>{validationError}</span>
        </div>
      )}

      {/* ── Botones ── */}
      <div className="flex items-center justify-end gap-2">
        {onCancel && (
          <button type="button" onClick={onCancel} disabled={saving} className="btn btn-ghost">
            Cancelar
          </button>
        )}
        <button
          type="submit"
          disabled={saving || !!validationError}
          className="btn btn-primary"
          title={validationError ?? undefined}
        >
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}
          {submitLabel ?? 'Guardar borrador'}
        </button>
      </div>
    </form>
  )
}

// ────────────────────────────────────────────────────────────────────
function round2(n: number): number {
  return Math.round(n * 100) / 100
}
