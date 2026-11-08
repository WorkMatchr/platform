import { currentApprovedQualificationBasis } from './provider-dossier-service'
import { profileDecisionHistory, profileQualificationAt } from './provider-effective-qualification'
import type { Prisma } from '@/generated/prisma/client'
import { assessProviderDossierCompletenessInTransaction } from './provider-dossier-completeness'

type Candidate = { providerProfileId: string; organizationId: string; projectionId?: string }

export async function currentMarketplaceProjections(
  tx: Prisma.TransactionClient, candidates: Candidate[], at: Date,
): Promise<Map<string, string>> {
  const allowed = new Map<string, string>()
  if (!candidates.length) return allowed
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
    },
  })
  const byId = new Map(profiles.map(profile => [profile.id, profile]))
  for (const candidate of candidates) {
    const profile = byId.get(candidate.providerProfileId)
    if (!profile || profile.organizationId !== candidate.organizationId) continue
    const projection = profile.trustedProjections[0]
    if (!projection || projection.sourceVersion !== profile.version ||
        (candidate.projectionId && candidate.projectionId !== projection.id)) continue
    const qualification = profileQualificationAt(profile, at)
    const basisId = qualification.platform?.dossierCandidateId
    if (qualification.adverse || !basisId || !qualification.allServicesQualified ||
        profile.lifecycleStatus !== 'QUALIFIED' || profile.platformQualificationStatus !== 'QUALIFIED' ||
        profile.readinessStatus !== 'READY' || profile.selectabilityStatus !== 'SELECTABLE') continue
    if (!await currentApprovedQualificationBasis(tx, profile.id, basisId) ||
        !(await assessProviderDossierCompletenessInTransaction(tx, profile.id, at)).isSubmittable) continue
    allowed.set(profile.id, projection.id)
  }
  return allowed
}

export async function blockedOnboardingProfiles(
  tx: Prisma.TransactionClient, candidates: Candidate[], at: Date,
) {
  const allowed = await currentMarketplaceProjections(tx, candidates, at)
  return new Set(candidates.map(candidate => candidate.providerProfileId).filter(id => !allowed.has(id)))
}
