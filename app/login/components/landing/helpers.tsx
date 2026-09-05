'use client'
import { useState, useEffect, useRef } from 'react'

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */
export function useCountUp(target: number, duration = 1400) {
  const [value, setValue] = useState(0)
  const rafRef = useRef<number>(0)
  useEffect(() => {
    const start = performance.now()
    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(Math.floor(eased * target))
      if (progress < 1) rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [target, duration])
  return value
}

export function StatNumber({ value, suffix = '' }: { value: number; suffix?: string }) {
  const count = useCountUp(value)
  return <>{count.toLocaleString()}{suffix}</>
}

export function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: any[]; label?: string }) {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border border-white/10 bg-[#0D0F1E] px-3 py-2 text-xs text-white/80" style={{ fontFamily: "'DM Sans', sans-serif" }}>
        <p className="font-semibold">{label}</p>
        <p className="text-violet-400">${payload[0].value?.toLocaleString()}</p>
      </div>
    )
  }
  return null
}
