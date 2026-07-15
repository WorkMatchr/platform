import type { Prisma, ProviderPlatformPermission } from '@/generated/prisma/client'
import { ProviderServiceError } from './provider-errors'
import { canManageProviderData, isPermissionActive } from './provider-policy'

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
      memberships: providerProfileId
        ? { where: { organization: { providerProfile: { id: providerProfileId } }, status: 'ACTIVE' }, select: { id: true } }
        : false,
    },
  })
  const grant = user?.providerPermissionSubjects.find((candidate) => isPermissionActive(candidate, permission, at))
  if (!user || user.status !== 'ACTIVE' || !grant || (providerProfileId && user.memberships.length > 0)) {
    throw new ProviderServiceError('ACCESS_DENIED')
  }
  return grant
}
