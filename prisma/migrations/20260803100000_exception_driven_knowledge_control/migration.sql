CREATE TYPE "KnowledgeControlExceptionType" AS ENUM (
  'SOURCE_CONFLICT',
  'INSUFFICIENT_TRACEABILITY',
  'SOURCE_EXPIRED',
  'PROFESSIONAL_REPORT',
  'PUBLICATION_BLOCKED',
  'APPLICABILITY_UNCLEAR',
  'SITUATIONAL_USE',
  'HIGH_RISK_PUBLICATION'
);

ALTER TYPE "KnowledgeAuditEventType" ADD VALUE IF NOT EXISTS 'CONTROL_EXCEPTION_ACTIVATED';
ALTER TYPE "KnowledgeAuditEventType" ADD VALUE IF NOT EXISTS 'CONTROL_EXCEPTION_DEACTIVATED';

ALTER TABLE "KnowledgeReviewTask"
  ADD COLUMN "requiresHumanAction" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "controlExceptionType" "KnowledgeControlExceptionType",
  ADD COLUMN "controlExceptionReason" VARCHAR(1000),
  ADD COLUMN "activatedAt" TIMESTAMPTZ(3),
  ADD COLUMN "deactivatedAt" TIMESTAMPTZ(3);

-- Bestaande concrete uitzonderingen blijven actief. Historische generieke importtaken
-- worden uitsluitend uit de werkvoorraad gehaald; hun taak, beslissingen en audit blijven bestaan.
UPDATE "KnowledgeReviewTask" task
SET
  "requiresHumanAction" = true,
  "controlExceptionType" = 'PROFESSIONAL_REPORT',
  "controlExceptionReason" = 'Er staat een inhoudelijke verbetermelding open.',
  "activatedAt" = COALESCE(task."startedAt", task."createdAt")
WHERE EXISTS (
  SELECT 1 FROM "KnowledgeImprovementReport" report
  WHERE report."reviewTaskId" = task."id"
    AND report."status" IN ('NEW', 'UNDER_INVESTIGATION')
);

UPDATE "KnowledgeReviewTask" task
SET
  "requiresHumanAction" = true,
  "controlExceptionType" = 'SOURCE_CONFLICT',
  "controlExceptionReason" = 'De bronnen spreken elkaar tegen.',
  "activatedAt" = COALESCE(task."startedAt", task."createdAt")
FROM "KnowledgeClaim" claim
WHERE task."claimId" = claim."id"
  AND task."requiresHumanAction" = false
  AND claim."sourceControlStatus" = 'CONFLICT_DETECTED';

UPDATE "KnowledgeReviewTask" task
SET
  "requiresHumanAction" = true,
  "controlExceptionType" = 'SOURCE_EXPIRED',
  "controlExceptionReason" = 'Een onderliggende bron is verlopen of verouderd.',
  "activatedAt" = COALESCE(task."startedAt", task."createdAt")
FROM "KnowledgeClaim" claim
WHERE task."claimId" = claim."id"
  AND task."requiresHumanAction" = false
  AND claim."sourceControlStatus" = 'OUTDATED';

UPDATE "KnowledgeReviewTask" task
SET
  "requiresHumanAction" = true,
  "controlExceptionType" = 'APPLICABILITY_UNCLEAR',
  "controlExceptionReason" = 'Het toepassingsgebied is onduidelijk of tegenstrijdig.',
  "activatedAt" = COALESCE(task."startedAt", task."createdAt")
FROM "KnowledgeClaim" claim
WHERE task."claimId" = claim."id"
  AND task."requiresHumanAction" = false
  AND claim."sourceControlStatus" = 'HUMAN_EXCEPTION_REQUIRED';

UPDATE "KnowledgeReviewTask" task
SET
  "requiresHumanAction" = true,
  "controlExceptionType" = 'HIGH_RISK_PUBLICATION',
  "controlExceptionReason" = 'Publicatie van kennis met een hoog of kritiek risico wordt overwogen.',
  "activatedAt" = COALESCE(task."startedAt", task."createdAt")
FROM "KnowledgeClaim" claim
WHERE task."claimId" = claim."id"
  AND task."requiresHumanAction" = false
  AND claim."controlRisk" IN ('HIGH', 'CRITICAL')
  AND claim."publicationStatus" IN ('APPROVED', 'PUBLISHED');

INSERT INTO "KnowledgeAuditEvent" (
  "id", "eventType", "entityType", "entityId", "actorType", "result", "reason", "metadata", "createdAt"
)
SELECT
  gen_random_uuid(),
  'CONTROL_EXCEPTION_DEACTIVATED',
  'KnowledgeReviewTask',
  task."id",
  'SYSTEM_MIGRATION',
  'SUCCESS',
  'Generieke historische controletaak uit de dagelijkse werkvoorraad gehaald.',
  jsonb_build_object('reasonCode', 'LEGACY_GENERIC_REVIEW_QUEUE', 'claimId', task."claimId"),
  CURRENT_TIMESTAMP
FROM "KnowledgeReviewTask" task
WHERE task."requiresHumanAction" = false
  AND task."status" IN ('OPEN', 'IN_PROGRESS', 'DEFERRED', 'CHANGES_REQUIRED');

UPDATE "KnowledgeReviewTask"
SET "deactivatedAt" = CURRENT_TIMESTAMP
WHERE "requiresHumanAction" = false
  AND "status" IN ('OPEN', 'IN_PROGRESS', 'DEFERRED', 'CHANGES_REQUIRED');

ALTER TABLE "KnowledgeReviewTask"
  ADD CONSTRAINT "KnowledgeReviewTask_human_action_check" CHECK (
    ("requiresHumanAction" = true
      AND "controlExceptionType" IS NOT NULL
      AND "controlExceptionReason" IS NOT NULL
      AND "activatedAt" IS NOT NULL
      AND "deactivatedAt" IS NULL)
    OR
    ("requiresHumanAction" = false)
  );

CREATE INDEX "KnowledgeReviewTask_requiresHumanAction_status_priority_dueAt_idx"
  ON "KnowledgeReviewTask"("requiresHumanAction", "status", "priority", "dueAt");
CREATE INDEX "KnowledgeReviewTask_controlExceptionType_requiresHumanAction_idx"
  ON "KnowledgeReviewTask"("controlExceptionType", "requiresHumanAction");
