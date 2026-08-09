import { z } from 'zod'

export const CREDIT_CURRENCY = 'EUR' as const
export const DUTCH_VAT_RATE_BPS = 2_100

export const creditPackageCatalog = [
  { sku: 'CREDITS_25', credits: 25, baseAmountCents: 2_500, packageDiscountBps: 0 },
  { sku: 'CREDITS_50', credits: 50, baseAmountCents: 5_000, packageDiscountBps: 0 },
  { sku: 'CREDITS_75', credits: 75, baseAmountCents: 7_500, packageDiscountBps: 0 },
  { sku: 'CREDITS_100', credits: 100, baseAmountCents: 10_000, packageDiscountBps: 500 },
  { sku: 'CREDITS_150', credits: 150, baseAmountCents: 15_000, packageDiscountBps: 1_000 },
  { sku: 'CREDITS_250', credits: 250, baseAmountCents: 25_000, packageDiscountBps: 1_500 },
  { sku: 'CREDITS_500', credits: 500, baseAmountCents: 50_000, packageDiscountBps: 2_000 },
] as const

export type CreditPackageSku = (typeof creditPackageCatalog)[number]['sku']

export const creditPackageSkuSchema = z.enum(
  creditPackageCatalog.map((item) => item.sku) as [CreditPackageSku, ...CreditPackageSku[]],
)

export const billingAddressSchema = z.object({
  organizationName: z.string().trim().min(2).max(200),
  addressLine: z.string().trim().min(2).max(200),
  postalCode: z.string().trim().min(3).max(20),
  city: z.string().trim().min(2).max(120),
  countryCode: z.string().trim().toUpperCase().length(2).default('NL'),
  chamberOfCommerceNumber: z.string().trim().max(20).optional(),
  vatId: z.string().trim().max(40).optional(),
})

export const createCreditPurchaseSchema = z.object({
  actorUserId: z.string().uuid(),
  organizationId: z.string().uuid(),
  packageSku: creditPackageSkuSchema,
  discountCode: z.string().trim().toUpperCase().min(2).max(40).optional(),
  billingAddress: billingAddressSchema,
  idempotencyKey: z.string().trim().min(12).max(160).regex(/^[A-Za-z0-9:_-]+$/),
})

export type BillingAddress = z.infer<typeof billingAddressSchema>
export type CreateCreditPurchaseInput = z.infer<typeof createCreditPurchaseSchema>

export type DiscountSnapshot = Readonly<{
  code: string
  percentageBps: number | null
  fixedAmountCents: number | null
  bonusCredits: number
}>

export type PurchasePrice = Readonly<{
  packageSku: CreditPackageSku
  packageLabel: string
  credits: number
  baseAmountCents: number
  packageDiscountCents: number
  proDiscountCents: number
  discountCodeDiscountCents: number
  amountExclVatCents: number
  vatRateBps: number
  vatAmountCents: number
  amountInclVatCents: number
  currency: typeof CREDIT_CURRENCY
  bonusCredits: number
}>

function roundedRate(amountCents: number, rateBps: number) {
  return Math.round((amountCents * rateBps) / 10_000)
}

export function getCreditPackage(sku: CreditPackageSku) {
  const item = creditPackageCatalog.find((candidate) => candidate.sku === sku)
  if (!item) throw new Error('UNKNOWN_CREDIT_PACKAGE')
  return item
}

export function calculateCreditPurchasePrice(input: {
  packageSku: CreditPackageSku
  hasActivePro: boolean
  discount?: DiscountSnapshot
  vatRateBps?: number
}): PurchasePrice {
  const item = getCreditPackage(input.packageSku)
  if (input.hasActivePro && input.discount) throw new Error('PRO_DISCOUNT_CODE_NOT_COMBINABLE')
  const packageDiscountCents = roundedRate(item.baseAmountCents, item.packageDiscountBps)
  const packagePriceCents = item.baseAmountCents - packageDiscountCents
  const proDiscountCents = input.hasActivePro ? roundedRate(packagePriceCents, 1_000) : 0
  const afterPro = packagePriceCents - proDiscountCents
  const discountCodeDiscountCents = input.discount
    ? Math.min(
        afterPro,
        input.discount.percentageBps !== null
          ? roundedRate(afterPro, input.discount.percentageBps)
          : input.discount.fixedAmountCents ?? 0,
      )
    : 0
  const amountExclVatCents = afterPro - discountCodeDiscountCents
  const vatRateBps = input.vatRateBps ?? DUTCH_VAT_RATE_BPS
  const vatAmountCents = roundedRate(amountExclVatCents, vatRateBps)
  return Object.freeze({
    packageSku: item.sku,
    packageLabel: `${item.credits} credits`,
    credits: item.credits,
    baseAmountCents: item.baseAmountCents,
    packageDiscountCents,
    proDiscountCents,
    discountCodeDiscountCents,
    amountExclVatCents,
    vatRateBps,
    vatAmountCents,
    amountInclVatCents: amountExclVatCents + vatAmountCents,
    currency: CREDIT_CURRENCY,
    bonusCredits: input.discount?.bonusCredits ?? 0,
  })
}

export function formatEuro(cents: number) {
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: CREDIT_CURRENCY }).format(cents / 100)
}

export const WORKMATCHR_PRO_PLAN = Object.freeze({
  code: 'WORKMATCHR_PRO_MONTHLY',
  label: 'WorkMatchr Pro',
  amountExclVatCents: 4_900,
  vatRateBps: DUTCH_VAT_RATE_BPS,
  vatAmountCents: roundedRate(4_900, DUTCH_VAT_RATE_BPS),
  amountInclVatCents: 4_900 + roundedRate(4_900, DUTCH_VAT_RATE_BPS),
  currency: CREDIT_CURRENCY,
  interval: '1 month',
})

export const WORKMATCHR_SELLER = Object.freeze({
  legalName: 'Feenstra Safety Consulting',
  tradeName: 'WorkMatchr',
  addressLine: 'Kennemerland 71',
  postalCode: '9405 LC',
  city: 'Assen',
  countryCode: 'NL',
  chamberOfCommerceNumber: '57788863',
  vatId: 'NL002107278B11',
})
