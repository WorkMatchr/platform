import type { IntakeStatus } from '@/generated/prisma/client'
import { Badge } from '@/components/ui/badge'
import { intakeStatusLabels } from '@/lib/intakes/intake-presentation'

export function IntakeStatusBadge({ status }: { status: IntakeStatus }) {
  const variant = status === 'READY_FOR_REVIEW' ? 'success' : status === 'IN_PROGRESS' ? 'brand' : 'neutral'
  return <Badge variant={variant}>{intakeStatusLabels[status]}</Badge>
}
