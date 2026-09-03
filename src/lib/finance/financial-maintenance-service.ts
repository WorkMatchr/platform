import 'server-only'

import { getPrisma } from '@/lib/prisma'
import type { MollieGateway } from './mollie-gateway'
import { createMollieGateway } from './mollie-gateway'
import { reconcilePendingMollieRefunds } from './refund-service'
import { finalizeScheduledProCancellations, suspendOverdueProSubscriptions } from './subscription-service'
import { createJorttGateway, isJorttSyncConfigured } from './jortt-api-gateway'
import { retryDueJorttSyncs } from './jortt-sync-service'

const RUN_LEASE_MS = 30 * 60 * 1000
const RUN_RETENTION_MS = 90 * 24 * 60 * 60 * 1000
type MaintenanceTrigger = 'SCHEDULER' | 'MANUAL_API'
type CategoryResult = { processed: number; succeeded: number; failed: number; skipped?: boolean }
type MaintenanceCounts = Record<'refunds' | 'cancellations' | 'suspensions' | 'jortt', CategoryResult>

function safeErrorCode(error: unknown) {
  const message = error instanceof Error ? error.message : ''
  return /^[A-Z0-9_]{3,80}$/.test(message) ? message : 'FINANCIAL_MAINTENANCE_ERROR'
}

async function claimRun(trigger: MaintenanceTrigger, at: Date) {
  const prisma = getPrisma()
  try {
    return await prisma.$transaction(async (transaction) => {
      await transaction.financialMaintenanceRun.deleteMany({
        where: { finishedAt: { lt: new Date(at.getTime() - RUN_RETENTION_MS) } },
      })
      await transaction.financialMaintenanceRun.updateMany({
        where: { status: 'RUNNING', startedAt: { lt: new Date(at.getTime() - RUN_LEASE_MS) } },
        data: { status: 'FAILED', finishedAt: at, errorCodes: ['MAINTENANCE_RUN_LEASE_EXPIRED'] },
      })
      return transaction.financialMaintenanceRun.create({
        data: { startedAt: at, status: 'RUNNING', trigger, errorCodes: [] },
      })
    }, { isolationLevel: 'Serializable' })
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002') return null
    throw error
  }
}

async function safelyRun<T>(category: keyof MaintenanceCounts, task: () => Promise<T>, summarize: (value: T) => CategoryResult) {
  try {
    return { category, result: summarize(await task()), errorCode: null }
  } catch (error) {
    return { category, result: { processed: 0, succeeded: 0, failed: 1 }, errorCode: safeErrorCode(error) }
  }
}

export async function runFinancialMaintenance(
  at = new Date(),
  gateway: MollieGateway = createMollieGateway(),
  trigger: MaintenanceTrigger = 'MANUAL_API',
) {
  const run = await claimRun(trigger, at)
  if (!run) return { status: 'SKIPPED_CONCURRENT' as const, runId: null, counts: null }

  const results = []
  results.push(await safelyRun('refunds', () => reconcilePendingMollieRefunds(gateway), (value) => ({
    processed: value.inspected, succeeded: value.refunded + value.failed + value.canceled, failed: value.providerErrors,
  })))
  results.push(await safelyRun('cancellations', () => finalizeScheduledProCancellations(at), (value) => ({
    processed: value.count, succeeded: value.count, failed: 0,
  })))
  results.push(await safelyRun('suspensions', () => suspendOverdueProSubscriptions(at), (value) => ({
    processed: value.count, succeeded: value.count, failed: 0,
  })))
  results.push(isJorttSyncConfigured()
    ? await safelyRun('jortt', () => retryDueJorttSyncs(createJorttGateway(), at), (value) => ({
        processed: value.length,
        succeeded: value.filter((item) => item.status === 'SYNCED').length,
        failed: value.filter((item) => item.status === 'FAILED').length,
      }))
    : { category: 'jortt' as const, result: { processed: 0, succeeded: 0, failed: 0, skipped: true }, errorCode: null })

  const counts = Object.fromEntries(results.map(({ category, result }) => [category, result])) as MaintenanceCounts
  const errorCodes = results.flatMap((item) => item.errorCode ? [item.errorCode] : [])
  const failedCount = results.reduce((sum, item) => sum + item.result.failed, 0)
  const status = errorCodes.length || failedCount ? 'PARTIAL_FAILURE' : 'SUCCEEDED'
  await getPrisma().financialMaintenanceRun.update({
    where: { id: run.id },
    data: { finishedAt: new Date(), status, resultCounts: counts, errorCodes },
  })
  return { status, runId: run.id, counts, errorCodes }
}
