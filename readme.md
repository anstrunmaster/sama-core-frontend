# Frontend — Patrones y Convenciones

> **Proyecto:** FACTURASAAS  
> **Framework:** Next.js 14 App Router  
> **Estado:** Referencia canónica para páginas nuevas  
> **Última actualización:** Julio 2026

---

## 1. Estructura de una página tipo

```typescript
'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { ChevronLeft, Plus, RefreshCw, AlertCircle, X, CheckCircle2 } from 'lucide-react'

// ── Constantes ────────────────────────────────────────────────────────────────
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://d16rb4jhhui7p6.cloudfront.net/api/v1'

// ── Auth helpers ──────────────────────────────────────────────────────────────
function getToken(): string {
  return localStorage.getItem('_at') || localStorage.getItem('accessToken') || ''
}

function getUser(): any {
  try {
    const s = localStorage.getItem('saas_auth')
    if (s) { const p = JSON.parse(s); return p.state?.user ?? p.user ?? p }
    return JSON.parse(localStorage.getItem('user') || '{}')
  } catch { return {} }
}

// ── Helpers de formato ────────────────────────────────────────────────────────
function fmtMoney(n: number | string | null | undefined): string {
  const v = typeof n === 'string' ? parseFloat(n) : (n ?? 0)
  if (!Number.isFinite(v)) return '$0.00'
  return new Intl.NumberFormat('es-EC', {
    style: 'currency', currency: 'USD',
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(v as number)
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function num(v: any): number {
  if (v === null || v === undefined) return 0
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0
  if (typeof v === 'string') { const n = parseFloat(v); return Number.isFinite(n) ? n : 0 }
  if (typeof v.toNumber === 'function') return v.toNumber()
  return 0
}

// ── Tipos ─────────────────────────────────────────────────────────────────────
interface Item {
  id: string
  tenant_id: string
  name: string
  // ...
}

// ── Página ────────────────────────────────────────────────────────────────────
export default function MiModuloPage() {
  const router = useRouter()
  const [items, setItems]     = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')
  const [success, setSuccess] = useState('')

  // ── Carga de datos ──────────────────────────────────────────────────────────
  async function load() {
    setLoading(true)
    setError('')
    try {
      const res  = await fetch(`${API_URL}/mi-modulo`, {
        headers: { Authorization: `Bearer ${getToken()}` }
      })
      const data = await res.json()
      if (!res.ok) throw new Error(Array.isArray(data.message) ? data.message[0] : data.message)
      const payload = data.data ?? data          // ← desenvuelve el wrapper { success, data }
      setItems(Array.isArray(payload.data) ? payload.data : payload)
    } catch (e: any) {
      setError(e.message || 'Error al cargar')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  // ── Acciones ────────────────────────────────────────────────────────────────
  async function handleCreate(body: Partial<Item>) {
    setError('')
    try {
      const res  = await fetch(`${API_URL}/mi-modulo`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body:    JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(Array.isArray(data.message) ? data.message[0] : data.message)
      setSuccess('Creado correctamente')
      setTimeout(() => setSuccess(''), 3000)
      load()
    } catch (e: any) {
      setError(e.message || 'Error')
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <DashboardLayout>
      <div className="p-6 space-y-5">

        {/* Header estándar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()}
              className="p-1.5 rounded-lg border border-edge text-ink-tertiary hover:text-ink-primary hover:border-edge-strong transition-all">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-lg font-bold text-ink-primary">Título del módulo</h1>
              <p className="text-sm text-ink-tertiary mt-0.5">Descripción breve</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={load} disabled={loading}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-edge-subtle border border-edge text-sm text-ink-secondary hover:text-ink-primary hover:border-edge-strong disabled:opacity-50 transition-all">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Actualizar
            </button>
            <button onClick={() => handleCreate({})}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue text-sm font-semibold text-white hover:bg-blue/90 transition-all">
              <Plus className="w-3.5 h-3.5" /> Nuevo
            </button>
          </div>
        </div>

        {/* Alertas */}
        {error && (
          <div className="flex items-center justify-between px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-600 dark:text-red-400">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
            <button onClick={() => setError('')} className="text-red-600/60 hover:text-red-600 transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {success && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-green-500/10 border border-green-500/20 text-sm text-green-600 dark:text-green-400">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="card h-16 animate-pulse" />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && items.length === 0 && (
          <div className="card py-16 text-center">
            <p className="text-sm text-ink-tertiary">Sin registros</p>
            <p className="text-xs text-ink-ghost mt-1">Crea el primero usando el botón "Nuevo"</p>
          </div>
        )}

        {/* Tabla de datos */}
        {!loading && items.length > 0 && (
          <div className="card overflow-hidden">
            <table className="w-full">
              <thead className="bg-surface-raised">
                <tr className="border-b border-edge-subtle">
                  <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-ink-tertiary">
                    Nombre
                  </th>
                  <th className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-widest text-ink-tertiary">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map(item => (
                  <tr key={item.id} className="border-b border-edge-subtle last:border-0 hover:bg-edge-subtle transition-colors">
                    <td className="px-4 py-3 text-sm text-ink-primary font-medium">{item.name}</td>
                    <td className="px-4 py-3 text-right">
                      <button className="text-xs text-blue hover:underline">Ver</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>
    </DashboardLayout>
  )
}
```

