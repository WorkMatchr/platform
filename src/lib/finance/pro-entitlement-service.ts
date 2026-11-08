import type { Prisma } from '@/generated/prisma/client'
import { firstProPeriodEnd } from './pro-payment-source'

export async function findEffectiveProSubscription(
  transaction: Prisma.TransactionClient,
  organizationId: string,
  at = new Date(),
) {
  const subscription = await transaction.professionalSubscription.findFirst({
    where: {
      organizationId,
      status: 'ACTIVE',
      currentPeriodStart: { not: null },
      currentPeriodEnd: { gt: at },
      OR: [
        { cancelAtPeriodEnd: false },
        { cancellationEffectiveAt: { gt: at } },
      ],
    },
    select: {
      id: true,
      firstPaymentPurchase: {
        select: { id: true, organizationId: true, kind: true, status: true, paidAt: true, molliePaymentId: true },
      },
      firstPaymentAttempts: {
        where: { purchase: { organizationId, kind: 'PRO_SUBSCRIPTION', status: 'PAID', molliePaymentId: { not: null } } },
        select: { purchase: { select: { id: true, paidAt: true } } },
        take: 2,
      },
      payments: {
        where: { status: 'PAID', periodStart: { lte: at }, periodEnd: { gt: at } },
        select: { id: true },
        take: 1,
      },
    },
  })
  if (!subscription) return null
  if (subscription.payments.length) return { id: subscription.id }

  // The original checkout can expire and a linked first-payment retry can succeed.
  const first = subscription.firstPaymentPurchase
  const sources = new Map(subscription.firstPaymentAttempts.map(({ purchase }) => [purchase.id, purchase.paidAt]))
  if (first?.organizationId === organizationId && first.kind === 'PRO_SUBSCRIPTION' && first.status === 'PAID' && first.molliePaymentId) {
    sources.set(first.id, first.paidAt)
  }
  if (sources.size !== 1) return null
  const [start] = sources.values()
  return start && start <= at && at < firstProPeriodEnd(start) ? { id: subscription.id } : null
}
