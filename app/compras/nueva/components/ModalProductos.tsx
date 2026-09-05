import { X, Search, Loader2, Plus, Save, ChevronLeft, ChevronRight } from 'lucide-react'
import { fmtMoney } from '../../api'

const UNIT_OPTIONS = [
  'UND', 'KG', 'G', 'LB', 'L', 'ML',
  'M', 'CM', 'M2', 'M3', 'CAJA', 'PAQ',
  'DOC', 'PAR', 'ROLLO', 'GAL', 'SACO',
]

interface ProductForm {
  code: string
  name: string
  type: 'PRODUCT' | 'SERVICE'
  category_id: string
  unit: string
  price: string
  cost_price: string
}

interface ProductResult {
  id: string
  code: string
  name: string
  type: string
  unit: string | null
}

interface UnresolvedLine {
  lineIndex: number
  description: string
  xmlCode: string | null
  quantity: string
  unit_price: string
  resolvedProductId: string | null
  resolvedProductName: string | null
}

interface CategoryOption {
  id: string
  code: string
  name: string
  category_type: string
}

interface ModalProductosProps {
  unresolvedLines: UnresolvedLine[]
  resolvingIndex: number
  productSearch: string
  productResults: ProductResult[]
  searchingProducts: boolean
  showCreateProduct: boolean
  directAccountId: string
  directAccounts: { id: string; code: string; name: string }[]
  categoryId: string
  newProductForm: ProductForm
  creatingProduct: boolean
  categories: CategoryOption[]
  onClose: () => void
  onSearchChange: (v: string) => void
  onResolveWithProduct: (p: ProductResult) => void
  onResolveWithAccount: (id: string, code: string, name: string) => void
  onResolveWithCategory: (id: string, code: string, name: string) => void
  onDirectAccountChange: (v: string) => void
  onCategoryChange: (v: string) => void
  onSkip: () => void
  onShowCreateProduct: () => void
  onHideCreateProduct: () => void
  onNewProductFormChange: (f: ProductForm) => void
  onCreateProduct: () => void
  onNavigate: (idx: number) => void
}

