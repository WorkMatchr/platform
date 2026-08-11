import 'server-only'

import { z } from 'zod'
import type { Prisma } from '@/generated/prisma/client'
import type {
  KnowledgeAccessTier,
  KnowledgeAuditEventType,
  KnowledgeReviewDecisionType,
  KnowledgeReviewTaskStatus,
} from '@/generated/prisma/enums'
import { getPrisma } from '@/lib/prisma'

type Transaction = Prisma.TransactionClient

const optionalText = (maximum: number) =>
  z.string().trim().max(maximum).optional().transform((value) => value || null)

export const knowledgeReviewDraftSchema = z.object({
  reviewTaskId: z.string().uuid(),
  expectedVersion: z.coerce.number().int().positive(),
  proposedStatement: optionalText(1500),
  substantiveNotes: optionalText(1500),
  practicalNuance: optionalText(1500),
  applicabilityConditions: optionalText(1500),
  exceptions: optionalText(1500),
  editorialNote: optionalText(1500),
  proposedAccessTier: z.enum([
    'PUBLIC_BASIC',
    'REGISTERED_BASIC',
    'PROFESSIONAL_PRO',
    'ORGANIZATION_BUSINESS',
    'INTERNAL_REVIEWER',
    'PLATFORM_ADMIN',
  ]).nullable().optional(),
  nextReviewAt: z.coerce.date().nullable().optional(),
})

export const knowledgeReviewDecisionSchema = knowledgeReviewDraftSchema.extend({
  operation: z.enum(['DEFER', 'CHANGES_REQUIRED', 'REJECT', 'CONTENT_APPROVE']),
  reason: optionalText(1500),
  deferredUntil: z.coerce.date().nullable().optional(),
  confirmed: z.boolean().optional().default(false),
}).superRefine((value, context) => {
  if (['CHANGES_REQUIRED', 'REJECT'].includes(value.operation) && (!value.reason || value.reason.length < 5)) {
    context.addIssue({ code: 'custom', path: ['reason'], message: 'Geef een reden van minimaal vijf tekens.' })
  }
  if (value.operation === 'CONTENT_APPROVE') {
    if (!value.confirmed) context.addIssue({ code: 'custom', path: ['confirmed'], message: 'Bevestig dat de broncontrole is afgerond.' })
  }
})

export const knowledgeSupportingSourceSchema = z.object({
  reviewTaskId: z.string().uuid(),
  expectedVersion: z.coerce.number().int().positive(),
  sourceVersionId: z.string().uuid().nullable().optional(),
  sourceType: z.enum([
    'AI_SHEET', 'LEGISLATION', 'REGULATION', 'INSPECTORATE_GUIDANCE', 'ARBOCATALOGUE',
    'STANDARD', 'RESEARCH', 'PROFESSIONAL_GUIDANCE', 'INTERNAL_EXPERTISE', 'CASE_LAW', 'OTHER',
  ]),
  title: optionalText(300),
  publisher: optionalText(200),
  urlOrReference: optionalText(1000),
  publicationDate: z.coerce.date().nullable().optional(),
  checkedAt: z.coerce.date().nullable().optional(),
  authorityLevel: z.enum([
    'PRIMARY_LEGAL', 'OFFICIAL_GUIDANCE', 'CONSENSUS_STANDARD', 'PROFESSIONAL_GUIDANCE',
    'RESEARCH', 'INTERNAL', 'UNKNOWN',
  ]),
  isPrimary: z.boolean().optional().default(false),
  sourceFamily: optionalText(120),
  supportType: z.enum(['DIRECT_SUPPORT', 'PARTIAL_SUPPORT', 'CONTRADICTS', 'SUPERSEDES', 'CONTEXT']),
}).superRefine((value, context) => {
  if (!value.sourceVersionId && (!value.title || value.title.length < 3)) {
    context.addIssue({ code: 'custom', path: ['title'], message: 'Vul een brontitel in of kies een bestaande bron.' })
  }
  if (!value.sourceVersionId && (!value.sourceFamily || value.sourceFamily.length < 2)) {
    context.addIssue({ code: 'custom', path: ['sourceFamily'], message: 'Vul de bronfamilie in.' })
  }
})

