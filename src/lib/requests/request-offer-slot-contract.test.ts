import { describe, expect, it } from 'vitest'
import {
  MAX_ACTIVE_REQUEST_OFFER_SLOTS,
  requestOfferSlotCreditPolicy,
  requestOfferSlotInputSchema,
  requestOfferSlotStatusLabels,
} from './request-offer-slot-contract'

describe('RequestOfferSlot-contract', () => {
  it('valideert uitsluitend een aanvraag-id', () => {
    expect(
      requestOfferSlotInputSchema.parse({
        requestId: '11111111-1111-4111-8111-111111111111',
      }),
    ).toEqual({
      requestId: '11111111-1111-4111-8111-111111111111',
    })
    expect(
      requestOfferSlotInputSchema.safeParse({
        requestId: 'ongeldig',
      }).success,
    ).toBe(false)
  })

  it('legt de drie plaatsen en uitgeschakelde credits expliciet vast', () => {
    expect(MAX_ACTIVE_REQUEST_OFFER_SLOTS).toBe(3)
    expect(requestOfferSlotCreditPolicy).toEqual({
      enabled: false,
      creditsRequired: 0,
    })
    expect(requestOfferSlotStatusLabels.CLAIMED).toBe(
      'Offerteplaats geclaimd',
    )
  })
})
