-- Knowledge Review Workflow: additief, fail-closed en zonder inhoudelijke claimmutatie.
ALTER TYPE "KnowledgeReviewTaskStatus" ADD VALUE IF NOT EXISTS 'DEFERRED';
ALTER TYPE "KnowledgeReviewTaskStatus" ADD VALUE IF NOT EXISTS 'CHANGES_REQUIRED';
ALTER TYPE "KnowledgeReviewTaskStatus" ADD VALUE IF NOT EXISTS 'CONTENT_APPROVED';
ALTER TYPE "KnowledgeReviewTaskStatus" ADD VALUE IF NOT EXISTS 'REJECTED';

CREATE TYPE "KnowledgeReviewDecisionType" AS ENUM (
  'DEFERRED',
  'CHANGES_REQUIRED',
  'CONTENT_APPROVED',
  'REJECTED',
  'VALIDATION_WITHDRAWN',
  'REOPENED'
);

CREATE TYPE "KnowledgeReviewSourceReferenceAction" AS ENUM ('ADDED', 'WITHDRAWN');

ALTER TYPE "KnowledgeAuditEventType" ADD VALUE IF NOT EXISTS 'REVIEW_STARTED';
ALTER TYPE "KnowledgeAuditEventType" ADD VALUE IF NOT EXISTS 'REVIEW_DRAFT_SAVED';
ALTER TYPE "KnowledgeAuditEventType" ADD VALUE IF NOT EXISTS 'REVIEW_DEFERRED';
ALTER TYPE "KnowledgeAuditEventType" ADD VALUE IF NOT EXISTS 'CLAIM_REWORDING_PROPOSED';
ALTER TYPE "KnowledgeAuditEventType" ADD VALUE IF NOT EXISTS 'CHANGES_REQUIRED';
ALTER TYPE "KnowledgeAuditEventType" ADD VALUE IF NOT EXISTS 'CONTENT_REVIEW_APPROVED';
ALTER TYPE "KnowledgeAuditEventType" ADD VALUE IF NOT EXISTS 'CONTENT_REVIEW_REJECTED';
ALTER TYPE "KnowledgeAuditEventType" ADD VALUE IF NOT EXISTS 'VALIDATION_WITHDRAWN';
ALTER TYPE "KnowledgeAuditEventType" ADD VALUE IF NOT EXISTS 'SUPPORTING_SOURCE_ADDED';
ALTER TYPE "KnowledgeAuditEventType" ADD VALUE IF NOT EXISTS 'SUPPORTING_SOURCE_REMOVED';
ALTER TYPE "KnowledgeAuditEventType" ADD VALUE IF NOT EXISTS 'REVIEW_REOPENED';

ALTER TABLE "KnowledgeReviewTask"
  ADD COLUMN "claimId" UUID,
  ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "proposedStatement" VARCHAR(1500),
  ADD COLUMN "substantiveNotes" VARCHAR(1500),
  ADD COLUMN "practicalNuance" VARCHAR(1500),
  ADD COLUMN "applicabilityConditions" VARCHAR(1500),
  ADD COLUMN "exceptions" VARCHAR(1500),
  ADD COLUMN "editorialNote" VARCHAR(1500),
  ADD COLUMN "proposedAccessTier" "KnowledgeAccessTier",
  ADD COLUMN "lastEditedById" UUID,
  ADD COLUMN "completedById" UUID,
  ADD COLUMN "deferredUntil" TIMESTAMPTZ(3),
  ADD COLUMN "nextReviewAt" TIMESTAMPTZ(3),
  ADD COLUMN "startedAt" TIMESTAMPTZ(3);

UPDATE "KnowledgeReviewTask"
SET "claimId" = "entityId"
WHERE "entityType" = 'KnowledgeClaim'
  AND EXISTS (SELECT 1 FROM "KnowledgeClaim" WHERE "KnowledgeClaim"."id" = "KnowledgeReviewTask"."entityId");

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "KnowledgeReviewTask" WHERE "claimId" IS NULL) THEN
    RAISE EXCEPTION 'Knowledge Review Workflow vereist dat iedere bestaande reviewtaak aan een kennisclaim is gekoppeld';
  END IF;
END;
$$;

ALTER TABLE "KnowledgeReviewTask" ALTER COLUMN "claimId" SET NOT NULL;

