import { MarketplaceServiceError } from '@/lib/marketplace/marketplace-errors'
import { requestScopeCandidates } from './request-scope-service'
import type { Prisma, RequestInterestStatus } from '@/generated/prisma/client'
import { Prisma as PrismaNamespace } from '@/generated/prisma/client'
import { requireProviderMarketplaceAccess, requireProviderParticipationAccess } from '@/lib/marketplace/marketplace-authorization'
import { getPrisma } from '@/lib/prisma'

type Transaction = Prisma.TransactionClient

export class RequestInterestServiceError extends Error {
  constructor(
    public readonly code:
      | 'LEGACY_ROUTE_CLOSED'
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
  participate = true,
) {
  try {
    if (!participate) return await requireProviderMarketplaceAccess(transaction, actor.userId, actor.organizationId, write)
    return await requireProviderParticipationAccess(
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
    await requireProviderAccess(transaction, actor, false, false)
    return transaction.requestEligibleProvider.findMany({
      where: {
        providerOrganizationId: actor.organizationId,
        interest: { isNot: null },
      },
      orderBy: { request: { publishedAt: 'desc' } },
      select: {
        matchedExpertise: true,
        eligibilityBasis: true,
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
  }, { isolationLevel: 'RepeatableRead' })
}

export async function getEligibleRequestForProvider(
  actor: ProviderRequestActor,
  requestId: string,
) {
  return getPrisma().$transaction(async (transaction) => {
    const access = await requireProviderAccess(transaction, actor, false, false)
    const eligibility =
      await transaction.requestEligibleProvider.findUnique({
        where: {
          requestId_providerOrganizationId: {
            requestId,
            providerOrganizationId: actor.organizationId,
          },
        },
        select: {
          projectionId: true,
          matchedExpertise: true,
          eligibilityBasis: true,
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
                  creditAmount: true,
                  marketplaceRuleSet: {
                    select: { version: true, maximumParticipants: true },
                  },
                },
              },
            },
          },
        },
      })
    if (!eligibility?.interest) throw new RequestInterestServiceError('NOT_FOUND')
    const hasClaimedOfferSlot = eligibility.interest.offerSlot?.status === 'CLAIMED'
    let mayReadContact = false
    if (hasClaimedOfferSlot && eligibility.request.status === 'PUBLISHED') {
      try {
        const current = await requireProviderParticipationAccess(transaction, actor.userId, actor.organizationId, false)
        mayReadContact = current.projectionId === eligibility.projectionId &&
          (await requestScopeCandidates(transaction, requestId, new Date())).has(eligibility.projectionId)
      } catch (error) {
        if (!(error instanceof MarketplaceServiceError) || !['ACCESS_DENIED', 'PROFILE_ONBOARDING_REQUIRED'].includes(error.code)) throw error
      }
    }
    const requesterDetails = mayReadContact
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
      interest: eligibility.interest,
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
  }, { isolationLevel: 'RepeatableRead' })
}

async function writeInterest(
  input: {
    actor: ProviderRequestActor
    requestId: string
    at: Date
  },
): Promise<{ id: string; status: RequestInterestStatus }> {
  return getPrisma().$transaction(
    async (transaction) => {
      await requireProviderAccess(transaction, input.actor, true, false)
      await transaction.$queryRaw(
        PrismaNamespace.sql`
          SELECT pg_advisory_xact_lock(
            hashtext(${input.requestId}),
            hashtext(${input.actor.organizationId})
          )::text AS "lock"
        `,
      )
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
          request: { select: { status: true } },
          _count: { select: { events: true } },
          offerSlot: {
            select: {
              status: true,
            },
          },
        },
      })
      if (!existing) throw new RequestInterestServiceError('NOT_FOUND')
      if (existing.status === 'WITHDRAWN') {
        return { id: existing.id, status: existing.status }
      }
      if (existing.request.status !== 'PUBLISHED') throw new RequestInterestServiceError('INVALID_STATUS')
      if (existing.offerSlot?.status === 'CLAIMED') {
        throw new RequestInterestServiceError('SLOT_CLAIMED')
      }

      const eventNumber = existing._count.events + 1
      const interest = await transaction.requestInterest.update({
        where: { id: existing.id },
        data: { status: 'WITHDRAWN', withdrawnAt: input.at },
        select: { id: true, status: true },
      })
      await transaction.requestInterestEvent.create({
        data: {
          interestId: existing.id,
          requestId: input.requestId,
          providerOrganizationId: input.actor.organizationId,
          actorUserId: input.actor.userId,
          type: 'INTEREST_WITHDRAWN',
          fromStatus: existing.status,
          toStatus: 'WITHDRAWN',
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

export async function registerRequestInterest(input: {
  actor: ProviderRequestActor
  requestId: string
  at?: Date
}) {
  await getPrisma().$transaction(tx => requireProviderAccess(tx, input.actor, true))
  throw new RequestInterestServiceError('LEGACY_ROUTE_CLOSED')
}

export function withdrawRequestInterest(input: {
  actor: ProviderRequestActor
  requestId: string
  at?: Date
}) {
  return withConflictRetry(input)
}
