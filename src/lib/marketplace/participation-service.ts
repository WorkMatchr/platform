import { getPrisma } from '@/lib/prisma'
import { requireProviderMarketplaceAccess } from './marketplace-authorization'
import { reserveCreditsInTransaction, releaseCreditReservationInTransaction } from './credit-service'
import { MarketplaceServiceError } from './marketplace-errors'
import { activeOrganizationRecipients, createMarketplaceNotification, writeMarketplaceAudit } from './marketplace-events'

export async function acceptProviderInvitation(input: {
  actorUserId: string
  providerOrganizationId: string
  invitationId: string
  idempotencyKey: string
  now?: Date
}) {
  const now = input.now ?? new Date()
  return getPrisma().$transaction(async (transaction) => {
    const repeated = await transaction.providerParticipation.findUnique({ where: { idempotencyKey: input.idempotencyKey }, include: { creditReservation: true } })
    if (repeated) return repeated
    const access = await requireProviderMarketplaceAccess(transaction, input.actorUserId, input.providerOrganizationId, true)
    const invitation = await transaction.providerInvitation.findFirst({
      where: {
        id: input.invitationId,
        providerOrganizationId: input.providerOrganizationId,
        providerProfileId: access.providerProfile.id,
        status: 'INVITED',
      },
      include: { assignment: { select: { clientOrganizationId: true, status: true } } },
    })
    if (!invitation) throw new MarketplaceServiceError('NOT_FOUND')
    if (invitation.deadlineAt <= now) throw new MarketplaceServiceError('DEADLINE_PASSED')
    if (access.providerProfile.selectabilityStatus !== 'SELECTABLE' || access.providerProfile.lifecycleStatus !== 'QUALIFIED') {
      throw new MarketplaceServiceError('NOT_SELECTABLE')
    }
    if (!['AWAITING_RESPONSES', 'MATCHING'].includes(invitation.assignment.status)) throw new MarketplaceServiceError('INVALID_STATE')
    const participation = await transaction.providerParticipation.create({
      data: {
        assignmentId: invitation.assignmentId,
        invitationId: invitation.id,
        providerProfileId: invitation.providerProfileId,
        providerOrganizationId: input.providerOrganizationId,
        createdByUserId: input.actorUserId,
        idempotencyKey: input.idempotencyKey,
        acceptedAt: now,
      },
    })
    const reservation = await reserveCreditsInTransaction(transaction, {
      organizationId: input.providerOrganizationId,
      participationId: participation.id,
      amount: invitation.creditCost,
      idempotencyKey: `RESERVE:${participation.id}`,
      actorUserId: input.actorUserId,
    })
    await transaction.providerInvitation.update({
      where: { id: invitation.id },
      data: { status: 'ACCEPTED', acceptedAt: now, acceptedByUserId: input.actorUserId },
    })
    await transaction.assignmentProviderSelection.updateMany({
      where: { assignmentId: invitation.assignmentId, providerProfileId: invitation.providerProfileId, status: 'INVITED' },
      data: { status: 'VIEWED' },
    })
    await transaction.marketplaceMessageChannel.create({
      data: {
        assignmentId: invitation.assignmentId,
        participationId: participation.id,
        clientOrganizationId: invitation.assignment.clientOrganizationId,
        providerProfileId: invitation.providerProfileId,
      },
    })
    const clientRecipients = await activeOrganizationRecipients(transaction, invitation.assignment.clientOrganizationId)
    for (const recipientUserId of clientRecipients) {
      await createMarketplaceNotification(transaction, {
        recipientUserId,
        eventId: `PARTICIPATION:${participation.id}`,
        type: 'PROVIDER_ACCEPTED',
        title: 'Aanbieder neemt deel',
        body: 'Een uitgenodigde aanbieder heeft de uitnodiging geaccepteerd.',
        targetRoute: `/opdrachten/${invitation.assignmentId}/offertes`,
      })
    }
    await writeMarketplaceAudit(transaction, {
      actorUserId: input.actorUserId,
      actorRole: access.role,
      organizationId: input.providerOrganizationId,
      action: 'INVITATION_ACCEPTED',
      entityType: 'ProviderParticipation',
      entityId: participation.id,
      previousState: 'INVITED',
      nextState: 'ACTIVE',
      correlationKey: input.idempotencyKey,
      metadata: { invitationId: invitation.id, reservationId: reservation.id },
    })
    return { ...participation, creditReservation: reservation }
  }, { isolationLevel: 'Serializable' })
}

