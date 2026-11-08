import type { Prisma } from '@/generated/prisma/client'
import { checkRunScope, scopedCapabilities } from '@/lib/marketplace/assignment-scope-service'
import { MarketplaceServiceError } from '@/lib/marketplace/marketplace-errors'
import { blockedOnboardingProfiles } from '@/lib/providers/provider-marketplace-onboarding'

// Legacy eligibility records cannot originate a second selection. Only candidates
// admitted by the canonical current run may be exposed or buy an offer slot.
export async function requestScopeCandidates(tx: Prisma.TransactionClient, requestId: string, at: Date) {
  const run = await tx.marketplaceMatchRun.findFirst({
    where: { assignment: { requestId }, status: 'COMPLETED' },
    orderBy: { completedAt: 'desc' },
    include: {
      candidates: {
        where: { status: { in: ['ELIGIBLE', 'SELECTED'] } },
        select: {
          providerProfileId: true,
          projectionId: true,
          providerProfile: { select: { organizationId: true } },
        },
      },
    },
  })
  const allowed = new Set<string>()
  if (!run) return allowed
  try {
    const scope = await checkRunScope(tx, run.assignmentId, run.assignmentSnapshot, at)
    const blocked = await blockedOnboardingProfiles(
      tx,
      run.candidates.map((c) => ({ ...c, organizationId: c.providerProfile.organizationId })),
      at,
    )
    for (const c of run.candidates)
      if (
        !blocked.has(c.providerProfileId) &&
        (await scopedCapabilities(tx, c.providerProfileId, scope, at)).length
      )
        allowed.add(c.projectionId)
  } catch (e) {
    if (!(e instanceof MarketplaceServiceError)) throw e
  }
  return allowed
}
