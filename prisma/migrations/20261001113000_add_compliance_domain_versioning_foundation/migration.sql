-- Arbo Compliance Scan v1 domain/versioning foundation.
-- Additive only: no existing rows are backfilled or rewritten.

CREATE TYPE "ComplianceFrameworkStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'RETIRED');
CREATE TYPE "ComplianceModuleCategory" AS ENUM ('CORE', 'RISK');
CREATE TYPE "ComplianceApplicability" AS ENUM ('RELEVANT', 'POSSIBLY_RELEVANT', 'NOT_APPLICABLE');
CREATE TYPE "ComplianceAssessmentStatus" AS ENUM ('IN_ORDER', 'ATTENTION_REQUIRED', 'ACTION_REQUIRED', 'NOT_ASSESSED', 'NOT_APPLICABLE');
CREATE TYPE "ComplianceAssessmentMode" AS ENUM ('FULL', 'SCREENING', 'SPECIALIST_REQUIRED');
CREATE TYPE "CompliancePriority" AS ENUM ('CRITICAL', 'HIGH', 'NORMAL', 'LOW');
CREATE TYPE "ComplianceQuestionInputType" AS ENUM ('BOOLEAN', 'SINGLE_SELECT', 'MULTI_SELECT', 'NUMBER', 'DATE', 'SHORT_TEXT');

CREATE TABLE "ComplianceFrameworkVersion" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "frameworkCode" VARCHAR(40) NOT NULL,
  "version" VARCHAR(32) NOT NULL,
  "status" "ComplianceFrameworkStatus" NOT NULL DEFAULT 'DRAFT',
  "title" VARCHAR(160) NOT NULL,
  "methodology" TEXT NOT NULL,
  "disclaimer" TEXT NOT NULL,
  "checksum" CHAR(64) NOT NULL,
  "publishedAt" TIMESTAMPTZ(3),
  "retiredAt" TIMESTAMPTZ(3),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ComplianceFrameworkVersion_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ComplianceFrameworkVersion_checksum_hex_check" CHECK ("checksum" ~ '^[0-9a-f]{64}$'),
  CONSTRAINT "ComplianceFrameworkVersion_status_dates_check" CHECK (
    ("status" = 'DRAFT' AND "publishedAt" IS NULL AND "retiredAt" IS NULL)
    OR ("status" = 'PUBLISHED' AND "publishedAt" IS NOT NULL AND "retiredAt" IS NULL)
    OR ("status" = 'RETIRED' AND "publishedAt" IS NOT NULL AND "retiredAt" IS NOT NULL)
  )
);

CREATE UNIQUE INDEX "ComplianceFrameworkVersion_frameworkCode_version_key"
  ON "ComplianceFrameworkVersion"("frameworkCode", "version");
CREATE INDEX "ComplianceFrameworkVersion_frameworkCode_status_idx"
  ON "ComplianceFrameworkVersion"("frameworkCode", "status");
CREATE INDEX "ComplianceFrameworkVersion_status_publishedAt_idx"
  ON "ComplianceFrameworkVersion"("status", "publishedAt");

CREATE TABLE "ComplianceModuleDefinition" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "frameworkVersionId" UUID NOT NULL,
  "code" VARCHAR(8) NOT NULL,
  "title" VARCHAR(160) NOT NULL,
  "category" "ComplianceModuleCategory" NOT NULL,
  "defaultAssessmentMode" "ComplianceAssessmentMode" NOT NULL,
  "position" INTEGER NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ComplianceModuleDefinition_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ComplianceModuleDefinition_code_category_check" CHECK (
    ("category" = 'CORE' AND "code" ~ '^C(0[1-9]|10)$')
    OR ("category" = 'RISK' AND "code" ~ '^R(0[1-9]|1[0-9]|2[0-3])$')
  ),
  CONSTRAINT "ComplianceModuleDefinition_position_check" CHECK ("position" > 0)
);

