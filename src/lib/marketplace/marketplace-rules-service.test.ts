import { describe, expect, it } from 'vitest'
import {
  calculateWithdrawalRefund,
  INITIAL_MARKETPLACE_RULES,
  marketplaceRuleSetInputSchema,
} from './marketplace-rules-contract'

describe('Marketplace Rules', () => {
  const validRuleSet = {
    version: '2026.1',
    validFrom: new Date('2026-08-01T00:00:00Z'),
    ...INITIAL_MARKETPLACE_RULES,
    changeReason: 'Initiële versieerbare bedrijfsregels voor de marktplaats.',
    confirmed: true as const,
  }

  it('legt de productbesluiten als getypeerde beginwaarden vast', () => {
    expect(INITIAL_MARKETPLACE_RULES).toEqual({
      participationPriceCredits: 30,
      minimumParticipationPrice: 30,
      withdrawalRefundPercentage: 75,
      roundRefundUp: true,
      unawardedQuoteRefundCredits: 5,
      maximumParticipants: 3,
      withdrawalThreshold: 3,
      withdrawalWindowMonths: 12,
      reliabilitySignalsEnabled: true,
    })
    expect(marketplaceRuleSetInputSchema.parse(validRuleSet)).toMatchObject({
      version: '2026.1',
      maximumParticipants: 3,
    })
  })

  it('weigert een deelnameprijs onder de minimumprijs', () => {
    expect(
      marketplaceRuleSetInputSchema.safeParse({
        ...validRuleSet,
        participationPriceCredits: 30,
        minimumParticipationPrice: 40,
      }).success,
    ).toBe(false)
  })

  it('rondt de terugbetaling van 75 procent naar boven af', () => {
    expect(calculateWithdrawalRefund(30, 75, true)).toBe(23)
    expect(calculateWithdrawalRefund(40, 75, true)).toBe(30)
  })
})
