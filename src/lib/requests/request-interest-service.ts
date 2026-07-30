import type { Prisma, RequestInterestStatus } from '@/generated/prisma/client'
import { Prisma as PrismaNamespace } from '@/generated/prisma/client'
import { requireProviderMarketplaceAccess } from '@/lib/marketplace/marketplace-authorization'
import { getPrisma } from '@/lib/prisma'

type Transaction = Prisma.TransactionClient

export class RequestInterestServiceError extends Error {
  constructor(
    public readonly code:
      | 'NOT_FOUND'
      | 'ACCESS_DENIED'
      | 'INVALID_STATUS'
      | 'SLOT_CLAIMED'
      | 'CONFLICT',
  ) {
    super(code)
    this.name = 'RequestInterestServiceError'
  }
}

export type ProviderRequestActor = Readonly<{
  userId: string
  organizationId: string
}>

function isConflict(error: unknown): boolean {
  return Boolean(
    error &&
      typeof error === 'object' &&
      'code' in error &&
      (error.code === 'P2002' || error.code === 'P2034'),
  )
}

async function requireProviderAccess(
  transaction: Transaction,
  actor: ProviderRequestActor,
  write: boolean,
) {
  try {
    return await requireProviderMarketplaceAccess(
      transaction,
      actor.userId,
      actor.organizationId,
      write,
    )
  } catch {
    throw new RequestInterestServiceError('ACCESS_DENIED')
  }
}

const publicRequestSelect = {
  id: true,
  requestNumber: true,
  title: true,
  publicSummary: true,
  region: true,
  sector: true,
  requestedStart: true,
  primaryExpertise: true,
  additionalExpertise: true,
  possibleExpertise: true,
  publishedAt: true,
} satisfies Prisma.RequestSelect

export async function listEligibleRequestsForProvider(
  actor: ProviderRequestActor,
) {
  return getPrisma().$transaction(async (transaction) => {
    await requireProviderAccess(transaction, actor, false)
    return transaction.requestEligibleProvider.findMany({
      where: {
        providerOrganizationId: actor.organizationId,
        request: { status: 'PUBLISHED' },
      },
      orderBy: { request: { publishedAt: 'desc' } },
      select: {
        matchedExpertise: true,
        request: { select: publicRequestSelect },
        interest: {
          select: {
            status: true,
            offerSlot: {
              select: {
                status: true,
                slotNumber: true,
              },
            },
          },
        },
      },
    })
  })
}

export async function getEligibleRequestForProvider(
  actor: ProviderRequestActor,
  requestId: string,
) {
  return getPrisma().$transaction(async (transaction) => {
    const access = await requireProviderAccess(transaction, actor, false)
    const eligibility =
      await transaction.requestEligibleProvider.findUnique({
        where: {
          requestId_providerOrganizationId: {
            requestId,
            providerOrganizationId: actor.organizationId,
          },
        },
        select: {
          matchedExpertise: true,
          request: {
            select: {
              ...publicRequestSelect,
              status: true,
            },
          },
          interest: {
            select: {
              id: true,
              status: true,
              createdAt: true,
              withdrawnAt: true,
              offerSlot: {
                select: {
                  id: true,
                  status: true,
                  slotNumber: true,
                  claimedAt: true,
                },
              },
            },
          },
        },
      })
    if (!eligibility || eligibility.request.status !== 'PUBLISHED') {
      throw new RequestInterestServiceError('NOT_FOUND')
    }
    const activeOfferSlotCount =
      await transaction.requestOfferSlot.count({
        where: {
          requestId,
          status: 'CLAIMED',
        },
      })
    const hasClaimedOfferSlot =
      eligibility.interest?.offerSlot?.status === 'CLAIMED'
    const requesterDetails = hasClaimedOfferSlot
      ? await transaction.request.findUnique({
          where: { id: requestId },
          select: {
            notes: true,
            organization: {
              select: {
                name: true,
                tradeName: true,
                generalEmail: true,
                phone: true,
                locations: {
                  where: { archivedAt: null },
                  orderBy: [
                    { isPrimary: 'desc' },
                    { createdAt: 'asc' },
                  ],
                  take: 1,
                  select: { city: true },
                },
              },
            },
            adviceDossier: {
              select: {
                ownerUser: {
                  select: {
                    displayName: true,
                    email: true,
                  },
                },
              },
            },
          },
        })
      : null
    return {
      ...eligibility,
      activeOfferSlotCount,
      requesterDetails: requesterDetails
        ? {
            organizationName:
              requesterDetails.organization.tradeName ??
              requesterDetails.organization.name,
            contactName:
              requesterDetails.adviceDossier.ownerUser.displayName ??
              'Niet opgegeven',
            email:
              requesterDetails.organization.generalEmail ??
              requesterDetails.adviceDossier.ownerUser.email,
            phone:
              requesterDetails.organization.phone ?? 'Niet opgegeven',
            city:
              requesterDetails.organization.locations[0]?.city ??
              'Niet opgegeven',
            notes: requesterDetails.notes,
          }
        : null,
      canManage:
        access.role === 'OWNER' || access.role === 'ADMIN',
    }
  })
}

