import { readInvitationPrice } from './assignment-pricing'
import { createHash, randomUUID } from 'node:crypto'
import { getPrisma } from '@/lib/prisma'
import { AuthEmailDeliveryError, sendAuthEmail } from '@/lib/email'
import { assignmentEmailPayloadSchema, renderAssignmentEmail } from './assignment-email'

export const ASSIGNMENT_EMAIL_MAX_ATTEMPTS = 5
export const ASSIGNMENT_EMAIL_LEASE_MS = 5 * 60_000
export const ASSIGNMENT_EMAIL_RETRY_WINDOW_MS = 23 * 60 * 60_000
const backoff = [60_000, 5 * 60_000, 15 * 60_000, 60 * 60_000]

export function assignmentEmailFailure(error: unknown) {
  if (!(error instanceof AuthEmailDeliveryError)) return { code: 'DELIVERY_INTERNAL_ERROR', retryable: false, retryAfterMs: null }
  return { code: error.code, retryAfterMs: error.retryAfterMs, retryable: error.code === 'EMAIL_PROVIDER_UNAVAILABLE' || error.code === 'EMAIL_PROVIDER_RESPONSE_INVALID' || (error.code === 'EMAIL_PROVIDER_REJECTED' && (error.providerStatusCode === 429 || (error.providerStatusCode ?? 0) >= 500)) }
}

