import 'server-only'
import { getPrisma } from '@/lib/prisma'

// One indexed audit stream for the planner, independent of invitations or tenants.
const stream = { entityType: 'MARKETPLACE_DISPATCH', entityId: 'c594024e-e9ea-4d98-bf69-753b1231d960' }
export type DispatchCounters = { claimed: number; sent: number; retry: number; failed: number }

export async function claimDispatchSlot(now: number) {
  const slot = Math.floor(now / 900_000)
  const result = await getPrisma().marketplaceAuditEvent.createMany({
    data: [{ ...stream, actorRole: 'SYSTEM', action: 'RUNNING', correlationKey: 'marketplace:dispatch:' + slot }],
    skipDuplicates: true,
  })
  return result.count === 1
}

export async function finishDispatch(action: 'COMPLETED' | 'FAILED', counters: DispatchCounters) {
  await getPrisma().marketplaceAuditEvent.create({
    data: { ...stream, actorRole: 'SYSTEM', action, metadata: counters },
  })
}

export async function readDispatchStatus() {
  const db = getPrisma()
  const now = new Date()
  const mail = { templateKey: 'MARKETPLACE_INVITATION', channel: 'EMAIL' }
  const [latest, completed, ready, expiredLeases] = await db.$transaction([
    db.marketplaceAuditEvent.findFirst({ where: stream, orderBy: [{ createdAt: 'desc' }, { action: 'asc' }], select: { action: true } }),
    db.marketplaceAuditEvent.findFirst({ where: { ...stream, action: 'COMPLETED' }, orderBy: { createdAt: 'desc' },
      select: { createdAt: true, metadata: true } }),
    db.notificationOutbox.count({ where: { ...mail, status: 'PENDING', availableAt: { lte: now } } }),
    db.notificationOutbox.count({ where: { ...mail, status: 'PROCESSING', OR: [{ leaseUntil: null }, { leaseUntil: { lte: now } }] } }),
  ], { isolationLevel: 'RepeatableRead' })
  return { lastSuccessfulAt: completed?.createdAt ?? null, counters: completed?.metadata ?? null,
    status: latest?.action ?? 'NEVER', ready, expiredLeases }
}
