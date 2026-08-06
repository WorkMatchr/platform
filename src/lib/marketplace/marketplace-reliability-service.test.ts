import { describe, expect, it } from 'vitest'
import {
  marketplaceContactDecisionSchema,
  withdrawPublishedRequestSchema,
  withdrawalReasonLabels,
} from './marketplace-reliability-contract'

describe('Marketplace-betrouwbaarheidscontracten', () => {
  it('vereist bevestiging en een toelichting bij een andere intrekkingsreden', () => {
    const base = {
      requestId: '11111111-1111-4111-8111-111111111111',
      reason: 'OTHER',
      confirmed: true,
    }
    expect(withdrawPublishedRequestSchema.safeParse(base).success).toBe(false)
    expect(
      withdrawPublishedRequestSchema.safeParse({
        ...base,
        explanation: 'De opdracht is aantoonbaar verkeerd vastgelegd.',
      }).success,
    ).toBe(true)
  })

  it('valideert uitsluitend bekende beheerbesluiten', () => {
    const base = {
      contactRequestId: '11111111-1111-4111-8111-111111111111',
      reason: 'De organisatie heeft voldoende context aangeleverd.',
    }
    expect(
      marketplaceContactDecisionSchema.safeParse({
        ...base,
        decision: 'APPROVED',
      }).success,
    ).toBe(true)
    expect(
      marketplaceContactDecisionSchema.safeParse({
        ...base,
        decision: 'AUTO_APPROVED',
      }).success,
    ).toBe(false)
  })

  it('presenteert intrekkingsredenen zonder technische enumwaarden', () => {
    expect(withdrawalReasonLabels.PLACED_INCORRECTLY).toBe(
      'Opdracht is verkeerd geplaatst',
    )
  })
})
