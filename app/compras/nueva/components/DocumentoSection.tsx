import { CheckCircle2 } from 'lucide-react'
import { type Supplier } from '../../types'
import { DOCUMENT_TYPE_LABELS, IVA_RATE_LABELS, PAYMENT_FORM_LABELS } from '../../types'
import { type TaxCatalogItem } from '../../hooks/useTaxCatalog'

interface DocumentoSectionProps {
  supplierId: string
  documentType: string
  establishment: string
  emissionPoint: string
  sequential: string
  accessKey: string
  issueDate: string
  paymentForm: string
  codSustento: string
  suppliers: Supplier[]
  supportCodes: TaxCatalogItem[]
  isRetentionAgent: boolean
  resolucionRetencion: string | null
  onSupplierChange: (v: string) => void
  onDocumentTypeChange: (v: string) => void
  onEstablishmentChange: (v: string) => void
  onEmissionPointChange: (v: string) => void
  onSequentialChange: (v: string) => void
  onAccessKeyChange: (v: string) => void
  onIssueDateChange: (v: string) => void
  onPaymentFormChange: (v: string) => void
  onCodSustentoChange: (v: string) => void
}

function Field({ label, required, children }: {
  label: string; required?: boolean; children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-[11px] font-semibold uppercase tracking-widest text-ink-tertiary mb-1.5">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}

export function DocumentoSection({
  supplierId, documentType, establishment, emissionPoint,
  sequential, accessKey, issueDate, paymentForm, codSustento,
  suppliers, supportCodes, isRetentionAgent, resolucionRetencion,
  onSupplierChange, onDocumentTypeChange, onEstablishmentChange,
  onEmissionPointChange, onSequentialChange, onAccessKeyChange,
  onIssueDateChange, onPaymentFormChange, onCodSustentoChange,
}: DocumentoSectionProps) {
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Field label="Proveedor" required>
          <select value={supplierId} onChange={(e) => onSupplierChange(e.target.value)} className="field" required>
            <option value="">Selecciona un proveedor...</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>{s.legal_name} ({s.identification})</option>
            ))}
          </select>
        </Field>
        <Field label="Tipo de documento">
          <select value={documentType} onChange={(e) => onDocumentTypeChange(e.target.value)} className="field">
            {Object.entries(DOCUMENT_TYPE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </Field>
      </div>

      <div className="grid grid-cols-3 md:grid-cols-4 gap-3 mt-3">
        <Field label="Estab.">
          <input type="text" value={establishment} onChange={(e) => onEstablishmentChange(e.target.value.padStart(3, '0').slice(0, 3))} className="field font-mono" />
        </Field>
        <Field label="Pto. emis.">
          <input type="text" value={emissionPoint} onChange={(e) => onEmissionPointChange(e.target.value.padStart(3, '0').slice(0, 3))} className="field font-mono" />
        </Field>
        <Field label="Secuencial" required>
          <input type="text" value={sequential} onChange={(e) => onSequentialChange(e.target.value)} className="field font-mono" placeholder="000000123" required />
        </Field>
        <Field label="Fecha emisión" required>
          <input type="date" value={issueDate} onChange={(e) => onIssueDateChange(e.target.value)} className="field" required />
        </Field>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
        <Field label="Clave de acceso (opcional)">
          <input type="text" value={accessKey} onChange={(e) => onAccessKeyChange(e.target.value)} className="field font-mono text-xs" placeholder="49 dígitos" maxLength={49} />
        </Field>
        <Field label="Forma de pago">
          <select value={paymentForm} onChange={(e) => onPaymentFormChange(e.target.value)} className="field">
            {Object.entries(PAYMENT_FORM_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-3 mt-3">
        <Field label="Sustento tributario">
          <select value={codSustento} onChange={(e) => onCodSustentoChange(e.target.value)} className="field">
            <option value="">Selecciona el sustento...</option>
            {supportCodes.map((s) => (
              <option key={s.code} value={s.code}>{s.code} — {s.name}</option>
            ))}
          </select>
        </Field>
        {isRetentionAgent && resolucionRetencion && (
          <div className="flex items-center gap-2 p-2 rounded-lg bg-blue-muted border border-blue/20">
            <CheckCircle2 className="w-3.5 h-3.5 text-blue flex-shrink-0" />
            <span className="text-xs text-blue font-medium">
              Agente de Retención — Resolución: {resolucionRetencion}
            </span>
          </div>
        )}
      </div>
    </>
  )
}