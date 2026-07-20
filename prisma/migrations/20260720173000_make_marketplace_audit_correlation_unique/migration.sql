DROP INDEX IF EXISTS "MarketplaceAuditEvent_correlationKey_idx";

CREATE UNIQUE INDEX "MarketplaceAuditEvent_correlationKey_key"
  ON "MarketplaceAuditEvent"("correlationKey");
