import { z } from 'zod'
import type { Prisma, ProviderDossierSubmissionStatus } from '@/generated/prisma/client'
import { getPrisma } from '@/lib/prisma'
import { requireProviderManager, requireProviderPlatformPermission } from './provider-authorization'
import { hashProviderJson, type CanonicalValue } from './provider-canonical-json'
import { ProviderServiceError } from './provider-errors'
import { requiresFourEyes } from './provider-policy'
import { expectedVersionSchema, reasonCodeSchema, uuidSchema } from './provider-validation'
import { parseProviderInput } from './provider-write-utils'
import { assessProviderDossierCompletenessInTransaction } from './provider-dossier-completeness'

const DOSSIER_SCHEMA_VERSION = 'PROVIDER-DOSSIER-2'
const CANONICALIZATION_VERSION = 'WORKMATCHR-CJ-1'
const ACTIVE_STATUSES: ProviderDossierSubmissionStatus[] = ['SUBMITTED', 'UNDER_REVIEW', 'ADDITIONAL_INFORMATION_REQUIRED']

const submitSchema = z.object({
  expectedProfileVersion: expectedVersionSchema,
  idempotencyKey: z.string().trim().min(1).max(160),
})
const transitionSchema = z.object({ submissionId: uuidSchema, expectedVersion: expectedVersionSchema })
const resubmitSchema = transitionSchema.extend({ idempotencyKey: z.string().trim().min(1).max(160) })
const withdrawSchema = transitionSchema.extend({ reason: z.string().trim().min(10).max(500) })
const findingSchema = z.object({
  reviewCaseId: uuidSchema,
  candidateId: uuidSchema,
  section: z.enum(['ORGANIZATION', 'CAPABILITIES', 'SECTOR_EXPERIENCE', 'WORK_AREA', 'PROFESSIONALS', 'QUALIFICATIONS', 'INSURANCE', 'EVIDENCE', 'DECLARATIONS']),
  reasonCode: reasonCodeSchema,
  providerMessage: z.string().trim().min(10).max(1000),
  internalNote: z.string().trim().max(2000).optional(),
})
const resolutionSchema = z.object({
  findingId: uuidSchema,
  expectedResolutionVersion: z.int().nonnegative(),
  response: z.string().trim().min(10).max(1000),
})
const reviewTransitionSchema = transitionSchema.extend({ reviewCaseId: uuidSchema, reasonCode: reasonCodeSchema })
const finalTransitionSchema = reviewTransitionSchema.extend({ reviewedByUserId: uuidSchema })

type Transaction = Prisma.TransactionClient

function iso(value: Date | null): string | null {
  return value?.toISOString() ?? null
}

export function buildProviderDossierSnapshot(payload: CanonicalValue) {
  const { canonicalJson, sha256 } = hashProviderJson(payload)
  return {
    schemaVersion: DOSSIER_SCHEMA_VERSION,
    canonicalizationVersion: CANONICALIZATION_VERSION,
    canonicalPayload: JSON.parse(canonicalJson) as Prisma.InputJsonValue,
    sha256,
  }
}

