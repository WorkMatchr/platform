import 'server-only'

import { cache } from 'react'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { canAccessAccount, shouldRevokeExistingSessions } from '@/lib/auth-policy'
import { getPrisma } from '@/lib/prisma'
import {
  canUseAsTestAccount,
  isTestAccountSwitcherEnabled,
} from './test-impersonation-policy'

const userSelect = {
  id: true,
  email: true,
  displayName: true,
  emailVerified: true,
  platformRole: true,
  accountType: true,
  status: true,
} as const

export type AuthenticationUser = {
  id: string
  email: string
  displayName: string | null
  emailVerified: boolean
  platformRole: 'USER' | 'ADMIN'
  accountType: 'CLIENT' | 'PROFESSIONAL' | null
  status: 'INVITED' | 'ACTIVE' | 'BLOCKED' | 'ARCHIVED' | 'DELETION_PENDING' | 'ANONYMIZED'
}

export type AuthenticationContext = {
  actorUser: AuthenticationUser
  effectiveUser: AuthenticationUser
  sessionId: string
  impersonation:
    | {
        effectiveUserId: string
        startedAt: Date
        valid: boolean
      }
    | null
}

export const getCurrentAuthenticationContext = cache(
  async (): Promise<AuthenticationContext | null> => {
    const authSession = await auth.api.getSession({ headers: await headers() })
    if (!authSession) return null

    const persistedSession = await getPrisma().session.findFirst({
      where: {
        id: authSession.session.id,
        userId: authSession.user.id,
        expiresAt: { gt: new Date() },
      },
      select: {
        id: true,
        impersonatedUserId: true,
        impersonationStartedAt: true,
        user: { select: userSelect },
        impersonatedUser: { select: userSelect },
      },
    })

    if (!persistedSession) return null

    const actorUser = persistedSession.user
    if (
      shouldRevokeExistingSessions(actorUser.status) ||
      !canAccessAccount(actorUser.status)
    ) {
      await getPrisma().session.deleteMany({ where: { userId: actorUser.id } })
      return null
    }

    const impersonationIsComplete =
      persistedSession.impersonatedUserId !== null &&
      persistedSession.impersonationStartedAt !== null
    const target = persistedSession.impersonatedUser
    const mayApplyImpersonation =
      isTestAccountSwitcherEnabled() &&
      impersonationIsComplete &&
      target !== null
    const impersonationIsValid =
      mayApplyImpersonation &&
      canUseAsTestAccount({ actorUserId: actorUser.id, user: target })

    return {
      actorUser,
      effectiveUser: impersonationIsValid ? target : actorUser,
      sessionId: persistedSession.id,
      impersonation: mayApplyImpersonation
        ? {
            effectiveUserId: target.id,
            startedAt: persistedSession.impersonationStartedAt!,
            valid: impersonationIsValid,
          }
        : null,
    }
  },
)