export async function declineProviderInvitation(input: {
  actorUserId: string
  providerOrganizationId: string
  invitationId: string
  reason: string
  idempotencyKey: string
  now?: Date
}) {
  if (input.reason.trim().length < 10) throw new MarketplaceServiceError('VALIDATION_ERROR')
  const now = input.now ?? new Date()
  return getPrisma().$transaction(async (transaction) => {
    const repeated = await transaction.marketplaceAuditEvent.findUnique({ where: { correlationKey: input.idempotencyKey } })
    if (repeated) return repeated
    const access = await requireProviderMarketplaceAccess(transaction, input.actorUserId, input.providerOrganizationId, true)
    const invitation = await transaction.providerInvitation.findFirst({
      where: { id: input.invitationId, providerOrganizationId: input.providerOrganizationId, providerProfileId: access.providerProfile.id, status: 'INVITED' },
      include: { assignment: { select: { clientOrganizationId: true } } },
    })
    if (!invitation) throw new MarketplaceServiceError('NOT_FOUND')
    if (invitation.deadlineAt <= now) throw new MarketplaceServiceError('DEADLINE_PASSED')
    const updated = await transaction.providerInvitation.updateMany({
      where: { id: invitation.id, status: 'INVITED' },
      data: { status: 'DECLINED', declinedAt: now },
    })
    if (updated.count !== 1) throw new MarketplaceServiceError('CONFLICT')
    await transaction.assignmentProviderSelection.updateMany({
      where: { assignmentId: invitation.assignmentId, providerProfileId: invitation.providerProfileId, status: 'INVITED' },
      data: { status: 'DECLINED' },
    })
    for (const recipientUserId of await activeOrganizationRecipients(transaction, invitation.assignment.clientOrganizationId)) {
      await createMarketplaceNotification(transaction, {
        recipientUserId,
        eventId: `INVITATION_DECLINED:${invitation.id}`,
        type: 'PROVIDER_DECLINED',
        title: 'Aanbieder neemt niet deel',
        body: 'Een uitgenodigde aanbieder heeft de uitnodiging afgewezen.',
        targetRoute: `/opdrachten/${invitation.assignmentId}/selectie`,
      })
    }
    return writeMarketplaceAudit(transaction, {
      actorUserId: input.actorUserId,
      actorRole: access.role,
      organizationId: input.providerOrganizationId,
      action: 'INVITATION_DECLINED',
      entityType: 'ProviderInvitation',
      entityId: invitation.id,
      previousState: 'INVITED',
      nextState: 'DECLINED',
      reason: input.reason.trim(),
      correlationKey: input.idempotencyKey,
    })
  }, { isolationLevel: 'Serializable' })
}

export async function withdrawProviderParticipation(input: {
  actorUserId: string
  providerOrganizationId: string
  participationId: string
  expectedVersion: number
  reason: string
  idempotencyKey: string
}) {
  if (input.reason.trim().length < 10) throw new MarketplaceServiceError('VALIDATION_ERROR')
  return getPrisma().$transaction(async (transaction) => {
    const access = await requireProviderMarketplaceAccess(transaction, input.actorUserId, input.providerOrganizationId, true)
    const participation = await transaction.providerParticipation.findFirst({
      where: {
        id: input.participationId,
        providerOrganizationId: input.providerOrganizationId,
        providerProfileId: access.providerProfile.id,
        status: 'ACTIVE',
        version: input.expectedVersion,
      },
      include: { quote: { select: { status: true } }, creditReservation: true, messageChannel: true },
    })
    if (!participation?.creditReservation || participation.quote?.status === 'SUBMITTED') throw new MarketplaceServiceError('INVALID_STATE')
    await releaseCreditReservationInTransaction(transaction, {
      reservationId: participation.creditReservation.id,
      actorUserId: input.actorUserId,
      reason: input.reason.trim(),
      idempotencyKey: `RELEASE:${input.idempotencyKey}`,
    })
    const updated = await transaction.providerParticipation.updateMany({
      where: { id: participation.id, status: 'ACTIVE', version: input.expectedVersion },
      data: { status: 'WITHDRAWN', version: { increment: 1 }, closedAt: new Date() },
    })
    if (updated.count !== 1) throw new MarketplaceServiceError('CONFLICT')
    if (participation.messageChannel) {
      await transaction.marketplaceMessageChannel.update({ where: { id: participation.messageChannel.id }, data: { status: 'READ_ONLY', closedAt: new Date() } })
    }
    await writeMarketplaceAudit(transaction, {
      actorUserId: input.actorUserId,
      actorRole: access.role,
      organizationId: input.providerOrganizationId,
      action: 'PARTICIPATION_WITHDRAWN',
      entityType: 'ProviderParticipation',
      entityId: participation.id,
      previousState: 'ACTIVE',
      nextState: 'WITHDRAWN',
      reason: input.reason.trim(),
      correlationKey: input.idempotencyKey,
    })
    return { id: participation.id, status: 'WITHDRAWN' as const, version: input.expectedVersion + 1 }
  }, { isolationLevel: 'Serializable' })
}
