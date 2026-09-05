import {
  Shield, Zap, BarChart3, Users,
  Brain, Receipt, Boxes, Wallet,
  Mail, Phone, MapPin,
} from 'lucide-react'

/* ------------------------------------------------------------------ */
/*  Datos del mockup de dashboard                                      */
/* ------------------------------------------------------------------ */
export const revenueData = [
  { mes: 'Ene', valor: 42000 },
  { mes: 'Feb', valor: 55000 },
  { mes: 'Mar', valor: 48000 },
  { mes: 'Abr', valor: 71000 },
  { mes: 'May', valor: 63000 },
  { mes: 'Jun', valor: 89000 },
]

export const invoices = [
  { id: 'F-2024-0841', client: 'TechCorp Ecuador S.A.', amount: '$12,450', status: 'Pagada' },
  { id: 'F-2024-0842', client: 'Distribuidora Lima Cía.', amount: '$8,320', status: 'Pendiente' },
  { id: 'F-2024-0843', client: 'Grupo Exporta Global', amount: '$31,200', status: 'Pagada' },
]

export const features = [
  { icon: Shield, label: 'Autorizado por el SRI' },
  { icon: Zap, label: 'Emisión en segundos' },
  { icon: BarChart3, label: 'Reportes en tiempo real' },
  { icon: Users, label: 'Multi-empresa' },
]

export const navItems = ['Inicio', 'Soluciones', 'Precios', 'Contacto']

/* ------------------------------------------------------------------ */
/*  Datos para las secciones nuevas                                    */
/* ------------------------------------------------------------------ */
// Forecast AI: histórico + predicción
export const forecastData = [
  { mes: 'Mar', real: 48000, pred: null },
  { mes: 'Abr', real: 71000, pred: null },
  { mes: 'May', real: 63000, pred: null },
  { mes: 'Jun', real: 89000, pred: 89000 },
  { mes: 'Jul', real: null, pred: 96000 },
  { mes: 'Ago', real: null, pred: 104000 },
]

export const solutionModules = [
  { icon: Brain, title: 'AI Insights', desc: 'Anomalías, forecast y resúmenes en español', color: '#A78BFA' },
  { icon: Receipt, title: 'Facturación SRI', desc: 'Firma P12, SOAP, todos los comprobantes', color: '#22D3EE' },
  { icon: Boxes, title: 'Inventario', desc: 'Multi-sucursal con costo promedio', color: '#34D399' },
  { icon: Wallet, title: 'Contabilidad', desc: 'Plan de cuentas, asientos y balances', color: '#FCD34D' },
]

export const plans = [
  {
    name: 'Emprende',
    price: '$19',
    period: '/mes',
    highlight: false,
    features: ['Facturación SRI ilimitada', '1 usuario', 'Clientes y productos', 'Reportes básicos'],
  },
  {
    name: 'Pyme',
    price: '$49',
    period: '/mes',
    highlight: true,
    features: ['Todo lo de Emprende', 'Hasta 5 usuarios', 'Inventario multi-sucursal', 'Contabilidad completa', 'AI Insights'],
  },
  {
    name: 'Empresa',
    price: 'A medida',
    period: '',
    highlight: false,
    features: ['Usuarios ilimitados', 'Multi-empresa', 'API y soporte dedicado', 'Anexos fiscales (ATS, 104)'],
  },
]

export const contactChannels = [
  { icon: Mail, label: 'Correo', value: 'hola@teusec.com' },
  { icon: Phone, label: 'WhatsApp', value: '+593 99 123 4567' },
  { icon: MapPin, label: 'Oficina', value: 'Portoviejo, Ecuador' },
]

/* ------------------------------------------------------------------ */
/*  Contenido por sección (lado izquierdo)  muestra de ctd             */
/* ------------------------------------------------------------------ */
export const navContent: Record<string, {
  badge: string
  title: React.ReactNode
  desc: string
  primaryCta: string
}> = {
  Inicio: {
    badge: 'Sistema certificado por el SRI — Ecuador',
    title: <>Contabilidad<br />Financiera{' '}<span className="bg-clip-text text-transparent" style={{ backgroundImage: 'linear-gradient(90deg, #A78BFA, #22D3EE)' }}>inteligente.</span></>,
    desc: 'Automatiza emisión de facturas, notas de crédito y retenciones. Gestiona clientes, usuarios y reportes desde una sola plataforma sin complicaciones.',
    primaryCta: 'Ingresar al Sistema',
  },
  Soluciones: {
    badge: 'Data inteligente · Análisis predictivo',
    title: <>Tus números,<br />ahora{' '}<span className="bg-clip-text text-transparent" style={{ backgroundImage: 'linear-gradient(90deg, #A78BFA, #22D3EE)' }}>con cerebro.</span></>,
    desc: 'Más que facturar: detectamos anomalías, predecimos tus ventas y te explicamos qué está pasando en tu negocio en lenguaje claro. Todo el ecosistema en un solo lugar.',
    primaryCta: 'Explorar módulos',
  },
  Precios: {
    badge: 'Sin letras pequeñas · Sin contratos',
    title: <>Precios{' '}<span className="bg-clip-text text-transparent" style={{ backgroundImage: 'linear-gradient(90deg, #A78BFA, #22D3EE)' }}>claros</span><br />que escalan contigo.</>,
    desc: 'Empieza gratis y crece a tu ritmo. Cambia de plan cuando quieras, sin penalizaciones. El plan Pyme incluye AI Insights de regalo.',
    primaryCta: 'Comenzar gratis',
  },
  Contacto: {
    badge: 'Respondemos en menos de 24h',
    title: <>Hablemos de tu{' '}<span className="bg-clip-text text-transparent" style={{ backgroundImage: 'linear-gradient(90deg, #A78BFA, #22D3EE)' }}>negocio.</span></>,
    desc: '¿Dudas sobre el SRI, migración de datos o cómo funciona el módulo de AI? Escríbenos y un humano de verdad te responde. Sin bots, sin vueltas.',
    primaryCta: 'Agendar demo',
  },
}
