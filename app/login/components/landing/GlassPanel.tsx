/* ------------------------------------------------------------------ */
/*  Card shell reutilizable (mismo glass que el mockup original)       */
/* ------------------------------------------------------------------ */
export function GlassPanel({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="w-full max-w-[420px] rounded-2xl border p-4 space-y-3 flex flex-col"
      style={{ background: 'rgba(255,255,255,0.025)', borderColor: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(20px)', boxShadow: '0 0 80px rgba(124,58,237,0.12), inset 0 1px 0 rgba(255,255,255,0.06)' }}
    >
      {children}
    </div>
  )
}
