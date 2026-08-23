import { randomBytes, randomUUID, timingSafeEqual } from 'node:crypto'

import { Prisma } from '@/generated/prisma/client'
import { appendAccountProvisioningEvent, appendOrganizationMembershipEvent } from '@/lib/account-architecture/account-history-service'
import { changeOrganizationUserRole } from '@/lib/account-architecture/owner-management-service'
import { assertCanCreateTenantMembership } from '@/lib/account-architecture/tenant-membership-policy'
import { auth } from '@/lib/auth'
import { processMolliePayment } from '@/lib/finance/financial-purchase-service'
import { getPrisma } from '@/lib/prisma'
import { getPublicAppBaseUrl } from '@/lib/public-app-url'

export const dynamic = 'force-dynamic'

const FIXTURE_EMAIL = 'preview-invoice-e2e-mail2-20260823@workmatchr.example.invalid'
const FIXTURE_PURCHASE_KEY_PREFIX = 'preview-mollie-acceptance-credit-purchase-'
const FIXTURE_PAYMENT_ID = 'tr_xxNfEhXRqSrrGoUSQGmVJ'
const EXPECTED_PREVIEW_ORIGIN = 'https://platform-mollie-acceptance-preview-workmatchrs-projects.vercel.app'

async function authenticatedFixtureResponse(
  password: string,
  payload: { fixtureReady: true; created: boolean; role: 'ADMIN' },
) {
  const signIn = await auth.api.signInEmail({
    body: { email: FIXTURE_EMAIL, password },
    returnHeaders: true,
  })
  return Response.json(payload, { headers: signIn.headers })
}

function isAuthorizedPreviewRequest(request: Request): boolean {
  if (
    process.env.VERCEL_ENV !== 'preview'
    || getPublicAppBaseUrl() !== EXPECTED_PREVIEW_ORIGIN
    || !new URL(request.url).origin.endsWith('.vercel.app')
  ) return false

  const expected = process.env.PREVIEW_INVOICE_E2E_HARNESS_SECRET
  const supplied = request.headers.get('x-preview-acceptance-secret')
  if (!expected || !supplied) return false

  const expectedBuffer = Buffer.from(expected)
  const suppliedBuffer = Buffer.from(supplied)
  return expectedBuffer.length === suppliedBuffer.length && timingSafeEqual(expectedBuffer, suppliedBuffer)
}

export async function PUT(request: Request) {
  if (!isAuthorizedPreviewRequest(request)) return new Response(null, { status: 404 })

  return Response.json({
    preview: process.env.VERCEL_ENV === 'preview',
    resendConfigured: Boolean(process.env.RESEND_API_KEY?.trim()),
    senderConfigured: Boolean(process.env.AUTH_EMAIL_FROM?.trim()),
    invoiceRecipientOverrideConfigured:
      process.env.PREVIEW_EMAIL_RECIPIENT_OVERRIDE?.trim().toLowerCase() === 'info@workmatchr.nl',
    invoiceLinksUsePreview: getPublicAppBaseUrl() === EXPECTED_PREVIEW_ORIGIN,
  })
}