ALTER TABLE "KnowledgeValidation"
  ADD COLUMN "reviewTaskId" UUID,
  ADD COLUMN "withdrawsValidationId" UUID;

CREATE TABLE "KnowledgeReviewDecision" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "reviewTaskId" UUID NOT NULL,
  "sequence" INTEGER NOT NULL,
  "decisionType" "KnowledgeReviewDecisionType" NOT NULL,
  "previousStatus" "KnowledgeReviewTaskStatus" NOT NULL,
  "nextStatus" "KnowledgeReviewTaskStatus" NOT NULL,
  "actorUserId" UUID NOT NULL,
  "reason" VARCHAR(1500),
  "proposedStatement" VARCHAR(1500),
  "substantiveNotes" VARCHAR(1500),
  "practicalNuance" VARCHAR(1500),
  "applicabilityConditions" VARCHAR(1500),
  "exceptions" VARCHAR(1500),
  "editorialNote" VARCHAR(1500),
  "proposedAccessTier" "KnowledgeAccessTier",
  "nextReviewAt" TIMESTAMPTZ(3),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "KnowledgeReviewDecision_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "KnowledgeReviewSourceReference" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "reviewTaskId" UUID NOT NULL,
  "claimId" UUID NOT NULL,
  "action" "KnowledgeReviewSourceReferenceAction" NOT NULL DEFAULT 'ADDED',
  "sourceVersionId" UUID,
  "withdrawsReferenceId" UUID,
  "sourceType" "KnowledgeSourceType" NOT NULL,
  "title" VARCHAR(300) NOT NULL,
  "publisher" VARCHAR(200),
  "urlOrReference" VARCHAR(1000),
  "publicationDate" DATE,
  "checkedAt" DATE,
  "authorityLevel" "KnowledgeAuthorityLevel" NOT NULL,
  "isPrimary" BOOLEAN NOT NULL DEFAULT false,
  "sourceFamily" VARCHAR(120) NOT NULL,
  "supportType" "KnowledgeSupportType" NOT NULL,
  "actorUserId" UUID NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "KnowledgeReviewSourceReference_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "KnowledgeValidation_withdrawsValidationId_key"
  ON "KnowledgeValidation"("withdrawsValidationId");
CREATE INDEX "KnowledgeValidation_reviewTaskId_validatedAt_idx"
  ON "KnowledgeValidation"("reviewTaskId", "validatedAt");
CREATE INDEX "KnowledgeReviewTask_claimId_status_idx"
  ON "KnowledgeReviewTask"("claimId", "status");
CREATE UNIQUE INDEX "KnowledgeReviewDecision_reviewTaskId_sequence_key"
  ON "KnowledgeReviewDecision"("reviewTaskId", "sequence");
CREATE INDEX "KnowledgeReviewDecision_reviewTaskId_createdAt_idx"
  ON "KnowledgeReviewDecision"("reviewTaskId", "createdAt");
CREATE INDEX "KnowledgeReviewDecision_actorUserId_createdAt_idx"
  ON "KnowledgeReviewDecision"("actorUserId", "createdAt");
CREATE UNIQUE INDEX "KnowledgeReviewSourceReference_withdrawsReferenceId_key"
  ON "KnowledgeReviewSourceReference"("withdrawsReferenceId");
CREATE INDEX "KnowledgeReviewSourceReference_reviewTaskId_createdAt_idx"
  ON "KnowledgeReviewSourceReference"("reviewTaskId", "createdAt");
CREATE INDEX "KnowledgeReviewSourceReference_claimId_supportType_idx"
  ON "KnowledgeReviewSourceReference"("claimId", "supportType");
CREATE INDEX "KnowledgeReviewSourceReference_sourceVersionId_idx"
  ON "KnowledgeReviewSourceReference"("sourceVersionId");
CREATE INDEX "KnowledgeReviewSourceReference_actorUserId_createdAt_idx"
  ON "KnowledgeReviewSourceReference"("actorUserId", "createdAt");

