import { NextResponse } from 'next/server'
import { getPrisma } from '@/lib/prisma'
import { createCreditPurchase, processMolliePayment } from '@/lib/finance/financial-purchase-service'

export const dynamic = 'force-dynamic'

const EXPECTED_PREVIEW_BRANCH = 'codex/mollie-credit-acceptance'
const TEST_ORGANIZATION_KEY = 'PREVIEW_MOLLIE_ACCEPTANCE_20260822'
const TEST_EMAIL = 'mollie-preview-acceptance@workmatchr.example.invalid'
const PURCHASE_IDEMPOTENCY_KEY = 'preview-mollie-acceptance-credit-purchase-20260822'

function isAllowedPreviewRuntime() {
  return process.env.VERCEL_ENV === 'preview' && process.env.VERCEL_GIT_COMMIT_REF === EXPECTED_PREVIEW_BRANCH
}

async function findTestPurchase() {
  return getPrisma().financialPurchase.findFirst({
    where: { idempotencyKey: PURCHASE_IDEMPOTENCY_KEY },
    select: {
      id: true,
      status: true,
      credits: true,
      amountExclVatCents: true,
      vatAmountCents: true,
      amountInclVatCents: true,
      currency: true,
      molliePaymentId: true,
      mollieCheckoutUrl: true,
      creditedTransactionId: true,
      paymentEvents: { select: { id: true } },
      invoice: { select: { id: true, pricingMode: true, amountInclVatCents: true, vatAmountCents: true } },
    },
  })
}

export async function POST() {
  if (!isAllowedPreviewRuntime()) return new Response(null, { status: 404 })

  let failureStage = 'FIXTURE'
  try {
    const prisma = getPrisma()
    const fixture = await prisma.$transaction(async (transaction) => {
    const user = await transaction.user.upsert({
      where: { email: TEST_EMAIL },
      create: {
        email: TEST_EMAIL,
        displayName: 'Preview Mollie acceptance',
        emailVerified: true,
        accountType: 'PROFESSIONAL',
        status: 'ACTIVE',
      },
      update: {},
      select: { id: true },
    })
    const organization = await transaction.organization.upsert({
      where: { systemKey: TEST_ORGANIZATION_KEY },
      create: {
        systemKey: TEST_ORGANIZATION_KEY,
        name: 'Preview Mollie acceptance organisatie',
        organizationType: 'PROVIDER',
        status: 'ACTIVE',
      },
      update: {},
      select: { id: true },
    })
    await transaction.organizationMembership.upsert({
      where: { userId: user.id },
      create: { userId: user.id, organizationId: organization.id, role: 'OWNER', status: 'ACTIVE' },
      update: {},
    })
    await transaction.providerProfile.upsert({
      where: { organizationId: organization.id },
      create: { organizationId: organization.id },
      update: {},
    })
      return { userId: user.id, organizationId: organization.id }
    })

    failureStage = 'CHECKOUT'
    const purchase = await createCreditPurchase({
    actorUserId: fixture.userId,
    organizationId: fixture.organizationId,
    packageSku: 'CREDITS_25',
    idempotencyKey: PURCHASE_IDEMPOTENCY_KEY,
    billingAddress: {
      organizationName: 'Preview Mollie acceptance organisatie',
      addressLine: 'Teststraat 1',
      postalCode: '1000 AA',
      city: 'Preview',
      countryCode: 'NL',
    },
    })

    return NextResponse.json({
      fixtureReady: true,
      checkoutReady: Boolean(purchase.mollieCheckoutUrl && purchase.molliePaymentId),
    }, { headers: { 'cache-control': 'no-store' } })
  } catch (error) {
    const failureCode = typeof (error as { code?: unknown })?.code === 'string'
      ? (error as { code: string }).code
      : error instanceof Error && error.name === 'MarketplaceServiceError'
        ? 'MARKETPLACE_ACCESS'
        : 'UNCLASSIFIED'
    return NextResponse.json({ fixtureReady: false, checkoutReady: false, failureStage, failureCode }, { status: 409, headers: { 'cache-control': 'no-store' } })
  }
}

export async function GET() {
  if (!isAllowedPreviewRuntime()) return new Response(null, { status: 404 })

  const purchase = await findTestPurchase()
  if (!purchase) return NextResponse.json({ fixtureReady: false }, { headers: { 'cache-control': 'no-store' } })

  return NextResponse.json({
    fixtureReady: true,
    paymentIsPaid: purchase.status === 'PAID',
    checkoutReady: Boolean(purchase.mollieCheckoutUrl && purchase.molliePaymentId),
    exactlyOneCredit: purchase.creditedTransactionId !== null,
    invoiceSnapshotMatches: purchase.invoice?.pricingMode === 'MOLLIE_TEST_ACCEPTANCE'
      && purchase.invoice.amountInclVatCents === purchase.amountInclVatCents
      && purchase.invoice.vatAmountCents === purchase.vatAmountCents,
    paymentEventRecorded: purchase.paymentEvents.length > 0,
  }, { headers: { 'cache-control': 'no-store' } })
}

export async function PATCH() {
  if (!isAllowedPreviewRuntime()) return new Response(null, { status: 404 })

  const purchase = await findTestPurchase()
  if (!purchase?.molliePaymentId) return NextResponse.json({ replayProcessed: false }, { status: 409 })
  await processMolliePayment(purchase.molliePaymentId)
  return NextResponse.json({ replayProcessed: true }, { headers: { 'cache-control': 'no-store' } })
}
