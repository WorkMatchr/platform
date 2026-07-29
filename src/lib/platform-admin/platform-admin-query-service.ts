import 'server-only'

import type { AssignmentStatus } from '@/generated/prisma/enums'
import { getPrisma } from '@/lib/prisma'
import { buildPlatformAdviceSignals, derivePlatformStatus } from './platform-admin-advice'
import {
  getPlatformActionCategory,
  getPlatformActionLabel,
  isOpenPlatformActionStatus,
  platformSignalAuditId,
  type PlatformActionStatus,
} from './platform-admin-action-center'
import { getPlatformAdministratorContext } from './platform-admin-authorization'

const MAX_ROWS = 100

function monthsAgo(months: number) {
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - months, 1))
}

function averageHours(items: Array<{ start: Date | null; end: Date | null }>): number | null {
  const durations = items.flatMap(({ start, end }) => start && end && end >= start ? [(end.getTime() - start.getTime()) / 3_600_000] : [])
  if (durations.length === 0) return null
  return Math.round((durations.reduce((total, value) => total + value, 0) / durations.length) * 10) / 10
}

function safeQuery(value: string | undefined) {
  return value?.trim().slice(0, 100) || undefined
}

export async function getPlatformAdminDashboard(actorUserId: string) {
  await getPlatformAdministratorContext(actorUserId)
  const prisma = getPrisma()
  const lastThirtyDays = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

  const [
    organizations,
    activeOrganizations,
    activeUsers,
    platformAccounts,
    newRegistrations,
    providers,
    qualifiedProviders,
    selectableProviders,
    providersAwaitingReview,
    providersAwaitingApproval,
    blockedProviders,
    openAssignments,
    closedAssignments,
    awardedAssignments,
    cancelledAssignments,
    expiredInvitations,
    responseSamples,
    leadTimeSamples,
    assignmentsWithoutResponses,
    assignmentsWithoutCandidates,
    failedOutbox,
  ] = await Promise.all([
    prisma.organization.count({ where: { systemKey: null } }),
    prisma.organization.count({ where: { systemKey: null, status: 'ACTIVE' } }),
    prisma.user.count({ where: { status: 'ACTIVE' } }),
    prisma.user.count({ where: { platformRole: 'ADMIN' } }),
    prisma.user.count({ where: { createdAt: { gte: lastThirtyDays } } }),
    prisma.providerProfile.count({ where: { archivedAt: null } }),
    prisma.providerProfile.count({ where: { archivedAt: null, platformQualificationStatus: 'QUALIFIED' } }),
    prisma.providerProfile.count({ where: { archivedAt: null, selectabilityStatus: 'SELECTABLE' } }),
    prisma.providerDossierSubmission.count({ where: { status: 'SUBMITTED' } }),
    prisma.providerDossierSubmission.count({ where: { status: 'UNDER_REVIEW' } }),
    prisma.providerProfile.count({ where: { archivedAt: null, OR: [{ selectabilityStatus: 'BLOCKED' }, { blocks: { some: { release: null } } }] } }),
    prisma.assignment.count({ where: { status: { in: ['OPEN', 'MATCHING', 'AWAITING_RESPONSES', 'IN_SELECTION'] } } }),
    prisma.assignment.count({ where: { status: 'CLOSED' } }),
    prisma.assignment.count({ where: { status: 'AWARDED' } }),
    prisma.assignment.count({ where: { status: 'CANCELLED' } }),
    prisma.providerInvitation.count({ where: { status: 'EXPIRED' } }),
    prisma.providerInvitation.findMany({
      where: { acceptedAt: { not: null } },
      orderBy: { acceptedAt: 'desc' },
      take: 500,
      select: { invitedAt: true, acceptedAt: true },
    }),
    prisma.awardDecision.findMany({
      orderBy: { decidedAt: 'desc' },
      take: 500,
      select: { decidedAt: true, assignment: { select: { publishedAt: true } } },
    }),
    prisma.assignment.count({
      where: {
        status: { in: ['AWAITING_RESPONSES', 'IN_SELECTION'] },
        marketplaceQuotes: { none: { status: { in: ['SUBMITTED', 'AWARDED'] } } },
      },
    }),
    prisma.marketplaceMatchRun.count({
      where: { status: 'COMPLETED', candidates: { none: { status: 'SELECTED' } } },
    }),
    prisma.notificationOutbox.count({ where: { status: 'FAILED' } }),
  ])

  return {
    platform: { organizations, activeOrganizations, activeUsers, platformAccounts, newRegistrations },
    providers: {
      total: providers,
      qualified: qualifiedProviders,
      selectable: selectableProviders,
      awaitingReview: providersAwaitingReview,
      awaitingApproval: providersAwaitingApproval,
      blocked: blockedProviders,
    },
    assignments: {
      open: openAssignments,
      closed: closedAssignments,
      awarded: awardedAssignments,
      withdrawn: cancelledAssignments,
      expired: expiredInvitations,
    },
    operations: {
      averageResponseHours: averageHours(responseSamples.map((item) => ({ start: item.invitedAt, end: item.acceptedAt }))),
      averageLeadTimeHours: averageHours(leadTimeSamples.map((item) => ({ start: item.assignment.publishedAt, end: item.decidedAt }))),
      assignmentsWithoutResponses,
      assignmentsWithoutCandidates,
      failedOutbox,
    },
  }
}