CREATE UNIQUE INDEX "ComplianceModuleDefinition_frameworkVersionId_code_key"
  ON "ComplianceModuleDefinition"("frameworkVersionId", "code");
CREATE UNIQUE INDEX "ComplianceModuleDefinition_frameworkVersionId_position_key"
  ON "ComplianceModuleDefinition"("frameworkVersionId", "position");
CREATE INDEX "ComplianceModuleDefinition_category_isActive_idx"
  ON "ComplianceModuleDefinition"("category", "isActive");

CREATE TABLE "ComplianceQuestionDefinition" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "moduleDefinitionId" UUID NOT NULL,
  "code" VARCHAR(40) NOT NULL,
  "prompt" VARCHAR(1000) NOT NULL,
  "helpText" VARCHAR(2000),
  "inputType" "ComplianceQuestionInputType" NOT NULL,
  "isRequired" BOOLEAN NOT NULL DEFAULT true,
  "position" INTEGER NOT NULL,
  "riskTags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ComplianceQuestionDefinition_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ComplianceQuestionDefinition_code_check" CHECK ("code" ~ '^[A-Z0-9][A-Z0-9_-]{1,39}$'),
  CONSTRAINT "ComplianceQuestionDefinition_position_check" CHECK ("position" > 0)
);

CREATE UNIQUE INDEX "ComplianceQuestionDefinition_moduleDefinitionId_code_key"
  ON "ComplianceQuestionDefinition"("moduleDefinitionId", "code");
CREATE UNIQUE INDEX "ComplianceQuestionDefinition_moduleDefinitionId_position_key"
  ON "ComplianceQuestionDefinition"("moduleDefinitionId", "position");
CREATE INDEX "ComplianceQuestionDefinition_code_idx"
  ON "ComplianceQuestionDefinition"("code");

CREATE TABLE "ComplianceAnswerOptionDefinition" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "questionDefinitionId" UUID NOT NULL,
  "value" VARCHAR(80) NOT NULL,
  "label" VARCHAR(200) NOT NULL,
  "position" INTEGER NOT NULL,
  "isExclusive" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ComplianceAnswerOptionDefinition_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ComplianceAnswerOptionDefinition_position_check" CHECK ("position" > 0)
);

CREATE UNIQUE INDEX "ComplianceAnswerOptionDefinition_questionDefinitionId_value_key"
  ON "ComplianceAnswerOptionDefinition"("questionDefinitionId", "value");
CREATE UNIQUE INDEX "ComplianceAnswerOptionDefinition_questionDefinitionId_position_key"
  ON "ComplianceAnswerOptionDefinition"("questionDefinitionId", "position");

CREATE TABLE "ComplianceRuleDefinition" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "frameworkVersionId" UUID NOT NULL,
  "moduleDefinitionId" UUID NOT NULL,
  "code" VARCHAR(60) NOT NULL,
  "conditionSchema" JSONB NOT NULL,
  "applicability" "ComplianceApplicability",
  "assessmentStatus" "ComplianceAssessmentStatus",
  "priority" "CompliancePriority",
  "assessmentMode" "ComplianceAssessmentMode" NOT NULL,
  "findingCode" VARCHAR(80),
  "findingTitle" VARCHAR(240),
  "findingBody" TEXT,
  "recommendedAction" TEXT,
  "escalation" JSONB,
  "serviceSuggestionCode" VARCHAR(80),
  "position" INTEGER NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ComplianceRuleDefinition_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ComplianceRuleDefinition_code_check" CHECK ("code" ~ '^[A-Z0-9][A-Z0-9_.-]{1,59}$'),
  CONSTRAINT "ComplianceRuleDefinition_position_check" CHECK ("position" > 0),
  CONSTRAINT "ComplianceRuleDefinition_output_check" CHECK (
    "applicability" IS NOT NULL OR "assessmentStatus" IS NOT NULL
  ),
  CONSTRAINT "ComplianceRuleDefinition_finding_check" CHECK (
    "assessmentStatus" IS NULL
    OR "assessmentStatus" IN ('IN_ORDER', 'NOT_APPLICABLE')
    OR ("findingCode" IS NOT NULL AND "findingTitle" IS NOT NULL AND "findingBody" IS NOT NULL)
  )
);

