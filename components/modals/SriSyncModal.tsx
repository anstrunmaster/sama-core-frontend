'use client'

/**
 * SriSyncModal — importación de comprobantes del SRI desde el reporte del portal.
 *
 * POR QUÉ ESTE FLUJO
 * El portal del SRI protege la consulta con reCAPTCHA Enterprise validado en
 * servidor: ningún proceso automatizado puede ejecutarla. En cambio el botón
 * "Descargar reporte" entrega un TSV con TODAS las filas del período, y el XML
 * legal de cada comprobante se obtiene del web service público del SRI con solo
 * la clave de acceso. De ahí el diseño: el usuario consulta en su navegador
 * (donde el captcha se resuelve solo), descarga los reportes y los suelta aquí.
 *
 * MULTIARCHIVO: el portal genera un reporte por tipo de comprobante, así que se
 * pueden soltar los 5 juntos, o varios meses. La deduplicación por clave de
 * acceso hace inofensivo repetir archivos o volver a subir un mes.
 *
 * SOBRE EL XML: el web service del SRI solo conserva ~30 días. Los comprobantes
 * más antiguos se importan igual con los datos del reporte y se marcan como
 * "Sin XML": se pierde el respaldo legal, no la información contable.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import {
  AlertCircle, AlertTriangle, CheckCircle2, ExternalLink, FileText,
  Loader2, Trash2, Upload, X,
} from 'lucide-react'
import {
  ETIQUETA_TIPO,
  SRI_PORTAL_URL,
  SriError,
  SriService,
  fileToBase64,
  fmtFecha,
  fmtMoneda,
  validarReporte,
  type DocumentoSri,
  type JobImportacion,
  type ResumenImportacion,
} from '@/services/sri-worker.service'

type Fase = 'seleccion' | 'subiendo' | 'procesando' | 'listo'

interface ArchivoEnCola {
  file: File
  comprobantes: number
  antiguos: number
  error?: string
}

interface SriSyncModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Función existente que recarga la lista de pendientes (la misma de "Actualizar"). */
  onSyncComplete?: () => void | Promise<void>
  branchId?: string | null
}

const TERMINALES = ['completed', 'completed_with_errors', 'failed']

function mapError(e: unknown): string {
  if (e instanceof SriError) {
    switch (e.code) {
      case 'INVALID_REPORT':
      case 'WRONG_TAXPAYER':
      case 'TOO_MANY_FILES':
        return e.message
      case 'REPORT_TOO_LARGE':
        return 'Uno de los archivos es demasiado grande (máximo 8 MB).'
      case 'NO_FILES':
        return 'No se recibió ningún archivo.'
    }
    if (e.status === 401) return 'Tu sesión expiró. Vuelve a iniciar sesión.'
    if (e.message) return e.message
  }
  return 'Ocurrió un error al importar los reportes.'
}

