import 'server-only'
import { createHash, randomUUID } from 'node:crypto'
import { getPrisma } from '@/lib/prisma'
import { AuthEmailDeliveryError, sendAuthEmail } from '@/lib/email'
import { assignmentEmailFailure, ASSIGNMENT_EMAIL_LEASE_MS, ASSIGNMENT_EMAIL_MAX_ATTEMPTS, ASSIGNMENT_EMAIL_RETRY_WINDOW_MS } from '@/lib/marketplace/assignment-email-worker'
import { CONTACT_TEMPLATE, CONTACT_RETENTION_MS, contactConfiguration } from './contact-configuration'
import { openContact, renderContactEmail } from './contact-envelope'

const backoff = [60_000, 5 * 60_000, 15 * 60_000, 60 * 60_000]
// Five contact attempts fit inside the 60-second route budget, leaving DB headroom.
const providerWaitMs = 8_000
async function sendWithDeadline(send: typeof sendAuthEmail, email: Parameters<typeof sendAuthEmail>[0]) {
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([send(email), new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new AuthEmailDeliveryError('EMAIL_PROVIDER_UNAVAILABLE', 'De provideruitkomst is nog onbekend.')), providerWaitMs)
    })])
  } finally { clearTimeout(timer) }
  // Timeout cannot revoke a provider acceptance. Retry only with the frozen payload/key;
  // a late completion cannot update this record. Existing 23h reconciliation limit applies.
}
/** Template consumer of the existing outbox; no external call in a transaction. */
export async function deliverContactEmails(input: { limit?: number; now?: () => Date; send?: typeof sendAuthEmail } = {}) {
  const report = { claimed: 0, sent: 0, retry: 0, failed: 0, redacted: 0 }
  const db = getPrisma(), clock = input.now ?? (() => new Date()), send = input.send ?? sendAuthEmail
  const cleanupTime = clock()
  // Retention is independent of delivery permission and decryption configuration.
  // Keep only a keyed digest for replay protection; never clean an active lease.
  report.redacted = await db.$executeRaw`
    UPDATE "NotificationOutbox" SET "payload" = jsonb_build_object('digest', "payload"->>'digest', 'redacted', true),
      "status" = CASE WHEN "status" = 'SENT' THEN 'SENT'::"NotificationOutboxStatus" ELSE 'FAILED'::"NotificationOutboxStatus" END,
      "lastErrorCode" = CASE WHEN "status" = 'SENT' THEN NULL ELSE 'CONTACT_RETENTION_EXPIRED' END,
      "processedAt" = COALESCE("processedAt", ${cleanupTime}), "leaseToken" = NULL, "leaseUntil" = NULL
    WHERE "templateKey" = ${CONTACT_TEMPLATE} AND "channel" = 'EMAIL' AND "payload" ? 'ciphertext'
      AND "createdAt" <= ${new Date(cleanupTime.getTime() - CONTACT_RETENTION_MS)}
      AND ("leaseUntil" IS NULL OR "leaseUntil" <= ${cleanupTime})`
  if (process.env.CONTACT_OUTBOX_ENABLED !== 'true') return report
  const config = contactConfiguration()
  if (!config) throw new Error('CONTACT_CONFIGURATION_REQUIRED')
  for (let i = 0; i < Math.min(10, Math.max(0, input.limit ?? 5)); i++) {
    const now = clock(), token = randomUUID()
    const rows = await db.$queryRaw<{ id: string }[]>`
      WITH candidate AS (
        SELECT "id" FROM "NotificationOutbox" WHERE "templateKey" = ${CONTACT_TEMPLATE} AND "channel" = 'EMAIL'
          AND (("status" = 'PENDING' AND "availableAt" <= ${now}) OR ("status" = 'PROCESSING' AND ("leaseUntil" <= ${now} OR "leaseUntil" IS NULL)))
        ORDER BY "availableAt", "id" FOR UPDATE SKIP LOCKED LIMIT 1
      )
      UPDATE "NotificationOutbox" o SET "status" = 'PROCESSING', "leaseToken" = ${token}::uuid,
        "leaseUntil" = ${new Date(now.getTime() + ASSIGNMENT_EMAIL_LEASE_MS)},
        "firstAttemptAt" = COALESCE(o."firstAttemptAt", ${now}), "attemptCount" = o."attemptCount" + 1
      FROM candidate WHERE o."id" = candidate."id" RETURNING o."id"`
    if (!rows.length) break
    report.claimed++
    const job = await db.notificationOutbox.findUniqueOrThrow({ where: { id: rows[0].id } })
    const finish = async (status: 'SENT' | 'FAILED' | 'PENDING', code: string | null, messageId?: string, retryAfterMs?: number | null) => {
      const digest = (job.payload as { digest?: string }).digest
      const result = await db.notificationOutbox.updateMany({ where: { id: job.id, status: 'PROCESSING', leaseToken: token },
        data: { status, lastErrorCode: code, providerMessageId: messageId, leaseToken: null, leaseUntil: null,
          processedAt: status === 'PENDING' ? null : clock(),
          ...(status === 'SENT' ? { payload: { digest: digest ?? '', redacted: true } } : {}),
          ...(status === 'PENDING' ? { availableAt: new Date(clock().getTime() + Math.max(retryAfterMs ?? 0, backoff[Math.min(job.attemptCount - 1, backoff.length - 1)])) } : {}) } })
      if (result.count) report[status === 'SENT' ? 'sent' : status === 'PENDING' ? 'retry' : 'failed']++
    }
    if (job.attemptCount > ASSIGNMENT_EMAIL_MAX_ATTEMPTS || now.getTime() - job.firstAttemptAt!.getTime() >= ASSIGNMENT_EMAIL_RETRY_WINDOW_MS) {
      await finish('FAILED', 'DELIVERY_RECONCILIATION_REQUIRED'); continue
    }
    let email
    try {
      const content = openContact(job.payload, config.key, job.idempotencyKey)
      // Do not redirect queued messages after an operator configuration change.
      if (content.recipient !== config.recipient) { await finish('FAILED', 'CONTACT_RECIPIENT_CHANGED'); continue }
      email = renderContactEmail(content, job.idempotencyKey)
    } catch { await finish('FAILED', 'INVALID_CONTACT_ENVELOPE'); continue }
    const fingerprint = createHash('sha256').update(JSON.stringify([email, process.env.AUTH_EMAIL_FROM ?? ''])).digest('hex')
    if (job.deliveryFingerprint && job.deliveryFingerprint !== fingerprint) { await finish('FAILED', 'DELIVERY_PAYLOAD_CHANGED'); continue }
    const ready = await db.notificationOutbox.updateMany({ where: { id: job.id, leaseToken: token, status: 'PROCESSING', leaseUntil: { gt: clock() } }, data: { deliveryFingerprint: fingerprint } })
    if (!ready.count) continue
    let providerAccepted = false
    try {
      const result = await sendWithDeadline(send, email)
      if (result.status !== 'ACCEPTED' || result.transport !== 'RESEND') { await finish('FAILED', 'DEVELOPMENT_ONLY'); continue }
      providerAccepted = true
      await finish('SENT', null, result.messageId)
    } catch (error) {
      if (providerAccepted) throw new Error('DELIVERY_ACKNOWLEDGEMENT_FAILED')
      const failure = assignmentEmailFailure(error)
      await finish(failure.retryable && job.attemptCount < ASSIGNMENT_EMAIL_MAX_ATTEMPTS ? 'PENDING' : 'FAILED', failure.code, undefined, failure.retryAfterMs)
    }
  }
  return report
}
