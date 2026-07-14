import type { AssignmentStatus } from '@/generated/prisma/client'

export const assignmentStatusLabels: Record<AssignmentStatus, string> = {
  DRAFT: 'Concept',
  READY_FOR_REVIEW: 'Klaar voor controle',
  OPEN: 'Open',
  MATCHING: 'Matching wordt voorbereid',
  AWAITING_RESPONSES: 'Wacht op reacties',
  IN_SELECTION: 'Selectie',
  AWARDED: 'Gegund',
  CLOSED: 'Afgerond',
  CANCELLED: 'Geannuleerd',
  ARCHIVED: 'Gearchiveerd',
}

export function formatAssignmentDate(value: string): string {
  return new Intl.DateTimeFormat('nl-NL', { dateStyle: 'long' }).format(new Date(value))
}

export function formatOptionalAssignmentDate(value: string | null): string {
  return value ? formatAssignmentDate(value) : 'Nog niet bepaald'
}