/** Only this template is claimed. External transport always runs outside a DB transaction. */
export async function deliverAssignmentEmails(input: { limit?: number; now?: () => Date; send?: typeof sendAuthEmail } = {}) {
  const db = getPrisma()
  const clock = input.now ?? (() => new Date())
  const send = input.send ?? sendAuthEmail
  const report = { claimed: 0, sent: 0, retry: 0, failed: 0 }
  for (let index = 0; index < Math.min(50, Math.max(0, input.limit ?? 20)); index += 1) {
    const now = clock()
    const token = randomUUID()
    const rows = await db.$queryRaw<Array<{ id: string }>>`
      WITH candidate AS (
        SELECT "id" FROM "NotificationOutbox"
        WHERE "templateKey" = 'MARKETPLACE_INVITATION' AND "channel" = 'EMAIL'
          AND (("status" = 'PENDING' AND "availableAt" <= ${now})
            OR ("status" = 'PROCESSING' AND ("leaseUntil" <= ${now} OR "leaseUntil" IS NULL)))
        ORDER BY "availableAt", "id" FOR UPDATE SKIP LOCKED LIMIT 1
      )
      UPDATE "NotificationOutbox" o SET "status" = 'PROCESSING', "leaseToken" = ${token}::uuid,
        "leaseUntil" = ${new Date(now.getTime() + ASSIGNMENT_EMAIL_LEASE_MS)},
        "firstAttemptAt" = COALESCE(o."firstAttemptAt", ${now}), "attemptCount" = o."attemptCount" + 1
      FROM candidate WHERE o."id" = candidate."id" RETURNING o."id"`
    if (!rows.length) break
    report.claimed += 1
    const job = await db.notificationOutbox.findUniqueOrThrow({ where: { id: rows[0].id } })
    const finish = async (status: 'SENT' | 'FAILED' | 'PENDING', code: string | null, messageId?: string, retryAfterMs?: number | null) => {
      const result = await db.notificationOutbox.updateMany({
        where: { id: job.id, status: 'PROCESSING', leaseToken: token },
        data: { status, lastErrorCode: code, providerMessageId: messageId, leaseToken: null, leaseUntil: null,
          processedAt: status === 'PENDING' ? null : clock(),
          ...(status === 'PENDING' ? { availableAt: new Date(clock().getTime() + Math.max(retryAfterMs ?? 0, backoff[Math.min(job.attemptCount - 1, backoff.length - 1)])) } : {}),
        },
      })
      if (result.count) report[status === 'SENT' ? 'sent' : status === 'PENDING' ? 'retry' : 'failed'] += 1
    }
    if (job.attemptCount > ASSIGNMENT_EMAIL_MAX_ATTEMPTS || now.getTime() - job.firstAttemptAt!.getTime() >= ASSIGNMENT_EMAIL_RETRY_WINDOW_MS) {
      await finish('FAILED', 'DELIVERY_RECONCILIATION_REQUIRED'); continue
    }
    const parsed = assignmentEmailPayloadSchema.safeParse(job.payload)
    if (!parsed.success || !job.recipientUserId) { await finish('FAILED', 'UNSUPPORTED_OR_INVALID_PAYLOAD'); continue }
    const invitation = await db.providerInvitation.findFirst({
      where: { id: parsed.data.invitationId, status: 'INVITED', deadlineAt: { gt: now },
        providerProfile: { selectabilityStatus: 'SELECTABLE', lifecycleStatus: 'QUALIFIED', archivedAt: null, blocks: { none: { release: null } } },
        providerOrganization: { status: 'ACTIVE', organizationType: { in: ['PROVIDER', 'BOTH'] } },
        assignment: { status: { in: ['MATCHING', 'AWAITING_RESPONSES', 'IN_SELECTION'] }, archivedAt: null },
      }, select: { providerOrganizationId: true, snapshot: true, creditCost: true },
    })
    if (!invitation) { await finish('FAILED', 'INVITATION_NOT_DELIVERABLE'); continue }
    const recipient = await db.organizationMembership.findFirst({
      where: { organizationId: invitation.providerOrganizationId, userId: job.recipientUserId, status: 'ACTIVE',
        user: { status: 'ACTIVE', emailVerified: true, accountType: 'PROFESSIONAL', assignmentEmailEnabled: true } },
      select: { user: { select: { email: true } } },
    })
    if (!recipient) { await finish('FAILED', 'RECIPIENT_NOT_DELIVERABLE'); continue }
    let providerAccepted = false
    try {
      const price = readInvitationPrice(invitation)
      const snapshot = invitation.snapshot as Record<string, unknown>
      if (!price.priceSnapshot || price.credits !== parsed.data.preview.priceCredits || JSON.stringify(snapshot.preview) !== JSON.stringify((job.payload as Record<string, unknown>).preview)) {
        await finish('FAILED', 'INVITATION_PAYLOAD_MISMATCH'); continue
      }
      const email = renderAssignmentEmail(parsed.data, recipient.user.email, process.env.BETTER_AUTH_URL ?? '', job.idempotencyKey)
      // Freeze identity and rendered content across retries without storing an email address/body.
      const fingerprint = createHash('sha256').update(JSON.stringify([email, process.env.AUTH_EMAIL_FROM ?? ''])).digest('hex')
      if (job.deliveryFingerprint && job.deliveryFingerprint !== fingerprint) { await finish('FAILED', 'DELIVERY_PAYLOAD_CHANGED'); continue }
      const ready = await db.notificationOutbox.updateMany({ where: { id: job.id, leaseToken: token, status: 'PROCESSING', leaseUntil: { gt: clock() } }, data: { deliveryFingerprint: fingerprint } })
      if (!ready.count) continue
      const result = await send(email)
      if (result.status !== 'ACCEPTED') { await finish('FAILED', 'DEVELOPMENT_ONLY'); continue }
      providerAccepted = true
      await finish('SENT', null, result.messageId)
    } catch (error) {
      // Keep the lease after a lost acknowledgement; retry the same provider key, never a new send.
      if (providerAccepted) throw new Error('DELIVERY_ACKNOWLEDGEMENT_FAILED')
      const failure = assignmentEmailFailure(error)
      await finish(failure.retryable && job.attemptCount < ASSIGNMENT_EMAIL_MAX_ATTEMPTS ? 'PENDING' : 'FAILED', failure.code, undefined, failure.retryAfterMs)
    }
  }
  return report
}
