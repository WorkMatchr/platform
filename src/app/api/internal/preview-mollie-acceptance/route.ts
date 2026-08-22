import { NextResponse } from 'next/server'
import { getPrisma } from '@/lib/prisma'
import { createCreditPurchase, processMolliePayment } from '@/lib/finance/financial-purchase-service'
import { appendAccountProvisioningEvent, appendOrganizationMembershipEvent } from '@/lib/account-architecture/account-history-service'
import { createMollieGateway } from '@/lib/finance/mollie-gateway'
import { MarketplaceServiceError } from '@/lib/marketplace/marketplace-errors'

export const dynamic = 'force-dynamic'

const EXPECTED_PREVIEW_BRANCH = 'codex/mollie-credit-acceptance'
const TEST_EMAIL = 'mollie-preview-acceptance@workmatchr.example.invalid'
const PURCHASE_IDEMPOTENCY_KEY = 'preview-mollie-acceptance-credit-purchase-20260822'
const RETRY_PURCHASE_IDEMPOTENCY_KEY = `${PURCHASE_IDEMPOTENCY_KEY}-retry-1`

function isAllowedPreviewRuntime() {
  return process.env.VERCEL_ENV === 'preview' && process.env.VERCEL_GIT_COMMIT_REF === EXPECTED_PREVIEW_BRANCH
}

