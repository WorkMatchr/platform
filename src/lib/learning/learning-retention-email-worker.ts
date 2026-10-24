import 'server-only'
import { isLearningRuntimeEnabled } from './learning-runtime-policy'
import { randomUUID } from 'node:crypto'
import { getPrisma } from '@/lib/prisma'
import { AuthEmailDeliveryError, escapeHtml, sendAuthEmail, type AuthEmail } from '@/lib/email'
import { getPublicAppBaseUrl } from '@/lib/public-app-url'

const TEMPLATE_WEEK = 'LEARNING_RETENTION_WEEK_READY'
const TEMPLATE_ANNUAL = 'LEARNING_RETENTION_ANNUAL_READY'
const MAX_ATTEMPTS = 5
const LEASE_MS = 5 * 60_000
const RETRY_MS = [60_000, 5 * 60_000, 15 * 60_000, 60 * 60_000]

export function createLearningRetentionEmail(input: { to: string; firstName: string; type: 'WEEK' | 'ANNUAL'; destinationUrl: string; idempotencyKey: string }): AuthEmail {
  const annual = input.type === 'ANNUAL'
  const subject = annual ? 'Een jaar geleden behaalde je RI&E in de praktijk' : 'Je wekelijkse RI&E-kennischeck staat klaar'
  const duration = annual ? '10 vragen' : '5 vragen · ongeveer 3–5 minuten'
  const message = annual
    ? `Het is ongeveer een jaar geleden dat je de WorkMatchr-opleiding RI&E in de praktijk hebt afgerond.\n\nEen goed moment om te kijken hoeveel kennis nog paraat is. Doe een korte kennischeck.\n\nDeze check verlengt of vernieuwt je certificaat niet.`
    : `Je nieuwe kennischeck voor RI&E in de praktijk staat klaar.\n\nJe ontvangt deze berichten omdat je zelf hebt gekozen voor het 12-weekse kennisbehoudprogramma. Deze berichten gaan alleen over je opleiding en kennisbehoud, zonder reclame of commerciële berichten. Je kunt kennisbehoud op ieder moment stoppen via Mijn e-learnings.`
  const url = escapeHtml(input.destinationUrl)
  const safeFirstName = escapeHtml(input.firstName || 'deelnemer')
  return {
    kind: annual ? 'LEARNING_RETENTION_ANNUAL_READY' : 'LEARNING_RETENTION_WEEK_READY',
    to: input.to,
    subject,
    text: `Hoi ${input.firstName || 'deelnemer'},\n\n${message}\n\n${duration}\n\n${input.destinationUrl}\n\nWorkMatchr Learning`,
    html: `<p>Hoi ${safeFirstName},</p><p>${message.replace(/\n\n/g, '</p><p>')}</p><p>${escapeHtml(duration)}</p><p><a href="${url}">${annual ? 'Start de jaarlijkse kennischeck' : 'Start kennisbehoud'}</a></p><p>WorkMatchr Learning</p>`,
    idempotencyKey: input.idempotencyKey,
  }
}

function deliveryFailure(error: unknown) {
  if (!(error instanceof AuthEmailDeliveryError)) return { code: 'DELIVERY_INTERNAL_ERROR', retryable: false, retryAfterMs: null }
  const retryable = error.code === 'EMAIL_PROVIDER_UNAVAILABLE' || error.code === 'EMAIL_PROVIDER_RESPONSE_INVALID'
    || (error.code === 'EMAIL_PROVIDER_REJECTED' && (error.providerStatusCode === 429 || (error.providerStatusCode ?? 0) >= 500))
  return { code: error.code, retryable, retryAfterMs: error.retryAfterMs }
}

