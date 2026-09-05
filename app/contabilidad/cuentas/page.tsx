'use client'
import { useEffect, useMemo, useState } from 'react'
import {
  BookOpen, Plus, Search, Database, RefreshCw, Loader2,
  AlertCircle, Filter, X, ChevronsDown, ChevronsUp, CheckCircle2,
} from 'lucide-react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { accountsApi } from './api'
import {
  type AccountWithChildren,
  type AccountType,
  type AccountStats,
  ACCOUNT_TYPE_LABELS,
  ACCOUNT_TYPE_COLORS,
} from './types'
import { AccountTree } from './components/AccountTree'
import { AccountFormModal } from './components/AccountFormModal'

export default function PlanDeCuentasPage() {
  const [tree, setTree] = useState<AccountWithChildren[]>([])
  const [stats, setStats] = useState<AccountStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<AccountType | null>(null)
  const [includeInactive, setIncludeInactive] = useState(false)
  const [expandAll, setExpandAll] = useState(false)

  const [modal, setModal] = useState<
    | null
    | { mode: 'create'; parent?: AccountWithChildren }
    | { mode: 'edit'; account: AccountWithChildren }
  >(null)

  const [confirmDelete, setConfirmDelete] = useState<AccountWithChildren | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [seeding, setSeeding] = useState(false)
  const [seedMsg, setSeedMsg] = useState('')

  async function loadAll() {
    setLoading(true)
    setError('')
    try {
      const [treeRes, statsRes] = await Promise.all([
        accountsApi.tree(),
        accountsApi.stats(),
      ])
      setTree(treeRes)
      setStats(statsRes)
    } catch (e: any) {
      setError(e.message || 'Error al cargar')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadAll() }, [])

  const filteredTree = useMemo(() => {
    if (!search && !typeFilter && includeInactive) return tree
    return filterTree(tree, {
      search: search.trim().toLowerCase(),
      type: typeFilter,
      includeInactive,
    })
  }, [tree, search, typeFilter, includeInactive])

  async function handleSeed() {
    if (!confirm('¿Cargar el plan de cuentas estándar de Ecuador (~75 cuentas)? Si ya hay cuentas, no se hará nada.')) return
    setSeeding(true)
    setSeedMsg('')
    try {
      const result = await accountsApi.seed()
      if (result.skipped) {
        setSeedMsg('Ya tenés un plan cargado. Si querés re-seedear, primero eliminá las cuentas.')
      } else {
        setSeedMsg(`✓ Plan cargado: ${result.created} cuentas creadas.`)
        await loadAll()
      }
    } catch (e: any) {
      setSeedMsg(`✗ Error: ${e.message}`)
    } finally {
      setSeeding(false)
      setTimeout(() => setSeedMsg(''), 6000)
    }
  }

  async function handleDelete() {
    if (!confirmDelete) return
    setDeleting(true)
    try {
      await accountsApi.delete(confirmDelete.id)
      setConfirmDelete(null)
      await loadAll()
    } catch (e: any) {
      setError(e.message || 'Error al eliminar')
      setDeleting(false)
    }
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <BookOpen className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <h1 className="text-lg font-bold text-ink-primary">Plan de Cuentas</h1>
            </div>
            <p className="text-sm text-ink-tertiary mt-0.5">
              Estructura jerárquica de cuentas contables · Ecuador NIIF
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {stats && stats.total === 0 && (
              <button
                onClick={handleSeed}
                disabled={seeding}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-sm font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 disabled:opacity-50 transition-all"
              >
                {seeding
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : <Database className="w-3.5 h-3.5" />
                }
                Cargar plan estándar
              </button>
            )}
            <button
              onClick={() => setModal({ mode: 'create' })}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-edge-subtle border border-edge text-sm text-ink-secondary hover:text-ink-primary hover:border-edge-strong transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              Nueva cuenta
            </button>
            <button
              onClick={loadAll}
              disabled={loading}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-edge-subtle border border-edge text-sm text-ink-secondary hover:text-ink-primary hover:border-edge-strong disabled:opacity-50 transition-all"
              title="Recargar"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Mensaje del seed */}
        {seedMsg && (
          <div className={`flex items-center gap-2 px-4 py-3 rounded-lg border text-sm ${
            seedMsg.startsWith('✓')
              ? 'bg-green-500/10 border-green-500/20 text-green-600 dark:text-green-400'
              : seedMsg.startsWith('✗')
              ? 'bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400'
              : 'bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400'
          }`}>
            {seedMsg.startsWith('✓') && <CheckCircle2 className="w-4 h-4 shrink-0" />}
            {seedMsg.startsWith('✗') && <AlertCircle className="w-4 h-4 shrink-0" />}
            <span>{seedMsg}</span>
          </div>
        )}

        {/* Error general */}
        {error && (
          <div className="flex items-center justify-between px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-600 dark:text-red-400">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              onClick={() => setError('')}
              className="text-red-600/60 dark:text-red-400/60 hover:text-red-600 dark:hover:text-red-400 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Stats por tipo */}
        {stats && stats.total > 0 && (
          <div className="grid grid-cols-3 md:grid-cols-6 lg:grid-cols-7 gap-2">
            <div className="card p-3 w-full">
              <div className="flex items-center gap-1.5 mb-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                <span className="text-[10px] uppercase tracking-widest text-ink-tertiary font-semibold">
                  Total
                </span>
              </div>
              <div className="text-xl font-bold text-ink-primary tabular-nums">{stats.total}</div>
            </div>
            {(Object.entries(stats.by_type) as Array<[AccountType, number]>).map(([type, count]) => (
              <button
                key={type}
                onClick={() => setTypeFilter(typeFilter === type ? null : type)}
                className={`card p-3 w-full text-left transition-all ${
                  typeFilter === type
                    ? 'border-edge-strong bg-edge-subtle'
                    : 'hover:bg-edge-subtle'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-2">
                  <span
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ backgroundColor: ACCOUNT_TYPE_COLORS[type] }}
                  />
                  <span className="text-[10px] uppercase tracking-widest text-ink-tertiary font-semibold">
                    {ACCOUNT_TYPE_LABELS[type]}
                  </span>
                </div>
                <div className="text-xl font-bold text-ink-primary tabular-nums">{count}</div>
              </button>
            ))}
          </div>
        )}

        {/* Toolbar */}
        {stats && stats.total > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex-1 min-w-[200px] relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-ghost pointer-events-none" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="field w-full pl-10"
                placeholder="Buscar por código o nombre..."
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-tertiary hover:text-ink-primary transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <button
              onClick={() => setExpandAll(!expandAll)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-edge-subtle border border-edge text-sm text-ink-secondary hover:text-ink-primary hover:border-edge-strong transition-all"
            >
              {expandAll
                ? <ChevronsUp className="w-3.5 h-3.5" />
                : <ChevronsDown className="w-3.5 h-3.5" />
              }
              {expandAll ? 'Colapsar' : 'Expandir'}
            </button>
            <label className="flex items-center gap-2 px-3 py-2 rounded-lg bg-edge-subtle border border-edge text-sm text-ink-secondary cursor-pointer hover:text-ink-primary hover:border-edge-strong transition-all">
              <input
                type="checkbox"
                checked={includeInactive}
                onChange={(e) => setIncludeInactive(e.target.checked)}
                className="w-3.5 h-3.5"
              />
              Incluir inactivas
            </label>
            {typeFilter && (
              <button
                onClick={() => setTypeFilter(null)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-edge-subtle border border-edge text-sm text-ink-secondary hover:text-ink-primary hover:border-edge-strong transition-all"
              >
                <Filter className="w-3.5 h-3.5" />
                {ACCOUNT_TYPE_LABELS[typeFilter]}
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        )}

        {/* Árbol */}
        {loading ? (
          <div className="card py-16 text-center">
            <Loader2 className="w-6 h-6 text-blue-600 dark:text-blue-400 animate-spin mx-auto mb-3" />
            <p className="text-sm text-ink-tertiary">Cargando plan de cuentas...</p>
          </div>
        ) : (
          <AccountTree
            accounts={filteredTree}
            searchTerm={search}
            expandAll={expandAll}
            onEdit={(acc) => setModal({ mode: 'edit', account: acc })}
            onDelete={(acc) => setConfirmDelete(acc)}
            onAddChild={(parent) => setModal({ mode: 'create', parent })}
          />
        )}

        {/* Empty state */}
        {!loading && stats && stats.total === 0 && (
          <div className="card py-16 text-center">
            <Database className="w-10 h-10 text-ink-ghost mx-auto mb-3" />
            <h3 className="text-base font-semibold text-ink-primary mb-1">
              Empezá tu plan de cuentas
            </h3>
            <p className="text-sm text-ink-tertiary mb-5 max-w-md mx-auto">
              Cargá el plan de cuentas estándar de Ecuador NIIF (75 cuentas) o
              creá las tuyas manualmente.
            </p>
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={handleSeed}
                disabled={seeding}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-sm font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 disabled:opacity-50 transition-all"
              >
                {seeding
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : <Database className="w-3.5 h-3.5" />
                }
                Cargar plan estándar
              </button>
              <button
                onClick={() => setModal({ mode: 'create' })}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-edge-subtle border border-edge text-sm text-ink-secondary hover:text-ink-primary hover:border-edge-strong transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                Crear manual
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal crear/editar */}
      {modal && (
        <AccountFormModal
          mode={modal.mode}
          account={modal.mode === 'edit' ? (modal as any).account : null}
          parent={modal.mode === 'create' ? (modal as any).parent : null}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); loadAll() }}
        />
      )}

      {/* Modal confirmar borrado */}
      {confirmDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => !deleting && setConfirmDelete(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="card-raised w-full max-w-md p-6 shadow-2xl"
          >
            <div className="flex items-start gap-4 mb-5">
              <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-ink-primary">Eliminar cuenta</h3>
                <p className="text-sm text-ink-tertiary mt-1">
                  Esta acción no se puede deshacer.
                </p>
              </div>
            </div>

            <div className="bg-edge-subtle border border-edge-subtle rounded-lg p-3 mb-5">
              <div className="flex justify-between text-sm">
                <span className="text-ink-tertiary">Código</span>
                <span className="font-mono font-semibold text-ink-primary">{confirmDelete.code}</span>
              </div>
              <div className="flex justify-between text-sm mt-1.5">
                <span className="text-ink-tertiary">Nombre</span>
                <span className="text-ink-secondary">{confirmDelete.name}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-lg border border-edge text-sm text-ink-secondary hover:text-ink-primary hover:border-edge-strong disabled:opacity-50 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-sm font-semibold text-red-600 dark:text-red-400 hover:bg-red-500/20 disabled:opacity-50 transition-all"
              >
                {deleting
                  ? <><Loader2 className="w-3.5 h-3.5 animate-spin inline mr-1.5" />Eliminando...</>
                  : 'Confirmar eliminación'
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}

// ─── Filtrado del árbol en memoria ────────────────────────────────

function filterTree(
  nodes: AccountWithChildren[],
  filters: { search: string; type: AccountType | null; includeInactive: boolean },
): AccountWithChildren[] {
  const result: AccountWithChildren[] = []
  for (const node of nodes) {
    const filteredChildren = node.children ? filterTree(node.children, filters) : []
    const matchesSearch = !filters.search ||
      node.code.toLowerCase().includes(filters.search) ||
      node.name.toLowerCase().includes(filters.search)
    const matchesType = !filters.type || node.account_type === filters.type
    const matchesActive = filters.includeInactive || node.is_active
    if ((matchesSearch && matchesType && matchesActive) || filteredChildren.length > 0) {
      result.push({ ...node, children: filteredChildren })
    }
  }
  return result
}
