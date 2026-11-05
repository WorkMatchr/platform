import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import type { PrismaClient } from '../../src/generated/prisma/client'
import type { MollieGateway, MolliePaymentSnapshot } from '../../src/lib/finance/mollie-gateway'

export async function fundF4Draft(db: PrismaClient, actor: { userId: string; organizationId: string }, runId: string, product: 'FIRST_SCAN' | 'FOLLOW_UP_SCAN' = 'FIRST_SCAN') {
  assert.ok(!process.env.RESEND_API_KEY && !process.env.MOLLIE_API_KEY && !process.env.JORTT_CLIENT_SECRET)
  const originalFetch = globalThis.fetch
  globalThis.fetch = async () => { throw new Error('EXTERNAL_TRANSPORT_DISABLED_F4') }
  process.env.F4_SYNTHETIC_ACCEPTANCE = 'true'
  process.env.MOLLIE_API_KEY = `test_${randomUUID().replaceAll('-', '')}`
  process.env.MOLLIE_WEBHOOK_BASE_URL = 'https://example.invalid'
  process.env.MOLLIE_REDIRECT_BASE_URL = 'https://example.invalid'
  const { prepareSyntheticF4Purchase } = await import('../../src/lib/compliance/compliance-f4-purchase')
  const { processMolliePayment } = await import('../../src/lib/finance/financial-purchase-service')
  const { deliverFinancialInvoiceEmail } = await import('../../src/lib/finance/financial-invoice-delivery-service')
  const payments = new Map<string, MolliePaymentSnapshot>()
  let calls = 0
  const unexpected = async (): Promise<never> => { throw new Error('UNEXPECTED_EXTERNAL_OPERATION') }
  const gateway: MollieGateway = {
    createPayment: async input => {
      calls++
      const payment: MolliePaymentSnapshot = { id: `tr_f4${randomUUID().replaceAll('-', '')}`, status: 'pending', amountValue: input.amountValue, currency: 'EUR', metadata: input.metadata, paidAt: null, createdAt: null, checkoutUrl: 'https://example.invalid/checkout', subscriptionId: null, mandateId: null, method: null }
      payments.set(payment.id, payment); return payment
    }, getPayment: async id => { assert.ok(payments.has(id)); return payments.get(id)! },
    createRefund: unexpected, getRefund: unexpected, createCustomer: unexpected, getCustomer: unexpected,
    listFirstPaymentMethods: unexpected, listOneoffPaymentMethods: unexpected, listCustomerMandates: unexpected,
    createSubscription: unexpected, findCustomerSubscription: unexpected, cancelSubscription: unexpected,
  }
  try {
    const billing = { organizationName: 'Synthetische F4 organisatie', addressLine: 'Teststraat 1', postalCode: '1000 AA', city: 'Testplaats', countryCode: 'NL' }
    const purchase = await prepareSyntheticF4Purchase(actor, runId, billing, gateway, product)
    assert.equal(purchase.amountExclVatCents, product === 'FIRST_SCAN' ? 2495 : 1495)
    assert.equal(purchase.vatAmountCents, product === 'FIRST_SCAN' ? 524 : 314)
    assert.equal(purchase.amountInclVatCents, product === 'FIRST_SCAN' ? 3019 : 1809)
    assert.equal((await prepareSyntheticF4Purchase(actor, runId, billing, gateway, product)).id, purchase.id)
    assert.equal(calls, 1)
    await assert.rejects(prepareSyntheticF4Purchase(actor, runId, billing, gateway, product === 'FIRST_SCAN' ? 'FOLLOW_UP_SCAN' : 'FIRST_SCAN'))
    const payment = payments.get(purchase.molliePaymentId!)!
    await processMolliePayment(payment.id, gateway)
    assert.equal((await db.financialPurchase.findUniqueOrThrow({ where: { id: purchase.id } })).status, 'PAYMENT_PENDING')
    const { assertF4PaidAccess } = await import('../../src/lib/compliance/compliance-f4-purchase')
    for (const status of ['failed', 'canceled', 'expired'] as const) {
      payments.set(payment.id, { ...payment, status })
      await processMolliePayment(payment.id, gateway)
      await assert.rejects(db.$transaction(tx => assertF4PaidAccess(tx, { id: runId, organizationId: actor.organizationId, completedByUserId: actor.userId })))
      assert.equal(await db.financialInvoice.count({ where: { purchaseId: purchase.id } }), 0)
    }
    payments.set(payment.id, { ...payment, status: 'paid', amountValue: '0.01', paidAt: new Date().toISOString() })
    await assert.rejects(processMolliePayment(payment.id, gateway))
    assert.equal(await db.financialInvoice.count({ where: { purchaseId: purchase.id } }), 0)
    payments.set(payment.id, { ...payment, status: 'paid', paidAt: new Date().toISOString() })
    const results = await Promise.allSettled(Array.from({ length: 6 }, () => processMolliePayment(payment.id, gateway)))
    assert.ok(results.every(r => r.status === 'rejected' && r.reason.message === 'INVOICE_EMAIL_NOT_ACCEPTED'))
    assert.equal(await db.creditTransaction.count({ where: { referenceId: purchase.id } }), 0)
    assert.equal(await db.financialInvoice.count({ where: { purchaseId: purchase.id } }), 1)
    const invoice = await db.financialInvoice.findUniqueOrThrow({ where: { purchaseId: purchase.id }, include: { lines: true } })
    assert.equal(invoice.lines[0].unit, 'scan'); assert.equal(invoice.servicePeriodStart, null)
    let accepted = 0
    await deliverFinancialInvoiceEmail(invoice.id, async () => { accepted++; return { accepted: true, transport: 'RESEND', status: 'ACCEPTED', messageId: 'synthetic-f4' } })
    await processMolliePayment(payment.id, gateway)
    assert.equal(accepted, 1)
    payments.set(payment.id, payment)
    await processMolliePayment(payment.id, gateway)
    assert.equal((await db.financialPurchase.findUniqueOrThrow({ where: { id: purchase.id } })).status, 'PAID')
    console.log(`F4 fake payment PASS: ${product}, approved excl/VAT/total cents; six callbacks/one invoice; zero credits; denied invalid/failed/canceled/expired; delayed pending; mocked mail recovery.`)
  } finally { globalThis.fetch = originalFetch; delete process.env.F4_SYNTHETIC_ACCEPTANCE; delete process.env.MOLLIE_API_KEY }
}