---

## 2. Tokens de diseño

### Colores de texto
| Token | Uso |
|-------|-----|
| `text-ink-primary` | Texto principal, títulos |
| `text-ink-secondary` | Texto secundario, labels |
| `text-ink-tertiary` | Texto de apoyo, subtítulos |
| `text-ink-ghost` | Texto muy sutil, placeholders |
| `text-blue` | Acento, links, botones primarios |

### Fondos y bordes
| Token | Uso |
|-------|-----|
| `bg-surface` | Fondo de página |
| `bg-surface-raised` | Headers de tabla, cards elevadas |
| `bg-edge-subtle` | Filas hover, separadores suaves |
| `bg-blue-muted` | Seleccionado activo |
| `border-edge` | Bordes de cards, inputs |
| `border-edge-subtle` | Separadores de filas |
| `border-edge-strong` | Bordes hover |

### Componentes base
| Clase | Uso |
|-------|-----|
| `card` | Contenedor con borde y sombra |
| `field` | Input/select estilizado |
| `btn` | Botón base |
| `btn-ghost` | Botón sin fondo |

---

## 3. Patrones de llamadas API

### GET simple
```typescript
const res  = await fetch(`${API_URL}/ruta`, { headers: { Authorization: `Bearer ${getToken()}` } })
const data = await res.json()
const payload = data.data ?? data  // ← SIEMPRE desenvolver el wrapper
```

### POST / PUT
```typescript
const res = await fetch(`${API_URL}/ruta`, {
  method:  'POST',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
  body:    JSON.stringify(body),
})
const data = await res.json()
if (!res.ok) {
  const msg = Array.isArray(data.message) ? data.message[0] : data.message
  throw new Error(msg || 'Error')
}
```

### Descarga de archivos (XML, PDF)
```typescript
const res  = await fetch(`${API_URL}/ruta?params`, { headers: { Authorization: `Bearer ${getToken()}` } })
if (!res.ok) throw new Error('Error')
const dispo    = res.headers.get('Content-Disposition') || ''
const match    = dispo.match(/filename="?([^"]+)"?/)
const filename = match?.[1] || 'archivo.xml'
const blob     = await res.blob()
const url      = URL.createObjectURL(blob)
const a        = document.createElement('a')
a.href = url; a.download = filename
document.body.appendChild(a); a.click()
document.body.removeChild(a)
URL.revokeObjectURL(url)
```

### Respuesta paginada
```typescript
const payload = data.data ?? data
const items   = Array.isArray(payload.data) ? payload.data : payload
const total   = payload.pagination?.total ?? 0
```

---

## 4. Estructura de página con tabs

```typescript
type Tab = 'tab1' | 'tab2' | 'tab3'

const TABS: Array<{ id: Tab; label: string; icon: typeof Eye }> = [
  { id: 'tab1', label: 'Primera', icon: Eye },
  { id: 'tab2', label: 'Segunda', icon: FileText },
]

const [activeTab, setActiveTab] = useState<Tab>('tab1')

// Render de tabs
<div className="flex items-center gap-1 border-b border-edge-subtle overflow-x-auto">
  {TABS.map(({ id, label, icon: Icon }) => {
    const active = activeTab === id
    return (
      <button key={id} onClick={() => setActiveTab(id)}
        className={`relative flex items-center gap-2 px-4 py-3 text-xs font-semibold transition-all whitespace-nowrap ${
          active ? 'text-ink-primary' : 'text-ink-tertiary hover:text-ink-secondary'
        }`}>
        <Icon className="w-4 h-4" />
        {label}
        {active && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue" />}
      </button>
    )
  })}
</div>

<div>
  {activeTab === 'tab1' && <Componente1 />}
  {activeTab === 'tab2' && <Componente2 />}
</div>
```

