import { z } from 'zod'
import type { Prisma } from '@/generated/prisma/client'
import { getPrisma } from '@/lib/prisma'
import { requireMarketplacePlatformAdmin } from './marketplace-authorization'
import {
  calculateWithdrawalRefund,
  getApplicableMarketplaceRuleSet,
} from './marketplace-rules-service'
import {
  activeOrganizationRecipients,
  createMarketplaceNotification,
  enqueueMarketplaceEmail,
  writeMarketplaceAudit,
} from './marketplace-events'
import { MarketplaceServiceError } from './marketplace-errors'
import {
  marketplaceContactDecisionSchema,
  withdrawPublishedRequestSchema,
  withdrawalReasonLabels,
} from './marketplace-reliability-contract'

export {
  marketplaceContactDecisionSchema,
  withdrawPublishedRequestSchema,
  withdrawalReasonLabels,
} from './marketplace-reliability-contract'

type Transaction = Prisma.TransactionClient

function windowStart(at: Date, months: number) {
  const result = new Date(at)
  result.setUTCMonth(result.getUTCMonth() - months)
  return result
}

async function relevantWithdrawalEvents(
  transaction: Transaction,
  organizationId: string,
  at: Date,
  months: number,
) {
  return transaction.marketplaceReliabilityEvent.findMany({
    where: {
      organizationId,
      type: 'WITHDRAWN_AFTER_PARTICIPATION',
      occurredAt: { gte: windowStart(at, months), lte: at },
      correction: null,
    },
    orderBy: { occurredAt: 'asc' },
    select: {
      id: true,
      requestId: true,
      occurredAt: true,
      withdrawalReason: true,
      participantCount: true,
      totalRefundedCredits: true,
    },
  })
}

export async function getPublicationRestrictionInTransaction(
  transaction: Transaction,
  input: {
    organizationId: string
    adviceDossierId: string
    at: Date
  },
) {
  const ruleSet = await getApplicableMarketplaceRuleSet(transaction, input.at)
  if (!ruleSet.reliabilitySignalsEnabled) {
    return {
      blocked: false,
      relevantWithdrawalCount: 0,
      threshold: ruleSet.withdrawalThreshold,
      windowMonths: ruleSet.withdrawalWindowMonths,
      approvedContactRequestId: null,
    } as const
  }
  const events = await relevantWithdrawalEvents(
    transaction,
    input.organizationId,
    input.at,
    ruleSet.withdrawalWindowMonths,
  )
  const approval = await transaction.marketplaceContactRequest.findFirst({
    where: {
      organizationId: input.organizationId,
      adviceDossierId: input.adviceDossierId,
      status: 'APPROVED',
      OR: [{ validUntil: null }, { validUntil: { gt: input.at } }],
    },
    orderBy: { reviewedAt: 'desc' },
    select: { id: true },
  })
  return {
    blocked: events.length >= ruleSet.withdrawalThreshold && !approval,
    relevantWithdrawalCount: events.length,
    threshold: ruleSet.withdrawalThreshold,
    windowMonths: ruleSet.withdrawalWindowMonths,
    approvedContactRequestId: approval?.id ?? null,
  } as const
}

export async function getPublicationRestriction(input: {
  organizationId: string
  adviceDossierId: string
  at?: Date
}) {
  const at = input.at ?? new Date()
  return getPrisma().$transaction((transaction) =>
    getPublicationRestrictionInTransaction(transaction, { ...input, at }),
  )
}

async function requireRequestOwner(
  transaction: Transaction,
  input: { userId: string; organizationId: string; requestId: string },
) {
  const request = await transaction.request.findFirst({
    where: {
      id: input.requestId,
      organizationId: input.organizationId,
      tenantId: input.organizationId,
      adviceDossier: { ownerUserId: input.userId },
      organization: { status: 'ACTIVE', systemKey: null },
    },
    include: {
      offerSlots: {
        where: { status: 'CLAIMED' },
        orderBy: { slotNumber: 'asc' },
        include: {
          marketplaceRuleSet: true,
          providerOrganization: { select: { id: true, name: true } },
        },
      },
    },
  })
  if (!request) throw new MarketplaceServiceError('NOT_FOUND')
  return request
}

