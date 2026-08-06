import type {
  Prisma,
  RequestOfferSlotStatus,
  RequestStatus,
} from '@/generated/prisma/client'
import { Prisma as PrismaNamespace } from '@/generated/prisma/client'
import { requireProviderMarketplaceAccess } from '@/lib/marketplace/marketplace-authorization'
import { getApplicableMarketplaceRuleSet } from '@/lib/marketplace/marketplace-rules-service'
import { getPrisma } from '@/lib/prisma'
import type { ProviderRequestActor } from './request-interest-service'

type Transaction = Prisma.TransactionClient

export class RequestOfferSlotServiceError extends Error {
  constructor(
    public readonly code:
      | 'NOT_FOUND'
      | 'ACCESS_DENIED'
      | 'INVALID_STATUS'
      | 'NO_ACTIVE_INTEREST'
      | 'FULL'
      | 'INSUFFICIENT_CREDITS'
      | 'CONFIGURATION_ERROR'
      | 'CONFLICT',
  ) {
    super(code)
    this.name = 'RequestOfferSlotServiceError'
  }
}

export type RequestOfferSlotReference = Readonly<{
  id: string
  slotNumber: number
  status: RequestOfferSlotStatus
  claimedAt: Date
  creditAmount: number | null
  maximumParticipants: number
  ruleSetVersion: string | null
}>

function isConflict(error: unknown): boolean {
  return Boolean(
    error &&
      typeof error === 'object' &&
      'code' in error &&
      (error.code === 'P2002' || error.code === 'P2034'),
  )
}

async function requireClaimAccess(
  transaction: Transaction,
  actor: ProviderRequestActor,
) {
  try {
    const access = await requireProviderMarketplaceAccess(
      transaction,
      actor.userId,
      actor.organizationId,
      true,
    )
    if (
      access.providerProfile.selectabilityStatus !== 'SELECTABLE'
    ) {
      throw new RequestOfferSlotServiceError('ACCESS_DENIED')
    }
    return access
  } catch (error) {
    if (error instanceof RequestOfferSlotServiceError) throw error
    throw new RequestOfferSlotServiceError('ACCESS_DENIED')
  }
}

function nextAvailableSlotNumber(
  activeSlots: readonly number[],
  maximumParticipants: number,
): number | null {
  const occupied = new Set(activeSlots)
  for (
    let slotNumber = 1;
    slotNumber <= maximumParticipants;
    slotNumber += 1
  ) {
    if (!occupied.has(slotNumber)) return slotNumber
  }
  return null
}