CREATE UNIQUE INDEX "ComplianceRuleDefinition_frameworkVersionId_code_key"
  ON "ComplianceRuleDefinition"("frameworkVersionId", "code");
CREATE UNIQUE INDEX "ComplianceRuleDefinition_moduleDefinitionId_position_key"
  ON "ComplianceRuleDefinition"("moduleDefinitionId", "position");
CREATE INDEX "ComplianceRuleDefinition_moduleDefinitionId_idx"
  ON "ComplianceRuleDefinition"("moduleDefinitionId");
CREATE INDEX "ComplianceRuleDefinition_assessmentStatus_priority_idx"
  ON "ComplianceRuleDefinition"("assessmentStatus", "priority");

CREATE TABLE "ComplianceRuleKnowledgeReference" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "ruleDefinitionId" UUID NOT NULL,
  "knowledgeClaimId" UUID NOT NULL,
  "supportType" "KnowledgeSupportType" NOT NULL,
  "isPrimary" BOOLEAN NOT NULL DEFAULT false,
  "position" INTEGER NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ComplianceRuleKnowledgeReference_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ComplianceRuleKnowledgeReference_position_check" CHECK ("position" > 0)
);

CREATE UNIQUE INDEX "ComplianceRuleKnowledgeReference_ruleDefinitionId_knowledgeClaimId_supportType_key"
  ON "ComplianceRuleKnowledgeReference"("ruleDefinitionId", "knowledgeClaimId", "supportType");
CREATE UNIQUE INDEX "ComplianceRuleKnowledgeReference_ruleDefinitionId_position_key"
  ON "ComplianceRuleKnowledgeReference"("ruleDefinitionId", "position");
CREATE INDEX "ComplianceRuleKnowledgeReference_knowledgeClaimId_idx"
  ON "ComplianceRuleKnowledgeReference"("knowledgeClaimId");

ALTER TABLE "ArboGuideRun"
  ADD COLUMN "complianceFrameworkVersionId" UUID,
  ADD CONSTRAINT "ArboGuideRun_compliance_framework_type_check"
    CHECK ("guideType" = 'COMPLIANCE' OR "complianceFrameworkVersionId" IS NULL);

CREATE INDEX "ArboGuideRun_complianceFrameworkVersionId_idx"
  ON "ArboGuideRun"("complianceFrameworkVersionId");

