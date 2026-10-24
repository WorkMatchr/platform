import { beforeEach, expect, it, vi } from 'vitest'
import type { MollieGateway, MolliePaymentSnapshot } from './mollie-gateway'
vi.mock('server-only', () => ({}))
const mocks = vi.hoisted(() => ({ authorize: vi.fn(), find: vi.fn(), update: vi.fn(), event: vi.fn(), credit: vi.fn(), bonus: vi.fn(), invoice: vi.fn(), delivery: vi.fn() }))
const transaction = { $queryRaw: vi.fn(), financialPurchase: { findUnique: mocks.find, findUniqueOrThrow: mocks.find, update: mocks.update }, financialPaymentEvent: { upsert: mocks.event }, discountRedemption: { updateMany: vi.fn() } }
vi.mock('@/lib/marketplace/marketplace-authorization', () => ({ requireProviderMarketplaceAccess: mocks.authorize }))
vi.mock('@/lib/prisma', () => ({ getPrisma: () => ({ financialPurchase: { findUnique: mocks.find }, financialEvent: { upsert: mocks.event } }) }))
vi.mock('./financial-transaction', () => ({ runSerializableFinancialTransaction: (fn: (value: typeof transaction) => unknown) => fn(transaction) }))
vi.mock('@/lib/credits/credit-wallet-service', () => ({ recordVerifiedPurchaseCreditsInTransaction: mocks.credit, recordVerifiedDiscountBonusInTransaction: mocks.bonus }))
vi.mock('./invoice-service', () => ({ issueInvoiceForPaidPurchase: mocks.invoice }))
vi.mock('./financial-invoice-delivery-service', () => ({ deliverFinancialInvoiceEmail: mocks.delivery, recordFinancialInvoiceEmailFailure: vi.fn() }))
import { createCreditPurchase, processMolliePayment } from './financial-purchase-service'
const purchase = { id: 'purchase', organizationId: 'organization', createdByUserId: 'actor', kind: 'CREDIT_PACKAGE', status: 'PAYMENT_PENDING', currency: 'EUR', amountInclVatCents: 3025 }
const payment: MolliePaymentSnapshot = { id: 'tr_synthetic', status: 'paid', amountValue: '30.25', currency: 'EUR', metadata: { purchaseId: purchase.id, organizationId: purchase.organizationId }, paidAt: '2026-10-01T12:00:00Z', createdAt: null, checkoutUrl: null, subscriptionId: null, mandateId: null, method: null }
const gateway = (change = {}) => ({ getPayment: vi.fn().mockResolvedValue({ ...payment, ...change }) }) as unknown as MollieGateway
beforeEach(() => { vi.resetAllMocks(); mocks.find.mockResolvedValue(purchase); mocks.invoice.mockResolvedValue({ id: 'invoice' }) })
it.each([
  { id: 'tr_other' }, { amountValue: '0.01' }, { currency: 'USD' }, { metadata: { purchaseId: 'other', organizationId: 'organization' } }, { metadata: { purchaseId: 'purchase', organizationId: 'other' } },
])('weigert onjuiste provideridentiteit, prijs of tenant: %j', async change => {
  await expect(processMolliePayment(payment.id, gateway(change))).rejects.toThrow('MOLLIE_PAYMENT_MISMATCH')
  expect(mocks.credit).not.toHaveBeenCalled(); expect(mocks.invoice).not.toHaveBeenCalled()
})
it.each(['open', 'pending', 'failed', 'canceled', 'expired'])('kent geen credits toe bij %s', async status => {
  await processMolliePayment(payment.id, gateway({ status }))
  expect(mocks.credit).not.toHaveBeenCalled(); expect(mocks.invoice).not.toHaveBeenCalled(); expect(mocks.delivery).not.toHaveBeenCalled()
})
it('verwerkt uitsluitend de server-side bevestigde betaling en bestaande idempotentiesleutel', async () => {
  await processMolliePayment(payment.id, gateway())
  expect(mocks.credit).toHaveBeenCalledWith(transaction, { purchaseId: 'purchase', idempotencyKey: 'financial-purchase:purchase' })
  expect(mocks.invoice).toHaveBeenCalledWith(transaction, 'purchase')
})
it.each(['REFUND_REVIEW_REQUIRED', 'PARTIALLY_REFUNDED', 'REFUNDED'])('overschrijft geen latere refundstatus %s bij betaalreplay', async status => {
  mocks.find.mockResolvedValue({ ...purchase, status })
  const result = await processMolliePayment(payment.id, gateway())
  expect(result?.status).toBe(status)
  expect(mocks.update).not.toHaveBeenCalled(); expect(mocks.credit).not.toHaveBeenCalled(); expect(mocks.delivery).not.toHaveBeenCalled()
})
it('overschrijft een betaalde aankoop niet met een vertraagd pending antwoord', async () => {
  mocks.find.mockResolvedValue({ ...purchase, status: 'PAID' })
  const result = await processMolliePayment(payment.id, gateway({ status: 'pending' }))
  expect(result?.status).toBe('PAID'); expect(mocks.update).not.toHaveBeenCalled()
})
it('controleert actuele autorisatie vóór teruggeven van een bestaande checkout', async () => {
  const input = { actorUserId: '11111111-1111-4111-8111-111111111111', organizationId: '22222222-2222-4222-8222-222222222222', packageSku: 'CREDITS_25', idempotencyKey: 'wp08-checkout-replay', billingAddress: { organizationName: 'Synthetische organisatie', addressLine: 'Teststraat 1', postalCode: '1000 AA', city: 'Testplaats', countryCode: 'NL' } }
  mocks.find.mockResolvedValue({ ...input, molliePaymentId: 'tr_synthetic', mollieCheckoutUrl: 'https://example.invalid/checkout' })
  mocks.authorize.mockRejectedValue(new Error('ACCESS_DENIED'))
  await expect(createCreditPurchase(input, gateway())).rejects.toThrow('ACCESS_DENIED')
})
