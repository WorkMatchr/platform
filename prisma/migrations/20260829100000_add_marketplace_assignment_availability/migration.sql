CREATE TYPE "MarketplaceAssignmentAvailabilityStatus" AS ENUM (
  'PENDING',
  'PROCESSING',
  'COMPLETED',
  'FAILED',
  'CANCELLED'
);

CREATE TABLE "MarketplaceAssignmentAvailability" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "assignmentId" UUID NOT NULL,
  "publishedVersion" INTEGER NOT NULL,
  "status" "MarketplaceAssignmentAvailabilityStatus" NOT NULL DEFAULT 'PENDING',
  "flowVersion" VARCHAR(40) NOT NULL,
  "idempotencyKey" VARCHAR(120) NOT NULL,
  "matchRunId" UUID,
  "candidatesEvaluated" INTEGER NOT NULL DEFAULT 0,
  "eligibleCount" INTEGER NOT NULL DEFAULT 0,
  "notEligibleCount" INTEGER NOT NULL DEFAULT 0,
  "attemptCount" INTEGER NOT NULL DEFAULT 0,
  "lastErrorCode" VARCHAR(80),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processingStartedAt" TIMESTAMPTZ(3),
  "completedAt" TIMESTAMPTZ(3),
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,

  CONSTRAINT "MarketplaceAssignmentAvailability_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MarketplaceAssignmentAvailability_counts_check" CHECK (
    "candidatesEvaluated" >= 0
    AND "eligibleCount" >= 0
    AND "notEligibleCount" >= 0
    AND "attemptCount" >= 0
    AND "eligibleCount" + "notEligibleCount" = "candidatesEvaluated"
  ),
  CONSTRAINT "MarketplaceAssignmentAvailability_completion_check" CHECK (
    ("status" = 'COMPLETED' AND "matchRunId" IS NOT NULL AND "completedAt" IS NOT NULL)
    OR ("status" <> 'COMPLETED')
  )
);

CREATE UNIQUE INDEX "MarketplaceAssignmentAvailability_assignmentId_key"
  ON "MarketplaceAssignmentAvailability"("assignmentId");
CREATE UNIQUE INDEX "MarketplaceAssignmentAvailability_idempotencyKey_key"
  ON "MarketplaceAssignmentAvailability"("idempotencyKey");
CREATE UNIQUE INDEX "MarketplaceAssignmentAvailability_matchRunId_key"
  ON "MarketplaceAssignmentAvailability"("matchRunId");
CREATE INDEX "MarketplaceAssignmentAvailability_status_createdAt_idx"
  ON "MarketplaceAssignmentAvailability"("status", "createdAt");

ALTER TABLE "MarketplaceAssignmentAvailability"
  ADD CONSTRAINT "MarketplaceAssignmentAvailability_assignmentId_fkey"
  FOREIGN KEY ("assignmentId") REFERENCES "Assignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "MarketplaceAssignmentAvailability"
  ADD CONSTRAINT "MarketplaceAssignmentAvailability_matchRunId_fkey"
  FOREIGN KEY ("matchRunId") REFERENCES "MarketplaceMatchRun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
