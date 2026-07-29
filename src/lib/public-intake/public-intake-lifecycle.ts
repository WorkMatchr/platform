import type { PublicIntakePhase } from '@/generated/prisma/client'
import {
  PUBLIC_INTAKE_ABANDONMENT_DAYS,
  PUBLIC_INTAKE_RESUME_EVENT_INTERVAL_MINUTES,
} from './public-intake-config'

const DAY_IN_MS = 24 * 60 * 60 * 1000
const MINUTE_IN_MS = 60 * 1000

const WORKSET_7_1_TRANSITIONS: Readonly<Record<PublicIntakePhase, readonly PublicIntakePhase[]>> = {
  STARTED: ['CLARIFYING'],
  CLARIFYING: ['SUMMARY_PRESENTED'],
  SUMMARY_PRESENTED: ['CLARIFYING'],
  REGISTRATION_STARTED: [],
  ACCOUNT_LINKED: [],
  SUBMITTED: [],
  ABANDONED: [],
  ABANDONED_BY_USER: [],
  ABANDONED_TIMEOUT: [],
  EXPIRED: [],
}

const USER_ABANDONABLE_PHASES: readonly PublicIntakePhase[] = [
  'STARTED',
  'CLARIFYING',
  'SUMMARY_PRESENTED',
  'REGISTRATION_STARTED',
]

const TERMINAL_PUBLIC_INTAKE_PHASES: readonly PublicIntakePhase[] = [
  'SUBMITTED',
  'ABANDONED',
  'ABANDONED_BY_USER',
  'ABANDONED_TIMEOUT',
  'EXPIRED',
]

export function canChangePublicIntakePhase(
  from: PublicIntakePhase,
  to: PublicIntakePhase,
): boolean {
  return WORKSET_7_1_TRANSITIONS[from].includes(to)
}

export function canAbandonPublicIntakeDraftByUser(phase: PublicIntakePhase): boolean {
  return USER_ABANDONABLE_PHASES.includes(phase)
}

export function isTerminalPublicIntakePhase(phase: PublicIntakePhase): boolean {
  return TERMINAL_PUBLIC_INTAKE_PHASES.includes(phase)
}

export function determinePublicIntakeAbandonment(
  lastInteractionAt: Date,
  at = new Date(),
): boolean {
  return at.getTime() - lastInteractionAt.getTime() >= PUBLIC_INTAKE_ABANDONMENT_DAYS * DAY_IN_MS
}

export function isPublicIntakeResumable(expiresAt: Date, at = new Date()): boolean {
  return at.getTime() < expiresAt.getTime()
}

export function shouldRecordPublicIntakeResumeEvent(
  lastResumeEventAt: Date | null,
  at = new Date(),
): boolean {
  return (
    lastResumeEventAt === null ||
    at.getTime() - lastResumeEventAt.getTime() >=
      PUBLIC_INTAKE_RESUME_EVENT_INTERVAL_MINUTES * MINUTE_IN_MS
  )
}
