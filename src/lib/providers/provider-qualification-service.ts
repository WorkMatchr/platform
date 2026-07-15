import { z } from 'zod'
import type { Prisma, ProviderPlatformQualificationStatus } from '@/generated/prisma/client'
import { getPrisma } from '@/lib/prisma'
import { requireProviderPlatformPermission } from './provider-authorization'
import { hashProviderJson } from './provider-canonical-json'
import { ProviderServiceError } from './provider-errors'
import { requiresFourEyes } from './provider-policy'
import { requirePlatformQualificationBasis } from './provider-requirements'
import { expectedVersionSchema, reasonCodeSchema, uuidSchema } from './provider-validation'
import { parseProviderInput, reserveProviderVersion } from './provider-write-utils'

const decisionSchema = z.object({
  expectedProfileVersion: expectedVersionSchema,
  scope: z.enum(['PLATFORM', 'CAPABILITY']),
  capabilityId: uuidSchema.optional(),
  outcome: z.enum(['QUALIFIED', 'CHANGES_REQUESTED', 'REJECTED', 'SUSPENDED', 'RESTORED', 'EXPIRED']),
  reviewedByUserId: uuidSchema,
  reasonCode: reasonCodeSchema,
  validUntil: z.coerce.date().optional(),
}).refine((input) => (input.scope === 'CAPABILITY') === Boolean(input.capabilityId), { path: ['capabilityId'] })

const verificationRank = {
  SELF_DECLARED: 0,
  DOCUMENT_CHECKED: 1,
  VERIFIED: 2,
} as const

