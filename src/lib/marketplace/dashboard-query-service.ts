import { requireProviderParticipationAccess } from './marketplace-authorization'
import { getMarketplaceNotifications } from './notification-service'
import { currentMarketplaceProjections } from '@/lib/providers/provider-marketplace-onboarding'
import { readInvitationPrice } from './assignment-pricing'
import { assignmentPreviewSchema } from './assignment-purchase-preview'
import { externalAssignmentWhere, externalAssignmentId, ownedAssignmentWhere } from '@/lib/assignments/assignment-identity'
import { getPrisma } from '@/lib/prisma'
import { hasValidPlatformActorFoundation } from '@/lib/account-architecture/platform-actor-policy'
import { deriveCreditBalance } from '@/lib/credits/credit-ledger-contract'
import { MarketplaceServiceError } from './marketplace-errors'
import { toAssignmentPreview } from './assignment-purchase-preview'

async function loadPlatformMetrics(actorPermissions: string[], canManageMarketplace: boolean) {
  const prisma = getPrisma()
  const [providerReviews, activeAssignments, failedOutbox, recentCorrections, providerOrganizations, openMatchRuns] = await Promise.all([
    prisma.providerDossierSubmission.count({ where: { status: { in: ['SUBMITTED', 'UNDER_REVIEW'] } } }),
    prisma.assignment.count({ where: { status: { in: ['MATCHING', 'AWAITING_RESPONSES', 'IN_SELECTION'] } } }),
    prisma.notificationOutbox.count({ where: { status: 'FAILED' } }),
    prisma.creditTransaction.findMany({ where: { type: { in: ['ADMIN_GRANT', 'ADMIN_CORRECTION'] } }, orderBy: { createdAt: 'desc' }, take: 10, select: { id: true, type: true, amount: true, reason: true, createdAt: true } }),
    prisma.organization.findMany({ where: { status: 'ACTIVE', organizationType: { in: ['PROVIDER', 'BOTH'] }, systemKey: null }, orderBy: { name: 'asc' }, take: 100, select: { id: true, name: true } }),
    prisma.marketplaceMatchRun.findMany({
      where: { status: 'COMPLETED', assignment: { status: { in: ['MATCHING', 'AWAITING_RESPONSES'] } }, invitations: { none: { status: 'ACCEPTED' } } },
      orderBy: { completedAt: 'desc' },
      take: 10,
      select: { id: true, confidenceLevel: true, assignment: { select: { title: true, maxSelections: true } }, candidates: { where: { status: { in: ['ELIGIBLE', 'SELECTED'] } }, orderBy: { rank: 'asc' }, select: { id: true, status: true, rank: true, providerProfile: { select: { organization: { select: { name: true } } } } } } },
    }),
  ])
  return { kind: 'PLATFORM' as const, actorPermissions, canManageMarketplace, providerReviews, activeAssignments, failedOutbox, recentCorrections, providerOrganizations, openMatchRuns }
}

export async function getMarketplacePlatformDashboard(userId: string) {
  const now = new Date()
  const user = await getPrisma().user.findFirst({
    where: { id: userId, status: 'ACTIVE' },
    select: {
      platformRole: true,
      providerPermissionSubjects: { where: { validFrom: { lte: now }, OR: [{ validUntil: null }, { validUntil: { gt: now } }], revocation: null }, select: { permission: true } },
      memberships: { where: { status: 'ACTIVE' }, select: { status: true, organization: { select: { status: true, organizationType: true, systemKey: true } } } },
    },
  })
  if (!user) throw new MarketplaceServiceError('ACCESS_DENIED')
  const platformMembership = user.memberships.find((membership) => membership.organization.systemKey === 'WORKMATCHR_PLATFORM') ?? null
  const permissions = user.providerPermissionSubjects
    .map((grant) => grant.permission)
    .filter((permission) => hasValidPlatformActorFoundation(permission, permission === 'PROVIDER_AUDITOR' ? null : platformMembership))
  const canManageMarketplace = user.platformRole === 'ADMIN' && platformMembership !== null
  if (!canManageMarketplace && permissions.length === 0) throw new MarketplaceServiceError('ACCESS_DENIED')
  return loadPlatformMetrics(permissions, canManageMarketplace)
}