export async function getPlatformAdminCockpit(actorUserId: string, at = new Date()) {
  await getPlatformAdministratorContext(actorUserId)
  const prisma = getPrisma()
  const fourteenDaysAgo = new Date(at.getTime() - 14 * 86_400_000)
  const sevenDaysAgo = new Date(at.getTime() - 7 * 86_400_000)
  const thirtyDaysAgo = new Date(at.getTime() - 30 * 86_400_000)
  const sixtyDaysAgo = new Date(at.getTime() - 60 * 86_400_000)

  const [
    dashboard,
    organizationsWithoutActiveOwner,
    staleAssignmentsWithoutResponses,
    staleReviews,
    expiredInvitations,
    blockedAccounts,
    accountsWithoutValidContext,
    nonSelectableProviders,
    assignmentsWithoutCandidates,
    platformOrganization,
    approvalQueue,
    recentAdminActions,
    recentAdminActionCount,
    previousRegistrations,
    openAssignmentRows,
  ] = await Promise.all([
    getPlatformAdminDashboard(actorUserId),
    prisma.organization.findMany({
      where: {
        systemKey: null,
        status: 'ACTIVE',
        memberships: {
          none: { role: 'OWNER', status: 'ACTIVE', user: { status: 'ACTIVE' } },
        },
      },
      orderBy: { name: 'asc' },
      take: 25,
      select: { id: true, name: true },
    }),
    prisma.assignment.findMany({
      where: {
        archivedAt: null,
        status: { in: ['OPEN', 'MATCHING', 'AWAITING_RESPONSES', 'IN_SELECTION'] },
        OR: [
          { publishedAt: { lte: fourteenDaysAgo } },
          { publishedAt: null, createdAt: { lte: fourteenDaysAgo } },
        ],
        marketplaceQuotes: { none: { status: { in: ['SUBMITTED', 'AWARDED'] } } },
      },
      orderBy: [{ publishedAt: 'asc' }, { createdAt: 'asc' }],
      take: 25,
      select: {
        id: true,
        title: true,
        publishedAt: true,
        createdAt: true,
        _count: { select: { marketplaceQuotes: true } },
      },
    }),
    prisma.providerDossierSubmission.findMany({
      where: { status: 'SUBMITTED' },
      orderBy: { submittedAt: 'asc' },
      take: 25,
      select: {
        id: true,
        providerProfileId: true,
        submittedAt: true,
        providerProfile: { select: { organization: { select: { name: true } } } },
      },
    }),
    prisma.providerInvitation.findMany({
      where: { status: 'EXPIRED' },
      orderBy: { deadlineAt: 'asc' },
      take: 25,
      select: { id: true, assignmentId: true, deadlineAt: true, assignment: { select: { title: true } } },
    }),
    prisma.user.findMany({
      where: { status: 'BLOCKED' },
      orderBy: { blockedAt: 'desc' },
      take: 25,
      select: {
        id: true,
        email: true,
        displayName: true,
        memberships: {
          take: 1,
          select: { organization: { select: { name: true, systemKey: true } } },
        },
      },
    }),
    prisma.user.findMany({
      where: {
        status: 'ACTIVE',
        memberships: { none: {} },
        providerPermissionSubjects: { none: { revocation: null } },
      },
      orderBy: { createdAt: 'asc' },
      take: 25,
      select: { id: true, email: true, displayName: true },
    }),
    prisma.providerProfile.findMany({
      where: { archivedAt: null, selectabilityStatus: 'NOT_SELECTABLE' },
      orderBy: { updatedAt: 'asc' },
      take: 50,
      select: {
        id: true,
        organization: { select: { name: true } },
        selectabilityAssessments: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { reasonCodes: true },
        },
      },
    }),
    prisma.marketplaceMatchRun.findMany({
      where: { status: 'COMPLETED', candidates: { none: { status: 'SELECTED' } } },
      orderBy: { completedAt: 'desc' },
      take: 25,
      select: { id: true, assignmentId: true, assignment: { select: { title: true } } },
    }),
    prisma.organization.findUnique({
      where: { systemKey: 'WORKMATCHR_PLATFORM' },
      select: { status: true, organizationType: true, archivedAt: true },
    }),
    prisma.providerDossierSubmission.findMany({
      where: { status: 'UNDER_REVIEW' },
      orderBy: { updatedAt: 'asc' },
      take: 5,
      select: {
        id: true,
        providerProfileId: true,
        updatedAt: true,
        providerProfile: { select: { organization: { select: { name: true } } } },
      },
    }),
    prisma.adminActionLog.findMany({
      where: { createdAt: { gte: thirtyDaysAgo } },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, action: true, entityType: true, entityId: true, createdAt: true },
    }),
    prisma.adminActionLog.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
    prisma.user.count({ where: { createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo } } }),
    prisma.assignment.findMany({
      where: {
        archivedAt: null,
        status: { in: ['OPEN', 'MATCHING', 'AWAITING_RESPONSES', 'IN_SELECTION'] },
      },
      orderBy: { createdAt: 'desc' },
      take: 500,
      select: {
        id: true,
        createdAt: true,
        publishedAt: true,
        primarySpecialism: { select: { name: true } },
        location: { select: { province: true } },
      },
    }),
  ])

  const providersMissingVerification = nonSelectableProviders.flatMap((provider) => {
    const reasonCodes = provider.selectabilityAssessments[0]?.reasonCodes ?? []
    const concernsVerification = reasonCodes.some((code) => (
      code.includes('VERIF') || code.includes('EVIDENCE') || code.includes('QUALIFICATION')
    ))
    return concernsVerification
      ? [{ id: provider.id, organizationName: provider.organization.name, reasonCodes }]
      : []
  })

  const signals = buildPlatformAdviceSignals({
    at,
    platformConfigurationValid: Boolean(
      platformOrganization &&
      platformOrganization.status === 'ACTIVE' &&
      platformOrganization.organizationType === 'PLATFORM_OPERATOR' &&
      platformOrganization.archivedAt === null
    ),
    organizationsWithoutActiveOwner,
    accountsWithoutValidContext: accountsWithoutValidContext.map((user) => ({
      id: user.id,
      label: user.displayName?.trim() || user.email,
    })),
    staleAssignmentsWithoutResponses: staleAssignmentsWithoutResponses.map((assignment) => ({
      id: assignment.id,
      title: assignment.title,
      openedAt: assignment.publishedAt ?? assignment.createdAt,
      responseCount: assignment._count.marketplaceQuotes,
    })),
    staleReviews: staleReviews.filter((review) => review.submittedAt <= sevenDaysAgo).map((review) => ({
      id: review.id,
      providerProfileId: review.providerProfileId,
      providerName: review.providerProfile.organization.name,
      submittedAt: review.submittedAt,
    })),
    expiredInvitations: expiredInvitations.map((invitation) => ({
      id: invitation.id,
      assignmentId: invitation.assignmentId,
      assignmentTitle: invitation.assignment.title,
      deadlineAt: invitation.deadlineAt,
    })),
    blockedAccounts: blockedAccounts.flatMap((user) => {
      const membership = user.memberships[0]
      if (membership?.organization.systemKey) return []
      return [{
        id: user.id,
        label: user.displayName?.trim() || user.email,
        organizationName: membership?.organization.name ?? null,
      }]
    }),
    providersMissingVerification,
    assignmentsWithoutCandidates: assignmentsWithoutCandidates.map((run) => ({
      id: run.id,
      assignmentId: run.assignmentId,
      assignmentTitle: run.assignment.title,
    })),
    failedOutboxCount: dashboard.operations.failedOutbox,
  })

  const averageOpenAgeDays = openAssignmentRows.length === 0
    ? null
    : Math.round(openAssignmentRows.reduce((total, assignment) => (
        total + Math.max(0, (at.getTime() - (assignment.publishedAt ?? assignment.createdAt).getTime()) / 86_400_000)
      ), 0) / openAssignmentRows.length)
  const currentRegistrations = dashboard.platform.newRegistrations
  const registrationChange = previousRegistrations === 0
    ? null
    : Math.round(((currentRegistrations - previousRegistrations) / previousRegistrations) * 100)
  const specialismCounts = new Map<string, number>()
  const regionCounts = new Map<string, number>()
  for (const assignment of openAssignmentRows) {
    const specialism = assignment.primarySpecialism?.name ?? 'Niet gespecificeerd'
    specialismCounts.set(specialism, (specialismCounts.get(specialism) ?? 0) + 1)
    const region = assignment.location?.province ?? 'Niet vastgelegd'
    regionCounts.set(region, (regionCounts.get(region) ?? 0) + 1)
  }
  const byCount = ([leftLabel, leftCount]: [string, number], [rightLabel, rightCount]: [string, number]) => (
    rightCount - leftCount || leftLabel.localeCompare(rightLabel)
  )

  return {
    dashboard,
    signals,
    platformStatus: derivePlatformStatus(signals),
    queues: {
      reviews: staleReviews.slice(0, 5).map((review) => ({
        id: review.id,
        label: review.providerProfile.organization.name,
        at: review.submittedAt,
        href: `/platformbeheer/dienstverleners/${review.providerProfileId}`,
      })),
      approvals: approvalQueue.map((submission) => ({
        id: submission.id,
        label: submission.providerProfile.organization.name,
        at: submission.updatedAt,
        href: `/platformbeheer/dienstverleners/${submission.providerProfileId}`,
      })),
      audit: recentAdminActions.map((event) => ({
        id: event.id,
        label: `${event.action} · ${event.entityType}`,
        at: event.createdAt,
        href: '/platformbeheer/auditor',
      })),
      expiredInvitations: expiredInvitations.slice(0, 5).map((invitation) => ({
        id: invitation.id,
        label: invitation.assignment.title,
        at: invitation.deadlineAt,
        href: `/platformbeheer/opdrachten?q=${encodeURIComponent(invitation.assignment.title)}`,
      })),
    },
    queueCounts: {
      reviews: dashboard.providers.awaitingReview,
      approvals: dashboard.providers.awaitingApproval,
      audit: recentAdminActionCount,
      expiredInvitations: dashboard.assignments.expired,
    },
    trends: {
      hasSufficientData: currentRegistrations + previousRegistrations >= 2 || openAssignmentRows.length >= 2,
      registrationChange,
      currentRegistrations,
      previousRegistrations,
      averageOpenAgeDays,
      providerDemandRatio: openAssignmentRows.length === 0
        ? null
        : Math.round((dashboard.providers.selectable / openAssignmentRows.length) * 10) / 10,
      assignmentsByService: [...specialismCounts.entries()].sort(byCount).slice(0, 5).map(([label, count]) => ({ label, count })),
      assignmentsByRegion: [...regionCounts.entries()].sort(byCount).slice(0, 5).map(([label, count]) => ({ label, count })),
      searchTelemetryAvailable: false,
    },
    health: {
      governanceBlockers: signals.filter((signal) => signal.severity === 'CRITICAL').length,
      organizationsWithoutOwner: organizationsWithoutActiveOwner.length,
      accountsWithoutValidContext: accountsWithoutValidContext.length,
      failedOutbox: dashboard.operations.failedOutbox,
      platformConfigurationValid: signals.every((signal) => signal.ruleCode !== 'PLATFORM_CONFIGURATION_INVALID'),
    },
  }
}

