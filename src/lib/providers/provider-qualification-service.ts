import { calculateProviderReadinessInTransaction, calculateProviderSelectabilityInTransaction } from './provider-assessment-service'
import { createTrustedProviderProjectionInTransaction } from './trusted-provider-projection-service'
import { assessProviderDossierCompletenessInTransaction } from './provider-dossier-completeness'
import { currentApprovedQualificationBasis } from './provider-dossier-service'
import { decisionHistory, qualificationAt } from './provider-effective-qualification'
import { z } from 'zod'
import type { Prisma, ProviderPlatformQualificationStatus } from '@/generated/prisma/client'
import { getPrisma } from '@/lib/prisma'
import { requireProviderPlatformPermission } from './provider-authorization'
import { hashProviderJson } from './provider-canonical-json'
import { ProviderServiceError } from './provider-errors'
import { requiresFourEyes } from './provider-policy'
import { applicableServiceRequirements, positiveQualificationReason, requireProfessionalLiability } from './provider-requirements'
import { expectedVersionSchema, reasonCodeSchema, uuidSchema } from './provider-validation'
import { parseProviderInput, reserveProviderVersion } from './provider-write-utils'

const decisionSchema = z.object({
  expectedProfileVersion: expectedVersionSchema,
  scope: z.enum(['PLATFORM', 'CAPABILITY']),
  capabilityId: uuidSchema.optional(),
  dossierCandidateId: uuidSchema.optional(),
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
  decision?: { dossierCandidateId: string; reviewerUserId: string; validUntil: Date },
) {
  const capability = await transaction.providerCapability.findFirst({
    where: { id: capabilityId, providerProfileId, status: 'ACTIVE' },
    include: { revisions: { orderBy: { version: 'desc' }, take: 1 } },
  })
  const revision = capability?.revisions[0]
  if (!capability || !revision?.serviceTermId) throw new ProviderServiceError('CONFIGURATION_INCOMPLETE')
  const config = await applicableServiceRequirements(transaction, revision.serviceTermId, revision.specialismTermId, at)
  if (!config || config.requirements.length === 0) {
    throw new ProviderServiceError('QUALIFICATION_REQUIREMENTS_NOT_CONFIGURED')
  }
  if (config.requirements.some(row => row.requiresProfessionalLiability)) {
    await requireProfessionalLiability(transaction, providerProfileId, at, decision)
  }
  if (!config.requirements.some(row => row.isRequired)) return config
  const organizationQualifications = await transaction.providerOrganizationQualification.findMany({
    where: { providerProfileId, status: 'ACTIVE' },
    include: {
      revisions: {
        orderBy: { version: 'desc' },
        take: 1,
        include: {
          evidenceRevision: { include: { scanDecision: true, evidenceDocument: true } },
          verificationReviews: {
            where: { validFrom: { lte: at } },
            orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
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
          evidenceRevision: { include: { scanDecision: true, evidenceDocument: true } },
          verificationReviews: {
            where: { validFrom: { lte: at } },
            orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
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
    const supported = available.some(qualification => {
      if (qualification.qualificationTermId !== requirement.requirementTermId ||
          (qualification.issuedAt && qualification.issuedAt > at) ||
          (requirement.requiresValidity && !qualification.validUntil) ||
          (decision && qualification.validUntil && qualification.validUntil < decision.validUntil)) return false
      if (requirement.minimumVerification === 'SELF_DECLARED') return true
      const review = qualification.verificationReviews[0]
      const evidence = qualification.evidenceRevision
      if (!review || !['VERIFIED', 'DOCUMENT_CHECKED'].includes(review.outcome) ||
          !review.validUntil || review.validUntil <= at ||
          verificationRank[review.resultingLevel] < verificationRank[requirement.minimumVerification] ||
          !evidence || evidence.scanDecision?.scanStatus !== 'CLEAN' || evidence.evidenceDocument.status !== 'AVAILABLE' ||
          evidence.version !== evidence.evidenceDocument.version || evidence.evidenceDocument.providerProfileId !== providerProfileId) return false
      return !decision || (review.dossierCandidateId === decision.dossierCandidateId &&
        review.reviewerUserId === decision.reviewerUserId && review.validUntil >= decision.validUntil)
    })
    if (!supported) throw new ProviderServiceError('SERVICE_QUALIFICATION_REQUIRED')
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
        select: { id: true, version: true, lifecycleStatus: true },
      })
      if (!provider) throw new ProviderServiceError('NOT_FOUND')
      if (provider.version !== input.expectedProfileVersion) throw new ProviderServiceError('CONFLICT')
      if (input.scope === 'CAPABILITY') {
        // Negative decisions may close an archived service, but always within its own dossier.
        const subject = await transaction.providerCapability.findFirst({
          where: { id: input.capabilityId!, providerProfileId }, select: { id: true },
        })
        if (!subject) throw new ProviderServiceError('NOT_FOUND')
      }
      const reason = await transaction.providerReasonCode.findUnique({ where: { code: input.reasonCode, isActive: true, ...(input.dossierCandidateId ? positiveQualificationReason : {}) }, select: { id: true } })
      if (!reason) throw new ProviderServiceError('VALIDATION_ERROR')

      let basis: Awaited<ReturnType<typeof currentApprovedQualificationBasis>> = null
      const positive = input.outcome === 'QUALIFIED' || input.outcome === 'RESTORED'
      if (positive && (input.scope === 'PLATFORM' || input.dossierCandidateId)) {
        if (!input.dossierCandidateId) throw new ProviderServiceError('DOSSIER_NOT_SUBMITTABLE')
        basis = await currentApprovedQualificationBasis(transaction, providerProfileId, input.dossierCandidateId)
        if (basis && !(await assessProviderDossierCompletenessInTransaction(transaction, providerProfileId, now)).isSubmittable) throw new ProviderServiceError('DOSSIER_NOT_SUBMITTABLE')
        if (!basis) throw new ProviderServiceError('DOSSIER_NOT_SUBMITTABLE')
        if (basis.reviewerUserId !== input.reviewedByUserId) throw new ProviderServiceError('ACCESS_DENIED')
        if (provider.lifecycleStatus === 'ARCHIVED' ||
            (provider.lifecycleStatus === 'SUSPENDED' && input.outcome !== 'RESTORED') ||
            await transaction.providerBlock.count({ where: { providerProfileId, release: null } })) throw new ProviderServiceError('PROVIDER_BLOCKED')
      }

      const positiveDossierDecision = positive && basis
      let reviewerRecord = positiveDossierDecision ? null : await transaction.providerVerificationReview.findFirst({
        where: {
          providerProfileId,
          reviewerUserId: input.reviewedByUserId,
          validFrom: { lte: now },
          OR: [{ validUntil: null }, { validUntil: { gt: now } }],
        },
        orderBy: { createdAt: 'desc' },
        select: { id: true, checksum: true, validUntil: true },
      })
      if (positive && basis) {
        const revision = input.scope === 'CAPABILITY' ? await transaction.providerCapabilityRevision.findFirst({
          where: { providerCapabilityId: input.capabilityId }, orderBy: { version: 'desc' }, select: { id: true },
        }) : null
        if (input.scope === 'CAPABILITY' && !revision) throw new ProviderServiceError('CONFIGURATION_INCOMPLETE')
        const subjects = await transaction.providerVerificationReview.findMany({
          where: { providerProfileId, dossierCandidateId: basis.dossierCandidateId, dossierReviewCaseId: basis.dossierReviewCaseId,
            reviewerUserId: basis.reviewerUserId, ...(revision ? { capabilityRevisionId: revision.id } : {
              OR: [{ capabilityRevisionId: { not: null } }, { workAreaRevisionId: { not: null } }, { sectorExperienceRevisionId: { not: null } }],
            }) },
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        })
        const seen = new Set<string>()
        reviewerRecord = null
        for (const record of subjects) {
          const key = record.capabilityRevisionId ?? record.sectorExperienceRevisionId ?? record.workAreaRevisionId ??
            record.professionalQualificationRevisionId ?? record.organizationQualificationRevisionId ?? record.insuranceRevisionId ?? record.evidenceRevisionId
          if (!key || seen.has(key)) continue
          seen.add(key)
          if (record.validFrom > now || !record.validUntil || record.validUntil <= now ||
              !input.validUntil || input.validUntil > record.validUntil ||
              !['VERIFIED', 'DOCUMENT_CHECKED'].includes(record.outcome)) throw new ProviderServiceError('REQUIREMENTS_NOT_CONFIGURED')
          reviewerRecord ??= record
        }
      }
      if (!reviewerRecord) throw new ProviderServiceError('REQUIREMENTS_NOT_CONFIGURED')
      const verificationWindow = basis && input.validUntil
        ? { dossierCandidateId: basis.dossierCandidateId, reviewerUserId: basis.reviewerUserId, validUntil: input.validUntil } : undefined
      let requirementConfigId: string | undefined
      if (input.outcome === 'QUALIFIED' || input.outcome === 'RESTORED') {
        if (input.scope === 'CAPABILITY') {
          const config = await requireCapabilityQualificationBasis(transaction, providerProfileId, input.capabilityId!, now, verificationWindow)
          requirementConfigId = config.id
        }
      }

      let restoredDecisionId: string | undefined
      if (input.outcome === 'QUALIFIED' || input.outcome === 'RESTORED') {
        const history = await transaction.providerQualificationDecision.findMany({
          ...decisionHistory, where: { providerProfileId, scope: input.scope, capabilityId: input.capabilityId ?? null },
        })
        const effective = qualificationAt(history, providerProfileId, now)
        if (input.outcome === 'QUALIFIED' && effective.suspended) throw new ProviderServiceError('CONFLICT')
        if (input.outcome === 'RESTORED') {
          if (!effective.previous || effective.current || effective.previous.validFrom >= now) throw new ProviderServiceError('CONFLICT')
          restoredDecisionId = effective.previous.id
        }
      }

      const sourceChecksum = hashProviderJson({
        capabilityId: input.capabilityId ?? null,
        outcome: input.outcome,
        providerProfileId,
        providerVersion: provider.version,
        reasonCode: input.reasonCode,
        ...(restoredDecisionId ? { restoredDecisionId } : {}),
        ...(basis ? { dossierCandidateId: basis.dossierCandidateId, candidateChecksum: basis.candidateChecksum } : {}),
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
          dossierCandidateId: basis?.dossierCandidateId,
          dossierSubmissionId: basis?.dossierSubmissionId,
          dossierReviewCaseId: basis?.dossierReviewCaseId,
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
          data: { platformQualificationStatus: platformStatusByOutcome[input.outcome]!, ...(positive ? { lifecycleStatus: 'QUALIFIED' as const } : {}) },
        })
      }
      return { ...decision, profileVersion }
    },
    { isolationLevel: 'Serializable' },
  )
}

export async function refreshApprovedProviderSelection(actorId: string, providerProfileId: string, candidateId: string, version: number) {
  return getPrisma().$transaction(async tx => {
    const at = new Date()
    await requireProviderPlatformPermission(tx, actorId, 'PROVIDER_APPROVER', providerProfileId, at)
    if (!await currentApprovedQualificationBasis(tx, providerProfileId, candidateId)) throw new ProviderServiceError('DOSSIER_NOT_SUBMITTABLE')
    const profile = await tx.providerProfile.findUniqueOrThrow({ where: { id: providerProfileId }, select: { version: true, blocks: { where: { release: null }, select: { id: true } } } })
    if (profile.version !== version) throw new ProviderServiceError('CONFLICT')
    if (profile.blocks.length) throw new ProviderServiceError('PROVIDER_BLOCKED')
    const platformHistory = await tx.providerQualificationDecision.findMany({
      ...decisionHistory, where: { providerProfileId, scope: 'PLATFORM' },
    })
    if (qualificationAt(platformHistory, providerProfileId, at).current?.dossierCandidateId !== candidateId) {
      throw new ProviderServiceError('DOSSIER_NOT_SUBMITTABLE')
    }
    await calculateProviderReadinessInTransaction(tx, providerProfileId, at)
    const assessment = await calculateProviderSelectabilityInTransaction(tx, providerProfileId, at)
    if (assessment.status === 'SELECTABLE') await createTrustedProviderProjectionInTransaction(tx, providerProfileId, actorId, at)
    return assessment.status
  }, { isolationLevel: 'Serializable' })
}