export async function getMarketplaceDashboard(userId: string, organizationId: string) {
  const prisma = getPrisma()
  const membership = await prisma.organizationMembership.findFirst({
    where: { userId, organizationId, status: 'ACTIVE', user: { status: 'ACTIVE' }, organization: { status: 'ACTIVE' } },
    select: { role: true, user: { select: { accountType: true } }, organization: { select: { id: true, name: true, organizationType: true, systemKey: true, providerProfile: { select: { id: true, readinessStatus: true, platformQualificationStatus: true, selectabilityStatus: true, lifecycleStatus: true } } } } },
  })
  if (!membership) throw new MarketplaceServiceError('ACCESS_DENIED')

  if (membership.organization.systemKey === 'WORKMATCHR_PLATFORM') {
    return loadPlatformMetrics(['PLATFORM_ADMIN'], true)
  }

  if (
    membership.user.accountType === 'PROFESSIONAL' &&
    membership.organization.providerProfile &&
    ['PROVIDER', 'BOTH'].includes(membership.organization.organizationType)
  ) {
    const providerProfileId = membership.organization.providerProfile.id
    return prisma.$transaction(async tx => {
      const allowed = await currentMarketplaceProjections(tx, [{ providerProfileId, organizationId }], new Date())
      const projectionId = allowed.get(providerProfileId)
      const [invitations, quotes, creditAccount, notifications] = await Promise.all([
        allowed.has(providerProfileId) ? tx.providerInvitation.findMany({ where: { providerOrganizationId: organizationId, matchCandidate: { projectionId } }, orderBy: { invitedAt: 'desc' }, take: 20, select: { id: true, assignmentId: true, status: true, deadlineAt: true, creditCost: true, invitedAt: true } }) : [],
        allowed.has(providerProfileId) ? tx.quote.findMany({ where: { providerOrganizationId: organizationId, participation: { invitation: { matchCandidate: { projectionId } } } }, orderBy: { updatedAt: 'desc' }, take: 20, select: { id: true, assignmentId: true, status: true, version: true, submittedAt: true, updatedAt: true } }) : [],
        tx.creditTransaction.findMany({
          where: { creditAccount: { organizationId } },
          select: { totalDelta: true, reservedDelta: true },
        }),
        getMarketplaceNotifications(userId, 10, tx),
      ])
      return { kind: 'PROVIDER' as const, membership, providerProfileId, invitations, quotes, creditAccount: deriveCreditBalance(creditAccount), notifications }
    }, { isolationLevel: 'RepeatableRead' })
  }

  if (membership.user.accountType !== 'CLIENT' || membership.organization.organizationType !== 'CLIENT') {
    throw new MarketplaceServiceError('ACCESS_DENIED')
  }

  const ownAssignmentScope = membership.role === 'MEMBER'
    ? ownedAssignmentWhere(userId)
    : {}
  const adviceDossierScope = membership.role === 'MEMBER'
    ? { ownerUserId: userId }
    : {}
  const [
    assignments,
    notifications,
    conceptAssignments,
    publishedAssignments,
    assignmentsRequiringAction,
    submittedOffers,
    activeAdviceDossiers,
    unreadNotifications,
  ] = await Promise.all([
    prisma.assignment.findMany({
      where: {
        clientOrganizationId: organizationId,
        archivedAt: null,
        publishedAt: { not: null },
        ...ownAssignmentScope,
      },
      orderBy: { updatedAt: 'desc' },
      take: 20,
      select: {
        id: true,
        requestId: true,
        title: true,
        status: true,
        responseDeadline: true,
        updatedAt: true,
        _count: { select: { marketplaceInvitations: true, marketplaceQuotes: { where: { status: 'SUBMITTED' } } } },
        awardDecision: { select: { id: true, decidedAt: true } },
      },
    }),
    getMarketplaceNotifications(userId, 10, prisma),
    prisma.assignment.count({
      where: {
        clientOrganizationId: organizationId,
        publishedAt: null,
        status: { in: ['DRAFT', 'READY_FOR_REVIEW'] },
        ...ownAssignmentScope,
      },
    }),
    prisma.assignment.count({
      where: {
        clientOrganizationId: organizationId,
        publishedAt: { not: null },
        status: { not: 'ARCHIVED' },
        ...ownAssignmentScope,
      },
    }),
    prisma.assignment.count({
      where: {
        clientOrganizationId: organizationId,
        publishedAt: { not: null },
        awardDecision: null,
        marketplaceQuotes: { some: { status: 'SUBMITTED' } },
        ...ownAssignmentScope,
      },
    }),
    prisma.quote.count({
      where: {
        status: 'SUBMITTED',
        assignment: {
          clientOrganizationId: organizationId,
          ...ownAssignmentScope,
        },
      },
    }),
    prisma.adviceDossier.count({
      where: {
        organizationId,
        status: { not: 'ARCHIVED' },
        ...adviceDossierScope,
      },
    }),
    prisma.marketplaceNotification.count({
      where: { recipientUserId: userId, readAt: null },
    }),
  ])
  return {
    kind: 'CLIENT' as const,
    membership,
    assignments: assignments.map(a => ({ ...a, id: externalAssignmentId(a) })),
    notifications,
    summary: {
      actionRequired: assignmentsRequiringAction,
      concepts: conceptAssignments,
      published: publishedAssignments,
      submittedOffers,
      activeAdviceDossiers,
      unreadNotifications,
    },
  }
}