async function loadCandidateSource(transaction: Transaction, providerProfileId: string) {
  const provider = await transaction.providerProfile.findFirst({
    where: { id: providerProfileId, archivedAt: null, organization: { status: 'ACTIVE' } },
    select: {
      id: true, version: true, lifecycleStatus: true, readinessStatus: true,
      platformQualificationStatus: true, selectabilityStatus: true,
      organization: { select: { id: true, name: true, tradeName: true, chamberOfCommerceNumber: true, organizationType: true, status: true } },
      capabilities: { where: { status: 'ACTIVE' }, select: { id: true, revisions: { orderBy: { version: 'desc' }, take: 1, select: { id: true, version: true, serviceTermId: true, specialismTermId: true, competencyTermId: true, deliveryModes: true, verificationLevel: true, validFrom: true, validUntil: true } } } },
      sectorExperiences: { where: { status: 'ACTIVE' }, select: { id: true, revisions: { orderBy: { version: 'desc' }, take: 1, select: { id: true, version: true, sectorTermId: true, experienceYears: true, verificationLevel: true } } } },
      workAreas: { where: { status: 'ACTIVE' }, select: { id: true, revisions: { orderBy: { version: 'desc' }, take: 1, select: { id: true, version: true, regionTermId: true, maxTravelDistanceKm: true, verificationLevel: true } } } },
      professionals: { where: { status: 'ACTIVE' }, select: { id: true, identityRevisions: { orderBy: { version: 'desc' }, take: 1, select: { id: true, version: true, displayName: true, functionalRole: true, status: true } }, qualifications: { where: { status: 'ACTIVE' }, select: { id: true, revisions: { orderBy: { version: 'desc' }, take: 1, select: { id: true, version: true, qualificationTermId: true, issuer: true, isCertified: true, registrationNumber: true, issuedAt: true, validUntil: true, verificationLevel: true, evidenceRevisionId: true } } } } } },
      organizationQualifications: { where: { status: 'ACTIVE' }, select: { id: true, revisions: { orderBy: { version: 'desc' }, take: 1, select: { id: true, version: true, qualificationTermId: true, registrationNumber: true, issuedAt: true, validUntil: true, verificationLevel: true, evidenceRevisionId: true } } } },
      insurances: { where: { status: 'ACTIVE' }, select: { id: true, revisions: { orderBy: { version: 'desc' }, take: 1, select: { id: true, version: true, insuranceTypeTermId: true, insurer: true, policyReference: true, effectiveFrom: true, expiresAt: true, coverageAmountCents: true, coverageGeography: true, evidenceRevisionId: true, verificationLevel: true } } } },
      termAcceptances: { select: { id: true, documentVersionId: true, acceptedAt: true } },
      evidenceDocuments: {
        where: { status: 'AVAILABLE' },
        select: {
          revisions: {
            where: { scanDecision: { scanStatus: 'CLEAN' } },
            select: { id: true, version: true, sha256: true, mimeType: true, sizeBytes: true },
          },
        },
      },
    },
  })
  if (!provider) throw new ProviderServiceError('NOT_FOUND')
  const complete = provider.capabilities.length > 0 && provider.capabilities.every((item) => item.revisions.length === 1)
    && provider.sectorExperiences.length > 0 && provider.sectorExperiences.every((item) => item.revisions.length === 1)
    && provider.workAreas.length > 0 && provider.workAreas.every((item) => item.revisions.length === 1)
    && provider.professionals.length > 0
    && provider.professionals.every((item) => item.identityRevisions.length === 1 && item.qualifications.length > 0 && item.qualifications.every((qualification) => qualification.revisions.length === 1))
    && provider.insurances.length > 0 && provider.insurances.every((item) => item.revisions.length === 1)
    && provider.termAcceptances.length > 0
  if (!complete) throw new ProviderServiceError('CONFIGURATION_INCOMPLETE')

  const evidence = provider.evidenceDocuments.flatMap((document) => document.revisions).sort((a, b) => a.id.localeCompare(b.id))
  const payload: CanonicalValue = {
    provider: { id: provider.id, sourceProfileVersion: provider.version, lifecycleStatus: provider.lifecycleStatus, readinessStatus: provider.readinessStatus, platformQualificationStatus: provider.platformQualificationStatus, selectabilityStatus: provider.selectabilityStatus },
    organization: provider.organization,
    capabilities: provider.capabilities.map((item) => ({ recordId: item.id, ...item.revisions[0]!, validFrom: iso(item.revisions[0]!.validFrom), validUntil: iso(item.revisions[0]!.validUntil) })).sort((a, b) => a.recordId.localeCompare(b.recordId)),
    sectorExperiences: provider.sectorExperiences.map((item) => ({ recordId: item.id, ...item.revisions[0]! })).sort((a, b) => a.recordId.localeCompare(b.recordId)),
    workAreas: provider.workAreas.map((item) => ({ recordId: item.id, ...item.revisions[0]! })).sort((a, b) => a.recordId.localeCompare(b.recordId)),
    professionals: provider.professionals.map((item) => ({ id: item.id, identity: item.identityRevisions[0]!, qualifications: item.qualifications.map((qualification) => ({ recordId: qualification.id, ...qualification.revisions[0]!, issuedAt: iso(qualification.revisions[0]!.issuedAt), validUntil: iso(qualification.revisions[0]!.validUntil) })).sort((a, b) => a.recordId.localeCompare(b.recordId)) })).sort((a, b) => a.id.localeCompare(b.id)),
    organizationQualifications: provider.organizationQualifications.flatMap((item) => item.revisions.map((revision) => ({ recordId: item.id, ...revision, issuedAt: iso(revision.issuedAt), validUntil: iso(revision.validUntil) }))).sort((a, b) => a.recordId.localeCompare(b.recordId)),
    insurances: provider.insurances.map((item) => ({ recordId: item.id, ...item.revisions[0]!, coverageAmountCents: item.revisions[0]!.coverageAmountCents?.toString() ?? null, effectiveFrom: iso(item.revisions[0]!.effectiveFrom), expiresAt: iso(item.revisions[0]!.expiresAt) })).sort((a, b) => a.recordId.localeCompare(b.recordId)),
    evidence: evidence.map((item) => ({ id: item.id, version: item.version, sha256: item.sha256, mimeType: item.mimeType, sizeBytes: item.sizeBytes })),
    declarations: provider.termAcceptances.map((item) => ({ id: item.id, documentVersionId: item.documentVersionId, acceptedAt: iso(item.acceptedAt) })).sort((a, b) => a.id.localeCompare(b.id)),
  }
  const sourceReferences: CanonicalValue = {
    profileVersion: provider.version,
    capabilityRevisionIds: provider.capabilities.map((item) => item.revisions[0]!.id).sort(),
    sectorRevisionIds: provider.sectorExperiences.map((item) => item.revisions[0]!.id).sort(),
    workAreaRevisionIds: provider.workAreas.map((item) => item.revisions[0]!.id).sort(),
    professionalIdentityRevisionIds: provider.professionals.map((item) => item.identityRevisions[0]!.id).sort(),
    evidenceRevisionIds: evidence.map((item) => item.id),
  }
  return { provider, evidence, payload, sourceReferences }
}

