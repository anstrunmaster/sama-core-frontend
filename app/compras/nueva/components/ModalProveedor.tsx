import { AlertCircle, Loader2 } from 'lucide-react'

interface ModalProveedorProps {
  parsedInfo: {
    supplier_ruc: string
    supplier_name: string
    existing_supplier_id: string | null
    obligado_contabilidad: boolean
  }
  error: string
  creatingSupplier: boolean
  onCancel: () => void
  onCreate: () => void
}

export function ModalProveedor({
  parsedInfo,
  error,
  creatingSupplier,
  onCancel,
  onCreate,
}: ModalProveedorProps) {
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-surface border border-edge rounded-xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center flex-shrink-0">
            <AlertCircle className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-ink-primary">Nuevo proveedor detectado</h3>
            <p className="text-xs text-ink-tertiary mt-0.5">No está registrado en tu sistema</p>
          </div>
        </div>
        <div className="bg-surface-raised rounded-lg p-3 mb-4 space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-ink-tertiary">Razón social</span>
            <span className="font-semibold text-ink-primary">{parsedInfo.supplier_name}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-ink-tertiary">RUC</span>
            <span className="font-mono text-ink-primary">{parsedInfo.supplier_ruc}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-ink-tertiary">Obligado a contabilidad</span>
            <span className="text-ink-primary">{parsedInfo.obligado_contabilidad ? 'Sí' : 'No'}</span>
          </div>
        </div>
        <p className="text-xs text-ink-tertiary mb-4">
          El proveedor será creado con la información del comprobante. Podrás completar o editar sus datos posteriormente desde el módulo Proveedores.
        </p>
        {error && (
          <div className="mb-3 p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-600 dark:text-red-400">{error}</div>
        )}
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-2.5 rounded-lg border border-edge text-sm text-ink-secondary hover:text-ink-primary transition-all">
            Cancelar
          </button>
          <button onClick={onCreate} disabled={creatingSupplier} className="flex-1 py-2.5 rounded-lg bg-blue hover:bg-blue-hover disabled:opacity-50 text-sm font-semibold text-white transition-all flex items-center justify-center gap-2">
            {creatingSupplier ? <><Loader2 className="w-4 h-4 animate-spin" /> Creando...</> : 'Crear proveedor'}
          </button>
        </div>
      </div>
    </div>
  )
}