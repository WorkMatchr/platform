import { describe, expect, it } from 'vitest'
import {
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

  it('presenteert de claimstatus zonder een hardcoded prijs of maximum', () => {
    expect(requestOfferSlotStatusLabels.CLAIMED).toBe(
      'Offerteplaats geclaimd',
    )
  })
})
