import { getPrisma } from '@/lib/prisma'
import { getMarketplacePlatformDashboard } from './dashboard-query-service'
import { MarketplaceServiceError } from './marketplace-errors'

export async function getProviderReviewWorklist(userId: string) {
  const platform = await getMarketplacePlatformDashboard(userId)
  const submissions = await getPrisma().providerDossierSubmission.findMany({
    where: { status: { in: ['SUBMITTED', 'UNDER_REVIEW', 'ADDITIONAL_INFORMATION_REQUIRED'] } },
    orderBy: { updatedAt: 'asc' },
    take: 50,
    select: {
      id: true,
      status: true,
      version: true,
      updatedAt: true,
      providerProfile: { select: { id: true, organization: { select: { name: true } } } },
      reviewCases: { where: { status: 'OPEN' }, take: 1, select: { id: true } },
    },
  })
  return { permissions: platform.actorPermissions, submissions }
}

export async function getProviderReviewDetail(userId: string, providerProfileId: string) {
  const platform = await getMarketplacePlatformDashboard(userId)
  const provider = await getPrisma().providerProfile.findFirst({
    where: { id: providerProfileId, archivedAt: null },
    select: {
      id: true,
      version: true,
      lifecycleStatus: true,
      readinessStatus: true,
      platformQualificationStatus: true,
      selectabilityStatus: true,
      organization: { select: { name: true, status: true } },
      dossierSubmissions: {
        orderBy: { submittedAt: 'desc' },
        take: 1,
        select: {
          id: true,
          status: true,
          version: true,
          submittedAt: true,
          currentCandidate: { select: { id: true, candidateVersion: true, sha256: true, schemaVersion: true } },
          reviewCases: {
            orderBy: { openedAt: 'desc' },
            take: 1,
            select: {
              id: true,
              status: true,
              version: true,
              candidateId: true,
              openedByUserId: true,
              openedAt: true,
              findings: { orderBy: { createdAt: 'asc' }, select: { id: true, section: true, reasonCode: true, providerMessage: true, status: true, createdAt: true } },
            },
          },
          history: { orderBy: { createdAt: 'desc' }, take: 20, select: { id: true, fromStatus: true, toStatus: true, reasonCode: true, createdAt: true } },
        },
      },
    },
  })
  if (!provider) throw new MarketplaceServiceError('NOT_FOUND')
  return { permissions: platform.actorPermissions, provider, submission: provider.dossierSubmissions[0] ?? null }
}
