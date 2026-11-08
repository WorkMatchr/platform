import { candidateMatchesProfile } from './provider-dossier-service'
import { subjectField, verificationSubjects } from './provider-review-subjects'
import { positiveQualificationReason } from './provider-requirements'
import { z } from 'zod'
import type { Prisma } from '@/generated/prisma/client'
import { getPrisma } from '@/lib/prisma'
import { requireProviderPlatformPermission } from './provider-authorization'
import { hashProviderJson } from './provider-canonical-json'
import { ProviderServiceError } from './provider-errors'
import { reasonCodeSchema, sha256Schema, uuidSchema } from './provider-validation'
import { parseProviderInput } from './provider-write-utils'

const subjectSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('CAPABILITY'), revisionId: uuidSchema }),
  z.object({ type: z.literal('SECTOR_EXPERIENCE'), revisionId: uuidSchema }),
  z.object({ type: z.literal('WORK_AREA'), revisionId: uuidSchema }),
  z.object({ type: z.literal('PROFESSIONAL_QUALIFICATION'), revisionId: uuidSchema }),
  z.object({ type: z.literal('ORGANIZATION_QUALIFICATION'), revisionId: uuidSchema }),
  z.object({ type: z.literal('INSURANCE'), revisionId: uuidSchema }),
  z.object({ type: z.literal('EVIDENCE'), revisionId: uuidSchema }),
])

const reviewSchema = z.object({
  expectedProfileVersion: z.int().positive(),
  subject: subjectSchema,
  dossier: z.object({ candidateId: uuidSchema, reviewCaseId: uuidSchema, justification: z.string().trim().min(10).max(500) }).optional(),
  outcome: z.enum(['DOCUMENT_CHECKED', 'VERIFIED', 'CHANGES_REQUESTED', 'REJECTED', 'EXPIRED']),
  resultingLevel: z.enum(['SELF_DECLARED', 'DOCUMENT_CHECKED', 'VERIFIED']),
  reasonCode: reasonCodeSchema,
  validUntil: z.coerce.date().optional(),
}).refine(
  (input) =>
    (input.outcome === 'DOCUMENT_CHECKED' && input.resultingLevel === 'DOCUMENT_CHECKED') ||
    (input.outcome === 'VERIFIED' && input.resultingLevel === 'VERIFIED') ||
    (['CHANGES_REQUESTED', 'REJECTED', 'EXPIRED'].includes(input.outcome) && input.resultingLevel === 'SELF_DECLARED'),
  { path: ['resultingLevel'], message: 'Het verificatieniveau past niet bij de uitkomst.' },
)

async function subjectBelongsToProvider(
  transaction: Prisma.TransactionClient,
  providerProfileId: string,
  subject: z.infer<typeof subjectSchema>,
): Promise<boolean> {
  switch (subject.type) {
    case 'CAPABILITY':
      return Boolean(await transaction.providerCapabilityRevision.findFirst({ where: { id: subject.revisionId, capability: { providerProfileId } }, select: { id: true } }))
    case 'SECTOR_EXPERIENCE':
      return Boolean(await transaction.providerSectorExperienceRevision.findFirst({ where: { id: subject.revisionId, sectorExperience: { providerProfileId } }, select: { id: true } }))
    case 'WORK_AREA':
      return Boolean(await transaction.providerWorkAreaRevision.findFirst({ where: { id: subject.revisionId, workArea: { providerProfileId } }, select: { id: true } }))
    case 'PROFESSIONAL_QUALIFICATION':
      return Boolean(await transaction.providerProfessionalQualificationRevision.findFirst({ where: { id: subject.revisionId, qualification: { professional: { providerProfileId } } }, select: { id: true } }))
    case 'ORGANIZATION_QUALIFICATION':
      return Boolean(await transaction.providerOrganizationQualificationRevision.findFirst({ where: { id: subject.revisionId, qualification: { providerProfileId } }, select: { id: true } }))
    case 'INSURANCE':
      return Boolean(await transaction.providerInsuranceRevision.findFirst({ where: { id: subject.revisionId, insurance: { providerProfileId } }, select: { id: true } }))
    case 'EVIDENCE':
      return Boolean(await transaction.providerEvidenceRevision.findFirst({ where: { id: subject.revisionId, evidenceDocument: { providerProfileId } }, select: { id: true } }))
  }
}

