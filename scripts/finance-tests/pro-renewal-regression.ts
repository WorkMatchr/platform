import { registerHooks } from 'node:module'
registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier === 'server-only') return { url: 'data:text/javascript,export default {}', shortCircuit: true }
  return nextResolve(specifier, context)
} })

import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { Prisma } from '../../src/generated/prisma/client'
import { getPrisma } from '../../src/lib/prisma'
async function main() {
  const url = new URL(process.env.DATABASE_URL!)
  assert.equal(url.hostname, '127.0.0.1')
  assert.match(url.pathname, /^\/workmatchr_b4_[a-f0-9]{12}$/)
  const prisma = getPrisma()
  try {
    assert.equal(await prisma.organization.count(), 0)
    const organization = await prisma.organization.create({ data: { name: 'TEST-WM Finance Professional', organizationType: 'PROVIDER', status: 'ACTIVE' } })
    const user = await prisma.user.create({ data: { email: `finance-${randomUUID()}@example.invalid`, accountType: 'PROFESSIONAL', status: 'ACTIVE', emailVerified: true } })
    await prisma.providerProfile.create({ data: { organizationId: organization.id } })
    await prisma.organizationMembership.create({ data: { userId: user.id, organizationId: organization.id, role: 'OWNER', status: 'ACTIVE' } })
    const { processRecurringProPayment } = await import('../../src/lib/finance/subscription-service')
    const startedAt = new Date('2026-09-04T19:00:48Z')
    const pricing = {
      amountExclVatCents: 4900, vatRateBps: 2100, vatAmountCents: 1029,
      amountInclVatCents: 5929, currency: 'EUR',
    }
    const purchase = {
      ...pricing, organizationId: organization.id, createdByUserId: user.id,
      kind: 'PRO_SUBSCRIPTION' as const, packageSku: 'WORKMATCHR_PRO',
      packageLabel: 'Synthetic Pro', credits: 0, baseAmountCents: 4900,
      discountCodeSnapshot: Prisma.DbNull, terminalAt: startedAt,
      billingOrganizationName: 'Synthetic company', billingAddressLine: 'Teststraat 1',
      billingPostalCode: '1000 AA', billingCity: 'Testplaats', billingCountryCode: 'NL',
    }
    const failedFirst = await prisma.financialPurchase.create({
      data: { ...purchase, status: 'EXPIRED', molliePaymentId: 'tr_p1first', idempotencyKey: randomUUID() },
    })
    const paidRetry = await prisma.financialPurchase.create({
      data: { ...purchase, status: 'PAID', paidAt: startedAt, molliePaymentId: 'tr_p1retry', idempotencyKey: randomUUID() },
    })
    const pro = await prisma.professionalSubscription.create({ data: {
      ...pricing, organizationId: organization.id, status: 'ACTIVE', planCode: purchase.packageSku,
      planLabel: purchase.packageLabel, mollieCustomerId: 'cst_p1', mollieSubscriptionId: 'sub_p1',
      mollieMandateId: 'mdt_p1', mollieMandateMethod: 'directdebit', mollieMandateStatus: 'valid',
      mollieMandateVerifiedAt: startedAt, firstPaymentPurchaseId: failedFirst.id,
      currentPeriodStart: startedAt, currentPeriodEnd: new Date('2026-10-04T19:00:48Z'),
    } })
    await prisma.professionalSubscriptionFirstPaymentAttempt.create({
      data: { subscriptionId: pro.id, purchaseId: paidRetry.id, attemptNumber: 1 },
    })
    const { issueInvoiceForPaidPurchase } = await import('../../src/lib/finance/invoice-service')
    await prisma.$transaction(transaction => issueInvoiceForPaidPurchase(transaction, paidRetry.id))
    const recurring = (id: string, date: string, status: 'paid' | 'failed' = 'paid') => ({
      id, status, createdAt: date, paidAt: status === 'paid' ? date : null, checkoutUrl: null,
      amountValue: '59.29', currency: pricing.currency, subscriptionId: 'sub_p1', mandateId: 'mdt_p1',
      method: 'directdebit', metadata: { subscriptionId: pro.id, organizationId: organization.id },
    })
    const october = recurring('tr_test_october', '2026-10-04T19:00:48Z')
    const november = recurring('tr_test_november', '2026-11-04T19:00:48Z')
    const charge = (snapshot: typeof october) => processRecurringProPayment(snapshot)
    const subscription = () => prisma.professionalSubscription.findUniqueOrThrow({ where: { id: pro.id } })
    const invoiceCount = (id: string) => prisma.financialInvoice.count({ where: { molliePaymentId: id } })
    const records = (id: string) => prisma.professionalSubscriptionPayment.count({ where: { molliePaymentId: id, status: 'PAID' } })
    // Fault injection is confined to the new loopback database checked at entry.
    await prisma.$executeRawUnsafe(`CREATE FUNCTION test_invoice_failure() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN RAISE EXCEPTION 'synthetic invoice fault'; END $$`)
    await prisma.$executeRawUnsafe(`CREATE TRIGGER test_invoice_failure BEFORE INSERT ON "FinancialInvoice"
      FOR EACH ROW EXECUTE FUNCTION test_invoice_failure()`)
    try {
      await assert.rejects(charge(november), /synthetic invoice fault/)
      assert.equal(await records(november.id), 0)
      assert.equal(await invoiceCount(november.id), 0)
      assert.equal(await prisma.financialEvent.count({ where: { subscriptionId: pro.id, eventType: 'PRO_PAYMENT_PROCESSING_FAILED' } }), 1)
    } finally {
      await prisma.$executeRawUnsafe('DROP TRIGGER test_invoice_failure ON "FinancialInvoice"')
      await prisma.$executeRawUnsafe('DROP FUNCTION test_invoice_failure()')
    }
    await Promise.all([charge(november), charge(november)])
    await charge(october)
    for (const snapshot of [october, november]) {
      assert.equal(await records(snapshot.id), 1)
      assert.equal(await invoiceCount(snapshot.id), 1)
      const invoice = await prisma.financialInvoice.findFirstOrThrow({ where: { molliePaymentId: snapshot.id } })
      assert.equal(invoice.organizationId, organization.id)
      assert.equal(invoice.amountInclVatCents, 5929)
      assert.equal(invoice.vatAmountCents, 1029)
      assert.ok(invoice.subscriptionPaymentId)
      assert.equal(await prisma.financialJorttSync.count({ where: { invoiceId: invoice.id } }), 1)
    }
    const stale = recurring('tr_test_stale', '2026-09-11T19:00:48Z', 'failed')
    await charge(stale)
    await charge(stale)
    assert.equal((await subscription()).currentPeriodEnd?.toISOString(), '2026-12-04T19:00:48.000Z')
    assert.equal((await subscription()).status, 'ACTIVE')
    assert.equal((await subscription()).retryCount, 0)
    const latest = recurring('tr_test_december', '2026-12-04T19:44:00Z', 'failed')
    await Promise.all([charge(latest), charge(latest)])
    assert.equal((await subscription()).status, 'PAST_DUE')
    assert.equal((await subscription()).retryCount, 1)
    await charge(recurring('tr_test_paid_retry', '2026-12-04T20:00:00Z'))
    await charge(latest)
    assert.equal((await subscription()).status, 'ACTIVE')
    assert.equal((await subscription()).retryCount, 0)
    for (const observation of [{ amountRefunded: { value: '10.00', currency: 'EUR' } },
      { amountChargedBack: { value: '59.29', currency: 'EUR' } }]) {
      await charge({ ...october, ...observation })
      await charge({ ...october, ...observation })
    }
    assert.equal(await prisma.financialEvent.count({ where: { eventType: 'PRO_REVERSAL_REVIEW', subscriptionId: pro.id } }), 2)
    assert.equal(await invoiceCount(october.id), 1)
    assert.equal((await subscription()).currentPeriodEnd?.toISOString(), '2027-01-04T19:00:48.000Z')
    console.log('PASS paid retry source, two renewals, rollback and replay, monthly coverage, repeated failure, recovery, refund and chargeback observations, Jortt queue')
  } finally { await prisma.$disconnect() }
}
main().catch(error => { console.error(error); process.exitCode = 1 })