function readActionMetadata(value: unknown): {
  status: PlatformActionStatus
  responsibleUserId: string | null
  responsibleName: string | null
} | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const metadata = value as Record<string, unknown>
  const status = metadata.status
  if (
    status !== 'NEW' &&
    status !== 'IN_PROGRESS' &&
    status !== 'WAITING_FOR_USER' &&
    status !== 'WAITING_FOR_ORGANIZATION' &&
    status !== 'COMPLETED' &&
    status !== 'CLOSED'
  ) return null
  return {
    status,
    responsibleUserId: typeof metadata.responsibleUserId === 'string' ? metadata.responsibleUserId : null,
    responsibleName: typeof metadata.responsibleName === 'string' ? metadata.responsibleName : null,
  }
}

export async function getPlatformAdminActionCandidates(actorUserId: string, at = new Date()) {
  const cockpit = await getPlatformAdminCockpit(actorUserId, at)
  const staleReviewIds = new Set(
    cockpit.signals
      .filter((signal) => signal.ruleCode === 'REVIEW_WAITING_LONGER_THAN_SEVEN_DAYS')
      .map((signal) => signal.id.replace('stale-review:', '')),
  )
  return [
    ...cockpit.signals,
    ...cockpit.queues.reviews.flatMap((review) => staleReviewIds.has(review.id) ? [] : [{
      id: `review:${review.id}`,
      severity: 'NORMAL' as const,
      title: `Review voor ${review.label}`,
      explanation: 'Dit ingediende dossier staat in de bestaande reviewwachtrij.',
      recommendedAction: 'Open het dossier en laat een bevoegde reviewer de beoordeling uitvoeren.',
      href: review.href,
      sources: [{ label: 'Dossierstatus', value: 'SUBMITTED' }],
      ruleCode: 'REVIEW_QUEUE_ITEM',
      detectedAt: review.at,
    }]),
    ...cockpit.queues.approvals.map((approval) => ({
      id: `approval:${approval.id}`,
      severity: 'NORMAL' as const,
      title: `Goedkeuring voor ${approval.label}`,
      explanation: 'Dit beoordeelde dossier staat in de bestaande goedkeuringswachtrij.',
      recommendedAction: 'Open het dossier en laat een bevoegde approver het besluit nemen.',
      href: approval.href,
      sources: [{ label: 'Dossierstatus', value: 'UNDER_REVIEW' }],
      ruleCode: 'APPROVAL_QUEUE_ITEM',
      detectedAt: approval.at,
    })),
  ]
}