export type MarketplaceDashboardView = Awaited<ReturnType<typeof getMarketplaceDashboard>> | Awaited<ReturnType<typeof getMarketplacePlatformDashboard>>

export async function getProviderInvitationDetail(userId: string, organizationId: string, invitationId: string, now = new Date()) {
  return getPrisma().$transaction(async tx => {
    const membership = await requireProviderParticipationAccess(tx, userId, organizationId, false)
    const invitation = await tx.providerInvitation.findFirst({
      where: { id: invitationId, providerOrganizationId: organizationId, matchCandidate: { projectionId: membership.projectionId } },
      select: {
        id: true,
        status: true,
        creditCost: true,
        snapshot: true,
        deadlineAt: true,
        participation: { select: { id: true, status: true, version: true, creditReservation: { select: { id: true } }, quote: { select: { id: true, status: true, version: true } }, messageChannel: { select: { id: true } } } },
        assignment: { select: {
          id: true, requestId: true, status: true, title: true, description: true, employeeCount: true, desiredStartDate: true, responseDeadline: true,
          locationCity: true, locationProvince: true, locationRegion: true, locationCount: true, allowsRemoteWork: true, maxSelections: true,
          locationName: true, locationAddressLine: true, locationPostalCode: true, locationCountryCode: true, locationDescription: true,
          clientOrganization: { select: { name: true, generalEmail: true, phone: true } },
          specialisms: { select: { isRequired: true, specialism: { select: { name: true } } } },
          primarySpecialism: { select: { name: true } }, sector: { select: { name: true } },
        } },
      },
    })
    if (!invitation) throw new MarketplaceServiceError('NOT_FOUND')
    const [account, purchase] = await Promise.all([
      tx.creditAccount.findUnique({ where: { organizationId }, select: { availableBalance: true } }),
      invitation.participation ? tx.creditTransaction.findFirst({ where: { referenceType: 'ProviderParticipation', referenceId: invitation.participation.id, type: 'PARTICIPATION_PAYMENT' }, select: { id: true } }) : null,
    ])
    const price = readInvitationPrice(invitation)
    const stored = invitation.snapshot as Record<string, unknown>
    const preview = price.priceSnapshot ? assignmentPreviewSchema.parse(stored.preview) : toAssignmentPreview(invitation.assignment, price.credits)
    if (preview.priceCredits !== price.credits) throw new MarketplaceServiceError('INVALID_STATE')
    const hasFullAccess = Boolean(invitation.participation && (invitation.participation.creditReservation || purchase))
    return {
      membership,
      availableCredits: account?.availableBalance ?? 0,
      invitation: {
        id: invitation.id,
        status: invitation.status,
        deadlineAt: invitation.deadlineAt,
        canPurchase: invitation.status === 'INVITED' && invitation.deadlineAt > now && ['AWAITING_RESPONSES', 'MATCHING', 'IN_SELECTION'].includes(invitation.assignment.status),
        participation: invitation.participation,
        preview,
        fullAssignment: hasFullAccess ? { ...invitation.assignment, id: externalAssignmentId(invitation.assignment) } : null,
      },
    }
  }, { isolationLevel: 'RepeatableRead' })
}

export async function getClientQuotes(userId: string, organizationId: string, assignmentId: string) {
  const membership = await getPrisma().organizationMembership.findFirst({
    where: { userId, organizationId, status: 'ACTIVE', user: { status: 'ACTIVE', accountType: 'CLIENT' }, role: { in: ['OWNER', 'ADMIN'] }, organization: { status: 'ACTIVE', organizationType: 'CLIENT', systemKey: null } },
    select: { role: true },
  })
  if (!membership) throw new MarketplaceServiceError('ACCESS_DENIED')
  const assignment = await getPrisma().assignment.findFirst({
    where: { ...externalAssignmentWhere(assignmentId), clientOrganizationId: organizationId },
    select: {
      id: true,
      requestId: true,
      primarySpecialismId: true,
      title: true,
      status: true,
      version: true,
      maxSelections: true,
      responseDeadline: true,
      awardDecision: { select: { id: true, quoteId: true, motivation: true, decidedAt: true } },
      marketplaceQuotes: {
        where: { status: { in: ['SUBMITTED', 'AWARDED', 'REJECTED'] } },
        orderBy: { submittedAt: 'asc' },
        select: {
          id: true,
          status: true,
          providerProfileId: true,
          providerOrganization: { select: { name: true } },
          submittedVersion: { select: { id: true, version: true, priceCents: true, priceExplanation: true, approach: true, planning: true, terms: true, validUntil: true } },
          participation: { select: { messageChannel: { select: { id: true } } } },
        },
      },
    },
  })
  if (!assignment) throw new MarketplaceServiceError('NOT_FOUND')
  return { membership, assignment: { ...assignment, id: externalAssignmentId(assignment), matchingBlockReason: assignment.requestId && !assignment.primarySpecialismId ? 'PRIMARY_EXPERTISE_REQUIRED' : null } }
}

