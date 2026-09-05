import { NextResponse } from 'next/server'
import { getPrisma } from '@/lib/prisma'
import { requirePlatformAdministrator } from '@/lib/platform-admin/platform-admin-authorization'

export const runtime = 'nodejs'

const subscriptionId = '56f0fa14-ca6d-4851-a8be-942e44d99d39'
const purchaseId = '4ef12193-9a6e-4e76-bf9d-1f7cecc5353e'
const invoiceId = '83eeffbb-380d-440f-a368-69b1aa652b19'
const invoiceNumber = 'WM-26095005'

async function requireExactAcceptanceTarget() {
  const invoice = await getPrisma().financialInvoice.findUnique({
    where: { id: invoiceId },
    select: {
      id: true,
      invoiceNumber: true,
      snapshotVersion: true,
      amountExclVatCents: true,
      vatAmountCents: true,
      amountInclVatCents: true,
      purchase: {
        select: {
          id: true,
          status: true,
          kind: true,
          subscriptionFirstPayment: { select: { id: true, status: true } },
          subscriptionFirstPaymentAttempts: { select: { subscription: { select: { id: true, status: true } } } },
        },
      },
    },
  })
  const linkedSubscriptionIds = new Set([
    invoice?.purchase?.subscriptionFirstPayment?.id,
    ...(invoice?.purchase?.subscriptionFirstPaymentAttempts.map(({ subscription }) => subscription.id) ?? []),
  ].filter((id): id is string => Boolean(id)))
  if (
    invoice?.invoiceNumber !== invoiceNumber
    || invoice.snapshotVersion !== 2
    || invoice.purchase?.id !== purchaseId
    || invoice.purchase.status !== 'PAID'
    || invoice.purchase.kind !== 'PRO_SUBSCRIPTION'
    || !linkedSubscriptionIds.has(subscriptionId)
    || invoice.amountExclVatCents !== 4_900
    || invoice.vatAmountCents !== 1_029
    || invoice.amountInclVatCents !== 5_929
  ) throw new Error('PRO_DOWNSTREAM_ACCEPTANCE_TARGET_MISMATCH')
  return invoice
}

export async function GET() {
  await requirePlatformAdministrator('/platformbeheer/financien')
  await requireExactAcceptanceTarget()
  const [emailEvents, sync, invoiceCount, purchaseCount] = await Promise.all([
    getPrisma().financialEvent.findMany({
      where: { invoiceId, eventType: { in: ['INVOICE_EMAIL_SENT', 'INVOICE_EMAIL_FAILED'] } },
      select: { eventType: true, result: true, metadata: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    }),
    getPrisma().financialJorttSync.findUnique({
      where: { invoiceId },
      select: {
        status: true,
        technicalReference: true,
        externalReference: true,
        remoteInvoiceNumber: true,
        attemptCount: true,
        lastErrorCode: true,
        attempts: { select: { status: true, errorCode: true, externalReference: true }, orderBy: { attemptNumber: 'asc' } },
      },
    }),
    getPrisma().financialInvoice.count({ where: { invoiceNumber } }),
    getPrisma().financialPurchase.count({ where: { id: purchaseId } }),
  ])
  return NextResponse.json({
    targetValid: true,
    invoiceCount,
    purchaseCount,
    emailEvents,
    sync,
  }, { headers: { 'Cache-Control': 'private, no-store' } })
}
