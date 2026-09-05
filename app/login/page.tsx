'use client'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Home } from './components/landing/Home'
import { LoginScreen } from './components/auth/LoginScreen'

/* ------------------------------------------------------------------ */
/*  Página: Home <-> Login con wipe full-screen izq → der              */
/* ------------------------------------------------------------------ */
export default function LoginPage() {
  const [showLogin, setShowLogin] = useState(false)
  // Bloquea scroll del body mientras el login full-screen está activo
  useEffect(() => {
    document.body.style.overflow = showLogin ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [showLogin])
  // ESC para volver
  useEffect(() => {
    if (!showLogin) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowLogin(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [showLogin])
  return (
    <div className="relative">
      <Home onLogin={() => setShowLogin(true)} />
      <AnimatePresence>
        {showLogin && (
          <motion.div
            key="login-fullscreen"
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-0 z-50"
          >
            <LoginScreen onBack={() => setShowLogin(false)} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
