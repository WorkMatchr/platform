import type { Prisma } from '@/generated/prisma/client'

export type ProEntitlementSnapshot = Readonly<{
  status: string
  cancelAtPeriodEnd: boolean
  cancellationEffectiveAt: Date | null
}>

export function hasEffectiveProEntitlement(subscription: ProEntitlementSnapshot | null | undefined, at = new Date()) {
  if (!subscription || subscription.status !== 'ACTIVE') return false
  return !subscription.cancelAtPeriodEnd
    || Boolean(subscription.cancellationEffectiveAt && subscription.cancellationEffectiveAt > at)
}

export async function findEffectiveProSubscription(
  transaction: Prisma.TransactionClient,
  organizationId: string,
  at = new Date(),
) {
  return transaction.professionalSubscription.findFirst({
    where: {
      organizationId,
      status: 'ACTIVE',
      OR: [
        { cancelAtPeriodEnd: false },
        { cancellationEffectiveAt: { gt: at } },
      ],
    },
  })
}
