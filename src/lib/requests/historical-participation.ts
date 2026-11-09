import type { Prisma } from '@/generated/prisma/client'
import { MarketplaceServiceError } from '@/lib/marketplace/marketplace-errors'

/** Called inside the selection/purchase transaction, before creating any new obligation. */
export async function requireNoHistoricalParticipation(tx: Prisma.TransactionClient, requestId: string | null) {
  if (!requestId) return
  const slot = await tx.requestOfferSlot.findFirst({ where: { requestId }, select: { id: true } })
  const entry = await tx.creditTransaction.findFirst({ where: { requestId }, select: { id: true } })
  if (slot || entry) throw new MarketplaceServiceError('INVALID_STATE', 'Deze aanvraag heeft historische deelnamegegevens. Neem contact op met WorkMatchr.')
}