ALTER TABLE "ComplianceModuleDefinition"
  ADD CONSTRAINT "ComplianceModuleDefinition_frameworkVersionId_fkey"
  FOREIGN KEY ("frameworkVersionId") REFERENCES "ComplianceFrameworkVersion"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ComplianceQuestionDefinition"
  ADD CONSTRAINT "ComplianceQuestionDefinition_moduleDefinitionId_fkey"
  FOREIGN KEY ("moduleDefinitionId") REFERENCES "ComplianceModuleDefinition"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ComplianceAnswerOptionDefinition"
  ADD CONSTRAINT "ComplianceAnswerOptionDefinition_questionDefinitionId_fkey"
  FOREIGN KEY ("questionDefinitionId") REFERENCES "ComplianceQuestionDefinition"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ComplianceRuleDefinition"
  ADD CONSTRAINT "ComplianceRuleDefinition_frameworkVersionId_fkey"
  FOREIGN KEY ("frameworkVersionId") REFERENCES "ComplianceFrameworkVersion"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ComplianceRuleDefinition"
  ADD CONSTRAINT "ComplianceRuleDefinition_moduleDefinitionId_fkey"
  FOREIGN KEY ("moduleDefinitionId") REFERENCES "ComplianceModuleDefinition"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ComplianceRuleKnowledgeReference"
  ADD CONSTRAINT "ComplianceRuleKnowledgeReference_ruleDefinitionId_fkey"
  FOREIGN KEY ("ruleDefinitionId") REFERENCES "ComplianceRuleDefinition"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ComplianceRuleKnowledgeReference"
  ADD CONSTRAINT "ComplianceRuleKnowledgeReference_knowledgeClaimId_fkey"
  FOREIGN KEY ("knowledgeClaimId") REFERENCES "KnowledgeClaim"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ArboGuideRun"
  ADD CONSTRAINT "ArboGuideRun_complianceFrameworkVersionId_fkey"
  FOREIGN KEY ("complianceFrameworkVersionId") REFERENCES "ComplianceFrameworkVersion"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE OR REPLACE FUNCTION prevent_non_draft_compliance_framework_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD."status" <> 'DRAFT' THEN
      RAISE EXCEPTION 'Published or retired compliance framework versions are immutable.';
    END IF;
    RETURN OLD;
  END IF;

  IF NEW."frameworkCode" <> OLD."frameworkCode" OR NEW."version" <> OLD."version" THEN
    RAISE EXCEPTION 'Compliance framework identity is immutable.';
  END IF;

  IF OLD."status" = 'DRAFT' THEN
    IF NEW."status" = 'RETIRED' THEN
      RAISE EXCEPTION 'A draft compliance framework cannot be retired directly.';
    END IF;
    RETURN NEW;
  END IF;

  IF OLD."status" = 'PUBLISHED' THEN
    IF NEW."status" <> 'RETIRED'
       OR NEW."title" <> OLD."title"
       OR NEW."methodology" <> OLD."methodology"
       OR NEW."disclaimer" <> OLD."disclaimer"
       OR NEW."checksum" <> OLD."checksum"
       OR NEW."publishedAt" IS DISTINCT FROM OLD."publishedAt"
       OR NEW."retiredAt" IS NULL THEN
      RAISE EXCEPTION 'A published compliance framework may only transition unchanged to RETIRED.';
    END IF;
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Retired compliance framework versions are immutable.';
END;
$;

CREATE TRIGGER "ComplianceFrameworkVersion_immutable_after_publish"
BEFORE UPDATE OR DELETE ON "ComplianceFrameworkVersion"
FOR EACH ROW EXECUTE FUNCTION prevent_non_draft_compliance_framework_mutation();

CREATE OR REPLACE FUNCTION require_draft_compliance_framework()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  old_framework_id UUID;
  new_framework_id UUID;
  framework_status "ComplianceFrameworkStatus";
