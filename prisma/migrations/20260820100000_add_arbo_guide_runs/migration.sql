CREATE TYPE "ArboGuideType" AS ENUM ('COMPLIANCE', 'BHV', 'RIE', 'RISK');
CREATE TYPE "ArboGuideRunStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED');
CREATE TYPE "ArboGuideResultStatus" AS ENUM ('ORDER', 'ACTION', 'CHECK', 'NOT_APPLICABLE');

CREATE TABLE "ArboGuideRunCounter" (
  "guideType" "ArboGuideType" NOT NULL,
  "year" INTEGER NOT NULL,
  "nextNumber" INTEGER NOT NULL,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ArboGuideRunCounter_pkey" PRIMARY KEY ("guideType", "year"),
  CONSTRAINT "ArboGuideRunCounter_year_check" CHECK ("year" >= 2020),
  CONSTRAINT "ArboGuideRunCounter_next_number_check" CHECK ("nextNumber" > 0)
);

CREATE TABLE "ArboGuideRun" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "reportNumber" VARCHAR(32),
  "guideType" "ArboGuideType" NOT NULL,
  "guideVersion" VARCHAR(32) NOT NULL,
  "reportVersion" VARCHAR(32) NOT NULL,
  "organizationId" UUID NOT NULL,
  "completedByUserId" UUID NOT NULL,
  "status" "ArboGuideRunStatus" NOT NULL DEFAULT 'IN_PROGRESS',
  "idempotencyKey" VARCHAR(160) NOT NULL,
  "startedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMPTZ(3),
  "answersSnapshot" JSONB NOT NULL,
  "reportSnapshot" JSONB,
  "snapshotFingerprint" VARCHAR(64),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ArboGuideRun_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ArboGuideRun_idempotency_key_check" CHECK (length(btrim("idempotencyKey")) >= 8),
  CONSTRAINT "ArboGuideRun_versions_check" CHECK (length(btrim("guideVersion")) > 0 AND length(btrim("reportVersion")) > 0),
  CONSTRAINT "ArboGuideRun_answers_object_check" CHECK (jsonb_typeof("answersSnapshot") = 'object'),
  CONSTRAINT "ArboGuideRun_lifecycle_check" CHECK (
    ("status" = 'IN_PROGRESS' AND "reportNumber" IS NULL AND "completedAt" IS NULL AND "reportSnapshot" IS NULL AND "snapshotFingerprint" IS NULL)
    OR
    ("status" = 'COMPLETED' AND "reportNumber" IS NOT NULL AND "completedAt" IS NOT NULL AND jsonb_typeof("reportSnapshot") = 'object' AND "snapshotFingerprint" ~ '^[0-9a-f]{64}$')
  ),
  CONSTRAINT "ArboGuideRun_report_number_check" CHECK ("reportNumber" IS NULL OR "reportNumber" ~ '^(CW|BHV|RIE|RSK)-[0-9]{4}-[0-9]{6}$')
);

CREATE TABLE "ArboGuideRunResult" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "arboGuideRunId" UUID NOT NULL,
  "position" INTEGER NOT NULL,
  "subjectCode" VARCHAR(80) NOT NULL,
  "title" VARCHAR(200) NOT NULL,
  "status" "ArboGuideResultStatus" NOT NULL,
  "explanation" TEXT NOT NULL,
  "recommendedAction" TEXT NOT NULL,
  "sourceIdsSnapshot" JSONB NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ArboGuideRunResult_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ArboGuideRunResult_position_check" CHECK ("position" > 0),
  CONSTRAINT "ArboGuideRunResult_content_check" CHECK (length(btrim("subjectCode")) > 0 AND length(btrim("title")) > 0 AND length(btrim("explanation")) > 0 AND length(btrim("recommendedAction")) > 0),
  CONSTRAINT "ArboGuideRunResult_sources_array_check" CHECK (jsonb_typeof("sourceIdsSnapshot") = 'array')
);

