import 'server-only'
import { createHash } from 'node:crypto'
import type { Prisma } from '@/generated/prisma/client'
import { requireMarketplacePlatformAdmin } from '@/lib/marketplace/marketplace-authorization'
import { runSerializableFinancialTransaction } from './financial-transaction'

// Pin the two approved provider identities without publishing live references.
const periods = new Map([
  ['2391bb08c67fa794b41a494c2f8c2b33d98f9d9fcd7b471dd2aaa3737380a749', '2026-10-04'],
  ['fc08e350b34b334280c47de7159d1ec4ede1d0db87bfa19f10d63d63d286109b', '2026-11-04'],
])

export function historicalRecoveryDate(paymentId: string | null) {
  return paymentId ? periods.get(createHash('sha256').update(paymentId).digest('hex')) : undefined
}

export async function holdHistoricalInvoice(tx: Prisma.TransactionClient, invoiceId: string, actorUserId: string) {
  await tx.financialEvent.create({ data: { invoiceId, actorUserId, eventType: 'PRO_RECOVERY_JORTT_HELD',
    result: 'HELD', idempotencyKey: `pro-recovery-held:${invoiceId}` } })
}

// Internal operator entry point. Creating the unique queue row makes it eligible for dispatch.
export async function releaseHistoricalInvoice(invoiceId: string) {
  if (process.env.PRO_RECOVERY_APPROVED_INVOICE_ID !== invoiceId) throw new Error('PRO_RECOVERY_RELEASE_NOT_APPROVED')
  const { requirePlatformAdministrator } = await import('@/lib/platform-admin/platform-admin-authorization')
  const actor = await requirePlatformAdministrator('/platformbeheer/financien')
  return runSerializableFinancialTransaction(async tx => {
    await requireMarketplacePlatformAdmin(tx, actor.id)
    const held = await tx.financialEvent.findUnique({ where: { idempotencyKey: `pro-recovery-held:${invoiceId}` } })
    if (held?.invoiceId !== invoiceId || held.eventType !== 'PRO_RECOVERY_JORTT_HELD') throw new Error('PRO_RECOVERY_HOLD_REQUIRED')
    const key = `pro-recovery-release:${invoiceId}`
    if (await tx.financialEvent.findUnique({ where: { idempotencyKey: key } })) return
    await tx.financialJorttSync.create({ data: { invoiceId, technicalReference: `workmatchr-invoice:${invoiceId}` } })
    await tx.financialEvent.create({ data: { invoiceId, actorUserId: actor.id, eventType: 'PRO_RECOVERY_JORTT_RELEASED',
      result: 'AUTHORIZED', idempotencyKey: key } })
  })
}