export async function getPlatformActionCenter(actorUserId: string, at = new Date()) {
  const candidates = await getPlatformAdminActionCandidates(actorUserId, at)
  const signalAuditIds = candidates.map((signal) => platformSignalAuditId(signal.id))
  const histories = signalAuditIds.length === 0
    ? []
    : await getPrisma().adminActionLog.findMany({
        where: {
          entityType: 'PlatformAdviceSignal',
          entityId: { in: signalAuditIds },
          action: 'PLATFORM_ACTION_STATUS_CHANGED',
        },
        orderBy: { createdAt: 'desc' },
        select: { entityId: true, metadata: true, createdAt: true },
      })
  const latestByEntity = new Map<string, typeof histories[number]>()
  for (const history of histories) {
    if (!latestByEntity.has(history.entityId)) latestByEntity.set(history.entityId, history)
  }
  return candidates.flatMap((signal) => {
    const history = latestByEntity.get(platformSignalAuditId(signal.id))
    const state = readActionMetadata(history?.metadata)
    const status = state?.status ?? 'NEW'
    if (!isOpenPlatformActionStatus(status)) return []
    return [{
      ...signal,
      category: getPlatformActionCategory(signal.ruleCode),
      actionLabel: getPlatformActionLabel(signal.ruleCode),
      status,
      responsibleUserId: state?.responsibleUserId ?? null,
      responsibleName: state?.responsibleName ?? null,
      statusChangedAt: history?.createdAt ?? null,
    }]
  })
}

