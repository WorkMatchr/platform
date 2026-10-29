import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import type { PrismaClient } from '../../src/generated/prisma/client'
import type { MollieGateway, MolliePaymentSnapshot } from '../../src/lib/finance/mollie-gateway'

// Only used by the isolated notification database harness. No real provider keys
// or network transport are accepted; the ordinary purchase services stay intact.
export async function fundCommercialFixture(db: PrismaClient, actor: { id: string; email: string }, organizationId: string, unauthorizedActorId: string) {
  assert.ok(!process.env.RESEND_API_KEY && !process.env.MOLLIE_API_KEY && !process.env.JORTT_CLIENT_SECRET)
  globalThis.fetch = async () => { throw new Error('EXTERNAL_TRANSPORT_DISABLED_IN_WP16') }
  process.env.MOLLIE_API_KEY = `test_${randomUUID().replaceAll('-', '')}`
  process.env.MOLLIE_WEBHOOK_BASE_URL = 'https://example.invalid'
  process.env.MOLLIE_REDIRECT_BASE_URL = 'https://example.invalid'
  process.env.NEXT_PUBLIC_APP_URL = 'http://127.0.0.1:1'
  const { createCreditPurchase, processMolliePayment } = await import('../../src/lib/finance/financial-purchase-service')
  const { deliverFinancialInvoiceEmail } = await import('../../src/lib/finance/financial-invoice-delivery-service')
  const payments = new Map<string, MolliePaymentSnapshot>()
  let checkoutCalls = 0
  const unexpected = async (): Promise<never> => { throw new Error('UNEXPECTED_PROVIDER_OPERATION') }
  const gateway: MollieGateway = {
    createPayment: async input => {
      checkoutCalls++
      const payment: MolliePaymentSnapshot = { id: `tr_wp16${randomUUID().replaceAll('-', '')}`, status: 'pending', amountValue: input.amountValue, currency: input.currency, metadata: input.metadata, paidAt: null, createdAt: null, checkoutUrl: 'https://example.invalid/checkout', subscriptionId: null, mandateId: null, method: null }
      payments.set(payment.id, payment)
      return payment
    },
    getPayment: async id => { assert.ok(payments.has(id)); return payments.get(id)! },
    createRefund: unexpected, getRefund: unexpected, createCustomer: unexpected, getCustomer: unexpected,
    listFirstPaymentMethods: unexpected, listOneoffPaymentMethods: unexpected, listCustomerMandates: unexpected,
    createSubscription: unexpected, findCustomerSubscription: unexpected, cancelSubscription: unexpected,
  }
  const input = { actorUserId: actor.id, organizationId, packageSku: 'CREDITS_100', idempotencyKey: randomUUID(), billingAddress: { organizationName: 'Synthetic WP16', addressLine: 'Teststraat 1', postalCode: '1000 AA', city: 'Testplaats', countryCode: 'NL' } }
  const purchase = await createCreditPurchase(input, gateway)
  assert.equal((await createCreditPurchase(input, gateway)).id, purchase.id)
  assert.equal(checkoutCalls, 1)
  await assert.rejects(createCreditPurchase({ ...input, actorUserId: unauthorizedActorId }, gateway), { code: 'ACCESS_DENIED' })
  assert.equal(checkoutCalls, 1)
  const payment = payments.get(purchase.molliePaymentId!)!
  await processMolliePayment(payment.id, gateway)
  assert.equal(await db.creditTransaction.count({ where: { referenceId: purchase.id } }), 0)
  payments.set(payment.id, { ...payment, status: 'paid', paidAt: new Date().toISOString() })
  const race = await Promise.allSettled(Array.from({ length: 6 }, () => processMolliePayment(payment.id, gateway)))
  assert.ok(race.every(r => r.status === 'rejected' && r.reason instanceof Error && r.reason.message === 'INVOICE_EMAIL_NOT_ACCEPTED'))
  assert.equal(await db.creditTransaction.count({ where: { referenceId: purchase.id, type: 'PURCHASE' } }), 1)
  assert.equal(await db.financialInvoice.count({ where: { purchaseId: purchase.id } }), 1)
  assert.equal((await db.creditAccount.findUniqueOrThrow({ where: { organizationId } })).availableBalance, 100)
  const invoice = await db.financialInvoice.findUniqueOrThrow({ where: { purchaseId: purchase.id } })
  let accepted = 0
  const send: Parameters<typeof deliverFinancialInvoiceEmail>[1] = async email => {
    assert.equal(email.to, actor.email)
    assert.equal(email.idempotencyKey, `invoice-email:${invoice.id}`)
    accepted++
    return { accepted: true, transport: 'RESEND', status: 'ACCEPTED', messageId: 'synthetic-wp16-invoice' }
  }
  await deliverFinancialInvoiceEmail(invoice.id, send)
  await deliverFinancialInvoiceEmail(invoice.id, send)
  assert.equal(accepted, 1)
  await processMolliePayment(payment.id, gateway)
  assert.equal(await db.financialEvent.count({ where: { purchaseId: purchase.id, eventType: 'INVOICE_EMAIL_SENT' } }), 1)
  payments.set(payment.id, payment) // delayed pending event must not undo paid state
  await processMolliePayment(payment.id, gateway)
  assert.equal((await db.financialPurchase.findUniqueOrThrow({ where: { id: purchase.id } })).status, 'PAID')
  for (const status of ['canceled', 'failed', 'expired'] as const) {
    const canceled = await createCreditPurchase({ ...input, idempotencyKey: randomUUID() }, gateway)
    const pending = payments.get(canceled.molliePaymentId!)!
    payments.set(pending.id, { ...pending, status })
    await processMolliePayment(pending.id, gateway)
    assert.equal(await db.creditTransaction.count({ where: { referenceId: canceled.id } }), 0)
    assert.equal(await db.financialInvoice.count({ where: { purchaseId: canceled.id } }), 0)
  }
  delete process.env.MOLLIE_API_KEY
  console.log('WP16 PASS: real checkout/payment services, fake gateway, six replays, one purchase/ledger/invoice, failed-mail recovery, cancellation and unauthorized replay')
  return purchase
}
