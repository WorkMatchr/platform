-- Add immutable, block-level current-source assessments without changing claim validation state.
CREATE TYPE "KnowledgeCrossValidationOutcome" AS ENUM (
  'CONFIRMED',
  'PARTIAL_CONDITIONAL',
  'SUPERSEDED',
  'CONFLICT',
  'INSUFFICIENT_SUPPORT'
);

CREATE TABLE "KnowledgeCrossValidationAssessment" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "claimId" UUID NOT NULL,
  "reviewTaskId" UUID,
  "revision" INTEGER NOT NULL,
  "outcome" "KnowledgeCrossValidationOutcome" NOT NULL,
  "rationale" VARCHAR(1500) NOT NULL,
  "checkedAt" TIMESTAMPTZ(3) NOT NULL,
  "reviewerUserId" UUID NOT NULL,
  "contentFingerprint" VARCHAR(64) NOT NULL,
  "supersedesAssessmentId" UUID,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "KnowledgeCrossValidationAssessment_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "KnowledgeCrossValidationAssessment_revision_check" CHECK ("revision" > 0),
  CONSTRAINT "KnowledgeCrossValidationAssessment_rationale_check" CHECK (length(btrim("rationale")) > 0),
  CONSTRAINT "KnowledgeCrossValidationAssessment_fingerprint_check" CHECK ("contentFingerprint" ~ '^[0-9a-f]{64}$')
);

CREATE TABLE "KnowledgeCrossValidationEvidence" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "assessmentId" UUID NOT NULL,
  "sourceBlockId" UUID NOT NULL,
  "blockTextHash" VARCHAR(64) NOT NULL,
  "supportType" "KnowledgeSupportType" NOT NULL,
  "jurisdictionSnapshot" VARCHAR(80) NOT NULL,
  "applicabilityScopeSnapshot" VARCHAR(1000) NOT NULL,
  "independenceGroupSnapshot" VARCHAR(160) NOT NULL,
  "sequence" INTEGER NOT NULL,
  "rationale" VARCHAR(1500) NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "KnowledgeCrossValidationEvidence_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "KnowledgeCrossValidationEvidence_sequence_check" CHECK ("sequence" > 0),
  CONSTRAINT "KnowledgeCrossValidationEvidence_hash_check" CHECK ("blockTextHash" ~ '^[0-9a-f]{64}$'),
  CONSTRAINT "KnowledgeCrossValidationEvidence_rationale_check" CHECK (length(btrim("rationale")) > 0),
  CONSTRAINT "KnowledgeCrossValidationEvidence_jurisdiction_check" CHECK (length(btrim("jurisdictionSnapshot")) > 0),
  CONSTRAINT "KnowledgeCrossValidationEvidence_scope_check" CHECK (length(btrim("applicabilityScopeSnapshot")) > 0),
  CONSTRAINT "KnowledgeCrossValidationEvidence_independence_check" CHECK (length(btrim("independenceGroupSnapshot")) > 0)
);

CREATE UNIQUE INDEX "KnowledgeCrossValidationAssessment_claimId_revision_key" ON "KnowledgeCrossValidationAssessment"("claimId", "revision");
CREATE UNIQUE INDEX "KnowledgeCrossValidationAssessment_claimId_contentFingerprint_key" ON "KnowledgeCrossValidationAssessment"("claimId", "contentFingerprint");
CREATE UNIQUE INDEX "KnowledgeCrossValidationAssessment_supersedesAssessmentId_key" ON "KnowledgeCrossValidationAssessment"("supersedesAssessmentId");
CREATE INDEX "KnowledgeCrossValidationAssessment_claimId_checkedAt_idx" ON "KnowledgeCrossValidationAssessment"("claimId", "checkedAt");
CREATE INDEX "KnowledgeCrossValidationAssessment_reviewTaskId_checkedAt_idx" ON "KnowledgeCrossValidationAssessment"("reviewTaskId", "checkedAt");
CREATE INDEX "KnowledgeCrossValidationAssessment_outcome_checkedAt_idx" ON "KnowledgeCrossValidationAssessment"("outcome", "checkedAt");
CREATE INDEX "KnowledgeCrossValidationAssessment_reviewerUserId_checkedAt_idx" ON "KnowledgeCrossValidationAssessment"("reviewerUserId", "checkedAt");
CREATE UNIQUE INDEX "KnowledgeCrossValidationEvidence_assessmentId_sequence_key" ON "KnowledgeCrossValidationEvidence"("assessmentId", "sequence");
CREATE UNIQUE INDEX "KnowledgeCrossValidationEvidence_assessmentId_sourceBlockId_supportType_key" ON "KnowledgeCrossValidationEvidence"("assessmentId", "sourceBlockId", "supportType");
CREATE INDEX "KnowledgeCrossValidationEvidence_sourceBlockId_idx" ON "KnowledgeCrossValidationEvidence"("sourceBlockId");
CREATE INDEX "KnowledgeCrossValidationEvidence_independenceGroupSnapshot_supportType_idx" ON "KnowledgeCrossValidationEvidence"("independenceGroupSnapshot", "supportType");

