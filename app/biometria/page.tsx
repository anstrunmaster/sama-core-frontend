'use client'
import { useState, useRef, useCallback } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import {
  Camera, Upload, CheckCircle2, XCircle, ShieldCheck,
  ShieldX, RefreshCw, User, Fingerprint, AlertTriangle,
  Sun, Eye, MonitorSmartphone, Info
} from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://d16rb4jhhui7p6.cloudfront.net/api/v1'

function getToken(): string {
  try {
    const s = localStorage.getItem('saas_auth')
    if (s) return JSON.parse(s).state?.token ?? ''
    return ''
  } catch { return '' }
}

type Tab = 'registrar' | 'verificar'

// ── ChatBubble helper ─────────────────────────────────────────────────────────

function ChatBubble({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-surface-raised border border-edge rounded-2xl rounded-tl-sm px-4 py-3 text-sm">
      {children}
    </div>
  )
}

// ── REGISTRAR ─────────────────────────────────────────────────────────────────

function RegistrarTab() {
  const [step, setStep]       = useState<'chat' | 'form'>('chat')
  const [cedula, setCedula]   = useState('')
  const [preview, setPreview] = useState<string | null>(null)
  const [file, setFile]       = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult]   = useState<{ ok: boolean; msg: string } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  function onFile(f: File) {
    setFile(f); setPreview(URL.createObjectURL(f)); setResult(null)
  }
  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    const f = e.dataTransfer.files[0]
    if (f && f.type.startsWith('image/')) onFile(f)
  }

  async function handleSubmit() {
    if (!cedula || !file) return
    setLoading(true); setResult(null)
    try {
      const form = new FormData()
      form.append('photo', file)
      const res = await fetch(`${API_URL}/biometric/reference/${cedula}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${getToken()}` },
        body: form,
      })
      const json = await res.json()
      setResult(res.ok
        ? { ok: true,  msg: `Foto de referencia registrada para cédula ${cedula}` }
        : { ok: false, msg: json.message?.[0] ?? 'Error al registrar' })
    } catch {
      setResult({ ok: false, msg: 'Error de conexión' })
    } finally { setLoading(false) }
  }

  if (step === 'chat') {
    return (
      <div className="max-w-lg mx-auto space-y-4 py-2">
        <div className="flex justify-center">
          <div className="w-14 h-14 rounded-full bg-blue/10 flex items-center justify-center mb-1">
            <Fingerprint className="w-7 h-7 text-blue" />
          </div>
        </div>
        <ChatBubble>
          <p className="font-semibold text-ink-primary">Sistema Biométrico</p>
          <p className="text-ink-secondary mt-0.5">Registra la foto de referencia de un usuario para habilitar la verificación facial.</p>
        </ChatBubble>
        <ChatBubble>
          <p className="font-medium text-ink-primary">📋 Ten a la mano la cédula del usuario y una foto clara de su rostro.</p>
        </ChatBubble>
        <ChatBubble>
          <p className="font-medium text-ink-primary">📸 La foto debe mostrar el rostro bien iluminado y sin accesorios.</p>
        </ChatBubble>
        <div className="flex justify-center pt-2">
          <button
            onClick={() => setStep('form')}
            className="px-8 py-3 rounded-full bg-blue text-white font-semibold text-sm hover:bg-blue/90 transition-colors shadow-sm"
          >
            Empecemos
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto space-y-5">
      <div>
        <label className="block text-xs font-semibold text-ink-tertiary uppercase tracking-widest mb-1.5">
          Número de cédula
        </label>
        <input
          type="text"
          value={cedula}
          onChange={e => setCedula(e.target.value.replace(/\D/g, '').slice(0, 13))}
          placeholder="0912345678"
          className="w-full px-4 py-2.5 rounded-xl bg-surface-raised border border-edge text-ink-primary text-sm placeholder:text-ink-ghost focus:outline-none focus:border-blue transition-colors"
        />
      </div>
      <div
        onDrop={onDrop}
        onDragOver={e => e.preventDefault()}
        onClick={() => inputRef.current?.click()}
        className="relative cursor-pointer rounded-2xl border-2 border-dashed border-edge hover:border-blue/50 transition-colors overflow-hidden"
        style={{ minHeight: 200 }}
      >
        {preview ? (
          <img src={preview} alt="preview" className="w-full h-64 object-cover" />
        ) : (
          <div className="flex flex-col items-center justify-center h-48 gap-3">
            <div className="w-12 h-12 rounded-2xl bg-blue/10 flex items-center justify-center">
              <Upload className="w-5 h-5 text-blue" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-ink-primary">Arrastra una foto o haz clic</p>
              <p className="text-xs text-ink-tertiary mt-0.5">JPG, PNG · máx. 5 MB</p>
            </div>
          </div>
        )}
        <input ref={inputRef} type="file" accept="image/*" className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f) }} />
      </div>
      <button
        onClick={handleSubmit}
        disabled={!cedula || !file || loading}
        className="w-full py-3 rounded-full bg-blue text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-blue/90 transition-colors"
      >
        {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <User className="w-4 h-4" />}
        {loading ? 'Registrando…' : 'Registrar foto de referencia'}
      </button>
      {result && (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm ${
          result.ok
            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
            : 'bg-red-500/10 border-red-500/20 text-red-500'
        }`}>
          {result.ok ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <XCircle className="w-4 h-4 shrink-0" />}
          {result.msg}
        </div>
      )}
    </div>
  )
}

// ── VERIFICAR ─────────────────────────────────────────────────────────────────

type VerifyState = 'chat' | 'cedula' | 'modal-instructions' | 'camera' | 'captured' | 'loading' | 'done' | 'error' | 'last-attempt'

interface VerifyResult {
  approved: boolean
  score: number
  attemptsLeft: number
  blocked: boolean
}

function VerificarTab() {
  const [state, setState]               = useState<VerifyState>('chat')
  const [cedula, setCedula]             = useState('')
  const [capturedUrl, setCapturedUrl]   = useState<string | null>(null)
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null)
  const [result, setResult]             = useState<VerifyResult | null>(null)
  const [attemptsLeft, setAttemptsLeft] = useState(3)
  const videoRef  = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
      })
      streamRef.current = stream
      setState('camera')
      await new Promise(r => setTimeout(r, 100))
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
      }
    } catch {
      setState('cedula')
    }
  }, [])

  function stopCamera() {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
  }

  function capture() {
    if (!videoRef.current || !canvasRef.current) return
    const v = videoRef.current
    const c = canvasRef.current
    const width  = v.videoWidth  || 640
    const height = v.videoHeight || 480
    c.width = width; c.height = height
    c.getContext('2d')!.drawImage(v, 0, 0, width, height)
    stopCamera()
    c.toBlob(blob => {
      if (!blob) return
      setCapturedBlob(blob)
      setCapturedUrl(URL.createObjectURL(blob))
      setState('captured')
    }, 'image/jpeg', 0.92)
  }

  async function verify() {
    if (!cedula || !capturedBlob) return
    setState('loading')
    try {
      const form = new FormData()
      form.append('photo', capturedBlob, 'captured.jpg')
      form.append('cedula', cedula)
      const res = await fetch(`${API_URL}/biometric/verify`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}` },
        body: form,
      })
      const json = await res.json()
      if (res.ok && json.success) {
        setResult(json.data)
        setState('done')
      } else {
        const left = json.data?.attemptsLeft ?? (attemptsLeft - 1)
        setAttemptsLeft(left)
        setState(left <= 1 ? 'last-attempt' : 'error')
      }
    } catch {
      setState('error')
    }
  }

  function retake() {
    setCapturedUrl(null); setCapturedBlob(null); setResult(null)
    setState('modal-instructions')
  }

  function reset() {
    setCedula(''); setCapturedUrl(null); setCapturedBlob(null)
    setResult(null); setAttemptsLeft(3); setState('chat')
  }

  // ── CHAT inicial ──
  if (state === 'chat') {
    return (
      <div className="max-w-lg mx-auto space-y-4 py-2">
        <div className="flex justify-center">
          
  <img
    src="/bienvenida.png"
    alt="Bienvenida biométrica"
    className="w-96 h-auto" 
    onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
  />
</div>
        <ChatBubble>
          <p className="font-semibold text-ink-primary">Verificación biométrica</p>
          <p className="text-ink-secondary mt-0.5">Te damos la bienvenida al sistema de identidad digital.</p>
        </ChatBubble>
        <ChatBubble>
          <div className="space-y-2 text-ink-secondary text-sm">
            <div className="flex items-start gap-2">
              <span className="text-base">🪪</span>
              <span>Ten tu cédula a la mano para llenar tus datos.</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-base">📷</span>
              <span>Acepta los permisos para usar tu cámara, así validaremos tu identidad.</span>
            </div>
          </div>
        </ChatBubble>
        <ChatBubble>
          <p className="text-ink-secondary text-sm">
            Empecemos a verificar tu identidad de forma segura y en minutos 😊
          </p>
        </ChatBubble>
        <div className="flex justify-center pt-2">
          <button
            onClick={() => setState('cedula')}
            className="px-8 py-3 rounded-full bg-blue text-white font-semibold text-sm hover:bg-blue/90 transition-colors shadow-sm"
          >
            Empecemos
          </button>
        </div>
      </div>
    )
  }

  // ── CÉDULA ──
  if (state === 'cedula') {
    return (
      <div className="max-w-lg mx-auto space-y-4 py-2">
        <ChatBubble>
          <p className="font-medium text-ink-primary">Perfecto - Primero queremos saber que eres tú</p>
        </ChatBubble>
        <div className="bg-surface-raised border border-edge rounded-2xl p-5 space-y-4">
          <p className="font-semibold text-ink-primary text-sm">
            Ahora, escribe tu cédula y validaremos tu identidad
          </p>
          <div>
            <label className="block text-xs text-ink-tertiary mb-1.5">Cédula</label>
            <input
              type="text"
              value={cedula}
              onChange={e => setCedula(e.target.value.replace(/\D/g, '').slice(0, 13))}
              placeholder="0912345678"
              className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-surface border border-edge text-ink-primary text-sm placeholder:text-ink-ghost focus:outline-none focus:border-blue transition-colors"
            />
          </div>
          <button
            onClick={() => setState('modal-instructions')}
            disabled={cedula.length < 10}
            className="w-full py-3 rounded-full bg-blue text-white font-semibold text-sm disabled:opacity-40 hover:bg-blue/90 transition-colors"
          >
            Continuar
          </button>
        </div>
      </div>
    )
  }

  // ── MODAL INSTRUCCIONES ──
  if (state === 'modal-instructions') {
    return (
      <div className="max-w-lg mx-auto py-2">
        <ChatBubble>
          <p className="text-ink-secondary text-sm">¿Listo para una foto rápida? 📷</p>
        </ChatBubble>
        <div className="mt-4 bg-surface-raised border border-edge rounded-2xl overflow-hidden">
          <div className="p-5">
            <div className="mb-4">
              <p className="font-semibold text-ink-primary text-sm">
                Validaremos la identidad de la cédula <span className="text-blue">{cedula}</span>
              </p>
            </div>

            {/* Imagen guía principal */}
            <div className="flex justify-center mb-5">
              <img
                src="/principal.png"
                alt="Guía posición rostro"
                className="w-102 h-auto"
                onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
              />
            </div>

            <p className="font-semibold text-ink-primary text-sm mb-3">Para tomar tu foto:</p>
            <div className="bg-white dark:bg-surface border border-edge rounded-xl p-4 space-y-3 text-sm text-ink-secondary">
              <div className="flex items-center gap-3">
                <Eye className="w-4 h-4 text-ink-tertiary shrink-0" />
                <span>Mantén los ojos abiertos y evita usar lentes o gafas.</span>
              </div>
              <div className="flex items-center gap-3">
                <Sun className="w-4 h-4 text-ink-tertiary shrink-0" />
                <span>Busca un lugar iluminado y evita ponerte de espaldas a la luz.</span>
              </div>
              <div className="flex items-center gap-3">
                <MonitorSmartphone className="w-4 h-4 text-ink-tertiary shrink-0" />
                <span>Coloca tu rostro frente a la cámara, bien centrado.</span>
              </div>
            </div>
          </div>
          <div className="px-5 pb-5">
            <button
              onClick={startCamera}
              className="w-full py-3 rounded-full bg-blue text-white font-semibold text-sm hover:bg-blue/90 transition-colors"
            >
              Continuar
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── CÁMARA ──
  if (state === 'camera') {
    return (
      <div className="max-w-lg mx-auto py-2">
        <div className="relative rounded-2xl overflow-hidden bg-black" style={{ minHeight: 320 }}>
          <video ref={videoRef} autoPlay playsInline muted className="w-full h-80 object-cover" />
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-52 h-60 rounded-full border-2 border-white/60" />
          </div>
          <div className="absolute bottom-0 inset-x-0 p-5 flex justify-center bg-gradient-to-t from-black/70">
            <button
              onClick={capture}
              className="w-[72px] h-[72px] rounded-full bg-white flex items-center justify-center shadow-xl hover:scale-105 transition-transform"
            >
              <div className="w-14 h-14 rounded-full bg-blue" />
            </button>
          </div>
        </div>
        <canvas ref={canvasRef} className="hidden" />
      </div>
    )
  }

  // ── CAPTURADO ──
  if (state === 'captured') {
    return (
      <div className="max-w-lg mx-auto space-y-4 py-2">
        <div className="relative rounded-2xl overflow-hidden bg-black">
          {capturedUrl && <img src={capturedUrl} alt="captured" className="w-full h-80 object-cover" />}
        </div>
        <canvas ref={canvasRef} className="hidden" />
        <div className="flex gap-3">
          <button
            onClick={retake}
            className="flex-1 py-3 rounded-full border border-edge text-ink-secondary text-sm font-semibold flex items-center justify-center gap-2 hover:border-edge-strong transition-colors"
          >
            <RefreshCw className="w-4 h-4" /> Repetir
          </button>
          <button
            onClick={verify}
            className="flex-1 py-3 rounded-full bg-blue text-white text-sm font-semibold flex items-center justify-center gap-2 hover:bg-blue/90 transition-colors"
          >
            <Fingerprint className="w-4 h-4" /> Verificar
          </button>
        </div>
      </div>
    )
  }

  // ── LOADING ──
  if (state === 'loading') {
    return (
      <div className="max-w-lg mx-auto py-2">
        <div className="relative rounded-2xl overflow-hidden bg-black" style={{ minHeight: 320 }}>
          {capturedUrl && <img src={capturedUrl} alt="captured" className="w-full h-80 object-cover opacity-60" />}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <RefreshCw className="w-10 h-10 text-white animate-spin mx-auto mb-3" />
              <p className="text-white font-semibold">Verificando identidad…</p>
              <p className="text-white/60 text-xs mt-1">Esto puede tomar unos segundos</p>
            </div>
          </div>
        </div>
        <canvas ref={canvasRef} className="hidden" />
      </div>
    )
  }

  // ── ÉXITO ──
  if (state === 'done' && result) {
    return (
      <div className="max-w-lg mx-auto space-y-4 py-2">
        <div className={`rounded-2xl p-8 flex flex-col items-center gap-4 text-center ${
          result.approved
            ? 'bg-emerald-500/10 border border-emerald-500/20'
            : 'bg-red-500/10 border border-red-500/20'
        }`}>
          {result.approved
            ? <ShieldCheck className="w-20 h-20 text-emerald-500" />
            : <ShieldX className="w-20 h-20 text-red-500" />}
          <div>
            <p className={`text-2xl font-bold ${result.approved ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
              {result.approved ? 'IDENTIDAD VERIFICADA' : 'NO VERIFICADO'}
            </p>
            <p className="text-ink-tertiary text-sm mt-1">
              Score de similitud: <span className="font-semibold text-ink-primary">{result.score}%</span>
            </p>
            {!result.approved && result.attemptsLeft > 0 && (
              <p className="text-ink-tertiary text-xs mt-1">Intentos restantes: {result.attemptsLeft}</p>
            )}
            {result.blocked && (
              <div className="mt-3 flex items-center justify-center gap-2 text-red-500 text-sm font-semibold">
                <AlertTriangle className="w-4 h-4" /> Cuenta bloqueada temporalmente
              </div>
            )}
          </div>
        </div>
        <button
          onClick={reset}
          className="w-full py-3 rounded-full border border-edge text-ink-secondary text-sm font-semibold flex items-center justify-center gap-2 hover:border-edge-strong transition-colors"
        >
          <RefreshCw className="w-4 h-4" /> Nueva verificación
        </button>
      </div>
    )
  }

  // ── ERROR (foto no válida) ──
  if (state === 'error') {
    return (
      <div className="max-w-lg mx-auto py-2">
        <div className="bg-white dark:bg-surface-raised border border-edge rounded-3xl overflow-hidden shadow-sm">
          <div className="p-6 text-center space-y-5">
            <p className="text-xl font-bold text-ink-primary">Tu foto no es válida</p>

            {/* Imagen error */}
            <div className="flex justify-center py-2">
              <img
                src="/error.png"
                alt="Foto no válida"
                className="w-64 h-auto"
                onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
              />
            </div>

            <p className="text-ink-secondary text-sm leading-relaxed">
              Para validar tu identidad, asegúrate de que tu foto se parezca a la de tu cédula. Inténtalo de nuevo.
            </p>
            <p className="text-ink-tertiary text-xs">Intentos restantes: <span className="font-semibold">{attemptsLeft}</span></p>
          </div>
          <div className="px-6 pb-6">
            <button
              onClick={retake}
              className="w-full py-3.5 rounded-full bg-blue text-white font-semibold text-sm flex items-center justify-center gap-2 hover:bg-blue/90 transition-colors"
            >
              <RefreshCw className="w-4 h-4" /> Tomar otra foto
            </button>
          </div>
        </div>
        <canvas ref={canvasRef} className="hidden" />
      </div>
    )
  }

  // ── ÚLTIMO INTENTO ──
  if (state === 'last-attempt') {
    return (
      <div className="max-w-lg mx-auto py-2">
        <div className="bg-white dark:bg-surface-raised border border-orange-300/50 rounded-3xl overflow-hidden shadow-sm">
          <div className="p-6 text-center space-y-5">
            <p className="text-xl font-bold text-ink-primary">Este es tu último intento</p>

            {/* Imagen error (mismo SVG, estado de alerta) */}
            <div className="flex justify-center py-2">
              <img
                src="/error.png"
                alt="Último intento"
                className="w-64 h-auto"
                onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
              />
            </div>

            <p className="text-ink-secondary text-sm leading-relaxed">
              Para validar tu identidad, asegúrate de que tu foto se parezca a la de tu cédula.
              Tómala en un lugar bien iluminado, sin accesorios y con el rostro centrado.
            </p>

            <div className="bg-blue/5 border border-blue/20 rounded-2xl p-3 flex items-start gap-2 text-left">
              <Info className="w-4 h-4 text-blue shrink-0 mt-0.5" />
              <p className="text-xs text-ink-secondary">
                Si no podemos verificar tu identidad, vuelve a intentarlo en 24 horas.
              </p>
            </div>
          </div>
          <div className="px-6 pb-6">
            <button
              onClick={retake}
              className="w-full py-3.5 rounded-full bg-blue text-white font-semibold text-sm flex items-center justify-center gap-2 hover:bg-blue/90 transition-colors"
            >
              <RefreshCw className="w-4 h-4" /> Tomar otra foto
            </button>
          </div>
        </div>
        <canvas ref={canvasRef} className="hidden" />
      </div>
    )
  }

  return null
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function BiometriaPage() {
  const [tab, setTab] = useState<Tab>('verificar')

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-xl font-bold text-ink-primary tracking-tight flex items-center gap-2">
            <Fingerprint className="w-5 h-5 text-blue" />
            Verificación biométrica
          </h1>
          <p className="text-sm text-ink-tertiary mt-0.5">
            Portal de identificación de identidades mediante reconocimiento facial
          </p>
        </div>

        <div className="flex gap-1 p-1 bg-surface-raised border border-edge rounded-xl w-fit">
          {(['verificar', 'registrar'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === t
                  ? 'bg-blue text-white shadow-sm'
                  : 'text-ink-tertiary hover:text-ink-primary'
              }`}
            >
              {t === 'verificar' ? '🔍 Verificar identidad' : '📷 Registrar foto'}
            </button>
          ))}
        </div>

        <div className="card rounded-2xl p-6">
          {tab === 'registrar' ? <RegistrarTab /> : <VerificarTab />}
        </div>
      </div>
    </DashboardLayout>
  )
}