export async function POST(request: Request) {
  if (!isAuthorizedPreviewRequest(request)) return new Response(null, { status: 404 })

  const password = `Wm!${randomBytes(24).toString('base64url')}`

  const prisma = getPrisma()
  const purchase = await prisma.financialPurchase.findFirst({
      where: { idempotencyKey: { startsWith: FIXTURE_PURCHASE_KEY_PREFIX } },
      orderBy: { createdAt: 'asc' },
      select: {
        organizationId: true,
        createdByUserId: true,
        organization: { select: { status: true, organizationType: true } },
      },
    })
  if (
    !purchase
    || purchase.organization.status !== 'ACTIVE'
    || !['PROVIDER', 'BOTH'].includes(purchase.organization.organizationType)
  ) {
    throw new Error('PREVIEW_INVOICE_E2E_FIXTURE_ORGANIZATION_UNAVAILABLE')
  }

  const existing = await prisma.user.findUnique({
    where: { email: FIXTURE_EMAIL },
    select: {
      id: true,
      status: true,
      emailVerified: true,
      accountType: true,
      memberships: {
        where: { organizationId: purchase.organizationId },
        select: { role: true, status: true },
      },
    },
  })
  if (existing) throw new Error('PREVIEW_INVOICE_E2E_FIXTURE_ALREADY_USED')

  const signUpBody = {
    email: FIXTURE_EMAIL,
    password,
    name: 'Preview invoice E2E testlid',
    accountType: 'PROFESSIONAL' as const,
    passwordConfirmation: password,
    acceptedTerms: true,
  }
  await auth.api.signUpEmail({ body: signUpBody })

  const user = await prisma.user.findUnique({ where: { email: FIXTURE_EMAIL }, select: { id: true } })
  if (!user) throw new Error('PREVIEW_INVOICE_E2E_BETTER_AUTH_PROVISIONING_FAILED')

  const result = await prisma.$transaction(async (transaction) => {
    const userId = user.id
    const membershipId = randomUUID()
    await transaction.user.update({
      where: { id: userId },
      data: {
        emailVerified: true,
        status: 'ACTIVE',
        createdByUserId: purchase.createdByUserId,
      },
    })
    await assertCanCreateTenantMembership(transaction, userId, purchase.organizationId)
    await transaction.organizationMembership.create({
      data: {
        id: membershipId,
        userId,
        organizationId: purchase.organizationId,
        role: 'MEMBER',
        status: 'ACTIVE',
      },
    })

    const correlationId = `preview-invoice-e2e-authenticated-fixture:${userId}`
    await appendAccountProvisioningEvent(transaction, {
      eventType: 'ACCOUNT_CREATED',
      subjectUserId: userId,
      actorUserId: purchase.createdByUserId,
      organizationId: purchase.organizationId,
      membershipId,
      reasonCode: 'PREVIEW_INVOICE_E2E_FIXTURE_CREATED',
      correlationId,
      idempotencyKey: `${correlationId}:account`,
      metadata: { environment: 'preview', fixture: 'financial-invoice-e2e' },
    })
    await appendAccountProvisioningEvent(transaction, {
      eventType: 'ORGANIZATION_LINKED',
      subjectUserId: userId,
      actorUserId: purchase.createdByUserId,
      organizationId: purchase.organizationId,
      membershipId,
      reasonCode: 'PREVIEW_INVOICE_E2E_FIXTURE_LINKED',
      correlationId,
      idempotencyKey: `${correlationId}:linked`,
      metadata: { environment: 'preview', fixture: 'financial-invoice-e2e' },
    })
    await appendAccountProvisioningEvent(transaction, {
      eventType: 'ROLE_GRANTED',
      subjectUserId: userId,
      actorUserId: purchase.createdByUserId,
      organizationId: purchase.organizationId,
      membershipId,
      reasonCode: 'PREVIEW_INVOICE_E2E_FIXTURE_ROLE_GRANTED',
      correlationId,
      idempotencyKey: `${correlationId}:role`,
      metadata: { environment: 'preview', fixture: 'financial-invoice-e2e', grantedRole: 'MEMBER' },
    })
    await appendOrganizationMembershipEvent(transaction, {
      eventType: 'MEMBERSHIP_CREATED',
      membershipId,
      userId,
      organizationId: purchase.organizationId,
      actorUserId: purchase.createdByUserId,
      previousRole: null,
      newRole: 'MEMBER',
      previousStatus: null,
      newStatus: 'ACTIVE',
      reasonCode: 'PREVIEW_INVOICE_E2E_FIXTURE_CREATED',
      correlationId,
      idempotencyKey: `${correlationId}:membership`,
      metadata: { environment: 'preview', fixture: 'financial-invoice-e2e' },
    })
    return { created: true }
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 10_000 })

  await changeOrganizationUserRole({
    actorUserId: purchase.createdByUserId,
    successorUserId: user.id,
    reasonCode: 'TENANT_ROLE_CHANGED',
    organizationId: purchase.organizationId,
    expectedRole: 'MEMBER',
    newRole: 'ADMIN',
    idempotencyKey: 'preview-invoice-e2e-fixture-admin-role',
  }, {
    sendNotification: async () => ({
      accepted: true,
      transport: 'DEVELOPMENT_LOG',
      status: 'DEVELOPMENT_ONLY',
      messageId: 'preview-invoice-fixture-only',
    }),
  })

  return authenticatedFixtureResponse(password, { fixtureReady: true, created: result.created, role: 'ADMIN' })
}

async function getLatestFixturePurchase() {
  const prisma = getPrisma()
  const user = await prisma.user.findUnique({
    where: { email: FIXTURE_EMAIL },
    select: { memberships: { where: { status: 'ACTIVE' }, select: { organizationId: true } } },
  })
  const organizationId = user?.memberships[0]?.organizationId
  if (!organizationId || user?.memberships.length !== 1) {
    throw new Error('PREVIEW_INVOICE_E2E_FIXTURE_USER_UNAVAILABLE')
  }

  const purchase = await prisma.financialPurchase.findUnique({
    where: { molliePaymentId: FIXTURE_PAYMENT_ID },
    include: {
      creditedTransaction: true,
      invoice: true,
      paymentEvents: true,
      events: true,
    },
  })
  if (!purchase?.molliePaymentId || purchase.organizationId !== organizationId) {
    throw new Error('PREVIEW_INVOICE_E2E_PURCHASE_UNAVAILABLE')
  }
  return purchase
}

