-- No data backfill and no prices rewritten. Existing published rules remain immutable.
ALTER TABLE "MarketplaceRuleSet" ADD COLUMN "expertiseAdjustments" JSONB NOT NULL DEFAULT '{}';
ALTER TABLE "User" ADD COLUMN "assignmentEmailEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "NotificationOutbox"
  ADD COLUMN "leaseToken" UUID,
  ADD COLUMN "leaseUntil" TIMESTAMPTZ(3),
  ADD COLUMN "firstAttemptAt" TIMESTAMPTZ(3),
  ADD COLUMN "providerMessageId" VARCHAR(160),
  ADD COLUMN "deliveryFingerprint" CHAR(64);
ALTER TABLE "MarketplaceRuleSet" DROP CONSTRAINT "MarketplaceRuleSet_values_check";
ALTER TABLE "MarketplaceRuleSet" ADD CONSTRAINT "MarketplaceRuleSet_values_check" CHECK (
  "minimumParticipationPrice" >= 1 AND "participationPriceCredits" >= "minimumParticipationPrice"
  AND "withdrawalRefundPercentage" BETWEEN 0 AND 100 AND "unawardedQuoteRefundCredits" >= 0
  AND "maximumParticipants" BETWEEN 1 AND 100 AND "withdrawalThreshold" >= 1
  AND "withdrawalWindowMonths" >= 1 AND ("validUntil" IS NULL OR "validUntil" > "validFrom")
  AND jsonb_typeof("expertiseAdjustments") = 'object'
);
CREATE FUNCTION workmatchr_protect_invitation_snapshot() RETURNS trigger AS $$
BEGIN
  IF NEW."snapshot" IS DISTINCT FROM OLD."snapshot"
     OR NEW."snapshotChecksum" IS DISTINCT FROM OLD."snapshotChecksum"
     OR NEW."creditCost" IS DISTINCT FROM OLD."creditCost" THEN
    RAISE EXCEPTION 'Invitation snapshot and price are immutable.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER "ProviderInvitation_protect_snapshot"
BEFORE UPDATE ON "ProviderInvitation"
FOR EACH ROW EXECUTE FUNCTION workmatchr_protect_invitation_snapshot();
