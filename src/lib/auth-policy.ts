import type { UserStatus } from '@/generated/prisma/enums'

export function canAccessAccount(status: UserStatus | null): boolean {
  return status === 'ACTIVE'
}

export const canStartSession = canAccessAccount

export function shouldRevokeExistingSessions(status: UserStatus): boolean {
  return status === 'BLOCKED' || status === 'ARCHIVED'
}

export const AUTH_SESSION_POLICY = {
  revokeSessionsOnPasswordReset: true,
} as const
