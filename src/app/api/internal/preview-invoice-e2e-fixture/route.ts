import { randomUUID, timingSafeEqual } from 'node:crypto'

import { Prisma } from '@/generated/prisma/client'
import { appendAccountProvisioningEvent, appendOrganizationMembershipEvent } from '@/lib/account-architecture/account-history-service'
import { assertCanCreateTenantMembership } from '@/lib/account-architecture/tenant-membership-policy'
import { auth } from '@/lib/auth'
import { getPrisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const FIXTURE_EMAIL = 'preview-invoice-e2e-member@workmatchr.example.invalid'
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

  const context = await auth.$context
  const passwordHash = await context.password.hash(password)

  const result = await getPrisma().$transaction(async (transaction) => {
    const purchase = await transaction.financialPurchase.findFirst({
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

    const existing = await transaction.user.findUnique({
      where: { email: FIXTURE_EMAIL },
      include: {
        accounts: {
          where: { providerId: 'credential' },
          select: { accountId: true, password: true },
        },
        memberships: {
          select: { id: true, organizationId: true, role: true, status: true },
        },
      },
    })

    if (existing) {
      const membership = existing.memberships.find((candidate) => candidate.organizationId === purchase.organizationId)
      const isExpected = existing.status === 'ACTIVE'
        && existing.emailVerified
        && existing.accountType === 'PROFESSIONAL'
        && existing.platformRole === 'USER'
        && existing.memberships.length === 1
        && membership?.status === 'ACTIVE'
        && membership.role === 'MEMBER'
        && existing.accounts.some((account) => account.accountId === existing.id && Boolean(account.password))
      if (!isExpected || !membership) throw new Error('PREVIEW_INVOICE_E2E_FIXTURE_CONFLICT')
      await transaction.account.update({
        where: {
          providerId_accountId: {
            providerId: 'credential',
            accountId: existing.id,
          },
        },
        data: { password: passwordHash },
      })
      return { created: false, credentialRefreshed: true }
    }

    const userId = randomUUID()
    const membershipId = randomUUID()
    await transaction.user.create({
      data: {
        id: userId,
        email: FIXTURE_EMAIL,
        displayName: 'Preview invoice E2E testlid',
        emailVerified: true,
        platformRole: 'USER',
        accountType: 'PROFESSIONAL',
        status: 'ACTIVE',
        createdByUserId: purchase.createdByUserId,
        accounts: {
          create: {
            id: randomUUID(),
            accountId: userId,
            providerId: 'credential',
            password: passwordHash,
          },
        },
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
    return { created: true, credentialRefreshed: false }
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 10_000 })

  return Response.json({ fixtureReady: true, created: result.created, credentialRefreshed: result.credentialRefreshed })
}
