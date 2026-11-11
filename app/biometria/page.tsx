'use client'
import { useState, useRef, useCallback } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import {
  Camera, Upload, CheckCircle2, XCircle, ShieldCheck,
  ShieldX, RefreshCw, User, Fingerprint, AlertTriangle
} from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://d16rb4jhhui7p6.cloudfront.net/api/v1'

function getToken(): string {
  try {
    const s = localStorage.getItem('saas_auth')
    if (s) return JSON.parse(s).state?.token ?? ''
    return ''
  } catch { return '' }
}

// ── Tab ───────────────────────────────────────────────────────────────────────

type Tab = 'registrar' | 'verificar'

// ── Registrar foto de referencia ──────────────────────────────────────────────

function RegistrarTab() {
  const [cedula, setCedula]       = useState('')
  const [preview, setPreview]     = useState<string | null>(null)
  const [file, setFile]           = useState<File | null>(null)
  const [loading, setLoading]     = useState(false)
  const [result, setResult]       = useState<{ ok: boolean; msg: string } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  function onFile(f: File) {
    setFile(f)
    setPreview(URL.createObjectURL(f))
    setResult(null)
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    const f = e.dataTransfer.files[0]
    if (f && f.type.startsWith('image/')) onFile(f)
  }

  async function handleSubmit() {
    if (!cedula || !file) return
    setLoading(true)
    setResult(null)
    try {
      const form = new FormData()
      form.append('photo', file)
      const res = await fetch(`${API_URL}/biometric/reference/${cedula}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${getToken()}` },
        body: form,
      })
      const json = await res.json()
      if (res.ok) {
        setResult({ ok: true, msg: `Foto registrada para cédula ${cedula}` })
      } else {
        setResult({ ok: false, msg: json.message?.[0] ?? 'Error al registrar' })
      }
    } catch {
      setResult({ ok: false, msg: 'Error de conexión' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-lg mx-auto space-y-5">

      {/* Cédula */}
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

      {/* Drop zone */}
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
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f) }}
        />
      </div>

      {/* Botón */}
      <button
        onClick={handleSubmit}
        disabled={!cedula || !file || loading}
        className="w-full py-3 rounded-xl bg-blue text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-blue/90 transition-colors"
      >
        {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <User className="w-4 h-4" />}
        {loading ? 'Registrando…' : 'Registrar foto de referencia'}
      </button>

      {/* Resultado */}
      {result && (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm ${
          result.ok
            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
            : 'bg-red-500/10 border-red-500/20 text-red-500'
        }`}>
          {result.ok
            ? <CheckCircle2 className="w-4 h-4 shrink-0" />
            : <XCircle className="w-4 h-4 shrink-0" />}
          {result.msg}
        </div>
      )}
    </div>
  )
}

// ── Verificar identidad ───────────────────────────────────────────────────────

type VerifyState = 'idle' | 'camera' | 'captured' | 'loading' | 'done'

interface VerifyResult {
  approved: boolean
  score: number
  attemptsLeft: number
  blocked: boolean
}

function VerificarTab() {
  const [cedula, setCedula]       = useState('')
  const [state, setState]         = useState<VerifyState>('idle')
  const [capturedUrl, setCapturedUrl] = useState<string | null>(null)
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null)
  const [result, setResult]       = useState<VerifyResult | null>(null)
  const [error, setError]         = useState<string | null>(null)
  const videoRef  = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const startCamera = useCallback(async () => {
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setState('camera')
    } catch {
      setError('No se pudo acceder a la cámara. Permite el permiso en tu navegador.')
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
    c.width  = v.videoWidth
    c.height = v.videoHeight
    c.getContext('2d')!.drawImage(v, 0, 0)
    stopCamera()
    c.toBlob(blob => {
      if (!blob) return
      setCapturedBlob(blob)
      setCapturedUrl(URL.createObjectURL(blob))
      setState('captured')
    }, 'image/jpeg', 0.92)
  }

  function retake() {
    setCapturedUrl(null)
    setCapturedBlob(null)
    setResult(null)
    setError(null)
    setState('idle')
  }

  async function verify() {
    if (!cedula || !capturedBlob) return
    setState('loading')
    setError(null)
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
        const msg = Array.isArray(json.message) ? json.message[0] : json.message
        setError(msg ?? 'Error en la verificación')
        setState('captured')
      }
    } catch {
      setError('Error de conexión')
      setState('captured')
    }
  }

  return (
    <div className="max-w-lg mx-auto space-y-5">

      {/* Cédula */}
      <div>
        <label className="block text-xs font-semibold text-ink-tertiary uppercase tracking-widest mb-1.5">
          Número de cédula
        </label>
        <input
          type="text"
          value={cedula}
          onChange={e => setCedula(e.target.value.replace(/\D/g, '').slice(0, 13))}
          placeholder="0912345678"
          disabled={state === 'camera' || state === 'loading'}
          className="w-full px-4 py-2.5 rounded-xl bg-surface-raised border border-edge text-ink-primary text-sm placeholder:text-ink-ghost focus:outline-none focus:border-blue transition-colors disabled:opacity-50"
        />
      </div>

      {/* Área de cámara */}
      <div className="relative rounded-2xl overflow-hidden bg-black" style={{ minHeight: 280 }}>

        {/* Estado: idle */}
        {state === 'idle' && (
          <div className="flex flex-col items-center justify-center h-64 gap-4">
            <div className="w-16 h-16 rounded-2xl bg-blue/10 flex items-center justify-center">
              <Camera className="w-7 h-7 text-blue" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-ink-secondary">Listo para escanear</p>
              <p className="text-xs text-ink-ghost mt-0.5">Ingresa la cédula y abre la cámara</p>
            </div>
            <button
              onClick={startCamera}
              disabled={!cedula}
              className="px-5 py-2.5 rounded-xl bg-blue text-white text-sm font-semibold flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-blue/90 transition-colors"
            >
              <Camera className="w-4 h-4" /> Abrir cámara
            </button>
          </div>
        )}

        {/* Estado: camera */}
        {(state === 'camera') && (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-72 object-cover"
            />
            {/* Overlay guía */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-48 h-56 rounded-full border-2 border-white/40" />
            </div>
            <div className="absolute bottom-0 inset-x-0 p-4 flex justify-center bg-gradient-to-t from-black/60">
              <button
                onClick={capture}
                className="w-16 h-16 rounded-full bg-white flex items-center justify-center shadow-xl hover:scale-105 transition-transform"
              >
                <div className="w-12 h-12 rounded-full bg-blue" />
              </button>
            </div>
          </>
        )}

        {/* Estado: captured / loading */}
        {(state === 'captured' || state === 'loading') && capturedUrl && (
          <img src={capturedUrl} alt="captured" className="w-full h-72 object-cover" />
        )}

        {/* Estado: loading overlay */}
        {state === 'loading' && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <div className="text-center">
              <RefreshCw className="w-8 h-8 text-white animate-spin mx-auto mb-2" />
              <p className="text-white text-sm font-medium">Verificando identidad…</p>
            </div>
          </div>
        )}

        {/* Estado: done */}
        {state === 'done' && result && (
          <div className={`absolute inset-0 flex flex-col items-center justify-center gap-4 ${
            result.approved ? 'bg-emerald-900/80' : 'bg-red-900/80'
          }`}>
            {result.approved
              ? <ShieldCheck className="w-16 h-16 text-emerald-400" />
              : <ShieldX className="w-16 h-16 text-red-400" />}
            <div className="text-center">
              <p className={`text-2xl font-bold ${result.approved ? 'text-emerald-300' : 'text-red-300'}`}>
                {result.approved ? 'IDENTIDAD VERIFICADA' : 'NO VERIFICADO'}
              </p>
              <p className="text-white/70 text-sm mt-1">Score de similitud: {result.score}%</p>
              {!result.approved && result.attemptsLeft > 0 && (
                <p className="text-white/50 text-xs mt-1">Intentos restantes: {result.attemptsLeft}</p>
              )}
              {result.blocked && (
                <p className="text-red-300 text-xs mt-1 font-semibold">⚠️ Cuenta bloqueada temporalmente</p>
              )}
            </div>
          </div>
        )}

        <canvas ref={canvasRef} className="hidden" />
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl border bg-red-500/10 border-red-500/20 text-red-500 text-sm">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Acciones */}
      <div className="flex gap-3">
        {(state === 'captured') && (
          <>
            <button
              onClick={retake}
              className="flex-1 py-3 rounded-xl border border-edge text-ink-secondary text-sm font-semibold flex items-center justify-center gap-2 hover:border-edge-strong transition-colors"
            >
              <RefreshCw className="w-4 h-4" /> Repetir
            </button>
            <button
              onClick={verify}
              disabled={!cedula}
              className="flex-1 py-3 rounded-xl bg-blue text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-40 hover:bg-blue/90 transition-colors"
            >
              <Fingerprint className="w-4 h-4" /> Verificar
            </button>
          </>
        )}
        {state === 'done' && (
          <button
            onClick={retake}
            className="w-full py-3 rounded-xl border border-edge text-ink-secondary text-sm font-semibold flex items-center justify-center gap-2 hover:border-edge-strong transition-colors"
          >
            <RefreshCw className="w-4 h-4" /> Nueva verificación
          </button>
        )}
      </div>
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function BiometriaPage() {
  const [tab, setTab] = useState<Tab>('verificar')

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-xl font-bold text-ink-primary tracking-tight flex items-center gap-2">
            <Fingerprint className="w-5 h-5 text-blue" />
            Verificación biométrica
          </h1>
          <p className="text-sm text-ink-tertiary mt-0.5">
            Registra y verifica identidades mediante reconocimiento facial
          </p>
        </div>

        {/* Tabs */}
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

        {/* Contenido */}
        <div className="card rounded-2xl p-6">
          {tab === 'registrar' ? <RegistrarTab /> : <VerificarTab />}
        </div>

      </div>
    </DashboardLayout>
  )
}
