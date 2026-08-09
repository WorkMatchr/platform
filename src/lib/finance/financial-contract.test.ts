import { describe, expect, it } from 'vitest'
import {
  calculateCreditPurchasePrice,
  creditPackageCatalog,
  DUTCH_VAT_RATE_BPS,
  WORKMATCHR_PRO_PLAN,
} from './financial-contract'

describe('financieel prijscontract', () => {
  it('bevat exact de vastgestelde creditpakketten en pakketprijzen', () => {
    expect(creditPackageCatalog.map((item) => [
      item.credits,
      calculateCreditPurchasePrice({ packageSku: item.sku, hasActivePro: false }).amountExclVatCents,
    ])).toEqual([
      [25, 2_500], [50, 5_000], [75, 7_500], [100, 9_500],
      [150, 13_500], [250, 21_250], [500, 40_000],
    ])
  })

  it('berekent btw uitsluitend in eurocenten met de vastgelegde 21 procent', () => {
    const price = calculateCreditPurchasePrice({ packageSku: 'CREDITS_25', hasActivePro: false })
    expect(price).toMatchObject({ amountExclVatCents: 2_500, vatRateBps: DUTCH_VAT_RATE_BPS, vatAmountCents: 525, amountInclVatCents: 3_025, currency: 'EUR' })
  })

  it('berekent voor 50 credits exact 50 euro exclusief en 60,50 inclusief btw', () => {
    expect(calculateCreditPurchasePrice({ packageSku: 'CREDITS_50', hasActivePro: false })).toMatchObject({
      amountExclVatCents: 5_000,
      vatAmountCents: 1_050,
      amountInclVatCents: 6_050,
    })
  })

  it('past Pro-korting toe na pakketkorting', () => {
    const price = calculateCreditPurchasePrice({ packageSku: 'CREDITS_100', hasActivePro: true })
    expect(price).toMatchObject({ packageDiscountCents: 500, proDiscountCents: 950, amountExclVatCents: 8_550 })
  })

  it('weigert de combinatie van Pro en een kortingscode', () => {
    expect(() => calculateCreditPurchasePrice({
      packageSku: 'CREDITS_100',
      hasActivePro: true,
      discount: { code: 'TEST', percentageBps: 1_000, fixedAmountCents: null, bonusCredits: 0 },
    })).toThrow('PRO_DISCOUNT_CODE_NOT_COMBINABLE')
  })

  it('legt WorkMatchr Pro vast op 49 euro exclusief btw per maand', () => {
    expect(WORKMATCHR_PRO_PLAN).toMatchObject({ amountExclVatCents: 4_900, vatAmountCents: 1_029, amountInclVatCents: 5_929, interval: '1 month' })
  })
})
