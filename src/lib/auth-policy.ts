import type { UserStatus } from '@/generated/prisma/enums'

export function canAccessAccount(status: UserStatus | null): boolean {
  return status === 'ACTIVE'
}

export const canStartSession = canAccessAccount

export function canUseAccountRecovery(status: UserStatus | null): boolean {
  return status === 'ACTIVE'
}

export function shouldActivateVerifiedInvitation(input: {
  status: UserStatus
  emailVerified: boolean
  migrationClassification: 'MIGRATION_TEMP' | null
}): boolean {
  return input.status === 'INVITED' && input.emailVerified && input.migrationClassification === null
}

export function shouldRevokeExistingSessions(status: UserStatus): boolean {
  return status === 'BLOCKED' || status === 'ARCHIVED' || status === 'DELETION_PENDING' || status === 'ANONYMIZED'
}

export const AUTH_SESSION_POLICY = {
  revokeSessionsOnPasswordReset: true,
} as const
