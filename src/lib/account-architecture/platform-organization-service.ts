import { Prisma } from '@/generated/prisma/client'

export const WORKMATCHR_PLATFORM_ORGANIZATION = {
  name: 'WorkMatchr Platform',
  organizationType: 'PLATFORM_OPERATOR',
  systemKey: 'WORKMATCHR_PLATFORM',
  status: 'ACTIVE',
} as const

type PlatformOrganizationClient = Pick<Prisma.TransactionClient, 'organization'>

export class PlatformOrganizationConfigurationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'PlatformOrganizationConfigurationError'
  }
}

export async function findPlatformOrganization(client: PlatformOrganizationClient) {
  const organizations = await client.organization.findMany({
    where: { systemKey: WORKMATCHR_PLATFORM_ORGANIZATION.systemKey },
    take: 2,
  })
  if (organizations.length > 1) {
    throw new PlatformOrganizationConfigurationError('Er bestaan meerdere platformorganisaties met dezelfde systeemidentiteit.')
  }
  const organization = organizations[0]
  if (!organization) return null
  if (
    organization.organizationType !== WORKMATCHR_PLATFORM_ORGANIZATION.organizationType ||
    organization.name !== WORKMATCHR_PLATFORM_ORGANIZATION.name ||
    organization.status !== WORKMATCHR_PLATFORM_ORGANIZATION.status ||
    organization.archivedAt !== null
  ) {
    throw new PlatformOrganizationConfigurationError('De platformorganisatie heeft een ongeldige systeemconfiguratie.')
  }
  return organization
}

export async function ensurePlatformOrganization(client: PlatformOrganizationClient) {
  const existing = await findPlatformOrganization(client)
  if (existing) return existing

  return client.organization.create({ data: WORKMATCHR_PLATFORM_ORGANIZATION })
}
