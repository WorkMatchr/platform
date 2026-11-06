import 'server-only'
import { z } from 'zod'
import { getPrisma } from '@/lib/prisma'
import { requireMarketplacePlatformAdmin } from '@/lib/marketplace/marketplace-authorization'
import { createMollieGateway, type MollieGateway } from './mollie-gateway'
import { processRecurringProPayment } from './subscription-service'

/** Bounded, explicit operator recovery; no automatic historical backfill on deployment. */
export async function reconcileProPayments(input: unknown, gateway: MollieGateway = createMollieGateway()) {
  const values = z.object({ actorUserId: z.string().uuid(), subscriptionId: z.string().uuid(),
    after: z.date().optional(), paymentId: z.string().regex(/^tr_[A-Za-z0-9]+$/).max(100).optional(),
    reason: z.string().trim().min(10).max(500) })
    .refine(value => Boolean(value.paymentId) !== Boolean(value.after), 'Choose one exact payment or a date range').parse(input)
  const prisma = getPrisma()
  await requireMarketplacePlatformAdmin(prisma, values.actorUserId)
  const subscription = await prisma.professionalSubscription.findUniqueOrThrow({ where: { id: values.subscriptionId } })
  if (!subscription.mollieCustomerId || !subscription.mollieSubscriptionId || (values.after && values.after > new Date())) throw new Error('PRO_RECONCILIATION_SOURCE_REQUIRED')
  const customer = await gateway.getCustomer(subscription.mollieCustomerId)
  if (customer.id !== subscription.mollieCustomerId || customer.organizationId !== subscription.organizationId) throw new Error('MOLLIE_CUSTOMER_MISMATCH')
  let payments
  if (values.paymentId) {
    const payment = await gateway.getPayment(values.paymentId)
    // An approved historical recovery must never expand to another payment or status.
    if (payment.id !== values.paymentId || payment.status !== 'paid') throw new Error('PRO_RECONCILIATION_PAYMENT_MISMATCH')
    payments = [payment]
  } else {
    if (!gateway.listSubscriptionPayments || !values.after) throw new Error('MOLLIE_RECONCILIATION_UNAVAILABLE')
    payments = await gateway.listSubscriptionPayments({ customerId: customer.id, subscriptionId: subscription.mollieSubscriptionId, after: values.after })
  }
  const result = { inspected: payments.length, processed: 0, failed: 0 }
  for (const payment of [...payments].sort((a, b) => (a.createdAt ?? '').localeCompare(b.createdAt ?? ''))) {
    await requireMarketplacePlatformAdmin(prisma, values.actorUserId)
    if (payment.subscriptionId !== subscription.mollieSubscriptionId) throw new Error('MOLLIE_PAYMENT_MISMATCH')
    try {
      await processRecurringProPayment(payment)
      await prisma.financialEvent.upsert({ where: { idempotencyKey: `pro-reconciled:${payment.id}:${payment.status}` }, create: {
        actorUserId: values.actorUserId, subscriptionId: subscription.id, eventType: 'PRO_PAYMENT_RECONCILED', result: 'SUCCEEDED',
        reason: values.reason, idempotencyKey: `pro-reconciled:${payment.id}:${payment.status}`, metadata: { paymentId: payment.id, status: payment.status },
      }, update: {} })
      result.processed++
    } catch { result.failed++ }
  }
  return result
}
