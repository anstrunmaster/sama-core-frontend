/**
 * SriWorkerService (Frontend) — importación de comprobantes del SRI.
 *
 * Consume la API del propio ERP (módulo src/sri-worker). Sin credenciales del
 * SRI, sin sesiones, sin captcha y sin microservicio externo.
 *
 * FLUJO:
 *   1. El usuario descarga uno o varios reportes del portal del SRI
 *      (uno por tipo de comprobante, o varios meses).
 *   2. Los suelta en el modal → importar() los envía en base64.
 *   3. El backend deduplica por clave de acceso, trae los XML del web service
 *      público del SRI y persiste; el modal consulta el progreso.
 *
 * NOTA SOBRE EL XML: el web service del SRI solo conserva los comprobantes de
 * los últimos ~30 días. Los más antiguos se importan igual con los datos del
 * reporte (que traen emisor, serie, fechas, subtotal, IVA y total) y llegan con
 * xmlDisponible = false. Se pierde el respaldo legal, no la información contable.
 */

const API = (process.env.NEXT_PUBLIC_API_URL || '/api/v1').replace(/\/+$/, '')
const BASE = `${API}/sri`

/** Deep link a la consulta de comprobantes recibidos del portal del SRI. */
export const SRI_PORTAL_URL =
  'https://srienlinea.sri.gob.ec/tuportal-internet/accederAplicacion.jspa?redireccion=57&idGrupo=55'

// ---------------------------------- tipos ----------------------------------

export type DocType =
  | 'FACTURA' | 'LIQUIDACION' | 'NC' | 'ND' | 'RETENCION' | 'GUIA_REMISION' | 'OTRO'

export type EstadoJob = 'running' | 'completed' | 'completed_with_errors' | 'failed'

/** De dónde salieron los datos: web service del SRI o el reporte descargado. */
export type OrigenDatos = 'WS' | 'REPORTE'

export interface ArchivoSubido {
  nombre: string
  contenidoB64: string
}

export interface ResumenArchivo {
  archivo: string
  comprobantes: number
  duplicadasEnArchivo: number
  descartadas: number
  docTypes: DocType[]
}

export interface ResumenImportacion {
  archivos: ResumenArchivo[]
  totalEnArchivos: number
  duplicadasEntreArchivos: number
  yaImportadas: number
  aProcesar: number
  /** Estimación de cuántos llegarán sin XML por tener más de 30 días. */
  posiblesSinXml: number
  desde?: string
  hasta?: string
  docTypes: DocType[]
  advertencias: string[]
}

export interface JobImportacion {
  id: string
  estado: EstadoJob
  totalClaves: number
  procesados: number
  nuevos: number
  yaExistian: number
  /** Importados solo con los datos del reporte (el SRI ya no tenía el XML). */
  sinXml: number
  fallidos: number
  desde?: string | null
  hasta?: string | null
  docTypes: DocType[]
  advertencias: string[]
  errorDetalle?: string | null
  finalizadoEn?: string | null
}

export interface DocumentoSri {
  claveAcceso: string
  docType: DocType
  rucEmisor?: string
  razonSocialEmisor?: string
  serieComprobante?: string
  fechaEmision?: string
  fechaAutorizacion?: string
  valorSinImpuestos?: number
  iva?: number
  importeTotal?: number
  estadoAutorizacion?: string
  xmlDisponible?: boolean
  origen?: OrigenDatos
  contabilizado?: boolean
}

export interface ResumenDocumentos {
  total: number
  pendientes: number
  sinXml: number
  importeTotal: number
  porTipo: Record<string, number>
}

export class SriError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string | null,
    message: string,
  ) {
    super(message)
    this.name = 'SriError'
  }
}

// ------------------------------ cliente interno ------------------------------

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  })

  let body: any = null
  try {
    body = await res.json()
  } catch {
    /* sin cuerpo JSON */
  }

  if (!res.ok) {
    // el backend lanza HttpException con { error_code, message } dentro de message
    const d = body?.message && typeof body.message === 'object' ? body.message : body
    const code = d?.error_code ?? body?.error_code ?? body?.code ?? null
    const msg =
      (typeof d?.message === 'string' && d.message) ||
      (Array.isArray(body?.message) ? body.message[0] : body?.message) ||
      res.statusText
    throw new SriError(res.status, code, msg)
  }

  // La API envuelve las respuestas en { success, data, timestamp }: se desenvuelve
  // aquí para que el resto del servicio trabaje siempre con el objeto plano.
  if (body && typeof body === 'object' && 'success' in body && 'data' in body) {
    return body.data as T
  }
  return body as T
}

// --------------------------------- servicio ---------------------------------