ALTER TABLE "KnowledgeReviewTask"
  ADD CONSTRAINT "KnowledgeReviewTask_claimId_fkey"
    FOREIGN KEY ("claimId") REFERENCES "KnowledgeClaim"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "KnowledgeReviewTask_lastEditedById_fkey"
    FOREIGN KEY ("lastEditedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "KnowledgeReviewTask_completedById_fkey"
    FOREIGN KEY ("completedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "KnowledgeReviewTask_version_check" CHECK ("version" > 0),
  ADD CONSTRAINT "KnowledgeReviewTask_claim_binding_check"
    CHECK ("entityType" = 'KnowledgeClaim' AND "entityId" = "claimId");

ALTER TABLE "KnowledgeValidation"
  ADD CONSTRAINT "KnowledgeValidation_reviewTaskId_fkey"
    FOREIGN KEY ("reviewTaskId") REFERENCES "KnowledgeReviewTask"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "KnowledgeValidation_withdrawsValidationId_fkey"
    FOREIGN KEY ("withdrawsValidationId") REFERENCES "KnowledgeValidation"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "KnowledgeValidation_withdrawal_check"
    CHECK ("withdrawsValidationId" IS NULL OR "status" = 'REVIEW_REQUIRED');

ALTER TABLE "KnowledgeReviewDecision"
  ADD CONSTRAINT "KnowledgeReviewDecision_reviewTaskId_fkey"
    FOREIGN KEY ("reviewTaskId") REFERENCES "KnowledgeReviewTask"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "KnowledgeReviewDecision_actorUserId_fkey"
    FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "KnowledgeReviewDecision_sequence_check" CHECK ("sequence" > 0),
  ADD CONSTRAINT "KnowledgeReviewDecision_reason_check"
    CHECK (
      "decisionType" NOT IN ('CHANGES_REQUIRED', 'REJECTED', 'VALIDATION_WITHDRAWN')
      OR char_length(trim(COALESCE("reason", ''))) >= 5
    );

ALTER TABLE "KnowledgeReviewSourceReference"
  ADD CONSTRAINT "KnowledgeReviewSourceReference_reviewTaskId_fkey"
    FOREIGN KEY ("reviewTaskId") REFERENCES "KnowledgeReviewTask"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "KnowledgeReviewSourceReference_claimId_fkey"
    FOREIGN KEY ("claimId") REFERENCES "KnowledgeClaim"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "KnowledgeReviewSourceReference_sourceVersionId_fkey"
    FOREIGN KEY ("sourceVersionId") REFERENCES "KnowledgeSourceVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "KnowledgeReviewSourceReference_withdrawsReferenceId_fkey"
    FOREIGN KEY ("withdrawsReferenceId") REFERENCES "KnowledgeReviewSourceReference"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "KnowledgeReviewSourceReference_actorUserId_fkey"
    FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "KnowledgeReviewSourceReference_action_check"
    CHECK (
      ("action" = 'ADDED' AND "withdrawsReferenceId" IS NULL)
      OR ("action" = 'WITHDRAWN' AND "withdrawsReferenceId" IS NOT NULL)
    ),
  ADD CONSTRAINT "KnowledgeReviewSourceReference_not_self_check"
    CHECK ("withdrawsReferenceId" IS NULL OR "withdrawsReferenceId" <> "id");

CREATE OR REPLACE FUNCTION "knowledge_validate_review_source_withdrawal"()
RETURNS trigger AS $$
DECLARE
  original "KnowledgeReviewSourceReference"%ROWTYPE;
BEGIN
  IF NEW."action" = 'WITHDRAWN' THEN
    SELECT * INTO original
    FROM "KnowledgeReviewSourceReference"
    WHERE "id" = NEW."withdrawsReferenceId"
    FOR SHARE;
    IF NOT FOUND
      OR original."action" <> 'ADDED'
      OR original."reviewTaskId" <> NEW."reviewTaskId"
      OR original."claimId" <> NEW."claimId" THEN
      RAISE EXCEPTION 'Ongeldige intrekking van ondersteunende kennisbron';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "KnowledgeReviewSourceReference_validate_withdrawal"
BEFORE INSERT ON "KnowledgeReviewSourceReference"
FOR EACH ROW EXECUTE FUNCTION "knowledge_validate_review_source_withdrawal"();

CREATE TRIGGER "KnowledgeReviewDecision_append_only"
BEFORE UPDATE OR DELETE ON "KnowledgeReviewDecision"
FOR EACH ROW EXECUTE FUNCTION "knowledge_prevent_history_mutation"();

CREATE TRIGGER "KnowledgeReviewSourceReference_append_only"
BEFORE UPDATE OR DELETE ON "KnowledgeReviewSourceReference"
FOR EACH ROW EXECUTE FUNCTION "knowledge_prevent_history_mutation"();