async function createCandidate(transaction: Transaction, actorUserId: string, providerProfileId: string, submissionId: string) {
  const source = await loadCandidateSource(transaction, providerProfileId)
  const latest = await transaction.providerDossierCandidate.aggregate({ where: { providerProfileId }, _max: { candidateVersion: true } })
  const candidateVersion = (latest._max.candidateVersion ?? 0) + 1
  const snapshot = buildProviderDossierSnapshot(source.payload)
  return transaction.providerDossierCandidate.create({
    data: {
      providerProfileId, submissionId, candidateVersion, sourceProfileVersion: source.provider.version,
      schemaVersion: snapshot.schemaVersion, canonicalizationVersion: snapshot.canonicalizationVersion,
      sourceReferences: source.sourceReferences as Prisma.InputJsonValue,
      canonicalPayload: snapshot.canonicalPayload,
      sha256: snapshot.sha256, createdByUserId: actorUserId,
      evidence: { create: source.evidence.map((item) => ({ evidenceRevisionId: item.id })) },
    },
    select: { id: true, candidateVersion: true, sha256: true },
  })
}

export async function createProviderDossierSubmission(userId: string, providerProfileId: string, rawInput: unknown) {
  const input = parseProviderInput(submitSchema, rawInput)
  return getPrisma().$transaction(async (transaction) => {
    const provider = await requireProviderManager(transaction, userId, providerProfileId)
    if (provider.version !== input.expectedProfileVersion) throw new ProviderServiceError('CONFLICT')
    const repeated = await transaction.providerDossierSubmission.findUnique({ where: { providerProfileId_idempotencyKey: { providerProfileId, idempotencyKey: input.idempotencyKey } }, select: { id: true, status: true, version: true, currentCandidateId: true } })
    if (repeated) return repeated
    if (await transaction.providerDossierSubmission.count({ where: { providerProfileId, status: { in: ACTIVE_STATUSES } } })) throw new ProviderServiceError('ACTIVE_SUBMISSION_EXISTS')
    const completeness = await assessProviderDossierCompletenessInTransaction(transaction, providerProfileId)
    if (!completeness.isSubmittable || completeness.sourceProfileVersion !== input.expectedProfileVersion) throw new ProviderServiceError('DOSSIER_NOT_SUBMITTABLE')
    const submission = await transaction.providerDossierSubmission.create({ data: { providerProfileId, submittedByUserId: userId, idempotencyKey: input.idempotencyKey }, select: { id: true } })
    const candidate = await createCandidate(transaction, userId, providerProfileId, submission.id)
    await transaction.providerDossierSubmission.update({ where: { id: submission.id }, data: { currentCandidateId: candidate.id } })
    await transaction.providerDossierSubmissionHistory.create({ data: { submissionId: submission.id, candidateId: candidate.id, toStatus: 'SUBMITTED', actorUserId: userId, reasonCode: 'DOSSIER_SUBMITTED' } })
    return { id: submission.id, status: 'SUBMITTED' as const, version: 1, currentCandidateId: candidate.id, candidate }
  }, { isolationLevel: 'Serializable' })
}

