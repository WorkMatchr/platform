-- Marketplace Rules, directe claimbetaling, betrouwbaarheid en platformbeheer.
-- Additief: bestaande records blijven behouden en worden niet herberekend.

ALTER TYPE "CreditTransactionType" ADD VALUE 'PARTICIPATION_PAYMENT';
ALTER TYPE "CreditTransactionType" ADD VALUE 'WITHDRAWAL_REFUND';
ALTER TYPE "CreditTransactionType" ADD VALUE 'UNAWARDED_QUOTE_REFUND';
ALTER TYPE "CreditTransactionType" ADD VALUE 'MANUAL_COMPENSATION';
ALTER TYPE "CreditTransactionType" ADD VALUE 'COMMERCIAL_GESTURE';
ALTER TYPE "CreditTransactionType" ADD VALUE 'SPONSORSHIP';
ALTER TYPE "CreditTransactionType" ADD VALUE 'PROMOTION';
ALTER TYPE "CreditTransactionType" ADD VALUE 'CONTRIBUTION_BONUS';
ALTER TYPE "CreditTransactionType" ADD VALUE 'REVERSAL';
ALTER TYPE "CreditTransactionType" ADD VALUE 'OTHER';

CREATE TYPE "MarketplaceRuleSetStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'RETIRED');
CREATE TYPE "MarketplaceWithdrawalReason" AS ENUM (
  'RESOLVED_INTERNALLY',
  'NO_LONGER_NEEDED',
  'BUDGET_CANCELLED',
  'PLANNING_CHANGED',
  'PLACED_INCORRECTLY',
  'OTHER'
);
CREATE TYPE "MarketplaceReliabilityEventType" AS ENUM (
  'WITHDRAWN_WITHOUT_PARTICIPANTS',
  'WITHDRAWN_AFTER_PARTICIPATION',
  'EVENT_CORRECTION'
);
CREATE TYPE "MarketplaceContactRequestStatus" AS ENUM (
  'OPEN',
  'ADDITIONAL_INFORMATION_REQUIRED',
  'APPROVED',
  'REJECTED',
  'CLOSED'
);
CREATE TYPE "PlatformAdminInvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REVOKED', 'EXPIRED');

CREATE TABLE "MarketplaceRuleSet" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "version" VARCHAR(40) NOT NULL,
  "status" "MarketplaceRuleSetStatus" NOT NULL DEFAULT 'DRAFT',
  "validFrom" TIMESTAMPTZ(3) NOT NULL,
  "validUntil" TIMESTAMPTZ(3),
  "participationPriceCredits" INTEGER NOT NULL,
  "minimumParticipationPrice" INTEGER NOT NULL DEFAULT 30,
  "withdrawalRefundPercentage" INTEGER NOT NULL DEFAULT 75,
  "roundRefundUp" BOOLEAN NOT NULL DEFAULT true,
  "unawardedQuoteRefundCredits" INTEGER NOT NULL DEFAULT 5,
  "maximumParticipants" INTEGER NOT NULL DEFAULT 3,
  "withdrawalThreshold" INTEGER NOT NULL DEFAULT 3,
  "withdrawalWindowMonths" INTEGER NOT NULL DEFAULT 12,
  "reliabilitySignalsEnabled" BOOLEAN NOT NULL DEFAULT true,
  "changeReason" VARCHAR(500) NOT NULL,
  "createdByUserId" UUID,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MarketplaceRuleSet_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MarketplaceRuleSet_values_check" CHECK (
    "minimumParticipationPrice" >= 30
    AND "participationPriceCredits" >= "minimumParticipationPrice"
    AND "withdrawalRefundPercentage" BETWEEN 0 AND 100
    AND "unawardedQuoteRefundCredits" >= 0
    AND "maximumParticipants" BETWEEN 1 AND 100
    AND "withdrawalThreshold" >= 1
    AND "withdrawalWindowMonths" >= 1
    AND ("validUntil" IS NULL OR "validUntil" > "validFrom")
  )
);

CREATE UNIQUE INDEX "MarketplaceRuleSet_version_key" ON "MarketplaceRuleSet"("version");
CREATE INDEX "MarketplaceRuleSet_status_validFrom_idx" ON "MarketplaceRuleSet"("status", "validFrom");
CREATE INDEX "MarketplaceRuleSet_createdByUserId_createdAt_idx" ON "MarketplaceRuleSet"("createdByUserId", "createdAt");

