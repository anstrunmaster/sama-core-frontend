'use client'
import { useEffect, useState } from 'react'
import {
  Search, Plus, Building2, Phone, Mail, MapPin,
  Edit3, Archive, AlertCircle, Users, MoreVertical,
} from 'lucide-react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { suppliersApi } from '../compras/api'
import {
  type Supplier,
  SUPPLIER_TYPE_LABELS,
  ID_TYPE_LABELS,
} from '../compras/types'
import { SupplierModal } from './components/SupplierModal'

/**
 * Lista de proveedores con búsqueda y filtros.
 *
 * Acciones por proveedor:
 *  - Editar (modal)
 *  - Archivar (soft delete: is_active=false)
 */
export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Filtros
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState<string>('')
  const [showInactive, setShowInactive] = useState(false)

  // Menú contextual abierto
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null)

  // Modal de crear/editar
  const [modalOpen, setModalOpen] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null)

  useEffect(() => {
    loadSuppliers()
  }, [filterType, showInactive])

  // Debounce manual de búsqueda
  useEffect(() => {
    const t = setTimeout(() => loadSuppliers(), 300)
    return () => clearTimeout(t)
  }, [search])

  async function loadSuppliers() {
    setLoading(true)
    setError('')
    try {
      const params: Record<string, any> = {}
      if (search) params.search = search
      if (filterType) params.supplier_type = filterType
      if (!showInactive) params.is_active = true

      const result = await suppliersApi.list(params)
      // Soporta tanto array directo como objeto con data
      const list = Array.isArray(result) ? result : (result as any)?.data ?? []
      setSuppliers(list as Supplier[])
    } catch (e: any) {
      setError(e.message || 'Error al cargar proveedores')
    } finally {
      setLoading(false)
    }
  }

  function openCreate() {
    setEditingSupplier(null)
    setModalOpen(true)
  }

  function openEdit(supplier: Supplier) {
    setEditingSupplier(supplier)
    setModalOpen(true)
    setMenuOpenId(null)
  }

  async function handleArchive(supplier: Supplier) {
    setMenuOpenId(null)
    if (!confirm(`¿Archivar al proveedor "${supplier.legal_name}"?\n\nNo se eliminará pero dejará de aparecer en las listas.`)) {
      return
    }
    try {
      await suppliersApi.archive(supplier.id)
      await loadSuppliers()
    } catch (e: any) {
      setError(e.message || 'Error al archivar')
    }
  }

  function handleModalSaved() {
    setModalOpen(false)
    setEditingSupplier(null)
    loadSuppliers()
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-5">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-ink-primary tracking-tight">
              Proveedores
            </h1>
            <p className="text-sm text-ink-tertiary mt-0.5">
              Gestioná tus proveedores para compras y retenciones
            </p>
          </div>
          <button onClick={openCreate} className="btn btn-primary">
            <Plus className="w-4 h-4" />
            Nuevo proveedor
          </button>
        </div>

        {/* Error inline */}
        {error && (
          <div className="card rounded-xl p-3 flex items-center gap-2 text-sm text-red-600 dark:text-red-400 bg-red-500/5 border-red-500/20">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
            <button
              onClick={() => setError('')}
              className="ml-auto text-ink-tertiary hover:text-ink-primary"
            >
              ×
            </button>
          </div>
        )}

        {/* Filtros */}
        <div className="card-raised rounded-xl p-3 flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-ink-tertiary pointer-events-none" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por RUC, cédula o razón social..."
              className="field w-full pl-9 h-9 text-sm"
              style={{ height: 36 }}
            />
          </div>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="field h-9 text-sm"
            style={{ width: 200, height: 36 }}
          >
            <option value="">Todos los tipos</option>
            {Object.entries(SUPPLIER_TYPE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>

          <label className="flex items-center gap-2 px-3 cursor-pointer">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="accent-blue"
            />
            <span className="text-xs text-ink-secondary">
              Mostrar archivados
            </span>
          </label>
        </div>

        {/* Tabla */}
        <div className="card rounded-2xl overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-sm text-ink-tertiary">
              Cargando proveedores...
            </div>
          ) : suppliers.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="w-10 h-10 text-ink-ghost mx-auto mb-3" />
              <p className="text-sm font-semibold text-ink-primary mb-1">
                {search || filterType
                  ? 'No se encontraron proveedores'
                  : 'Aún no tenés proveedores'}
              </p>
              <p className="text-xs text-ink-tertiary">
                {search || filterType
                  ? 'Probá con otros filtros'
                  : 'Creá tu primer proveedor para empezar a registrar compras'}
              </p>
              {!search && !filterType && (
                <button onClick={openCreate} className="btn btn-primary mt-4">
                  <Plus className="w-4 h-4" />
                  Crear primer proveedor
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-surface-raised">
                  <tr className="border-b border-edge-subtle">
                    {['Razón social', 'Identificación', 'Tipo', 'Contacto', 'Estado', ''].map((h) => (
                      <th
                        key={h}
                        className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-ink-tertiary"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {suppliers.map((s) => (
                    <tr
                      key={s.id}
                      className={`border-b border-edge-subtle hover:bg-edge-subtle transition-colors ${
                        !s.is_active ? 'opacity-50' : ''
                      }`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-start gap-2">
                          <Building2 className="w-3.5 h-3.5 text-ink-tertiary mt-0.5 flex-shrink-0" />
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-ink-primary truncate max-w-[300px]">
                              {s.legal_name}
                            </div>
                            {s.trade_name && (
                              <div className="text-[11px] text-ink-tertiary truncate max-w-[300px]">
                                {s.trade_name}
                              </div>
                            )}
                            {s.is_special_taxpayer && (
                              <span className="inline-block mt-1 text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400 font-bold">
                                Contribuyente especial
                              </span>
                            )}
                            {s.is_withholding_agent && (
                              <span className="inline-block mt-1 ml-1 text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-blue-muted text-blue font-bold">
                                Agente retención
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-edge-subtle text-ink-secondary">
                            {ID_TYPE_LABELS[s.identification_type] ?? s.identification_type}
                          </span>
                          <span className="text-xs font-mono text-ink-secondary">
                            {s.identification}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-ink-secondary">
                        {SUPPLIER_TYPE_LABELS[s.supplier_type]}
                      </td>
                      <td className="px-4 py-3 text-xs text-ink-tertiary">
                        <div className="space-y-0.5">
                          {s.email && (
                            <div className="flex items-center gap-1.5 max-w-[200px]">
                              <Mail className="w-3 h-3 flex-shrink-0" />
                              <span className="truncate">{s.email}</span>
                            </div>
                          )}
                          {s.phone && (
                            <div className="flex items-center gap-1.5">
                              <Phone className="w-3 h-3 flex-shrink-0" />
                              <span>{s.phone}</span>
                            </div>
                          )}
                          {s.city && (
                            <div className="flex items-center gap-1.5">
                              <MapPin className="w-3 h-3 flex-shrink-0" />
                              <span>{s.city}</span>
                            </div>
                          )}
                          {!s.email && !s.phone && !s.city && '—'}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {s.is_active ? (
                          <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                            Activo
                          </span>
                        ) : (
                          <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-bold bg-edge-subtle text-ink-tertiary">
                            Archivado
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="relative">
                          <button
                            onClick={() => setMenuOpenId(menuOpenId === s.id ? null : s.id)}
                            className="p-1.5 rounded-lg hover:bg-edge text-ink-tertiary hover:text-ink-primary transition-colors"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>
                          {menuOpenId === s.id && (
                            <>
                              <div
                                className="fixed inset-0 z-10"
                                onClick={() => setMenuOpenId(null)}
                              />
                              <div className="absolute right-0 top-full mt-1 z-20 card-raised rounded-lg shadow-xl min-w-[160px] overflow-hidden">
                                <button
                                  onClick={() => openEdit(s)}
                                  className="flex items-center gap-2 w-full px-3 py-2 text-xs text-ink-primary hover:bg-edge-subtle text-left"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                  Editar
                                </button>
                                {s.is_active && (
                                  <button
                                    onClick={() => handleArchive(s)}
                                    className="flex items-center gap-2 w-full px-3 py-2 text-xs text-amber-600 dark:text-amber-400 hover:bg-edge-subtle text-left border-t border-edge-subtle"
                                  >
                                    <Archive className="w-3.5 h-3.5" />
                                    Archivar
                                  </button>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Contador */}
        {!loading && suppliers.length > 0 && (
          <div className="text-[11px] text-ink-tertiary text-right">
            {suppliers.length} {suppliers.length === 1 ? 'proveedor' : 'proveedores'}
            {!showInactive && ' activos'}
          </div>
        )}
      </div>

      {/* Modal crear/editar */}
      {modalOpen && (
        <SupplierModal
          supplier={editingSupplier}
          onClose={() => {
            setModalOpen(false)
            setEditingSupplier(null)
          }}
          onSaved={handleModalSaved}
        />
      )}
    </DashboardLayout>
  )
}
