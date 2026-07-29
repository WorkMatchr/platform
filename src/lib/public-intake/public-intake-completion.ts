import type { ClarificationCompletionReason } from '@/lib/guidance/clarification-contract'

export const PUBLIC_INTAKE_COMPLETION_SCHEMA_VERSION =
  'public-intake-completion/1.0.0' as const

export const publicIntakeCompletionStatuses = [
  'IN_PROGRESS',
  'COMPLETED_WITH_GUIDANCE',
  'COMPLETED_WITH_SAFE_FALLBACK',
  'CANCELLED',
] as const

export type PublicIntakeCompletionStatus =
  (typeof publicIntakeCompletionStatuses)[number]

export type PublicIntakeCompletion = Readonly<{
  schemaVersion: typeof PUBLIC_INTAKE_COMPLETION_SCHEMA_VERSION
  status: PublicIntakeCompletionStatus
  reason: ClarificationCompletionReason | 'USER_CANCELLED'
}>