INSERT INTO "MarketplaceRuleSet" (
  "version", "status", "validFrom", "participationPriceCredits",
  "minimumParticipationPrice", "withdrawalRefundPercentage", "roundRefundUp",
  "unawardedQuoteRefundCredits", "maximumParticipants", "withdrawalThreshold",
  "withdrawalWindowMonths", "reliabilitySignalsEnabled", "changeReason"
) VALUES (
  '2026.1', 'PUBLISHED', TIMESTAMPTZ '2026-08-01 00:00:00+00', 30,
  30, 75, true, 5, 3, 3, 12, true,
  'Initiële, door de Product Owner vastgestelde Marketplace Rules.'
);

ALTER TABLE "RequestOfferSlot"
  ADD COLUMN "creditAmount" INTEGER,
  ADD COLUMN "marketplaceRuleSetId" UUID,
  ADD COLUMN "creditTransactionId" UUID;

ALTER TABLE "RequestOfferSlot"
  ADD CONSTRAINT "RequestOfferSlot_creditAmount_check" CHECK ("creditAmount" IS NULL OR "creditAmount" > 0);

CREATE UNIQUE INDEX "RequestOfferSlot_creditTransactionId_key" ON "RequestOfferSlot"("creditTransactionId");
CREATE INDEX "RequestOfferSlot_marketplaceRuleSetId_idx" ON "RequestOfferSlot"("marketplaceRuleSetId");

ALTER TABLE "CreditTransaction"
  ADD COLUMN "balanceBefore" INTEGER,
  ADD COLUMN "availableBefore" INTEGER,
  ADD COLUMN "reservedBefore" INTEGER,
  ADD COLUMN "spentBefore" INTEGER,
  ADD COLUMN "marketplaceRuleSetId" UUID,
  ADD COLUMN "requestId" UUID,
  ADD COLUMN "offerSlotId" UUID,
  ADD COLUMN "reversalOfTransactionId" UUID;

CREATE UNIQUE INDEX "CreditTransaction_reversalOfTransactionId_key" ON "CreditTransaction"("reversalOfTransactionId");
CREATE INDEX "CreditTransaction_marketplaceRuleSetId_idx" ON "CreditTransaction"("marketplaceRuleSetId");
CREATE INDEX "CreditTransaction_requestId_createdAt_idx" ON "CreditTransaction"("requestId", "createdAt");
CREATE INDEX "CreditTransaction_offerSlotId_idx" ON "CreditTransaction"("offerSlotId");

CREATE TABLE "MarketplaceReliabilityEvent" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "requestId" UUID NOT NULL,
  "actorUserId" UUID NOT NULL,
  "type" "MarketplaceReliabilityEventType" NOT NULL,
  "withdrawalReason" "MarketplaceWithdrawalReason",
  "explanation" VARCHAR(1000),
  "participantCount" INTEGER NOT NULL DEFAULT 0,
  "totalRefundedCredits" INTEGER NOT NULL DEFAULT 0,
  "publishedAt" TIMESTAMPTZ(3),
  "occurredAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "marketplaceRuleSetId" UUID,
  "correctsEventId" UUID,
  "correctionReason" VARCHAR(500),
  CONSTRAINT "MarketplaceReliabilityEvent_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MarketplaceReliabilityEvent_values_check" CHECK (
    "participantCount" >= 0
    AND "totalRefundedCredits" >= 0
    AND (("type" = 'EVENT_CORRECTION' AND "correctsEventId" IS NOT NULL AND "correctionReason" IS NOT NULL)
      OR ("type" <> 'EVENT_CORRECTION' AND "correctsEventId" IS NULL))
    AND (("withdrawalReason" = 'OTHER' AND length(trim(COALESCE("explanation", ''))) >= 10)
      OR "withdrawalReason" IS DISTINCT FROM 'OTHER')
  )
);

CREATE UNIQUE INDEX "MarketplaceReliabilityEvent_requestId_type_key" ON "MarketplaceReliabilityEvent"("requestId", "type");
CREATE UNIQUE INDEX "MarketplaceReliabilityEvent_correctsEventId_key" ON "MarketplaceReliabilityEvent"("correctsEventId");
CREATE INDEX "MarketplaceReliabilityEvent_organizationId_type_occurredAt_idx" ON "MarketplaceReliabilityEvent"("organizationId", "type", "occurredAt");
CREATE INDEX "MarketplaceReliabilityEvent_requestId_occurredAt_idx" ON "MarketplaceReliabilityEvent"("requestId", "occurredAt");
CREATE INDEX "MarketplaceReliabilityEvent_actorUserId_occurredAt_idx" ON "MarketplaceReliabilityEvent"("actorUserId", "occurredAt");
CREATE INDEX "MarketplaceReliabilityEvent_marketplaceRuleSetId_idx" ON "MarketplaceReliabilityEvent"("marketplaceRuleSetId");

