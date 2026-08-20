import type { ArboGuideResultStatus } from '@/generated/prisma/client'

export const arboGuideStatusPresentation: Record<ArboGuideResultStatus, Readonly<{ label: string; className: string }>> = {
  ORDER: { label: 'Op orde', className: 'bg-success/10 text-success' },
  ACTION: { label: 'Actie nodig', className: 'bg-status-action-subtle text-status-action' },
  CHECK: { label: 'Controleren', className: 'bg-status-check-subtle text-status-check' },
  NOT_APPLICABLE: { label: 'Niet van toepassing', className: 'bg-surface-subtle text-text-secondary' },
}

export function ArboGuideStatus({ status }: { status: ArboGuideResultStatus }) {
  const presentation = arboGuideStatusPresentation[status]
  return (
    <span className={`inline-flex min-h-7 items-center rounded-pill px-3 py-1 text-sm font-semibold ${presentation.className}`}>
      {presentation.label}
    </span>
  )
}
