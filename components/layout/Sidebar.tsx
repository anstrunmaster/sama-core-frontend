'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect, useMemo } from 'react'
import {
  LayoutDashboard, Users2, MonitorSmartphone, ScrollText,
  LogOut, Hexagon, Receipt, FileText, Warehouse, Package, BarChart2,
  Users, Banknote, BarChart3, FileBadge, ShoppingCart, Building2,
  BookOpen, FileEdit, BookText, Library, Inbox, Settings, Scale,
  LineChart, Lock, ChevronDown,FilePlus,FileX,FileSearch,Briefcase,ListChecks,DollarSign,Tag, TrendingUp, TrendingDown,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import { Badge } from '@/components/ui/Badge'
import { ThemeToggle } from '@/components/ThemeToggle'
import { usePermissions, canView } from '@/hooks/usePermissions'

// ─── Types ───────────────────────────────────────────────────────────────────

type Urgency = 'alert' | 'warn' | 'ok'

interface TaxObligation {
  title: string
  description: string
  urgency: Urgency
  href: string
}

interface NavItem {
  href:   string
  label:  string
  icon:   React.ElementType
  module: string  // ← NUEVO slug identificador
}

interface NavGroup {
  label:       string | null
  module?:     string  // ← NUEVO slug del grupo
  collapsible?: boolean
  defaultOpen?: boolean
  items:       NavItem[]
}

const NAV_GROUPS: NavGroup[] = [

  {
    label:  null,
    module: 'dashboard',
    collapsible: false,
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, module: 'dashboard' },
    ],
  },


  
  {
    label:       'Comercial',
    module:      'comercial',
    collapsible: true,
    defaultOpen: true,
    items: [
      { href: '/facturacion',   label: 'Factura Rápida',     icon: Receipt,      module: 'comercial.facturacion' },
      { href: '/cotizaciones',  label: 'Factura Enterprise',      icon: FileSearch,   module: 'comercial.cotizaciones' },
      { href: '/facturas',      label: 'Mis Facturas',      icon: FileText,     module: 'comercial.facturas' },
      { href: '/compras',       label: 'Compras',           icon: ShoppingCart, module: 'comercial.compras' },
      { href: '/notas-credito', label: 'Notas de Crédito',  icon: FileX,        module: 'comercial.notas_credito' },
      { href: '/notas-debito',  label: 'Notas de Débito',   icon: FilePlus,     module: 'comercial.notas_debito' },
      { href: '/retenciones',   label: 'Retenciones',       icon: Receipt,      module: 'comercial.retenciones' },
      { href: '/clientes',      label: 'Clientes',          icon: Users,        module: 'comercial.clientes' },
      { href: '/proveedores',   label: 'Proveedores',       icon: Building2,    module: 'comercial.proveedores' },
    ],
  },
  {
    label:       'Inventario',
    module:      'inventario',
    collapsible: true,
    defaultOpen: false,
    items: [
      { href: '/products',   label: 'Productos', icon: Package,  module: 'inventario.productos' },
      { href: '/inventory',  label: 'Stock',     icon: BarChart2, module: 'inventario.stock' },
      { href: '/warehouses', label: 'Bodegas',   icon: Warehouse, module: 'inventario.bodegas' },
      { href: '/categories',  label: 'Categorías',  icon: Tag,       module: 'inventario.categorias' },
    ],
  },
  {
    label:       'Contabilidad',
    module:      'contabilidad',
    collapsible: true,
    defaultOpen: false,
    items: [
      { href: '/contabilidad/pendientes', label: 'Pendientes',        icon: Inbox,      module: 'contabilidad.pendientes' },
      { href: '/contabilidad/asientos',   label: 'Asientos',          icon: FileEdit,   module: 'contabilidad.asientos' },
      { href: '/contabilidad/diario',     label: 'Libro Diario',      icon: BookText,   module: 'contabilidad.diario' },
      { href: '/contabilidad/mayor',      label: 'Libro Mayor',       icon: Library,    module: 'contabilidad.mayor' },
      { href: '/contabilidad/cuentas',    label: 'Plan de Cuentas',   icon: BookOpen,   module: 'contabilidad.cuentas' },
      { href: '/contabilidad/balance',    label: 'Balance General',   icon: Scale,      module: 'contabilidad.balance' },
      { href: '/contabilidad/resultados', label: 'Est. Resultados',   icon: LineChart,  module: 'contabilidad.resultados' },
      { href: '/contabilidad/balanza',    label: 'Balanza',           icon: ListChecks, module: 'contabilidad.balanza' },
    ],
  },
  {
    label:       'Finanzas',
    module:      'finanzas',
    collapsible: true,
    defaultOpen: false,
    items: [
      { href: '/banco',    label: 'Banco',             icon: Banknote,      module: 'finanzas.banco' },
      { href: '/cxc',      label: 'Cuentas por Cobrar', icon: TrendingUp,    module: 'finanzas.cxc' },
      { href: '/cxp',      label: 'Cuentas por Pagar',  icon: TrendingDown,  module: 'finanzas.cxp' },
      { href: '/reportes', label: 'Reportes',           icon: BarChart3,     module: 'finanzas.reportes' },
      { href: '/anexos',   label: 'Anexos SRI',         icon: FileBadge,     module: 'finanzas.anexos' },
    ],
  },
  {
    label:       'Talento Humano',
    module:      'rrhh',
    collapsible: true,
    defaultOpen: false,
    items: [
      { href: '/rrhh/cargos',      label: 'Cargos',      icon: Briefcase,  module: 'rrhh.cargos' },
      { href: '/rrhh/empleados',   label: 'Empleados',   icon: Users,      module: 'rrhh.empleados' },
      { href: '/rrhh/nomina',      label: 'Nómina',      icon: DollarSign, module: 'rrhh.nomina' },
      { href: '/rrhh/organigrama', label: 'Organigrama', icon: Building2,  module: 'rrhh.organigrama' },
    ],
  },
  {
    label:       'Configuración',
    module:      'configuracion',
    collapsible: true,
    defaultOpen: false,
    items: [
      { href: '/contabilidad/mapeo',  label: 'Mapeo Contable',   icon: Settings,        module: 'configuracion.mapeo' },
      { href: '/contabilidad/cierre', label: 'Cierre Ejercicio', icon: Lock,            module: 'configuracion.cierre' },
      { href: '/tenants',             label: 'Mi Empresa',       icon: Building2,       module: 'configuracion.empresa' },
      { href: '/users',               label: 'Usuarios',         icon: Users2,          module: 'configuracion.usuarios' },
      { href: '/sessions',            label: 'Sesiones',         icon: MonitorSmartphone, module: 'configuracion.sesiones' },
      { href: '/audit',               label: 'Auditoría',        icon: ScrollText,      module: 'configuracion.auditoria' },
    ],
  },
  {
  label: 'Sistema',
  module: 'sistema',
  collapsible: true,
  defaultOpen: false,
  items: [
    { href: '/backoffice', label: 'Back Office', icon: Settings, module: 'sistema.backoffice' },
  ],
},
    
]

