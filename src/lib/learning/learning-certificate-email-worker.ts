import 'server-only'
import { isLearningRuntimeEnabled } from './learning-runtime-policy'
import { createHash, randomUUID } from 'node:crypto'
import { getPrisma } from '@/lib/prisma'
import { getPublicAppBaseUrl } from '@/lib/public-app-url'
import { AuthEmailDeliveryError, escapeHtml, sendAuthEmail, type AuthEmail } from '@/lib/email'
import { buildLearningCertificatePdf, learningCertificateFilename } from '@/lib/learning/learning-certificate-pdf'

const MAX_ATTEMPTS = 5
const LEASE_MS = 5 * 60_000
const RETRY_MS = [60_000, 5 * 60_000, 15 * 60_000, 60 * 60_000]
const MAX_CERTIFICATE_ATTACHMENT_BYTES = 20 * 1024 * 1024

export function isCertificateAttachmentWithinLimit(byteLength: number) {
  return Number.isSafeInteger(byteLength) && byteLength >= 0 && byteLength <= MAX_CERTIFICATE_ATTACHMENT_BYTES
}

function deliveryFailure(error: unknown) {
  if (!(error instanceof AuthEmailDeliveryError)) return { code: 'DELIVERY_INTERNAL_ERROR', retryable: false, retryAfterMs: null }
  const retryable = error.code === 'EMAIL_PROVIDER_UNAVAILABLE' || error.code === 'EMAIL_PROVIDER_RESPONSE_INVALID'
    || (error.code === 'EMAIL_PROVIDER_REJECTED' && (error.providerStatusCode === 429 || (error.providerStatusCode ?? 0) >= 500))
  return { code: error.code, retryable, retryAfterMs: error.retryAfterMs }
}

export async function deliverLearningCertificateEmails(input: { limit?: number; now?: () => Date; send?: (message: AuthEmail) => ReturnType<typeof sendAuthEmail> } = {}) {
  if (!isLearningRuntimeEnabled()) return { claimed: 0, sent: 0, retry: 0, failed: 0 }
  const db = getPrisma()
  const now = input.now ?? (() => new Date())
  const send = input.send ?? sendAuthEmail
  const report = { claimed: 0, sent: 0, retry: 0, failed: 0 }
  for (let i = 0; i < Math.min(20, Math.max(0, input.limit ?? 10)); i++) {
    const tick = now()
    const leaseToken = randomUUID()
    const rows = await db.$queryRaw<Array<{ id: string }>>`
      WITH candidate AS (
        SELECT "id" FROM "NotificationOutbox"
        WHERE "templateKey" = 'LEARNING_CERTIFICATE_ISSUED' AND "channel" = 'EMAIL'
          AND (("status" = 'PENDING' AND "availableAt" <= ${tick})
            OR ("status" = 'PROCESSING' AND ("leaseUntil" <= ${tick} OR "leaseUntil" IS NULL)))
        ORDER BY "availableAt", "id" FOR UPDATE SKIP LOCKED LIMIT 1
      )
      UPDATE "NotificationOutbox" o SET "status" = 'PROCESSING', "leaseToken" = ${leaseToken}::uuid,
        "leaseUntil" = ${new Date(tick.getTime() + LEASE_MS)},
        "firstAttemptAt" = COALESCE(o."firstAttemptAt", ${tick}), "attemptCount" = o."attemptCount" + 1
      FROM candidate WHERE o."id" = candidate."id" RETURNING o."id"`
    if (!rows.length) break
    report.claimed += 1
    const job = await db.notificationOutbox.findUniqueOrThrow({ where: { id: rows[0].id } })
    const finish = async (status: 'SENT' | 'FAILED' | 'PENDING', code: string | null, messageId?: string, delay?: number | null) => {
      const updated = await db.notificationOutbox.updateMany({
        where: { id: job.id, status: 'PROCESSING', leaseToken },
        data: { status, lastErrorCode: code, providerMessageId: messageId, leaseToken: null, leaseUntil: null,
          processedAt: status === 'PENDING' ? null : now(),
          ...(status === 'PENDING' ? { availableAt: new Date(now().getTime() + Math.max(delay ?? 0, RETRY_MS[Math.min(job.attemptCount - 1, RETRY_MS.length - 1)])) } : {}),
        },
      })
      if (updated.count) report[status === 'SENT' ? 'sent' : status === 'PENDING' ? 'retry' : 'failed'] += 1
    }
    if (!job.recipientUserId || job.attemptCount > MAX_ATTEMPTS || tick.getTime() - (job.firstAttemptAt?.getTime() ?? tick.getTime()) > 23 * 60 * 60_000) {
      await finish('FAILED', 'DELIVERY_RECONCILIATION_REQUIRED'); continue
    }
    const payload = job.payload && typeof job.payload === 'object' ? job.payload as Record<string, unknown> : {}
    if (typeof payload.certificateId !== 'string') { await finish('FAILED', 'UNSUPPORTED_OR_INVALID_PAYLOAD'); continue }
    const certificate = await db.learningCertificate.findFirst({
      where: { id: payload.certificateId, userId: job.recipientUserId, status: 'ACTIVE' },
      select: {
        certificateNumber: true, courseTitle: true, firstName: true, lastName: true, issuedAt: true, templateVersion: true,
        user: { select: { email: true, emailVerified: true, status: true } },
      },
    })
    if (!certificate || certificate.user.status !== 'ACTIVE' || !certificate.user.emailVerified) { await finish('FAILED', 'CERTIFICATE_NOT_DELIVERABLE'); continue }
    const pdfBytes = await buildLearningCertificatePdf({
      templateVersion: certificate.templateVersion,
      firstName: certificate.firstName,
      lastName: certificate.lastName,
      courseTitle: certificate.courseTitle,
      certificateNumber: certificate.certificateNumber,
      issuedAt: certificate.issuedAt,
    })
    if (!isCertificateAttachmentWithinLimit(pdfBytes.byteLength)) { await finish('FAILED', 'CERTIFICATE_ATTACHMENT_TOO_LARGE'); continue }
    const message = createLearningCertificateEmail({
      to: certificate.user.email,
      firstName: certificate.firstName,
      courseTitle: certificate.courseTitle,
      certificateNumber: certificate.certificateNumber,
      downloadUrl: new URL('/e-learnings/mijn', getPublicAppBaseUrl()).toString(),
      filename: learningCertificateFilename(certificate.firstName, certificate.lastName),
      pdfBytes,
      idempotencyKey: job.idempotencyKey,
    })
    const fingerprint = createHash('sha256').update(JSON.stringify([message, process.env.AUTH_EMAIL_FROM ?? ''])).digest('hex')
    if (job.deliveryFingerprint && job.deliveryFingerprint !== fingerprint) { await finish('FAILED', 'DELIVERY_PAYLOAD_CHANGED'); continue }
    let providerAccepted = false
    try {
      const ready = await db.notificationOutbox.updateMany({ where: { id: job.id, status: 'PROCESSING', leaseToken, leaseUntil: { gt: now() } }, data: { deliveryFingerprint: fingerprint } })
      if (!ready.count) continue
      const sent = await send(message)
      if (sent.status !== 'ACCEPTED') { await finish('FAILED', 'DEVELOPMENT_ONLY'); continue }
      providerAccepted = true
      await finish('SENT', null, sent.messageId)
    } catch (error) {
      if (providerAccepted) throw new Error('DELIVERY_ACKNOWLEDGEMENT_FAILED')
      const failure = deliveryFailure(error)
      await finish(failure.retryable && job.attemptCount < MAX_ATTEMPTS ? 'PENDING' : 'FAILED', failure.code, undefined, failure.retryAfterMs)
    }
  }
  return report
}