async function findTestPurchase() {
  return getPrisma().financialPurchase.findFirst({
    where: { idempotencyKey: { startsWith: PURCHASE_IDEMPOTENCY_KEY } },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      idempotencyKey: true,
      organizationId: true,
      createdByUserId: true,
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

async function findTestPurchases() {
  return getPrisma().financialPurchase.findMany({
    where: { idempotencyKey: { startsWith: PURCHASE_IDEMPOTENCY_KEY } },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      organizationId: true,
      createdByUserId: true,
      status: true,
      credits: true,
      amountInclVatCents: true,
      currency: true,
      molliePaymentId: true,
      creditedTransactionId: true,
      paymentEvents: { select: { id: true } },
    },
  })
}

export async function POST() {
  if (!isAllowedPreviewRuntime()) return new Response(null, { status: 404 })

  let failureStage = 'FIXTURE_USER'
  try {
    const prisma = getPrisma()
    const fixture = await prisma.$transaction(async (transaction) => {
    failureStage = 'FIXTURE_USER'
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
    failureStage = 'FIXTURE_MEMBERSHIP'
    const existingMembership = await transaction.organizationMembership.findUnique({
      where: { userId: user.id },
      include: { organization: { select: { id: true, organizationType: true, status: true } } },
    })

    if (existingMembership) {
      if (existingMembership.organization.organizationType !== 'PROVIDER' || existingMembership.organization.status !== 'ACTIVE') {
        throw new Error('Preview fixture has an incompatible existing tenant.')
      }
      failureStage = 'FIXTURE_PROVIDER_PROFILE'
      await transaction.providerProfile.upsert({
        where: { organizationId: existingMembership.organization.id },
        create: { organizationId: existingMembership.organization.id },
        update: {},
      })
      return { userId: user.id, organizationId: existingMembership.organization.id }
    }

    failureStage = 'FIXTURE_ORGANIZATION'
    const organization = await transaction.organization.create({
      data: {
        name: 'Preview Mollie acceptance organisatie',
        organizationType: 'PROVIDER',
        status: 'ACTIVE',
        memberships: { create: { userId: user.id, role: 'OWNER', status: 'ACTIVE' } },
        providerProfile: { create: { approvalStatus: 'DRAFT', isAvailable: false } },
      },
      select: { id: true, memberships: { select: { id: true } } },
    })
    const membership = organization.memberships[0]
    if (!membership) throw new Error('Preview fixture membership was not created.')
    const correlationId = `preview-mollie-acceptance:${organization.id}`
    failureStage = 'FIXTURE_AUDIT'
    await appendOrganizationMembershipEvent(transaction, {
      eventType: 'MEMBERSHIP_CREATED', membershipId: membership.id, userId: user.id, organizationId: organization.id,
      actorUserId: user.id, previousStatus: null, newStatus: 'ACTIVE', previousRole: null, newRole: 'OWNER',
      reasonCode: 'PREVIEW_MOLLIE_ACCEPTANCE_FIXTURE', correlationId,
      idempotencyKey: `preview-mollie-acceptance:membership:${membership.id}`,
    })
    await appendAccountProvisioningEvent(transaction, {
      eventType: 'ORGANIZATION_LINKED', subjectUserId: user.id, actorUserId: user.id,
      organizationId: organization.id, membershipId: membership.id, reasonCode: 'PREVIEW_MOLLIE_ACCEPTANCE_FIXTURE', correlationId,
      idempotencyKey: `preview-mollie-acceptance:account:${membership.id}`,
    })
    return { userId: user.id, organizationId: organization.id }
    })

    failureStage = 'CHECKOUT'
    const currentPurchase = await findTestPurchase()
    const currentMolliePayment = currentPurchase?.molliePaymentId
      ? await createMollieGateway().getPayment(currentPurchase.molliePaymentId)
      : null
    const currentPaymentIsTerminal = currentMolliePayment !== null
      && ['failed', 'canceled', 'expired'].includes(currentMolliePayment.status)
    if (currentPaymentIsTerminal && currentPurchase?.idempotencyKey === RETRY_PURCHASE_IDEMPOTENCY_KEY) {
      return NextResponse.json({ fixtureReady: true, checkoutReady: false }, { headers: { 'cache-control': 'no-store' } })
    }
    const idempotencyKey = currentPaymentIsTerminal
      ? RETRY_PURCHASE_IDEMPOTENCY_KEY
      : PURCHASE_IDEMPOTENCY_KEY
    const purchase = await createCreditPurchase({
    actorUserId: fixture.userId,
    organizationId: fixture.organizationId,
    packageSku: 'CREDITS_25',
    idempotencyKey,
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
  const allPurchases = await findTestPurchases()
  const molliePayment = purchase.molliePaymentId
    ? await createMollieGateway().getPayment(purchase.molliePaymentId)
    : null

  return NextResponse.json({
    fixtureReady: true,
    paymentIsPaid: purchase.status === 'PAID',
    molliePaymentStatus: molliePayment?.status ?? null,
    checkoutReady: Boolean(purchase.mollieCheckoutUrl && purchase.molliePaymentId),
    exactlyOneCredit: purchase.creditedTransactionId !== null,
    invoiceSnapshotMatches: purchase.invoice?.pricingMode === 'MOLLIE_TEST_ACCEPTANCE'
      && purchase.invoice.amountInclVatCents === purchase.amountInclVatCents
      && purchase.invoice.vatAmountCents === purchase.vatAmountCents,
    paymentEventRecorded: purchase.paymentEvents.length > 0,
    expiredPaymentDidNotCredit: allPurchases.some((item) => item.status === 'EXPIRED' && item.creditedTransactionId === null),
  }, { headers: { 'cache-control': 'no-store' } })
}

export async function PATCH() {
  if (!isAllowedPreviewRuntime()) return new Response(null, { status: 404 })

  const purchases = await findTestPurchases()
  const paymentIds = purchases.flatMap((purchase) => purchase.molliePaymentId ? [purchase.molliePaymentId] : [])
  if (paymentIds.length === 0) return NextResponse.json({ replayProcessed: false }, { status: 409 })
  for (const paymentId of paymentIds) await processMolliePayment(paymentId)
  return NextResponse.json({ replayProcessed: true, terminalPaymentsProcessed: paymentIds.length > 1 }, { headers: { 'cache-control': 'no-store' } })
}

export async function PUT() {
  if (!isAllowedPreviewRuntime()) return new Response(null, { status: 404 })

  const purchase = await findTestPurchase()
  if (!purchase?.molliePaymentId) return NextResponse.json({ manipulationRejected: false, crossTenantRejected: false }, { status: 409 })
  const beforeCreditTransactionId = purchase.creditedTransactionId
  let manipulationRejected = false
  try {
    await processMolliePayment(purchase.molliePaymentId, {
      getPayment: async () => ({
        id: purchase.molliePaymentId!, status: 'paid', amountValue: '0.01', currency: purchase.currency,
        metadata: {}, paidAt: null, createdAt: null, checkoutUrl: null, subscriptionId: null, mandateId: null, method: null,
      }),
    } as never)
  } catch {
    manipulationRejected = true
  }
  const afterPurchase = await getPrisma().financialPurchase.findUniqueOrThrow({
    where: { id: purchase.id }, select: { creditedTransactionId: true },
  })
  const otherOrganization = await getPrisma().organization.findFirst({
    where: { id: { not: purchase.organizationId }, status: 'ACTIVE' }, select: { id: true },
  })
  let crossTenantRejected = otherOrganization === null
  if (otherOrganization) {
    try {
      await createCreditPurchase({
        actorUserId: purchase.createdByUserId, organizationId: otherOrganization.id, packageSku: 'CREDITS_25',
        idempotencyKey: `${PURCHASE_IDEMPOTENCY_KEY}-cross-tenant-check`,
        billingAddress: { organizationName: 'Preview test', addressLine: 'Teststraat 1', postalCode: '1000 AA', city: 'Preview', countryCode: 'NL' },
      })
    } catch (error) {
      crossTenantRejected = error instanceof MarketplaceServiceError
    }
  }
  return NextResponse.json({
    manipulationRejected: manipulationRejected && afterPurchase.creditedTransactionId === beforeCreditTransactionId,
    crossTenantRejected,
  }, { headers: { 'cache-control': 'no-store' } })
}
