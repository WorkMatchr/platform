import type { AssignmentStatus } from '@/generated/prisma/client'
import { Badge } from '@/components/ui/badge'
import { assignmentStatusLabels } from '@/lib/assignments/assignment-presentation'

export function AssignmentStatusBadge({ status }: { status: AssignmentStatus }) {
  const variant = status === 'CANCELLED' || status === 'ARCHIVED' ? 'neutral' : status === 'DRAFT' ? 'brand' : 'success'
  return <Badge variant={variant}>{assignmentStatusLabels[status]}</Badge>
}
