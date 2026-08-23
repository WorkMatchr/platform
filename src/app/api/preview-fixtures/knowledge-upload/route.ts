import { randomUUID, timingSafeEqual } from 'node:crypto'
import { runWithEndpointContext, type AuthEndpointContext } from '@better-auth/core/context'
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { appendAccountProvisioningEvent, appendOrganizationMembershipEvent } from '@/lib/account-architecture/account-history-service'
import { getPrisma } from '@/lib/prisma'

const expectedBranch = 'codex/knowledge-source-upload-v1'

function authorized(request: Request) {
  if (process.env.VERCEL_ENV !== 'preview' || process.env.VERCEL_GIT_COMMIT_REF !== expectedBranch) return false
  const configured = process.env.KNOWLEDGE_UPLOAD_ACCEPTANCE_SECRET
  const supplied = request.headers.get('authorization')?.replace(/^Bearer\s+/u, '')
  if (!configured || !supplied) return false
  const left = Buffer.from(configured); const right = Buffer.from(supplied)
  return left.length === right.length && timingSafeEqual(left, right)
}

export async function POST(request: Request) {
  if (!authorized(request)) return new NextResponse(null, { status: 404 })
  const body = await request.json().catch(() => null) as { email?: unknown; password?: unknown } | null
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
  const password = typeof body?.password === 'string' ? body.password : ''
  if (!email.endsWith('@example.invalid') || password.length < 15) return NextResponse.json({ ok: false }, { status: 400 })
  const database = getPrisma()
  const platform = await database.organization.findUnique({ where: { systemKey: 'WORKMATCHR_PLATFORM' } })
  if (!platform || platform.status !== 'ACTIVE' || platform.organizationType !== 'PLATFORM_OPERATOR') return new NextResponse(null, { status: 404 })
  const existing = await database.user.findUnique({ where: { email }, select: { id: true } })
  if (existing) return NextResponse.json({ ok: true, userId: existing.id, replay: true })
  const context = await auth.$context
  const passwordHash = await runWithEndpointContext(
    { context } as unknown as AuthEndpointContext,
    () => context.password.hash(password),
  )
  const userId = randomUUID(); const membershipId = randomUUID(); const correlationId = `preview-knowledge-upload:${userId}`
  await database.$transaction(async (transaction) => {
    await transaction.user.create({ data: {
      id: userId, email, displayName: 'Preview Knowledge Upload Beheerder', emailVerified: true,
      platformRole: 'ADMIN', status: 'ACTIVE',
      accounts: { create: { id: randomUUID(), accountId: userId, providerId: 'credential', password: passwordHash } },
    } })
    await transaction.organizationMembership.create({ data: { id: membershipId, userId, organizationId: platform.id, role: 'ADMIN', status: 'ACTIVE' } })
    await appendAccountProvisioningEvent(transaction, {
      eventType: 'ACCOUNT_CREATED', subjectUserId: userId, actorUserId: userId, organizationId: platform.id, membershipId,
      reasonCode: 'PREVIEW_KNOWLEDGE_UPLOAD_ACCEPTANCE', correlationId, idempotencyKey: `${correlationId}:account`, metadata: { environment: 'preview', fixture: true },
    })
    await appendOrganizationMembershipEvent(transaction, {
      eventType: 'MEMBERSHIP_CREATED', membershipId, userId, organizationId: platform.id, actorUserId: userId,
      previousRole: null, newRole: 'ADMIN', previousStatus: null, newStatus: 'ACTIVE',
      reasonCode: 'PREVIEW_KNOWLEDGE_UPLOAD_ACCEPTANCE', correlationId, idempotencyKey: `${correlationId}:membership`, metadata: { environment: 'preview', fixture: true },
    })
    await transaction.marketplaceAuditEvent.create({ data: {
      actorUserId: userId, actorRole: 'PLATFORM_ADMIN', organizationId: platform.id,
      action: 'PREVIEW_KNOWLEDGE_UPLOAD_FIXTURE_PROVISIONED', entityType: 'User', entityId: userId,
      correlationKey: `${correlationId}:audit`, metadata: { environment: 'preview', fixture: true },
    } })
  })
  return NextResponse.json({ ok: true, userId, replay: false })
}
