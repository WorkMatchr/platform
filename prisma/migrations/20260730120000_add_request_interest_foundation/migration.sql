ALTER TYPE "RequestEventType" ADD VALUE 'ELIGIBILITY_SNAPSHOT_CREATED';

CREATE TYPE "RequestInterestStatus" AS ENUM (
  'INTERESTED',
  'WITHDRAWN'
);

CREATE TYPE "RequestInterestEventType" AS ENUM (
  'INTEREST_REGISTERED',
  'INTEREST_WITHDRAWN',
  'INTEREST_REACTIVATED'
);

ALTER TABLE "Request"
  ADD COLUMN "primaryExpertiseCodes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "additionalExpertiseCodes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "possibleExpertiseCodes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "regionCode" VARCHAR(120),
  ADD COLUMN "sectorCode" VARCHAR(160);

CREATE TABLE "RequestEligibleProvider" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "requestId" UUID NOT NULL,
  "providerOrganizationId" UUID NOT NULL,
  "providerProfileId" UUID NOT NULL,
  "projectionId" UUID NOT NULL,
  "eligibilityBasis" JSONB NOT NULL,
  "matchedExpertise" TEXT[] NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RequestEligibleProvider_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "RequestEligibleProvider_matched_expertise_check"
    CHECK (cardinality("matchedExpertise") > 0)
);

CREATE TABLE "RequestInterest" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "requestId" UUID NOT NULL,
  "providerOrganizationId" UUID NOT NULL,
  "createdByUserId" UUID NOT NULL,
  "status" "RequestInterestStatus" NOT NULL DEFAULT 'INTERESTED',
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "withdrawnAt" TIMESTAMPTZ(3),
  CONSTRAINT "RequestInterest_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "RequestInterest_status_timestamp_check" CHECK (
    ("status" = 'INTERESTED' AND "withdrawnAt" IS NULL)
    OR ("status" = 'WITHDRAWN' AND "withdrawnAt" IS NOT NULL)
  )
);

CREATE TABLE "RequestInterestEvent" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "interestId" UUID NOT NULL,
  "requestId" UUID NOT NULL,
  "providerOrganizationId" UUID NOT NULL,
  "actorUserId" UUID NOT NULL,
  "type" "RequestInterestEventType" NOT NULL,
  "fromStatus" "RequestInterestStatus",
  "toStatus" "RequestInterestStatus" NOT NULL,
  "idempotencyKey" VARCHAR(180) NOT NULL,
  "occurredAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RequestInterestEvent_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "RequestInterestEvent_transition_check" CHECK (
    ("type" = 'INTEREST_REGISTERED' AND "fromStatus" IS NULL AND "toStatus" = 'INTERESTED')
    OR ("type" = 'INTEREST_WITHDRAWN' AND "fromStatus" = 'INTERESTED' AND "toStatus" = 'WITHDRAWN')
    OR ("type" = 'INTEREST_REACTIVATED' AND "fromStatus" = 'WITHDRAWN' AND "toStatus" = 'INTERESTED')
  )
);

CREATE UNIQUE INDEX "RequestEligibleProvider_requestId_providerOrganizationId_key"
  ON "RequestEligibleProvider"("requestId", "providerOrganizationId");
CREATE INDEX "RequestEligibleProvider_providerOrganizationId_createdAt_idx"
  ON "RequestEligibleProvider"("providerOrganizationId", "createdAt");
CREATE INDEX "RequestEligibleProvider_providerProfileId_createdAt_idx"
  ON "RequestEligibleProvider"("providerProfileId", "createdAt");
CREATE INDEX "RequestEligibleProvider_projectionId_idx"
  ON "RequestEligibleProvider"("projectionId");

CREATE UNIQUE INDEX "RequestInterest_requestId_providerOrganizationId_key"
  ON "RequestInterest"("requestId", "providerOrganizationId");
CREATE INDEX "RequestInterest_providerOrganizationId_status_createdAt_idx"
  ON "RequestInterest"("providerOrganizationId", "status", "createdAt");
CREATE INDEX "RequestInterest_requestId_status_idx"
  ON "RequestInterest"("requestId", "status");
CREATE INDEX "RequestInterest_createdByUserId_createdAt_idx"
  ON "RequestInterest"("createdByUserId", "createdAt");

CREATE UNIQUE INDEX "RequestInterestEvent_idempotencyKey_key"
  ON "RequestInterestEvent"("idempotencyKey");
CREATE INDEX "RequestInterestEvent_interestId_occurredAt_idx"
  ON "RequestInterestEvent"("interestId", "occurredAt");
CREATE INDEX "RequestInterestEvent_requestId_occurredAt_idx"
  ON "RequestInterestEvent"("requestId", "occurredAt");
CREATE INDEX "RequestInterestEvent_providerOrganizationId_occurredAt_idx"
  ON "RequestInterestEvent"("providerOrganizationId", "occurredAt");