export async function GET(request: Request) {
  if (!isAuthorizedPreviewRequest(request)) return new Response(null, { status: 404 })

  const purchase = await getLatestFixturePurchase()
  const invoiceMailEvents = purchase.events.filter((event) => event.eventType === 'INVOICE_EMAIL_SENT')
  const failedOrExpired = await getPrisma().financialPurchase.findMany({
    where: {
      organizationId: purchase.organizationId,
      status: { in: ['FAILED', 'EXPIRED'] },
    },
    select: { creditedTransactionId: true, invoice: { select: { id: true } }, events: { select: { eventType: true } } },
  })
  const otherOrganization = await getPrisma().organization.findFirst({
    where: { id: { not: purchase.organizationId }, status: 'ACTIVE' },
    select: { id: true },
  })
  const crossTenantInvoice = purchase.invoice && otherOrganization
    ? await getPrisma().financialInvoice.findFirst({
      where: { id: purchase.invoice.id, organizationId: otherOrganization.id },
      select: { id: true },
    })
    : null
  const invoice = purchase.invoice
  const expectedAmounts = invoice
    ? invoice.amountExclVatCents === 100
      && invoice.vatRateBps === 2100
      && invoice.vatAmountCents === 21
      && invoice.amountInclVatCents === 121
      && invoice.currency === 'EUR'
    : false
  const mailMetadata = invoiceMailEvents[0]?.metadata
  const previewOverrideUsed = typeof mailMetadata === 'object'
    && mailMetadata !== null
    && !Array.isArray(mailMetadata)
    && mailMetadata.previewRecipientOverrideUsed === true

  return Response.json({
    status: purchase.status,
    paid: purchase.status === 'PAID',
    paymentEventCount: purchase.paymentEvents.length,
    creditedExactlyOnce: Boolean(purchase.creditedTransactionId)
      && purchase.creditedTransaction?.type === 'PURCHASE'
      && purchase.creditedTransaction.amount === purchase.credits,
    invoiceCreated: Boolean(invoice),
    invoiceSnapshotCorrect: expectedAmounts,
    invoiceMailCount: invoiceMailEvents.length,
    previewMailOverrideUsed: previewOverrideUsed,
    invoiceLinkUsesPreview: getPublicAppBaseUrl() === EXPECTED_PREVIEW_ORIGIN,
    invoiceId: invoice?.id ?? null,
    failedExpiredCount: failedOrExpired.length,
    failedExpiredWithoutCreditInvoiceOrMail: failedOrExpired.length > 0 && failedOrExpired.every((item) =>
      item.creditedTransactionId === null
      && item.invoice === null
      && item.events.every((event) => event.eventType !== 'INVOICE_EMAIL_SENT')),
    crossTenantInvoiceDenied: Boolean(otherOrganization) && crossTenantInvoice === null,
  })
}

export async function PATCH(request: Request) {
  if (!isAuthorizedPreviewRequest(request)) return new Response(null, { status: 404 })

  const before = await getLatestFixturePurchase()
  const result = await processMolliePayment(before.molliePaymentId!)
  const after = await getLatestFixturePurchase()
  return Response.json({
    replayStatus: result.status,
    creditUnchanged: before.creditedTransactionId === after.creditedTransactionId,
    invoiceUnchanged: before.invoice?.id === after.invoice?.id,
    paymentEventCountUnchanged: before.paymentEvents.length === after.paymentEvents.length,
    invoiceMailCountUnchanged:
      before.events.filter((event) => event.eventType === 'INVOICE_EMAIL_SENT').length
      === after.events.filter((event) => event.eventType === 'INVOICE_EMAIL_SENT').length,
  })
}

export async function DELETE(request: Request) {
  if (!isAuthorizedPreviewRequest(request)) return new Response(null, { status: 404 })

  const prisma = getPrisma()
  const user = await prisma.user.findUnique({
    where: { email: FIXTURE_EMAIL },
    select: { id: true, memberships: { where: { status: 'ACTIVE' }, select: { organizationId: true, role: true } } },
  })
  const membership = user?.memberships[0]
  if (!user || !membership || membership.role !== 'ADMIN') {
    throw new Error('PREVIEW_INVOICE_E2E_ADMIN_FIXTURE_UNAVAILABLE')
  }
  const fixturePurchase = await prisma.financialPurchase.findFirst({
    where: { organizationId: membership.organizationId, idempotencyKey: { startsWith: FIXTURE_PURCHASE_KEY_PREFIX } },
    orderBy: { createdAt: 'asc' },
    select: { createdByUserId: true },
  })
  if (!fixturePurchase) throw new Error('PREVIEW_INVOICE_E2E_FIXTURE_ORGANIZATION_UNAVAILABLE')

  await changeOrganizationUserRole({
    actorUserId: fixturePurchase.createdByUserId,
    successorUserId: user.id,
    reasonCode: 'TENANT_ROLE_CHANGED',
    organizationId: membership.organizationId,
    expectedRole: 'ADMIN',
    newRole: 'MEMBER',
    idempotencyKey: 'preview-invoice-e2e-fixture-member-role',
  }, {
    sendNotification: async () => ({
      accepted: true,
      transport: 'DEVELOPMENT_LOG',
      status: 'DEVELOPMENT_ONLY',
      messageId: 'preview-invoice-fixture-only',
    }),
  })
  return Response.json({ role: 'MEMBER', auditRecorded: true })
}
