'use client'
import { useEffect, useRef, useState } from 'react'
import { Search, X, FileText, ChevronDown } from 'lucide-react'
import { accountsApi } from '../../cuentas/api'
import type { Account } from '../../cuentas/types'

interface Props {
  value: string | null // account_id
  onChange: (account: Account | null) => void
  placeholder?: string
  disabled?: boolean
}

/**
 * Autocomplete de cuentas contables.
 * Solo muestra cuentas con allows_movement=true y is_active=true.
 *
 * Funcionalidad:
 *  - Click → abre dropdown con todas las cuentas hoja
 *  - Type → filtra por código o nombre
 *  - Esc / click fuera → cierra
 */
export function AccountPicker({ value, onChange, placeholder, disabled }: Props) {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)

  // Cargar cuentas hoja al montar
  useEffect(() => {
    setLoading(true)
    accountsApi
      .list({ only_movement: true, include_inactive: false })
      .then((data) => setAccounts(data))
      .catch(() => setAccounts([]))
      .finally(() => setLoading(false))
  }, [])

  // Cerrar al click fuera
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setSearch('')
      }
    }
    if (open) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const selected = accounts.find((a) => a.id === value) ?? null

  const filtered = !search
    ? accounts
    : accounts.filter(
        (a) =>
          a.code.toLowerCase().includes(search.toLowerCase()) ||
          a.name.toLowerCase().includes(search.toLowerCase()),
      )

  function select(account: Account | null) {
    onChange(account)
    setOpen(false)
    setSearch('')
  }

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => !disabled && setOpen(!open)}
        disabled={disabled}
        className={`field w-full text-sm text-left flex items-center gap-2 ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        {selected ? (
          <>
            <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-edge-subtle text-ink-secondary flex-shrink-0">
              {selected.code}
            </span>
            <span className="text-ink-primary truncate flex-1">{selected.name}</span>
          </>
        ) : (
          <span className="text-ink-tertiary flex-1">{placeholder ?? 'Seleccionar cuenta...'}</span>
        )}
        <ChevronDown className={`w-3.5 h-3.5 text-ink-tertiary flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 left-0 right-0 mt-1 card-raised rounded-xl shadow-xl border border-edge max-h-[300px] flex flex-col">
          {/* Search */}
          <div className="p-2 border-b border-edge-subtle relative">
            <Search className="w-3.5 h-3.5 text-ink-tertiary absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="field w-full text-sm pl-8"
              placeholder="Buscar por código o nombre..."
              onKeyDown={(e) => {
                if (e.key === 'Escape') setOpen(false)
              }}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-ink-tertiary hover:text-ink-primary"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Lista */}
          <div className="overflow-y-auto flex-1">
            {loading ? (
              <div className="p-6 text-center text-xs text-ink-tertiary">Cargando...</div>
            ) : filtered.length === 0 ? (
              <div className="p-6 text-center">
                {accounts.length === 0 ? (
                  <>
                    <FileText className="w-8 h-8 text-ink-ghost mx-auto mb-2" />
                    <p className="text-xs text-ink-tertiary">No hay cuentas que admitan movimientos</p>
                    <p className="text-[10px] text-ink-tertiary mt-1">
                      Andá a Plan de Cuentas y creá cuentas hoja
                    </p>
                  </>
                ) : (
                  <p className="text-xs text-ink-tertiary">Sin resultados</p>
                )}
              </div>
            ) : (
              filtered.slice(0, 100).map((acc) => {
                const isSelected = acc.id === value
                return (
                  <button
                    key={acc.id}
                    type="button"
                    onClick={() => select(acc)}
                    className={`w-full px-3 py-2 flex items-center gap-2 hover:bg-edge-subtle transition-colors text-left ${
                      isSelected ? 'bg-blue-muted/30' : ''
                    }`}
                  >
                    <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-edge-subtle text-ink-secondary flex-shrink-0 min-w-[60px] text-center">
                      {acc.code}
                    </span>
                    <span className="text-sm text-ink-primary flex-1 truncate">
                      {acc.name}
                    </span>
                  </button>
                )
              })
            )}
            {filtered.length > 100 && (
              <div className="px-3 py-2 text-[10px] text-ink-tertiary italic text-center border-t border-edge-subtle">
                +{filtered.length - 100} resultados — refiná la búsqueda
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
