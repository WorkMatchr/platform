import { positiveQualificationReason } from '@/lib/providers/provider-requirements'
import { requireProviderPlatformPermission } from '@/lib/providers/provider-authorization'
import { getPrisma } from '@/lib/prisma'
import { getMarketplacePlatformDashboard } from './dashboard-query-service'
import { MarketplaceServiceError } from './marketplace-errors'

export async function getProviderReviewWorklist(userId: string) {
  const platform = await getMarketplacePlatformDashboard(userId)
  const awaitingQualification = platform.actorPermissions.includes('PROVIDER_APPROVER')
    ? await getPrisma().providerDossierSubmission.findMany({
        where: { status: 'APPROVED', providerProfile: { archivedAt: null, OR: [{ platformQualificationStatus: 'NOT_ASSESSED' }, { selectabilityStatus: { not: 'SELECTABLE' } }] } },
        orderBy: { submittedAt: 'desc' }, distinct: ['providerProfileId'], take: 50,
        select: { providerProfileId: true, providerProfile: { select: { organization: { select: { name: true } } } } },
      }) : []
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
  return { permissions: platform.actorPermissions, submissions, awaitingQualification }
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

export async function getQualificationManagement(actorId: string, providerProfileId: string) {
  return getPrisma().$transaction(async tx => {
    await requireProviderPlatformPermission(tx, actorId, 'PROVIDER_APPROVER', providerProfileId)
    const capabilities = await tx.providerCapability.findMany({ where: { providerProfileId, status: 'ACTIVE' },
      orderBy: { id: 'asc' }, select: { id: true, revisions: { orderBy: { version: 'desc' }, take: 1,
        select: { serviceTerm: { select: { label: true } }, specialismTerm: { select: { label: true } } } } } })
    const reasons = await tx.providerReasonCode.findMany({ where: positiveQualificationReason, orderBy: { label: 'asc' }, select: { code: true, label: true } })
    const decisions = await tx.providerQualificationDecision.findMany({ where: { providerProfileId }, orderBy: [{ validFrom: 'desc' }, { createdAt: 'desc' }], take: 20,
      select: { id: true, scope: true, outcome: true, capabilityId: true, reasonCode: true, validFrom: true, validUntil: true,
        reviewedByUser: { select: { displayName: true, id: true } }, approvedByUser: { select: { displayName: true, id: true } } } })
    return { capabilities, reasons, decisions }
  })
}
