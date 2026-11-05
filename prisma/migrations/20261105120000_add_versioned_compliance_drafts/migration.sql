-- Opt-in drafts only. Existing runs and immutable results are not rewritten.
ALTER TABLE "ArboGuideRun" ADD COLUMN "draftRevision" INTEGER,
  ADD COLUMN "draftDefinitionChecksum" VARCHAR(64),
  ADD CONSTRAINT "ArboGuideRun_draft_contract" CHECK (
    ("draftRevision" IS NULL AND "draftDefinitionChecksum" IS NULL) OR
    ("draftRevision" IS NOT NULL AND "draftRevision" >= 0 AND "draftDefinitionChecksum" IS NOT NULL
     AND "draftDefinitionChecksum" ~ '^[a-f0-9]{64}$'
     AND "guideType" = 'COMPLIANCE' AND "guideVersion" = '2' AND "reportVersion" = '2.0'
     AND "complianceFrameworkVersionId" IS NOT NULL));
CREATE OR REPLACE FUNCTION "protect_arbo_guide_run"() RETURNS trigger LANGUAGE plpgsql AS $guard$
BEGIN
  IF TG_OP = 'DELETE' OR OLD."status" <> 'IN_PROGRESS' THEN
    RAISE EXCEPTION 'ArboGuideRun is immutable after completion and cannot be deleted';
  END IF;
  IF NEW."status" = 'COMPLETED' AND
     (to_jsonb(NEW) - ARRAY['status','reportNumber','completedAt','reportSnapshot','snapshotFingerprint','updatedAt']) =
     (to_jsonb(OLD) - ARRAY['status','reportNumber','completedAt','reportSnapshot','snapshotFingerprint','updatedAt']) THEN
    RETURN NEW;
  END IF;
  IF OLD."draftRevision" IS NOT NULL AND NEW."status" = 'IN_PROGRESS'
     AND NEW."draftRevision" = OLD."draftRevision" + 1 AND
     (to_jsonb(NEW) - ARRAY['answersSnapshot','draftRevision','updatedAt']) =
     (to_jsonb(OLD) - ARRAY['answersSnapshot','draftRevision','updatedAt']) THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'Only a versioned draft revision or immutable completion is permitted';
END;
$guard$;