async function transitionSubmission(transaction: Transaction, submissionId: string, providerProfileId: string, expectedVersion: number, from: ProviderDossierSubmissionStatus, to: ProviderDossierSubmissionStatus, actorUserId: string, reasonCode: string, reason?: string, candidateId?: string) {
  const submission = await transaction.providerDossierSubmission.findFirst({ where: { id: submissionId, providerProfileId, status: from, version: expectedVersion }, select: { id: true, currentCandidateId: true } })
  if (!submission?.currentCandidateId) throw new ProviderServiceError('CONFLICT')
  const updated = await transaction.providerDossierSubmission.updateMany({ where: { id: submissionId, providerProfileId, status: from, version: expectedVersion }, data: { status: to, version: { increment: 1 }, currentCandidateId: candidateId, closedAt: ['APPROVED', 'REJECTED', 'EXPIRED', 'WITHDRAWN'].includes(to) ? new Date() : undefined } })
  if (updated.count !== 1) throw new ProviderServiceError('CONFLICT')
  await transaction.providerDossierSubmissionHistory.create({ data: { submissionId, candidateId: candidateId ?? submission.currentCandidateId, fromStatus: from, toStatus: to, actorUserId, reasonCode, reason } })
  return { submissionId, status: to, version: expectedVersion + 1 }
}

export async function withdrawProviderDossierSubmission(userId: string, providerProfileId: string, rawInput: unknown) {
  const input = parseProviderInput(withdrawSchema, rawInput)
  return getPrisma().$transaction(async (transaction) => {
    await requireProviderManager(transaction, userId, providerProfileId)
    const submission = await transaction.providerDossierSubmission.findFirst({ where: { id: input.submissionId, providerProfileId }, select: { status: true, version: true, reviewCases: { where: { status: 'OPEN' }, take: 1, select: { id: true, version: true } } } })
    if (!submission) throw new ProviderServiceError('CONFLICT')
    if (submission.status === 'WITHDRAWN' && submission.version === input.expectedVersion + 1) return { submissionId: input.submissionId, status: 'WITHDRAWN' as const, version: submission.version }
    if (!ACTIVE_STATUSES.includes(submission.status)) throw new ProviderServiceError('CONFLICT')
    const openCase = submission.reviewCases[0]
    if (openCase) await transaction.providerDossierReviewCase.update({ where: { id: openCase.id }, data: { status: 'CLOSED', version: { increment: 1 }, closedByUserId: userId, closedAt: new Date() } })
    return transitionSubmission(transaction, input.submissionId, providerProfileId, input.expectedVersion, submission.status, 'WITHDRAWN', userId, 'WITHDRAWN_BY_PROVIDER', input.reason)
  }, { isolationLevel: 'Serializable' })
}

