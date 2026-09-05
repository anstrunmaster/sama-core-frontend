'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  DashboardLayout
} from '@/components/layout/DashboardLayout'
import {
  ChevronLeft, Plus, RefreshCw, CheckCircle2,
  DollarSign, Users, FileText, AlertCircle, X
} from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://d16rb4jhhui7p6.cloudfront.net/api/v1'

function getToken(): string {
  return localStorage.getItem('_at') || localStorage.getItem('accessToken') || ''
}

function num(v: any): number {
  if (!v) return 0
  if (typeof v === 'number') return v
  if (typeof v === 'string') return parseFloat(v) || 0
  if (typeof v.toNumber === 'function') return v.toNumber()
  return 0
}

function fmtMoney(n: number) {
  return new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD' }).format(n || 0)
}

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  DRAFT:     { label: 'Borrador',  color: 'text-amber-500' },
  APPROVED:  { label: 'Aprobado', color: 'text-blue-500' },
  PAID:      { label: 'Pagado',   color: 'text-green-500' },
  CANCELLED: { label: 'Anulado',  color: 'text-red-500' },
}

const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

export default function NominaPage() {
  const router = useRouter()
  const [periods, setPeriods] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [selected, setSelected] = useState<any>(null)
  const [summary, setSummary] = useState<any>(null)
  const [creating, setCreating] = useState(false)
  const [newYear, setNewYear] = useState(new Date().getFullYear())
  const [newMonth, setNewMonth] = useState(new Date().getMonth() + 1)
  const [actionLoading, setActionLoading] = useState('')
  const [comprobante, setComprobante] = useState<any>(null)
  const [detallePeriodo, setDetallePeriodo] = useState<any>(null)

  async function loadPeriods() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${API_URL}/rrhh/payroll/periods`, {
        headers: { Authorization: `Bearer ${getToken()}` }
      })
      const data = await res.json()
      setPeriods(data.data ?? data)
    } catch {
      setError('Error al cargar períodos')
    } finally {
      setLoading(false)
    }
  }

  async function loadSummary(periodId: string) {
    try {
      const res = await fetch(`${API_URL}/rrhh/payroll/periods/${periodId}/summary`, {
        headers: { Authorization: `Bearer ${getToken()}` }
      })
      const data = await res.json()
      setSummary(data.data ?? data)
    } catch {}
  }

  async function selectPeriod(period: any) {
    setSelected(period)
    setSummary(null)
    setDetallePeriodo(null)
    await loadSummary(period.id)
    // Cargar detalle con runs
    try {
      const res = await fetch(`${API_URL}/rrhh/payroll/periods/${period.id}`, {
        headers: { Authorization: `Bearer ${getToken()}` }
      })
      const data = await res.json()
      setDetallePeriodo(data.data ?? data)
    } catch {}
  }

  async function createPeriod() {
    setActionLoading('create')
    setError('')
    try {
      const res = await fetch(`${API_URL}/rrhh/payroll/periods`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ year: newYear, month: newMonth })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(Array.isArray(data.message) ? data.message[0] : data.message)
      setCreating(false)
      setSuccess('Período creado')
      setTimeout(() => setSuccess(''), 3000)
      await loadPeriods()
    } catch (e: any) {
      setError(e.message || 'Error al crear período')
    } finally {
      setActionLoading('')
    }
  }

  async function generateRol() {
    if (!selected) return
    setActionLoading('generate')
    setError('')
    try {
      const res = await fetch(`${API_URL}/rrhh/payroll/periods/${selected.id}/generate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      })
      const data = await res.json()
      if (!res.ok) throw new Error(Array.isArray(data.message) ? data.message[0] : data.message)
      setSuccess(`Rol generado — ${data.data?.generated ?? 0} empleado(s)`)
      setTimeout(() => setSuccess(''), 4000)
      await loadSummary(selected.id)
      await selectPeriod(selected)
    } catch (e: any) {
      setError(e.message || 'Error al generar rol')
    } finally {
      setActionLoading('')
    }
  }

  async function doAction(action: 'approve' | 'pay') {
    if (!selected) return
    setActionLoading(action)
    setError('')
    try {
      const res = await fetch(`${API_URL}/rrhh/payroll/periods/${selected.id}/${action}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}` }
      })
      const data = await res.json()
      if (!res.ok) throw new Error(Array.isArray(data.message) ? data.message[0] : data.message)
      setSuccess(action === 'approve' ? 'Rol aprobado — asiento contable generado' : 'Nómina marcada como pagada')
      setTimeout(() => setSuccess(''), 4000)
      await loadPeriods()
      await loadSummary(selected.id)
      setSelected((prev: any) => ({ ...prev, status: data.data?.status ?? prev.status }))
    } catch (e: any) {
      setError(e.message || 'Error')
    } finally {
      setActionLoading('')
    }
  }

  useEffect(() => { loadPeriods() }, [])

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
              <h1 className="text-lg font-bold text-ink-primary">Nómina</h1>
              <p className="text-sm text-ink-tertiary mt-0.5">Rol de pagos mensual</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={loadPeriods} disabled={loading}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-edge-subtle border border-edge text-sm text-ink-secondary hover:text-ink-primary transition-all">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={() => setCreating(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue text-sm font-semibold text-white hover:bg-blue/90 transition-all">
              <Plus className="w-3.5 h-3.5" /> Nuevo período
            </button>
          </div>
        </div>

        {/* Alertas */}
        {error && (
          <div className="flex items-center justify-between px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-600">
            <div className="flex items-center gap-2"><AlertCircle className="w-4 h-4" />{error}</div>
            <button onClick={() => setError('')}><X className="w-3.5 h-3.5" /></button>
          </div>
        )}
        {success && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-green-500/10 border border-green-500/20 text-sm text-green-600">
            <CheckCircle2 className="w-4 h-4" />{success}
          </div>
        )}

        {/* Modal nuevo período */}
        {creating && (
          <div className="card p-5 space-y-4">
            <h3 className="text-sm font-bold text-ink-primary">Nuevo período de nómina</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-ink-tertiary font-semibold uppercase tracking-wider mb-1.5 block">Año</label>
                <input type="number" value={newYear} onChange={e => setNewYear(Number(e.target.value))}
                  className="field w-full" min={2020} max={2030} />
              </div>
              <div>
                <label className="text-xs text-ink-tertiary font-semibold uppercase tracking-wider mb-1.5 block">Mes</label>
                <select value={newMonth} onChange={e => setNewMonth(Number(e.target.value))} className="field w-full">
                  {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                </select>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={createPeriod} disabled={actionLoading === 'create'}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue text-sm font-semibold text-white hover:bg-blue/90 disabled:opacity-50 transition-all">
                {actionLoading === 'create' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                Crear
              </button>
              <button onClick={() => setCreating(false)}
                className="px-4 py-2 rounded-lg border border-edge text-sm text-ink-secondary hover:text-ink-primary transition-all">
                Cancelar
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Lista de períodos */}
          <div className="card overflow-hidden">
            <div className="px-4 py-3 border-b border-edge-subtle bg-surface-raised">
              <h3 className="text-xs font-bold uppercase tracking-widest text-ink-tertiary">Períodos</h3>
            </div>
            {loading ? (
              <div className="p-4 space-y-2">
                {[1,2,3].map(i => <div key={i} className="h-12 rounded-lg bg-edge-subtle animate-pulse" />)}
              </div>
            ) : periods.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-sm text-ink-tertiary">Sin períodos</p>
              </div>
            ) : (
              <div className="divide-y divide-edge-subtle">
                {periods.map(p => {
                  const meta = STATUS_LABEL[p.status] ?? { label: p.status, color: 'text-ink-tertiary' }
                  return (
                    <button key={p.id} onClick={() => selectPeriod(p)}
                      className={`w-full px-4 py-3 flex items-center justify-between hover:bg-edge-subtle transition-colors text-left ${selected?.id === p.id ? 'bg-blue-muted' : ''}`}>
                      <div>
                        <p className="text-sm font-semibold text-ink-primary">{p.label}</p>
                        <p className="text-xs text-ink-tertiary">{p._count?.runs ?? 0} empleado(s)</p>
                      </div>
                      <span className={`text-xs font-bold ${meta.color}`}>{meta.label}</span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Detalle del período */}
          <div className="lg:col-span-2 space-y-4">
            {!selected ? (
              <div className="card py-16 text-center">
                <FileText className="w-10 h-10 text-ink-ghost mx-auto mb-3" />
                <p className="text-sm text-ink-tertiary">Selecciona un período para ver el detalle</p>
              </div>
            ) : (
              <>
                {/* Acciones */}
                <div className="card p-4 flex items-center gap-3 flex-wrap">
                  <span className="text-sm font-bold text-ink-primary flex-1">{selected.label}</span>
                  {selected.status === 'DRAFT' && (
                    <>
                      <button onClick={generateRol} disabled={!!actionLoading}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg border border-edge text-sm text-ink-secondary hover:text-ink-primary disabled:opacity-50 transition-all">
                        {actionLoading === 'generate' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Users className="w-3.5 h-3.5" />}
                        Generar rol
                      </button>
                      <button
                        onClick={() => doAction('approve')}
                        disabled={!!actionLoading || !summary || summary.employee_count === 0}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue text-sm font-semibold text-white hover:bg-blue/90 disabled:opacity-50 transition-all">
                        {actionLoading === 'approve' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                        Aprobar
                      </button>
                    </>
                  )}
                  {selected.status === 'APPROVED' && (
                    <button onClick={() => doAction('pay')} disabled={!!actionLoading}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50 transition-all">
                      {actionLoading === 'pay' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <DollarSign className="w-3.5 h-3.5" />}
                      Marcar como pagado
                    </button>
                  )}
                </div>

                {/* Resumen */}
                {summary && (
                  <>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {[
                        { label: 'Empleados', value: summary.employee_count, mono: false },
                        { label: 'Sueldo bruto', value: fmtMoney(summary.total_gross), mono: true },
                        { label: 'Neto a pagar', value: fmtMoney(summary.total_net), mono: true, highlight: true },
                        { label: 'IESS personal', value: fmtMoney(summary.total_iess_personal), mono: true },
                        { label: 'IESS patronal', value: fmtMoney(summary.total_iess_employer), mono: true },
                        { label: 'Costo total empresa', value: fmtMoney(summary.total_employer_cost), mono: true, highlight: true },
                      ].map((s, i) => (
                        <div key={i} className="card p-4">
                          <p className="text-[10px] uppercase tracking-widest text-ink-tertiary font-semibold mb-1">{s.label}</p>
                          <p className={`text-lg font-bold ${s.highlight ? 'text-blue' : 'text-ink-primary'} ${s.mono ? 'font-mono' : ''}`}>{s.value}</p>
                        </div>
                      ))}
                    </div>

                    <div className="card overflow-hidden">
                      <div className="px-4 py-3 border-b border-edge-subtle bg-surface-raised">
                        <h3 className="text-xs font-bold uppercase tracking-widest text-ink-tertiary">Beneficios sociales provisionados</h3>
                      </div>
                      <div className="divide-y divide-edge-subtle">
                        {[
                          { label: 'Décimo tercer sueldo', value: summary.total_decimo_tercero },
                          { label: 'Décimo cuarto sueldo', value: summary.total_decimo_cuarto },
                          { label: 'Vacaciones', value: summary.total_vacaciones },
                          { label: 'Fondos de reserva', value: summary.total_fondos_reserva },
                        ].map((b, i) => (
                          <div key={i} className="flex items-center justify-between px-4 py-3">
                            <span className="text-sm text-ink-secondary">{b.label}</span>
                            <span className="text-sm font-mono font-semibold text-ink-primary">{fmtMoney(b.value)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {/* Empleados del período */}
                {detallePeriodo?.runs?.length > 0 && (
                  <div className="card overflow-hidden">
                    <div className="px-4 py-3 border-b border-edge-subtle bg-surface-raised">
                      <h3 className="text-xs font-bold uppercase tracking-widest text-ink-tertiary">Empleados del período</h3>
                    </div>
                    <div className="divide-y divide-edge-subtle">
                      {detallePeriodo.runs.map((run: any) => (
                        <div key={run.id} className="flex items-center justify-between px-4 py-3">
                          <div>
                            <p className="text-sm font-semibold text-ink-primary">
                              {run.employee?.first_name} {run.employee?.last_name}
                            </p>
                            <p className="text-xs text-ink-tertiary font-mono">{run.employee?.employee_code} · Neto: {fmtMoney(num(run.net_salary))}</p>
                          </div>
                          <button
                            onClick={() => setComprobante(run)}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-edge text-xs text-ink-secondary hover:text-ink-primary hover:border-edge-strong transition-all">
                            <FileText className="w-3.5 h-3.5" />
                            Comprobante
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {comprobante && (
        <ComprobanteModal
          run={comprobante}
          period={selected}
          onClose={() => setComprobante(null)}
        />
      )}
    </DashboardLayout>
  )
}



function imprimirComprobante(run: any, period: any) {
  const emp = run.employee
  const fmt = (n: any) => new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD' }).format(parseFloat(n) || 0)

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Comprobante ${emp?.employee_code} - ${period?.label}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; font-size: 12px; color: #333; padding: 20px; }
    h1 { text-align: center; font-size: 16px; margin-bottom: 4px; }
    .subtitle { text-align: center; color: #666; margin-bottom: 16px; border-bottom: 1px solid #ddd; padding-bottom: 12px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 16px; margin-bottom: 16px; }
    .grid span.label { color: #888; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
    thead tr { background: #f0f0f0; }
    th { text-align: left; padding: 6px 8px; font-size: 11px; font-weight: 600; }
    td { padding: 5px 8px; border-bottom: 1px solid #eee; }
    td:last-child { text-align: right; font-family: monospace; }
    .neto { display: flex; justify-content: space-between; padding: 10px 12px; background: #e8f0fe; border: 1px solid #c5d5f7; border-radius: 6px; margin-bottom: 12px; }
    .neto .label { font-weight: bold; }
    .neto .valor { font-weight: bold; font-size: 16px; color: #1a56db; font-family: monospace; }
    .descuento { color: #dc2626; }
    .firmas { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 40px; padding-top: 16px; border-top: 1px solid #ddd; }
    .firma { text-align: center; }
    .firma-linea { border-top: 1px solid #999; margin-top: 40px; padding-top: 6px; font-size: 10px; color: #888; }
    @media print { body { padding: 10px; } }
  </style>
</head>
<body>
  <h1>ROL DE PAGOS</h1>
  <p class="subtitle">Período: ${period?.label}</p>

  <div class="grid">
    <div><span class="label">Empleado: </span><strong>${emp?.first_name} ${emp?.last_name}</strong></div>
    <div><span class="label">Código: </span>${emp?.employee_code}</div>
    <div><span class="label">Cédula: </span>${emp?.id_number}</div>
    <div><span class="label">N° IESS: </span>${emp?.iess_number ?? '—'}</div>
    ${emp?.position ? `<div><span class="label">Cargo: </span>${emp.position.name}</div>` : ''}
    ${emp?.department ? `<div><span class="label">Depto: </span>${emp.department.name}</div>` : ''}
    ${emp?.bank_name ? `<div><span class="label">Banco: </span>${emp.bank_name}</div>` : ''}
    ${emp?.bank_account_number ? `<div><span class="label">Cuenta: </span>${emp.bank_account_number}</div>` : ''}
  </div>

  <table>
    <thead><tr><th colspan="2">INGRESOS</th></tr></thead>
    <tbody>
      <tr><td>Sueldo base</td><td>${fmt(run.base_salary)}</td></tr>
      ${parseFloat(run.overtime_amount) > 0 ? `<tr><td>Horas extra (${run.overtime_hours}h)</td><td>${fmt(run.overtime_amount)}</td></tr>` : ''}
      ${parseFloat(run.other_income) > 0 ? `<tr><td>Otros ingresos</td><td>${fmt(run.other_income)}</td></tr>` : ''}
      <tr style="background:#f9f9f9;font-weight:600"><td>Total ingresos</td><td>${fmt(run.gross_salary)}</td></tr>
    </tbody>
  </table>

  <table>
    <thead><tr><th colspan="2">DESCUENTOS</th></tr></thead>
    <tbody>
      <tr><td>Aporte personal IESS (9.45%)</td><td class="descuento">- ${fmt(run.iess_personal)}</td></tr>
      ${parseFloat(run.income_tax) > 0 ? `<tr><td>Impuesto a la renta</td><td class="descuento">- ${fmt(run.income_tax)}</td></tr>` : ''}
      ${parseFloat(run.other_deductions) > 0 ? `<tr><td>Otros descuentos</td><td class="descuento">- ${fmt(run.other_deductions)}</td></tr>` : ''}
    </tbody>
  </table>

  <div class="neto">
    <span class="label">NETO A PAGAR</span>
    <span class="valor">${fmt(run.net_salary)}</span>
  </div>

  <table>
    <thead><tr><th colspan="2">BENEFICIOS SOCIALES PROVISIONADOS</th></tr></thead>
    <tbody>
      <tr><td>Décimo tercer sueldo</td><td>${fmt(run.decimo_tercero)}</td></tr>
      <tr><td>Décimo cuarto sueldo</td><td>${fmt(run.decimo_cuarto)}</td></tr>
      <tr><td>Vacaciones</td><td>${fmt(run.vacaciones)}</td></tr>
      ${parseFloat(run.fondos_reserva) > 0 ? `<tr><td>Fondos de reserva</td><td>${fmt(run.fondos_reserva)}</td></tr>` : ''}
      <tr style="background:#f9f9f9;font-weight:600"><td>Aporte patronal IESS (12.15%)</td><td>${fmt(run.iess_employer)}</td></tr>
    </tbody>
  </table>

  <div class="firmas">
    <div class="firma"><div class="firma-linea">Firma empleador</div></div>
    <div class="firma"><div class="firma-linea">Firma empleado</div></div>
  </div>

  <script>window.onload = () => { window.print(); }</script>
</body>
</html>`

  const ventana = window.open('', '_blank', 'width=700,height=900')
  if (ventana) {
    ventana.document.write(html)
    ventana.document.close()
  }
}


function ComprobanteModal({ run, period, onClose }: { run: any; period: any; onClose: () => void }) {
  const emp = run.employee
  const fmt = (n: any) => new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD' }).format(parseFloat(n) || 0)

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 print:p-0 print:bg-white print:inset-auto print:fixed-none">
      <div id="payroll-slip" className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-lg print:shadow-none print:rounded-none print:max-w-full max-h-[90vh] overflow-y-auto print:max-h-full print:overflow-visible">
        {/* Botones — ocultos al imprimir */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 print:hidden">
          <h3 className="font-bold text-ink-primary">Comprobante de pago</h3>
          <div className="flex items-center gap-2">
            <button onClick={() => imprimirComprobante(run, period)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue text-sm font-semibold text-white hover:bg-blue/90 transition-all">
              Imprimir / PDF
            </button>
            <button onClick={onClose}
              className="p-2 rounded-lg border border-edge text-ink-tertiary hover:text-ink-primary transition-all">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Contenido del comprobante */}
        <div className="p-6 space-y-4 text-sm">
          {/* Header */}
          <div className="text-center border-b border-gray-200 pb-4">
            <h2 className="text-base font-bold text-gray-900">ROL DE PAGOS</h2>
            <p className="text-gray-600 mt-1">Período: {period?.label}</p>
          </div>

          {/* Datos empleado */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div><span className="text-gray-500">Empleado:</span> <span className="font-semibold">{emp?.first_name} {emp?.last_name}</span></div>
            <div><span className="text-gray-500">Código:</span> <span className="font-mono">{emp?.employee_code}</span></div>
            <div><span className="text-gray-500">Cédula:</span> <span>{emp?.id_number}</span></div>
            <div><span className="text-gray-500">N° IESS:</span> <span>{emp?.iess_number ?? '—'}</span></div>
            {emp?.position && <div><span className="text-gray-500">Cargo:</span> <span>{emp.position.name}</span></div>}
            {emp?.department && <div><span className="text-gray-500">Depto:</span> <span>{emp.department.name}</span></div>}
            {emp?.bank_name && <div><span className="text-gray-500">Banco:</span> <span>{emp.bank_name}</span></div>}
            {emp?.bank_account_number && <div><span className="text-gray-500">Cuenta:</span> <span>{emp.bank_account_number}</span></div>}
          </div>

          {/* Ingresos */}
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="text-left p-2 font-semibold text-gray-700" colSpan={2}>INGRESOS</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-100">
                <td className="p-2 text-gray-600">Sueldo base</td>
                <td className="p-2 text-right font-mono">{fmt(run.base_salary)}</td>
              </tr>
              {parseFloat(run.overtime_amount) > 0 && (
                <tr className="border-b border-gray-100">
                  <td className="p-2 text-gray-600">Horas extra ({run.overtime_hours}h)</td>
                  <td className="p-2 text-right font-mono">{fmt(run.overtime_amount)}</td>
                </tr>
              )}
              {parseFloat(run.other_income) > 0 && (
                <tr className="border-b border-gray-100">
                  <td className="p-2 text-gray-600">Otros ingresos</td>
                  <td className="p-2 text-right font-mono">{fmt(run.other_income)}</td>
                </tr>
              )}
              <tr className="bg-gray-50 font-semibold">
                <td className="p-2">Total ingresos</td>
                <td className="p-2 text-right font-mono">{fmt(run.gross_salary)}</td>
              </tr>
            </tbody>
          </table>

          {/* Descuentos */}
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="text-left p-2 font-semibold text-gray-700" colSpan={2}>DESCUENTOS</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-100">
                <td className="p-2 text-gray-600">Aporte personal IESS (9.45%)</td>
                <td className="p-2 text-right font-mono text-red-600">- {fmt(run.iess_personal)}</td>
              </tr>
              {parseFloat(run.income_tax) > 0 && (
                <tr className="border-b border-gray-100">
                  <td className="p-2 text-gray-600">Impuesto a la renta</td>
                  <td className="p-2 text-right font-mono text-red-600">- {fmt(run.income_tax)}</td>
                </tr>
              )}
              {parseFloat(run.other_deductions) > 0 && (
                <tr className="border-b border-gray-100">
                  <td className="p-2 text-gray-600">Otros descuentos</td>
                  <td className="p-2 text-right font-mono text-red-600">- {fmt(run.other_deductions)}</td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Neto */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-blue/10 border border-blue/20">
            <span className="font-bold text-gray-900">NETO A PAGAR</span>
            <span className="font-bold text-blue text-lg font-mono">{fmt(run.net_salary)}</span>
          </div>

          {/* Beneficios provisionados */}
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="text-left p-2 font-semibold text-gray-700" colSpan={2}>BENEFICIOS SOCIALES PROVISIONADOS</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-100">
                <td className="p-2 text-gray-600">Décimo tercer sueldo</td>
                <td className="p-2 text-right font-mono">{fmt(run.decimo_tercero)}</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="p-2 text-gray-600">Décimo cuarto sueldo</td>
                <td className="p-2 text-right font-mono">{fmt(run.decimo_cuarto)}</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="p-2 text-gray-600">Vacaciones</td>
                <td className="p-2 text-right font-mono">{fmt(run.vacaciones)}</td>
              </tr>
              {parseFloat(run.fondos_reserva) > 0 && (
                <tr className="border-b border-gray-100">
                  <td className="p-2 text-gray-600">Fondos de reserva</td>
                  <td className="p-2 text-right font-mono">{fmt(run.fondos_reserva)}</td>
                </tr>
              )}
              <tr className="bg-gray-50 font-semibold">
                <td className="p-2 text-gray-600">Aporte patronal IESS (12.15%)</td>
                <td className="p-2 text-right font-mono">{fmt(run.iess_employer)}</td>
              </tr>
            </tbody>
          </table>

          {/* Firma */}
          <div className="grid grid-cols-2 gap-8 pt-6 mt-4 border-t border-gray-200">
            <div className="text-center">
              <div className="border-t border-gray-400 pt-2 mt-8 text-xs text-gray-500">Firma empleador</div>
            </div>
            <div className="text-center">
              <div className="border-t border-gray-400 pt-2 mt-8 text-xs text-gray-500">Firma empleado</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