CREATE TABLE "MarketplaceContactRequest" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "adviceDossierId" UUID NOT NULL,
  "requestId" UUID,
  "createdByUserId" UUID NOT NULL,
  "status" "MarketplaceContactRequestStatus" NOT NULL DEFAULT 'OPEN',
  "explanation" VARCHAR(2000) NOT NULL,
  "relevantWithdrawalCount" INTEGER NOT NULL,
  "withdrawalSnapshot" JSONB NOT NULL,
  "reviewedByUserId" UUID,
  "reviewReason" VARCHAR(1000),
  "reviewedAt" TIMESTAMPTZ(3),
  "validUntil" TIMESTAMPTZ(3),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "MarketplaceContactRequest_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MarketplaceContactRequest_values_check" CHECK (
    "relevantWithdrawalCount" >= 0
    AND length(trim("explanation")) >= 20
    AND (("status" IN ('APPROVED', 'REJECTED', 'ADDITIONAL_INFORMATION_REQUIRED', 'CLOSED')
      AND "reviewedByUserId" IS NOT NULL AND "reviewReason" IS NOT NULL AND "reviewedAt" IS NOT NULL)
      OR "status" = 'OPEN')
  )
);

CREATE INDEX "MarketplaceContactRequest_adviceDossierId_status_idx" ON "MarketplaceContactRequest"("adviceDossierId", "status");
CREATE INDEX "MarketplaceContactRequest_organizationId_status_createdAt_idx" ON "MarketplaceContactRequest"("organizationId", "status", "createdAt");
CREATE INDEX "MarketplaceContactRequest_requestId_idx" ON "MarketplaceContactRequest"("requestId");
CREATE INDEX "MarketplaceContactRequest_reviewedByUserId_reviewedAt_idx" ON "MarketplaceContactRequest"("reviewedByUserId", "reviewedAt");
CREATE UNIQUE INDEX "MarketplaceContactRequest_one_open_per_dossier"
  ON "MarketplaceContactRequest"("adviceDossierId")
  WHERE "status" IN ('OPEN', 'ADDITIONAL_INFORMATION_REQUIRED');

CREATE TABLE "PlatformAdminInvitation" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "platformOrganizationId" UUID NOT NULL,
  "subjectUserId" UUID NOT NULL,
  "email" VARCHAR(254) NOT NULL,
  "role" "OrganizationMembershipRole" NOT NULL,
  "status" "PlatformAdminInvitationStatus" NOT NULL DEFAULT 'PENDING',
  "invitedByUserId" UUID NOT NULL,
  "acceptedByUserId" UUID,
  "idempotencyKey" VARCHAR(160) NOT NULL,
  "expiresAt" TIMESTAMPTZ(3) NOT NULL,
  "acceptedAt" TIMESTAMPTZ(3),
  "revokedAt" TIMESTAMPTZ(3),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "PlatformAdminInvitation_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PlatformAdminInvitation_status_check" CHECK (
    ("status" = 'PENDING' AND "acceptedAt" IS NULL AND "revokedAt" IS NULL)
    OR ("status" = 'ACCEPTED' AND "acceptedAt" IS NOT NULL AND "acceptedByUserId" IS NOT NULL)
    OR ("status" = 'REVOKED' AND "revokedAt" IS NOT NULL)
    OR "status" = 'EXPIRED'
  )
);

CREATE UNIQUE INDEX "PlatformAdminInvitation_idempotencyKey_key" ON "PlatformAdminInvitation"("idempotencyKey");
CREATE INDEX "PlatformAdminInvitation_platformOrganizationId_status_createdAt_idx" ON "PlatformAdminInvitation"("platformOrganizationId", "status", "createdAt");
CREATE INDEX "PlatformAdminInvitation_email_status_idx" ON "PlatformAdminInvitation"("email", "status");
CREATE INDEX "PlatformAdminInvitation_invitedByUserId_createdAt_idx" ON "PlatformAdminInvitation"("invitedByUserId", "createdAt");
CREATE UNIQUE INDEX "PlatformAdminInvitation_one_pending_email"
  ON "PlatformAdminInvitation"(lower("email")) WHERE "status" = 'PENDING';
CREATE UNIQUE INDEX "PlatformAdminInvitation_one_pending_subject"
  ON "PlatformAdminInvitation"("subjectUserId") WHERE "status" = 'PENDING';

