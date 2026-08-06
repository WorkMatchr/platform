import 'server-only'

import type {
  OrganizationMembershipRole,
  OrganizationType,
  PlatformRole,
} from '@/generated/prisma/enums'
import { getPlatformAdministratorContext } from '@/lib/platform-admin/platform-admin-authorization'
import { getPrisma } from '@/lib/prisma'
import { getCurrentAuthenticationContext } from './test-impersonation-context'
import {
  canUseAsTestAccount,
  isRecognizedTestEmail,
  isTestAccountSwitcherEnabled,
  TEST_IMPERSONATION_POLICY_VERSION,
} from './test-impersonation-policy'

export class TestImpersonationError extends Error {
  constructor(
    public readonly code:
      | 'DISABLED'
      | 'ACCESS_DENIED'
      | 'ALREADY_ACTIVE'
      | 'NOT_ACTIVE'
      | 'TARGET_NOT_AVAILABLE'
      | 'CONFLICT',
  ) {
    super('De testaccountwisselaar is niet beschikbaar.')
    this.name = 'TestImpersonationError'
  }
}

export type TestAccountOption = {
  id: string
  displayName: string
  email: string
  organizationName: string | null
  organizationType: OrganizationType | null
  organizationRole: OrganizationMembershipRole | null
  platformRole: PlatformRole
  accountStatus: 'ACTIVE'
  destination: string
}

function assertSwitcherEnabled() {
  if (!isTestAccountSwitcherEnabled()) {
    throw new TestImpersonationError('DISABLED')
  }
}

function getDestination(account: {
  platformRole: PlatformRole
  membership: { organization: { organizationType: OrganizationType } } | null
}) {
  const organizationType = account.membership?.organization.organizationType
  if (organizationType === 'PROVIDER') return '/professional/opdrachten'
  if (organizationType === 'CLIENT' || organizationType === 'BOTH') return '/dashboard'
  if (organizationType === 'PLATFORM_OPERATOR' && account.platformRole === 'ADMIN') {
    return '/platformbeheer'
  }
  return '/account'
}

function hasUsableAccountContext(account: {
  platformRole: PlatformRole
  memberships: Array<{
    status: string
    organization: {
      status: string
      organizationType: OrganizationType
      systemKey: string | null
    }
  }>
  providerPermissionSubjects: Array<{ permission: string }>
}) {
  const membership = account.memberships[0]
  if (!membership) return account.providerPermissionSubjects.length > 0
  if (membership.status !== 'ACTIVE' || membership.organization.status !== 'ACTIVE') {
    return false
  }
  if (membership.organization.organizationType !== 'PLATFORM_OPERATOR') return true
  return (
    membership.organization.systemKey === 'WORKMATCHR_PLATFORM' &&
    (account.platformRole === 'ADMIN' || account.providerPermissionSubjects.length > 0)
  )
}

async function requireActorAdministrator() {
  assertSwitcherEnabled()
  const context = await getCurrentAuthenticationContext()
  if (!context) throw new TestImpersonationError('ACCESS_DENIED')

  try {
    await getPlatformAdministratorContext(context.actorUser.id)
  } catch {
    throw new TestImpersonationError('ACCESS_DENIED')
  }

  return context
}

export async function getAvailableTestAccounts(): Promise<TestAccountOption[]> {
  const context = await requireActorAdministrator()
  if (context.impersonation) throw new TestImpersonationError('ALREADY_ACTIVE')

  const users = await getPrisma().user.findMany({
    where: {
      id: { not: context.actorUser.id },
      status: 'ACTIVE',
      emailVerified: true,
      email: { endsWith: 'example.invalid', mode: 'insensitive' },
    },
    orderBy: [{ displayName: 'asc' }, { email: 'asc' }],
    select: {
      id: true,
      displayName: true,
      email: true,
      emailVerified: true,
      status: true,
      platformRole: true,
      memberships: {
        take: 1,
        select: {
          status: true,
          role: true,
          organization: {
            select: {
              name: true,
              organizationType: true,
              status: true,
              systemKey: true,
            },
          },
        },
      },
      providerPermissionSubjects: {
        where: {
          validFrom: { lte: new Date() },
          OR: [{ validUntil: null }, { validUntil: { gt: new Date() } }],
          revocation: null,
        },
        select: { permission: true },
      },
    },
  })

  return users
    .filter(
      (user) =>
        isRecognizedTestEmail(user.email) &&
        canUseAsTestAccount({ actorUserId: context.actorUser.id, user }) &&
        hasUsableAccountContext(user),
    )
    .map((user) => {
      const membership = user.memberships[0] ?? null
      return {
        id: user.id,
        displayName: user.displayName?.trim() || user.email,
        email: user.email,
        organizationName: membership?.organization.name ?? null,
        organizationType: membership?.organization.organizationType ?? null,
        organizationRole: membership?.role ?? null,
        platformRole: user.platformRole,
        accountStatus: 'ACTIVE',
        destination: getDestination({ platformRole: user.platformRole, membership }),
      }
    })
}

