import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/authorization'
import { calculateCreditPurchasePrice } from '@/lib/finance/financial-contract'
import { createMollieGateway, getMollieApiMode } from '@/lib/finance/mollie-gateway'
import { retryPendingProRemoteSubscription } from '@/lib/finance/subscription-service'
import { getPrisma } from '@/lib/prisma'

export const runtime = 'nodejs'

const SUBSCRIPTION_ID = '56f0fa14-ca6d-4851-a8be-942e44d99d39'
const PURCHASE_ID = '4ef12193-9a6e-4e76-bf9d-1f7cecc5353e'
const INVOICE_ID = '83eeffbb-380d-440f-a368-69b1aa652b19'
const CONFIRMATION = 'RETRY-WM-26095005-ONCE'

function unavailable() {
  return new NextResponse(null, { status: 404 })
}

async function requireBoundUser() {
  if (process.env.VERCEL_ENV !== 'production' || getMollieApiMode() !== 'live') return null
  const user = await requireUser('/credits/pro')
  const purchase = await getPrisma().financialPurchase.findUnique({
    where: { id: PURCHASE_ID },
    select: { createdByUserId: true, status: true, invoice: { select: { id: true, invoiceNumber: true } } },
  })
  if (
    !purchase
    || purchase.createdByUserId !== user.id
    || purchase.status !== 'PAID'
    || purchase.invoice?.id !== INVOICE_ID
    || purchase.invoice.invoiceNumber !== 'WM-26095005'
  ) return null
  return user
}

async function readStatus() {
  const prisma = getPrisma()
  const [subscription, invoiceCount, localSubscriptionCount, events] = await Promise.all([
    prisma.professionalSubscription.findUnique({
      where: { id: SUBSCRIPTION_ID },
      select: {
        id: true,
        organizationId: true,
        status: true,
        mollieCustomerId: true,
        mollieMandateId: true,
        mollieMandateStatus: true,
        mollieMandateMethod: true,
        mollieSubscriptionId: true,
        currentPeriodStart: true,
        currentPeriodEnd: true,
        activatedAt: true,
      },
    }),
    prisma.financialInvoice.count({ where: { purchaseId: PURCHASE_ID } }),
    prisma.professionalSubscription.count({
      where: { firstPaymentAttempts: { some: { purchaseId: PURCHASE_ID } } },
    }),
    prisma.financialEvent.findMany({
      where: {
        subscriptionId: SUBSCRIPTION_ID,
        eventType: { in: [
          'PRO_REMOTE_SUBSCRIPTION_ATTEMPT_STARTED',
          'PRO_REMOTE_SUBSCRIPTION_LOOKUP_FAILED',
          'PRO_REMOTE_SUBSCRIPTION_CREATE_FAILED',
          'PRO_REMOTE_SUBSCRIPTION_LINKED',
          'PRO_SUBSCRIPTION_ACTIVATED',
        ] },
      },
      orderBy: { createdAt: 'asc' },
      select: { eventType: true, result: true, reason: true, metadata: true, createdAt: true },
    }),
  ])
  if (!subscription?.mollieCustomerId) return null
  const remote = await createMollieGateway().findCustomerSubscription(subscription.mollieCustomerId, subscription.id)
  const invoice = await prisma.financialInvoice.findUnique({
    where: { id: INVOICE_ID },
    select: {
      invoiceNumber: true,
      amountExclVatCents: true,
      vatAmountCents: true,
      amountInclVatCents: true,
      currency: true,
      events: {
        where: { eventType: { in: ['INVOICE_EMAIL_SENT', 'INVOICE_EMAIL_FAILED'] } },
        select: { eventType: true, result: true, createdAt: true },
      },
      jorttSync: { select: { status: true, attemptCount: true, externalReference: true, remoteInvoiceNumber: true } },
    },
  })
  const proPrice = calculateCreditPurchasePrice({ packageSku: 'CREDITS_25', hasActivePro: true })
  return {
    subscription,
    remoteSubscription: remote,
    events,
    invoice,
    invoiceCount,
    localSubscriptionCount,
    entitlementActive: subscription.status === 'ACTIVE'
      && Boolean(subscription.currentPeriodStart && subscription.currentPeriodEnd)
      && subscription.currentPeriodEnd! > new Date(),
    proCreditDiscount: {
      packageSku: 'CREDITS_25',
      discountCents: proPrice.proDiscountCents,
      percentageBps: 1_000,
    },
  }
}

export async function GET(request: NextRequest) {
  if (!await requireBoundUser()) return unavailable()
  if (request.nextUrl.searchParams.get('status') === '1') {
    return NextResponse.json(await readStatus(), { headers: { 'Cache-Control': 'private, no-store' } })
  }
  return new NextResponse(`<!doctype html><html lang="nl"><body><h1>Eenmalige Pro remote-subscriptionretry</h1><form method="post"><input type="hidden" name="confirmation" value="${CONFIRMATION}"><button type="submit">Voer exact één retry uit</button></form></body></html>`, {
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'private, no-store' },
  })
}

export async function POST(request: NextRequest) {
  if (!await requireBoundUser()) return unavailable()
  const origin = (await headers()).get('origin')
  if (origin !== 'https://www.workmatchr.nl') return unavailable()
  const form = await request.formData()
  if (form.get('confirmation') !== CONFIRMATION) return unavailable()
  const before = await getPrisma().professionalSubscription.findUnique({
    where: { id: SUBSCRIPTION_ID },
    select: { status: true, mollieSubscriptionId: true },
  })
  if (!before || before.status !== 'PENDING_MANDATE' || before.mollieSubscriptionId !== null) return unavailable()
  const result = await retryPendingProRemoteSubscription(SUBSCRIPTION_ID)
  return NextResponse.json({ ok: true, subscriptionId: result.id, status: result.status, mollieSubscriptionLinked: Boolean(result.mollieSubscriptionId) }, {
    headers: { 'Cache-Control': 'private, no-store' },
  })
}
