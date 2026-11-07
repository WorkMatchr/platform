import { currentApprovedQualificationBasis } from './provider-dossier-service'
import { profileDecisionHistory, profileQualificationAt } from './provider-effective-qualification'
import type { Prisma } from '@/generated/prisma/client'
import { assessProviderDossierCompletenessInTransaction } from './provider-dossier-completeness'
import { onboardingEventWhere } from './provider-onboarding-cohort'

type Candidate = { providerProfileId: string; organizationId: string; projectionId?: string }

// Matching evaluates the organization. An individual action also checks the
// actor's own enrollment, including invitations to a pre-existing organization.
export async function currentMarketplaceProjections(
  tx: Prisma.TransactionClient, candidates: Candidate[], at: Date, userId?: string,
): Promise<Map<string, string | undefined>> {
  const allowed = new Map<string, string | undefined>()
  if (!candidates.length) return allowed
  const enrolled = await tx.accountProvisioningEvent.findMany({
    where: { organizationId: { in: candidates.map(p => p.organizationId) }, ...onboardingEventWhere(userId) },
    distinct: ['organizationId', 'reasonCode'], select: { organizationId: true, reasonCode: true },
  })
  const organizations = new Set(enrolled.map(event => event.organizationId))
  const newOrganizations = new Set(enrolled.filter(event => event.reasonCode === 'ORGANIZATION_ONBOARDING_OWNER_LINKED').map(event => event.organizationId))
  const currentProjection = { validFrom: { lte: at }, validUntil: { gt: at }, invalidation: null }
  const profiles = await tx.providerProfile.findMany({
    where: {
      id: { in: candidates.map(p => p.providerProfileId) }, archivedAt: null,
      organization: { status: 'ACTIVE', systemKey: null, organizationType: { in: ['PROVIDER', 'BOTH'] } },
      blocks: { none: { release: null } },
    },
    select: {
      id: true, organizationId: true, version: true, lifecycleStatus: true, platformQualificationStatus: true,
      readinessStatus: true, selectabilityStatus: true, ...profileDecisionHistory,
      trustedProjections: { where: currentProjection, orderBy: { sourceVersion: 'desc' }, take: 1, select: { id: true, sourceVersion: true } },
      _count: { select: { trustedProjections: true } },
    },
  })
  const byId = new Map(profiles.map(profile => [profile.id, profile]))
  for (const candidate of candidates) {
    const profile = byId.get(candidate.providerProfileId)
    if (!profile || profile.organizationId !== candidate.organizationId) continue
    const enrolled = organizations.has(profile.organizationId)
    const projection = profile.trustedProjections[0]
    // Keep the pre-B4 admission policy for existing members. An actual adverse
    // decision, including expiry, always overrides their previous access.
    const qualification = profileQualificationAt(profile, at)
    if (qualification.adverse || ['SUSPENDED', 'EXPIRED', 'REJECTED', 'CHANGES_REQUESTED'].includes(profile.platformQualificationStatus)) continue
    if ((candidate.projectionId || profile._count.trustedProjections > 0 || enrolled) &&
        (!projection || projection.sourceVersion !== profile.version || (candidate.projectionId && candidate.projectionId !== projection.id))) continue
    if (newOrganizations.has(profile.organizationId) && !qualification.platform?.dossierCandidateId) continue
    if (qualification.platform?.dossierCandidateId && (!qualification.allServicesQualified ||
        !await currentApprovedQualificationBasis(tx, profile.id, qualification.platform.dossierCandidateId))) continue
    if (enrolled && (!qualification.platform || !qualification.allServicesQualified ||
        profile.lifecycleStatus !== 'QUALIFIED' || profile.platformQualificationStatus !== 'QUALIFIED' ||
        profile.readinessStatus !== 'READY' || profile.selectabilityStatus !== 'SELECTABLE' ||
        !(await assessProviderDossierCompletenessInTransaction(tx, profile.id, at, userId)).isSubmittable)) continue
    allowed.set(profile.id, projection?.id)
  }
  return allowed
}

export async function blockedOnboardingProfiles(
  tx: Prisma.TransactionClient, candidates: Candidate[], at: Date, userId?: string,
) {
  const allowed = await currentMarketplaceProjections(tx, candidates, at, userId)
  return new Set(candidates.map(candidate => candidate.providerProfileId).filter(id => !allowed.has(id)))
}