export type OrganizationListFilters = {
  query?: string
  status?: 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'ARCHIVED'
  type?: 'CLIENT' | 'PROVIDER' | 'BOTH' | 'PLATFORM_OPERATOR'
  sort?: 'name' | 'newest' | 'oldest'
}

export async function listPlatformOrganizations(actorUserId: string, filters: OrganizationListFilters = {}) {
  await getPlatformAdministratorContext(actorUserId)
  const query = safeQuery(filters.query)
  return getPrisma().organization.findMany({
    where: {
      systemKey: null,
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.type ? { organizationType: filters.type } : {}),
      ...(query ? { OR: [{ name: { contains: query, mode: 'insensitive' } }, { tradeName: { contains: query, mode: 'insensitive' } }] } : {}),
    },
    orderBy: filters.sort === 'oldest' ? { createdAt: 'asc' } : filters.sort === 'newest' ? { createdAt: 'desc' } : { name: 'asc' },
    take: MAX_ROWS,
    select: {
      id: true,
      name: true,
      organizationType: true,
      status: true,
      createdAt: true,
      _count: { select: { memberships: true, clientAssignments: true } },
      providerProfile: { select: { id: true, selectabilityStatus: true } },
      locations: { where: { archivedAt: null, isPrimary: true }, take: 1, select: { city: true, province: true } },
    },
  })
}

export async function getPlatformOrganizationDetail(actorUserId: string, organizationId: string) {
  await getPlatformAdministratorContext(actorUserId)
  return getPrisma().organization.findFirst({
    where: { id: organizationId, systemKey: null },
    select: {
      id: true,
      name: true,
      organizationType: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      memberships: {
        where: { status: { not: 'REMOVED' } },
        orderBy: { createdAt: 'asc' },
        select: { id: true, role: true, status: true, user: { select: { id: true, displayName: true, email: true, status: true } } },
      },
      clientAssignments: {
        orderBy: { updatedAt: 'desc' },
        take: 20,
        select: { id: true, title: true, status: true, updatedAt: true },
      },
      membershipEvents: {
        orderBy: { occurredAt: 'desc' },
        take: 30,
        select: { id: true, eventType: true, reasonCode: true, occurredAt: true, previousStatus: true, newStatus: true },
      },
      marketplaceAuditEvents: {
        orderBy: { createdAt: 'desc' },
        take: 30,
        select: { id: true, action: true, entityType: true, previousState: true, nextState: true, createdAt: true },
      },
    },
  })
}

export async function getPlatformAdminObjectActivity(
  actorUserId: string,
  entityType: 'User' | 'Organization' | 'ProviderProfile' | 'Assignment',
  entityId: string,
) {
  await getPlatformAdministratorContext(actorUserId)
  return getPrisma().adminActionLog.findMany({
    where: { entityType, entityId },
    orderBy: { createdAt: 'desc' },
    take: 50,
    select: {
      id: true,
      action: true,
      reason: true,
      metadata: true,
      createdAt: true,
      actorUser: { select: { displayName: true, email: true } },
    },
  })
}

export type UserListFilters = {
  query?: string
  status?: 'INVITED' | 'ACTIVE' | 'BLOCKED' | 'ARCHIVED' | 'DELETION_PENDING' | 'ANONYMIZED'
  role?: 'OWNER' | 'ADMIN' | 'MEMBER'
}

export async function listPlatformUsers(actorUserId: string, filters: UserListFilters = {}) {
  await getPlatformAdministratorContext(actorUserId)
  const query = safeQuery(filters.query)
  return getPrisma().user.findMany({
    where: {
      ...(filters.status ? { status: filters.status } : {}),
      ...(query ? { OR: [{ email: { contains: query, mode: 'insensitive' } }, { displayName: { contains: query, mode: 'insensitive' } }] } : {}),
      ...(filters.role ? { memberships: { some: { role: filters.role } } } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: MAX_ROWS,
    select: {
      id: true,
      displayName: true,
      email: true,
      status: true,
      platformRole: true,
      createdAt: true,
      memberships: {
        take: 1,
        select: { role: true, status: true, organization: { select: { id: true, name: true, systemKey: true } } },
      },
      sessions: { orderBy: { updatedAt: 'desc' }, take: 1, select: { updatedAt: true } },
    },
  })
}

export async function getPlatformUserDetail(actorUserId: string, userId: string) {
  await getPlatformAdministratorContext(actorUserId)
  return getPrisma().user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      displayName: true,
      email: true,
      emailVerified: true,
      status: true,
      platformRole: true,
      createdAt: true,
      updatedAt: true,
      blockedAt: true,
      lifecycleReasonCode: true,
      lifecycleReasonNote: true,
      memberships: {
        select: {
          id: true,
          role: true,
          status: true,
          organization: { select: { id: true, name: true, systemKey: true, status: true } },
        },
      },
      provisioningEventsAsSubject: {
        orderBy: { occurredAt: 'desc' },
        take: 50,
        select: { id: true, eventType: true, reasonCode: true, occurredAt: true, actorUserId: true, organizationId: true },
      },
      membershipEventsAsSubject: {
        orderBy: { occurredAt: 'desc' },
        take: 50,
        select: { id: true, eventType: true, reasonCode: true, occurredAt: true, previousRole: true, newRole: true, previousStatus: true, newStatus: true },
      },
      sessions: { orderBy: { updatedAt: 'desc' }, take: 10, select: { id: true, createdAt: true, updatedAt: true, expiresAt: true } },
    },
  })
}

