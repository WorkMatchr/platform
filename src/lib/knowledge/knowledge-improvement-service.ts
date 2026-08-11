import 'server-only'

import { z } from 'zod'
import type { Prisma } from '@/generated/prisma/client'
import type {
  KnowledgeImprovementReportStatus,
  KnowledgeReviewPriority,
  KnowledgeReviewTaskStatus,
} from '@/generated/prisma/enums'
import { getPrisma } from '@/lib/prisma'
import { knowledgeImprovementClaimWhere } from './knowledge-improvement-policy'
import { KnowledgeReviewError } from './knowledge-review-service'

type Transaction = Prisma.TransactionClient

const optionalText = (maximum: number) =>
  z.string().trim().max(maximum).optional().transform((value) => value || null)

export const knowledgeImprovementReportSchema = z.object({
  knowledgeItemId: z.string().uuid(),
  reportType: z.enum(['OUTDATED', 'INCORRECT', 'INCOMPLETE', 'SOURCE_CHANGED', 'APPLICABILITY_UNCLEAR', 'OTHER']),
  explanation: z.string().trim().min(20, 'Geef een toelichting van minimaal twintig tekens.').max(1500),
  proposedImprovement: optionalText(1500),
  sourceReference: optionalText(1000),
})

export const knowledgeImprovementHandlingSchema = z.object({
  reportId: z.string().uuid(),
  expectedVersion: z.coerce.number().int().positive(),
  status: z.enum(['UNDER_INVESTIGATION', 'PROCESSED', 'REJECTED', 'DUPLICATE']),
  resolution: optionalText(1500),
}).superRefine((value, context) => {
  if (value.status !== 'UNDER_INVESTIGATION' && (!value.resolution || value.resolution.length < 5)) {
    context.addIssue({ code: 'custom', path: ['resolution'], message: 'Geef een toelichting van minimaal vijf tekens.' })
  }
})

async function assertProfessional(transaction: Transaction, actorUserId: string) {
  const actor = await transaction.user.findFirst({
    where: {
      id: actorUserId,
      status: 'ACTIVE',
      memberships: { some: {
        status: 'ACTIVE',
        organization: {
          status: 'ACTIVE',
          organizationType: { in: ['PROVIDER', 'BOTH'] },
          providerProfile: { is: { archivedAt: null } },
        },
      } },
    },
    select: { id: true },
  })
  if (!actor) throw new KnowledgeReviewError('NOT_AUTHORIZED', 'U kunt voor dit kennisitem geen verbetering melden.')
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
  if (!actor) throw new KnowledgeReviewError('NOT_AUTHORIZED', 'Deze inhoudelijke melding is niet beschikbaar.')
}

async function nextDecisionSequence(transaction: Transaction, reviewTaskId: string) {
  const latest = await transaction.knowledgeReviewDecision.findFirst({
    where: { reviewTaskId },
    select: { sequence: true },
    orderBy: { sequence: 'desc' },
  })
  return (latest?.sequence ?? 0) + 1
}

function taskPriority(risk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'): KnowledgeReviewPriority {
  return risk === 'LOW' ? 'LOW' : risk === 'MEDIUM' ? 'NORMAL' : risk
}

const activeTaskStatuses: KnowledgeReviewTaskStatus[] = ['OPEN', 'IN_PROGRESS', 'DEFERRED', 'CHANGES_REQUIRED']

