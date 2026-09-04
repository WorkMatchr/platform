import { NextResponse } from 'next/server'
import { Prisma } from '@/generated/prisma/client'
import { createMollieGateway, getMollieApiMode } from '@/lib/finance/mollie-gateway'
import { runSerializableFinancialTransaction } from '@/lib/finance/financial-transaction'
import { getPrisma } from '@/lib/prisma'
import { requirePlatformOperator } from '@/lib/platform-admin/platform-admin-authorization'

export const runtime = 'nodejs'

const subscriptionId = '56f0fa14-ca6d-4851-a8be-942e44d99d39'
const purchaseId = '71823cf1-24d9-4273-8dd0-310c7b1eb099'

function isNotFound(error: unknown) {
  const candidate = error as { statusCode?: unknown; status?: unknown }
  return candidate?.statusCode === 404 || candidate?.status === 404
}

export async function GET() {
  await requirePlatformOperator('/platformbeheer/financien')
  if (process.env.VERCEL_ENV !== 'production' || getMollieApiMode() !== 'live') {
    return new NextResponse(null, { status: 404 })
  }
  return new NextResponse(
    '<!doctype html><html lang="nl"><body><main><h1>Pro Mollie-customer herstellen</h1><p>Uitsluitend subscription 56f0fa14-ca6d-4851-a8be-942e44d99d39.</p><form method="post"><button type="submit">Customerkoppeling éénmaal herstellen</button></form></main></body></html>',
    { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'private, no-store' } },
  )
}

export async function POST() {
  const operator = await requirePlatformOperator('/platformbeheer/financien')
  if (process.env.VERCEL_ENV !== 'production' || getMollieApiMode() !== 'live') {
    return new NextResponse(null, { status: 404 })
  }

  const current = await getPrisma().professionalSubscription.findUnique({
    where: { id: subscriptionId },
    include: {
      organization: { select: { id: true, name: true } },
      firstPaymentAttempts: {
        where: { purchaseId },
        select: { purchase: { select: { id: true, status: true, molliePaymentId: true, createdByUser: { select: { email: true } } } } },
      },
      events: {
        where: { purchaseId, eventType: 'PRO_FIRST_PAYMENT_START_FAILED', reason: 'MOLLIE_CUSTOMER_INVALID' },
        select: { id: true },
      },
    },
  })
  const attempt = current?.firstPaymentAttempts[0]?.purchase
  if (
    !current
    || !attempt
    || attempt.status !== 'FAILED'
    || attempt.molliePaymentId !== null
    || !current.mollieCustomerId
    || current.mollieMandateId !== null
    || current.mollieSubscriptionId !== null
    || current.status !== 'PENDING_MANDATE'
    || current.events.length !== 1
  ) return NextResponse.json({ ok: false, reason: 'RECOVERY_PRECONDITION_FAILED' }, { status: 409 })

  const gateway = createMollieGateway()
  try {
    await gateway.getCustomer(current.mollieCustomerId)
    return NextResponse.json({ ok: false, reason: 'CUSTOMER_IS_NOT_STALE' }, { status: 409 })
  } catch (error) {
    if (!isNotFound(error)) throw error
  }

  const replacement = await gateway.createCustomer({
    name: current.organization.name,
    email: attempt.createdByUser.email,
    organizationId: current.organization.id,
    idempotencyKey: `mollie-customer-recovery:${current.id}`,
  })
  const verified = await gateway.getCustomer(replacement.id)
  if (verified.organizationId !== current.organization.id) throw new Error('MOLLIE_CUSTOMER_RECOVERY_MISMATCH')

  await runSerializableFinancialTransaction(async (transaction) => {
    await transaction.$queryRaw(Prisma.sql`SELECT pg_advisory_xact_lock(hashtextextended(${`subscription:${current.organization.id}`}, 0))::text AS "lock"`)
    const locked = await transaction.professionalSubscription.findUniqueOrThrow({ where: { id: subscriptionId } })
    if (locked.mollieCustomerId !== current.mollieCustomerId || locked.mollieMandateId || locked.mollieSubscriptionId) {
      throw new Error('MOLLIE_CUSTOMER_RECOVERY_CONFLICT')
    }
    await transaction.professionalSubscription.update({
      where: { id: subscriptionId },
      data: { mollieCustomerId: replacement.id },
    })
    await transaction.financialEvent.upsert({
      where: { idempotencyKey: `pro-mollie-customer-recovered:${subscriptionId}` },
      create: {
        actorUserId: operator.userId,
        subscriptionId,
        purchaseId,
        eventType: 'PRO_MOLLIE_CUSTOMER_RECOVERED',
        result: 'SUCCEEDED',
        reason: 'STALE_REMOTE_CUSTOMER_REPLACED',
        idempotencyKey: `pro-mollie-customer-recovered:${subscriptionId}`,
        metadata: { remoteCustomerVerified: true, paymentCreated: false },
      },
      update: {},
    })
  })

  return NextResponse.json({ ok: true, customerExists: true, organizationMatches: true, paymentCreated: false })
}