export class KnowledgeReviewError extends Error {
  constructor(
    public readonly code: 'NOT_AUTHORIZED' | 'NOT_FOUND' | 'CONFLICT' | 'INVALID_STATE' | 'INVALID_INPUT',
    message: string,
  ) {
    super(message)
    this.name = 'KnowledgeReviewError'
  }
}

async function assertPlatformAdministrator(transaction: Transaction, actorUserId: string) {
  const actor = await transaction.user.findFirst({
    where: {
      id: actorUserId,
      status: 'ACTIVE',
      platformRole: 'ADMIN',
      memberships: { some: {
        status: 'ACTIVE',
        role: { in: ['OWNER', 'ADMIN'] },
        organization: { status: 'ACTIVE', organizationType: 'PLATFORM_OPERATOR', systemKey: 'WORKMATCHR_PLATFORM' },
      } },
    },
    select: { id: true },
  })
  if (!actor) throw new KnowledgeReviewError('NOT_AUTHORIZED', 'Deze kenniscontrole is niet beschikbaar.')
}

async function lockReviewTask(transaction: Transaction, reviewTaskId: string, expectedVersion: number, allowInactive = false) {
  await transaction.$queryRaw`SELECT "id" FROM "KnowledgeReviewTask" WHERE "id" = ${reviewTaskId}::uuid FOR UPDATE`
  const task = await transaction.knowledgeReviewTask.findUnique({ where: { id: reviewTaskId } })
  if (!task) throw new KnowledgeReviewError('NOT_FOUND', 'De kenniscontrole is niet beschikbaar.')
  if (task.version !== expectedVersion) throw new KnowledgeReviewError('CONFLICT', 'Deze kenniscontrole is intussen gewijzigd. Vernieuw de pagina en controleer de nieuwste gegevens.')
  if (!allowInactive && !task.requiresHumanAction) throw new KnowledgeReviewError('INVALID_STATE', 'Voor dit kennisitem is geen menselijke uitzondering actief.')
  return task
}

const terminalStatuses = new Set<KnowledgeReviewTaskStatus>(['CONTENT_APPROVED', 'REJECTED', 'COMPLETED', 'CANCELLED'])

function assertMutable(status: KnowledgeReviewTaskStatus) {
  if (terminalStatuses.has(status)) throw new KnowledgeReviewError('INVALID_STATE', 'Deze kenniscontrole is al definitief afgehandeld.')
}

function draftData(value: z.infer<typeof knowledgeReviewDraftSchema>) {
  return {
    proposedStatement: value.proposedStatement,
    substantiveNotes: value.substantiveNotes,
    practicalNuance: value.practicalNuance,
    applicabilityConditions: value.applicabilityConditions,
    exceptions: value.exceptions,
    editorialNote: value.editorialNote,
    proposedAccessTier: value.proposedAccessTier as KnowledgeAccessTier | null | undefined,
    nextReviewAt: value.nextReviewAt,
  }
}

async function nextDecisionSequence(transaction: Transaction, reviewTaskId: string) {
  const latest = await transaction.knowledgeReviewDecision.findFirst({
    where: { reviewTaskId },
    select: { sequence: true },
    orderBy: { sequence: 'desc' },
  })
  return (latest?.sequence ?? 0) + 1
}

async function writeAudit(transaction: Transaction, input: {
  eventType: KnowledgeAuditEventType
  taskId: string
  actorUserId: string
  previousStatus: KnowledgeReviewTaskStatus
  nextStatus: KnowledgeReviewTaskStatus
  reason?: string | null
}) {
  await transaction.knowledgeAuditEvent.create({ data: {
    eventType: input.eventType,
    entityType: 'KnowledgeReviewTask',
    entityId: input.taskId,
    actorUserId: input.actorUserId,
    actorType: 'PLATFORM_ADMIN',
    result: 'SUCCESS',
    reason: input.reason,
    metadata: { previousStatus: input.previousStatus, nextStatus: input.nextStatus },
  } })
}