export async function openProviderDossierReviewCase(reviewerUserId: string, providerProfileId: string, rawInput: unknown) {
  const input = parseProviderInput(transitionSchema, rawInput)
  return getPrisma().$transaction(async (transaction) => {
    await requireProviderPlatformPermission(transaction, reviewerUserId, 'PROVIDER_REVIEWER', providerProfileId)
    const submission = await transaction.providerDossierSubmission.findFirst({ where: { id: input.submissionId, providerProfileId, status: 'SUBMITTED', version: input.expectedVersion }, select: { currentCandidateId: true } })
    if (!submission?.currentCandidateId) throw new ProviderServiceError('CONFLICT')
    const reviewCase = await transaction.providerDossierReviewCase.create({ data: { providerProfileId, submissionId: input.submissionId, candidateId: submission.currentCandidateId, openedByUserId: reviewerUserId }, select: { id: true } })
    await transitionSubmission(transaction, input.submissionId, providerProfileId, input.expectedVersion, 'SUBMITTED', 'UNDER_REVIEW', reviewerUserId, 'REVIEW_STARTED')
    return { ...reviewCase, status: 'OPEN' as const }
  }, { isolationLevel: 'Serializable' })
}

export async function createProviderDossierFinding(reviewerUserId: string, providerProfileId: string, rawInput: unknown) {
  const input = parseProviderInput(findingSchema, rawInput)
  return getPrisma().$transaction(async (transaction) => {
    await requireProviderPlatformPermission(transaction, reviewerUserId, 'PROVIDER_REVIEWER', providerProfileId)
    const reviewCase = await transaction.providerDossierReviewCase.findFirst({ where: { id: input.reviewCaseId, providerProfileId, candidateId: input.candidateId, status: 'OPEN', submission: { status: 'UNDER_REVIEW' } }, select: { id: true } })
    if (!reviewCase) throw new ProviderServiceError('NOT_FOUND')
    return transaction.providerDossierFinding.create({ data: { ...input, createdByUserId: reviewerUserId }, select: { id: true, status: true, createdAt: true } })
  }, { isolationLevel: 'Serializable' })
}

export async function requestAdditionalProviderInformation(reviewerUserId: string, providerProfileId: string, rawInput: unknown) {
  const input = parseProviderInput(reviewTransitionSchema, rawInput)
  return getPrisma().$transaction(async (transaction) => {
    await requireProviderPlatformPermission(transaction, reviewerUserId, 'PROVIDER_REVIEWER', providerProfileId)
    const reviewCase = await transaction.providerDossierReviewCase.findFirst({ where: { id: input.reviewCaseId, providerProfileId, status: 'OPEN', submissionId: input.submissionId }, select: { id: true, version: true, candidateId: true, _count: { select: { findings: true } } } })
    if (!reviewCase || reviewCase._count.findings === 0) throw new ProviderServiceError('CONFLICT')
    await transaction.providerDossierReviewCase.update({ where: { id: reviewCase.id }, data: { status: 'CLOSED', version: { increment: 1 }, closedByUserId: reviewerUserId, closedAt: new Date() } })
    return transitionSubmission(transaction, input.submissionId, providerProfileId, input.expectedVersion, 'UNDER_REVIEW', 'ADDITIONAL_INFORMATION_REQUIRED', reviewerUserId, input.reasonCode)
  }, { isolationLevel: 'Serializable' })
}

export async function resolveProviderDossierFinding(userId: string, providerProfileId: string, rawInput: unknown) {
  const input = parseProviderInput(resolutionSchema, rawInput)
  return getPrisma().$transaction(async (transaction) => {
    await requireProviderManager(transaction, userId, providerProfileId)
    const finding = await transaction.providerDossierFinding.findFirst({ where: { id: input.findingId, reviewCase: { providerProfileId, submission: { status: 'ADDITIONAL_INFORMATION_REQUIRED' } } }, select: { id: true } })
    if (!finding) throw new ProviderServiceError('NOT_FOUND')
    const latest = await transaction.providerDossierFindingResolution.aggregate({ where: { findingId: finding.id }, _max: { version: true } })
    const currentVersion = latest._max.version ?? 0
    if (currentVersion !== input.expectedResolutionVersion) throw new ProviderServiceError('CONFLICT')
    return transaction.providerDossierFindingResolution.create({ data: { findingId: finding.id, version: currentVersion + 1, response: input.response, resolvedByUserId: userId }, select: { id: true, version: true } })
  }, { isolationLevel: 'Serializable' })
}

