import { notFound } from 'next/navigation'
import { getPrisma } from '@/lib/prisma'
import { requirePlatformAdministrator } from '@/lib/platform-admin/platform-admin-authorization'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export default async function ProOperationsDiagnosis() {
  if (process.env.VERCEL_ENV !== 'production') notFound()
  await requirePlatformAdministrator('/platformbeheer/financien')
  const prisma = getPrisma()
  const subscription = await prisma.professionalSubscription.findUnique({
    where: { id: '56f0fa14-ca6d-4851-a8be-942e44d99d39' },
    select: {
      id: true, status: true, mollieCustomerId: true, mollieSubscriptionId: true,
      mollieMandateId: true, mollieMandateStatus: true, mollieMandateMethod: true,
      currentPeriodStart: true, currentPeriodEnd: true, cancelAtPeriodEnd: true,
      firstPaymentAttempts: { where: { purchaseId: '4ef12193-9a6e-4e76-bf9d-1f7cecc5353e' }, select: { purchaseId: true } },
    },
  })
  if (!subscription || subscription.firstPaymentAttempts.length !== 1) notFound()
  const runs = await prisma.financialMaintenanceRun.findMany({
    orderBy: { startedAt: 'desc' }, take: 5,
    select: { startedAt: true, finishedAt: true, status: true, trigger: true, errorCodes: true },
  })
  const running = await prisma.financialMaintenanceRun.count({ where: { status: 'RUNNING' } })
  const totalRuns = await prisma.financialMaintenanceRun.count()
  const key = process.env.MOLLIE_API_KEY ?? ''
  const read = async (path: string) => {
    const response = await fetch('https://api.mollie.com/v2' + path, {
      method: 'GET', headers: { Authorization: 'Bearer ' + key },
      cache: 'no-store', signal: AbortSignal.timeout(15000),
    })
    if (!response.ok) return { httpStatus: response.status, data: null }
    return { httpStatus: response.status, data: await response.json() }
  }
  let remote: unknown = { status: 'TARGET_OR_LIVE_CONFIGURATION_INVALID' }
  if (key.startsWith('live_') && /^cst_[A-Za-z0-9]+$/.test(subscription.mollieCustomerId ?? '')
    && /^sub_[A-Za-z0-9]+$/.test(subscription.mollieSubscriptionId ?? '')
    && /^mdt_[A-Za-z0-9]+$/.test(subscription.mollieMandateId ?? '')) {
    try {
      const sub = await read('/customers/' + subscription.mollieCustomerId + '/subscriptions/' + subscription.mollieSubscriptionId)
      const mandate = await read('/customers/' + subscription.mollieCustomerId + '/mandates/' + subscription.mollieMandateId)
      remote = {
        subscriptionHttpStatus: sub.httpStatus, mandateHttpStatus: mandate.httpStatus,
        subscription: sub.data ? {
          id: sub.data.id, customerId: sub.data.customerId, status: sub.data.status,
          amount: sub.data.amount, interval: sub.data.interval, startDate: sub.data.startDate,
          nextPaymentDate: sub.data.nextPaymentDate ?? null, mandateId: sub.data.mandateId ?? null,
          method: sub.data.method ?? null,
          identityMatches: sub.data.id === subscription.mollieSubscriptionId && sub.data.customerId === subscription.mollieCustomerId,
        } : null,
        mandate: mandate.data ? { id: mandate.data.id, status: mandate.data.status, method: mandate.data.method } : null,
      }
    } catch { remote = { status: 'READ_ONLY_MOLLIE_REQUEST_FAILED' } }
  }
  const cron = process.env.CRON_SECRET ?? ''
  const result = {
    observedAt: new Date().toISOString(),
    configuration: {
      production: process.env.VERCEL_ENV === 'production',
      cronSecretPresent: Boolean(cron), cronSecretMeetsMinimumLength: cron.length >= 32,
      cronSecretHasNoSurroundingWhitespace: cron === cron.trim(),
      mollieLive: key.startsWith('live_'), databaseConfigured: Boolean(process.env.DATABASE_URL),
    },
    maintenance: { totalRuns, running, recentRuns: runs },
    local: { status: subscription.status, currentPeriodStart: subscription.currentPeriodStart,
      currentPeriodEnd: subscription.currentPeriodEnd, cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      mandateStatus: subscription.mollieMandateStatus, mandateMethod: subscription.mollieMandateMethod },
    remote,
  }
  return <section><h1>Read-only Pro-operationsdiagnose</h1><pre>{JSON.stringify(result, null, 2)}</pre></section>
}
