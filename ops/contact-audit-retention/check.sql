-- Read-only, aggregate preflight. No incident IDs, actors, provider references or payloads.
-- Run with an already authorized read-only operator, not the application runtime.
BEGIN READ ONLY;
SELECT
  count(*) FILTER (WHERE a."createdAt" <= statement_timestamp() - interval '720 hours') AS past_proposed_deadline,
  count(*) FILTER (WHERE o."id" IS NOT NULL) AS outbox_still_present,
  count(*) FILTER (WHERE o."id" IS NULL AND a."createdAt" <= statement_timestamp() - interval '720 hours') AS requires_individual_review
FROM public."MarketplaceAuditEvent" a
LEFT JOIN public."NotificationOutbox" o ON o."id" = a."entityId"
WHERE a."action" = 'CONTACT_RECONCILED'
  AND a."entityType" = 'NotificationOutbox'
  AND a."metadata"->>'policyVersion' = 'CONTACT_RECONCILIATION_V1';
ROLLBACK;