// ─── Rutas pendientes de implementar ─────────────────────────────────────────
// Cuando estén listas, mover al NAV_GROUPS correspondiente arriba.
//
//   /notas-credito            Notas de Crédito (cod. SRI 04)  — zip entregado
//   /notas-debito             Notas de Débito  (cod. SRI 05)  — zip entregado
//   /retenciones              Comprobantes de Retención (cod. 07)
//   /remisiones               Guías de Remisión (cod. 06)
//   /declaraciones/iva        Declaración IVA  — Form. 104
//   /declaraciones/renta      Declaración IR   — Form. 102
//   /declaraciones/ret        Retenciones      — Form. 103
//   /declaraciones/ats        Anexo Transaccional Simplificado (ATS)
//   /declaraciones/rdep       Anexo Relación de Dependencia (RDEP)

const STORAGE_KEY = 'sidebar_collapsed_groups'

const planBadge: Record<string, 'blue' | 'amber' | 'green' | 'muted'> = {
  BASIC: 'muted', PREMIUM: 'blue', ENTERPRISE: 'green',
}

// ─── Helpers de vencimientos ─────────────────────────────────────────────────

function getDeadlineDay(digit: number): number {
  const map: Record<number, number> = {
    1: 10, 2: 12, 3: 14, 4: 16, 5: 18,
    6: 20, 7: 22, 8: 24, 9: 26, 0: 28,
  }
  return map[digit] ?? 28
}