export async function saveKnowledgeReviewDraft(actorUserId: string, rawInput: unknown) {
  const parsed = knowledgeReviewDraftSchema.safeParse(rawInput)
  if (!parsed.success) throw new KnowledgeReviewError('INVALID_INPUT', 'Controleer de ingevulde controlevelden.')
  return getPrisma().$transaction(async (transaction) => {
    await assertPlatformAdministrator(transaction, actorUserId)
    const task = await lockReviewTask(transaction, parsed.data.reviewTaskId, parsed.data.expectedVersion)
    assertMutable(task.status)
    const nextStatus: KnowledgeReviewTaskStatus = 'IN_PROGRESS'
    const updated = await transaction.knowledgeReviewTask.update({
      where: { id: task.id, version: task.version },
      data: {
        ...draftData(parsed.data),
        status: nextStatus,
        assignedToId: task.assignedToId ?? actorUserId,
        lastEditedById: actorUserId,
        startedAt: task.startedAt ?? new Date(),
        deferredUntil: null,
        version: { increment: 1 },
      },
    })
    if (task.status === 'OPEN') await writeAudit(transaction, { eventType: 'REVIEW_STARTED', taskId: task.id, actorUserId, previousStatus: task.status, nextStatus })
    await writeAudit(transaction, { eventType: 'REVIEW_DRAFT_SAVED', taskId: task.id, actorUserId, previousStatus: task.status, nextStatus })
    if (parsed.data.proposedStatement && parsed.data.proposedStatement !== task.proposedStatement) {
      await writeAudit(transaction, { eventType: 'CLAIM_REWORDING_PROPOSED', taskId: task.id, actorUserId, previousStatus: task.status, nextStatus })
    }
    return updated
  }, { isolationLevel: 'Serializable' })
}

const decisionConfig = {
  DEFER: { decisionType: 'DEFERRED', nextStatus: 'DEFERRED', eventType: 'REVIEW_DEFERRED' },
  CHANGES_REQUIRED: { decisionType: 'CHANGES_REQUIRED', nextStatus: 'CHANGES_REQUIRED', eventType: 'CHANGES_REQUIRED' },
  REJECT: { decisionType: 'REJECTED', nextStatus: 'REJECTED', eventType: 'CONTENT_REVIEW_REJECTED' },
  CONTENT_APPROVE: { decisionType: 'CONTENT_APPROVED', nextStatus: 'CONTENT_APPROVED', eventType: 'CONTENT_REVIEW_APPROVED' },
} as const satisfies Record<string, { decisionType: KnowledgeReviewDecisionType; nextStatus: KnowledgeReviewTaskStatus; eventType: KnowledgeAuditEventType }>

