-- Additieve, nullable provenance voor contextuele kennisroutes.
-- Bestaande records blijven bewust zonder context; er vindt geen backfill of inhoudelijke mutatie plaats.

ALTER TABLE "PublicIntakeDraft"
  ADD COLUMN "knowledgeContextId" VARCHAR(100),
  ADD COLUMN "knowledgeContextVersion" INTEGER,
  ADD COLUMN "knowledgeSourceRoute" VARCHAR(300),
  ADD COLUMN "knowledgeSuggestedCategory" VARCHAR(100);

ALTER TABLE "Intake"
  ADD COLUMN "knowledgeContextId" VARCHAR(100),
  ADD COLUMN "knowledgeContextVersion" INTEGER,
  ADD COLUMN "knowledgeSourceRoute" VARCHAR(300),
  ADD COLUMN "knowledgeSuggestedCategory" VARCHAR(100);

ALTER TABLE "Assignment"
  ADD COLUMN "knowledgeContextId" VARCHAR(100),
  ADD COLUMN "knowledgeContextVersion" INTEGER,
  ADD COLUMN "knowledgeSourceRoute" VARCHAR(300),
  ADD COLUMN "knowledgeSuggestedCategory" VARCHAR(100);

ALTER TABLE "AssignmentRevision"
  ADD COLUMN "knowledgeContextId" VARCHAR(100),
  ADD COLUMN "knowledgeContextVersion" INTEGER,
  ADD COLUMN "knowledgeSourceRoute" VARCHAR(300),
  ADD COLUMN "knowledgeSuggestedCategory" VARCHAR(100);

ALTER TABLE "PublicIntakeDraft"
  ADD CONSTRAINT "PublicIntakeDraft_knowledge_context_shape_check" CHECK (
    ("knowledgeContextId" IS NULL AND "knowledgeContextVersion" IS NULL AND "knowledgeSourceRoute" IS NULL AND "knowledgeSuggestedCategory" IS NULL)
    OR
    ("knowledgeContextId" IS NOT NULL AND "knowledgeContextVersion" IS NOT NULL AND "knowledgeContextVersion" >= 1 AND "knowledgeSourceRoute" IS NOT NULL)
  );

ALTER TABLE "Intake"
  ADD CONSTRAINT "Intake_knowledge_context_shape_check" CHECK (
    ("knowledgeContextId" IS NULL AND "knowledgeContextVersion" IS NULL AND "knowledgeSourceRoute" IS NULL AND "knowledgeSuggestedCategory" IS NULL)
    OR
    ("knowledgeContextId" IS NOT NULL AND "knowledgeContextVersion" IS NOT NULL AND "knowledgeContextVersion" >= 1 AND "knowledgeSourceRoute" IS NOT NULL)
  );

ALTER TABLE "Assignment"
  ADD CONSTRAINT "Assignment_knowledge_context_shape_check" CHECK (
    ("knowledgeContextId" IS NULL AND "knowledgeContextVersion" IS NULL AND "knowledgeSourceRoute" IS NULL AND "knowledgeSuggestedCategory" IS NULL)
    OR
    ("knowledgeContextId" IS NOT NULL AND "knowledgeContextVersion" IS NOT NULL AND "knowledgeContextVersion" >= 1 AND "knowledgeSourceRoute" IS NOT NULL)
  );

ALTER TABLE "AssignmentRevision"
  ADD CONSTRAINT "AssignmentRevision_knowledge_context_shape_check" CHECK (
    ("knowledgeContextId" IS NULL AND "knowledgeContextVersion" IS NULL AND "knowledgeSourceRoute" IS NULL AND "knowledgeSuggestedCategory" IS NULL)
    OR
    ("knowledgeContextId" IS NOT NULL AND "knowledgeContextVersion" IS NOT NULL AND "knowledgeContextVersion" >= 1 AND "knowledgeSourceRoute" IS NOT NULL)
  );

CREATE INDEX "PublicIntakeDraft_knowledgeContextId_idx" ON "PublicIntakeDraft"("knowledgeContextId");
CREATE INDEX "Intake_knowledgeContextId_idx" ON "Intake"("knowledgeContextId");
CREATE INDEX "Assignment_knowledgeContextId_idx" ON "Assignment"("knowledgeContextId");

CREATE OR REPLACE FUNCTION workmatchr_validate_public_intake_draft_update() RETURNS trigger AS $$
BEGIN
  IF OLD."entryPoint" <> NEW."entryPoint"
    OR OLD."originalInput" IS DISTINCT FROM NEW."originalInput"
    OR OLD."selectedRequestKey" IS DISTINCT FROM NEW."selectedRequestKey"
    OR OLD."knowledgeContextId" IS DISTINCT FROM NEW."knowledgeContextId"
    OR OLD."knowledgeContextVersion" IS DISTINCT FROM NEW."knowledgeContextVersion"
    OR OLD."knowledgeSourceRoute" IS DISTINCT FROM NEW."knowledgeSourceRoute"
    OR OLD."knowledgeSuggestedCategory" IS DISTINCT FROM NEW."knowledgeSuggestedCategory"
    OR OLD."flowVersion" <> NEW."flowVersion"
    OR OLD."startedAt" <> NEW."startedAt"
    OR OLD."expiresAt" <> NEW."expiresAt" THEN
    RAISE EXCEPTION 'De bron- en sessievelden van een publieke intake zijn immutable.';
  END IF;

  IF OLD."phase" <> NEW."phase" AND NOT (
    (OLD."phase" = 'STARTED' AND NEW."phase" IN ('CLARIFYING', 'ABANDONED', 'ABANDONED_BY_USER'))
    OR (OLD."phase" = 'CLARIFYING' AND NEW."phase" IN ('SUMMARY_PRESENTED', 'ABANDONED', 'ABANDONED_BY_USER'))
    OR (OLD."phase" = 'SUMMARY_PRESENTED' AND NEW."phase" IN ('CLARIFYING', 'REGISTRATION_STARTED', 'ABANDONED', 'ABANDONED_BY_USER'))
    OR (OLD."phase" = 'REGISTRATION_STARTED' AND NEW."phase" IN ('SUMMARY_PRESENTED', 'ACCOUNT_LINKED', 'ABANDONED', 'ABANDONED_BY_USER'))
    OR (OLD."phase" = 'ACCOUNT_LINKED' AND NEW."phase" = 'SUBMITTED')
    OR (OLD."phase" = 'ABANDONED' AND NEW."phase" IN ('CLARIFYING', 'SUMMARY_PRESENTED'))
  ) THEN
    RAISE EXCEPTION 'Ongeldige publieke intakefase-overgang.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION workmatchr_protect_intake_knowledge_context() RETURNS trigger AS $$
