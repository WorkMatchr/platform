import type { UserStatus } from '@/generated/prisma/enums'

const allowedTransitions: Readonly<Record<UserStatus, readonly UserStatus[]>> = {
  INVITED: ['ACTIVE', 'BLOCKED'],
  ACTIVE: ['BLOCKED', 'DELETION_PENDING'],
  BLOCKED: ['ACTIVE', 'DELETION_PENDING'],
  ARCHIVED: [],
  DELETION_PENDING: ['ANONYMIZED'],
  ANONYMIZED: [],
}

export class AccountLifecycleTransitionError extends Error {
  constructor(from: UserStatus, to: UserStatus) {
    super(`Accountstatusovergang ${from} naar ${to} is niet toegestaan.`)
    this.name = 'AccountLifecycleTransitionError'
  }
}

export function canTransitionAccountStatus(from: UserStatus, to: UserStatus): boolean {
  return allowedTransitions[from].includes(to)
}

export function assertAccountStatusTransition(from: UserStatus, to: UserStatus): void {
  if (!canTransitionAccountStatus(from, to)) throw new AccountLifecycleTransitionError(from, to)
}

export function isLegacyArchivedStatus(status: UserStatus): boolean {
  return status === 'ARCHIVED'
}
