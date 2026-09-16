-- Append-only user edits; original Intake answers, revisions and dossier snapshots remain intact.
CREATE TABLE "IntakeSimpleAdviceRevision" (
  "intakeId" UUID NOT NULL REFERENCES "Intake"("id") ON DELETE RESTRICT ON UPDATE RESTRICT,
  "version" INTEGER NOT NULL CHECK ("version" > 0),
  "payload" JSONB NOT NULL CHECK (jsonb_typeof("payload") = 'object'),
  "actorUserId" UUID NOT NULL REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE RESTRICT,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("intakeId", "version")
);
CREATE FUNCTION "immutable_simple_advice_revision"() RETURNS trigger AS $$
BEGIN RAISE EXCEPTION 'Simple Advice draft history is immutable'; END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER "IntakeSimpleAdviceRevision_immutable" BEFORE UPDATE OR DELETE
ON "IntakeSimpleAdviceRevision" FOR EACH ROW EXECUTE FUNCTION "immutable_simple_advice_revision"();

-- Retain the immutable legacy Intake FK when an unpublished Assignment is reused.
-- Request remains canonical; two sources require explicit immutable handoff provenance.
ALTER TABLE "Assignment" DROP CONSTRAINT "Assignment_exclusive_source_check";
CREATE FUNCTION "validate_unified_assignment_provenance"() RETURNS trigger AS $$
BEGIN
  IF NEW."intakeId" IS NOT NULL AND NEW."requestId" IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM "RequestAssignmentHandoff" h
    WHERE h."assignmentId" = NEW.id AND h."requestId" = NEW."requestId"
      AND h.snapshot->>'legacyIntakeId' = NEW."intakeId"::text
  ) THEN RAISE EXCEPTION 'Canonical legacy Assignment requires immutable intake provenance'; END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
CREATE CONSTRAINT TRIGGER "Assignment_unified_source_provenance"
AFTER INSERT OR UPDATE ON "Assignment" DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION "validate_unified_assignment_provenance"();
