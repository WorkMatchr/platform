import type { Prisma, ProviderPlatformPermission } from '@/generated/prisma/client'
import { ProviderServiceError } from './provider-errors'
import { canManageProviderData, isPermissionActive } from './provider-policy'
import { hasValidPlatformActorFoundation } from '@/lib/account-architecture/platform-actor-policy'

export async function requireProviderManager(
  transaction: Prisma.TransactionClient,
  userId: string,
  providerProfileId: string,
) {
  const provider = await transaction.providerProfile.findFirst({
    where: {
      id: providerProfileId,
      archivedAt: null,
      organization: { memberships: { some: { userId } } },
    },
    select: {
      id: true,
      organizationId: true,
      version: true,
      lifecycleStatus: true,
      organization: {
        select: {
          status: true,
          organizationType: true,
          memberships: {
            where: { userId },
            select: { role: true, status: true, user: { select: { status: true } } },
            take: 1,
          },
        },
      },
    },
  })
  const membership = provider?.organization.memberships[0]
  if (
    !provider ||
    !membership ||
    !canManageProviderData({
      userStatus: membership.user.status,
      membershipStatus: membership.status,
      membershipRole: membership.role,
      organizationStatus: provider.organization.status,
      organizationType: provider.organization.organizationType,
    })
  ) {
    throw new ProviderServiceError('ACCESS_DENIED')
  }
  return provider
}

export async function requireProviderViewer(
  transaction: Prisma.TransactionClient,
  userId: string,
  providerProfileId: string,
) {
  const provider = await transaction.providerProfile.findFirst({
    where: {
      id: providerProfileId,
      archivedAt: null,
      organization: {
        status: 'ACTIVE',
        organizationType: { in: ['PROVIDER', 'BOTH'] },
        memberships: { some: { userId, status: 'ACTIVE', user: { status: 'ACTIVE' } } },
      },
    },
    select: {
      id: true,
      organizationId: true,
      version: true,
      organization: {
        select: { name: true, memberships: { where: { userId, status: 'ACTIVE' }, select: { role: true }, take: 1 } },
      },
    },
  })
  const membership = provider?.organization.memberships[0]
  if (!provider || !membership) throw new ProviderServiceError('ACCESS_DENIED')
  return { ...provider, membershipRole: membership.role }
}

export async function requireProviderPlatformPermission(
  transaction: Prisma.TransactionClient,
  userId: string,
  permission: ProviderPlatformPermission,
  providerProfileId?: string,
  at = new Date(),
) {
  const user = await transaction.user.findUnique({
    where: { id: userId },
    select: {
      status: true,
      providerPermissionSubjects: {
        where: { permission, validFrom: { lte: at }, OR: [{ validUntil: null }, { validUntil: { gt: at } }] },
        include: { revocation: true },
      },
      memberships: {
        where: { status: 'ACTIVE' },
        select: {
          id: true,
          status: true,
          organization: {
            select: {
              status: true,
              organizationType: true,
              systemKey: true,
              providerProfile: { select: { id: true } },
            },
          },
        },
      },
    },
  })
  const grant = user?.providerPermissionSubjects.find((candidate) => isPermissionActive(candidate, permission, at))
  const platformMembership = user?.memberships.find((membership) => membership.organization.systemKey === 'WORKMATCHR_PLATFORM') ?? null
  const validFoundation = permission === 'PROVIDER_AUDITOR'
    ? user?.memberships.length === 0 && hasValidPlatformActorFoundation(permission, null)
    : user?.memberships.length === 1 && hasValidPlatformActorFoundation(permission, platformMembership)
  const targetConflict = providerProfileId
    ? user?.memberships.some((membership) => membership.organization.providerProfile?.id === providerProfileId)
    : false
  if (!user || user.status !== 'ACTIVE' || !grant || !validFoundation || targetConflict) {
    throw new ProviderServiceError('ACCESS_DENIED')
  }
  return grant
}
