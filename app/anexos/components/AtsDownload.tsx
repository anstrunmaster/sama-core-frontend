'use client'
import { useState } from 'react'
import {
  Download, FileBadge, CheckCircle2, AlertCircle, FileCode, Info,
} from 'lucide-react'
import { taxReportsApi } from '../api'
import { periodLabel, type TaxPeriod } from '../types'

interface Props {
  period: TaxPeriod
}

export function AtsDownload({ period }: Props) {
  const [downloading, setDownloading] = useState(false)
  const [success, setSuccess] = useState<{ filename: string; size: number } | null>(null)
  const [error, setError] = useState('')

  const handleDownload = async () => {
    setDownloading(true)
    setError('')
    setSuccess(null)
    try {
      const result = await taxReportsApi.downloadAts(period)
      setSuccess(result)
    } catch (e: any) {
      setError(e.message || 'Error al generar el ATS')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Card principal de descarga */}
      <div className="card rounded-2xl p-6">
        <div className="flex items-start gap-4 mb-5">
          <div className="w-12 h-12 rounded-xl bg-blue-muted flex items-center justify-center flex-shrink-0">
            <FileCode className="w-6 h-6 text-blue" />
          </div>
          <div className="flex-1">
            <h2 className="text-base font-semibold text-ink-primary mb-1">
              Anexo Transaccional Simplificado (ATS)
            </h2>
            <p className="text-sm text-ink-tertiary">
              Generá el archivo XML para subir a la plataforma del SRI con tus ventas
              del período <strong className="text-ink-primary">{periodLabel(period)}</strong>.
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 flex items-start gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-600 dark:text-red-400">
            <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-4 flex items-start gap-2 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs">
            <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-emerald-500" />
            <div>
              <div className="text-emerald-700 dark:text-emerald-400 font-semibold">
                Archivo descargado
              </div>
              <div className="text-ink-tertiary font-mono mt-0.5">
                {success.filename} · {(success.size / 1024).toFixed(1)} KB
              </div>
            </div>
          </div>
        )}

        <button
          onClick={handleDownload}
          disabled={downloading}
          className="btn btn-primary w-full justify-center"
        >
          <Download className="w-4 h-4" />
          {downloading ? 'Generando XML...' : 'Descargar XML del ATS'}
        </button>
      </div>

      {/* Pasos para subir al SRI */}
      <div className="card rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <FileBadge className="w-4 h-4 text-ink-tertiary" />
          <h3 className="text-sm font-semibold text-ink-primary">
            Cómo subir el ATS al SRI
          </h3>
        </div>

        <ol className="space-y-3">
          <Step n="1">
            <strong>Descargá el XML</strong> haciendo click en el botón de arriba.
          </Step>
          <Step n="2">
            <strong>Entrá a la plataforma del SRI</strong>:{' '}
            <a
              href="https://srienlinea.sri.gob.ec/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue hover:underline"
            >
              srienlinea.sri.gob.ec
            </a>{' '}
            con tu RUC y clave.
          </Step>
          <Step n="3">
            Andá a <strong>"Anexos" → "Anexo Transaccional Simplificado (ATS)"</strong>.
          </Step>
          <Step n="4">
            <strong>Subí el archivo XML</strong> que descargaste y completá la
            información adicional que el SRI te pida.
          </Step>
          <Step n="5">
            <strong>Validá y enviá</strong>. El SRI te dará un comprobante de presentación.
          </Step>
        </ol>
      </div>

      {/* Limitaciones v1 */}
      <div className="card rounded-xl p-4 bg-amber-500/5 border-amber-500/20">
        <div className="flex items-start gap-2">
          <Info className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
          <div className="text-[11px] text-ink-secondary leading-relaxed space-y-1">
            <p className="font-semibold text-ink-primary text-xs mb-1">
              Limitaciones en esta versión:
            </p>
            <p>· El ATS generado <strong>solo incluye ventas</strong>. Las compras y retenciones se agregarán en el módulo de Contabilidad.</p>
            <p>· No se incluyen facturas anuladas (aún no hay flag de anulación en el sistema).</p>
            <p>· No se incluyen exportaciones (todas las facturas se consideran ventas locales).</p>
            <p className="mt-2 italic">
              Si necesitás declarar todo eso, tu contador lo puede agregar manualmente en la plataforma del SRI después de subir este archivo base.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function Step({ n, children }: { n: string; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3 text-xs text-ink-secondary leading-relaxed">
      <span className="w-5 h-5 rounded-full bg-blue text-white flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">
        {n}
      </span>
      <span>{children}</span>
    </li>
  )
}
