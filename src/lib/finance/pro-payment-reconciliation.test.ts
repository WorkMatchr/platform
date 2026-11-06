import { beforeEach, expect, it, vi } from 'vitest'
import type { MollieGateway, MolliePaymentSnapshot } from './mollie-gateway'

const mocks = vi.hoisted(() => ({ authorize: vi.fn(), subscription: vi.fn(), process: vi.fn(), audit: vi.fn(), customer: vi.fn(), payment: vi.fn(), list: vi.fn() }))
vi.mock('@/lib/prisma', () => ({ getPrisma: () => ({ professionalSubscription: { findUniqueOrThrow: mocks.subscription }, financialEvent: { upsert: mocks.audit } }) }))
vi.mock('@/lib/marketplace/marketplace-authorization', () => ({ requireMarketplacePlatformAdmin: mocks.authorize }))
vi.mock('./subscription-service', () => ({ processRecurringProPayment: mocks.process }))
import { reconcileProPayments } from './pro-payment-reconciliation'

const actorUserId = '10000000-0000-4000-8000-000000000001'
const subscriptionId = '20000000-0000-4000-8000-000000000001'
const organizationId = '30000000-0000-4000-8000-000000000001'
const input = { actorUserId, subscriptionId, paymentId: 'tr_syntheticOctober', reason: 'Synthetic individually approved recovery' }
const payment: MolliePaymentSnapshot = { id: input.paymentId, status: 'paid', subscriptionId: 'sub_synthetic', amountValue: '59.29', currency: 'EUR',
  metadata: { subscriptionId, organizationId }, paidAt: '2026-10-06T12:00:00Z', createdAt: '2026-10-04T12:00:00Z', mandateId: 'mdt_synthetic', method: 'directdebit', checkoutUrl: null }
const gateway = { getCustomer: mocks.customer, getPayment: mocks.payment, listSubscriptionPayments: mocks.list } as unknown as MollieGateway

beforeEach(() => {
  vi.resetAllMocks()
  mocks.subscription.mockResolvedValue({ id: subscriptionId, organizationId, mollieCustomerId: 'cst_synthetic', mollieSubscriptionId: 'sub_synthetic' })
  mocks.customer.mockResolvedValue({ id: 'cst_synthetic', organizationId })
  mocks.payment.mockResolvedValue(payment)
  mocks.list.mockResolvedValue([payment])
})

it('reads and processes only the individually approved payment, with operator audit', async () => {
  expect(await reconcileProPayments(input, gateway)).toEqual({ inspected: 1, processed: 1, failed: 0 })
  expect(mocks.payment).toHaveBeenCalledExactlyOnceWith(input.paymentId)
  expect(mocks.list).not.toHaveBeenCalled()
  expect(mocks.process).toHaveBeenCalledExactlyOnceWith(payment)
  expect(mocks.authorize).toHaveBeenCalledTimes(2)
  expect(mocks.audit).toHaveBeenCalledWith(expect.objectContaining({
    where: { idempotencyKey: `pro-reconciled:${payment.id}:paid` },
    create: expect.objectContaining({ actorUserId, subscriptionId, reason: input.reason }), update: {},
  }))
})

it.each(['pending', 'failed', 'canceled', 'expired', 'open'])('rejects non-final provider state %s without processing', async status => {
  mocks.payment.mockResolvedValue({ ...payment, status })
  await expect(reconcileProPayments(input, gateway)).rejects.toThrow('PRO_RECONCILIATION_PAYMENT_MISMATCH')
  expect(mocks.process).not.toHaveBeenCalled(); expect(mocks.audit).not.toHaveBeenCalled()
})

it.each([{ id: 'tr_other' }, { subscriptionId: 'sub_other' }])('rejects mismatched payment identity %o', async override => {
  mocks.payment.mockResolvedValue({ ...payment, ...override })
  await expect(reconcileProPayments(input, gateway)).rejects.toThrow('MISMATCH')
  expect(mocks.process).not.toHaveBeenCalled()
})

it.each([{ id: 'cst_other', organizationId }, { id: 'cst_synthetic', organizationId: 'other' }])('rejects a wrong customer or tenant %o', async customer => {
  mocks.customer.mockResolvedValue(customer)
  await expect(reconcileProPayments(input, gateway)).rejects.toThrow('MOLLIE_CUSTOMER_MISMATCH')
  expect(mocks.payment).not.toHaveBeenCalled(); expect(mocks.process).not.toHaveBeenCalled()
})

it('rejects an unauthorized actor before reading provider or tenant records', async () => {
  mocks.authorize.mockRejectedValueOnce(new Error('ACCESS_DENIED'))
  await expect(reconcileProPayments(input, gateway)).rejects.toThrow('ACCESS_DENIED')
  expect(mocks.subscription).not.toHaveBeenCalled(); expect(mocks.customer).not.toHaveBeenCalled()
})

it('rechecks operator permission after the provider read', async () => {
  mocks.authorize.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('ACCESS_REVOKED'))
  await expect(reconcileProPayments(input, gateway)).rejects.toThrow('ACCESS_REVOKED')
  expect(mocks.process).not.toHaveBeenCalled()
})

it.each(['', 'tr_', 'tr_../../other', 'tr_' + 'a'.repeat(101)])('never falls back to a broad query for invalid ID %s', async paymentId => {
  await expect(reconcileProPayments({ ...input, paymentId }, gateway)).rejects.toThrow()
  expect(mocks.list).not.toHaveBeenCalled(); expect(mocks.process).not.toHaveBeenCalled()
})

it('rejects ambiguous exact-payment plus date-range instructions', async () => {
  await expect(reconcileProPayments({ ...input, after: new Date('2026-09-01') }, gateway)).rejects.toThrow()
  expect(mocks.process).not.toHaveBeenCalled()
})

it('retains the separately authorized date-range workflow', async () => {
  const after = new Date('2026-09-01')
  expect(await reconcileProPayments({ actorUserId, subscriptionId, after, reason: input.reason }, gateway)).toEqual({ inspected: 1, processed: 1, failed: 0 })
  expect(mocks.list).toHaveBeenCalledExactlyOnceWith({ customerId: 'cst_synthetic', subscriptionId: 'sub_synthetic', after })
  expect(mocks.payment).not.toHaveBeenCalled()
})

it('reports a failed processing or audit confirmation without claiming recovery', async () => {
  mocks.process.mockRejectedValueOnce(new Error('SYNTHETIC_INVOICE_FAILURE'))
  expect(await reconcileProPayments(input, gateway)).toEqual({ inspected: 1, processed: 0, failed: 1 })
  expect(mocks.audit).not.toHaveBeenCalled()
  mocks.audit.mockRejectedValueOnce(new Error('SYNTHETIC_LOST_CONFIRMATION'))
  expect(await reconcileProPayments(input, gateway)).toEqual({ inspected: 1, processed: 0, failed: 1 })
  expect(await reconcileProPayments(input, gateway)).toEqual({ inspected: 1, processed: 1, failed: 0 })
})
