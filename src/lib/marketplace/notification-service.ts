import { getPrisma } from '@/lib/prisma'
import { MarketplaceServiceError } from './marketplace-errors'

export async function getMarketplaceNotifications(userId: string, limit = 25) {
  return getPrisma().marketplaceNotification.findMany({
    where: { recipientUserId: userId },
    orderBy: { createdAt: 'desc' },
    take: Math.max(1, Math.min(limit, 50)),
    select: { id: true, type: true, title: true, body: true, targetRoute: true, createdAt: true, readAt: true },
  })
}

export async function markMarketplaceNotificationRead(userId: string, notificationId: string) {
  const updated = await getPrisma().marketplaceNotification.updateMany({
    where: { id: notificationId, recipientUserId: userId, readAt: null },
    data: { readAt: new Date(), readByUserId: userId },
  })
  if (updated.count === 0) {
    const existing = await getPrisma().marketplaceNotification.findFirst({ where: { id: notificationId, recipientUserId: userId } })
    if (!existing) throw new MarketplaceServiceError('NOT_FOUND')
  }
}