export type ProviderListFilters = {
  query?: string
  status?: 'NOT_SELECTABLE' | 'SELECTABLE' | 'STALE' | 'BLOCKED'
  service?: string
  sector?: string
  region?: string
  qualification?: string
}

export async function listPlatformProviders(actorUserId: string, filters: ProviderListFilters = {}) {
  await getPlatformAdministratorContext(actorUserId)
  const query = safeQuery(filters.query)
  return getPrisma().providerProfile.findMany({
    where: {
      archivedAt: null,
      ...(filters.status ? { selectabilityStatus: filters.status } : {}),
      ...(query ? { organization: { name: { contains: query, mode: 'insensitive' } } } : {}),
      ...(filters.service ? { capabilities: { some: { status: 'ACTIVE', revisions: { some: { serviceTerm: { code: filters.service } } } } } } : {}),
      ...(filters.sector ? { sectorExperiences: { some: { status: 'ACTIVE', revisions: { some: { sectorTerm: { code: filters.sector } } } } } } : {}),
      ...(filters.region ? { workAreas: { some: { status: 'ACTIVE', revisions: { some: { regionTerm: { code: filters.region } } } } } } : {}),
      ...(filters.qualification ? { professionals: { some: { status: 'ACTIVE', qualifications: { some: { status: 'ACTIVE', revisions: { some: { qualificationTerm: { code: filters.qualification } } } } } } } } : {}),
    },
    orderBy: { updatedAt: 'desc' },
    take: MAX_ROWS,
    select: {
      id: true,
      lifecycleStatus: true,
      readinessStatus: true,
      platformQualificationStatus: true,
      selectabilityStatus: true,
      updatedAt: true,
      organization: { select: { id: true, name: true, status: true } },
      _count: { select: { capabilities: true, professionals: true, qualificationDecisions: true, dossierReviewCases: true } },
      trustedProjections: {
        where: { invalidation: null },
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { id: true, sourceVersion: true, validUntil: true, createdAt: true },
      },
    },
  })
}

export async function getPlatformProviderDetail(actorUserId: string, providerProfileId: string) {
  await getPlatformAdministratorContext(actorUserId)
  return getPrisma().providerProfile.findUnique({
    where: { id: providerProfileId },
    select: {
      id: true,
      version: true,
      lifecycleStatus: true,
      readinessStatus: true,
      platformQualificationStatus: true,
      selectabilityStatus: true,
      updatedAt: true,
      organization: { select: { id: true, name: true, status: true } },
      capabilities: {
        where: { status: 'ACTIVE' },
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          revisions: {
            orderBy: { version: 'desc' },
            take: 1,
            select: {
              version: true,
              deliveryModes: true,
              verificationLevel: true,
              serviceTerm: { select: { label: true, code: true } },
              specialismTerm: { select: { label: true, code: true } },
            },
          },
        },
      },
      professionals: {
        where: { status: 'ACTIVE' },
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          identityRevisions: { orderBy: { version: 'desc' }, take: 1, select: { displayName: true, functionalRole: true, version: true } },
          qualifications: {
            where: { status: 'ACTIVE' },
            select: {
              id: true,
              revisions: {
                orderBy: { version: 'desc' },
                take: 1,
                select: { version: true, isCertified: true, verificationLevel: true, qualificationTerm: { select: { label: true, code: true } } },
              },
            },
          },
        },
      },
      dossierSubmissions: {
        orderBy: { submittedAt: 'desc' },
        take: 20,
        select: { id: true, status: true, version: true, submittedAt: true, closedAt: true, currentCandidate: { select: { candidateVersion: true, sha256: true } } },
      },
      dossierReviewCases: {
        orderBy: { openedAt: 'desc' },
        take: 20,
        select: { id: true, status: true, version: true, openedAt: true, closedAt: true, _count: { select: { findings: true } } },
      },
      trustedProjections: {
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: { id: true, sourceVersion: true, schemaVersion: true, sha256: true, validFrom: true, validUntil: true, createdAt: true, invalidation: { select: { invalidatedAt: true, reasonCode: true } } },
      },
    },
  })
}

export type AssignmentListFilters = {
  query?: string
  status?: AssignmentStatus
  sector?: string
  specialism?: string
  age?: '7' | '14' | '30'
}

