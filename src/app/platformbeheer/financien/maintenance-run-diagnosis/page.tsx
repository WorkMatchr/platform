import { notFound } from 'next/navigation'
import { getPrisma } from '@/lib/prisma'
import { requirePlatformAdministrator } from '@/lib/platform-admin/platform-admin-authorization'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const safeCode = (value: string | null) => value && /^[A-Z0-9_]{3,80}$/.test(value) ? value : null

export default async function MaintenanceRunDiagnosis() {
  if (process.env.VERCEL_ENV !== 'production') notFound()
  await requirePlatformAdministrator('/platformbeheer/financien/maintenance-run-diagnosis')
  const prisma = getPrisma()
  const run = await prisma.financialMaintenanceRun.findFirst({
    where: { trigger: 'SCHEDULER' }, orderBy: { startedAt: 'desc' },
    select: { id: true, trigger: true, startedAt: true, finishedAt: true, status: true, resultCounts: true, errorCodes: true },
  })
  if (!run) return <pre>{JSON.stringify({ run: null })}</pre>
  const attempts = await prisma.financialJorttSyncAttempt.findMany({
    where: { createdAt: { gte: run.startedAt, lte: run.finishedAt ?? new Date(run.startedAt.getTime() + 30 * 60 * 1000) } },
    orderBy: { createdAt: 'asc' }, take: 100,
    select: { id: true, syncId: true, attemptNumber: true, status: true, errorCode: true, createdAt: true,
      sync: { select: { invoiceId: true, status: true, lastErrorCode: true, invoice: { select: { invoiceNumber: true } } } } },
  })
  return <pre>{JSON.stringify({
    run: { ...run, errorCodes: run.errorCodes.map(safeCode), errorSummary: null },
    lease: { separateFields: false, durationMinutes: 30 },
    attempts: attempts.map((attempt) => ({ ...attempt, errorCode: safeCode(attempt.errorCode), sync: { ...attempt.sync, lastErrorCode: safeCode(attempt.sync.lastErrorCode) } })),
    correlation: 'TIMESTAMP_WINDOW_ONLY',
  }, null, 2)}</pre>
}
