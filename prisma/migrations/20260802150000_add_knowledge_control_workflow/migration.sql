-- Additive Knowledge Control Workflow foundation.
-- Existing claims, review tasks, decisions and validations remain unchanged.

CREATE TYPE "KnowledgeControlRisk" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
CREATE TYPE "KnowledgeSourceControlStatus" AS ENUM (
  'NOT_STARTED',
  'SOURCES_REQUIRED',
  'SOURCES_COLLECTED',
  'CONSISTENT',
  'CONFLICT_DETECTED',
  'OUTDATED',
  'HUMAN_EXCEPTION_REQUIRED',
  'CONTROL_COMPLETE'
);
CREATE TYPE "KnowledgeImprovementReportType" AS ENUM (
  'OUTDATED',
  'INCORRECT',
  'INCOMPLETE',
  'SOURCE_CHANGED',
  'APPLICABILITY_UNCLEAR',
  'OTHER'
);
CREATE TYPE "KnowledgeImprovementReportStatus" AS ENUM (
  'NEW',
  'UNDER_INVESTIGATION',
  'PROCESSED',
  'REJECTED',
  'DUPLICATE'
);

ALTER TYPE "KnowledgeAuditEventType" ADD VALUE 'IMPROVEMENT_REPORTED';
ALTER TYPE "KnowledgeAuditEventType" ADD VALUE 'IMPROVEMENT_STATUS_CHANGED';

ALTER TABLE "KnowledgeClaim"
  ADD COLUMN "controlRisk" "KnowledgeControlRisk" NOT NULL DEFAULT 'MEDIUM',
  ADD COLUMN "sourceControlStatus" "KnowledgeSourceControlStatus" NOT NULL DEFAULT 'NOT_STARTED',
  ADD COLUMN "lastSourceCheckedAt" TIMESTAMPTZ(3);

CREATE TABLE "KnowledgeImprovementReport" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "claimId" UUID NOT NULL,
  "reviewTaskId" UUID NOT NULL,
  "reportType" "KnowledgeImprovementReportType" NOT NULL,
  "explanation" VARCHAR(1500) NOT NULL,
  "proposedImprovement" VARCHAR(1500),
  "sourceReference" VARCHAR(1000),
  "reporterUserId" UUID NOT NULL,
  "status" "KnowledgeImprovementReportStatus" NOT NULL DEFAULT 'NEW',
  "version" INTEGER NOT NULL DEFAULT 1,
  "handledByUserId" UUID,
  "handledAt" TIMESTAMPTZ(3),
  "resolution" VARCHAR(1500),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,

  CONSTRAINT "KnowledgeImprovementReport_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "KnowledgeImprovementReport_version_check" CHECK ("version" > 0),
  CONSTRAINT "KnowledgeImprovementReport_handling_check" CHECK (
    ("status" IN ('PROCESSED', 'REJECTED', 'DUPLICATE') AND "handledByUserId" IS NOT NULL AND "handledAt" IS NOT NULL AND "resolution" IS NOT NULL)
    OR
    ("status" IN ('NEW', 'UNDER_INVESTIGATION') AND "handledByUserId" IS NULL AND "handledAt" IS NULL AND "resolution" IS NULL)
  )
);

CREATE INDEX "KnowledgeImprovementReport_claimId_status_createdAt_idx"
  ON "KnowledgeImprovementReport"("claimId", "status", "createdAt");
CREATE INDEX "KnowledgeImprovementReport_reviewTaskId_status_idx"
  ON "KnowledgeImprovementReport"("reviewTaskId", "status");
CREATE INDEX "KnowledgeImprovementReport_reporterUserId_createdAt_idx"
  ON "KnowledgeImprovementReport"("reporterUserId", "createdAt");
CREATE INDEX "KnowledgeImprovementReport_status_createdAt_idx"
  ON "KnowledgeImprovementReport"("status", "createdAt");

ALTER TABLE "KnowledgeImprovementReport"
  ADD CONSTRAINT "KnowledgeImprovementReport_claimId_fkey"
  FOREIGN KEY ("claimId") REFERENCES "KnowledgeClaim"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "KnowledgeImprovementReport"
  ADD CONSTRAINT "KnowledgeImprovementReport_reviewTaskId_fkey"
  FOREIGN KEY ("reviewTaskId") REFERENCES "KnowledgeReviewTask"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "KnowledgeImprovementReport"
  ADD CONSTRAINT "KnowledgeImprovementReport_reporterUserId_fkey"
  FOREIGN KEY ("reporterUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "KnowledgeImprovementReport"
  ADD CONSTRAINT "KnowledgeImprovementReport_handledByUserId_fkey"
  FOREIGN KEY ("handledByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
