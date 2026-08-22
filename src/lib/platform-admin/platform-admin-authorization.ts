import 'server-only'

import { redirect } from 'next/navigation'
import { requireUser } from '@/lib/authorization'
import { getPrisma } from '@/lib/prisma'
import {
  hasPlatformAdministratorIdentity,
  isPlatformAuditorMembershipRole,
  isPlatformOperatorMembershipRole,
  type PlatformMembershipRole,
} from './platform-admin-policy'

export type { PlatformMembershipRole } from './platform-admin-policy'

export class PlatformAdminAccessError extends Error {
  constructor() {
    super('Platformbeheer is niet beschikbaar.')
    this.name = 'PlatformAdminAccessError'
  }
}

export async function getPlatformContext(userId: string) {
  const now = new Date()
  const administrator = await getPrisma().user.findFirst({
    where: {
      id: userId,
      status: 'ACTIVE',
      platformRole: 'ADMIN',
      memberships: {
        some: {
          status: 'ACTIVE',
          organization: {
            status: 'ACTIVE',
            organizationType: 'PLATFORM_OPERATOR',
            systemKey: 'WORKMATCHR_PLATFORM',
          },
        },
      },
    },
    select: {
      id: true,
      displayName: true,
      email: true,
      providerPermissionSubjects: {
        where: {
          validFrom: { lte: now },
          OR: [{ validUntil: null }, { validUntil: { gt: now } }],
          revocation: null,
        },
        select: { permission: true },
      },
      memberships: {
        where: {
          status: 'ACTIVE',
          organization: { systemKey: 'WORKMATCHR_PLATFORM' },
        },
        select: {
          id: true,
          role: true,
          organization: { select: { id: true, name: true, systemKey: true } },
        },
        take: 1,
      },
    },
  })

  if (!hasPlatformAdministratorIdentity(administrator)) throw new PlatformAdminAccessError()
  const platformMembership = administrator.memberships[0]
  return {
    id: administrator.id,
    userId: administrator.id,
    displayName: administrator.displayName,
    email: administrator.email,
    platformRole: 'ADMIN' as const,
    platformOrganizationId: platformMembership.organization.id,
    membershipRole: platformMembership.role as PlatformMembershipRole,
    platformMembership,
    permissions: administrator.providerPermissionSubjects.map((grant) => grant.permission),
  }
}

export async function getPlatformOperatorContext(userId: string) {
  const context = await getPlatformContext(userId)
  if (!isPlatformOperatorMembershipRole(context.membershipRole)) throw new PlatformAdminAccessError()
  return context
}

export async function getPlatformOwnerContext(userId: string) {
  const context = await getPlatformContext(userId)
  if (context.membershipRole !== 'OWNER') throw new PlatformAdminAccessError()
  return context
}

export async function getPlatformAuditorContext(userId: string) {
  const context = await getPlatformContext(userId)
  if (!isPlatformAuditorMembershipRole(context.membershipRole) && !isPlatformOperatorMembershipRole(context.membershipRole)) {
    throw new PlatformAdminAccessError()
  }
  return context
}

export async function requirePlatformOperator(returnTo = '/platformbeheer') {
  const user = await requireUser(returnTo)
  try {
    return await getPlatformOperatorContext(user.id)
  } catch (error) {
    if (error instanceof PlatformAdminAccessError) redirect('/account')
    throw error
  }
}

export async function requirePlatformOwner(returnTo = '/platformbeheer') {
  const user = await requireUser(returnTo)
  try {
    return await getPlatformOwnerContext(user.id)
  } catch (error) {
    if (error instanceof PlatformAdminAccessError) redirect('/account')
    throw error
  }
}

export async function requirePlatformAuditor(returnTo = '/platformbeheer/auditor') {
  const user = await requireUser(returnTo)
  try {
    return await getPlatformAuditorContext(user.id)
  } catch (error) {
    if (error instanceof PlatformAdminAccessError) redirect('/account')
    throw error
  }
}

/** @deprecated Use getPlatformOperatorContext for operational platform access. */
export const getPlatformAdministratorContext = getPlatformOperatorContext

/** @deprecated Use requirePlatformOperator for operational platform access. */
export const requirePlatformAdministrator = requirePlatformOperator