function getDaysUntil(day: number): number {
  const now    = new Date()
  const target = new Date(now.getFullYear(), now.getMonth() + 1, day)
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

function urgencyFromDays(days: number): Urgency {
  if (days <= 4)  return 'alert'
  if (days <= 10) return 'warn'
  return 'ok'
}

// ─── ObligationRow ────────────────────────────────────────────────────────────

function ObligationRow({ item }: { item: TaxObligation }) {
  const dotCls =
    item.urgency === 'alert' ? 'bg-red-500'
    : item.urgency === 'warn'  ? 'bg-amber-400'
    : 'bg-emerald-400'

  const daysCls =
    item.urgency === 'alert' ? 'text-red-500 dark:text-red-400'
    : item.urgency === 'warn'  ? 'text-amber-500 dark:text-amber-400'
    : 'text-ink-ghost'

  return (
    <Link
      href={item.href}
      className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-edge-subtle transition-colors group"
    >
      <span className={cn('w-1.5 h-1.5 rounded-full shrink-0 mt-px', dotCls)} />
      <span className="flex-1 text-[11.5px] text-ink-secondary group-hover:text-ink-primary truncate leading-tight">
        {item.title}
      </span>
      <span className={cn('text-[10px] font-medium tabular-nums shrink-0', daysCls)}>
        {item.description}
      </span>
    </Link>
  )
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

export function Sidebar() {
  const path = usePathname()
  const { user, logout } = useAuth()

  const [collapsed, setCollapsed]             = useState<Record<string, boolean>>({})
  const [obligationsOpen, setObligationsOpen] = useState(false)
  const [mounted, setMounted]                 = useState(false)
  const { data: permissions } = usePermissions()

  // 9° dígito del RUC para calcular vencimientos
  const rucNinthDigit = useMemo(() => {
    const ruc = user?.ruc ?? '0000000000001'
    return parseInt(ruc[8] ?? '0', 10)
  }, [user?.ruc])

  const deadlineDay = getDeadlineDay(rucNinthDigit)

  const taxObligations: TaxObligation[] = useMemo(() => [
    {
      title:       'IVA — Form. 104',
      description: `${getDaysUntil(deadlineDay)}d`,
      urgency:     urgencyFromDays(getDaysUntil(deadlineDay)),
      href:        '/anexos',
    },
    {
      title:       'Retenciones — Form. 103',
      description: `${getDaysUntil(deadlineDay + 2)}d`,
      urgency:     urgencyFromDays(getDaysUntil(deadlineDay + 2)),
      href:        '/anexos',
    },
    {
      title:       'ATS mensual',
      description: `${getDaysUntil(deadlineDay + 5)}d`,
      urgency:     urgencyFromDays(getDaysUntil(deadlineDay + 5)),
      href:        '/anexos',
    },
  ], [deadlineDay])

  const alertCount = taxObligations.filter(o => o.urgency === 'alert').length

  // Cargar estado persistido
  useEffect(() => {
    setMounted(true)
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        setCollapsed(JSON.parse(saved))
      } else {
        const defaults: Record<string, boolean> = {}
        NAV_GROUPS.forEach(g => {
          if (g.collapsible && g.label) defaults[g.label] = true
        })
        setCollapsed(defaults)
      }
    } catch {}
  }, [])

  // Auto-abrir grupo con ruta activa
  useEffect(() => {
    if (!mounted) return
    NAV_GROUPS.forEach(g => {
      if (!g.collapsible || !g.label) return
      const hasActive = g.items.some(i => path.startsWith(i.href))
      if (hasActive) {
        setCollapsed(() => {

  const next: Record<string, boolean> = {}

  NAV_GROUPS.forEach(group => {
    if (group.collapsible && group.label) {
      next[group.label] = true
    }
  })

  next[g.label!] = false

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {}

  return next
})
         
      }
    })
  }, [path, mounted])

const toggleGroup = (label: string) => {
  setCollapsed(prev => {

    const willOpen = prev[label]

    const next: Record<string, boolean> = {}

    NAV_GROUPS.forEach(group => {
      if (group.collapsible && group.label) {
        next[group.label] = true
      }
    })

    next[label] = !willOpen

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    } catch {}

    return next
  })
}

  const isGroupCollapsed = (label: string) => collapsed[label] ?? true

  return (
    <aside className="w-[224px] shrink-0 flex flex-col h-screen sticky top-0 bg-surface border-r border-edge-subtle">

      {/* Logo */}
      <div className="h-[56px] flex items-center px-5 border-b border-edge-subtle shrink-0">
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <div className="w-[30px] h-[30px] rounded-[8px] bg-blue flex items-center justify-center shadow-[0_0_16px_rgba(59,130,246,0.45)] shrink-0">
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M18 6L11 13C9.9 14.1 8.1 14.1 7 13L6 12C4.9 10.9 4.9 9.1 6 8L9 5"
      stroke="white"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M6 18L13 11C14.1 9.9 15.9 9.9 17 11L18 12C19.1 13.1 19.1 14.9 18 16L15 19"
      stroke="white"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
</div>
          <span className="font-bold text-[15px] text-ink-primary tracking-tight">Syntra</span>
        </div>
        {/* Dot de alertas urgentes */}
        {alertCount > 0 && (
          <span className="w-2 h-2 rounded-full bg-red-500 shrink-0 ml-1 animate-pulse" />
        )}
      </div>

     {/* ── Compliance pill + vencimientos ────────────────────────────── */}
<div className="mx-3 mt-2.5 mb-0.5">
  {/* ADMIN/SUPER_ADMIN/ACCOUNTANT → pill con flecha y panel desplegable */}
  {(['ADMIN', 'SUPER_ADMIN', 'ACCOUNTANT'].includes(user?.role ?? '')) ? (
    <>
      <button
        onClick={() => setObligationsOpen(o => !o)}
        className={cn(
          'w-full flex items-center gap-2 px-2.5 py-[7px] rounded-lg transition-colors',
          'bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/15',
        )}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
        <span className="flex-1 text-left text-[10.5px] text-emerald-600 dark:text-emerald-400 font-medium">
          Obligado a llevar contabilidad
        </span>
        <ChevronDown
          className={cn(
            'w-3.5 h-3.5 text-emerald-500/50 shrink-0 transition-transform duration-200',
            obligationsOpen ? 'rotate-0' : '-rotate-90',
          )}
        />
      </button>
      {obligationsOpen && (
        <div className="mt-1 bg-surface rounded-lg border border-edge-subtle overflow-hidden">
          <p className="text-[9px] font-semibold uppercase tracking-widest text-ink-ghost px-3 pt-2 pb-1">
            Vencimientos del mes
          </p>
          <div className="px-1.5 pb-2 space-y-0.5">
            {taxObligations.map(ob => (
              <ObligationRow key={ob.href} item={ob} />
            ))}
          </div>
          <div className="border-t border-edge-subtle px-3 py-1.5">
            <p className="text-[9px] text-ink-ghost/50 leading-relaxed">
              Día {deadlineDay} según 9° dígito del RUC
            </p>
          </div>
        </div>
      )}
    </>
  ) : (
    /* Resto de roles → solo pill informativo sin interacción */
    <div className={cn(
      'flex items-center gap-2 px-2.5 py-[7px] rounded-lg',
      'bg-emerald-500/10 border border-emerald-500/20',
    )}>
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
      <span className="text-[10.5px] text-emerald-600 dark:text-emerald-400 font-medium">
        Obligado a llevar contabilidad
      </span>
    </div>
  )}
</div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-4">
        {NAV_GROUPS.map((group) => {
  // Filtrar ítems visibles
  const visibleItems = group.items.filter(item =>
    canView(permissions, item.module)
  )


   // Sistema/Backoffice — solo SUPER_ADMIN
  if (group.module === 'sistema' && user?.role !== 'SUPER_ADMIN') {
    return null
  }
  // Si el grupo tiene module y ningún ítem visible → ocultar grupo completo
  if (group.module && group.module !== 'dashboard' && visibleItems.length === 0) {
    return null
  }

  // Si el grupo tiene module y está bloqueado como grupo → ocultar todo
  if (group.module && permissions && permissions.length > 0 && !canView(permissions, group.module)) {
    return null
  }

  return (
    <div key={group.label ?? 'root'}>
      {/* Header del grupo — igual que antes */}
      {group.label && group.collapsible && (
        <button
          onClick={() => toggleGroup(group.label!)}
          className="w-full flex items-center justify-between px-3 py-1.5 mb-0.5 text-[10px] font-bold uppercase tracking-widest text-ink-ghost hover:text-ink-tertiary transition-colors"
        >
          {group.label}
          <ChevronDown className={cn(
            'w-3 h-3 transition-transform',
            isGroupCollapsed(group.label) ? '-rotate-90' : ''
          )} />
        </button>
      )}
      {group.label && !group.collapsible && (
        <p className="px-3 py-1.5 mb-0.5 text-[10px] font-bold uppercase tracking-widest text-ink-ghost">
          {group.label}
        </p>
      )}

      {/* Ítems — solo los visibles */}
      {(!group.collapsible || !isGroupCollapsed(group.label ?? '')) && (
        <div className="space-y-0.5 mb-3">
          {visibleItems.map(item => {
            const Icon    = item.icon
            const active  = path === item.href || path.startsWith(item.href + '/')
            return (
             <Link
  key={item.href}
  href={item.href}
  className={cn(
    'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all relative',
    active
      ? 'text-blue font-medium bg-blue/5'
      : 'text-ink-secondary hover:text-ink-primary hover:bg-edge-subtle'
  )}
>
  {/* Indicador lateral izquierdo */}
  {active && (
    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-blue rounded-full" />
  )}
  <Icon className={cn('w-4 h-4 shrink-0', active ? 'text-blue' : '')} />
  {item.label}
</Link>
            )
          })}
        </div>
      )}
    </div>
  )
})}
      </nav>

      {/* Footer */}
      <div className="border-t border-edge-subtle p-3 space-y-1 shrink-0">
        {user && (
          <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-[10px] font-bold text-white shrink-0">
              {(user.name ?? user.email)[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12.5px] font-medium text-ink-primary truncate leading-none mb-0.5">
                {user.name ?? user.email}
              </p>
              <Badge variant={planBadge[user.plan] ?? 'muted'} className="text-[10px] px-1.5 py-0">
                {user.plan}
              </Badge>
            </div>
          </div>
        )}
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button
            onClick={logout}
            className="flex flex-1 items-center gap-2 px-3 py-2 rounded-lg text-[13.5px] text-ink-tertiary hover:text-red-500 dark:hover:text-red-400 hover:bg-red-500/10 transition-all"
          >
            <LogOut className="w-[17px] h-[17px] shrink-0" />
            Cerrar sesión
          </button>
        </div>
      </div>
    </aside>
  )
}