export async function recordProviderVerificationReview(
  reviewerUserId: string,
  providerProfileId: string,
  rawInput: unknown,
) {
  const input = parseProviderInput(reviewSchema, rawInput)
  return getPrisma().$transaction(async (transaction) => {
    await requireProviderPlatformPermission(transaction, reviewerUserId, 'PROVIDER_REVIEWER', providerProfileId)
    if (!(await subjectBelongsToProvider(transaction, providerProfileId, input.subject))) {
      throw new ProviderServiceError('NOT_FOUND')
    }
    const validFrom = new Date()
    if (input.validUntil && input.validUntil <= validFrom) throw new ProviderServiceError('VALIDATION_ERROR')
    const positive = input.resultingLevel !== 'SELF_DECLARED'
    let binding
    if (input.dossier) {
      const latest = await transaction.providerDossierSubmission.findFirst({
        where: { providerProfileId }, orderBy: [{ submittedAt: 'desc' }, { id: 'desc' }],
        include: { currentCandidate: true, reviewCases: { where: { id: input.dossier.reviewCaseId, status: 'OPEN', openedByUserId: reviewerUserId } } },
      })
      const candidate = latest?.currentCandidate
      const reviewCase = latest?.reviewCases[0]
      if (!reviewCase || reviewCase.candidateId !== input.dossier.candidateId || reviewCase.providerProfileId !== providerProfileId) throw new ProviderServiceError('ACCESS_DENIED')
      if (!candidate || candidate.id !== reviewCase.candidateId || latest.status !== 'UNDER_REVIEW' ||
          !await candidateMatchesProfile(transaction, candidate)) throw new ProviderServiceError('DOSSIER_NOT_SUBMITTABLE')
      const subject = verificationSubjects(candidate.canonicalPayload).find(s => s.type === input.subject.type && s.id === input.subject.revisionId)
      if (!subject) throw new ProviderServiceError('NOT_FOUND')
      if (positive && (!input.validUntil || subject.missingEvidence ||
          (subject.validFrom && new Date(subject.validFrom) > validFrom) ||
          (subject.validUntil && input.validUntil > new Date(subject.validUntil)))) throw new ProviderServiceError('VALIDATION_ERROR')
      binding = { dossierCandidateId: candidate.id, dossierSubmissionId: latest.id, dossierReviewCaseId: reviewCase.id }
    }
    const reason = await transaction.providerReasonCode.findUnique({ where: { code: input.reasonCode, isActive: true,
      ...(binding && positive ? positiveQualificationReason : {}) }, select: { id: true } })
    if (!reason) throw new ProviderServiceError('VALIDATION_ERROR')
    const checksum = hashProviderJson({
      ...(binding ? { ...binding, reviewerUserId, justification: input.dossier!.justification } : {}),
      outcome: input.outcome,
      providerProfileId,
      reasonCode: input.reasonCode,
      resultingLevel: input.resultingLevel,
      subject: { revisionId: input.subject.revisionId, type: input.subject.type },
      validFrom: validFrom.toISOString(),
      validUntil: input.validUntil?.toISOString() ?? null,
    }).sha256
    const review = await transaction.providerVerificationReview.create({
      data: {
        providerProfileId,
        ...binding,
        [subjectField[input.subject.type]]: input.subject.revisionId,
        outcome: input.outcome,
        resultingLevel: input.resultingLevel,
        reviewerUserId,
        reasonCode: input.reasonCode,
        validFrom,
        validUntil: input.validUntil,
        checksum,
      },
      select: { id: true, outcome: true, resultingLevel: true, checksum: true },
    })
    const updated = await transaction.providerProfile.updateMany({
      where: { id: providerProfileId, version: input.expectedProfileVersion },
      data: { version: { increment: 1 }, readinessStatus: 'INCOMPLETE', selectabilityStatus: 'NOT_SELECTABLE' },
    })
    if (updated.count !== 1) throw new ProviderServiceError('CONFLICT')
    const projection = await transaction.trustedProviderProjection.findFirst({
      where: { providerProfileId, invalidation: null },
      orderBy: { sourceVersion: 'desc' },
      select: { id: true },
    })
    if (projection) {
      await transaction.trustedProviderProjectionInvalidation.create({
        data: { projectionId: projection.id, reasonCode: 'VERIFICATION_CHANGED' },
      })
    }
    if (binding && input.dossier) {
      await transaction.marketplaceAuditEvent.create({ data: {
        actorUserId: reviewerUserId, actorRole: 'PROVIDER_REVIEWER', action: 'PROVIDER_VERIFICATION_RECORDED',
        entityType: 'ProviderVerificationReview', entityId: review.id, nextState: input.outcome,
        reason: input.dossier.justification, metadata: { ...binding, providerProfileId, checksum },
      } })
    }
    return { ...review, profileVersion: input.expectedProfileVersion + 1 }
  }, { isolationLevel: 'Serializable' })
}

