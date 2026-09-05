'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, FileEdit, AlertCircle } from 'lucide-react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { journalApi } from '../api'
import type { CreateJournalEntryInput } from '../types'
import { JournalEntryForm } from '../components/JournalEntryForm'
export default function NuevoAsientoPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  async function handleSubmit(data: CreateJournalEntryInput) {
    setError('')
    setSaving(true)
    try {
      const created = await journalApi.create(data)
      router.push(`/contabilidad/asientos/${created.id}`)
    } catch (e: any) {
      setError(e.message || 'Error al crear el asiento')
      setSaving(false)
    }
  }
  return (
    <DashboardLayout>
      <div className="p-6 space-y-5">
        <Link
          href="/contabilidad/asientos"
          className="inline-flex items-center gap-1.5 text-sm text-ink-tertiary hover:text-ink-primary transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a asientos
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
            <FileEdit className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-ink-primary tracking-tight">
              Nuevo asiento contable
            </h1>
            <p className="text-sm text-ink-tertiary mt-0.5">
              Se guardará como borrador. Después podés contabilizarlo.
            </p>
          </div>
        </div>
        {error && (
          <div className="flex items-start gap-2 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-600 dark:text-red-400">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}
        <JournalEntryForm
          saving={saving}
          submitLabel="Crear borrador"
          onSubmit={handleSubmit}
          onCancel={() => router.push('/contabilidad/asientos')}
        />
      </div>
    </DashboardLayout>
  )
}
