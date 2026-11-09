import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { mock } from 'node:test'
import { createCreditPurchase, previewCreditPurchasePrice } from '../../src/lib/finance/financial-purchase-service'
import type { MollieGateway, MolliePaymentSnapshot } from '../../src/lib/finance/mollie-gateway'
import { findEffectiveProSubscription } from '../../src/lib/finance/pro-entitlement-service'
import { processRecurringProPayment } from '../../src/lib/finance/subscription-service'
import { getPrisma } from '../../src/lib/prisma'

// Called only by the loopback-only P1 runner with external HTTP disabled.
export async function verifyPaidProPricing(input: {
  actorUserId: string
  organizationId: string
  subscriptionId: string
  freeUserId: string
  freeOrganizationId: string
  renewal: MolliePaymentSnapshot
}) {
  const { actorUserId, organizationId, subscriptionId, renewal } = input
  const prisma = getPrisma()
  const order = { actorUserId, organizationId, packageSku: 'CREDITS_50' }
  const billingAddress = { organizationName: 'Synthetic BV', addressLine: 'Teststraat 1', postalCode: '1000 AA', city: 'Testplaats' }
  const gateway: Pick<MollieGateway, 'createPayment'> = {
    async createPayment({ amountValue, metadata }) {
      return { ...renewal, id: 'tr_' + randomUUID(), amountValue, metadata, status: 'open', paidAt: null,
        checkoutUrl: 'https://checkout.example.invalid', subscriptionId: null, mandateId: null }
    },
  }
  const checkout = (idempotencyKey = randomUUID()) => createCreditPurchase({ ...order, billingAddress, idempotencyKey }, gateway)
  async function checkPrice(discount: number) {
    const preview = await previewCreditPurchasePrice(order)
    const purchase = await checkout()
    assert.equal(preview.proDiscountCents, discount)
    assert.equal(purchase.proDiscountCents, discount)
    assert.equal(purchase.amountExclVatCents, 5000 - discount)
    assert.equal(purchase.amountInclVatCents, preview.amountInclVatCents)
  }
  const start = Date.parse('2026-09-04T19:00:48Z')
  const end = Date.parse('2026-10-04T19:00:48Z')
  const where = { id: subscriptionId }
  const config = { MOLLIE_API_KEY: 'test_' + '0'.repeat(30), MOLLIE_REDIRECT_BASE_URL: 'https://redirect.example.invalid',
    MOLLIE_WEBHOOK_BASE_URL: 'https://webhook.example.invalid' }
  const previous = Object.entries(config).map(([key]) => [key, process.env[key]] as const)
  mock.timers.enable({ apis: ['Date'], now: start })
  try {
    Object.assign(process.env, config)
    assert.equal(await findEffectiveProSubscription(prisma, organizationId, new Date(start - 1)), null)
    await checkPrice(500)
    const free = { ...order, actorUserId: input.freeUserId, organizationId: input.freeOrganizationId }
    assert.equal((await previewCreditPurchasePrice(free)).amountInclVatCents, 6050)
    const freePurchase = await createCreditPurchase({ ...free, billingAddress, idempotencyKey: randomUUID() }, gateway)
    assert.equal(freePurchase.proDiscountCents, 0)
    assert.equal(freePurchase.amountInclVatCents, 6050)
    // A scheduled cancellation can truncate even an evidenced paid period.
    await prisma.professionalSubscription.update({ where, data: { cancelAtPeriodEnd: true,
      cancellationRequestedAt: new Date(start), cancellationEffectiveAt: new Date(end - 1) } })
    assert.ok(await findEffectiveProSubscription(prisma, organizationId, new Date(end - 2)))
    assert.equal(await findEffectiveProSubscription(prisma, organizationId, new Date(end - 1)), null)
    await prisma.professionalSubscription.update({ where, data: { cancelAtPeriodEnd: false,
      cancellationRequestedAt: null, cancellationEffectiveAt: null } })
    mock.timers.setTime(end - 1)
    await checkPrice(500)
    mock.timers.setTime(end)
    assert.equal((await prisma.professionalSubscription.findUniqueOrThrow({ where })).status, 'ACTIVE')
    await checkPrice(0)
    mock.timers.setTime(end + 1)
    await checkPrice(0)
    await processRecurringProPayment({ ...renewal, status: 'failed', paidAt: null })
    assert.equal((await prisma.professionalSubscription.findUniqueOrThrow({ where })).status, 'PAST_DUE')
    assert.equal(await findEffectiveProSubscription(prisma, organizationId, new Date(end - 1)), null)
    await checkPrice(0)
    const replayKey = randomUUID()
    const beforeRenewal = await checkout(replayKey)
    mock.timers.setTime(end + 3 * 86_400_000)
    const [concurrent] = await Promise.all([checkout(), processRecurringProPayment(renewal)])
    assert.ok([0, 500].includes(concurrent.proDiscountCents))
    assert.equal(concurrent.amountExclVatCents, 5000 - concurrent.proDiscountCents)
    assert.equal(concurrent.amountInclVatCents, concurrent.proDiscountCents ? 5445 : 6050)
    await checkPrice(500)
    await processRecurringProPayment(renewal)
    await checkPrice(500)
    const replay = await checkout(replayKey)
    assert.equal(replay.id, beforeRenewal.id)
    assert.equal(replay.proDiscountCents, 0)
    assert.equal(await prisma.professionalSubscriptionPayment.count({ where: { molliePaymentId: renewal.id, status: 'PAID' } }), 1)
    console.log('FIN-04 PASS: paid first retry, boundary, cancellation, expired ACTIVE, unpaid/failed renewal, PAST_DUE, delayed/duplicate paid renewal, concurrent checkout, immutable replay and free pricing')
  } finally {
    mock.timers.reset()
    for (const [key, value] of previous) {
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
  }
}
