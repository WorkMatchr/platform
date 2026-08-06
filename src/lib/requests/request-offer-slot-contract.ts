import { z } from 'zod'
import type { RequestOfferSlotStatus } from '@/generated/prisma/client'

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
