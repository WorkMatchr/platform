import type {
  Prisma,
  RequestOfferSlotStatus,
  RequestStatus,
} from '@/generated/prisma/client'
import { Prisma as PrismaNamespace } from '@/generated/prisma/client'
import { requireProviderMarketplaceAccess } from '@/lib/marketplace/marketplace-authorization'
import { getPrisma } from '@/lib/prisma'
import { MAX_ACTIVE_REQUEST_OFFER_SLOTS } from './request-offer-slot-contract'
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
): number | null {
  const occupied = new Set(activeSlots)
  for (
    let slotNumber = 1;
    slotNumber <= MAX_ACTIVE_REQUEST_OFFER_SLOTS;
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
    }
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

  return offerSlot
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
        { isolationLevel: 'ReadCommitted' },
      )
    } catch (error) {
      if (error instanceof RequestOfferSlotServiceError) throw error
      if (!isConflict(error)) throw error
    }
  }
  throw new RequestOfferSlotServiceError('CONFLICT')
}
