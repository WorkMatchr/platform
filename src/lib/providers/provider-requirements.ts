import type { Prisma, ProviderVerificationLevel } from '@/generated/prisma/client'
import { ProviderServiceError } from './provider-errors'

// Positive audit decisions must not cite the diagnostic for absent service requirements.
export const positiveQualificationReason = {
  domain: 'QUALIFICATION', isActive: true, NOT: { code: 'QUALIFICATION_REQUIREMENTS_NOT_CONFIGURED' },
} as const

const verificationRank: Record<ProviderVerificationLevel, number> = {
  SELF_DECLARED: 0,
  DOCUMENT_CHECKED: 1,
  VERIFIED: 2,
}

export async function requireProfessionalLiability(
  transaction: Prisma.TransactionClient,
  providerProfileId: string,
  at: Date,
  decision?: { dossierCandidateId: string; reviewerUserId: string; validUntil: Date },
) {
  const insuranceConfig = await transaction.providerInsuranceRequirementConfig.findFirst({
    where: {
      status: 'PUBLISHED',
      effectiveFrom: { lte: at },
      OR: [{ effectiveUntil: null }, { effectiveUntil: { gt: at } }],
    },
    orderBy: { version: 'desc' },
    include: { requirements: { where: { insuranceTypeTerm: { code: 'PROFESSIONAL_LIABILITY' } }, include: { insuranceTypeTerm: { select: { code: true } } } } },
  })
  if (!insuranceConfig || !insuranceConfig.requirements.length) {
    throw new ProviderServiceError('INSURANCE_REQUIREMENTS_NOT_CONFIGURED')
  }

  const policies = await transaction.providerInsurance.findMany({
    where: { providerProfileId, status: 'ACTIVE' },
    include: {
      revisions: {
        orderBy: { version: 'desc' },
        take: 1,
        include: {
          insuranceTypeTerm: { select: { code: true } },
          evidenceRevision: { include: { scanDecision: true, evidenceDocument: true } },
          verificationReviews: { where: { validFrom: { lte: at } }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 1 },
        },
      },
    },
  })

  for (const requirement of insuranceConfig.requirements) {
    const supported = policies.some(({ revisions: [policy] }) => {
      if (!policy || policy.insuranceTypeTerm.code !== requirement.insuranceTypeTerm.code ||
          policy.effectiveFrom > at || policy.expiresAt <= at || (decision && policy.expiresAt < decision.validUntil)) return false
      const evidence = policy.evidenceRevision
      if (evidence.scanDecision?.scanStatus !== 'CLEAN' || evidence.evidenceDocument.status !== 'AVAILABLE' ||
          evidence.evidenceDocument.providerProfileId !== providerProfileId || evidence.version !== evidence.evidenceDocument.version) return false
      const review = policy.verificationReviews[0]
      if (!review || !['VERIFIED', 'DOCUMENT_CHECKED'].includes(review.outcome) ||
          !review.validUntil || review.validUntil <= at ||
          verificationRank[review.resultingLevel] < verificationRank[requirement.minimumVerification]) return false
      if (decision && (review.dossierCandidateId !== decision.dossierCandidateId ||
          review.reviewerUserId !== decision.reviewerUserId || review.validUntil < decision.validUntil)) return false
      return (requirement.minimumCoverageCents === null ||
        (policy.coverageAmountCents !== null && policy.coverageAmountCents >= requirement.minimumCoverageCents)) &&
        (requirement.coverageGeography === null || policy.coverageGeography === requirement.coverageGeography)
    })
    if (!supported) throw new ProviderServiceError('SERVICE_INSURANCE_REQUIRED')
  }
}

export function applicableServiceRequirements(transaction: Prisma.TransactionClient, serviceTermId: string, specialismTermId: string | null, at: Date) {
  return transaction.providerCapabilityRequirementConfig.findFirst({
    where: { status: 'PUBLISHED', effectiveFrom: { lte: at }, OR: [{ effectiveUntil: null }, { effectiveUntil: { gt: at } }] },
    orderBy: { version: 'desc' },
    include: {
      requirements: {
        include: { requirementTerm: { select: { label: true } } },
        where: {
          serviceTermId,
          OR: [{ specialismTermId: null }, { specialismTermId }],
        },
      },
    },
  })
}
