import { randomUUID, timingSafeEqual } from 'node:crypto'

import { Prisma } from '@/generated/prisma/client'
import { appendAccountProvisioningEvent, appendOrganizationMembershipEvent } from '@/lib/account-architecture/account-history-service'
import { assertCanCreateTenantMembership } from '@/lib/account-architecture/tenant-membership-policy'
import { auth } from '@/lib/auth'
import { getPrisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const FIXTURE_EMAIL = 'preview-invoice-e2e-member-20260823@workmatchr.example.invalid'
const FIXTURE_PURCHASE_KEY_PREFIX = 'preview-mollie-acceptance-credit-purchase-'

function isAuthorizedPreviewRequest(request: Request): boolean {
  if (process.env.VERCEL_ENV !== 'preview') return false

  const expected = process.env.PREVIEW_INVOICE_E2E_HARNESS_SECRET
  const supplied = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (!expected || !supplied) return false

  const expectedBuffer = Buffer.from(expected)
  const suppliedBuffer = Buffer.from(supplied)
  return expectedBuffer.length === suppliedBuffer.length && timingSafeEqual(expectedBuffer, suppliedBuffer)
}

export async function POST(request: Request) {
  if (!isAuthorizedPreviewRequest(request)) return new Response(null, { status: 404 })

  const password = process.env.PREVIEW_INVOICE_E2E_PASSWORD
  if (!password || password.length < 15) return new Response(null, { status: 404 })

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

  const existing = await prisma.user.findUnique({ where: { email: FIXTURE_EMAIL }, select: { id: true } })
  if (existing) throw new Error('PREVIEW_INVOICE_E2E_FIXTURE_CONFLICT')

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

    const correlationId = 'preview-invoice-e2e-authenticated-fixture'
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

  return Response.json({ fixtureReady: true, created: result.created })
}
