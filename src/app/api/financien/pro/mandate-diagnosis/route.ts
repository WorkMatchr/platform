import createMollieClient from '@mollie/api-client'
import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/authorization'
import { getMollieApiMode } from '@/lib/finance/mollie-gateway'
import { getPrisma } from '@/lib/prisma'

export const runtime = 'nodejs'

const PURCHASE_ID = '4ef12193-9a6e-4e76-bf9d-1f7cecc5353e'
const INVOICE_ID = '83eeffbb-380d-440f-a368-69b1aa652b19'

const isUsableRecurringMandate = (mandate: { status: string; method: string }) =>
  mandate.status === 'valid' && (mandate.method === 'directdebit' || mandate.method === 'creditcard')

export async function GET() {
  if (process.env.VERCEL_ENV !== 'production' || getMollieApiMode() !== 'live') {
    return new NextResponse(null, { status: 404 })
  }

  const user = await requireUser('/credits/pro')
  const prisma = getPrisma()
  const purchase = await prisma.financialPurchase.findUnique({
    where: { id: PURCHASE_ID },
    select: {
      id: true,
      createdByUserId: true,
      organizationId: true,
      status: true,
      kind: true,
      molliePaymentId: true,
      paidAt: true,
      amountExclVatCents: true,
      vatAmountCents: true,
      amountInclVatCents: true,
      currency: true,
      subscriptionFirstPaymentAttempts: {
        select: { subscriptionId: true, attemptNumber: true },
      },
    },
  })

  if (!purchase || purchase.createdByUserId !== user.id || !purchase.molliePaymentId) {
    return new NextResponse(null, { status: 404 })
  }

  const attempt = purchase.subscriptionFirstPaymentAttempts.at(0)
  if (!attempt) return new NextResponse(null, { status: 404 })

  const [subscription, invoice, invoiceCount, organizationSubscriptionCount, events] = await Promise.all([
    prisma.professionalSubscription.findUnique({
      where: { id: attempt.subscriptionId },
      select: {
        id: true,
        organizationId: true,
        status: true,
        mollieCustomerId: true,
        mollieMandateId: true,
        mollieMandateStatus: true,
        mollieMandateMethod: true,
        mollieMandateVerifiedAt: true,
        mollieSubscriptionId: true,
        currentPeriodStart: true,
        currentPeriodEnd: true,
        activatedAt: true,
      },
    }),
    prisma.financialInvoice.findUnique({
      where: { id: INVOICE_ID },
      select: {
        id: true,
        invoiceNumber: true,
        purchaseId: true,
        snapshotVersion: true,
        amountExclVatCents: true,
        vatAmountCents: true,
        amountInclVatCents: true,
        currency: true,
        jorttSync: { select: { status: true, attemptCount: true } },
      },
    }),
    prisma.financialInvoice.count({ where: { purchaseId: PURCHASE_ID } }),
    prisma.professionalSubscription.count({ where: { organizationId: purchase.organizationId } }),
    prisma.financialEvent.findMany({
      where: { OR: [{ purchaseId: PURCHASE_ID }, { subscriptionId: attempt.subscriptionId }, { invoiceId: INVOICE_ID }] },
      orderBy: { createdAt: 'asc' },
      select: { eventType: true, result: true, reason: true, createdAt: true },
    }),
  ])

  if (
    !subscription ||
    subscription.organizationId !== purchase.organizationId ||
    !subscription.mollieCustomerId ||
    !invoice ||
    invoice.purchaseId !== PURCHASE_ID ||
    invoice.invoiceNumber !== 'WM-26095005'
  ) {
    return new NextResponse(null, { status: 404 })
  }

  const apiKey = process.env.MOLLIE_API_KEY?.trim()
  if (!apiKey?.startsWith('live_')) return new NextResponse(null, { status: 404 })
  const mollie = createMollieClient({ apiKey })
  const [payment, remoteMandates, remoteSubscriptions] = await Promise.all([
    mollie.payments.get(purchase.molliePaymentId),
    mollie.customerMandates.page({ customerId: subscription.mollieCustomerId }),
    mollie.customerSubscriptions.page({ customerId: subscription.mollieCustomerId }),
  ])

  const mandates = remoteMandates.map((mandate) => ({
    id: mandate.id,
    method: mandate.method,
    status: mandate.status,
    createdAt: mandate.createdAt ?? null,
    detailsType: mandate.method,
    usableForRecurring: isUsableRecurringMandate(mandate),
  }))

  return NextResponse.json({
    payment: {
      id: payment.id,
      customerId: payment.customerId ?? null,
      method: payment.method ?? null,
      sequenceType: payment.sequenceType,
      status: payment.status,
      mandateId: payment.mandateId ?? null,
      paidAtPresent: Boolean(payment.paidAt),
      amount: payment.amount,
    },
    remoteMandates: mandates,
    remoteSubscriptions: remoteSubscriptions.map((remoteSubscription) => ({
      id: remoteSubscription.id,
      status: remoteSubscription.status,
      mandateId: remoteSubscription.mandateId ?? null,
      method: remoteSubscription.method ?? null,
      amount: remoteSubscription.amount,
      interval: remoteSubscription.interval,
      metadataMatchesSubscription: Boolean(
        remoteSubscription.metadata &&
        typeof remoteSubscription.metadata === 'object' &&
        'subscriptionId' in remoteSubscription.metadata &&
        remoteSubscription.metadata.subscriptionId === subscription.id
      ),
    })),
    local: {
      purchase: {
        id: purchase.id,
        status: purchase.status,
        kind: purchase.kind,
        paidAtPresent: Boolean(purchase.paidAt),
        amountExclVatCents: purchase.amountExclVatCents,
        vatAmountCents: purchase.vatAmountCents,
        amountInclVatCents: purchase.amountInclVatCents,
        currency: purchase.currency,
      },
      attemptNumber: attempt.attemptNumber,
      subscription,
      invoice,
      invoiceCount,
      organizationSubscriptionCount,
      events,
    },
    validationContract: {
      acceptedStatuses: ['valid'],
      acceptedMethods: ['directdebit', 'creditcard'],
      usableRemoteMandateCount: mandates.filter(isUsableRecurringMandate).length,
      stopError: 'MOLLIE_VALID_MANDATE_MISSING',
      stopEvent: 'PRO_MANDATE_VALIDATION_FAILED',
    },
  }, { headers: { 'Cache-Control': 'private, no-store' } })
}
