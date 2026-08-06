import type { AssignmentStatus } from '@/generated/prisma/client'

export const assignmentStatusLabels: Record<AssignmentStatus, string> = {
  DRAFT: 'Nog invullen',
  READY_FOR_REVIEW: 'Klaar om te publiceren',
  OPEN: 'Gepubliceerd',
  MATCHING: 'Professionals worden geselecteerd',
  AWAITING_RESPONSES: 'Wacht op reacties',
  IN_SELECTION: 'Offertes vergelijken',
  AWARDED: 'Gegund',
  CLOSED: 'Afgerond',
  CANCELLED: 'Beëindigd',
  ARCHIVED: 'Gearchiveerd',
}

export function presentAssignmentStatus(value: string): string {
  return assignmentStatusLabels[value as AssignmentStatus] ?? 'Status niet beschikbaar'
}

export function formatAssignmentDate(value: string): string {
  return new Intl.DateTimeFormat('nl-NL', { dateStyle: 'long' }).format(new Date(value))
}

export function formatOptionalAssignmentDate(value: string | null): string {
  return value ? formatAssignmentDate(value) : 'Nog niet bepaald'
}