async function writeInterest(
  input: {
    actor: ProviderRequestActor
    requestId: string
    targetStatus: RequestInterestStatus
    at: Date
  },
): Promise<{ id: string; status: RequestInterestStatus }> {
  return getPrisma().$transaction(
    async (transaction) => {
      await requireProviderAccess(transaction, input.actor, true)
      await transaction.$queryRaw(
        PrismaNamespace.sql`
          SELECT pg_advisory_xact_lock(
            hashtext(${input.requestId}),
            hashtext(${input.actor.organizationId})
          )::text AS "lock"
        `,
      )
      const eligibility =
        await transaction.requestEligibleProvider.findUnique({
          where: {
            requestId_providerOrganizationId: {
              requestId: input.requestId,
              providerOrganizationId: input.actor.organizationId,
            },
          },
          select: {
            request: { select: { status: true } },
          },
        })
      if (!eligibility) {
        throw new RequestInterestServiceError('NOT_FOUND')
      }
      if (eligibility.request.status !== 'PUBLISHED') {
        throw new RequestInterestServiceError('INVALID_STATUS')
      }

      const existing = await transaction.requestInterest.findUnique({
        where: {
          requestId_providerOrganizationId: {
            requestId: input.requestId,
            providerOrganizationId: input.actor.organizationId,
          },
        },
        select: {
          id: true,
          status: true,
          _count: { select: { events: true } },
          offerSlot: {
            select: {
              status: true,
            },
          },
        },
      })
      if (!existing) {
        if (input.targetStatus !== 'INTERESTED') {
          throw new RequestInterestServiceError('NOT_FOUND')
        }
        const interest = await transaction.requestInterest.create({
          data: {
            requestId: input.requestId,
            providerOrganizationId: input.actor.organizationId,
            createdByUserId: input.actor.userId,
            status: 'INTERESTED',
            createdAt: input.at,
          },
          select: { id: true, status: true },
        })
        await transaction.requestInterestEvent.create({
          data: {
            interestId: interest.id,
            requestId: input.requestId,
            providerOrganizationId: input.actor.organizationId,
            actorUserId: input.actor.userId,
            type: 'INTEREST_REGISTERED',
            toStatus: 'INTERESTED',
            idempotencyKey: `request-interest:${interest.id}:1`,
            occurredAt: input.at,
          },
        })
        return interest
      }
      if (existing.status === input.targetStatus) {
        return { id: existing.id, status: existing.status }
      }
      if (
        input.targetStatus === 'WITHDRAWN' &&
        existing.offerSlot?.status === 'CLAIMED'
      ) {
        throw new RequestInterestServiceError('SLOT_CLAIMED')
      }

      const eventNumber = existing._count.events + 1
      const interest = await transaction.requestInterest.update({
        where: { id: existing.id },
        data:
          input.targetStatus === 'WITHDRAWN'
            ? {
                status: 'WITHDRAWN',
                withdrawnAt: input.at,
              }
            : {
                status: 'INTERESTED',
                withdrawnAt: null,
              },
        select: { id: true, status: true },
      })
      await transaction.requestInterestEvent.create({
        data: {
          interestId: existing.id,
          requestId: input.requestId,
          providerOrganizationId: input.actor.organizationId,
          actorUserId: input.actor.userId,
          type:
            input.targetStatus === 'WITHDRAWN'
              ? 'INTEREST_WITHDRAWN'
              : 'INTEREST_REACTIVATED',
          fromStatus: existing.status,
          toStatus: input.targetStatus,
          idempotencyKey: `request-interest:${existing.id}:${eventNumber}`,
          occurredAt: input.at,
        },
      })
      return interest
    },
    { isolationLevel: 'Serializable' },
  )
}

async function withConflictRetry(input: {
  actor: ProviderRequestActor
  requestId: string
  targetStatus: RequestInterestStatus
  at?: Date
}) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await writeInterest({
        ...input,
        at: input.at ?? new Date(),
      })
    } catch (error) {
      if (error instanceof RequestInterestServiceError) throw error
      if (!isConflict(error)) throw error
    }
  }
  throw new RequestInterestServiceError('CONFLICT')
}

export function registerRequestInterest(input: {
  actor: ProviderRequestActor
  requestId: string
  at?: Date
}) {
  return withConflictRetry({ ...input, targetStatus: 'INTERESTED' })
}

export function withdrawRequestInterest(input: {
  actor: ProviderRequestActor
  requestId: string
  at?: Date
}) {
  return withConflictRetry({ ...input, targetStatus: 'WITHDRAWN' })
}
