import 'server-only'
import { Prisma } from '@/generated/prisma/client'
import { getPrisma } from '@/lib/prisma'
import { reconciledContactRejection } from './contact-final-state'
import { CONTACT_TEMPLATE, CONTACT_RETENTION_MS, CONTACT_METADATA_RETENTION_MS, CONTACT_RATE_LIMIT_RETENTION_MS } from './contact-configuration'

const hour = 60 * 60_000
export type ContactHealthCounts = {
  metadataDueSoon: number; metadataOverdue: number
  countersDueSoon: number; countersOverdue: number; contentOverdue: number
  reviewRequired: number; triageDue: number; escalationDue: number; decisionDue: number
}

/** Read-only aggregate: includes protected/disabled cleanup records, never claims work. */
export async function readContactHealth(now = new Date()) {
  const scope = Prisma.sql`"templateKey" = ${CONTACT_TEMPLATE} AND "channel" = 'EMAIL' AND "recipientUserId" IS NULL`
  const noAttempt = Prisma.sql`"attemptCount" = 0 AND "firstAttemptAt" IS NULL AND "deliveryFingerprint" IS NULL AND "providerMessageId" IS NULL`
  const final = Prisma.sql`("status" = 'SENT' OR ("status" = 'FAILED' AND (${noAttempt} OR ${reconciledContactRejection})))
    AND "processedAt" IS NOT NULL AND "processedAt" >= "createdAt"`
  const review = Prisma.sql`("status" = 'FAILED' AND NOT (${noAttempt}) AND NOT (${reconciledContactRejection}))
    OR ("status" IN ('SENT', 'FAILED') AND ("processedAt" IS NULL OR "processedAt" < "createdAt"))
    OR ("status" = 'PENDING' AND "lastErrorCode" IN ('EMAIL_PROVIDER_UNAVAILABLE', 'EMAIL_PROVIDER_RESPONSE_INVALID',
      'EMAIL_PROVIDER_REJECTED', 'DELIVERY_INTERNAL_ERROR', 'DELIVERY_RECONCILIATION_REQUIRED'))
    OR ("status" = 'PROCESSING' AND "deliveryFingerprint" IS NOT NULL AND ("leaseUntil" IS NULL OR "leaseUntil" <= ${now}))
    OR ("leaseUntil" > ${now} AND "createdAt" <= ${new Date(now.getTime() - CONTACT_RETENTION_MS)})`
  // No durable first-uncertain timestamp exists. First attempt (otherwise creation)
  // is a conservative deadline anchor; a retry/lease must never reset this clock.
  const anchor = Prisma.sql`CASE WHEN "firstAttemptAt" >= "createdAt" AND "firstAttemptAt" <= ${now}
    THEN "firstAttemptAt" ELSE "createdAt" END`
  const [counts] = await getPrisma().$queryRaw<ContactHealthCounts[]>`
    WITH contact AS (SELECT *, (${final}) AS final, (${review}) AS review, ${anchor} AS anchor
      FROM "NotificationOutbox" WHERE ${scope})
    SELECT
      count(*) FILTER (WHERE final AND "processedAt" <= ${new Date(now.getTime() - CONTACT_METADATA_RETENTION_MS + hour)})::int AS "metadataDueSoon",
      count(*) FILTER (WHERE final AND "processedAt" <= ${new Date(now.getTime() - CONTACT_METADATA_RETENTION_MS)})::int AS "metadataOverdue",
      (SELECT count(*)::int FROM "RateLimit" WHERE "key" LIKE 'contact:%' AND "lastRequest" <= ${BigInt(now.getTime() - CONTACT_RATE_LIMIT_RETENTION_MS + hour)}) AS "countersDueSoon",
      (SELECT count(*)::int FROM "RateLimit" WHERE "key" LIKE 'contact:%' AND "lastRequest" <= ${BigInt(now.getTime() - CONTACT_RATE_LIMIT_RETENTION_MS)}) AS "countersOverdue",
      count(*) FILTER (WHERE "payload" ? 'ciphertext' AND "createdAt" <= ${new Date(now.getTime() - CONTACT_RETENTION_MS)})::int AS "contentOverdue",
      count(*) FILTER (WHERE review)::int AS "reviewRequired",
      count(*) FILTER (WHERE review AND anchor <= ${new Date(now.getTime() - 24 * hour)})::int AS "triageDue",
      count(*) FILTER (WHERE review AND anchor <= ${new Date(now.getTime() - 72 * hour)})::int AS "escalationDue",
      count(*) FILTER (WHERE review AND anchor <= ${new Date(now.getTime() - 7 * 24 * hour)})::int AS "decisionDue"
    FROM contact`
  return { version: 1 as const, checkedAt: now.toISOString(), retentionEnabled: process.env.CONTACT_RETENTION_ENABLED === 'true', ...counts }
}