ALTER TABLE "MarketplaceRuleSet"
  ADD CONSTRAINT "MarketplaceRuleSet_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RequestOfferSlot"
  ADD CONSTRAINT "RequestOfferSlot_marketplaceRuleSetId_fkey" FOREIGN KEY ("marketplaceRuleSetId") REFERENCES "MarketplaceRuleSet"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "RequestOfferSlot_creditTransactionId_fkey" FOREIGN KEY ("creditTransactionId") REFERENCES "CreditTransaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CreditTransaction"
  ADD CONSTRAINT "CreditTransaction_marketplaceRuleSetId_fkey" FOREIGN KEY ("marketplaceRuleSetId") REFERENCES "MarketplaceRuleSet"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "CreditTransaction_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "Request"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "CreditTransaction_offerSlotId_fkey" FOREIGN KEY ("offerSlotId") REFERENCES "RequestOfferSlot"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "CreditTransaction_reversalOfTransactionId_fkey" FOREIGN KEY ("reversalOfTransactionId") REFERENCES "CreditTransaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MarketplaceReliabilityEvent"
  ADD CONSTRAINT "MarketplaceReliabilityEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "MarketplaceReliabilityEvent_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "Request"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "MarketplaceReliabilityEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "MarketplaceReliabilityEvent_marketplaceRuleSetId_fkey" FOREIGN KEY ("marketplaceRuleSetId") REFERENCES "MarketplaceRuleSet"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "MarketplaceReliabilityEvent_correctsEventId_fkey" FOREIGN KEY ("correctsEventId") REFERENCES "MarketplaceReliabilityEvent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MarketplaceContactRequest"
  ADD CONSTRAINT "MarketplaceContactRequest_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "MarketplaceContactRequest_adviceDossierId_fkey" FOREIGN KEY ("adviceDossierId") REFERENCES "AdviceDossier"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "MarketplaceContactRequest_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "Request"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "MarketplaceContactRequest_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "MarketplaceContactRequest_reviewedByUserId_fkey" FOREIGN KEY ("reviewedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PlatformAdminInvitation"
  ADD CONSTRAINT "PlatformAdminInvitation_platformOrganizationId_fkey" FOREIGN KEY ("platformOrganizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "PlatformAdminInvitation_subjectUserId_fkey" FOREIGN KEY ("subjectUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "PlatformAdminInvitation_invitedByUserId_fkey" FOREIGN KEY ("invitedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "PlatformAdminInvitation_acceptedByUserId_fkey" FOREIGN KEY ("acceptedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE FUNCTION workmatchr_reject_marketplace_history_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION '% is append-only en mag niet worden gewijzigd of verwijderd.', TG_TABLE_NAME;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "CreditTransaction_append_only"
BEFORE UPDATE OR DELETE ON "CreditTransaction"
FOR EACH ROW EXECUTE FUNCTION workmatchr_reject_marketplace_history_mutation();

CREATE TRIGGER "MarketplaceReliabilityEvent_append_only"
BEFORE UPDATE OR DELETE ON "MarketplaceReliabilityEvent"
FOR EACH ROW EXECUTE FUNCTION workmatchr_reject_marketplace_history_mutation();

CREATE FUNCTION workmatchr_protect_marketplace_rules() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' OR OLD."status" IN ('PUBLISHED', 'RETIRED') THEN
    RAISE EXCEPTION 'Gepubliceerde Marketplace Rules zijn immutable.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "MarketplaceRuleSet_protect_published"
BEFORE UPDATE OR DELETE ON "MarketplaceRuleSet"
FOR EACH ROW EXECUTE FUNCTION workmatchr_protect_marketplace_rules();

CREATE FUNCTION workmatchr_protect_offer_slot_pricing() RETURNS trigger AS $$
BEGIN
  IF OLD."creditTransactionId" IS NOT NULL AND (
    NEW."creditTransactionId" IS DISTINCT FROM OLD."creditTransactionId"
    OR NEW."creditAmount" IS DISTINCT FROM OLD."creditAmount"
    OR NEW."marketplaceRuleSetId" IS DISTINCT FROM OLD."marketplaceRuleSetId"
  ) THEN
    RAISE EXCEPTION 'Vastgezette deelnameprijs mag niet worden gewijzigd.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "RequestOfferSlot_protect_pricing"
BEFORE UPDATE ON "RequestOfferSlot"
FOR EACH ROW EXECUTE FUNCTION workmatchr_protect_offer_slot_pricing();