export async function decideKnowledgeReview(actorUserId: string, rawInput: unknown) {
  const parsed = knowledgeReviewDecisionSchema.safeParse(rawInput)
  if (!parsed.success) throw new KnowledgeReviewError('INVALID_INPUT', parsed.error.issues[0]?.message ?? 'Controleer de controlebeslissing.')
  return getPrisma().$transaction(async (transaction) => {
    await assertPlatformAdministrator(transaction, actorUserId)
    const task = await lockReviewTask(transaction, parsed.data.reviewTaskId, parsed.data.expectedVersion)
    assertMutable(task.status)
    const config = decisionConfig[parsed.data.operation]
    const now = new Date()
    const isTerminal = ['REJECT', 'CONTENT_APPROVE'].includes(parsed.data.operation)
    const snapshot = draftData(parsed.data)
    const updated = await transaction.knowledgeReviewTask.update({
      where: { id: task.id, version: task.version },
      data: {
        ...snapshot,
        status: config.nextStatus,
        assignedToId: task.assignedToId ?? actorUserId,
        lastEditedById: actorUserId,
        startedAt: task.startedAt ?? now,
        deferredUntil: parsed.data.operation === 'DEFER' ? parsed.data.deferredUntil : null,
        completedAt: isTerminal ? now : null,
        completedById: isTerminal ? actorUserId : null,
        requiresHumanAction: !isTerminal,
        deactivatedAt: isTerminal ? now : null,
        version: { increment: 1 },
      },
    })
    await transaction.knowledgeReviewDecision.create({ data: {
      reviewTaskId: task.id,
      sequence: await nextDecisionSequence(transaction, task.id),
      decisionType: config.decisionType,
      previousStatus: task.status,
      nextStatus: config.nextStatus,
      actorUserId,
      reason: parsed.data.reason,
      ...snapshot,
    } })

    if (parsed.data.operation === 'REJECT') {
      await transaction.knowledgeValidation.create({ data: {
        claimId: task.claimId,
        reviewTaskId: task.id,
        validationMethod: 'HUMAN_EXPERT_REVIEW',
        status: 'REJECTED',
        validatorType: 'HUMAN',
        validatorUserId: actorUserId,
        rationale: parsed.data.reason!,
        validatedAt: now,
      } })
      await transaction.knowledgeClaim.update({ where: { id: task.claimId }, data: {
        validationStatus: 'REJECTED', publicationStatus: 'REJECTED', reviewedByUserId: actorUserId, reviewedAt: now,
      } })
    }
    if (parsed.data.operation === 'CHANGES_REQUIRED') {
      await transaction.knowledgeClaim.update({ where: { id: task.claimId }, data: {
        sourceControlStatus: 'HUMAN_EXCEPTION_REQUIRED',
      } })
    }
    if (parsed.data.operation === 'CONTENT_APPROVE') {
      await transaction.knowledgeValidation.create({ data: {
        claimId: task.claimId,
        reviewTaskId: task.id,
        validationMethod: 'CROSS_SOURCE_CHECK',
        status: 'PARTIALLY_VALIDATED',
        validatorType: 'HUMAN',
        validatorUserId: actorUserId,
        rationale: parsed.data.substantiveNotes || 'Bronherleidbaarheid, algemene formulering en actualiteit zijn gecontroleerd; publicatie blijft een afzonderlijk besluit.',
        validatedAt: now,
        nextReviewAt: parsed.data.nextReviewAt,
      } })
      await transaction.knowledgeClaim.update({ where: { id: task.claimId }, data: {
        validationStatus: 'PARTIALLY_VALIDATED', publicationStatus: 'INTERNAL_REVIEW',
        sourceControlStatus: 'CONTROL_COMPLETE', lastSourceCheckedAt: now,
        reviewedByUserId: actorUserId, reviewedAt: now, nextReviewAt: parsed.data.nextReviewAt,
      } })
    }
    await writeAudit(transaction, {
      eventType: config.eventType,
      taskId: task.id,
      actorUserId,
      previousStatus: task.status,
      nextStatus: config.nextStatus,
      reason: parsed.data.reason,
    })
    if (isTerminal) {
      await transaction.knowledgeAuditEvent.create({ data: {
        eventType: 'CONTROL_EXCEPTION_DEACTIVATED',
        entityType: 'KnowledgeReviewTask',
        entityId: task.id,
        actorUserId,
        actorType: 'PLATFORM_ADMIN',
        result: 'SUCCESS',
        reason: parsed.data.reason || 'De concrete uitzondering is afgehandeld.',
        metadata: { exceptionType: task.controlExceptionType, claimId: task.claimId },
      } })
    }
    return updated
  }, { isolationLevel: 'Serializable' })
}