export async function deliverLearningRetentionEmails(input: { limit?: number; now?: () => Date; send?: (message: AuthEmail) => ReturnType<typeof sendAuthEmail> } = {}) {
  if (!isLearningRuntimeEnabled()) return { claimed: 0, sent: 0, retry: 0, failed: 0 }
  const db = getPrisma()
  const now = input.now ?? (() => new Date())
  const send = input.send ?? sendAuthEmail
  const report = { claimed: 0, sent: 0, retry: 0, failed: 0 }
  for (let index = 0; index < Math.min(20, Math.max(0, input.limit ?? 10)); index++) {
    const tick = now()
    const leaseToken = randomUUID()
    const rows = await db.$queryRaw<Array<{ id: string }>>`
      WITH candidate AS (
        SELECT "id" FROM "NotificationOutbox"
        WHERE "templateKey" IN (${TEMPLATE_WEEK}, ${TEMPLATE_ANNUAL}) AND "channel" = 'EMAIL'
          AND (("status" = 'PENDING' AND "availableAt" <= ${tick})
            OR ("status" = 'PROCESSING' AND ("leaseUntil" <= ${tick} OR "leaseUntil" IS NULL)))
        ORDER BY "availableAt", "id" FOR UPDATE SKIP LOCKED LIMIT 1
      )
      UPDATE "NotificationOutbox" o SET "status" = 'PROCESSING', "leaseToken" = ${leaseToken}::uuid,
        "leaseUntil" = ${new Date(tick.getTime() + LEASE_MS)}, "firstAttemptAt" = COALESCE(o."firstAttemptAt", ${tick}),
        "attemptCount" = o."attemptCount" + 1
      FROM candidate WHERE o."id" = candidate."id" RETURNING o."id"`
    if (!rows.length) break
    report.claimed++
    const job = await db.notificationOutbox.findUniqueOrThrow({ where: { id: rows[0]!.id } })
    const finish = async (status: 'SENT' | 'FAILED' | 'PENDING', code: string | null, messageId?: string, delay?: number | null) => {
      const result = await db.notificationOutbox.updateMany({
        where: { id: job.id, status: 'PROCESSING', leaseToken },
        data: { status, lastErrorCode: code, providerMessageId: messageId, leaseToken: null, leaseUntil: null,
          processedAt: status === 'PENDING' ? null : now(),
          ...(status === 'PENDING' ? { availableAt: new Date(now().getTime() + Math.max(delay ?? 0, RETRY_MS[Math.min(job.attemptCount - 1, RETRY_MS.length - 1)])) } : {}),
        },
      })
      if (result.count) report[status === 'SENT' ? 'sent' : status === 'PENDING' ? 'retry' : 'failed']++
    }
    const payload = job.payload && typeof job.payload === 'object' ? job.payload as Record<string, unknown> : {}
    if (!job.recipientUserId || job.attemptCount > MAX_ATTEMPTS || tick.getTime() - (job.firstAttemptAt?.getTime() ?? tick.getTime()) > 23 * 60 * 60_000) {
      await finish('FAILED', 'DELIVERY_RECONCILIATION_REQUIRED'); continue
    }
    const isAnnual = job.templateKey === TEMPLATE_ANNUAL
    if ((!isAnnual && (typeof payload.participationId !== 'string' || typeof payload.weeklyCheckId !== 'string'))
      || (isAnnual && typeof payload.annualReminderId !== 'string')) { await finish('FAILED', 'UNSUPPORTED_OR_INVALID_PAYLOAD'); continue }
    const record = isAnnual
      ? await db.learningAnnualReminder.findFirst({ where: { id: payload.annualReminderId as string, userId: job.recipientUserId, revokedAt: null, sentAt: null, scheduledFor: { lte: tick }, user: { status: 'ACTIVE', emailVerified: true } }, select: { id: true, userId: true, user: { select: { email: true } } } })
      : await db.learningRetentionParticipation.findFirst({ where: { id: payload.participationId as string, userId: job.recipientUserId, status: 'ACTIVE', stoppedAt: null, user: { status: 'ACTIVE', emailVerified: true }, weeklyChecks: { some: { id: payload.weeklyCheckId as string, weekNumber: Number(payload.weekNumber), availableAt: { lte: tick } } } }, select: { id: true, userId: true, user: { select: { email: true } } } })
    if (!record) { await finish('FAILED', 'RETENTION_NOT_DELIVERABLE'); continue }
    const profile = await db.learningProfile.findUnique({ where: { userId: record.userId }, select: { firstName: true } })
    const message = createLearningRetentionEmail({
      to: record.user.email, firstName: profile?.firstName ?? '', type: isAnnual ? 'ANNUAL' : 'WEEK',
      destinationUrl: new URL(isAnnual ? '/e-learnings/rie-in-de-praktijk/kennisbehoud/jaarlijks' : '/e-learnings/rie-in-de-praktijk/kennisbehoud', getPublicAppBaseUrl()).toString(),
      idempotencyKey: job.idempotencyKey,
    })
    const stillDeliverable = isAnnual
      ? await db.learningAnnualReminder.findFirst({ where: { id: record.id, userId: record.userId, revokedAt: null, sentAt: null, scheduledFor: { lte: now() } }, select: { id: true } })
      : await db.learningRetentionParticipation.findFirst({ where: { id: record.id, userId: record.userId, status: 'ACTIVE', stoppedAt: null, weeklyChecks: { some: { id: payload.weeklyCheckId as string, availableAt: { lte: now() } } } }, select: { id: true } })
    if (!stillDeliverable) { await finish('FAILED', 'RETENTION_NOT_DELIVERABLE'); continue }
    try {
      const sent = await send(message)
      if (sent.status !== 'ACCEPTED') { await finish('FAILED', 'DEVELOPMENT_ONLY'); continue }
      await finish('SENT', null, sent.messageId)
      if (isAnnual) await db.learningAnnualReminder.updateMany({ where: { id: record.id, userId: record.userId, revokedAt: null, sentAt: null }, data: { sentAt: now() } })
    } catch (error) {
      const failure = deliveryFailure(error)
      await finish(failure.retryable && job.attemptCount < MAX_ATTEMPTS ? 'PENDING' : 'FAILED', failure.code, undefined, failure.retryAfterMs)
    }
  }
  return report
}
