import type { Prisma } from '@/generated/prisma/client'
import { checkRunScope, eligibleForScopedExpertise } from '@/lib/marketplace/assignment-scope-service'
import { invitationMatchFromFactors } from '@/lib/marketplace/assignment-purchase-preview'
import { MarketplaceServiceError } from '@/lib/marketplace/marketplace-errors'
import { blockedOnboardingProfiles } from '@/lib/providers/provider-marketplace-onboarding'

// Retain the existing live scope check when disclosing requester contact details in the archive.
export async function requestScopeCandidates(tx: Prisma.TransactionClient, requestId: string, at: Date) {
  const run = await tx.marketplaceMatchRun.findFirst({
    where: { assignment: { requestId }, status: 'COMPLETED' },
    orderBy: { completedAt: 'desc' },
    include: {
      candidates: {
        where: { status: { in: ['ELIGIBLE', 'SELECTED'] } },
        select: {
          explanation: true,
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
    const snap = run.assignmentSnapshot
    if (!snap || typeof snap !== 'object' || Array.isArray(snap) || typeof snap.capabilityCode !== 'string') return allowed
    const blocked = await blockedOnboardingProfiles(
      tx,
      run.candidates.map((c) => ({ ...c, organizationId: c.providerProfile.organizationId })),
      at,
    )
    for (const c of run.candidates)
      if (
        !blocked.has(c.providerProfileId) &&
        await eligibleForScopedExpertise(tx, c.providerProfileId, scope, invitationMatchFromFactors(snap.capabilityCode, c.explanation).recipientExpertise, at)
      )
        allowed.add(c.projectionId)
  } catch (e) {
    if (!(e instanceof MarketplaceServiceError)) throw e
  }
  return allowed
}