export async function listPlatformAssignments(actorUserId: string, filters: AssignmentListFilters = {}) {
  await getPlatformAdministratorContext(actorUserId)
  const query = safeQuery(filters.query)
  const ageDate = filters.age ? new Date(Date.now() - Number(filters.age) * 24 * 60 * 60 * 1000) : undefined
  return getPrisma().assignment.findMany({
    where: {
      archivedAt: null,
      ...(filters.status ? { status: filters.status } : {}),
      ...(query ? { OR: [{ title: { contains: query, mode: 'insensitive' } }, { clientOrganization: { name: { contains: query, mode: 'insensitive' } } }] } : {}),
      ...(filters.sector ? { sector: { slug: filters.sector } } : {}),
      ...(filters.specialism ? { primarySpecialism: { slug: filters.specialism } } : {}),
      ...(ageDate ? { createdAt: { lte: ageDate } } : {}),
    },
    orderBy: { updatedAt: 'desc' },
    take: MAX_ROWS,
    select: {
      id: true,
      title: true,
      status: true,
      createdAt: true,
      publishedAt: true,
      updatedAt: true,
      responseDeadline: true,
      allowsRemoteWork: true,
      clientOrganization: { select: { id: true, name: true } },
      sector: { select: { name: true, slug: true } },
      primarySpecialism: { select: { name: true, slug: true } },
      _count: { select: { providerSelections: true, marketplaceInvitations: true, marketplaceQuotes: true } },
      awardDecision: { select: { id: true, decidedAt: true } },
    },
  })
}

export async function getPlatformAssignmentDetail(actorUserId: string, assignmentId: string) {
  await getPlatformAdministratorContext(actorUserId)
  return getPrisma().assignment.findUnique({
    where: { id: assignmentId },
    select: {
      id: true,
      title: true,
      description: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      publishedAt: true,
      clientOrganization: {
        select: {
          id: true,
          name: true,
          generalEmail: true,
          memberships: {
            where: { role: 'OWNER', status: 'ACTIVE', user: { status: 'ACTIVE' } },
            take: 1,
            select: { user: { select: { email: true } } },
          },
        },
      },
      providerSelections: {
        where: { status: 'SELECTED', removedAt: null },
        orderBy: { selectedAt: 'asc' },
        select: {
          id: true,
          providerProfile: {
            select: {
              id: true,
              organization: { select: { name: true, generalEmail: true } },
            },
          },
        },
      },
      marketplaceInvitations: {
        orderBy: { invitedAt: 'asc' },
        select: {
          id: true,
          status: true,
          providerProfile: {
            select: {
              id: true,
              organization: { select: { name: true, generalEmail: true } },
            },
          },
        },
      },
      statusHistory: {
        orderBy: { createdAt: 'desc' },
        take: 30,
        select: { id: true, fromStatus: true, toStatus: true, reason: true, createdAt: true },
      },
    },
  })
}

export async function getPlatformMarketplaceOverview(actorUserId: string) {
  await getPlatformAdministratorContext(actorUserId)
  const prisma = getPrisma()
  const [credits, invitations, quotes, awards, reservations, failedOutbox, recentTransactions] = await Promise.all([
    prisma.creditAccount.aggregate({ _sum: { availableBalance: true, reservedBalance: true, spentBalance: true }, _count: true }),
    prisma.providerInvitation.groupBy({ by: ['status'], _count: true }),
    prisma.quote.groupBy({ by: ['status'], _count: true }),
    prisma.awardDecision.count(),
    prisma.creditReservation.groupBy({ by: ['status'], _count: true }),
    prisma.notificationOutbox.count({ where: { status: 'FAILED' } }),
    prisma.creditTransaction.findMany({
      orderBy: { createdAt: 'desc' },
      take: 30,
      select: { id: true, type: true, amount: true, reason: true, createdAt: true, creditAccount: { select: { organization: { select: { name: true } } } } },
    }),
  ])
  return { credits, invitations, quotes, awards, reservations, failedOutbox, recentTransactions }
}

export async function getPlatformRoleWorkload(actorUserId: string) {
  const context = await getPlatformAdministratorContext(actorUserId)
  const prisma = getPrisma()
  const now = new Date()
  const [submitted, underReview, changesRequested, approved, rejected, openCases, roleGrants, dossiers] = await Promise.all([
    prisma.providerDossierSubmission.count({ where: { status: 'SUBMITTED' } }),
    prisma.providerDossierSubmission.count({ where: { status: 'UNDER_REVIEW' } }),
    prisma.providerDossierSubmission.count({ where: { status: 'ADDITIONAL_INFORMATION_REQUIRED' } }),
    prisma.providerDossierSubmission.count({ where: { status: 'APPROVED' } }),
    prisma.providerDossierSubmission.count({ where: { status: 'REJECTED' } }),
    prisma.providerDossierReviewCase.count({ where: { status: 'OPEN' } }),
    prisma.providerPlatformPermissionGrant.findMany({
      where: {
        validFrom: { lte: now },
        OR: [{ validUntil: null }, { validUntil: { gt: now } }],
        revocation: null,
        user: { status: 'ACTIVE' },
      },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        permission: true,
        user: { select: { id: true, displayName: true, email: true } },
      },
    }),
    prisma.providerDossierSubmission.findMany({
      where: { status: { in: ['SUBMITTED', 'UNDER_REVIEW'] } },
      orderBy: { submittedAt: 'asc' },
      take: 20,
      select: {
        id: true,
        status: true,
        providerProfile: { select: { id: true, organization: { select: { name: true } } } },
      },
    }),
  ])
  const seen = new Set<string>()
  const roleContacts = roleGrants.flatMap((grant) => {
    const key = `${grant.permission}:${grant.user.id}`
    if (seen.has(key)) return []
    seen.add(key)
    return [{ permission: grant.permission, ...grant.user }]
  })
  return { permissions: context.permissions, submitted, underReview, changesRequested, approved, rejected, openCases, roleContacts, dossiers }
}

