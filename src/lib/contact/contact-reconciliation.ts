import 'server-only'
import { createHash } from 'node:crypto'
import { Prisma } from '@/generated/prisma/client'
import { getPrisma } from '@/lib/prisma'
import { isPreviewInfrastructureAccepted } from '@/lib/maintenance/preview-isolation'
import { CONTACT_TEMPLATE } from './contact-configuration'
import { ContactReconciliationError as Failure, isDesignatedContactOperator, reconciliationEnabled, reconciliationInput } from './contact-reconciliation-policy'

/** Identity is supplied only by the Better Auth route, never the request body. */
export async function reconcileContact(identity: { userId: string; sessionId: string }, input: unknown) {
  if (!reconciliationEnabled() || !isPreviewInfrastructureAccepted()) throw new Failure('CLOSED')
  if (!isDesignatedContactOperator(identity.userId)) throw new Failure('FORBIDDEN')
  const parsed = reconciliationInput.safeParse(input)
  if (!parsed.success) throw new Failure('INVALID')
  const value = parsed.data
  // Fixed schema/key order; no free text, provider payload or email content in audit.
  const decisionHash = createHash('sha256').update(JSON.stringify(value)).digest('hex')
  const correlationKey = `contact-reconcile:${value.outboxId}`
  return getPrisma().$transaction(async tx => {
    // Same lock as admission/retention. Row locks also exclude the existing dispatcher.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(310034)`
    const now = new Date()
    const actors = await tx.$queryRaw<{ id: string }[]>`
      SELECT u."id" FROM "User" u
      JOIN "Session" s ON s."userId" = u."id"
      JOIN "OrganizationMembership" m ON m."userId" = u."id"
      JOIN "Organization" o ON o."id" = m."organizationId"
      WHERE u."id" = ${identity.userId}::uuid AND s."id" = ${identity.sessionId}::uuid
        AND u."status" = 'ACTIVE' AND u."platformRole" = 'ADMIN' AND u."emailVerified" = true
        AND s."expiresAt" > ${now} AND s."impersonatedUserId" IS NULL AND s."impersonationStartedAt" IS NULL
        AND m."status" = 'ACTIVE' AND m."role" IN ('OWNER', 'ADMIN')
        AND o."status" = 'ACTIVE' AND o."organizationType" = 'PLATFORM_OPERATOR' AND o."systemKey" = 'WORKMATCHR_PLATFORM'
      FOR SHARE OF u, s, m, o`
    if (actors.length !== 1) throw new Failure('FORBIDDEN')
    const previous = await tx.marketplaceAuditEvent.findUnique({ where: { correlationKey } })
    if (previous) {
      const metadata = previous.metadata as { decisionHash?: string } | null
      if (previous.action !== 'CONTACT_RECONCILED' || previous.actorUserId !== identity.userId
        || metadata?.decisionHash !== decisionHash) throw new Failure('CONFLICT')
      const current = await tx.notificationOutbox.findUnique({ where: { id: value.outboxId }, select: { status: true, processedAt: true } })
      if (current && (current.status !== previous.nextState || current.processedAt?.getTime() !== previous.createdAt.getTime())) throw new Failure('CONFLICT')
      return { outcome: value.outcome, repeated: true }
    }
    const rows = await tx.$queryRaw<{ id: string }[]>`
      SELECT "id" FROM "NotificationOutbox" WHERE "id" = ${value.outboxId}::uuid
        AND "templateKey" = ${CONTACT_TEMPLATE} AND "channel" = 'EMAIL' AND "recipientUserId" IS NULL FOR UPDATE`
    if (rows.length !== 1) throw new Failure('CONFLICT')
    const row = await tx.notificationOutbox.findUniqueOrThrow({ where: { id: value.outboxId }, select: { id: true, status: true, leaseUntil: true, attemptCount: true, deliveryFingerprint: true, firstAttemptAt: true, createdAt: true, providerMessageId: true } })
    const observed = new Date(value.evidenceObservedAt)
    if (row.status !== 'FAILED' || (row.leaseUntil && row.leaseUntil > now)
      || row.attemptCount !== value.expectedAttemptCount || row.deliveryFingerprint !== value.expectedFingerprint
      || !row.firstAttemptAt || row.firstAttemptAt < row.createdAt || row.firstAttemptAt > now
      || observed < row.firstAttemptAt || observed > now
      || (row.providerMessageId !== null && row.providerMessageId !== value.providerMessageId)) throw new Failure('CONFLICT')

    const nextState = value.outcome === 'ACCEPTED' ? 'SENT' : 'FAILED'
    await tx.marketplaceAuditEvent.create({ data: {
      actorUserId: identity.userId, actorRole: 'CONTACT_RECONCILIATION_OPERATOR',
      action: 'CONTACT_RECONCILED', entityType: 'NotificationOutbox', entityId: row.id,
      previousState: row.status, nextState, reason: value.reason, correlationKey, createdAt: now,
      metadata: { policyVersion: 'CONTACT_RECONCILIATION_V1', decisionHash, decisionId: value.decisionId,
        evidenceId: value.evidenceId, evidenceSha256: value.evidenceSha256, evidenceObservedAt: value.evidenceObservedAt,
        outcome: value.outcome, attemptCount: row.attemptCount },
    } })
    // No payload access/redaction, attempt reset, re-enqueue, provider call or global dispatch.
    await tx.notificationOutbox.update({ where: { id: row.id }, data: {
      status: nextState, processedAt: now, providerMessageId: value.providerMessageId,
      lastErrorCode: value.outcome === 'ACCEPTED' ? null : 'CONTACT_RECONCILED_NOT_ACCEPTED',
      leaseToken: null, leaseUntil: null,
    } })
    return { outcome: value.outcome, repeated: false }
  }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted, timeout: 10_000, maxWait: 5_000 })
}