export async function startTestImpersonation(targetUserId: string) {
  const context = await requireActorAdministrator()
  if (context.impersonation) throw new TestImpersonationError('ALREADY_ACTIVE')

  const now = new Date()
  return getPrisma().$transaction(async (transaction) => {
    const target = await transaction.user.findUnique({
      where: { id: targetUserId },
      select: {
        id: true,
        email: true,
        emailVerified: true,
        status: true,
        platformRole: true,
        memberships: {
          take: 1,
          select: {
            status: true,
            role: true,
            organization: {
              select: {
                id: true,
                name: true,
                organizationType: true,
                status: true,
                systemKey: true,
              },
            },
          },
        },
        providerPermissionSubjects: {
          where: {
            validFrom: { lte: now },
            OR: [{ validUntil: null }, { validUntil: { gt: now } }],
            revocation: null,
          },
          select: { permission: true },
        },
      },
    })

    if (
      !target ||
      !canUseAsTestAccount({ actorUserId: context.actorUser.id, user: target }) ||
      !hasUsableAccountContext(target)
    ) {
      throw new TestImpersonationError('TARGET_NOT_AVAILABLE')
    }

    const updated = await transaction.session.updateMany({
      where: {
        id: context.sessionId,
        userId: context.actorUser.id,
        expiresAt: { gt: now },
        impersonatedUserId: null,
        impersonationStartedAt: null,
      },
      data: {
        impersonatedUserId: target.id,
        impersonationStartedAt: now,
      },
    })
    if (updated.count !== 1) throw new TestImpersonationError('CONFLICT')

    await transaction.adminActionLog.create({
      data: {
        actorUserId: context.actorUser.id,
        action: 'TEST_IMPERSONATION_STARTED',
        entityType: 'User',
        entityId: target.id,
        metadata: {
          sessionId: context.sessionId,
          effectiveUserId: target.id,
          organizationId: target.memberships[0]?.organization.id ?? null,
          policyVersion: TEST_IMPERSONATION_POLICY_VERSION,
        },
      },
    })

    return {
      destination: getDestination({
        platformRole: target.platformRole,
        membership: target.memberships[0] ?? null,
      }),
    }
  })
}

export async function stopTestImpersonation() {
  const context = await requireActorAdministrator()
  if (!context.impersonation) throw new TestImpersonationError('NOT_ACTIVE')

  const endedAt = new Date()
  return getPrisma().$transaction(async (transaction) => {
    const updated = await transaction.session.updateMany({
      where: {
        id: context.sessionId,
        userId: context.actorUser.id,
        impersonatedUserId: context.impersonation!.effectiveUserId,
        impersonationStartedAt: context.impersonation!.startedAt,
      },
      data: {
        impersonatedUserId: null,
        impersonationStartedAt: null,
      },
    })
    if (updated.count !== 1) throw new TestImpersonationError('CONFLICT')

    await transaction.adminActionLog.create({
      data: {
        actorUserId: context.actorUser.id,
        action: 'TEST_IMPERSONATION_STOPPED',
        entityType: 'User',
        entityId: context.impersonation!.effectiveUserId,
        metadata: {
          sessionId: context.sessionId,
          effectiveUserId: context.impersonation!.effectiveUserId,
          startedAt: context.impersonation!.startedAt.toISOString(),
          endedAt: endedAt.toISOString(),
          policyVersion: TEST_IMPERSONATION_POLICY_VERSION,
        },
      },
    })
  })
}