async function claimInTransaction(
  transaction: Transaction,
  input: {
    actor: ProviderRequestActor
    requestId: string
    at: Date
  },
): Promise<RequestOfferSlotReference> {
  await requireClaimAccess(transaction, input.actor)

  const lockedRequests = await transaction.$queryRaw<
    Array<{ id: string; status: RequestStatus }>
  >(
    PrismaNamespace.sql`
      SELECT "id", "status"
      FROM "Request"
      WHERE "id" = ${input.requestId}::uuid
      FOR UPDATE
    `,
  )
  const lockedRequest = lockedRequests[0]
  if (!lockedRequest) {
    throw new RequestOfferSlotServiceError('NOT_FOUND')
  }
  if (lockedRequest.status !== 'PUBLISHED') {
    throw new RequestOfferSlotServiceError('INVALID_STATUS')
  }

  const ruleSet = await getApplicableMarketplaceRuleSet(transaction, input.at)

  const interest = await transaction.requestInterest.findUnique({
    where: {
      requestId_providerOrganizationId: {
        requestId: input.requestId,
        providerOrganizationId: input.actor.organizationId,
      },
    },
    select: {
      id: true,
      status: true,
      eligibility: { select: { id: true } },
      offerSlot: {
        select: {
          id: true,
          slotNumber: true,
          status: true,
          claimedAt: true,
          creditAmount: true,
          creditTransactionId: true,
          marketplaceRuleSet: { select: { version: true, maximumParticipants: true } },
          _count: { select: { events: true } },
        },
      },
    },
  })
  if (!interest?.eligibility) {
    throw new RequestOfferSlotServiceError('NOT_FOUND')
  }
  if (interest.status !== 'INTERESTED') {
    throw new RequestOfferSlotServiceError('NO_ACTIVE_INTEREST')
  }
  if (interest.offerSlot?.status === 'CLAIMED') {
    return {
      id: interest.offerSlot.id,
      slotNumber: interest.offerSlot.slotNumber,
      status: interest.offerSlot.status,
      claimedAt: interest.offerSlot.claimedAt,
      creditAmount: interest.offerSlot.creditAmount,
      maximumParticipants:
        interest.offerSlot.marketplaceRuleSet?.maximumParticipants ??
        ruleSet.maximumParticipants,
      ruleSetVersion: interest.offerSlot.marketplaceRuleSet?.version ?? null,
    }
  }
  if (interest.offerSlot?.creditTransactionId) {
    throw new RequestOfferSlotServiceError('INVALID_STATUS')
  }

  const activeSlots = await transaction.requestOfferSlot.findMany({
    where: {
      requestId: input.requestId,
      status: 'CLAIMED',
    },
    orderBy: { slotNumber: 'asc' },
    select: { slotNumber: true },
  })
  const slotNumber = nextAvailableSlotNumber(
    activeSlots.map((slot) => slot.slotNumber),
    ruleSet.maximumParticipants,
  )
  if (slotNumber === null) {
    throw new RequestOfferSlotServiceError('FULL')
  }

  const offerSlot = interest.offerSlot
    ? await transaction.requestOfferSlot.update({
        where: { id: interest.offerSlot.id },
        data: {
          slotNumber,
          status: 'CLAIMED',
          claimedAt: input.at,
          expiresAt: null,
          releasedAt: null,
        },
        select: {
          id: true,
          slotNumber: true,
          status: true,
          claimedAt: true,
          creditAmount: true,
        },
      })
    : await transaction.requestOfferSlot.create({
        data: {
          requestId: input.requestId,
          providerOrganizationId: input.actor.organizationId,
          requestInterestId: interest.id,
          slotNumber,
          status: 'CLAIMED',
          claimedAt: input.at,
          createdByUserId: input.actor.userId,
        },
        select: {
          id: true,
          slotNumber: true,
          status: true,
          claimedAt: true,
          creditAmount: true,
        },
      })

  const account = await transaction.creditAccount.findUnique({
    where: { organizationId: input.actor.organizationId },
  })
  if (!account) {
    throw new RequestOfferSlotServiceError('INSUFFICIENT_CREDITS')
  }
  await transaction.$queryRaw`SELECT "id" FROM "CreditAccount" WHERE "id" = ${account.id}::uuid FOR UPDATE`
  const totals = await transaction.creditAccount.findUniqueOrThrow({
    where: { id: account.id },
  })
  if (totals.availableBalance < ruleSet.participationPriceCredits) {
    throw new RequestOfferSlotServiceError('INSUFFICIENT_CREDITS')
  }
  const payment = await transaction.creditTransaction.create({
    data: {
      creditAccountId: account.id,
      type: 'PARTICIPATION_PAYMENT',
      amount: -ruleSet.participationPriceCredits,
      totalDelta: -ruleSet.participationPriceCredits,
      reservedDelta: 0,
      balanceBefore: totals.availableBalance,
      balanceAfter: totals.availableBalance - ruleSet.participationPriceCredits,
      availableBefore: totals.availableBalance,
      availableAfter: totals.availableBalance - ruleSet.participationPriceCredits,
      reservedBefore: totals.reservedBalance,
      reservedAfter: totals.reservedBalance,
      spentBefore: totals.spentBalance,
      spentAfter: totals.spentBalance + ruleSet.participationPriceCredits,
      referenceType: 'RequestOfferSlot',
      referenceId: offerSlot.id,
      requestId: input.requestId,
      offerSlotId: offerSlot.id,
      marketplaceRuleSetId: ruleSet.id,
      reason: 'Credits afgeschreven voor een deelnameplaats.',
      idempotencyKey: `request-offer-slot:${offerSlot.id}:payment`,
      createdByUserId: input.actor.userId,
    },
  })
  await transaction.requestOfferSlot.update({
    where: { id: offerSlot.id },
    data: {
      creditAmount: ruleSet.participationPriceCredits,
      marketplaceRuleSetId: ruleSet.id,
      creditTransactionId: payment.id,
    },
  })

  const eventNumber = (interest.offerSlot?._count.events ?? 0) + 1
  await transaction.requestOfferSlotEvent.create({
    data: {
      offerSlotId: offerSlot.id,
      requestId: input.requestId,
      providerOrganizationId: input.actor.organizationId,
      actorUserId: input.actor.userId,
      type: 'CLAIMED',
      fromStatus: interest.offerSlot?.status,
      toStatus: 'CLAIMED',
      slotNumber,
      idempotencyKey: `request-offer-slot:${offerSlot.id}:${eventNumber}`,
      occurredAt: input.at,
    },
  })

  return {
    ...offerSlot,
    creditAmount: ruleSet.participationPriceCredits,
    maximumParticipants: ruleSet.maximumParticipants,
    ruleSetVersion: ruleSet.version,
  }
}

