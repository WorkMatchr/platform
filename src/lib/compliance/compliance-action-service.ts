import 'server-only'

import { z } from 'zod'
import { getPrisma } from '@/lib/prisma'
import { arboGuideReportSnapshotSchema, type ArboGuideViewer } from '@/lib/arbo-guides/arbo-guide-run-service'

const actionStatuses = ['OPEN', 'IN_PROGRESS', 'WAITING_EXTERNAL', 'DONE', 'NOT_APPLICABLE'] as const
const actionUpdateSchema = z.object({
  actionId: z.string().uuid(),
  status: z.enum(actionStatuses).optional(),
  assignedUserId: z.string().uuid().nullable().optional(),
  dueAt: z.date().nullable().optional(),
}).refine((value) => value.status !== undefined || value.assignedUserId !== undefined || value.dueAt !== undefined, {
  message: 'Minimaal één wijziging is vereist.',
})

export class ComplianceActionError extends Error {
  constructor(public readonly code: 'ACCESS_DENIED' | 'NOT_FOUND' | 'INVALID_INPUT') {
    super(code)
  }
}

async function assertViewer(viewer: ArboGuideViewer) {
  const membership = await getPrisma().organizationMembership.findUnique({
    where: { userId: viewer.userId },
    select: {
      organizationId: true,
      status: true,
      user: { select: { status: true } },
      organization: { select: { status: true, organizationType: true } },
    },
  })
  if (
    !membership ||
    membership.organizationId !== viewer.organizationId ||
    membership.status !== 'ACTIVE' ||
    membership.user.status !== 'ACTIVE' ||
    membership.organization.status !== 'ACTIVE' ||
    membership.organization.organizationType === 'PLATFORM_OPERATOR'
  ) throw new ComplianceActionError('ACCESS_DENIED')
}

export async function ensureComplianceActionsForRun(viewer: ArboGuideViewer, runId: string) {
  await assertViewer(viewer)
  const prisma = getPrisma()
  const run = await prisma.arboGuideRun.findUnique({
    where: { id: runId },
    select: {
      id: true,
      organizationId: true,
      guideType: true,
      status: true,
      reportSnapshot: true,
    },
  })
  if (!run || run.organizationId !== viewer.organizationId || run.guideType !== 'COMPLIANCE' || run.status !== 'COMPLETED' || !run.reportSnapshot) {
    throw new ComplianceActionError('NOT_FOUND')
  }

  const report = arboGuideReportSnapshotSchema.parse(run.reportSnapshot)
  if (report.tier !== 'EXTENDED') return []

  await prisma.$transaction(async (tx) => {
    for (const result of report.results) {
      if (result.status !== 'ACTION' && result.status !== 'CHECK') continue
      const findingCode = result.extended.findingCode
      if (!findingCode) continue

      const existing = await tx.complianceAction.findUnique({
        where: { arboGuideRunId_findingCode: { arboGuideRunId: run.id, findingCode } },
        select: { id: true },
      })
      if (existing) continue

      const action = await tx.complianceAction.create({
        data: {
          arboGuideRunId: run.id,
          subjectCode: result.id,
          findingCode,
          title: result.title,
          description: result.nextStep,
          priority: result.extended.priority,
          serviceSuggestionCode: result.extended.serviceSuggestionCode ?? null,
        },
      })
      await tx.complianceActionEvent.create({
        data: {
          complianceActionId: action.id,
          eventType: 'CREATED',
          actorUserId: viewer.userId,
          newStatus: 'OPEN',
        },
      })
    }
  })

  return prisma.complianceAction.findMany({
    where: { arboGuideRunId: run.id },
    orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
    include: {
      assignedUser: { select: { id: true, displayName: true, email: true } },
    },
  })
}