export function ModalProductos({
  unresolvedLines,
  resolvingIndex,
  productSearch,
  productResults,
  searchingProducts,
  showCreateProduct,
  directAccountId,
  directAccounts,
  categoryId,
  newProductForm,
  creatingProduct,
  categories,
  onClose,
  onSearchChange,
  onResolveWithProduct,
  onResolveWithAccount,
  onResolveWithCategory,
  onDirectAccountChange,
  onCategoryChange,
  onSkip,
  onShowCreateProduct,
  onHideCreateProduct,
  onNewProductFormChange,
  onCreateProduct,
  onNavigate,
}: ModalProductosProps) {
  const currentUnresolved = unresolvedLines[resolvingIndex]
  const resolvedCount = unresolvedLines.filter(ul => ul.resolvedProductId).length

  const compatibleCategories = categories.filter(c =>
    newProductForm.type === 'SERVICE' ? c.category_type === 'SERVICE' : c.category_type === 'INVENTORY'
  )

  const inventoryCategories = categories.filter(c => c.category_type === 'INVENTORY')

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-surface border border-edge rounded-xl shadow-2xl w-full max-w-lg">

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-edge-subtle">
          <div>
            <h3 className="text-sm font-bold text-ink-primary">Productos sin identificar</h3>
            <p className="text-xs text-ink-tertiary mt-0.5">
              {resolvedCount} de {unresolvedLines.length} resueltos
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-24 h-1.5 bg-edge-subtle rounded-full overflow-hidden">
              <div
                className="h-full bg-blue rounded-full transition-all"
                style={{ width: `${(resolvedCount / unresolvedLines.length) * 100}%` }}
              />
            </div>
            <button onClick={onClose} className="text-ink-tertiary hover:text-ink-primary ml-2">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-5 space-y-4">

          {/* Info XML */}
          <div className="bg-surface-raised rounded-xl p-4 space-y-2 border border-edge-subtle">
            <p className="text-[10px] uppercase tracking-widest text-ink-tertiary font-semibold">Detectado en el XML</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-ink-tertiary">Descripción</span>
                <p className="font-semibold text-ink-primary mt-0.5">{currentUnresolved.description}</p>
              </div>
              {currentUnresolved.xmlCode && (
                <div>
                  <span className="text-ink-tertiary">Código del proveedor</span>
                  <p className="font-mono text-ink-primary mt-0.5">{currentUnresolved.xmlCode}</p>
                </div>
              )}
              <div>
                <span className="text-ink-tertiary">Cantidad</span>
                <p className="text-ink-primary mt-0.5">{currentUnresolved.quantity}</p>
              </div>
              <div>
                <span className="text-ink-tertiary">Precio unitario</span>
                <p className="text-ink-primary mt-0.5">{fmtMoney(parseFloat(currentUnresolved.unit_price))}</p>
              </div>
            </div>
          </div>

          {!showCreateProduct ? (
            <>
              {/* Búsqueda */}
              <div>
                <p className="text-xs font-medium text-ink-primary mb-2">Relacionar con producto del catálogo</p>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-ghost pointer-events-none" />
                  <input
                    type="text"
                    value={productSearch}
                    onChange={(e) => onSearchChange(e.target.value)}
                    placeholder="Buscar por nombre o código..."
                    className="field pl-9"
                    autoFocus
                  />
                </div>
              </div>

              {searchingProducts && (
                <div className="flex items-center gap-2 text-xs text-ink-tertiary py-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Buscando...
                </div>
              )}

              {!searchingProducts && productResults.length > 0 && (
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {productResults.map(p => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => onResolveWithProduct(p)}
                      className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg border border-edge hover:bg-blue/5 hover:border-blue/30 transition-all text-left"
                    >
                      <div>
                        <span className="font-mono text-xs font-semibold text-ink-primary">{p.code}</span>
                        <span className="ml-2 text-sm text-ink-secondary">{p.name}</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-ink-tertiary shrink-0" />
                    </button>
                  ))}
                </div>
              )}

              {!searchingProducts && productSearch.trim() && productResults.length === 0 && (
                <p className="text-xs text-ink-tertiary text-center py-2">No se encontraron productos con ese término</p>
              )}

              {/* Categoría contable */}
              {inventoryCategories.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-ink-primary">
                    ¿Producto inventariable sin referencia específica?
                  </p>
                  <select
                    value={categoryId}
                    onChange={e => {
                      const id = e.target.value
                      onCategoryChange(id)
                      if (id) {
                        const cat = categories.find(c => c.id === id)
                        if (cat) onResolveWithCategory(cat.id, cat.code, cat.name)
                      }
                    }}
                    className="field w-full text-sm"
                  >
                    <option value="">Registrar por categoría de inventario</option>
                    {inventoryCategories.map(c => (
                      <option key={c.id} value={c.id}>{c.code} — {c.name}</option>
                    ))}
                  </select>
                  <p className="text-[10px] text-ink-tertiary">
                    Registra el ingreso en inventario bajo esta categoría, sin crear un producto específico.
                  </p>
                </div>
              )}

              {/* Cuenta directa */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-ink-primary mb-2">Registrar como gasto directo (sin inventario)</p>
                <select
                  value={directAccountId}
                  onChange={e => {
                    const accountId = e.target.value
                    onDirectAccountChange(accountId)
                    if (accountId) {
                      const account = directAccounts.find(a => a.id === accountId)
                      if (account) onResolveWithAccount(account.id, account.code, account.name)
                    }
                  }}
                  className="field w-full text-sm"
                >
                  <option value="">Registrar como gasto excepcional</option>
                  {directAccounts.map(a => (
                    <option key={a.id} value={a.id}>{a.code} — {a.name}</option>
                  ))}
                </select>
              </div>

              {/* Acciones */}
              <div className="flex gap-2 pt-2 border-t border-edge-subtle">
                <button
                  type="button"
                  onClick={onSkip}
                  className="flex-1 py-2.5 rounded-lg border border-edge text-sm text-ink-secondary hover:text-ink-primary transition-all"
                >
                  Omitir
                </button>
                <button
                  type="button"
                  onClick={onShowCreateProduct}
                  className="flex-1 py-2.5 rounded-lg bg-blue hover:bg-blue-hover text-sm font-semibold text-white transition-all flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Crear nuevo producto
                </button>
              </div>
              <p className="text-[10px] text-ink-tertiary text-center mt-1">
                Se crea en el catálogo sin stock — el inventario aumenta al registrar la recepción
              </p>
            </>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-ink-primary">Crear nuevo producto</p>
                <button type="button" onClick={onHideCreateProduct} className="text-xs text-ink-tertiary hover:text-ink-primary underline">
                  ← Volver a búsqueda
                </button>
              </div>

              <div className="flex gap-2">
                {(['PRODUCT', 'SERVICE'] as const).map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => onNewProductFormChange({ ...newProductForm, type: t, category_id: '' })}
                    className={`flex-1 py-2 rounded-lg border text-xs font-semibold transition-all ${
                      newProductForm.type === t ? 'border-blue bg-blue-muted text-blue' : 'border-edge text-ink-tertiary'
                    }`}
                  >
                    {t === 'PRODUCT' ? '📦 Inventario' : '⚙️ Servicio'}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-medium text-ink-secondary mb-1">Código *</label>
                  <input
                    value={newProductForm.code}
                    onChange={e => onNewProductFormChange({ ...newProductForm, code: e.target.value.toUpperCase().slice(0, 20) })}
                    className="field font-mono text-sm"
                    placeholder="PROD-001"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-ink-secondary mb-1">Unidad</label>
                  <select
                    value={newProductForm.unit}
                    onChange={e => onNewProductFormChange({ ...newProductForm, unit: e.target.value })}
                    className="field text-sm"
                  >
                    <option value="">Sin unidad</option>
                    {UNIT_OPTIONS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-ink-secondary mb-1">Nombre *</label>
                <input
                  value={newProductForm.name}
                  onChange={e => onNewProductFormChange({ ...newProductForm, name: e.target.value })}
                  className="field text-sm"
                  placeholder="Nombre del producto"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-ink-secondary mb-1">Categoría contable</label>
                <select
                  value={newProductForm.category_id}
                  onChange={e => onNewProductFormChange({ ...newProductForm, category_id: e.target.value })}
                  className="field text-sm"
                >
                  <option value="">Sin categoría</option>
                  {compatibleCategories.map(c => (
                    <option key={c.id} value={c.id}>{c.code} — {c.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-medium text-ink-secondary mb-1">Precio de venta *</label>
                  <input
                    type="number" step="0.01" min="0"
                    value={newProductForm.price}
                    onChange={e => onNewProductFormChange({ ...newProductForm, price: e.target.value })}
                    className="field text-sm text-right"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-ink-secondary mb-1">Precio de costo</label>
                  <input
                    type="number" step="0.01" min="0"
                    value={newProductForm.cost_price}
                    onChange={e => onNewProductFormChange({ ...newProductForm, cost_price: e.target.value })}
                    className="field text-sm text-right"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={onCreateProduct}
                disabled={creatingProduct || !newProductForm.code.trim() || !newProductForm.name.trim() || !newProductForm.price}
                className="w-full py-2.5 rounded-lg bg-blue hover:bg-blue-hover disabled:opacity-50 text-sm font-semibold text-white transition-all flex items-center justify-center gap-2"
              >
                {creatingProduct
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Creando...</>
                  : <><Save className="w-4 h-4" /> Guardar producto</>
                }
              </button>
            </div>
          )}
        </div>

        {/* Navegación */}
        {unresolvedLines.length > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-edge-subtle">
            <button
              type="button"
              disabled={resolvingIndex === 0}
              onClick={() => onNavigate(resolvingIndex - 1)}
              className="flex items-center gap-1 text-xs text-ink-tertiary hover:text-ink-primary disabled:opacity-30 transition-all"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Anterior
            </button>
            <span className="text-xs text-ink-tertiary tabular-nums">
              {resolvingIndex + 1} / {unresolvedLines.length}
            </span>
            <button
              type="button"
              disabled={resolvingIndex === unresolvedLines.length - 1}
              onClick={() => onNavigate(resolvingIndex + 1)}
              className="flex items-center gap-1 text-xs text-ink-tertiary hover:text-ink-primary disabled:opacity-30 transition-all"
            >
              Siguiente <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