const scanDecisionSchema = z.object({
  evidenceRevisionId: uuidSchema,
  scanStatus: z.enum(['CLEAN', 'QUARANTINED', 'REJECTED']),
  scannerReference: z.string().trim().min(2).max(200),
  checksum: sha256Schema,
})

export async function recordProviderEvidenceScanDecision(rawInput: unknown) {
  const input = parseProviderInput(scanDecisionSchema, rawInput)
  return getPrisma().$transaction(async (transaction) => {
    const revision = await transaction.providerEvidenceRevision.findUnique({
      where: { id: input.evidenceRevisionId },
      select: { evidenceDocumentId: true, evidenceDocument: { select: { providerProfileId: true } } },
    })
    if (!revision) throw new ProviderServiceError('NOT_FOUND')
    const existing = await transaction.providerEvidenceScanDecision.findUnique({
      where: { evidenceRevisionId: input.evidenceRevisionId },
      select: { id: true, scanStatus: true, scannerReference: true, checksum: true },
    })
    if (existing) {
      if (
        existing.scanStatus !== input.scanStatus ||
        existing.scannerReference !== input.scannerReference ||
        existing.checksum !== input.checksum
      ) {
        throw new ProviderServiceError('IDEMPOTENCY_CONFLICT')
      }
      return { id: existing.id, scanStatus: existing.scanStatus, idempotent: true }
    }
    const decision = await transaction.providerEvidenceScanDecision.create({ data: input, select: { id: true, scanStatus: true } })
    await transaction.providerEvidenceDocument.update({
      where: { id: revision.evidenceDocumentId },
      data: { status: input.scanStatus === 'CLEAN' ? 'AVAILABLE' : 'ARCHIVED' },
    })
    await transaction.providerProfile.update({
      where: { id: revision.evidenceDocument.providerProfileId },
      data: { version: { increment: 1 }, readinessStatus: 'INCOMPLETE', selectabilityStatus: 'NOT_SELECTABLE' },
    })
    const projection = await transaction.trustedProviderProjection.findFirst({
      where: { providerProfileId: revision.evidenceDocument.providerProfileId, invalidation: null },
      orderBy: { sourceVersion: 'desc' },
      select: { id: true },
    })
    if (projection) {
      await transaction.trustedProviderProjectionInvalidation.create({
        data: { projectionId: projection.id, reasonCode: 'EVIDENCE_SCAN_CHANGED' },
      })
    }
    return { ...decision, idempotent: false }
  })
}
