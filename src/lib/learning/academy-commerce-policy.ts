import { z } from 'zod'

export const ACADEMY_FIXED_PRICES = Object.freeze({ individual: 14900, five: 59500, followUpIndividual: 13999, followUpFive: 56500 })
export type AcademyPriceDecision = { version: string; basis: 'INCLUSIVE' | 'EXCLUSIVE'; vatRateBps: 0 | 900 | 2100; followUpRule: 'PER_VERIFIED_ALUMNUS'; taxStatus: 'TAX_REVIEW_REQUIRED' | 'APPROVED'; vatTreatment: 'TAXABLE' | 'EXEMPT'; exemptionLegalBasis?: string }
// Authorized provisional scenario: test-only, never production fiscal approval.
export const academyPriceDecision: AcademyPriceDecision = Object.freeze({ version: 'ACADEMY-PRICE-TEST-1.0', basis: 'INCLUSIVE', vatRateBps: 2100, followUpRule: 'PER_VERIFIED_ALUMNUS', taxStatus: 'TAX_REVIEW_REQUIRED', vatTreatment: 'TAXABLE' })
export const ACADEMY_LEGAL_VERSION = 'ACADEMY-LEGAL-DRAFT-2026-10-26'
export const ACADEMY_LEGAL_STATUS = 'DRAFT' as const

export class AcademyCommerceError extends Error {
  constructor(public readonly code: string) { super(code) }
}
export function commerceAssert(value: unknown, code: string): asserts value { if (!value) throw new AcademyCommerceError(code) }
export function normalizedAcademyEmail(email: string) { return z.email().max(320).parse(email.trim().toLowerCase()) }
export const academyOrderInput = z.object({
  courseCode: z.string().regex(/^WL-\d{3}$/), quantity: z.union([z.literal(1), z.literal(5)]),
  buyerType: z.enum(['CONSUMER', 'BUSINESS']), organizationId: z.uuid().optional(),
  promotionCode: z.string().trim().max(40).transform(value=>value.toUpperCase()||undefined).optional(), followUp: z.boolean().default(false), participantEmails: z.array(z.email().max(320)).max(5).default([]),
  billing: z.object({ name: z.string().trim().min(2).max(200), address: z.string().trim().min(2).max(200), postalCode: z.string().trim().min(3).max(20), city: z.string().trim().min(2).max(120), country: z.literal('NL') }).strict(),
  platformTermsAccepted: z.literal(true), academyTermsAccepted: z.literal(true), legalVersion: z.literal(ACADEMY_LEGAL_VERSION),
  idempotencyKey: z.string().regex(/^[a-zA-Z0-9:_-]{12,120}$/),
}).strict()

export function calculateAcademyPrice(input: { quantity: 1 | 5; followUp: boolean; eligibleParticipants: number }, decision: AcademyPriceDecision | null) {
  commerceAssert(decision, 'ACADEMY_PRICING_REVIEW_REQUIRED')
  commerceAssert(Number.isInteger(input.eligibleParticipants) && input.eligibleParticipants >= 0 && input.eligibleParticipants <= input.quantity, 'ACADEMY_BENEFIT_NOT_ESTABLISHED')
  commerceAssert(decision.vatTreatment !== 'EXEMPT' || (decision.vatRateBps === 0 && decision.taxStatus === 'APPROVED' && decision.exemptionLegalBasis), 'ACADEMY_TAX_EXEMPTION_NOT_ESTABLISHED')
  commerceAssert(!input.followUp || input.quantity === 5 || input.eligibleParticipants === 1, 'ACADEMY_BENEFIT_NOT_ESTABLISHED')
  const base = input.quantity === 1 ? ACADEMY_FIXED_PRICES.individual : ACADEMY_FIXED_PRICES.five
  const price = input.followUp ? (input.quantity === 1 ? ACADEMY_FIXED_PRICES.followUpIndividual : ACADEMY_FIXED_PRICES.five - 600 * input.eligibleParticipants) : base
  const net = (amount: number) => decision.basis === 'INCLUSIVE' ? Math.round(amount * 10000 / (10000 + decision.vatRateBps)) : amount
  const amountExclVatCents = net(price)
  const vatAmountCents = decision.basis === 'INCLUSIVE' ? price - amountExclVatCents : Math.round(amountExclVatCents * decision.vatRateBps / 10000)
  return Object.freeze({ baseAmountCents: net(base), packageDiscountCents: net(base) - amountExclVatCents, proDiscountCents: 0, discountCodeDiscountCents: 0,
    amountExclVatCents, vatRateBps: decision.vatRateBps, vatAmountCents, amountInclVatCents: amountExclVatCents + vatAmountCents, currency: 'EUR' as const })
}

export function verifiedAcademyPayment(purchase: { id: string; organizationId: string | null; amountInclVatCents: number; currency: string; molliePaymentId: string | null }, payment: { id: string; currency: string; amountValue: string; metadata: { purchaseId?: string; organizationId?: string } }) {
  const cents = /^\d+\.\d{2}$/.test(payment.amountValue) ? Number(payment.amountValue.replace('.', '')) : -1
  return payment.id === purchase.molliePaymentId && payment.metadata.purchaseId === purchase.id
    && (payment.metadata.organizationId ?? null) === purchase.organizationId && payment.currency === purchase.currency && cents === purchase.amountInclVatCents
}
