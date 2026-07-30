import { describe, expect, it } from 'vitest'
import {
  presentMatchedExpertise,
  requestInterestInputSchema,
  requestInterestStatusLabels,
} from './request-interest-contract'

describe('RequestInterest-contract', () => {
  it('accepteert uitsluitend een geldig aanvraag-id', () => {
    expect(
      requestInterestInputSchema.safeParse({
        requestId: '00000000-0000-4000-8000-000000000001',
      }).success,
    ).toBe(true)
    expect(
      requestInterestInputSchema.safeParse({
        requestId: 'geen-uuid',
      }).success,
    ).toBe(false)
  })

  it('presenteert statussen en deskundigheidslagen in gebruikerstaal', () => {
    expect(requestInterestStatusLabels.INTERESTED).toBe(
      'Interesse geregistreerd',
    )
    expect(
      presentMatchedExpertise('ADDITIONAL:Arbeidshygiënist'),
    ).toBe('Aanvullend: Arbeidshygiënist')
  })
})