export const SriService = {
  /** POST /sri/import — sube uno o varios reportes del portal. */
  importar(archivos: ArchivoSubido[], branchId?: string | null): Promise<{
    jobId: string
    resumen: ResumenImportacion
  }> {
    return request('/import', {
      method: 'POST',
      body: JSON.stringify({ archivos, branch_id: branchId ?? null }),
    })
  },

  /** GET /sri/import/{jobId} — progreso de la importación. */
  estadoImportacion(jobId: string): Promise<JobImportacion> {
    return request(`/import/${encodeURIComponent(jobId)}`)
  },

  /** GET /sri/documents — comprobantes importados. */
  async listarDocumentos(
    params: { limit?: number; docType?: DocType; soloPendientes?: boolean; soloSinXml?: boolean } = {},
  ): Promise<DocumentoSri[]> {
    const qs = new URLSearchParams()
    if (params.limit) qs.set('limit', String(params.limit))
    if (params.docType) qs.set('docType', params.docType)
    if (params.soloPendientes) qs.set('soloPendientes', 'true')
    if (params.soloSinXml) qs.set('soloSinXml', 'true')
    const s = qs.toString()
    const res = await request<DocumentoSri[] | { items?: DocumentoSri[]; data?: DocumentoSri[] }>(
      `/documents${s ? `?${s}` : ''}`,
    )
    return Array.isArray(res) ? res : res.items ?? res.data ?? []
  },

  /** GET /sri/documents/resumen — totales para encabezados. */
  resumenDocumentos(): Promise<ResumenDocumentos> {
    return request('/documents/resumen')
  },

  /** GET /sri/documents/{clave}/xml — respaldo legal del comprobante. */
  obtenerXml(claveAcceso: string): Promise<{ claveAcceso: string; xml: string | null }> {
    return request(`/documents/${encodeURIComponent(claveAcceso)}/xml`)
  },
}

// --------------------------------- utilidades ---------------------------------

/**
 * Lee un File y devuelve su contenido en base64.
 * readAsDataURL preserva los bytes originales: el reporte del SRI viene en
 * ISO-8859-1 y leerlo como texto UTF-8 rompe las eñes de las razones sociales.
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error(`No se pudo leer "${file.name}"`))
    reader.onload = () => {
      const r = String(reader.result || '')
      resolve(r.includes(',') ? r.slice(r.indexOf(',') + 1) : r)
    }
    reader.readAsDataURL(file)
  })
}

/**
 * Validación rápida en el navegador antes de subir.
 *
 * OJO: no se pueden quitar los tabuladores de la línea. Al hacerlo, la clave de
 * acceso queda pegada al número de serie ("...023239781" + "0107202601...") y
 * deja de reconocerse como un bloque de 49 dígitos. Se separa por el delimitador
 * y se busca una celda que sea EXACTAMENTE la clave.
 */
export async function validarReporte(
  file: File,
): Promise<{ ok: boolean; comprobantes: number; antiguos: number; motivo?: string }> {
  if (file.size === 0) {
    return { ok: false, comprobantes: 0, antiguos: 0, motivo: 'El archivo está vacío.' }
  }
  if (file.size > 8 * 1024 * 1024) {
    return { ok: false, comprobantes: 0, antiguos: 0, motivo: 'El archivo supera los 8 MB.' }
  }

  const texto = await file.text()
  const lineas = texto.split(/\r?\n/).filter((l) => l.trim())
  if (!lineas.length) {
    return { ok: false, comprobantes: 0, antiguos: 0, motivo: 'El archivo está vacío.' }
  }

  const cabecera = lineas[0].toUpperCase()
  if (!cabecera.includes('CLAVE_ACCESO')) {
    return {
      ok: false,
      comprobantes: 0,
      antiguos: 0,
      motivo: 'No es el reporte del SRI (falta la columna CLAVE_ACCESO).',
    }
  }

  // los primeros 8 dígitos de la clave son la fecha de emisión (ddmmaaaa)
  const limite = Date.now() - 30 * 24 * 60 * 60 * 1000
  let comprobantes = 0
  let antiguos = 0

  for (const linea of lineas.slice(1)) {
    const clave = linea
      .split(/[\t;,]/)
      .map((c) => c.trim())
      .find((c) => /^\d{49}$/.test(c))
    if (!clave) continue
    comprobantes++
    const f = Date.UTC(
      Number(clave.slice(4, 8)),
      Number(clave.slice(2, 4)) - 1,
      Number(clave.slice(0, 2)),
    )
    if (Number.isFinite(f) && f < limite) antiguos++
  }

  if (!comprobantes) {
    return { ok: false, comprobantes: 0, antiguos: 0, motivo: 'El reporte no contiene comprobantes.' }
  }
  return { ok: true, comprobantes, antiguos }
}

export const ETIQUETA_TIPO: Record<string, string> = {
  FACTURA: 'Factura',
  LIQUIDACION: 'Liquidación',
  NC: 'Nota de crédito',
  ND: 'Nota de débito',
  RETENCION: 'Retención',
  GUIA_REMISION: 'Guía de remisión',
  OTRO: 'Otro',
}

export function fmtMoneda(v?: number | string | null): string {
  const n = typeof v === 'string' ? Number(v) : v
  if (n == null || !Number.isFinite(n)) return '—'
  return new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD' }).format(n)
}

export function fmtFecha(v?: string | null): string {
  if (!v) return '—'
  const d = new Date(v)
  return Number.isNaN(d.getTime())
    ? '—'
    : new Intl.DateTimeFormat('es-EC', {
        day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC',
      }).format(d)
}