export async function resubmitProviderDossier(userId: string, providerProfileId: string, rawInput: unknown) {
  const input = parseProviderInput(resubmitSchema, rawInput)
  return getPrisma().$transaction(async (transaction) => {
    await requireProviderManager(transaction, userId, providerProfileId)
    const operationCode = `RESUBMIT_${hashProviderJson({ key: input.idempotencyKey }).sha256.slice(0, 32).toUpperCase()}`
    const repeated = await transaction.providerDossierSubmissionHistory.findFirst({ where: { submissionId: input.submissionId, reasonCode: operationCode, toStatus: 'SUBMITTED' }, select: { submission: { select: { version: true } }, candidate: { select: { id: true, candidateVersion: true, sha256: true } } } })
    if (repeated) return { submissionId: input.submissionId, status: 'SUBMITTED' as const, version: repeated.submission.version, candidate: repeated.candidate }
    const submission = await transaction.providerDossierSubmission.findFirst({ where: { id: input.submissionId, providerProfileId, status: 'ADDITIONAL_INFORMATION_REQUIRED', version: input.expectedVersion }, select: { id: true, reviewCases: { orderBy: { openedAt: 'desc' }, take: 1, select: { findings: { select: { id: true, resolutions: { take: 1, orderBy: { version: 'desc' }, select: { version: true, response: true } } } } } } } })
    if (!submission || submission.reviewCases.length === 0 || submission.reviewCases[0]!.findings.some((finding) => finding.resolutions.length === 0)) throw new ProviderServiceError('FINDING_NOT_RESOLVED')
    const completeness = await assessProviderDossierCompletenessInTransaction(transaction, providerProfileId)
    if (!completeness.isSubmittable) throw new ProviderServiceError('DOSSIER_NOT_SUBMITTABLE')
    const candidate = await createCandidate(transaction, userId, providerProfileId, submission.id)
    for (const finding of submission.reviewCases[0]!.findings) {
      const latest = finding.resolutions[0]!
      await transaction.providerDossierFindingResolution.create({ data: { findingId: finding.id, version: latest.version + 1, response: latest.response, resolvedByUserId: userId, candidateId: candidate.id } })
    }
    const result = await transitionSubmission(transaction, submission.id, providerProfileId, input.expectedVersion, 'ADDITIONAL_INFORMATION_REQUIRED', 'SUBMITTED', userId, operationCode, undefined, candidate.id)
    return { ...result, candidate }
  }, { isolationLevel: 'Serializable' })
}

export async function finalizeProviderDossierReview(approverUserId: string, providerProfileId: string, outcome: 'APPROVED' | 'REJECTED', rawInput: unknown) {
  const input = parseProviderInput(finalTransitionSchema, rawInput)
  if (!requiresFourEyes(input.reviewedByUserId, approverUserId)) throw new ProviderServiceError('FOUR_EYES_REQUIRED')
  return getPrisma().$transaction(async (transaction) => {
    await requireProviderPlatformPermission(transaction, input.reviewedByUserId, 'PROVIDER_REVIEWER', providerProfileId)
    await requireProviderPlatformPermission(transaction, approverUserId, 'PROVIDER_APPROVER', providerProfileId)
    const reviewCase = await transaction.providerDossierReviewCase.findFirst({ where: { id: input.reviewCaseId, providerProfileId, submissionId: input.submissionId, status: 'OPEN', openedByUserId: input.reviewedByUserId }, select: { id: true, version: true } })
    if (!reviewCase) throw new ProviderServiceError('CONFLICT')
    await transaction.providerDossierReviewCase.update({ where: { id: reviewCase.id }, data: { status: 'CLOSED', version: { increment: 1 }, closedByUserId: approverUserId, closedAt: new Date() } })
    return transitionSubmission(transaction, input.submissionId, providerProfileId, input.expectedVersion, 'UNDER_REVIEW', outcome, approverUserId, input.reasonCode)
  }, { isolationLevel: 'Serializable' })
}
