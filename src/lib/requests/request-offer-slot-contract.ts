import { z } from 'zod'
import type { RequestOfferSlotStatus } from '@/generated/prisma/client'

export const MAX_ACTIVE_REQUEST_OFFER_SLOTS = 3

export const requestOfferSlotInputSchema = z
  .object({
    requestId: z.string().uuid('De aanvraag is ongeldig.'),
  })
  .strict()

export const requestOfferSlotStatusLabels: Readonly<
  Record<RequestOfferSlotStatus, string>
> = Object.freeze({
  CLAIMED: 'Offerteplaats geclaimd',
  RELEASED: 'Offerteplaats vrijgegeven',
})

export const requestOfferSlotCreditPolicy = Object.freeze({
  enabled: false,
  creditsRequired: 0,
} as const)