export async function claimRequestOfferSlot(input: {
  actor: ProviderRequestActor
  requestId: string
  at?: Date
}): Promise<RequestOfferSlotReference> {
  const at = input.at ?? new Date()
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await getPrisma().$transaction(
        (transaction) =>
          claimInTransaction(transaction, {
            actor: input.actor,
            requestId: input.requestId,
            at,
          }),
        { isolationLevel: 'Serializable' },
      )
    } catch (error) {
      if (error instanceof RequestOfferSlotServiceError) {
        if (error.code === 'CONFLICT') continue
        throw error
      }
      if (!isConflict(error)) throw error
    }
  }

  const finalState = await getPrisma().$transaction(
    async (transaction) => {
      await transaction.$queryRaw(
        PrismaNamespace.sql`
          SELECT "id" FROM "Request"
          WHERE "id" = ${input.requestId}::uuid
          FOR UPDATE
        `,
      )
      const ruleSet = await getApplicableMarketplaceRuleSet(transaction, at)
      const ownSlot = await transaction.requestOfferSlot.findFirst({
        where: {
          requestId: input.requestId,
          providerOrganizationId: input.actor.organizationId,
          status: 'CLAIMED',
        },
        include: {
          marketplaceRuleSet: {
            select: { version: true, maximumParticipants: true },
          },
        },
      })
      if (ownSlot) {
        return {
          kind: 'OWN_SLOT' as const,
          slot: {
            id: ownSlot.id,
            slotNumber: ownSlot.slotNumber,
            status: ownSlot.status,
            claimedAt: ownSlot.claimedAt,
            creditAmount: ownSlot.creditAmount,
            maximumParticipants:
              ownSlot.marketplaceRuleSet?.maximumParticipants ??
              ruleSet.maximumParticipants,
            ruleSetVersion: ownSlot.marketplaceRuleSet?.version ?? null,
          },
        }
      }
      const activeCount = await transaction.requestOfferSlot.count({
        where: { requestId: input.requestId, status: 'CLAIMED' },
      })
      return {
        kind:
          activeCount >= ruleSet.maximumParticipants
            ? ('FULL' as const)
            : ('CONFLICT' as const),
      }
    },
    { isolationLevel: 'ReadCommitted' },
  )
  if (finalState.kind === 'OWN_SLOT') return finalState.slot
  if (finalState.kind === 'FULL') {
    throw new RequestOfferSlotServiceError('FULL')
  }
  throw new RequestOfferSlotServiceError('CONFLICT')
}
