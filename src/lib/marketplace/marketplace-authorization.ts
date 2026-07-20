import type { Prisma } from '@/generated/prisma/client'
import { MarketplaceServiceError } from './marketplace-errors'

export async function requireClientMarketplaceManager(
  transaction: Prisma.TransactionClient,
  userId: string,
  organizationId: string,
) {
  const membership = await transaction.organizationMembership.findFirst({
    where: {
      userId,
      organizationId,
      status: 'ACTIVE',
      role: { in: ['OWNER', 'ADMIN'] },
      user: { status: 'ACTIVE' },
      organization: { status: 'ACTIVE', organizationType: { in: ['CLIENT', 'BOTH'] }, systemKey: null },
    },
    select: { role: true, organizationId: true },
  })
  if (!membership) throw new MarketplaceServiceError('ACCESS_DENIED')
  return membership
}

export async function requireProviderMarketplaceAccess(
  transaction: Prisma.TransactionClient,
  userId: string,
  organizationId: string,
  write = false,
) {
  const membership = await transaction.organizationMembership.findFirst({
    where: {
      userId,
      organizationId,
      status: 'ACTIVE',
      ...(write ? { role: { in: ['OWNER', 'ADMIN'] as const } } : {}),
      user: { status: 'ACTIVE' },
      organization: { status: 'ACTIVE', organizationType: { in: ['PROVIDER', 'BOTH'] }, systemKey: null },
    },
    select: {
      role: true,
      organizationId: true,
      organization: { select: { providerProfile: { select: { id: true, selectabilityStatus: true, lifecycleStatus: true } } } },
    },
  })
  if (!membership?.organization.providerProfile) throw new MarketplaceServiceError('ACCESS_DENIED')
  return { ...membership, providerProfile: membership.organization.providerProfile }
}

export async function requireMarketplacePlatformAdmin(transaction: Prisma.TransactionClient, userId: string) {
  const user = await transaction.user.findFirst({
    where: {
      id: userId,
      status: 'ACTIVE',
      platformRole: 'ADMIN',
      memberships: {
        some: {
          status: 'ACTIVE',
          organization: { status: 'ACTIVE', systemKey: 'WORKMATCHR_PLATFORM' },
        },
      },
    },
    select: { id: true, platformRole: true },
  })
  if (!user) throw new MarketplaceServiceError('ACCESS_DENIED')
  return user
}
