'use client'
import { useState } from 'react'
import {
  ChevronDown, ChevronRight, FolderOpen, FileText, Edit3,
  Trash2, Lock, AlertCircle, EyeOff, Shield,
} from 'lucide-react'
import {
  type AccountWithChildren,
  ACCOUNT_TYPE_COLORS,
} from '../types'

interface Props {
  accounts: AccountWithChildren[]
  searchTerm?: string
  expandAll?: boolean
  onEdit?: (account: AccountWithChildren) => void
  onDelete?: (account: AccountWithChildren) => void
  onAddChild?: (parent: AccountWithChildren) => void
}

/**
 * Árbol jerárquico de cuentas contables.
 *
 * - Click en una fila expande/colapsa sus hijos
 * - Hover muestra botones de acción (editar, eliminar, agregar hijo)
 * - Las cuentas del sistema (is_system=true) muestran ícono de candado
 * - Las cuentas inactivas se renderizan opacas
 */
export function AccountTree({
  accounts, searchTerm, expandAll, onEdit, onDelete, onAddChild,
}: Props) {
  return (
    <div className="card rounded-2xl divide-y divide-edge-subtle">
      {accounts.length === 0 ? (
        <div className="p-12 text-center">
          <FolderOpen className="w-10 h-10 text-ink-ghost mx-auto mb-3" />
          <p className="text-sm text-ink-secondary">No hay cuentas en el plan</p>
          <p className="text-xs text-ink-tertiary mt-1">
            Cargá el plan estándar Ecuador o creá una nueva cuenta
          </p>
        </div>
      ) : (
        accounts.map((acc) => (
          <AccountRow
            key={acc.id}
            account={acc}
            depth={0}
            searchTerm={searchTerm}
            expandAll={expandAll}
            onEdit={onEdit}
            onDelete={onDelete}
            onAddChild={onAddChild}
          />
        ))
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// Fila individual (recursiva)
// ─────────────────────────────────────────────────────────────────

function AccountRow({
  account, depth, searchTerm, expandAll, onEdit, onDelete, onAddChild,
}: {
  account: AccountWithChildren
  depth: number
  searchTerm?: string
  expandAll?: boolean
  onEdit?: (account: AccountWithChildren) => void
  onDelete?: (account: AccountWithChildren) => void
  onAddChild?: (parent: AccountWithChildren) => void
}) {
  // Auto-expandir si:
  // - Hay searchTerm Y la cuenta o sus descendientes matchean
  // - expandAll es true
  // - Es nivel 1 o 2 (raíz)
  const matchesSearch = !!searchTerm && (
    account.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    account.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    hasMatchInDescendants(account, searchTerm.toLowerCase())
  )

  const [expanded, setExpanded] = useState(
    expandAll || matchesSearch || account.level <= 2,
  )

  const hasChildren = account.children && account.children.length > 0
  const color = ACCOUNT_TYPE_COLORS[account.account_type]
  const isInactive = !account.is_active

  // Resaltar si matchea el search (texto)
  const codeHi = highlight(account.code, searchTerm)
  const nameHi = highlight(account.name, searchTerm)

  return (
    <div>
      <div
        className={`group flex items-center gap-2 px-4 py-2.5 hover:bg-edge-subtle transition-colors ${
          isInactive ? 'opacity-50' : ''
        }`}
        style={{ paddingLeft: `${16 + depth * 20}px` }}
      >
        {/* Toggle expandir/colapsar */}
        <button
          onClick={() => hasChildren && setExpanded(!expanded)}
          className="w-5 h-5 flex items-center justify-center text-ink-tertiary hover:text-ink-primary flex-shrink-0"
          aria-label={expanded ? 'Colapsar' : 'Expandir'}
        >
          {hasChildren ? (
            expanded ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5" />
            )
          ) : (
            <span className="w-1 h-1 rounded-full bg-ink-ghost" />
          )}
        </button>

        {/* Icono */}
        <div
          className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: `${color}15` }}
        >
          {hasChildren ? (
            <FolderOpen className="w-3 h-3" style={{ color }} />
          ) : (
            <FileText className="w-3 h-3" style={{ color }} />
          )}
        </div>

        {/* Código */}
        <span
          className="font-mono text-[11px] font-semibold tabular-nums"
          style={{ color, minWidth: '80px' }}
        >
          {codeHi}
        </span>

        {/* Nombre */}
        <span
          className={`text-sm flex-1 min-w-0 truncate ${
            hasChildren ? 'font-semibold text-ink-primary' : 'text-ink-secondary'
          }`}
        >
          {nameHi}
        </span>

        {/* Badges */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {account.allows_movement && (
            <span
              className="text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              title="Esta cuenta admite movimientos contables"
            >
              ●
            </span>
          )}
          {account.is_system && (
            <Shield
              className="w-3 h-3 text-ink-tertiary"
              aria-label="Cuenta del plan estándar — no se puede eliminar"
            />
          )}
          {isInactive && (
            <EyeOff
              className="w-3 h-3 text-ink-tertiary"
              aria-label="Inactiva"
            />
          )}
        </div>

        {/* Acciones (visibles en hover) */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          {onAddChild && !account.allows_movement && (
            <button
              onClick={(e) => { e.stopPropagation(); onAddChild(account) }}
              className="p-1.5 rounded hover:bg-edge text-ink-tertiary hover:text-blue transition-colors"
              title="Agregar sub-cuenta"
            >
              <span className="text-base leading-none">+</span>
            </button>
          )}
          {onEdit && (
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(account) }}
              className="p-1.5 rounded hover:bg-edge text-ink-tertiary hover:text-blue transition-colors"
              title="Editar"
            >
              <Edit3 className="w-3 h-3" />
            </button>
          )}
          {onDelete && !account.is_system && !hasChildren && (
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(account) }}
              className="p-1.5 rounded hover:bg-edge text-ink-tertiary hover:text-red-500 transition-colors"
              title="Eliminar"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}
          {onDelete && account.is_system && (
            <span
              className="p-1.5 text-ink-ghost"
              title="No se puede eliminar (cuenta del plan estándar)"
            >
              <Lock className="w-3 h-3" />
            </span>
          )}
        </div>
      </div>

      {/* Hijos (recursivo) */}
      {hasChildren && expanded && (
        <div className="border-t border-edge-subtle/50">
          {account.children!.map((child) => (
            <AccountRow
              key={child.id}
              account={child}
              depth={depth + 1}
              searchTerm={searchTerm}
              expandAll={expandAll}
              onEdit={onEdit}
              onDelete={onDelete}
              onAddChild={onAddChild}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────

function hasMatchInDescendants(account: AccountWithChildren, searchLower: string): boolean {
  if (!account.children) return false
  for (const child of account.children) {
    if (
      child.code.toLowerCase().includes(searchLower) ||
      child.name.toLowerCase().includes(searchLower)
    ) {
      return true
    }
    if (hasMatchInDescendants(child, searchLower)) return true
  }
  return false
}

function highlight(text: string, term?: string): React.ReactNode {
  if (!term || term.length === 0) return text
  const lower = text.toLowerCase()
  const termLower = term.toLowerCase()
  const idx = lower.indexOf(termLower)
  if (idx === -1) return text
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-amber-400/30 text-ink-primary rounded px-0.5">
        {text.slice(idx, idx + term.length)}
      </mark>
      {text.slice(idx + term.length)}
    </>
  )
}