export async function withdrawPublishedRequest(input: {
  userId: string
  organizationId: string
  values: unknown
  at?: Date
}) {
  const parsed = withdrawPublishedRequestSchema.safeParse(input.values)
  if (!parsed.success) throw new MarketplaceServiceError('VALIDATION_ERROR')
  const at = input.at ?? new Date()

  return getPrisma().$transaction(
    async (transaction) => {
      await transaction.$queryRaw`
        SELECT "id" FROM "Request"
        WHERE "id" = ${parsed.data.requestId}::uuid
        FOR UPDATE
      `
      const request = await requireRequestOwner(transaction, {
        userId: input.userId,
        organizationId: input.organizationId,
        requestId: parsed.data.requestId,
      })
      if (request.status === 'CANCELLED') {
        const event = await transaction.marketplaceReliabilityEvent.findFirst({
          where: {
            requestId: request.id,
            type: {
              in: [
                'WITHDRAWN_WITHOUT_PARTICIPANTS',
                'WITHDRAWN_AFTER_PARTICIPATION',
              ],
            },
          },
        })
        if (!event) throw new MarketplaceServiceError('INVALID_STATE')
        return { requestId: request.id, refundedCredits: event.totalRefundedCredits, idempotent: true }
      }
      if (request.status !== 'PUBLISHED') throw new MarketplaceServiceError('INVALID_STATE')

      let totalRefundedCredits = 0
      for (const slot of request.offerSlots) {
        if (!slot.creditAmount || !slot.marketplaceRuleSetId || !slot.marketplaceRuleSet) {
          continue
        }
        const refund = calculateWithdrawalRefund(
          slot.creditAmount,
          slot.marketplaceRuleSet.withdrawalRefundPercentage,
          slot.marketplaceRuleSet.roundRefundUp,
        )
        const account = await transaction.creditAccount.findUnique({
          where: { organizationId: slot.providerOrganizationId },
        })
        if (!account) {
          throw new MarketplaceServiceError('INVALID_STATE')
        }
        await transaction.$queryRaw`SELECT "id" FROM "CreditAccount" WHERE "id" = ${account.id}::uuid FOR UPDATE`
        const totals = await transaction.creditAccount.findUniqueOrThrow({
          where: { id: account.id },
        })
        if (totals.spentBalance < refund) {
          throw new MarketplaceServiceError('INVALID_STATE')
        }
        await transaction.creditTransaction.create({
          data: {
            creditAccountId: account.id,
            type: 'WITHDRAWAL_REFUND',
            amount: refund,
            totalDelta: refund,
            reservedDelta: 0,
            balanceBefore: totals.availableBalance,
            balanceAfter: totals.availableBalance + refund,
            availableBefore: totals.availableBalance,
            availableAfter: totals.availableBalance + refund,
            reservedBefore: totals.reservedBalance,
            reservedAfter: totals.reservedBalance,
            spentBefore: totals.spentBalance,
            spentAfter: totals.spentBalance - refund,
            requestId: request.id,
            offerSlotId: slot.id,
            marketplaceRuleSetId: slot.marketplaceRuleSetId,
            referenceType: 'RequestWithdrawal',
            referenceId: request.id,
            reason: 'Gedeeltelijke teruggave na intrekking door de opdrachtgever.',
            idempotencyKey: `request:${request.id}:withdrawal-refund:${slot.id}`,
            createdByUserId: input.userId,
          },
        })
        await transaction.requestOfferSlot.update({
          where: { id: slot.id },
          data: { status: 'RELEASED', releasedAt: at },
        })
        await transaction.requestOfferSlotEvent.create({
          data: {
            offerSlotId: slot.id,
            requestId: request.id,
            providerOrganizationId: slot.providerOrganizationId,
            actorUserId: input.userId,
            type: 'RELEASED',
            fromStatus: 'CLAIMED',
            toStatus: 'RELEASED',
            slotNumber: slot.slotNumber,
            idempotencyKey: `request:${request.id}:withdrawal-release:${slot.id}`,
            occurredAt: at,
          },
        })
        const recipients = await activeOrganizationRecipients(
          transaction,
          slot.providerOrganizationId,
        )
        for (const recipientUserId of recipients) {
          await createMarketplaceNotification(transaction, {
            recipientUserId,
            eventId: `REQUEST_WITHDRAWN:${request.id}`,
            type: 'REQUEST_WITHDRAWN',
            title: 'Opdracht ingetrokken',
            body: `De opdrachtgever heeft de opdracht ingetrokken. ${refund} credits zijn teruggezet.`,
            targetRoute: `/professional/opdrachten/${request.id}`,
          })
          await enqueueMarketplaceEmail(transaction, {
            eventId: `REQUEST_WITHDRAWN:${request.id}`,
            recipientUserId,
            templateKey: 'REQUEST_WITHDRAWN',
            payload: { requestId: request.id, refundedCredits: refund },
          })
        }
        totalRefundedCredits += refund
      }

      await transaction.request.update({
        where: { id: request.id },
        data: { status: 'CANCELLED', archivedAt: at },
      })
      await transaction.requestEvent.create({
        data: {
          requestId: request.id,
          actorUserId: input.userId,
          type: 'STATUS_CHANGED',
          fromStatus: 'PUBLISHED',
          toStatus: 'CANCELLED',
          idempotencyKey: `request:${request.id}:cancelled`,
          occurredAt: at,
        },
      })
      const activeRuleSet = await getApplicableMarketplaceRuleSet(transaction, at)
      const eventType = request.offerSlots.length
        ? 'WITHDRAWN_AFTER_PARTICIPATION'
        : 'WITHDRAWN_WITHOUT_PARTICIPANTS'
      const event = await transaction.marketplaceReliabilityEvent.create({
        data: {
          organizationId: input.organizationId,
          requestId: request.id,
          actorUserId: input.userId,
          type: eventType,
          withdrawalReason: parsed.data.reason,
          explanation: parsed.data.explanation || null,
          participantCount: request.offerSlots.length,
          totalRefundedCredits,
          publishedAt: request.publishedAt,
          occurredAt: at,
          marketplaceRuleSetId: activeRuleSet.id,
        },
      })
      await writeMarketplaceAudit(transaction, {
        actorUserId: input.userId,
        actorRole: 'CLIENT_REQUEST_OWNER',
        organizationId: input.organizationId,
        action: 'REQUEST_WITHDRAWN',
        entityType: 'Request',
        entityId: request.id,
        previousState: 'PUBLISHED',
        nextState: 'CANCELLED',
        reason: parsed.data.explanation || withdrawalReasonLabels[parsed.data.reason],
        correlationKey: `request:${request.id}:withdrawal-audit`,
        metadata: {
          reasonCode: parsed.data.reason,
          participantCount: request.offerSlots.length,
          totalRefundedCredits,
          reliabilityEventId: event.id,
        },
      })
      return { requestId: request.id, refundedCredits: totalRefundedCredits, idempotent: false }
    },
    { isolationLevel: 'Serializable' },
  )
}

