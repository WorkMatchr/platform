import 'server-only'

import {
  calculateCreditPurchasePrice,
  CREDIT_CURRENCY,
  DUTCH_VAT_RATE_BPS,
  type CreditPackageSku,
  type DiscountSnapshot,
  type PurchasePrice,
} from './financial-contract'

export const MOLLIE_TEST_ACCEPTANCE_PACKAGE_SKU = 'CREDITS_25' as const
export const MOLLIE_TEST_ACCEPTANCE_PRICE_EXCL_VAT_CENTS = 100
export const MOLLIE_SANDBOX_ACCEPTANCE_PRICING = 'MOLLIE_SANDBOX_ACCEPTANCE_PRICING' as const

export function isMollieTestApiKey(apiKey: string | undefined) {
  return apiKey?.trim().startsWith('test_') === true
}

export function usesMollieTestAcceptancePrice(packageSku: CreditPackageSku) {
  return packageSku === MOLLIE_TEST_ACCEPTANCE_PACKAGE_SKU
    && isMollieTestApiKey(process.env.MOLLIE_API_KEY)
}

export function calculateAuthoritativeMollieCreditPrice(
  input: {
    packageSku: CreditPackageSku
    hasActivePro: boolean
    discount?: DiscountSnapshot
  },
): PurchasePrice {
  if (!usesMollieTestAcceptancePrice(input.packageSku)) {
    return calculateCreditPurchasePrice(input)
  }

  const vatAmountCents = Math.round(
    MOLLIE_TEST_ACCEPTANCE_PRICE_EXCL_VAT_CENTS * DUTCH_VAT_RATE_BPS / 10_000,
  )
  return Object.freeze({
    pricingMode: 'MOLLIE_TEST_ACCEPTANCE',
    packageSku: MOLLIE_TEST_ACCEPTANCE_PACKAGE_SKU,
    packageLabel: '25 credits',
    credits: 25,
    baseAmountCents: MOLLIE_TEST_ACCEPTANCE_PRICE_EXCL_VAT_CENTS,
    packageDiscountCents: 0,
    proDiscountCents: 0,
    discountCodeDiscountCents: 0,
    amountExclVatCents: MOLLIE_TEST_ACCEPTANCE_PRICE_EXCL_VAT_CENTS,
    vatRateBps: DUTCH_VAT_RATE_BPS,
    vatAmountCents,
    amountInclVatCents: MOLLIE_TEST_ACCEPTANCE_PRICE_EXCL_VAT_CENTS + vatAmountCents,
    currency: CREDIT_CURRENCY,
    bonusCredits: 0,
  })
}
