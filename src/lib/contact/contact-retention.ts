import 'server-only'
import { Prisma } from '@/generated/prisma/client'
import { getPrisma } from '@/lib/prisma'
import { CONTACT_TEMPLATE, CONTACT_RETENTION_MS, CONTACT_METADATA_RETENTION_MS, CONTACT_RATE_LIMIT_RETENTION_MS } from './contact-configuration'

/** Bounded maintenance in the existing outbox; never requires delivery secrets. */
export async function cleanContactRetention(now = new Date()) {
  // Destructive metadata/counter retention needs its own explicit release decision.
  // Existing seven-day content redaction remains independent of this new flag.
  const enabled = process.env.CONTACT_RETENTION_ENABLED === 'true'
  return getPrisma().$transaction(async tx => {
    // Serialize with admission, including counter renewal and duplicate lookup.
    const [lock] = await tx.$queryRaw<{ acquired: boolean }[]>`SELECT pg_try_advisory_xact_lock(310034) AS acquired`
    if (!lock?.acquired) return { enabled, redacted: 0, metadataDeleted: 0, countersDeleted: 0, pending: true, reviewRequired: 0 }
    const contentDeadline = new Date(now.getTime() - CONTACT_RETENTION_MS)
    const metadataDeadline = new Date(now.getTime() - CONTACT_METADATA_RETENTION_MS)
    const counterDeadline = BigInt(now.getTime() - CONTACT_RATE_LIMIT_RETENTION_MS)
    const scope = Prisma.sql`"templateKey" = ${CONTACT_TEMPLATE} AND "channel" = 'EMAIL' AND "recipientUserId" IS NULL`
    const inactive = Prisma.sql`("leaseUntil" IS NULL OR "leaseUntil" <= ${now})`
    const noAttempt = Prisma.sql`"attemptCount" = 0 AND "firstAttemptAt" IS NULL AND "deliveryFingerprint" IS NULL AND "providerMessageId" IS NULL`
    const final = Prisma.sql`("status" = 'SENT' OR ("status" = 'FAILED' AND ${noAttempt}))
      AND "processedAt" IS NOT NULL AND "processedAt" >= "createdAt"`
    const expiredContent = Prisma.sql`${scope} AND "payload" ? 'ciphertext' AND "createdAt" <= ${contentDeadline} AND ${inactive}`
    const expiredMetadata = Prisma.sql`${scope} AND ${final} AND "processedAt" <= ${metadataDeadline}
      AND NOT ("payload" ? 'ciphertext') AND ${inactive}`
    const redacted = await tx.$executeRaw`
      WITH batch AS (SELECT "id" FROM "NotificationOutbox" WHERE ${expiredContent}
        ORDER BY "createdAt", "id" FOR UPDATE SKIP LOCKED LIMIT 100)
      UPDATE "NotificationOutbox" SET "payload" = jsonb_build_object('digest', "payload"->>'digest', 'redacted', true),
        "status" = CASE WHEN "status" = 'SENT' THEN 'SENT'::"NotificationOutboxStatus" ELSE 'FAILED'::"NotificationOutboxStatus" END,
        "lastErrorCode" = CASE WHEN "status" IN ('SENT', 'FAILED') THEN "lastErrorCode"
          WHEN "attemptCount" = 0 THEN 'CONTACT_RETENTION_EXPIRED' ELSE 'DELIVERY_RECONCILIATION_REQUIRED' END,
        "processedAt" = COALESCE("processedAt", "createdAt" + ${CONTACT_RETENTION_MS} * interval '1 millisecond'),
        "leaseToken" = NULL, "leaseUntil" = NULL
      WHERE "id" IN (SELECT "id" FROM batch) AND ${expiredContent}`
    const metadataDeleted = enabled ? await tx.$executeRaw`
      WITH batch AS (SELECT "id" FROM "NotificationOutbox" WHERE ${expiredMetadata}
        ORDER BY "processedAt", "id" FOR UPDATE SKIP LOCKED LIMIT 100)
      DELETE FROM "NotificationOutbox" WHERE "id" IN (SELECT "id" FROM batch) AND ${expiredMetadata}` : 0
    const countersDeleted = enabled ? await tx.$executeRaw`
      WITH batch AS (SELECT "id" FROM "RateLimit" WHERE "key" LIKE 'contact:%' AND "lastRequest" <= ${counterDeadline}
        ORDER BY "lastRequest", "id" FOR UPDATE SKIP LOCKED LIMIT 1000)
      DELETE FROM "RateLimit" WHERE "id" IN (SELECT "id" FROM batch) AND "lastRequest" <= ${counterDeadline}` : 0
    const [state] = await tx.$queryRaw<{ pending: boolean; reviewRequired: number }[]>`
      SELECT (EXISTS (SELECT 1 FROM "NotificationOutbox" WHERE ${expiredContent} OR (${enabled} AND ${expiredMetadata}))
        OR (${enabled} AND EXISTS (SELECT 1 FROM "RateLimit" WHERE "key" LIKE 'contact:%' AND "lastRequest" <= ${counterDeadline}))) AS pending,
        (SELECT count(*)::int FROM "NotificationOutbox" WHERE ${scope}
          AND (("status" = 'FAILED' AND NOT (${noAttempt}))
            OR ("status" IN ('SENT', 'FAILED') AND ("processedAt" IS NULL OR "processedAt" < "createdAt"))
            OR ("leaseUntil" > ${now} AND "createdAt" <= ${contentDeadline}))) AS "reviewRequired"`
    return { enabled, redacted, metadataDeleted, countersDeleted, pending: state.pending, reviewRequired: state.reviewRequired }
  })
}