export async function submitMarketplaceContactRequest(input: {
  userId: string
  organizationId: string
  adviceDossierId: string
  explanation: string
  at?: Date
}) {
  const explanation = z.string().trim().min(20).max(2000).parse(input.explanation)
  const at = input.at ?? new Date()
  return getPrisma().$transaction(
    async (transaction) => {
      const dossier = await transaction.adviceDossier.findFirst({
        where: {
          id: input.adviceDossierId,
          organizationId: input.organizationId,
          ownerUserId: input.userId,
          status: 'COMPLETED',
        },
        select: { id: true },
      })
      if (!dossier) throw new MarketplaceServiceError('NOT_FOUND')
      const ruleSet = await getApplicableMarketplaceRuleSet(transaction, at)
      const events = await relevantWithdrawalEvents(
        transaction,
        input.organizationId,
        at,
        ruleSet.withdrawalWindowMonths,
      )
      if (events.length < ruleSet.withdrawalThreshold) {
        throw new MarketplaceServiceError('INVALID_STATE')
      }
      const existing = await transaction.marketplaceContactRequest.findFirst({
        where: {
          adviceDossierId: dossier.id,
          status: { in: ['OPEN', 'ADDITIONAL_INFORMATION_REQUIRED'] },
        },
      })
      if (existing) return existing

      const contactRequest = await transaction.marketplaceContactRequest.create({
        data: {
          organizationId: input.organizationId,
          adviceDossierId: dossier.id,
          createdByUserId: input.userId,
          explanation,
          relevantWithdrawalCount: events.length,
          withdrawalSnapshot: events.map((event) => ({
            ...event,
            occurredAt: event.occurredAt.toISOString(),
          })),
          createdAt: at,
        },
      })
      const administrators = await transaction.user.findMany({
        where: {
          status: 'ACTIVE',
          platformRole: 'ADMIN',
          memberships: {
            some: {
              status: 'ACTIVE',
              role: { in: ['OWNER', 'ADMIN'] },
              organization: { systemKey: 'WORKMATCHR_PLATFORM', status: 'ACTIVE' },
            },
          },
        },
        select: { id: true },
      })
      for (const administrator of administrators) {
        await createMarketplaceNotification(transaction, {
          recipientUserId: administrator.id,
          eventId: `MARKETPLACE_CONTACT_REQUEST:${contactRequest.id}`,
          type: 'MARKETPLACE_CONTACT_REQUEST',
          title: 'Verzoek om een opdracht te publiceren',
          body: 'Een organisatie vraagt beoordeling van een nieuwe publicatie.',
          targetRoute: `/platformbeheer/marketplace/betrouwbaarheid/${input.organizationId}`,
        })
        await enqueueMarketplaceEmail(transaction, {
          eventId: `MARKETPLACE_CONTACT_REQUEST:${contactRequest.id}`,
          recipientUserId: administrator.id,
          templateKey: 'MARKETPLACE_CONTACT_REQUEST',
          payload: {
            contactRequestId: contactRequest.id,
            organizationId: input.organizationId,
            adviceDossierId: dossier.id,
          },
        })
      }
      await writeMarketplaceAudit(transaction, {
        actorUserId: input.userId,
        actorRole: 'CLIENT_REQUEST_OWNER',
        organizationId: input.organizationId,
        action: 'MARKETPLACE_CONTACT_REQUEST_CREATED',
        entityType: 'MarketplaceContactRequest',
        entityId: contactRequest.id,
        reason: explanation,
        correlationKey: `marketplace-contact:${contactRequest.id}:created`,
        metadata: { relevantWithdrawalCount: events.length },
      })
      return contactRequest
    },
    { isolationLevel: 'Serializable' },
  )
}

