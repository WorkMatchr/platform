CREATE TYPE "RequestStatus" AS ENUM (
  'DRAFT',
  'READY_TO_PUBLISH',
  'PUBLISHED',
  'CANCELLED'
);

CREATE TYPE "RequestRequestedStart" AS ENUM (
  'AS_SOON_AS_POSSIBLE',
  'WITHIN_ONE_MONTH',
  'IN_CONSULTATION'
);

CREATE TYPE "RequestEventType" AS ENUM (
  'REQUEST_PUBLISHED',
  'STATUS_CHANGED'
);

CREATE TABLE "RequestCounter" (
  "year" INTEGER NOT NULL,
  "nextNumber" INTEGER NOT NULL,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RequestCounter_pkey" PRIMARY KEY ("year"),
  CONSTRAINT "RequestCounter_year_check" CHECK ("year" >= 2020),
  CONSTRAINT "RequestCounter_next_number_check" CHECK ("nextNumber" > 0)
);

CREATE TABLE "Request" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "requestNumber" VARCHAR(32) NOT NULL,
  "tenantId" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "adviceDossierId" UUID NOT NULL,
  "status" "RequestStatus" NOT NULL DEFAULT 'DRAFT',
  "title" VARCHAR(200) NOT NULL,
  "publicSummary" TEXT NOT NULL,
  "region" VARCHAR(120),
  "sector" VARCHAR(160),
  "requestedStart" "RequestRequestedStart" NOT NULL,
  "notes" TEXT,
  "primaryExpertise" VARCHAR(200) NOT NULL,
  "additionalExpertise" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "possibleExpertise" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "publishedAt" TIMESTAMPTZ(3),
  "archivedAt" TIMESTAMPTZ(3),
  CONSTRAINT "Request_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Request_tenant_organization_check" CHECK ("tenantId" = "organizationId"),
  CONSTRAINT "Request_title_check" CHECK (char_length(btrim("title")) BETWEEN 5 AND 200),
  CONSTRAINT "Request_summary_check" CHECK (char_length(btrim("publicSummary")) BETWEEN 20 AND 4000),
  CONSTRAINT "Request_primary_expertise_check" CHECK (char_length(btrim("primaryExpertise")) BETWEEN 2 AND 200),
  CONSTRAINT "Request_notes_check" CHECK ("notes" IS NULL OR char_length("notes") <= 2000),
  CONSTRAINT "Request_status_timestamps_check" CHECK (
    ("status" = 'PUBLISHED' AND "publishedAt" IS NOT NULL AND "archivedAt" IS NULL)
    OR ("status" = 'CANCELLED' AND "archivedAt" IS NOT NULL)
    OR ("status" IN ('DRAFT', 'READY_TO_PUBLISH') AND "publishedAt" IS NULL AND "archivedAt" IS NULL)
  )
);

CREATE TABLE "RequestEvent" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "requestId" UUID NOT NULL,
  "actorUserId" UUID NOT NULL,
  "type" "RequestEventType" NOT NULL,
  "fromStatus" "RequestStatus",
  "toStatus" "RequestStatus",
  "idempotencyKey" VARCHAR(180) NOT NULL,
  "occurredAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RequestEvent_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "RequestEvent_status_change_check" CHECK (
    ("type" = 'STATUS_CHANGED' AND "fromStatus" IS NOT NULL AND "toStatus" IS NOT NULL AND "fromStatus" <> "toStatus")
    OR ("type" <> 'STATUS_CHANGED' AND "fromStatus" IS NULL AND "toStatus" IS NULL)
  )
);

CREATE UNIQUE INDEX "Request_requestNumber_key" ON "Request"("requestNumber");
CREATE UNIQUE INDEX "Request_adviceDossierId_key" ON "Request"("adviceDossierId");
CREATE INDEX "Request_tenantId_createdAt_idx" ON "Request"("tenantId", "createdAt");
CREATE INDEX "Request_organizationId_createdAt_idx" ON "Request"("organizationId", "createdAt");
CREATE INDEX "Request_status_publishedAt_idx" ON "Request"("status", "publishedAt");
CREATE INDEX "Request_createdAt_idx" ON "Request"("createdAt");

CREATE UNIQUE INDEX "RequestEvent_idempotencyKey_key" ON "RequestEvent"("idempotencyKey");
CREATE INDEX "RequestEvent_requestId_occurredAt_idx" ON "RequestEvent"("requestId", "occurredAt");
CREATE INDEX "RequestEvent_actorUserId_occurredAt_idx" ON "RequestEvent"("actorUserId", "occurredAt");
CREATE INDEX "RequestEvent_type_occurredAt_idx" ON "RequestEvent"("type", "occurredAt");

ALTER TABLE "Request"
  ADD CONSTRAINT "Request_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Request"
  ADD CONSTRAINT "Request_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Request"
  ADD CONSTRAINT "Request_adviceDossierId_fkey"
  FOREIGN KEY ("adviceDossierId") REFERENCES "AdviceDossier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RequestEvent"
  ADD CONSTRAINT "RequestEvent_requestId_fkey"
  FOREIGN KEY ("requestId") REFERENCES "Request"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RequestEvent"
  ADD CONSTRAINT "RequestEvent_actorUserId_fkey"
  FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE FUNCTION workmatchr_protect_published_request() RETURNS trigger AS $$
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
    OR NEW."createdAt" IS DISTINCT FROM OLD."createdAt"
    OR NEW."publishedAt" IS DISTINCT FROM OLD."publishedAt"
  ) THEN
    RAISE EXCEPTION 'Published Request content is immutable';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "Request_published_content_immutable"
BEFORE UPDATE ON "Request"
FOR EACH ROW EXECUTE FUNCTION workmatchr_protect_published_request();

CREATE TRIGGER "RequestEvent_immutable"
BEFORE UPDATE OR DELETE ON "RequestEvent"
FOR EACH ROW EXECUTE FUNCTION workmatchr_reject_advice_dossier_history_mutation();
