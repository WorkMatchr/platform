import 'server-only'

import { Prisma } from '@/generated/prisma/client'
import { getPrisma } from '@/lib/prisma'
import { getPlatformAdministratorContext } from '@/lib/platform-admin/platform-admin-authorization'
import { isRetiredLegacyJorttSync, legacyJorttTestInvoices } from './jortt-retirement-policy'

// Deliberately no route, scheduler hook or automatic invocation. Release approval is separate.
export async function retireLegacyJorttTestSync(invoiceId: string, actorUserId: string) {
  await getPlatformAdministratorContext(actorUserId)
  if (!Object.hasOwn(legacyJorttTestInvoices, invoiceId)) throw new Error('JORTT_RETIREMENT_NOT_ALLOWED')
  return getPrisma().$transaction(async (tx) => {
    await tx.$queryRaw(Prisma.sql`SELECT pg_advisory_xact_lock(hashtextextended(${`jortt:${invoiceId}`}, 0))::text AS "lock"`)
    const invoice = await tx.financialInvoice.findUnique({ where: { id: invoiceId }, include: { jorttSync: true } })
    const sync = invoice?.jorttSync
    if (!invoice || !sync || invoice.invoiceNumber !== legacyJorttTestInvoices[invoiceId as keyof typeof legacyJorttTestInvoices]
      || invoice.snapshotVersion !== 1 || invoice.documentType !== 'INVOICE') throw new Error('JORTT_RETIREMENT_CONTEXT_MISMATCH')
    if (isRetiredLegacyJorttSync(sync)) return sync
    if (!['RETRY_REQUIRED', 'FAILED'].includes(sync.status) || sync.lastErrorCode !== 'JORTT_PROVIDER_REJECTED') {
      throw new Error('JORTT_RETIREMENT_STATE_MISMATCH')
    }
    await tx.financialEvent.create({ data: {
      invoiceId, actorUserId, eventType: 'JORTT_SYNC_RETIRED', result: 'SUCCEEDED', reason: 'LEGACY_TEST_DATA',
      idempotencyKey: `jortt-retired:${invoiceId}`,
      metadata: { previousStatus: sync.status, previousErrorCode: sync.lastErrorCode, attemptCount: sync.attemptCount },
    } })
    return tx.financialJorttSync.update({ where: { id: sync.id }, data: {
      status: 'FAILED', lastErrorCode: 'LEGACY_TEST_DATA', nextAttemptAt: null,
    } })
  }, { isolationLevel: 'Serializable' })
}