BEGIN
  IF TG_TABLE_NAME = 'ComplianceModuleDefinition' THEN
    IF TG_OP <> 'INSERT' THEN old_framework_id := OLD."frameworkVersionId"; END IF;
    IF TG_OP <> 'DELETE' THEN new_framework_id := NEW."frameworkVersionId"; END IF;
  ELSIF TG_TABLE_NAME = 'ComplianceQuestionDefinition' THEN
    IF TG_OP <> 'INSERT' THEN
      SELECT "frameworkVersionId" INTO old_framework_id
      FROM "ComplianceModuleDefinition" WHERE "id" = OLD."moduleDefinitionId";
    END IF;
    IF TG_OP <> 'DELETE' THEN
      SELECT "frameworkVersionId" INTO new_framework_id
      FROM "ComplianceModuleDefinition" WHERE "id" = NEW."moduleDefinitionId";
    END IF;
  ELSIF TG_TABLE_NAME = 'ComplianceAnswerOptionDefinition' THEN
    IF TG_OP <> 'INSERT' THEN
      SELECT m."frameworkVersionId" INTO old_framework_id
      FROM "ComplianceQuestionDefinition" q
      JOIN "ComplianceModuleDefinition" m ON m."id" = q."moduleDefinitionId"
      WHERE q."id" = OLD."questionDefinitionId";
    END IF;
    IF TG_OP <> 'DELETE' THEN
      SELECT m."frameworkVersionId" INTO new_framework_id
      FROM "ComplianceQuestionDefinition" q
      JOIN "ComplianceModuleDefinition" m ON m."id" = q."moduleDefinitionId"
      WHERE q."id" = NEW."questionDefinitionId";
    END IF;
  ELSIF TG_TABLE_NAME = 'ComplianceRuleDefinition' THEN
    IF TG_OP <> 'INSERT' THEN old_framework_id := OLD."frameworkVersionId"; END IF;
    IF TG_OP <> 'DELETE' THEN new_framework_id := NEW."frameworkVersionId"; END IF;
  ELSIF TG_TABLE_NAME = 'ComplianceRuleKnowledgeReference' THEN
    IF TG_OP <> 'INSERT' THEN
      SELECT "frameworkVersionId" INTO old_framework_id
      FROM "ComplianceRuleDefinition" WHERE "id" = OLD."ruleDefinitionId";
    END IF;
    IF TG_OP <> 'DELETE' THEN
      SELECT "frameworkVersionId" INTO new_framework_id
      FROM "ComplianceRuleDefinition" WHERE "id" = NEW."ruleDefinitionId";
    END IF;
  END IF;

  IF old_framework_id IS NOT NULL THEN
    SELECT "status" INTO framework_status FROM "ComplianceFrameworkVersion" WHERE "id" = old_framework_id;
    IF framework_status IS DISTINCT FROM 'DRAFT'::"ComplianceFrameworkStatus" THEN
      RAISE EXCEPTION 'Compliance configuration may only mutate while its framework version is DRAFT.';
    END IF;
  END IF;

  IF new_framework_id IS NOT NULL AND new_framework_id IS DISTINCT FROM old_framework_id THEN
    SELECT "status" INTO framework_status FROM "ComplianceFrameworkVersion" WHERE "id" = new_framework_id;
    IF framework_status IS DISTINCT FROM 'DRAFT'::"ComplianceFrameworkStatus" THEN
      RAISE EXCEPTION 'Compliance configuration may only mutate while its framework version is DRAFT.';
    END IF;
  END IF;

  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER "ComplianceModuleDefinition_draft_only"
BEFORE INSERT OR UPDATE OR DELETE ON "ComplianceModuleDefinition"
FOR EACH ROW EXECUTE FUNCTION require_draft_compliance_framework();

CREATE TRIGGER "ComplianceQuestionDefinition_draft_only"
BEFORE INSERT OR UPDATE OR DELETE ON "ComplianceQuestionDefinition"
FOR EACH ROW EXECUTE FUNCTION require_draft_compliance_framework();

CREATE TRIGGER "ComplianceAnswerOptionDefinition_draft_only"
BEFORE INSERT OR UPDATE OR DELETE ON "ComplianceAnswerOptionDefinition"
FOR EACH ROW EXECUTE FUNCTION require_draft_compliance_framework();

CREATE TRIGGER "ComplianceRuleDefinition_draft_only"
BEFORE INSERT OR UPDATE OR DELETE ON "ComplianceRuleDefinition"
FOR EACH ROW EXECUTE FUNCTION require_draft_compliance_framework();

CREATE TRIGGER "ComplianceRuleKnowledgeReference_draft_only"
BEFORE INSERT OR UPDATE OR DELETE ON "ComplianceRuleKnowledgeReference"
FOR EACH ROW EXECUTE FUNCTION require_draft_compliance_framework();

CREATE OR REPLACE FUNCTION validate_compliance_rule_module_framework()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  module_framework UUID;
BEGIN
  SELECT "frameworkVersionId" INTO module_framework
  FROM "ComplianceModuleDefinition"
  WHERE "id" = NEW."moduleDefinitionId";

  IF module_framework IS DISTINCT FROM NEW."frameworkVersionId" THEN
    RAISE EXCEPTION 'Compliance rule and module must belong to the same framework version.';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER "ComplianceRuleDefinition_same_framework"
BEFORE INSERT OR UPDATE ON "ComplianceRuleDefinition"
FOR EACH ROW EXECUTE FUNCTION validate_compliance_rule_module_framework();