export default function SriSyncModal({
  open, onOpenChange, onSyncComplete, branchId,
}: SriSyncModalProps) {
  const [fase, setFase] = useState<Fase>('seleccion')
  const [cola, setCola] = useState<ArchivoEnCola[]>([])
  const [error, setError] = useState('')
  const [resumen, setResumen] = useState<ResumenImportacion | null>(null)
  const [job, setJob] = useState<JobImportacion | null>(null)
  const [docs, setDocs] = useState<DocumentoSri[] | null>(null)
  const [arrastrando, setArrastrando] = useState(false)
  const pollRef = useRef<number | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const ocupado = fase === 'subiendo' || fase === 'procesando'
  const validos = cola.filter((a) => !a.error)
  const totalComprobantes = validos.reduce((s, a) => s + a.comprobantes, 0)
  const totalAntiguos = validos.reduce((s, a) => s + a.antiguos, 0)

  const detener = useCallback(() => {
    if (pollRef.current !== null) {
      window.clearInterval(pollRef.current)
      pollRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!open) { detener(); return }
    setFase('seleccion')
    setCola([])
    setError('')
    setResumen(null)
    setJob(null)
    setDocs(null)
    setArrastrando(false)
  }, [open, detener])

  useEffect(() => detener, [detener])

  // ------------------------------- archivos -------------------------------

  const agregar = useCallback(async (files: File[]) => {
    setError('')
    const nuevos: ArchivoEnCola[] = []
    for (const file of files) {
      const v = await validarReporte(file)
      nuevos.push({
        file,
        comprobantes: v.comprobantes,
        antiguos: v.antiguos,
        error: v.ok ? undefined : v.motivo,
      })
    }
    setCola((prev) => {
      const nombres = new Set(prev.map((a) => a.file.name))
      return [...prev, ...nuevos.filter((n) => !nombres.has(n.file.name))]
    })
  }, [])

  function quitar(nombre: string) {
    setCola((prev) => prev.filter((a) => a.file.name !== nombre))
  }

  // ------------------------------ importación ------------------------------

  const finalizar = useCallback(
    async (final: JobImportacion) => {
      detener()
      setJob(final)
      if (final.estado === 'failed') {
        setFase('seleccion')
        setError(final.errorDetalle || 'La importación falló. Intenta de nuevo.')
        return
      }
      setFase('listo')
      try {
        setDocs(await SriService.listarDocumentos({ limit: 100 }))
      } catch {
        /* la tabla es informativa: si falla, no rompe el flujo */
      }
      await onSyncComplete?.()
    },
    [detener, onSyncComplete],
  )

  function iniciarPolling(jobId: string) {
    detener()
    pollRef.current = window.setInterval(async () => {
      try {
        const actual = await SriService.estadoImportacion(jobId)
        setJob(actual)
        if (TERMINALES.includes(actual.estado)) await finalizar(actual)
      } catch (e) {
        detener()
        setFase('seleccion')
        setError(mapError(e))
      }
    }, 1500)
  }

  async function importar() {
    if (!validos.length) return
    setError('')
    setFase('subiendo')
    try {
      const archivos = await Promise.all(
        validos.map(async (a) => ({
          nombre: a.file.name,
          contenidoB64: await fileToBase64(a.file),
        })),
      )
      const { jobId, resumen: res } = await SriService.importar(archivos, branchId)
      setResumen(res)

      if (res.aProcesar === 0) {
        const j = await SriService.estadoImportacion(jobId)
        await finalizar(j)
        return
      }
      setFase('procesando')
      iniciarPolling(jobId)
    } catch (e) {
      setFase('seleccion')
      setError(mapError(e))
    }
  }

  function manejarCierre(next: boolean) {
    if (!next && ocupado) return
    if (!next) detener()
    onOpenChange(next)
  }

  // -------------------------------- render --------------------------------

  const pct = job?.totalClaves
    ? Math.min(100, Math.round((job.procesados / job.totalClaves) * 100))
    : 0
  const avisos = job?.advertencias ?? resumen?.advertencias ?? []

  /** Comprobantes agrupados por tipo, en el orden en que se contabilizan. */
  const ORDEN_TIPOS = ['FACTURA', 'LIQUIDACION', 'NC', 'ND', 'RETENCION', 'GUIA_REMISION', 'OTRO']
  const grupos = (() => {
    if (!docs?.length) return [] as [string, DocumentoSri[]][]
    const mapa = new Map<string, DocumentoSri[]>()
    for (const d of docs) {
      const k = d.docType ?? 'OTRO'
      const lista = mapa.get(k)
      lista ? lista.push(d) : mapa.set(k, [d])
    }
    return [...mapa.entries()].sort(
      (a, b) => ORDEN_TIPOS.indexOf(a[0]) - ORDEN_TIPOS.indexOf(b[0]),
    )
  })()

  return (
    <Dialog.Root open={open} onOpenChange={manejarCierre}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-50 flex max-h-[88vh] w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 flex-col rounded-lg border border-edge bg-surface-raised shadow-lg focus:outline-none"
          onInteractOutside={(e) => { if (ocupado) e.preventDefault() }}
          onEscapeKeyDown={(e) => { if (ocupado) e.preventDefault() }}
        >
          {/* Encabezado */}
          <div className="flex items-start justify-between gap-4 border-b border-edge-subtle p-5">
            <div>
              <Dialog.Title className="text-base font-bold text-ink-primary">
                Importar comprobantes del SRI
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-ink-tertiary">
                Descarga los reportes del portal y suéltalos aquí. Se incorporan como
                compras pendientes.
              </Dialog.Description>
            </div>
            <Dialog.Close
              className="rounded p-1 text-ink-tertiary transition-colors hover:text-ink-primary disabled:opacity-50"
              disabled={ocupado}
              aria-label="Cerrar"
            >
              <X className="h-4 w-4" />
            </Dialog.Close>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto p-5">
            {/* Paso 1 */}
            {fase === 'seleccion' && (
              <div className="rounded-lg border border-edge-subtle bg-surface p-3">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-500/10 text-[11px] font-bold text-blue-600 dark:text-blue-400">
                    1
                  </span>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-ink-primary">
                      Descarga los reportes en el portal
                    </p>
                    <p className="mt-0.5 text-xs leading-relaxed text-ink-tertiary">
                      Elige el período, pulsa{' '}
                      <span className="font-medium text-ink-secondary">Consultar</span> y luego{' '}
                      <span className="font-medium text-ink-secondary">Descargar reporte</span>.
                      Repítelo por cada tipo de comprobante: puedes subirlos todos juntos.
                    </p>
                    <button
                      type="button"
                      onClick={() => window.open(SRI_PORTAL_URL, '_blank', 'noopener,noreferrer')}
                      className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-blue-500/20 bg-blue-500/10 px-3 py-1.5 text-xs font-semibold text-blue-600 transition-all hover:bg-blue-500/20 dark:text-blue-400"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Abrir portal del SRI
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Paso 2 — dropzone */}
            {fase === 'seleccion' && (
              <div>
                <div className="mb-2 flex items-center gap-3">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-500/10 text-[11px] font-bold text-blue-600 dark:text-blue-400">
                    2
                  </span>
                  <p className="text-sm font-semibold text-ink-primary">Suelta los archivos</p>
                </div>

                <div
                  onDragOver={(e) => { e.preventDefault(); setArrastrando(true) }}
                  onDragLeave={() => setArrastrando(false)}
                  onDrop={(e) => {
                    e.preventDefault()
                    setArrastrando(false)
                    void agregar(Array.from(e.dataTransfer.files || []))
                  }}
                  onClick={() => inputRef.current?.click()}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter') inputRef.current?.click() }}
                  className={`flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed px-4 py-6 text-center transition-colors ${
                    arrastrando ? 'border-blue-500/60 bg-blue-500/5' : 'border-edge hover:border-edge-strong'
                  }`}
                >
                  <input
                    ref={inputRef}
                    type="file"
                    accept=".txt,text/plain"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      void agregar(Array.from(e.target.files || []))
                      e.target.value = ''
                    }}
                  />
                  <Upload className="h-5 w-5 text-ink-tertiary" />
                  <p className="text-sm text-ink-secondary">
                    Arrastra los archivos <span className="font-mono text-xs">_Recibidos.txt</span>
                  </p>
                  <p className="text-xs text-ink-ghost">o haz clic para elegirlos</p>
                </div>

                {/* Cola */}
                {cola.length > 0 && (
                  <div className="mt-3 space-y-1.5">
                    {cola.map((a) => (
                      <div
                        key={a.file.name}
                        className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${
                          a.error ? 'border-red-500/20 bg-red-500/5' : 'border-edge-subtle bg-surface'
                        }`}
                      >
                        <FileText
                          className={`h-4 w-4 shrink-0 ${
                            a.error ? 'text-red-500' : 'text-blue-600 dark:text-blue-400'
                          }`}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-medium text-ink-primary">
                            {a.file.name}
                          </p>
                          <p
                            className={`text-[11px] ${
                              a.error ? 'text-red-600 dark:text-red-400' : 'text-ink-tertiary'
                            }`}
                          >
                            {a.error ??
                              `${a.comprobantes} comprobantes${
                                a.antiguos ? ` · ${a.antiguos} sin XML disponible` : ''
                              }`}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => quitar(a.file.name)}
                          className="rounded p-1 text-ink-tertiary transition-colors hover:text-red-500"
                          aria-label={`Quitar ${a.file.name}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                    {validos.length > 0 && (
                      <p className="pt-1 text-xs text-ink-tertiary">
                        {validos.length} archivo{validos.length === 1 ? '' : 's'} ·{' '}
                        {totalComprobantes} comprobantes en total
                      </p>
                    )}
                  </div>
                )}

                {/* Aviso de antigüedad */}
                {totalAntiguos > 0 && (
                  <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/10 p-2.5 text-xs text-amber-700 dark:text-amber-400">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span>
                      {totalAntiguos} comprobante{totalAntiguos === 1 ? '' : 's'} tiene
                      {totalAntiguos === 1 ? '' : 'n'} más de 30 días. El SRI solo conserva el XML
                      ese tiempo, así que se importarán con los datos del reporte (sin respaldo XML).
                      Para no perder el XML, conviene importar cada mes al cierre.
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Progreso */}
            {(fase === 'subiendo' || fase === 'procesando') && (
              <div className="rounded-lg border border-blue-500/20 bg-blue-500/10 p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-blue-600 dark:text-blue-400">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {fase === 'subiendo' ? (
                    <span>Leyendo los archivos...</span>
                  ) : (
                    <span>
                      Obteniendo comprobantes del SRI... {job?.procesados ?? 0} de{' '}
                      {job?.totalClaves ?? resumen?.aProcesar ?? 0}
                    </span>
                  )}
                </div>
                <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-blue-500/20">
                  <div
                    className="h-full rounded-full bg-blue-600 transition-all dark:bg-blue-400"
                    style={{ width: `${pct || 4}%` }}
                  />
                </div>
                <p className="mt-2 text-[11px] text-blue-600/80 dark:text-blue-400/80">
                  {resumen && resumen.yaImportadas > 0 && `${resumen.yaImportadas} ya estaban importados · `}
                  No cierres esta ventana.
                </p>
              </div>
            )}

            {/* Resumen por archivo */}
            {resumen && fase !== 'seleccion' && (
              <div className="rounded-lg border border-edge-subtle bg-surface p-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-tertiary">
                  Archivos procesados
                </p>
                <div className="space-y-1">
                  {resumen.archivos.map((a) => (
                    <div key={a.archivo} className="flex items-center justify-between gap-2 text-xs">
                      <span className="truncate text-ink-secondary">{a.archivo}</span>
                      <span className="shrink-0 text-ink-tertiary">
                        {a.comprobantes} · {a.docTypes.map((t) => ETIQUETA_TIPO[t] ?? t).join(', ')}
                      </span>
                    </div>
                  ))}
                </div>
                {resumen.duplicadasEntreArchivos > 0 && (
                  <p className="mt-2 text-[11px] text-ink-tertiary">
                    {resumen.duplicadasEntreArchivos} comprobantes repetidos entre archivos
                    (se contaron una sola vez).
                  </p>
                )}
              </div>
            )}

            {/* Advertencias */}
            {avisos.length > 0 && (
              <div className="space-y-1.5">
                {avisos.map((a, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/10 p-2.5 text-xs text-amber-700 dark:text-amber-400"
                  >
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span>{a}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Resultado */}
            {fase === 'listo' && job && (
              <div className="flex items-start gap-2 rounded-lg border border-green-500/20 bg-green-500/10 p-3 text-sm text-green-600 dark:text-green-400">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <p className="font-semibold">
                    {job.nuevos} comprobante{job.nuevos === 1 ? '' : 's'} importado
                    {job.nuevos === 1 ? '' : 's'}
                  </p>
                  <p className="text-xs opacity-90">
                    {job.sinXml > 0 && `${job.sinXml} sin respaldo XML. `}
                    {job.yaExistian > 0 && `${job.yaExistian} ya existían. `}
                    {job.fallidos > 0 &&
                      `${job.fallidos} con error: vuelve a subir el archivo para reintentar. `}
                    {job.desde && job.hasta && `Período ${fmtFecha(job.desde)} – ${fmtFecha(job.hasta)}.`}
                  </p>
                </div>
              </div>
            )}

            {/* Tabla de comprobantes, AGRUPADA POR TIPO con subtotales.
                Se agrupa porque es como se contabiliza después: las facturas van
                a compras, las retenciones al crédito tributario, las notas de
                crédito como ajuste. Ver los subtotales por categoría permite
                cuadrar contra el reporte del SRI antes de contabilizar. */}
            {fase === 'listo' && grupos.length > 0 && (
              <div className="space-y-3">
                {grupos.map(([tipo, lista]) => {
                  const subtotal = lista.reduce((s, d) => s + (d.valorSinImpuestos ?? 0), 0)
                  const iva = lista.reduce((s, d) => s + (d.iva ?? 0), 0)
                  const total = lista.reduce((s, d) => s + (d.importeTotal ?? 0), 0)
                  const sinXml = lista.filter((d) => d.xmlDisponible === false).length
                  return (
                    <div key={tipo} className="overflow-hidden rounded-lg border border-edge">
                      {/* Encabezado del grupo */}
                      <div className="flex items-center justify-between gap-2 border-b border-edge bg-surface px-3 py-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-ink-primary">
                            {ETIQUETA_TIPO[tipo] ?? tipo}
                          </span>
                          <span className="rounded-full bg-blue-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-blue-600 dark:text-blue-400">
                            {lista.length}
                          </span>
                          {sinXml > 0 && (
                            <span className="rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[10px] text-amber-700 dark:text-amber-400">
                              {sinXml} sin XML
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] tabular-nums text-ink-tertiary">
                          {fmtMoneda(subtotal)} + {fmtMoneda(iva)} ={' '}
                          <span className="font-semibold text-ink-primary">{fmtMoneda(total)}</span>
                        </span>
                      </div>

                      <div className="max-h-56 overflow-auto">
                        <table className="w-full text-xs">
                          <thead className="sticky top-0 bg-surface-raised">
                            <tr className="border-b border-edge-subtle text-left text-[10px] uppercase tracking-wider text-ink-tertiary">
                              <th className="px-3 py-1.5 font-semibold">Emisor</th>
                              <th className="px-3 py-1.5 font-semibold">Número</th>
                              <th className="px-3 py-1.5 font-semibold">Emisión</th>
                              <th className="px-3 py-1.5 text-right font-semibold">Subtotal</th>
                              <th className="px-3 py-1.5 text-right font-semibold">IVA</th>
                              <th className="px-3 py-1.5 text-right font-semibold">Total</th>
                              <th className="px-3 py-1.5 font-semibold">XML</th>
                            </tr>
                          </thead>
                          <tbody>
                            {lista.map((d) => (
                              <tr
                                key={d.claveAcceso}
                                className="border-b border-edge-subtle last:border-0"
                              >
                                <td className="px-3 py-2">
                                  <div className="max-w-[170px] truncate font-medium text-ink-primary">
                                    {d.razonSocialEmisor ?? '—'}
                                  </div>
                                  <div className="font-mono text-[10px] text-ink-tertiary">
                                    {d.rucEmisor ?? '—'}
                                  </div>
                                </td>
                                <td className="px-3 py-2 font-mono text-[11px] text-ink-secondary">
                                  {d.serieComprobante ?? '—'}
                                </td>
                                <td className="px-3 py-2 tabular-nums text-ink-secondary">
                                  {fmtFecha(d.fechaEmision)}
                                </td>
                                <td className="px-3 py-2 text-right tabular-nums text-ink-secondary">
                                  {fmtMoneda(d.valorSinImpuestos)}
                                </td>
                                <td className="px-3 py-2 text-right tabular-nums text-ink-secondary">
                                  {fmtMoneda(d.iva)}
                                </td>
                                <td className="px-3 py-2 text-right font-semibold tabular-nums text-ink-primary">
                                  {fmtMoneda(d.importeTotal)}
                                </td>
                                <td className="px-3 py-2">
                                  {d.xmlDisponible === false ? (
                                    <span
                                      className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-400"
                                      title="El SRI solo conserva el XML unos 30 días. Los datos contables provienen del reporte."
                                    >
                                      Sin XML
                                    </span>
                                  ) : (
                                    <span className="rounded bg-green-500/10 px-1.5 py-0.5 text-[10px] font-medium text-green-600 dark:text-green-400">
                                      Sí
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )
                })}

                {/* Total general */}
                <div className="flex items-center justify-between rounded-lg border border-edge bg-surface px-3 py-2">
                  <span className="text-xs font-semibold text-ink-primary">
                    Total importado · {docs?.length ?? 0} comprobantes
                  </span>
                  <span className="text-sm font-bold tabular-nums text-ink-primary">
                    {fmtMoneda((docs ?? []).reduce((s, d) => s + (d.importeTotal ?? 0), 0))}
                  </span>
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-600 dark:text-red-400">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span className="whitespace-pre-line">{error}</span>
              </div>
            )}
          </div>

          {/* Pie */}
          <div className="flex items-center justify-between gap-3 border-t border-edge-subtle p-4">
            <p className="text-[11px] text-ink-ghost">
              {fase === 'seleccion' && cola.length === 0
                ? 'Los comprobantes repetidos se detectan automáticamente.'
                : ''}
            </p>
            <div className="flex items-center gap-2">
              <Dialog.Close asChild>
                <button
                  type="button"
                  disabled={ocupado}
                  className="rounded-lg border border-edge bg-edge-subtle px-3 py-2 text-sm text-ink-secondary transition-all hover:border-edge-strong hover:text-ink-primary disabled:opacity-50"
                >
                  {fase === 'listo' ? 'Cerrar' : 'Cancelar'}
                </button>
              </Dialog.Close>
              {fase === 'seleccion' && (
                <button
                  type="button"
                  onClick={importar}
                  disabled={!validos.length}
                  className="flex items-center gap-2 rounded-lg border border-blue-500/20 bg-blue-500/10 px-3 py-2 text-sm font-semibold text-blue-600 transition-all hover:bg-blue-500/20 disabled:cursor-not-allowed disabled:opacity-50 dark:text-blue-400"
                >
                  Importar {validos.length > 0 && `(${totalComprobantes})`}
                </button>
              )}
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