export async function withdrawKnowledgeReviewApproval(actorUserId: string, input: {
  reviewTaskId: string
  expectedVersion: number
  reason: string
}) {
  const parsed = z.object({ reviewTaskId: z.string().uuid(), expectedVersion: z.number().int().positive(), reason: z.string().trim().min(5).max(1500) }).safeParse(input)
  if (!parsed.success) throw new KnowledgeReviewError('INVALID_INPUT', 'Geef een geldige reden voor het intrekken.')
  return getPrisma().$transaction(async (transaction) => {
    await assertPlatformAdministrator(transaction, actorUserId)
    const task = await lockReviewTask(transaction, parsed.data.reviewTaskId, parsed.data.expectedVersion, true)
    if (task.status !== 'CONTENT_APPROVED') throw new KnowledgeReviewError('INVALID_STATE', 'Alleen een afgeronde broncontrole kan worden ingetrokken.')
    const previousValidation = await transaction.knowledgeValidation.findFirst({
      where: { reviewTaskId: task.id, validationMethod: 'CROSS_SOURCE_CHECK', status: 'PARTIALLY_VALIDATED', withdrawnByValidations: { none: {} } },
      orderBy: { validatedAt: 'desc' },
    })
    if (!previousValidation) throw new KnowledgeReviewError('INVALID_STATE', 'De bijbehorende broncontrole ontbreekt.')
    const now = new Date()
    await transaction.knowledgeValidation.create({ data: {
      claimId: task.claimId,
      reviewTaskId: task.id,
      withdrawsValidationId: previousValidation.id,
      validationMethod: 'CROSS_SOURCE_CHECK',
      status: 'REVIEW_REQUIRED',
      validatorType: 'HUMAN',
      validatorUserId: actorUserId,
      rationale: parsed.data.reason,
      validatedAt: now,
    } })
    await transaction.knowledgeClaim.update({ where: { id: task.claimId }, data: {
      validationStatus: 'REVIEW_REQUIRED', publicationStatus: 'INTERNAL_REVIEW',
      sourceControlStatus: 'HUMAN_EXCEPTION_REQUIRED',
    } })
    const nextStatus: KnowledgeReviewTaskStatus = 'IN_PROGRESS'
    const updated = await transaction.knowledgeReviewTask.update({ where: { id: task.id, version: task.version }, data: {
      status: nextStatus, completedAt: null, completedById: null, lastEditedById: actorUserId,
      requiresHumanAction: true, controlExceptionType: 'PUBLICATION_BLOCKED',
      controlExceptionReason: parsed.data.reason, activatedAt: now, deactivatedAt: null,
      version: { increment: 1 },
    } })
    await transaction.knowledgeReviewDecision.create({ data: {
      reviewTaskId: task.id, sequence: await nextDecisionSequence(transaction, task.id), decisionType: 'VALIDATION_WITHDRAWN',
      previousStatus: task.status, nextStatus, actorUserId, reason: parsed.data.reason,
      proposedStatement: task.proposedStatement, substantiveNotes: task.substantiveNotes,
      practicalNuance: task.practicalNuance, applicabilityConditions: task.applicabilityConditions,
      exceptions: task.exceptions, editorialNote: task.editorialNote,
      proposedAccessTier: task.proposedAccessTier, nextReviewAt: task.nextReviewAt,
    } })
    await writeAudit(transaction, { eventType: 'VALIDATION_WITHDRAWN', taskId: task.id, actorUserId, previousStatus: task.status, nextStatus, reason: parsed.data.reason })
    await writeAudit(transaction, { eventType: 'REVIEW_REOPENED', taskId: task.id, actorUserId, previousStatus: task.status, nextStatus, reason: parsed.data.reason })
    await transaction.knowledgeAuditEvent.create({ data: {
      eventType: 'CONTROL_EXCEPTION_ACTIVATED', entityType: 'KnowledgeReviewTask', entityId: task.id,
      actorUserId, actorType: 'PLATFORM_ADMIN', result: 'SUCCESS', reason: parsed.data.reason,
      metadata: { exceptionType: 'PUBLICATION_BLOCKED', claimId: task.claimId },
    } })
    return updated
  }, { isolationLevel: 'Serializable' })
}