CREATE UNIQUE INDEX "ArboGuideRun_reportNumber_key" ON "ArboGuideRun"("reportNumber");
CREATE UNIQUE INDEX "ArboGuideRun_organizationId_idempotencyKey_key" ON "ArboGuideRun"("organizationId", "idempotencyKey");
CREATE INDEX "ArboGuideRun_organizationId_completedAt_idx" ON "ArboGuideRun"("organizationId", "completedAt");
CREATE INDEX "ArboGuideRun_completedByUserId_completedAt_idx" ON "ArboGuideRun"("completedByUserId", "completedAt");
CREATE INDEX "ArboGuideRun_guideType_guideVersion_completedAt_idx" ON "ArboGuideRun"("guideType", "guideVersion", "completedAt");
CREATE INDEX "ArboGuideRun_status_createdAt_idx" ON "ArboGuideRun"("status", "createdAt");
CREATE UNIQUE INDEX "ArboGuideRunResult_arboGuideRunId_subjectCode_key" ON "ArboGuideRunResult"("arboGuideRunId", "subjectCode");
CREATE UNIQUE INDEX "ArboGuideRunResult_arboGuideRunId_position_key" ON "ArboGuideRunResult"("arboGuideRunId", "position");
CREATE INDEX "ArboGuideRunResult_subjectCode_status_idx" ON "ArboGuideRunResult"("subjectCode", "status");
CREATE INDEX "ArboGuideRunResult_status_createdAt_idx" ON "ArboGuideRunResult"("status", "createdAt");

ALTER TABLE "ArboGuideRun" ADD CONSTRAINT "ArboGuideRun_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ArboGuideRun" ADD CONSTRAINT "ArboGuideRun_completedByUserId_fkey" FOREIGN KEY ("completedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ArboGuideRunResult" ADD CONSTRAINT "ArboGuideRunResult_arboGuideRunId_fkey" FOREIGN KEY ("arboGuideRunId") REFERENCES "ArboGuideRun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE FUNCTION "protect_arbo_guide_run"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'ArboGuideRun is append-only';
  END IF;
  IF OLD."status" <> 'IN_PROGRESS' OR NEW."status" <> 'COMPLETED'
     OR NEW."id" <> OLD."id"
     OR NEW."guideType" <> OLD."guideType"
     OR NEW."guideVersion" <> OLD."guideVersion"
     OR NEW."reportVersion" <> OLD."reportVersion"
     OR NEW."organizationId" <> OLD."organizationId"
     OR NEW."completedByUserId" <> OLD."completedByUserId"
     OR NEW."idempotencyKey" <> OLD."idempotencyKey"
     OR NEW."startedAt" <> OLD."startedAt"
     OR NEW."answersSnapshot" <> OLD."answersSnapshot"
     OR NEW."createdAt" <> OLD."createdAt" THEN
    RAISE EXCEPTION 'ArboGuideRun may only transition once from IN_PROGRESS to COMPLETED';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER "ArboGuideRun_protect_update_delete"
BEFORE UPDATE OR DELETE ON "ArboGuideRun"
FOR EACH ROW EXECUTE FUNCTION "protect_arbo_guide_run"();

CREATE FUNCTION "protect_arbo_guide_run_result"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'ArboGuideRunResult is append-only';
END;
$$;

CREATE TRIGGER "ArboGuideRunResult_protect_update_delete"
BEFORE UPDATE OR DELETE ON "ArboGuideRunResult"
FOR EACH ROW EXECUTE FUNCTION "protect_arbo_guide_run_result"();

CREATE FUNCTION "require_completed_arbo_guide_results"() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE target_id UUID;
BEGIN
  IF TG_TABLE_NAME = 'ArboGuideRun' THEN
    target_id := NEW."id";
  ELSE
    target_id := NEW."arboGuideRunId";
  END IF;
  IF EXISTS (SELECT 1 FROM "ArboGuideRun" WHERE "id" = target_id AND "status" = 'COMPLETED')
     AND NOT EXISTS (SELECT 1 FROM "ArboGuideRunResult" WHERE "arboGuideRunId" = target_id) THEN
    RAISE EXCEPTION 'A completed ArboGuideRun requires results';
  END IF;
  RETURN NULL;
END;
$$;

CREATE CONSTRAINT TRIGGER "ArboGuideRun_requires_results"
AFTER INSERT OR UPDATE ON "ArboGuideRun"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION "require_completed_arbo_guide_results"();

CREATE CONSTRAINT TRIGGER "ArboGuideRunResult_keeps_completed_results"
AFTER INSERT ON "ArboGuideRunResult"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION "require_completed_arbo_guide_results"();
