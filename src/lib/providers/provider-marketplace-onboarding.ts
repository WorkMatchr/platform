import type { Prisma } from '@/generated/prisma/client'
import { assessProviderDossierCompletenessInTransaction } from './provider-dossier-completeness'
import { onboardingEventWhere } from './provider-onboarding-cohort'

type Candidate = { providerProfileId: string; organizationId: string }

// Matching evaluates the organization. An individual action also checks the
// actor's own enrollment, including invitations to a pre-existing organization.
export async function blockedOnboardingProfiles(
  tx: Prisma.TransactionClient, candidates: Candidate[], at: Date, userId?: string,
): Promise<Set<string>> {
  const blocked = new Set<string>()
  if (!candidates.length) return blocked
  const enrolled = await tx.accountProvisioningEvent.findMany({
    where: { organizationId: { in: candidates.map(p => p.organizationId) }, ...onboardingEventWhere(userId) },
    distinct: ['organizationId'], select: { organizationId: true },
  })
  const organizations = new Set(enrolled.map(event => event.organizationId))
  const scoped = candidates.filter(p => organizations.has(p.organizationId))
  if (!scoped.length) return blocked
  const currentProjection = { validFrom: { lte: at }, validUntil: { gt: at }, invalidation: null }
  const qualified = await tx.providerProfile.findMany({
    where: {
      id: { in: scoped.map(p => p.providerProfileId) }, archivedAt: null, lifecycleStatus: 'QUALIFIED',
      platformQualificationStatus: 'QUALIFIED', readinessStatus: 'READY', selectabilityStatus: 'SELECTABLE',
      organization: { status: 'ACTIVE', systemKey: null, organizationType: { in: ['PROVIDER', 'BOTH'] } },
      blocks: { none: { release: null } },

    },
    select: { id: true, organizationId: true, version: true,
      trustedProjections: { where: currentProjection, orderBy: { sourceVersion: 'desc' }, take: 1, select: { sourceVersion: true } },
    },
  })
  const byProfile = new Map(qualified
    .filter(profile => profile.trustedProjections[0]?.sourceVersion === profile.version)
    .map(profile => [profile.id, profile.organizationId]))
  for (const candidate of scoped) {
    if (byProfile.get(candidate.providerProfileId) !== candidate.organizationId ||
        !(await assessProviderDossierCompletenessInTransaction(tx, candidate.providerProfileId, at, userId)).isSubmittable) {
      blocked.add(candidate.providerProfileId)
    }
  }
  return blocked
}