export async function reportKnowledgeImprovement(actorUserId: string, rawInput: unknown) {
  const parsed = knowledgeImprovementReportSchema.safeParse(rawInput)
  if (!parsed.success) throw new KnowledgeReviewError('INVALID_INPUT', parsed.error.issues[0]?.message ?? 'Controleer uw melding.')

  return getPrisma().$transaction(async (transaction) => {
    await assertProfessional(transaction, actorUserId)
    await transaction.$queryRaw`SELECT "id" FROM "KnowledgeClaim" WHERE "id" = ${parsed.data.knowledgeItemId}::uuid FOR UPDATE`
    const claim = await transaction.knowledgeClaim.findFirst({
      where: knowledgeImprovementClaimWhere(parsed.data.knowledgeItemId),
      select: { id: true, controlRisk: true },
    })
    if (!claim) throw new KnowledgeReviewError('NOT_FOUND', 'Dit kennisitem is niet beschikbaar voor een inhoudelijke melding.')

    let activatedException = false
    let task = await transaction.knowledgeReviewTask.findFirst({
      where: { claimId: claim.id, requiresHumanAction: true, status: { in: activeTaskStatuses } },
      orderBy: { createdAt: 'desc' },
    })
    if (!task) {
      const latestTask = await transaction.knowledgeReviewTask.findFirst({ where: { claimId: claim.id }, orderBy: { createdAt: 'desc' } })
      if (latestTask) {
        activatedException = true
        const previousStatus = latestTask.status
        task = await transaction.knowledgeReviewTask.update({
          where: { id: latestTask.id, version: latestTask.version },
          data: {
            status: 'CHANGES_REQUIRED', completedAt: null, completedById: null, deferredUntil: null,
            requiresHumanAction: true, controlExceptionType: 'PROFESSIONAL_REPORT',
            controlExceptionReason: 'Een professional heeft een inhoudelijke verbetering gemeld.',
            activatedAt: new Date(), deactivatedAt: null, version: { increment: 1 },
          },
        })
        await transaction.knowledgeReviewDecision.create({ data: {
          reviewTaskId: task.id,
          sequence: await nextDecisionSequence(transaction, task.id),
          decisionType: 'REOPENED',
          previousStatus,
          nextStatus: 'CHANGES_REQUIRED',
          actorUserId,
          reason: 'Een professional heeft een inhoudelijke verbetering gemeld.',
        } })
      } else {
        activatedException = true
        task = await transaction.knowledgeReviewTask.create({ data: {
          entityType: 'KnowledgeClaim',
          entityId: claim.id,
          claimId: claim.id,
          reviewReason: 'Een professional heeft een inhoudelijke verbetering gemeld.',
          priority: taskPriority(claim.controlRisk),
          status: 'CHANGES_REQUIRED',
          requiresHumanAction: true,
          controlExceptionType: 'PROFESSIONAL_REPORT',
          controlExceptionReason: 'Een professional heeft een inhoudelijke verbetering gemeld.',
          activatedAt: new Date(),
        } })
      }
    } else if (task.status !== 'CHANGES_REQUIRED') {
      const previousStatus = task.status
      task = await transaction.knowledgeReviewTask.update({
        where: { id: task.id, version: task.version },
        data: {
          status: 'CHANGES_REQUIRED', deferredUntil: null,
          requiresHumanAction: true, controlExceptionType: 'PROFESSIONAL_REPORT',
          controlExceptionReason: 'Een professional heeft een inhoudelijke verbetering gemeld.',
          activatedAt: task.activatedAt ?? new Date(), deactivatedAt: null,
          version: { increment: 1 },
        },
      })
      await transaction.knowledgeReviewDecision.create({ data: {
        reviewTaskId: task.id,
        sequence: await nextDecisionSequence(transaction, task.id),
        decisionType: 'REOPENED',
        previousStatus,
        nextStatus: 'CHANGES_REQUIRED',
        actorUserId,
        reason: 'Een professional heeft een inhoudelijke verbetering gemeld.',
      } })
    }

    if (activatedException) {
      await transaction.knowledgeAuditEvent.create({ data: {
        eventType: 'CONTROL_EXCEPTION_ACTIVATED', entityType: 'KnowledgeReviewTask', entityId: task.id,
        actorUserId, actorType: 'PROFESSIONAL', result: 'SUCCESS',
        reason: 'Een professional heeft een inhoudelijke verbetering gemeld.',
        metadata: { exceptionType: 'PROFESSIONAL_REPORT', claimId: claim.id },
      } })
    }

    const report = await transaction.knowledgeImprovementReport.create({ data: {
      claimId: claim.id,
      reviewTaskId: task.id,
      reportType: parsed.data.reportType,
      explanation: parsed.data.explanation,
      proposedImprovement: parsed.data.proposedImprovement,
      sourceReference: parsed.data.sourceReference,
      reporterUserId: actorUserId,
    } })
    await transaction.knowledgeAuditEvent.create({ data: {
      eventType: 'IMPROVEMENT_REPORTED',
      entityType: 'KnowledgeImprovementReport',
      entityId: report.id,
      actorUserId,
      actorType: 'PROFESSIONAL',
      result: 'SUCCESS',
      metadata: {
        claimId: claim.id,
        reviewTaskId: task.id,
        reportType: report.reportType,
        developmentTestMode: process.env.NODE_ENV === 'development',
      },
    } })
    return report
  }, { isolationLevel: 'Serializable' })
}

