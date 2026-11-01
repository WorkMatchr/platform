import 'server-only'
import { createHash, randomUUID } from 'node:crypto'
import { getPrisma } from '@/lib/prisma'
import { AuthEmailDeliveryError, sendAuthEmail } from '@/lib/email'
import { assignmentEmailFailure, ASSIGNMENT_EMAIL_LEASE_MS, ASSIGNMENT_EMAIL_MAX_ATTEMPTS, ASSIGNMENT_EMAIL_RETRY_WINDOW_MS } from '@/lib/marketplace/assignment-email-worker'
import { CONTACT_TEMPLATE, CONTACT_RETENTION_MS, contactConfiguration } from './contact-configuration'
import { openContact, renderContactEmail } from './contact-envelope'
import { cleanContactRetention } from './contact-retention'

const backoff = [60_000, 5 * 60_000, 15 * 60_000, 60 * 60_000]
// Five contact attempts fit inside the 60-second route budget, leaving DB headroom.
const providerWaitMs = 8_000
const uncertainCodes = ['EMAIL_PROVIDER_UNAVAILABLE', 'EMAIL_PROVIDER_RESPONSE_INVALID', 'EMAIL_PROVIDER_REJECTED', 'DELIVERY_INTERNAL_ERROR', 'DELIVERY_RECONCILIATION_REQUIRED']
function requiresReconciliation(error: unknown) {
  if (!(error instanceof AuthEmailDeliveryError)) return true
  return error.code !== 'EMAIL_PROVIDER_REJECTED' || !error.providerStatusCode || error.providerStatusCode >= 500
}
async function sendWithDeadline(send: typeof sendAuthEmail, email: Parameters<typeof sendAuthEmail>[0]) {
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([send(email), new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new AuthEmailDeliveryError('EMAIL_PROVIDER_UNAVAILABLE', 'De provideruitkomst is nog onbekend.')), providerWaitMs)
    })])
  } finally { clearTimeout(timer) }
  // Timeout cannot revoke an acceptance. No automatic retry: reconcile explicitly.
}
/** Template consumer of the existing outbox; no external call in a transaction. */
export async function deliverContactEmails(input: { limit?: number; now?: () => Date; send?: typeof sendAuthEmail } = {}) {
  const db = getPrisma(), clock = input.now ?? (() => new Date()), send = input.send ?? sendAuthEmail
  const retention = await cleanContactRetention(clock())
  const report = { claimed: 0, sent: 0, retry: 0, failed: 0, redacted: retention.redacted, retention }
  if (process.env.CONTACT_OUTBOX_ENABLED !== 'true') return report
  const config = contactConfiguration()
  if (!config) throw new Error('CONTACT_CONFIGURATION_REQUIRED')
  for (let i = 0; i < Math.min(10, Math.max(0, input.limit ?? 5)); i++) {
    const now = clock(), token = randomUUID()
    const rows = await db.$queryRaw<{ id: string; previousStatus: string }[]>`
      WITH candidate AS (
        SELECT "id", "status" FROM "NotificationOutbox" WHERE "templateKey" = ${CONTACT_TEMPLATE} AND "channel" = 'EMAIL'
          AND "createdAt" > ${new Date(now.getTime() - CONTACT_RETENTION_MS)}
          AND (("status" = 'PENDING' AND "availableAt" <= ${now}) OR ("status" = 'PROCESSING' AND ("leaseUntil" <= ${now} OR "leaseUntil" IS NULL)))
        ORDER BY "availableAt", "id" FOR UPDATE SKIP LOCKED LIMIT 1
      )
      UPDATE "NotificationOutbox" o SET "status" = 'PROCESSING', "leaseToken" = ${token}::uuid,
        "leaseUntil" = ${new Date(now.getTime() + ASSIGNMENT_EMAIL_LEASE_MS)},
        "firstAttemptAt" = COALESCE(o."firstAttemptAt", ${now}), "attemptCount" = o."attemptCount" + 1
      FROM candidate WHERE o."id" = candidate."id" RETURNING o."id", candidate."status" AS "previousStatus"`
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
    if ((rows[0].previousStatus === 'PROCESSING' && job.deliveryFingerprint)
      || (job.lastErrorCode && uncertainCodes.includes(job.lastErrorCode))
      || job.attemptCount > ASSIGNMENT_EMAIL_MAX_ATTEMPTS || now.getTime() - job.firstAttemptAt!.getTime() >= ASSIGNMENT_EMAIL_RETRY_WINDOW_MS) {
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
      if (requiresReconciliation(error)) await finish('FAILED', 'DELIVERY_RECONCILIATION_REQUIRED')
      else await finish(failure.retryable && job.attemptCount < ASSIGNMENT_EMAIL_MAX_ATTEMPTS ? 'PENDING' : 'FAILED',
        error instanceof AuthEmailDeliveryError && error.providerStatusCode === 429 ? 'EMAIL_RATE_LIMITED' : failure.code, undefined, failure.retryAfterMs)
    }
  }
  return report
}
