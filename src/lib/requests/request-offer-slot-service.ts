import { requireProviderParticipationAccess } from '@/lib/marketplace/marketplace-authorization'
import { getPrisma } from '@/lib/prisma'
import type { ProviderRequestActor } from './request-interest-service'

export class RequestOfferSlotServiceError extends Error {
  constructor(public readonly code: 'ACCESS_DENIED' | 'LEGACY_ROUTE_CLOSED') {
    super(code)
    this.name = 'RequestOfferSlotServiceError'
  }
}

/** Compatibility boundary for outstanding clients. Never touches the ledger. */
export async function claimRequestOfferSlot(input: {
  actor: ProviderRequestActor
  requestId: string
  at?: Date
}): Promise<never> {
  await getPrisma().$transaction(async tx => {
    try {
      await requireProviderParticipationAccess(tx, input.actor.userId, input.actor.organizationId, true)
    } catch {
      throw new RequestOfferSlotServiceError('ACCESS_DENIED')
    }
  })
  throw new RequestOfferSlotServiceError('LEGACY_ROUTE_CLOSED')
}
