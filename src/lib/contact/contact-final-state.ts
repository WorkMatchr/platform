import 'server-only'
import { Prisma } from '@/generated/prisma/client'

/** A flag/error code alone must never authorize retention of a failed attempt. */
export const reconciledContactRejection = Prisma.sql`EXISTS (
  SELECT 1 FROM "MarketplaceAuditEvent" a
  WHERE a."correlationKey" = 'contact-reconcile:' || "NotificationOutbox"."id"::text
    AND a."action" = 'CONTACT_RECONCILED' AND a."entityType" = 'NotificationOutbox'
    AND a."entityId" = "NotificationOutbox"."id" AND a."actorUserId" IS NOT NULL
    AND a."nextState" = 'FAILED' AND a."reason" = 'PROVIDER_REJECTION_PROVEN'
    AND a."createdAt" = "NotificationOutbox"."processedAt"
    AND a."metadata"->>'policyVersion' = 'CONTACT_RECONCILIATION_V1'
    AND a."metadata"->>'outcome' = 'NOT_ACCEPTED'
)`