async function requireCapabilityQualificationBasis(
  transaction: Prisma.TransactionClient,
  providerProfileId: string,
  capabilityId: string,
  at: Date,
) {
  const capability = await transaction.providerCapability.findFirst({
    where: { id: capabilityId, providerProfileId, status: 'ACTIVE' },
    include: { revisions: { orderBy: { version: 'desc' }, take: 1 } },
  })
  const revision = capability?.revisions[0]
  if (!capability || !revision?.serviceTermId) throw new ProviderServiceError('CONFIGURATION_INCOMPLETE')
  const config = await transaction.providerCapabilityRequirementConfig.findFirst({
    where: { status: 'PUBLISHED', effectiveFrom: { lte: at }, OR: [{ effectiveUntil: null }, { effectiveUntil: { gt: at } }] },
    include: {
      requirements: {
        where: {
          serviceTermId: revision.serviceTermId,
          OR: [{ specialismTermId: null }, { specialismTermId: revision.specialismTermId }],
        },
      },
    },
  })
  if (!config || config.requirements.length === 0) {
    throw new ProviderServiceError('QUALIFICATION_REQUIREMENTS_NOT_CONFIGURED')
  }
  const organizationQualifications = await transaction.providerOrganizationQualification.findMany({
    where: { providerProfileId, status: 'ACTIVE' },
    include: {
      revisions: {
        orderBy: { version: 'desc' },
        take: 1,
        include: {
          verificationReviews: {
            where: { validFrom: { lte: at }, OR: [{ validUntil: null }, { validUntil: { gt: at } }] },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      },
    },
  })
  const professionalQualifications = await transaction.providerProfessionalQualification.findMany({
    where: { professional: { providerProfileId, status: 'ACTIVE' }, status: 'ACTIVE', capabilities: { some: { capabilityId } } },
    include: {
      revisions: {
        orderBy: { version: 'desc' },
        take: 1,
        include: {
          verificationReviews: {
            where: { validFrom: { lte: at }, OR: [{ validUntil: null }, { validUntil: { gt: at } }] },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      },
    },
  })
  const available = [...organizationQualifications, ...professionalQualifications]
    .flatMap((item) => item.revisions)
    .filter((item) => item.validUntil === null || item.validUntil >= at)
  for (const requirement of config.requirements.filter((item) => item.isRequired)) {
    const qualification = available.find((item) => item.qualificationTermId === requirement.requirementTermId)
    const level = qualification?.verificationReviews[0]?.resultingLevel ?? 'SELF_DECLARED'
    if (!qualification || verificationRank[level] < verificationRank[requirement.minimumVerification]) {
      throw new ProviderServiceError('CONFIGURATION_INCOMPLETE')
    }
  }
  return config
}

const platformStatusByOutcome: Record<string, ProviderPlatformQualificationStatus> = {
  QUALIFIED: 'QUALIFIED',
  RESTORED: 'QUALIFIED',
  CHANGES_REQUESTED: 'CHANGES_REQUESTED',
  REJECTED: 'REJECTED',
  SUSPENDED: 'SUSPENDED',
  EXPIRED: 'EXPIRED',
}

export async function recordProviderQualificationDecision(
  approvedByUserId: string,
  providerProfileId: string,
  rawInput: unknown,
) {
  const input = parseProviderInput(decisionSchema, rawInput)
  if (!requiresFourEyes(input.reviewedByUserId, approvedByUserId)) throw new ProviderServiceError('FOUR_EYES_REQUIRED')

  return getPrisma().$transaction(
    async (transaction) => {
      const now = new Date()
      if (input.validUntil && input.validUntil <= now) throw new ProviderServiceError('VALIDATION_ERROR')
      await requireProviderPlatformPermission(transaction, input.reviewedByUserId, 'PROVIDER_REVIEWER', providerProfileId, now)
      await requireProviderPlatformPermission(transaction, approvedByUserId, 'PROVIDER_APPROVER', providerProfileId, now)
      const provider = await transaction.providerProfile.findFirst({
        where: { id: providerProfileId, archivedAt: null, organization: { status: 'ACTIVE' } },
        select: { id: true, version: true },
      })
      if (!provider) throw new ProviderServiceError('NOT_FOUND')
      if (provider.version !== input.expectedProfileVersion) throw new ProviderServiceError('CONFLICT')
      const reviewerRecord = await transaction.providerVerificationReview.findFirst({
        where: {
          providerProfileId,
          reviewerUserId: input.reviewedByUserId,
          validFrom: { lte: now },
          OR: [{ validUntil: null }, { validUntil: { gt: now } }],
        },
        orderBy: { createdAt: 'desc' },
        select: { id: true, checksum: true },
      })
      if (!reviewerRecord) throw new ProviderServiceError('REQUIREMENTS_NOT_CONFIGURED')
      const reason = await transaction.providerReasonCode.findUnique({ where: { code: input.reasonCode }, select: { id: true } })
      if (!reason) throw new ProviderServiceError('VALIDATION_ERROR')

      let requirementConfigId: string | undefined
      if (input.outcome === 'QUALIFIED' || input.outcome === 'RESTORED') {
        if (input.scope === 'PLATFORM') {
          await requirePlatformQualificationBasis(transaction, providerProfileId, now)
        } else {
          const config = await requireCapabilityQualificationBasis(transaction, providerProfileId, input.capabilityId!, now)
          requirementConfigId = config.id
        }
      }

      const sourceChecksum = hashProviderJson({
        capabilityId: input.capabilityId ?? null,
        outcome: input.outcome,
        providerProfileId,
        providerVersion: provider.version,
        reasonCode: input.reasonCode,
        reviewChecksum: reviewerRecord.checksum,
        reviewId: reviewerRecord.id,
        requirementConfigId: requirementConfigId ?? null,
        scope: input.scope,
      }).sha256
      const decision = await transaction.providerQualificationDecision.create({
        data: {
          providerProfileId,
          capabilityId: input.capabilityId,
          scope: input.scope,
          outcome: input.outcome,
          requirementConfigId,
          reviewedByUserId: input.reviewedByUserId,
          approvedByUserId,
          reasonCode: input.reasonCode,
          validFrom: now,
          validUntil: input.validUntil,
          sourceChecksum,
        },
        select: { id: true, scope: true, outcome: true, sourceChecksum: true },
      })
      const profileVersion = await reserveProviderVersion(transaction, providerProfileId, input.expectedProfileVersion)
      if (input.scope === 'PLATFORM') {
        await transaction.providerProfile.update({
          where: { id: providerProfileId },
          data: { platformQualificationStatus: platformStatusByOutcome[input.outcome]! },
        })
      }
      return { ...decision, profileVersion }
    },
    { isolationLevel: 'Serializable' },
  )
}