export async function handleKnowledgeImprovementReport(actorUserId: string, rawInput: unknown) {
  const parsed = knowledgeImprovementHandlingSchema.safeParse(rawInput)
  if (!parsed.success) throw new KnowledgeReviewError('INVALID_INPUT', parsed.error.issues[0]?.message ?? 'Controleer de afhandeling.')

  return getPrisma().$transaction(async (transaction) => {
    await assertPlatformAdministrator(transaction, actorUserId)
    await transaction.$queryRaw`SELECT "id" FROM "KnowledgeImprovementReport" WHERE "id" = ${parsed.data.reportId}::uuid FOR UPDATE`
    const report = await transaction.knowledgeImprovementReport.findUnique({ where: { id: parsed.data.reportId } })
    if (!report) throw new KnowledgeReviewError('NOT_FOUND', 'De inhoudelijke melding is niet beschikbaar.')
    if (report.version !== parsed.data.expectedVersion) throw new KnowledgeReviewError('CONFLICT', 'De melding is intussen gewijzigd. Vernieuw de pagina.')
    if (['PROCESSED', 'REJECTED', 'DUPLICATE'].includes(report.status)) {
      throw new KnowledgeReviewError('INVALID_STATE', 'Deze inhoudelijke melding is al afgehandeld.')
    }

    const terminal = parsed.data.status !== 'UNDER_INVESTIGATION'
    const updated = await transaction.knowledgeImprovementReport.update({
      where: { id: report.id, version: report.version },
      data: {
        status: parsed.data.status,
        version: { increment: 1 },
        handledByUserId: terminal ? actorUserId : null,
        handledAt: terminal ? new Date() : null,
        resolution: terminal ? parsed.data.resolution : null,
      },
    })
    await transaction.knowledgeAuditEvent.create({ data: {
      eventType: 'IMPROVEMENT_STATUS_CHANGED',
      entityType: 'KnowledgeImprovementReport',
      entityId: report.id,
      actorUserId,
      actorType: 'PLATFORM_ADMIN',
      result: 'SUCCESS',
      metadata: { previousStatus: report.status, nextStatus: parsed.data.status, reviewTaskId: report.reviewTaskId },
    } })
    if (terminal) {
      const remainingReports = await transaction.knowledgeImprovementReport.count({
        where: { reviewTaskId: report.reviewTaskId, id: { not: report.id }, status: { in: ['NEW', 'UNDER_INVESTIGATION'] } },
      })
      const reviewTask = await transaction.knowledgeReviewTask.findUnique({ where: { id: report.reviewTaskId } })
      if (remainingReports === 0 && reviewTask?.requiresHumanAction && reviewTask.controlExceptionType === 'PROFESSIONAL_REPORT') {
        const now = new Date()
        await transaction.knowledgeReviewTask.update({
          where: { id: reviewTask.id, version: reviewTask.version },
          data: { requiresHumanAction: false, deactivatedAt: now, version: { increment: 1 } },
        })
        await transaction.knowledgeAuditEvent.create({ data: {
          eventType: 'CONTROL_EXCEPTION_DEACTIVATED', entityType: 'KnowledgeReviewTask', entityId: reviewTask.id,
          actorUserId, actorType: 'PLATFORM_ADMIN', result: 'SUCCESS',
          reason: 'Alle open inhoudelijke meldingen voor deze uitzondering zijn afgehandeld.',
          metadata: { exceptionType: 'PROFESSIONAL_REPORT', claimId: reviewTask.claimId },
        } })
      }
    }
    return updated
  }, { isolationLevel: 'Serializable' })
}

export async function getKnowledgeItemForImprovementReport(actorUserId: string, knowledgeItemId: string) {
  const parsedId = z.string().uuid().safeParse(knowledgeItemId)
  if (!parsedId.success) return null
  const database = getPrisma()
  const actor = await database.user.findFirst({
    where: {
      id: actorUserId,
      status: 'ACTIVE',
      memberships: { some: {
        status: 'ACTIVE',
        organization: { status: 'ACTIVE', organizationType: { in: ['PROVIDER', 'BOTH'] }, providerProfile: { is: { archivedAt: null } } },
      } },
    },
    select: { id: true },
  })
  if (!actor) return null
  return database.knowledgeClaim.findFirst({
    where: knowledgeImprovementClaimWhere(parsedId.data),
    select: {
      id: true,
      statement: true,
      publicationStatus: true,
      validationStatus: true,
      topic: { select: { title: true } },
    },
  })
}

export async function getKnowledgeImprovementReports(status?: KnowledgeImprovementReportStatus) {
  return getPrisma().knowledgeImprovementReport.findMany({
    where: status ? { status } : undefined,
    include: {
      claim: { select: { externalKey: true, statement: true, controlRisk: true, topic: { select: { title: true } } } },
      reviewTask: { select: { id: true, status: true } },
      reporterUser: { select: { displayName: true, email: true } },
      handledByUser: { select: { displayName: true, email: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 200,
  })
}