export async function updateComplianceAction(viewer: ArboGuideViewer, raw: unknown) {
  await assertViewer(viewer)
  const parsed = actionUpdateSchema.safeParse(raw)
  if (!parsed.success) throw new ComplianceActionError('INVALID_INPUT')
  const input = parsed.data
  const prisma = getPrisma()

  return prisma.$transaction(async (tx) => {
    const current = await tx.complianceAction.findUnique({
      where: { id: input.actionId },
      include: { arboGuideRun: { select: { organizationId: true, guideType: true } } },
    })
    if (!current || current.arboGuideRun.organizationId !== viewer.organizationId || current.arboGuideRun.guideType !== 'COMPLIANCE') {
      throw new ComplianceActionError('NOT_FOUND')
    }

    if (input.assignedUserId) {
      const assignee = await tx.organizationMembership.findUnique({
        where: { userId: input.assignedUserId },
        select: { organizationId: true, status: true, user: { select: { status: true } } },
      })
      if (!assignee || assignee.organizationId !== viewer.organizationId || assignee.status !== 'ACTIVE' || assignee.user.status !== 'ACTIVE') {
        throw new ComplianceActionError('INVALID_INPUT')
      }
    }

    const data: { status?: typeof input.status; assignedUserId?: string | null; dueAt?: Date | null } = {}
    const events: Array<{
      complianceActionId: string
      eventType: 'STATUS_CHANGED' | 'ASSIGNEE_CHANGED' | 'DUE_DATE_CHANGED'
      actorUserId: string
      previousStatus?: typeof current.status
      newStatus?: typeof current.status
      previousAssigneeId?: string | null
      newAssigneeId?: string | null
      previousDueAt?: Date | null
      newDueAt?: Date | null
    }> = []

    if (input.status !== undefined && input.status !== current.status) {
      data.status = input.status
      events.push({
        complianceActionId: current.id,
        eventType: 'STATUS_CHANGED',
        actorUserId: viewer.userId,
        previousStatus: current.status,
        newStatus: input.status,
      })
    }
    if (input.assignedUserId !== undefined && input.assignedUserId !== current.assignedUserId) {
      data.assignedUserId = input.assignedUserId
      events.push({
        complianceActionId: current.id,
        eventType: 'ASSIGNEE_CHANGED',
        actorUserId: viewer.userId,
        previousAssigneeId: current.assignedUserId,
        newAssigneeId: input.assignedUserId,
      })
    }
    const currentDue = current.dueAt?.getTime() ?? null
    const nextDue = input.dueAt?.getTime() ?? null
    if (input.dueAt !== undefined && currentDue !== nextDue) {
      data.dueAt = input.dueAt
      events.push({
        complianceActionId: current.id,
        eventType: 'DUE_DATE_CHANGED',
        actorUserId: viewer.userId,
        previousDueAt: current.dueAt,
        newDueAt: input.dueAt,
      })
    }

    if (events.length === 0) return current

    const updated = await tx.complianceAction.update({ where: { id: current.id }, data })
    await tx.complianceActionEvent.createMany({ data: events })
    return updated
  })
}

export async function getComplianceDashboard(viewer: ArboGuideViewer) {
  await assertViewer(viewer)
  const prisma = getPrisma()
  const runs = await prisma.arboGuideRun.findMany({
    where: { organizationId: viewer.organizationId, guideType: 'COMPLIANCE', status: 'COMPLETED' },
    orderBy: { completedAt: 'desc' },
    select: {
      id: true,
      reportNumber: true,
      guideVersion: true,
      reportVersion: true,
      completedAt: true,
      reportSnapshot: true,
      complianceFrameworkVersion: { select: { frameworkCode: true, version: true, status: true } },
    },
  })

  const latest = runs[0]
  if (!latest?.reportSnapshot) {
    return { latestRun: null, previousRuns: [], actions: [], members: [] }
  }

  const actions = await ensureComplianceActionsForRun(viewer, latest.id)
  const members = await prisma.organizationMembership.findMany({
    where: { organizationId: viewer.organizationId, status: 'ACTIVE', user: { status: 'ACTIVE' } },
    orderBy: { user: { displayName: 'asc' } },
    select: { user: { select: { id: true, displayName: true, email: true } } },
  })

  return {
    latestRun: {
      ...latest,
      reportSnapshot: arboGuideReportSnapshotSchema.parse(latest.reportSnapshot),
    },
    previousRuns: runs.slice(1).map((run) => ({
      ...run,
      reportSnapshot: run.reportSnapshot ? arboGuideReportSnapshotSchema.parse(run.reportSnapshot) : null,
    })),
    actions,
    members: members.map((membership) => membership.user),
  }
}