export function createLearningCertificateEmail(input: {
  to: string
  firstName: string
  courseTitle: string
  certificateNumber: string
  downloadUrl: string
  filename: string
  pdfBytes: Uint8Array
  idempotencyKey: string
}): AuthEmail {
  const safeName = escapeHtml(input.firstName)
  const safeCourseTitle = escapeHtml(input.courseTitle)
  const safeUrl = escapeHtml(input.downloadUrl)
  const attachment = Buffer.from(input.pdfBytes)
  return {
    kind: 'LEARNING_CERTIFICATE',
    to: input.to,
    subject: 'Je certificaat — RI&E in de praktijk',
    text: `Gefeliciteerd ${input.firstName},\n\nJe hebt de WorkMatchr-opleiding ‘${input.courseTitle}’ en de bijbehorende eindtoets succesvol afgerond.\n\nIn de bijlage vind je jouw persoonlijke certificaat van afronding. Je certificaat blijft ook beschikbaar via Mijn e-learnings.\n\nCertificaatnummer:\n${input.certificateNumber}\n\nWil je je RI&E-kennis actief houden? Als het vrijwillige 12-weekse kennisbehoudprogramma beschikbaar komt, kun je ervoor kiezen je aan te melden. Iedere week bevat 5 korte vragen; de indicatieve duur is 3–5 minuten.\n\nJe wordt niet automatisch ingeschreven en ontvangt hierover alleen e-mails als je daar zelf voor kiest.`,
    html: `<p>Gefeliciteerd ${safeName},</p><p>Je hebt de WorkMatchr-opleiding ‘${safeCourseTitle}’ en de bijbehorende eindtoets succesvol afgerond.</p><p>In de bijlage vind je jouw persoonlijke certificaat van afronding. Je certificaat blijft ook beschikbaar via <a href="${safeUrl}">Mijn e-learnings</a>.</p><p><strong>Certificaatnummer:</strong> ${escapeHtml(input.certificateNumber)}</p><p>Wil je je RI&amp;E-kennis actief houden? Als het vrijwillige 12-weekse kennisbehoudprogramma beschikbaar komt, kun je ervoor kiezen je aan te melden. Iedere week bevat 5 korte vragen; de indicatieve duur is 3–5 minuten.</p><p>Je wordt niet automatisch ingeschreven en ontvangt hierover alleen e-mails als je daar zelf voor kiest.</p>`,
    attachments: [{ filename: input.filename, content: attachment, contentType: 'application/pdf' }],
    idempotencyKey: input.idempotencyKey,
  }
}