---

## 5. Impresión de documentos

**NUNCA imprimir el modal directamente.** Usar ventana nueva con HTML autónomo:

```typescript
function imprimirDocumento(data: any) {
  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Documento</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; font-size: 12px; padding: 20px; }
    /* Todos los estilos inline — NO depender de Tailwind */
    @media print { body { padding: 10px; } }
  </style>
</head>
<body>
  <h1>${data.titulo}</h1>
  <!-- contenido -->
  <script>window.onload = () => { window.print(); }</script>
</body>
</html>`

  const ventana = window.open('', '_blank', 'width=700,height=900')
  if (ventana) {
    ventana.document.write(html)
    ventana.document.close()
  }
}
```

---

## 6. Badges y estados

```typescript
// Patrón de badge con colores por estado
const ESTADO_COLORS: Record<string, string> = {
  ACTIVO:    'bg-green-500/10 text-green-600 border-green-500/20',
  BORRADOR:  'bg-amber-500/10 text-amber-600 border-amber-500/20',
  PAGADO:    'bg-blue/10 text-blue border-blue/20',
  ANULADO:   'bg-red-500/10 text-red-600 border-red-500/20',
}

function Badge({ status, label }: { status: string; label: string }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${ESTADO_COLORS[status] ?? 'bg-edge text-ink-tertiary border-edge'}`}>
      {label}
    </span>
  )
}
```

---

## 7. Sidebar — agregar módulo nuevo

En `components/layout/Sidebar.tsx`:

```typescript
import { NuevoIcono } from 'lucide-react'

// En NAV_GROUPS:
{
  label: 'Nuevo Módulo',
  collapsible: true,
  defaultOpen: false,
  items: [
    { href: '/nuevo-modulo',          label: 'Lista',    icon: NuevoIcono },
    { href: '/nuevo-modulo/crear',    label: 'Crear',    icon: Plus },
    { href: '/nuevo-modulo/reportes', label: 'Reportes', icon: BarChart2 },
  ],
},
```

**Reglas:**
- `href` en minúscula y sin trailing slash
- Coincide exactamente con la carpeta en `app/`
- Iconos solo de `lucide-react`

---

## 8. Patrones de formulario de edición

```typescript
// Estado del formulario
const [form, setForm] = useState<Partial<Entity>>({})
const [editing, setEditing] = useState(false)

// Helpers inline
const inp = (k: keyof Entity, props: any = {}) => (
  <input className="field" value={(form[k] as string) ?? ''}
    onChange={(e) => setForm(f => ({ ...f, [k]: e.target.value }))} {...props} />
)

const sel = (k: keyof Entity, opts: string[], placeholder = 'Sin asignar') => (
  <select className="field" value={(form[k] as string) ?? ''}
    onChange={(e) => setForm(f => ({ ...f, [k]: e.target.value }))}>
    <option value="">{placeholder}</option>
    {opts.map(o => <option key={o} value={o}>{o}</option>)}
  </select>
)

// Toggle vista/edición
{editing ? (
  <>{/* campos de edición */}</>
) : (
  <>{/* campos de solo lectura */}</>
)}
```

---

## 9. Checklist para página nueva

- [ ] `'use client'` al inicio
- [ ] `API_URL`, `getToken()`, `getUser()` copiados
- [ ] Wrapper `data.data ?? data` en todas las respuestas
- [ ] Header estándar con botón volver + título + acciones
- [ ] Error alert con botón X para cerrar
- [ ] Success alert que desaparece en 3 segundos
- [ ] Loading skeleton con `animate-pulse`
- [ ] Empty state descriptivo
- [ ] No usar `<form>` — usar `onClick` handlers
- [ ] Agregado al sidebar en `NAV_GROUPS`
- [ ] Ruta en minúscula coincide con carpeta en `app/`

---

## 10. Variables de entorno

```bash
NEXT_PUBLIC_API_URL=https://d16rb4jhhui7p6.cloudfront.net/api/v1
NEXT_PUBLIC_INVOICES_URL=https://main.d2n0xc418in8nz.amplifyapp.com/
```

El fallback hardcodeado en cada página actúa como respaldo si la variable no está disponible en el build.
