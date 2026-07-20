import { getPrisma } from '@/lib/prisma'
import { requireProviderMarketplaceAccess } from './marketplace-authorization'
import { consumeCreditReservationInTransaction } from './credit-service'
import { MarketplaceServiceError } from './marketplace-errors'
import { activeOrganizationRecipients, createMarketplaceNotification, writeMarketplaceAudit } from './marketplace-events'

type QuoteContent = {
  priceCents: number
  priceExplanation: string
  approach: string
  planning: string
  terms?: string
  validUntil?: Date
}

function validateQuoteContent(content: QuoteContent) {
  if (!Number.isSafeInteger(content.priceCents) || content.priceCents <= 0) throw new MarketplaceServiceError('VALIDATION_ERROR')
  if (content.priceExplanation.trim().length < 10 || content.approach.trim().length < 20 || content.planning.trim().length < 10) {
    throw new MarketplaceServiceError('VALIDATION_ERROR')
  }
}

export async function saveQuoteDraft(input: {
  actorUserId: string
  providerOrganizationId: string
  participationId: string
  expectedQuoteVersion: number
  content: QuoteContent
}) {
  validateQuoteContent(input.content)
  return getPrisma().$transaction(async (transaction) => {
    const access = await requireProviderMarketplaceAccess(transaction, input.actorUserId, input.providerOrganizationId, true)
    const participation = await transaction.providerParticipation.findFirst({
      where: {
        id: input.participationId,
        providerOrganizationId: input.providerOrganizationId,
        providerProfileId: access.providerProfile.id,
        status: 'ACTIVE',
      },
    })
    if (!participation) throw new MarketplaceServiceError('NOT_FOUND')
    const invitation = await transaction.providerInvitation.findUniqueOrThrow({ where: { id: participation.invitationId }, select: { deadlineAt: true } })
    const existingQuote = await transaction.quote.findUnique({ where: { participationId: participation.id } })
    if (invitation.deadlineAt <= new Date()) throw new MarketplaceServiceError('DEADLINE_PASSED')
    if (existingQuote && existingQuote.status !== 'DRAFT') throw new MarketplaceServiceError('INVALID_STATE')
    if ((existingQuote?.version ?? 0) !== input.expectedQuoteVersion) throw new MarketplaceServiceError('CONFLICT')

    const quote = existingQuote ?? await transaction.quote.create({
      data: {
        assignmentId: participation.assignmentId,
        participationId: participation.id,
        providerProfileId: participation.providerProfileId,
        providerOrganizationId: input.providerOrganizationId,
      },
    })
    const nextVersion = existingQuote ? existingQuote.version + 1 : 1
    const version = await transaction.quoteVersion.create({
      data: {
        quoteId: quote.id,
        version: nextVersion,
        priceCents: BigInt(input.content.priceCents),
        priceExplanation: input.content.priceExplanation.trim(),
        approach: input.content.approach.trim(),
        planning: input.content.planning.trim(),
        terms: input.content.terms?.trim() || null,
        validUntil: input.content.validUntil,
        submittedByUserId: input.actorUserId,
      },
    })
    const updated = await transaction.quote.updateMany({
      where: { id: quote.id, status: 'DRAFT', version: quote.version },
      data: { version: nextVersion, currentVersionId: version.id },
    })
    if (updated.count !== 1) throw new MarketplaceServiceError('CONFLICT')
    await writeMarketplaceAudit(transaction, {
      actorUserId: input.actorUserId,
      actorRole: access.role,
      organizationId: input.providerOrganizationId,
      action: 'QUOTE_DRAFT_SAVED',
      entityType: 'Quote',
      entityId: quote.id,
      previousState: 'DRAFT',
      nextState: 'DRAFT',
      metadata: { version: nextVersion },
    })
    return { ...quote, version: nextVersion, currentVersionId: version.id, currentVersion: version }
  }, { isolationLevel: 'Serializable' })
}

