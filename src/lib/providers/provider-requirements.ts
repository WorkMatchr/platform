import type { Prisma, ProviderVerificationLevel } from '@/generated/prisma/client'
import { ProviderServiceError } from './provider-errors'

const requiredTermCodes = [
  'PLATFORM_TERMS',
  'PRIVACY_NOTICE',
  'PROVIDER_DATA_ACCURACY',
  'ORGANIZATION_AUTHORITY',
  'CONFLICTS_OF_INTEREST',
  'LEGAL_COMPLIANCE',
] as const

const verificationRank: Record<ProviderVerificationLevel, number> = {
  SELF_DECLARED: 0,
  DOCUMENT_CHECKED: 1,
  VERIFIED: 2,
}

export async function requirePlatformQualificationBasis(
  transaction: Prisma.TransactionClient,
  providerProfileId: string,
  at: Date,
) {
  const activeTerms = await transaction.providerTermDocumentVersion.findMany({
    where: {
      status: 'ACTIVE',
      isRequired: true,
      effectiveFrom: { lte: at },
      OR: [{ effectiveUntil: null }, { effectiveUntil: { gt: at } }],
      document: { code: { in: [...requiredTermCodes] } },
    },
    select: { id: true, document: { select: { code: true } } },
  })
  if (new Set(activeTerms.map((term) => term.document.code)).size !== requiredTermCodes.length) {
    throw new ProviderServiceError('TERMS_NOT_CONFIGURED')
  }
  const accepted = await transaction.providerTermAcceptance.count({
    where: { providerProfileId, documentVersionId: { in: activeTerms.map((term) => term.id) } },
  })
  if (accepted !== activeTerms.length) throw new ProviderServiceError('CONFIGURATION_INCOMPLETE')

  const insuranceConfig = await transaction.providerInsuranceRequirementConfig.findFirst({
    where: {
      status: 'PUBLISHED',
      effectiveFrom: { lte: at },
      OR: [{ effectiveUntil: null }, { effectiveUntil: { gt: at } }],
    },
    include: { requirements: { include: { insuranceTypeTerm: { select: { code: true } } } } },
  })
  if (!insuranceConfig || !insuranceConfig.requirements.some((item) => item.isRequired && item.insuranceTypeTerm.code === 'GENERAL_LIABILITY')) {
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
          evidenceRevision: { include: { scanDecision: true } },
          verificationReviews: { where: { validFrom: { lte: at }, OR: [{ validUntil: null }, { validUntil: { gt: at } }] }, orderBy: { createdAt: 'desc' }, take: 1 },
        },
      },
    },
  })

  for (const requirement of insuranceConfig.requirements.filter((item) => item.isRequired)) {
    const policy = policies
      .flatMap((item) => item.revisions)
      .find((revision) => revision.insuranceTypeTerm.code === requirement.insuranceTypeTerm.code && revision.effectiveFrom <= at && revision.expiresAt >= at)
    const reviewedLevel = policy?.verificationReviews[0]?.resultingLevel ?? 'SELF_DECLARED'
    if (
      !policy ||
      policy.evidenceRevision.scanDecision?.scanStatus !== 'CLEAN' ||
      verificationRank[reviewedLevel] < verificationRank[requirement.minimumVerification] ||
      (requirement.minimumCoverageCents !== null &&
        (policy.coverageAmountCents === null || policy.coverageAmountCents < requirement.minimumCoverageCents)) ||
      (requirement.coverageGeography !== null && policy.coverageGeography !== requirement.coverageGeography)
    ) {
      throw new ProviderServiceError('CONFIGURATION_INCOMPLETE')
    }
  }
  return { activeTerms, insuranceConfig }
}
