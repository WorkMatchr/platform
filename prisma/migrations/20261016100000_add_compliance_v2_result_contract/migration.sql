-- Additive v2 projection; never reinterpret or backfill legacy four-status rows.
ALTER TABLE "ArboGuideRunResult"
  ALTER COLUMN "status" DROP NOT NULL,
  ADD COLUMN "assessmentStatus" "ComplianceAssessmentStatus",
  ADD COLUMN "resultSchemaVersion" INTEGER NOT NULL DEFAULT 1,
  ADD CONSTRAINT "ArboGuideRunResult_versioned_status_check" CHECK (
    ("resultSchemaVersion" = 1 AND "status" IS NOT NULL AND "assessmentStatus" IS NULL)
    OR ("resultSchemaVersion" = 2 AND "status" IS NULL AND "assessmentStatus" IS NOT NULL)
  );

ALTER TABLE "ComplianceRuleDefinition" ADD COLUMN "basis" VARCHAR(32),
  ADD CONSTRAINT "ComplianceRuleDefinition_basis_check" CHECK (
    "basis" IS NULL OR "basis" IN ('LEGAL_REQUIREMENT', 'PRACTICAL_RECOMMENDATION')
  );

CREATE FUNCTION validate_arbo_guide_result_version() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE run "ArboGuideRun";
BEGIN
  SELECT * INTO run FROM "ArboGuideRun" WHERE "id" = NEW."arboGuideRunId";
  IF run."status" <> 'IN_PROGRESS' THEN
    RAISE EXCEPTION 'Cannot append results to a completed assessment';
  END IF;
  IF NEW."resultSchemaVersion" = 2 AND (
    run."guideType" <> 'COMPLIANCE' OR run."guideVersion" <> '2' OR run."reportVersion" <> '2.0'
    OR run."complianceFrameworkVersionId" IS NULL
  ) THEN RAISE EXCEPTION 'V2 results require a version-bound compliance run'; END IF;
  IF NEW."resultSchemaVersion" = 1 AND run."guideType" = 'COMPLIANCE' AND run."guideVersion" = '2'
    THEN RAISE EXCEPTION 'V2 run cannot contain legacy projections'; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER "ArboGuideRunResult_validate_version"
BEFORE INSERT ON "ArboGuideRunResult" FOR EACH ROW EXECUTE FUNCTION validate_arbo_guide_result_version();

CREATE FUNCTION validate_compliance_v2_completion() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW."guideType" = 'COMPLIANCE' AND NEW."guideVersion" = '2' AND NEW."status" = 'COMPLETED' THEN
    IF NEW."reportVersion" <> '2.0'
       OR NEW."reportSnapshot"->>'schemaVersion' IS DISTINCT FROM '2'
       OR NEW."reportSnapshot"->'framework'->>'id' IS DISTINCT FROM NEW."complianceFrameworkVersionId"::text
       OR jsonb_typeof(NEW."reportSnapshot"->'results') IS DISTINCT FROM 'array' THEN
      RAISE EXCEPTION 'V2 completion requires a matching versioned snapshot';
    END IF;
    IF (SELECT count(*) FROM "ArboGuideRunResult" WHERE "arboGuideRunId" = NEW."id")
       <> jsonb_array_length(NEW."reportSnapshot"->'results')
       OR EXISTS (
         SELECT 1 FROM "ArboGuideRunResult" r WHERE r."arboGuideRunId" = NEW."id" AND (
           r."resultSchemaVersion" <> 2 OR NOT EXISTS (
             SELECT 1 FROM jsonb_array_elements(NEW."reportSnapshot"->'results') x
             WHERE x->>'id' = r."subjectCode" AND x->>'status' = r."assessmentStatus"::text
           )
         )
       ) THEN RAISE EXCEPTION 'V2 projection must equal its immutable snapshot'; END IF;
  ELSIF NEW."reportSnapshot"->>'schemaVersion' = '2' THEN
    RAISE EXCEPTION 'V2 snapshot requires a v2 compliance run';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER "ArboGuideRun_validate_v2_completion"
BEFORE UPDATE ON "ArboGuideRun" FOR EACH ROW EXECUTE FUNCTION validate_compliance_v2_completion();

-- The existing append-only triggers protect the new columns as well.
-- No v2 framework/questions/rules are published or seeded by this migration.
