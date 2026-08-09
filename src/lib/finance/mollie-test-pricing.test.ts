import { afterEach, describe, expect, it, vi } from 'vitest'
import { createCreditPurchaseSchema } from './financial-contract'
import {
  calculateAuthoritativeMollieCreditPrice,
  isMollieTestApiKey,
  MOLLIE_SANDBOX_ACCEPTANCE_PRICING,
} from './mollie-test-pricing'

vi.mock('server-only', () => ({}))

describe('Mollie sandboxacceptatieprijs', () => {
  afterEach(() => vi.unstubAllEnvs())

  it('gebruikt uitsluitend met een test-key voor 25 credits exact 1 euro plus 21 procent btw', () => {
    vi.stubEnv('MOLLIE_API_KEY', 'test_fictieveacceptatiesleutel')
    const price = calculateAuthoritativeMollieCreditPrice({
      packageSku: 'CREDITS_25',
      hasActivePro: true,
      discount: { code: 'MAGNIET', percentageBps: 5_000, fixedAmountCents: null, bonusCredits: 10 },
    })

    expect(price).toEqual({
      pricingMode: 'MOLLIE_TEST_ACCEPTANCE',
      packageSku: 'CREDITS_25',
      packageLabel: '25 credits',
      credits: 25,
      baseAmountCents: 100,
      packageDiscountCents: 0,
      proDiscountCents: 0,
      discountCodeDiscountCents: 0,
      amountExclVatCents: 100,
      vatRateBps: 2_100,
      vatAmountCents: 21,
      amountInclVatCents: 121,
      currency: 'EUR',
      bonusCredits: 0,
    })
  })

  it('houdt bij een live-key de contractprijs van 25 euro exclusief btw aan', () => {
    vi.stubEnv('MOLLIE_API_KEY', 'live_fictieveproductiesleutel')
    expect(calculateAuthoritativeMollieCreditPrice({
      packageSku: 'CREDITS_25',
      hasActivePro: false,
    })).toMatchObject({
      pricingMode: 'STANDARD',
      amountExclVatCents: 2_500,
      vatAmountCents: 525,
      amountInclVatCents: 3_025,
      credits: 25,
    })
  })

  it('wijzigt met een test-key geen enkel ander pakket', () => {
    vi.stubEnv('MOLLIE_API_KEY', 'test_fictieveacceptatiesleutel')
    expect(calculateAuthoritativeMollieCreditPrice({
      packageSku: 'CREDITS_50',
      hasActivePro: false,
    })).toMatchObject({
      pricingMode: 'STANDARD',
      amountExclVatCents: 5_000,
      vatAmountCents: 1_050,
      amountInclVatCents: 6_050,
      credits: 50,
    })
  })

  it('activeert de testmodus niet voor lege, willekeurige of live sleutels', () => {
    expect(isMollieTestApiKey(undefined)).toBe(false)
    expect(isMollieTestApiKey('')).toBe(false)
    expect(isMollieTestApiKey('sandbox_willekeurig')).toBe(false)
    expect(isMollieTestApiKey('live_fictieveproductiesleutel')).toBe(false)
    expect(isMollieTestApiKey(' test_fictieveacceptatiesleutel ')).toBe(true)
  })

  it('gebruikt een vaste auditmarker voor de sandboxacceptatieprijs', () => {
    expect(MOLLIE_SANDBOX_ACCEPTANCE_PRICING).toBe('MOLLIE_SANDBOX_ACCEPTANCE_PRICING')
  })

  it('accepteert geen client-side prijs- of prijsmodusvelden als aankoopinvoer', () => {
    const parsed = createCreditPurchaseSchema.parse({
      actorUserId: '11111111-1111-4111-8111-111111111111',
      organizationId: '22222222-2222-4222-8222-222222222222',
      packageSku: 'CREDITS_25',
      billingAddress: {
        organizationName: 'Voorbeeldorganisatie',
        addressLine: 'Teststraat 1',
        postalCode: '1234 AB',
        city: 'Teststad',
        countryCode: 'NL',
      },
      idempotencyKey: 'sandbox-client-price-test',
      pricingMode: 'MOLLIE_TEST_ACCEPTANCE',
      amountExclVatCents: 1,
      amountInclVatCents: 1,
    })

    expect(parsed).not.toHaveProperty('pricingMode')
    expect(parsed).not.toHaveProperty('amountExclVatCents')
    expect(parsed).not.toHaveProperty('amountInclVatCents')
  })
})