ALTER TABLE "KnowledgeCrossValidationAssessment" ADD CONSTRAINT "KnowledgeCrossValidationAssessment_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "KnowledgeClaim"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "KnowledgeCrossValidationAssessment" ADD CONSTRAINT "KnowledgeCrossValidationAssessment_reviewTaskId_fkey" FOREIGN KEY ("reviewTaskId") REFERENCES "KnowledgeReviewTask"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "KnowledgeCrossValidationAssessment" ADD CONSTRAINT "KnowledgeCrossValidationAssessment_reviewerUserId_fkey" FOREIGN KEY ("reviewerUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "KnowledgeCrossValidationAssessment" ADD CONSTRAINT "KnowledgeCrossValidationAssessment_supersedesAssessmentId_fkey" FOREIGN KEY ("supersedesAssessmentId") REFERENCES "KnowledgeCrossValidationAssessment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "KnowledgeCrossValidationEvidence" ADD CONSTRAINT "KnowledgeCrossValidationEvidence_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "KnowledgeCrossValidationAssessment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "KnowledgeCrossValidationEvidence" ADD CONSTRAINT "KnowledgeCrossValidationEvidence_sourceBlockId_fkey" FOREIGN KEY ("sourceBlockId") REFERENCES "KnowledgeSourceBlock"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE OR REPLACE FUNCTION "knowledge_prevent_cross_validation_mutation"() RETURNS trigger AS $$
BEGIN RAISE EXCEPTION 'Knowledge cross-validation history is immutable'; END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER "KnowledgeCrossValidationAssessment_append_only" BEFORE UPDATE OR DELETE ON "KnowledgeCrossValidationAssessment" FOR EACH ROW EXECUTE FUNCTION "knowledge_prevent_cross_validation_mutation"();
CREATE TRIGGER "KnowledgeCrossValidationEvidence_append_only" BEFORE UPDATE OR DELETE ON "KnowledgeCrossValidationEvidence" FOR EACH ROW EXECUTE FUNCTION "knowledge_prevent_cross_validation_mutation"();

CREATE OR REPLACE FUNCTION "knowledge_validate_cross_validation_assessment"() RETURNS trigger AS $$
DECLARE previous_assessment "KnowledgeCrossValidationAssessment"%ROWTYPE;
BEGIN
  IF NEW."reviewTaskId" IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM "KnowledgeReviewTask" task WHERE task."id" = NEW."reviewTaskId" AND task."claimId" = NEW."claimId"
  ) THEN RAISE EXCEPTION 'Cross-validation review task must belong to the assessed claim'; END IF;
  IF NEW."supersedesAssessmentId" IS NULL THEN
    IF NEW."revision" <> 1 THEN RAISE EXCEPTION 'Initial cross-validation assessment must be revision 1'; END IF;
  ELSE
    SELECT * INTO previous_assessment FROM "KnowledgeCrossValidationAssessment" WHERE "id" = NEW."supersedesAssessmentId";
    IF NOT FOUND OR previous_assessment."claimId" <> NEW."claimId" OR NEW."revision" <> previous_assessment."revision" + 1 THEN
      RAISE EXCEPTION 'Cross-validation assessment supersession is invalid';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER "KnowledgeCrossValidationAssessment_validate" BEFORE INSERT ON "KnowledgeCrossValidationAssessment" FOR EACH ROW EXECUTE FUNCTION "knowledge_validate_cross_validation_assessment"();

CREATE OR REPLACE FUNCTION "knowledge_validate_cross_validation_evidence"() RETURNS trigger AS $$
DECLARE
  actual_hash VARCHAR(64);
  actual_jurisdiction VARCHAR(80);
  actual_independence_group VARCHAR(160);
  actual_scope VARCHAR(1000);
BEGIN
  SELECT block."textHash", source."jurisdiction", source."independenceGroup",
    COALESCE(
      (
        SELECT string_agg(scope."jurisdiction" || ':' || scope."scopeCode" || ':' || scope."effect"::text, '|' ORDER BY scope."jurisdiction", scope."scopeCode", scope."effect"::text)
        FROM "KnowledgeSourceApplicability" scope
        WHERE scope."sourceId" = source."id" OR scope."sourceVersionId" = version."id" OR scope."sourceBlockId" = block."id"
      ),
      NULLIF(btrim(source."applicabilityScope"), ''),
      'UNSPECIFIED'
    )
  INTO actual_hash, actual_jurisdiction, actual_independence_group, actual_scope
  FROM "KnowledgeSourceBlock" block
  JOIN "KnowledgeSourcePage" page ON page."id" = block."sourcePageId" AND page."extractionRunId" = block."extractionRunId"
  JOIN "KnowledgeExtractionRun" run ON run."id" = page."extractionRunId" AND run."status" = 'COMPLETED'
  JOIN "KnowledgeSourceVersion" version ON version."id" = run."sourceVersionId"
  JOIN "KnowledgeSource" source ON source."id" = version."sourceId"
  WHERE block."id" = NEW."sourceBlockId";
  IF actual_hash IS NULL OR actual_hash <> NEW."blockTextHash" THEN
    RAISE EXCEPTION 'Cross-validation evidence block hash does not match';
  END IF;
  IF actual_jurisdiction <> NEW."jurisdictionSnapshot" OR actual_independence_group <> NEW."independenceGroupSnapshot" OR actual_scope <> NEW."applicabilityScopeSnapshot" THEN
    RAISE EXCEPTION 'Cross-validation evidence context snapshot does not match';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER "KnowledgeCrossValidationEvidence_validate" BEFORE INSERT ON "KnowledgeCrossValidationEvidence" FOR EACH ROW EXECUTE FUNCTION "knowledge_validate_cross_validation_evidence"();

CREATE OR REPLACE FUNCTION "knowledge_require_cross_validation_evidence"() RETURNS trigger AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM "KnowledgeCrossValidationEvidence" evidence WHERE evidence."assessmentId" = NEW."id") THEN
    RAISE EXCEPTION 'Knowledge cross-validation assessment requires evidence';
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;
CREATE CONSTRAINT TRIGGER "KnowledgeCrossValidationAssessment_evidence_required"
AFTER INSERT ON "KnowledgeCrossValidationAssessment" DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION "knowledge_require_cross_validation_evidence"();