export async function decideMarketplaceContactRequest(input: {
  actorUserId: string
  contactRequestId: string
  decision: 'APPROVED' | 'REJECTED' | 'ADDITIONAL_INFORMATION_REQUIRED' | 'CLOSED'
  reason: string
  validUntil?: Date | null
}) {
  const decision = marketplaceContactDecisionSchema.parse(input)
  return getPrisma().$transaction(
    async (transaction) => {
      await requireMarketplacePlatformAdmin(transaction, input.actorUserId)
      const contactRequest = await transaction.marketplaceContactRequest.findUnique({
        where: { id: input.contactRequestId },
      })
      if (!contactRequest || !['OPEN', 'ADDITIONAL_INFORMATION_REQUIRED'].includes(contactRequest.status)) {
        throw new MarketplaceServiceError('INVALID_STATE')
      }
      const updated = await transaction.marketplaceContactRequest.update({
        where: { id: contactRequest.id },
        data: {
          status: decision.decision,
          reviewReason: decision.reason,
          reviewedByUserId: input.actorUserId,
          reviewedAt: new Date(),
          validUntil: decision.decision === 'APPROVED' ? decision.validUntil ?? null : null,
        },
      })
      await writeMarketplaceAudit(transaction, {
        actorUserId: input.actorUserId,
        actorRole: 'PLATFORM_RELIABILITY_MANAGER',
        organizationId: contactRequest.organizationId,
        action: `MARKETPLACE_CONTACT_REQUEST_${decision.decision}`,
        entityType: 'MarketplaceContactRequest',
        entityId: contactRequest.id,
        previousState: contactRequest.status,
        nextState: decision.decision,
        reason: decision.reason,
        correlationKey: `marketplace-contact:${contactRequest.id}:${decision.decision}:${updated.updatedAt.toISOString()}`,
      })
      return updated
    },
    { isolationLevel: 'Serializable' },
  )
}

export async function listMarketplaceReliability(actorUserId: string) {
  const { getPlatformAdministratorContext } = await import(
    '@/lib/platform-admin/platform-admin-authorization'
  )
  await getPlatformAdministratorContext(actorUserId)
  return getPrisma().organization.findMany({
    where: {
      systemKey: null,
      organizationType: { in: ['CLIENT', 'BOTH'] },
      OR: [
        { marketplaceReliabilityEvents: { some: {} } },
        { marketplaceContactRequests: { some: {} } },
      ],
    },
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      chamberOfCommerceNumber: true,
      _count: {
        select: {
          requestsAsOrganization: { where: { status: 'PUBLISHED' } },
          marketplaceReliabilityEvents: {
            where: { type: 'WITHDRAWN_AFTER_PARTICIPATION', correction: null },
          },
          marketplaceContactRequests: {
            where: { status: { in: ['OPEN', 'ADDITIONAL_INFORMATION_REQUIRED'] } },
          },
        },
      },
    },
  })
}

export async function getMarketplaceReliabilityDetail(
  actorUserId: string,
  organizationId: string,
) {
  const { getPlatformAdministratorContext } = await import(
    '@/lib/platform-admin/platform-admin-authorization'
  )
  await getPlatformAdministratorContext(actorUserId)
  return getPrisma().organization.findFirst({
    where: { id: organizationId, systemKey: null },
    select: {
      id: true,
      name: true,
      chamberOfCommerceNumber: true,
      marketplaceReliabilityEvents: {
        orderBy: { occurredAt: 'desc' },
        include: { request: { select: { requestNumber: true, title: true } } },
      },
      marketplaceContactRequests: {
        orderBy: { createdAt: 'desc' },
        include: {
          createdByUser: { select: { displayName: true, email: true } },
          reviewedByUser: { select: { displayName: true, email: true } },
        },
      },
    },
  })
}