BEGIN
  IF OLD."knowledgeContextId" IS DISTINCT FROM NEW."knowledgeContextId"
    OR OLD."knowledgeContextVersion" IS DISTINCT FROM NEW."knowledgeContextVersion"
    OR OLD."knowledgeSourceRoute" IS DISTINCT FROM NEW."knowledgeSourceRoute"
    OR OLD."knowledgeSuggestedCategory" IS DISTINCT FROM NEW."knowledgeSuggestedCategory" THEN
    RAISE EXCEPTION 'De kenniscontext van een intake is immutable.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "Intake_knowledge_context_immutable_trigger"
BEFORE UPDATE ON "Intake"
FOR EACH ROW EXECUTE FUNCTION workmatchr_protect_intake_knowledge_context();

CREATE OR REPLACE FUNCTION "protect_published_assignment"() RETURNS trigger AS $$
BEGIN
  IF OLD."publishedAt" IS NOT NULL THEN
    IF NEW."intakeId" IS DISTINCT FROM OLD."intakeId"
      OR NEW."clientOrganizationId" IS DISTINCT FROM OLD."clientOrganizationId"
      OR NEW."createdByUserId" IS DISTINCT FROM OLD."createdByUserId"
      OR NEW."title" IS DISTINCT FROM OLD."title"
      OR NEW."description" IS DISTINCT FROM OLD."description"
      OR NEW."knowledgeContextId" IS DISTINCT FROM OLD."knowledgeContextId"
      OR NEW."knowledgeContextVersion" IS DISTINCT FROM OLD."knowledgeContextVersion"
      OR NEW."knowledgeSourceRoute" IS DISTINCT FROM OLD."knowledgeSourceRoute"
      OR NEW."knowledgeSuggestedCategory" IS DISTINCT FROM OLD."knowledgeSuggestedCategory"
      OR NEW."primarySpecialismId" IS DISTINCT FROM OLD."primarySpecialismId"
      OR NEW."sectorId" IS DISTINCT FROM OLD."sectorId"
      OR NEW."employeeCount" IS DISTINCT FROM OLD."employeeCount"
      OR NEW."desiredStartDate" IS DISTINCT FROM OLD."desiredStartDate"
      OR NEW."responseDeadline" IS DISTINCT FROM OLD."responseDeadline"
      OR NEW."locationType" IS DISTINCT FROM OLD."locationType"
      OR NEW."locationId" IS DISTINCT FROM OLD."locationId"
      OR NEW."locationName" IS DISTINCT FROM OLD."locationName"
      OR NEW."locationAddressLine" IS DISTINCT FROM OLD."locationAddressLine"
      OR NEW."locationPostalCode" IS DISTINCT FROM OLD."locationPostalCode"
      OR NEW."locationCity" IS DISTINCT FROM OLD."locationCity"
      OR NEW."locationProvince" IS DISTINCT FROM OLD."locationProvince"
      OR NEW."locationCountryCode" IS DISTINCT FROM OLD."locationCountryCode"
      OR NEW."locationRegion" IS DISTINCT FROM OLD."locationRegion"
      OR NEW."locationDescription" IS DISTINCT FROM OLD."locationDescription"
      OR NEW."locationCount" IS DISTINCT FROM OLD."locationCount"
      OR NEW."allowsRemoteWork" IS DISTINCT FROM OLD."allowsRemoteWork"
    THEN
      RAISE EXCEPTION 'Gepubliceerde opdrachtinhoud is immutable.';
    END IF;

    IF NEW."publishedAt" IS DISTINCT FROM OLD."publishedAt"
      OR NEW."publishedByUserId" IS DISTINCT FROM OLD."publishedByUserId"
      OR NEW."publishedVersion" IS DISTINCT FROM OLD."publishedVersion" THEN
      RAISE EXCEPTION 'Publicatiemetadata is immutable.';
    END IF;
    IF OLD."status" = 'CANCELLED' AND NEW."status" <> 'CANCELLED' THEN
      RAISE EXCEPTION 'Een ingetrokken opdracht kan niet opnieuw worden gepubliceerd.';
    END IF;
    IF NEW."status" IN ('DRAFT', 'READY_FOR_REVIEW') THEN
      RAISE EXCEPTION 'Een gepubliceerde opdracht kan niet terug naar een interne status.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