export async function getProviderParticipationForQuote(userId: string, organizationId: string, participationId: string) {
  return getPrisma().$transaction(async tx => {
    const membership = await requireProviderParticipationAccess(tx, userId, organizationId, true)
    const participation = await tx.providerParticipation.findFirst({
      where: { id: participationId, providerOrganizationId: organizationId, status: 'ACTIVE', invitation: { matchCandidate: { projectionId: membership.projectionId } } },
      select: { id: true, creditReservation: { select: { id: true } }, assignment: { select: { title: true, status: true } }, quote: { select: { id: true, version: true, status: true, currentVersion: { select: { priceCents: true, priceExplanation: true, approach: true, planning: true, terms: true, validUntil: true } } } }, invitation: { select: { deadlineAt: true } } },
    })
    if (!participation) throw new MarketplaceServiceError('NOT_FOUND')
    const purchase = participation.creditReservation ? null : await tx.creditTransaction.findFirst({
      where: { referenceType: 'ProviderParticipation', referenceId: participation.id, type: 'PARTICIPATION_PAYMENT' },
      select: { id: true },
    })
    if (!participation.creditReservation && !purchase) throw new MarketplaceServiceError('ACCESS_DENIED')
    const canEdit = ['AWAITING_RESPONSES', 'IN_SELECTION'].includes(participation.assignment.status)
      && participation.invitation.deadlineAt > new Date() && (!participation.quote || participation.quote.status === 'DRAFT')
    return { membership, participation, canEdit }
  }, { isolationLevel: 'RepeatableRead' })
}

export async function getProviderQuoteDetail(userId: string, organizationId: string, quoteId: string) {
  return getPrisma().$transaction(async tx => {
    const membership = await requireProviderParticipationAccess(tx, userId, organizationId, false)
    const quote = await tx.quote.findFirst({
      where: { id: quoteId, providerOrganizationId: organizationId, participation: { invitation: { matchCandidate: { projectionId: membership.projectionId } } } },
      select: {
        id: true,
        status: true,
        version: true,
        submittedAt: true,
        currentVersion: { select: { version: true, priceCents: true, priceExplanation: true, approach: true, planning: true, terms: true, validUntil: true } },
        participation: { select: { id: true, status: true, invitation: { select: { deadlineAt: true } }, messageChannel: { select: { id: true } }, assignment: { select: { title: true, status: true } } } },
      },
    })
    if (!quote) throw new MarketplaceServiceError('NOT_FOUND')
    return { membership, quote }
  }, { isolationLevel: 'RepeatableRead' })
}

export async function getAssignmentSelectionView(userId: string, organizationId: string, assignmentId: string) {
  const membership = await getPrisma().organizationMembership.findFirst({
    where: { userId, organizationId, status: 'ACTIVE', role: { in: ['OWNER', 'ADMIN'] }, user: { status: 'ACTIVE', accountType: 'CLIENT' }, organization: { status: 'ACTIVE', organizationType: 'CLIENT', systemKey: null } },
    select: { role: true },
  })
  if (!membership) throw new MarketplaceServiceError('ACCESS_DENIED')
  const assignment = await getPrisma().assignment.findFirst({
    where: { ...externalAssignmentWhere(assignmentId), clientOrganizationId: organizationId },
    select: {
      id: true,
      requestId: true,
      primarySpecialismId: true,
      title: true,
      status: true,
      version: true,
      maxSelections: true,
      responseDeadline: true,
      marketplaceMatchRuns: {
        where: { status: 'COMPLETED' },
        orderBy: { completedAt: 'desc' },
        take: 1,
        select: { id: true, confidenceLevel: true, confidenceReasons: true, completedAt: true, decisionReport: true, candidates: { where: { status: 'SELECTED' }, orderBy: { rank: 'asc' }, select: { id: true, rank: true, explanation: true } } },
      },
    },
  })
  if (!assignment) throw new MarketplaceServiceError('NOT_FOUND')
  return { membership, assignment: { ...assignment, id: externalAssignmentId(assignment), matchingBlockReason: assignment.requestId && !assignment.primarySpecialismId ? 'PRIMARY_EXPERTISE_REQUIRED' : null } }
}