export async function addKnowledgeSupportingSource(actorUserId: string, rawInput: unknown) {
  const parsed = knowledgeSupportingSourceSchema.safeParse(rawInput)
  if (!parsed.success) throw new KnowledgeReviewError('INVALID_INPUT', 'Controleer de gegevens van de ondersteunende bron.')
  return getPrisma().$transaction(async (transaction) => {
    await assertPlatformAdministrator(transaction, actorUserId)
    const task = await lockReviewTask(transaction, parsed.data.reviewTaskId, parsed.data.expectedVersion)
    assertMutable(task.status)
    let source = parsed.data
    if (parsed.data.sourceVersionId) {
      const existing = await transaction.knowledgeSourceVersion.findUnique({
        where: { id: parsed.data.sourceVersionId },
        include: { source: true },
      })
      if (!existing) throw new KnowledgeReviewError('NOT_FOUND', 'De gekozen kennisbron is niet beschikbaar.')
      source = {
        ...parsed.data,
        sourceType: existing.source.sourceType,
        title: existing.source.title,
        publisher: existing.source.publisher,
        urlOrReference: existing.source.sourceUrl || existing.source.localReference,
        publicationDate: existing.publicationDate || existing.source.publicationDate,
        authorityLevel: existing.source.authorityLevel,
        isPrimary: existing.source.isPrimarySource,
        sourceFamily: existing.source.sourceFamily,
      }
    }
    const reference = await transaction.knowledgeReviewSourceReference.create({ data: {
      reviewTaskId: task.id,
      claimId: task.claimId,
      action: 'ADDED',
      sourceVersionId: source.sourceVersionId,
      sourceType: source.sourceType,
      title: source.title!,
      publisher: source.publisher,
      urlOrReference: source.urlOrReference,
      publicationDate: source.publicationDate,
      checkedAt: source.checkedAt,
      authorityLevel: source.authorityLevel,
      isPrimary: source.isPrimary,
      sourceFamily: source.sourceFamily!,
      supportType: source.supportType,
      actorUserId,
    } })
    await transaction.knowledgeReviewTask.update({ where: { id: task.id, version: task.version }, data: {
      version: { increment: 1 }, lastEditedById: actorUserId,
    } })
    await transaction.knowledgeClaim.update({ where: { id: task.claimId }, data: {
      sourceControlStatus: source.supportType === 'CONTRADICTS' ? 'CONFLICT_DETECTED' : 'SOURCES_COLLECTED',
      lastSourceCheckedAt: source.checkedAt ?? new Date(),
    } })
    await writeAudit(transaction, { eventType: 'SUPPORTING_SOURCE_ADDED', taskId: task.id, actorUserId, previousStatus: task.status, nextStatus: task.status })
    return reference
  }, { isolationLevel: 'Serializable' })
}

export async function withdrawKnowledgeSupportingSource(actorUserId: string, input: {
  reviewTaskId: string
  referenceId: string
  expectedVersion: number
}) {
  const parsed = z.object({ reviewTaskId: z.string().uuid(), referenceId: z.string().uuid(), expectedVersion: z.number().int().positive() }).safeParse(input)
  if (!parsed.success) throw new KnowledgeReviewError('INVALID_INPUT', 'De bronverwijzing is ongeldig.')
  return getPrisma().$transaction(async (transaction) => {
    await assertPlatformAdministrator(transaction, actorUserId)
    const task = await lockReviewTask(transaction, parsed.data.reviewTaskId, parsed.data.expectedVersion)
    assertMutable(task.status)
    const reference = await transaction.knowledgeReviewSourceReference.findFirst({
      where: { id: parsed.data.referenceId, reviewTaskId: task.id, claimId: task.claimId, action: 'ADDED', withdrawnByReferences: { none: {} } },
    })
    if (!reference) throw new KnowledgeReviewError('NOT_FOUND', 'De actieve bronverwijzing is niet beschikbaar.')
    await transaction.knowledgeReviewSourceReference.create({ data: {
      reviewTaskId: task.id, claimId: task.claimId, action: 'WITHDRAWN', withdrawsReferenceId: reference.id,
      sourceVersionId: reference.sourceVersionId, sourceType: reference.sourceType, title: reference.title,
      publisher: reference.publisher, urlOrReference: reference.urlOrReference,
      publicationDate: reference.publicationDate, checkedAt: reference.checkedAt,
      authorityLevel: reference.authorityLevel, isPrimary: reference.isPrimary,
      sourceFamily: reference.sourceFamily, supportType: reference.supportType, actorUserId,
    } })
    await transaction.knowledgeReviewTask.update({ where: { id: task.id, version: task.version }, data: {
      version: { increment: 1 }, lastEditedById: actorUserId,
    } })
    await writeAudit(transaction, { eventType: 'SUPPORTING_SOURCE_REMOVED', taskId: task.id, actorUserId, previousStatus: task.status, nextStatus: task.status })
  }, { isolationLevel: 'Serializable' })
}
