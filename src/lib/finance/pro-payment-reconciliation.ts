import 'server-only'
import { z } from 'zod'
import { getPrisma } from '@/lib/prisma'
import { requireMarketplacePlatformAdmin } from '@/lib/marketplace/marketplace-authorization'
import { createMollieGateway, type MollieGateway } from './mollie-gateway'
import { processRecurringProPayment } from './subscription-service'

/** Bounded, explicit operator recovery; no automatic historical backfill on deployment. */
export async function reconcileProPayments(input: unknown, gateway: MollieGateway = createMollieGateway()) {
  const values = z.object({ actorUserId: z.string().uuid(), subscriptionId: z.string().uuid(),
    after: z.date(), reason: z.string().trim().min(10).max(500) }).parse(input)
  const prisma = getPrisma()
  await requireMarketplacePlatformAdmin(prisma, values.actorUserId)
  if (!gateway.listSubscriptionPayments) throw new Error('MOLLIE_RECONCILIATION_UNAVAILABLE')
  const subscription = await prisma.professionalSubscription.findUniqueOrThrow({ where: { id: values.subscriptionId } })
  if (!subscription.mollieCustomerId || !subscription.mollieSubscriptionId || values.after > new Date()) throw new Error('PRO_RECONCILIATION_SOURCE_REQUIRED')
  const customer = await gateway.getCustomer(subscription.mollieCustomerId)
  if (customer.organizationId !== subscription.organizationId) throw new Error('MOLLIE_CUSTOMER_MISMATCH')
  const payments = await gateway.listSubscriptionPayments({ customerId: customer.id, subscriptionId: subscription.mollieSubscriptionId, after: values.after })
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