CREATE INDEX "RequestInterestEvent_actorUserId_occurredAt_idx"
  ON "RequestInterestEvent"("actorUserId", "occurredAt");

ALTER TABLE "RequestEligibleProvider"
  ADD CONSTRAINT "RequestEligibleProvider_requestId_fkey"
  FOREIGN KEY ("requestId") REFERENCES "Request"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RequestEligibleProvider"
  ADD CONSTRAINT "RequestEligibleProvider_providerOrganizationId_fkey"
  FOREIGN KEY ("providerOrganizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RequestEligibleProvider"
  ADD CONSTRAINT "RequestEligibleProvider_providerProfileId_fkey"
  FOREIGN KEY ("providerProfileId") REFERENCES "ProviderProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RequestEligibleProvider"
  ADD CONSTRAINT "RequestEligibleProvider_projectionId_fkey"
  FOREIGN KEY ("projectionId") REFERENCES "TrustedProviderProjection"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "RequestInterest"
  ADD CONSTRAINT "RequestInterest_requestId_fkey"
  FOREIGN KEY ("requestId") REFERENCES "Request"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RequestInterest"
  ADD CONSTRAINT "RequestInterest_providerOrganizationId_fkey"
  FOREIGN KEY ("providerOrganizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RequestInterest"
  ADD CONSTRAINT "RequestInterest_createdByUserId_fkey"
  FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RequestInterest"
  ADD CONSTRAINT "RequestInterest_requestId_providerOrganizationId_fkey"
  FOREIGN KEY ("requestId", "providerOrganizationId")
  REFERENCES "RequestEligibleProvider"("requestId", "providerOrganizationId")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "RequestInterestEvent"
  ADD CONSTRAINT "RequestInterestEvent_interestId_fkey"
  FOREIGN KEY ("interestId") REFERENCES "RequestInterest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RequestInterestEvent"
  ADD CONSTRAINT "RequestInterestEvent_requestId_fkey"
  FOREIGN KEY ("requestId") REFERENCES "Request"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RequestInterestEvent"
  ADD CONSTRAINT "RequestInterestEvent_providerOrganizationId_fkey"
  FOREIGN KEY ("providerOrganizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RequestInterestEvent"
  ADD CONSTRAINT "RequestInterestEvent_actorUserId_fkey"
  FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE OR REPLACE FUNCTION workmatchr_protect_published_request() RETURNS trigger AS $$
BEGIN
  IF OLD."status" = 'PUBLISHED' AND (
    NEW."requestNumber" IS DISTINCT FROM OLD."requestNumber"
    OR NEW."tenantId" IS DISTINCT FROM OLD."tenantId"
    OR NEW."organizationId" IS DISTINCT FROM OLD."organizationId"
    OR NEW."adviceDossierId" IS DISTINCT FROM OLD."adviceDossierId"
    OR NEW."title" IS DISTINCT FROM OLD."title"
    OR NEW."publicSummary" IS DISTINCT FROM OLD."publicSummary"
    OR NEW."region" IS DISTINCT FROM OLD."region"
    OR NEW."sector" IS DISTINCT FROM OLD."sector"
    OR NEW."requestedStart" IS DISTINCT FROM OLD."requestedStart"
    OR NEW."notes" IS DISTINCT FROM OLD."notes"
    OR NEW."primaryExpertise" IS DISTINCT FROM OLD."primaryExpertise"
    OR NEW."additionalExpertise" IS DISTINCT FROM OLD."additionalExpertise"
    OR NEW."possibleExpertise" IS DISTINCT FROM OLD."possibleExpertise"
    OR NEW."primaryExpertiseCodes" IS DISTINCT FROM OLD."primaryExpertiseCodes"
    OR NEW."additionalExpertiseCodes" IS DISTINCT FROM OLD."additionalExpertiseCodes"
    OR NEW."possibleExpertiseCodes" IS DISTINCT FROM OLD."possibleExpertiseCodes"
    OR NEW."regionCode" IS DISTINCT FROM OLD."regionCode"
    OR NEW."sectorCode" IS DISTINCT FROM OLD."sectorCode"
    OR NEW."createdAt" IS DISTINCT FROM OLD."createdAt"
    OR NEW."publishedAt" IS DISTINCT FROM OLD."publishedAt"
  ) THEN
    RAISE EXCEPTION 'Published Request content is immutable';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "RequestEligibleProvider_immutable"
BEFORE UPDATE OR DELETE ON "RequestEligibleProvider"
FOR EACH ROW EXECUTE FUNCTION workmatchr_reject_advice_dossier_history_mutation();

CREATE TRIGGER "RequestInterestEvent_immutable"
BEFORE UPDATE OR DELETE ON "RequestInterestEvent"
FOR EACH ROW EXECUTE FUNCTION workmatchr_reject_advice_dossier_history_mutation();
