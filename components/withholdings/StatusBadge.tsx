'use client';

import type { WithholdingStatus } from '@/types/withholding';

const STATUS_CONFIG: Record<WithholdingStatus, { label: string; classes: string }> = {
  DRAFT: { label: 'Borrador', classes: 'bg-surface-raised text-ink-secondary border border-edge-subtle' },
  SIGNED: { label: 'Firmado', classes: 'bg-blue-muted text-blue border border-blue/20' },
  SENT: { label: 'Enviado', classes: 'bg-amber-50 text-amber-700 border border-amber-200' },
  AUTHORIZED: { label: 'Autorizado', classes: 'bg-emerald-50 text-emerald-700 border border-emerald-200' },
  REJECTED: { label: 'Rechazado', classes: 'bg-red-50 text-red-700 border border-red-200' },
  VOIDED: { label: 'Anulado', classes: 'bg-gray-100 text-ink-tertiary border border-edge-subtle line-through' },
};

export function StatusBadge({ status }: { status: WithholdingStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-md ${cfg.classes}`}
    >
      {cfg.label}
    </span>
  );
}
