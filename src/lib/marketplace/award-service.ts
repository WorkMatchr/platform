import type { Prisma } from '@/generated/prisma/client'
import { getPrisma } from '@/lib/prisma'
import { hashProviderJson, type CanonicalValue } from '@/lib/providers/provider-canonical-json'
import { requireClientMarketplaceManager } from './marketplace-authorization'
import { MarketplaceServiceError } from './marketplace-errors'
import { activeOrganizationRecipients, createMarketplaceNotification, writeMarketplaceAudit } from './marketplace-events'

function canonical(value: unknown): CanonicalValue {
  return JSON.parse(JSON.stringify(value)) as CanonicalValue
}

export async function awardMarketplaceQuote(input: {
  actorUserId: string
  clientOrganizationId: string
  assignmentId: string
  quoteId: string
  motivation: string
  idempotencyKey: string
  now?: Date
}) {
  if (input.motivation.trim().length < 10) throw new MarketplaceServiceError('VALIDATION_ERROR')
  const now = input.now ?? new Date()
  return getPrisma().$transaction(async (transaction) => {
    const repeated = await transaction.awardDecision.findUnique({ where: { idempotencyKey: input.idempotencyKey } })
    if (repeated) return repeated
    const membership = await requireClientMarketplaceManager(transaction, input.actorUserId, input.clientOrganizationId)
    const assignment = await transaction.assignment.findFirst({
      where: {
        id: input.assignmentId,
        clientOrganizationId: input.clientOrganizationId,
        status: 'IN_SELECTION',
        awardDecision: null,
      },
      select: { id: true, version: true, title: true, status: true },
    })
    if (!assignment) throw new MarketplaceServiceError('INVALID_STATE')
    const quote = await transaction.quote.findFirst({
      where: { id: input.quoteId, assignmentId: assignment.id, status: 'SUBMITTED', submittedVersionId: { not: null } },
      include: { submittedVersion: true, providerProfile: { select: { id: true, organizationId: true } } },
    })
    if (!quote?.submittedVersion) throw new MarketplaceServiceError('INVALID_STATE')
    const snapshot = {
      assignmentId: assignment.id,
      assignmentVersion: assignment.version,
      quoteId: quote.id,
      quoteVersionId: quote.submittedVersion.id,
      quoteVersion: quote.submittedVersion.version,
      providerProfileId: quote.providerProfile.id,
      providerOrganizationId: quote.providerOrganizationId,
      priceCents: quote.submittedVersion.priceCents.toString(),
      decidedAt: now.toISOString(),
    }
    const decision = await transaction.awardDecision.create({
      data: {
        assignmentId: assignment.id,
        quoteId: quote.id,
        quoteVersionId: quote.submittedVersion.id,
        providerOrganizationId: quote.providerOrganizationId,
        clientOrganizationId: input.clientOrganizationId,
        decidedByUserId: input.actorUserId,
        motivation: input.motivation.trim(),
        snapshot: snapshot as Prisma.InputJsonValue,
        snapshotChecksum: hashProviderJson(canonical(snapshot)).sha256,
        idempotencyKey: input.idempotencyKey,
        decidedAt: now,
      },
    })
    await transaction.quote.update({ where: { id: quote.id }, data: { status: 'AWARDED', version: { increment: 1 } } })
    await transaction.quote.updateMany({
      where: { assignmentId: assignment.id, id: { not: quote.id }, status: 'SUBMITTED' },
      data: { status: 'REJECTED', version: { increment: 1 } },
    })
    await transaction.assignment.update({
      where: { id: assignment.id },
      data: { status: 'AWARDED', version: { increment: 1 }, closedAt: now },
    })
    await transaction.assignmentStatusHistory.create({
      data: {
        assignmentId: assignment.id,
        fromStatus: 'IN_SELECTION',
        toStatus: 'AWARDED',
        changedByUserId: input.actorUserId,
        reason: input.motivation.trim(),
        createdAt: now,
      },
    })
    await transaction.assignmentResolution.create({
      data: {
        assignmentId: assignment.id,
        type: 'PROVIDER_AWARDED',
        providerProfileId: quote.providerProfile.id,
        decidedByUserId: input.actorUserId,
        notes: input.motivation.trim(),
        decidedAt: now,
      },
    })
    await transaction.assignmentProviderSelection.updateMany({
      where: { assignmentId: assignment.id, providerProfileId: quote.providerProfile.id },
      data: { status: 'AWARDED' },
    })
    await transaction.assignmentProviderSelection.updateMany({
      where: { assignmentId: assignment.id, providerProfileId: { not: quote.providerProfile.id }, status: { in: ['SELECTED', 'INVITED', 'VIEWED', 'RESPONDED'] } },
      data: { status: 'REMOVED', removedAt: now, removalReason: 'Een andere offerte is gegund.' },
    })
    await transaction.marketplaceMessageChannel.updateMany({
      where: { assignmentId: assignment.id, providerProfileId: { not: quote.providerProfile.id }, status: 'OPEN' },
      data: { status: 'READ_ONLY', closedAt: now },
    })
    const providerQuotes = await transaction.quote.findMany({
      where: { assignmentId: assignment.id },
      select: { id: true, providerOrganizationId: true, status: true },
    })
    for (const providerQuote of providerQuotes) {
      const recipients = await activeOrganizationRecipients(transaction, providerQuote.providerOrganizationId)
      for (const recipientUserId of recipients) {
        const awarded = providerQuote.id === quote.id
        await createMarketplaceNotification(transaction, {
          recipientUserId,
          eventId: `AWARD:${decision.id}:${providerQuote.id}`,
          type: awarded ? 'QUOTE_AWARDED' : 'QUOTE_REJECTED',
          title: awarded ? 'Uw offerte is gegund' : 'Uw offerte is niet gekozen',
          body: awarded ? 'De opdrachtgever heeft uw offerte gekozen.' : 'De opdrachtgever heeft een andere offerte gekozen.',
          targetRoute: `/offertes/${providerQuote.id}`,
        })
      }
    }
    await writeMarketplaceAudit(transaction, {
      actorUserId: input.actorUserId,
      actorRole: membership.role,
      organizationId: input.clientOrganizationId,
      action: 'QUOTE_AWARDED',
      entityType: 'AwardDecision',
      entityId: decision.id,
      previousState: assignment.status,
      nextState: 'AWARDED',
      reason: input.motivation.trim(),
      correlationKey: input.idempotencyKey,
      metadata: { quoteId: quote.id, quoteVersionId: quote.submittedVersion.id },
    })
    return decision
  }, { isolationLevel: 'Serializable' })
}