export async function getPlatformAuditOverview(actorUserId: string, query?: string) {
  await getPlatformAdministratorContext(actorUserId)
  const search = safeQuery(query)
  const prisma = getPrisma()
  const [accountEvents, membershipEvents, marketplaceEvents, adminActions] = await Promise.all([
    prisma.accountProvisioningEvent.findMany({
      where: search ? { reasonCode: { contains: search, mode: 'insensitive' } } : undefined,
      orderBy: { occurredAt: 'desc' },
      take: 50,
      select: { id: true, eventType: true, reasonCode: true, occurredAt: true, subjectUserId: true, actorUserId: true, organizationId: true },
    }),
    prisma.organizationMembershipEvent.findMany({
      where: search ? { reasonCode: { contains: search, mode: 'insensitive' } } : undefined,
      orderBy: { occurredAt: 'desc' },
      take: 50,
      select: { id: true, eventType: true, reasonCode: true, occurredAt: true, userId: true, actorUserId: true, organizationId: true },
    }),
    prisma.marketplaceAuditEvent.findMany({
      where: search ? { OR: [{ action: { contains: search, mode: 'insensitive' } }, { entityType: { contains: search, mode: 'insensitive' } }] } : undefined,
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: { id: true, action: true, entityType: true, entityId: true, previousState: true, nextState: true, actorUserId: true, organizationId: true, createdAt: true },
    }),
    prisma.adminActionLog.findMany({
      where: search ? { OR: [{ action: { contains: search, mode: 'insensitive' } }, { entityType: { contains: search, mode: 'insensitive' } }] } : undefined,
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: { id: true, action: true, entityType: true, entityId: true, actorUserId: true, reason: true, createdAt: true },
    }),
  ])
  return { accountEvents, membershipEvents, marketplaceEvents, adminActions }
}

export async function getPlatformTrends(actorUserId: string) {
  await getPlatformAdministratorContext(actorUserId)
  const from = monthsAgo(5)
  const prisma = getPrisma()
  const [organizations, assignments, sectorCounts, regionCounts] = await Promise.all([
    prisma.organization.findMany({ where: { systemKey: null, createdAt: { gte: from } }, select: { createdAt: true } }),
    prisma.assignment.findMany({ where: { createdAt: { gte: from } }, select: { createdAt: true, status: true } }),
    prisma.assignment.groupBy({ by: ['sectorId'], where: { sectorId: { not: null } }, _count: true, orderBy: { _count: { sectorId: 'desc' } }, take: 10 }),
    prisma.organizationLocation.groupBy({ by: ['province'], where: { archivedAt: null }, _count: true, orderBy: { _count: { province: 'desc' } }, take: 12 }),
  ])
  const sectorIds = sectorCounts.flatMap((item) => item.sectorId ? [item.sectorId] : [])
  const sectors = await prisma.sector.findMany({ where: { id: { in: sectorIds } }, select: { id: true, name: true } })
  const sectorNames = new Map(sectors.map((sector) => [sector.id, sector.name]))
  const months = Array.from({ length: 6 }, (_, index) => {
    const start = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth() + index, 1))
    const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1))
    return {
      label: start.toLocaleDateString('nl-NL', { month: 'short', year: 'numeric', timeZone: 'UTC' }),
      registrations: organizations.filter((item) => item.createdAt >= start && item.createdAt < end).length,
      assignments: assignments.filter((item) => item.createdAt >= start && item.createdAt < end).length,
    }
  })
  return {
    searchTelemetryAvailable: false,
    months,
    sectors: sectorCounts.map((item) => ({ label: item.sectorId ? sectorNames.get(item.sectorId) ?? 'Onbekende sector' : 'Onbekend', count: item._count })),
    regions: regionCounts.map((item) => ({ label: item.province, count: item._count })),
  }
}

export async function getPlatformSettingsOverview(actorUserId: string) {
  const context = await getPlatformAdministratorContext(actorUserId)
  const prisma = getPrisma()
  const [platformOrganization, taxonomies, questionnaireVersions, outbox] = await Promise.all([
    prisma.organization.findUnique({ where: { systemKey: 'WORKMATCHR_PLATFORM' }, select: { id: true, name: true, status: true, organizationType: true, updatedAt: true } }),
    prisma.providerTaxonomyVersion.groupBy({ by: ['status'], _count: true }),
    prisma.intakeQuestionnaireVersion.groupBy({ by: ['status'], _count: true }),
    prisma.notificationOutbox.groupBy({ by: ['status'], _count: true }),
  ])
  return { context, platformOrganization, taxonomies, questionnaireVersions, outbox }
}

export async function getPlatformReportData(actorUserId: string) {
  const [dashboard, marketplace, trends] = await Promise.all([
    getPlatformAdminDashboard(actorUserId),
    getPlatformMarketplaceOverview(actorUserId),
    getPlatformTrends(actorUserId),
  ])
  return { dashboard, marketplace, trends, generatedAt: new Date() }
}
