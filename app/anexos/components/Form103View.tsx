'use client'
import { useEffect, useState } from 'react'
import { AlertCircle, Info, Printer } from 'lucide-react'
import { taxReportsApi, fmtMoney, fmtNumber } from '../api'
import { periodLabel, type TaxPeriod } from '../types'

interface Form103Row {
  code: string
  description: string
  base: number
  rate: number
  withheld: number
  count: number
}

interface Form103Response {
  period: { year: number; month: number }
  tenant: { ruc: string; name: string }
  rows: Form103Row[]
  totals: { total_base: number; total_withheld: number; retention_count: number }
  notes: string[]
}

interface Props { period: TaxPeriod }

export function Form103View({ period }: Props) {
  const [data, setData] = useState<Form103Response | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    taxReportsApi.form103(period)
      .then((d) => { if (!cancelled) setData(d) })
      .catch((e) => { if (!cancelled) setError(e.message || 'Error') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [period.year, period.month])

  if (loading) return (
    <div className="space-y-4">
      <div className="card rounded-2xl p-6 h-32 animate-pulse" />
      <div className="card rounded-2xl p-6 h-64 animate-pulse" />
    </div>
  )

  if (error) return (
    <div className="card rounded-xl p-4 flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
      <AlertCircle className="w-4 h-4" />{error}
    </div>
  )

  if (!data) return null

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="card rounded-2xl p-5">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-ink-tertiary font-semibold mb-1">
              Formulario 103
            </div>
            <h2 className="text-base font-bold text-ink-primary">
              Declaración de Retenciones en la Fuente
            </h2>
            <div className="text-xs text-ink-tertiary mt-1">
              {data.tenant.name} · RUC {data.tenant.ruc} · {periodLabel(period)}
            </div>
          </div>
          <button onClick={() => window.print()} className="btn btn-ghost" title="Imprimir">
            <Printer className="w-4 h-4" />
          </button>
        </div>
        <div className="grid grid-cols-3 gap-4 mt-5 pt-5 border-t border-edge-subtle">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-ink-tertiary font-medium mb-1">Retenciones aplicadas</div>
            <div className="text-lg font-bold text-ink-primary">{fmtNumber(data.totals.retention_count)}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-widest text-ink-tertiary font-medium mb-1">Base imponible total</div>
            <div className="text-lg font-bold text-ink-primary">{fmtMoney(data.totals.total_base)}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-widest text-ink-tertiary font-medium mb-1">Total retenido</div>
            <div className="text-lg font-bold text-blue">{fmtMoney(data.totals.total_withheld)}</div>
          </div>
        </div>
      </div>

      {/* Tabla de retenciones */}
      <div className="card rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-edge-subtle bg-surface-raised">
          <h3 className="text-xs font-bold uppercase tracking-widest text-ink-secondary">
            Detalle por concepto de retención
          </h3>
        </div>
        {data.rows.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-sm text-ink-tertiary">Sin retenciones en la fuente para este período</p>
            <p className="text-xs text-ink-ghost mt-1">Las retenciones se generan al registrar compras con retenciones de tipo Renta</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-surface-raised">
              <tr className="border-b border-edge-subtle">
                {['Código', 'Concepto', 'Docs.', '%', 'Base imponible', 'Valor retenido'].map((h, i) => (
                  <th key={h} className={`px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-ink-tertiary ${i >= 3 ? 'text-right' : 'text-left'}`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.rows.map((row) => (
                <tr key={row.code} className="border-b border-edge-subtle hover:bg-edge-subtle transition-colors">
                  <td className="px-4 py-3 font-mono text-xs font-bold text-ink-secondary">{row.code}</td>
                  <td className="px-4 py-3 text-sm text-ink-primary">{row.description}</td>
                  <td className="px-4 py-3 text-sm text-ink-tertiary text-right">{row.count}</td>
                  <td className="px-4 py-3 text-sm text-ink-secondary text-right">{row.rate}%</td>
                  <td className="px-4 py-3 text-sm text-ink-secondary text-right font-mono">{fmtMoney(row.base)}</td>
                  <td className="px-4 py-3 text-sm font-bold text-blue text-right font-mono">{fmtMoney(row.withheld)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-edge-subtle">
              <tr>
                <td colSpan={4} className="px-4 py-3 text-xs font-bold uppercase tracking-widest text-ink-tertiary text-right">Totales</td>
                <td className="px-4 py-3 text-sm font-bold text-ink-primary text-right font-mono">{fmtMoney(data.totals.total_base)}</td>
                <td className="px-4 py-3 text-sm font-bold text-blue text-right font-mono">{fmtMoney(data.totals.total_withheld)}</td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>

      {/* Notas */}
      <div className="card rounded-xl p-4">
        <div className="flex items-start gap-2">
          <Info className="w-4 h-4 text-blue mt-0.5 flex-shrink-0" />
          <div className="text-[11px] text-ink-secondary leading-relaxed space-y-1">
            {data.notes.map((note, i) => <p key={i}>· {note}</p>)}
          </div>
        </div>
      </div>
    </div>
  )
}