export async function submitQuote(input: {
  actorUserId: string
  providerOrganizationId: string
  quoteId: string
  expectedQuoteVersion: number
  idempotencyKey: string
  now?: Date
}) {
  const now = input.now ?? new Date()
  return getPrisma().$transaction(async (transaction) => {
    const access = await requireProviderMarketplaceAccess(transaction, input.actorUserId, input.providerOrganizationId, true)
    const quote = await transaction.quote.findFirst({
      where: { id: input.quoteId, providerOrganizationId: input.providerOrganizationId, providerProfileId: access.providerProfile.id },
    })
    if (!quote?.currentVersionId) throw new MarketplaceServiceError('NOT_FOUND')
    const currentVersion = await transaction.quoteVersion.findUniqueOrThrow({ where: { id: quote.currentVersionId } })
    const participation = await transaction.providerParticipation.findUniqueOrThrow({ where: { id: quote.participationId } })
    const reservation = await transaction.creditReservation.findUnique({ where: { participationId: participation.id } })
    const invitation = await transaction.providerInvitation.findUniqueOrThrow({ where: { id: participation.invitationId }, select: { deadlineAt: true } })
    const assignment = await transaction.assignment.findUniqueOrThrow({ where: { id: participation.assignmentId }, select: { clientOrganizationId: true, status: true } })
    if (!reservation) throw new MarketplaceServiceError('NOT_FOUND')
    if (quote.status === 'SUBMITTED' && quote.submittedVersionId === quote.currentVersionId) return quote
    if (quote.status !== 'DRAFT' || quote.version !== input.expectedQuoteVersion || participation.status !== 'ACTIVE') {
      throw new MarketplaceServiceError('CONFLICT')
    }
    if (invitation.deadlineAt <= now) throw new MarketplaceServiceError('DEADLINE_PASSED')
    if (!['AWAITING_RESPONSES', 'IN_SELECTION'].includes(assignment.status)) throw new MarketplaceServiceError('INVALID_STATE')
    await consumeCreditReservationInTransaction(transaction, {
      reservationId: reservation.id,
      actorUserId: input.actorUserId,
      idempotencyKey: `CONSUME:${input.idempotencyKey}`,
    })
    const updated = await transaction.quote.updateMany({
      where: { id: quote.id, status: 'DRAFT', version: input.expectedQuoteVersion, currentVersionId: currentVersion.id },
      data: { status: 'SUBMITTED', submittedAt: now, submittedVersionId: currentVersion.id, version: { increment: 1 } },
    })
    if (updated.count !== 1) throw new MarketplaceServiceError('CONFLICT')
    if (assignment.status === 'AWAITING_RESPONSES') {
      await transaction.assignment.update({ where: { id: participation.assignmentId }, data: { status: 'IN_SELECTION', version: { increment: 1 } } })
      await transaction.assignmentStatusHistory.create({
        data: {
          assignmentId: participation.assignmentId,
          fromStatus: 'AWAITING_RESPONSES',
          toStatus: 'IN_SELECTION',
          changedByUserId: input.actorUserId,
          reason: 'De eerste geldige offerte is ontvangen.',
        },
      })
    }
    await transaction.assignmentProviderSelection.updateMany({
      where: { assignmentId: quote.assignmentId, providerProfileId: quote.providerProfileId, status: { in: ['INVITED', 'VIEWED'] } },
      data: { status: 'RESPONDED', respondedAt: now },
    })
    const recipients = await activeOrganizationRecipients(transaction, assignment.clientOrganizationId)
    for (const recipientUserId of recipients) {
      await createMarketplaceNotification(transaction, {
        recipientUserId,
        eventId: `QUOTE_SUBMITTED:${quote.id}`,
        type: 'QUOTE_SUBMITTED',
        title: 'Nieuwe offerte ontvangen',
        body: 'Een deelnemende aanbieder heeft een offerte ingediend.',
        targetRoute: `/opdrachten/${quote.assignmentId}/offertes`,
      })
    }
    await writeMarketplaceAudit(transaction, {
      actorUserId: input.actorUserId,
      actorRole: access.role,
      organizationId: input.providerOrganizationId,
      action: 'QUOTE_SUBMITTED',
      entityType: 'Quote',
      entityId: quote.id,
      previousState: 'DRAFT',
      nextState: 'SUBMITTED',
      correlationKey: input.idempotencyKey,
      metadata: { quoteVersionId: currentVersion.id, quoteVersion: currentVersion.version },
    })
    const submittedQuote = await transaction.quote.findUniqueOrThrow({ where: { id: quote.id } })
    const submittedVersion = await transaction.quoteVersion.findUniqueOrThrow({ where: { id: currentVersion.id } })
    return { ...submittedQuote, submittedVersion }
  }, { isolationLevel: 'Serializable' })
}
