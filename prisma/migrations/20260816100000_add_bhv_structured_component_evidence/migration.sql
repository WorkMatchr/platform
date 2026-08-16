-- Add source-block evidence and explicit temporal status to structured Knowledge components.
ALTER TABLE "KnowledgeChecklist" ADD COLUMN "temporalStatus" "KnowledgeTemporalStatus" NOT NULL DEFAULT 'UNKNOWN';
ALTER TABLE "KnowledgeProcedure" ADD COLUMN "temporalStatus" "KnowledgeTemporalStatus" NOT NULL DEFAULT 'UNKNOWN';

CREATE TABLE "KnowledgeStructuredComponentEvidence" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "checklistItemId" UUID,
  "procedureStepId" UUID,
  "sourceBlockId" UUID NOT NULL,
  "evidenceRole" "KnowledgeMethodEvidenceRole" NOT NULL,
  "sequence" INTEGER NOT NULL,
  "rationale" VARCHAR(1000) NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "KnowledgeStructuredComponentEvidence_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "KnowledgeStructuredComponentEvidence_exactly_one_parent_check"
    CHECK (num_nonnulls("checklistItemId", "procedureStepId") = 1),
  CONSTRAINT "KnowledgeStructuredComponentEvidence_sequence_check" CHECK ("sequence" > 0),
  CONSTRAINT "KnowledgeStructuredComponentEvidence_rationale_check" CHECK (length(btrim("rationale")) > 0)
);

CREATE UNIQUE INDEX "KnowledgeStructuredEvidence_checklistItemId_sourceBlockId_role_key"
  ON "KnowledgeStructuredComponentEvidence"("checklistItemId", "sourceBlockId", "evidenceRole");
CREATE UNIQUE INDEX "KnowledgeStructuredEvidence_procedureStepId_sourceBlockId_role_key"
  ON "KnowledgeStructuredComponentEvidence"("procedureStepId", "sourceBlockId", "evidenceRole");
CREATE INDEX "KnowledgeStructuredEvidence_checklistItemId_sequence_idx" ON "KnowledgeStructuredComponentEvidence"("checklistItemId", "sequence");
CREATE INDEX "KnowledgeStructuredEvidence_procedureStepId_sequence_idx" ON "KnowledgeStructuredComponentEvidence"("procedureStepId", "sequence");
CREATE INDEX "KnowledgeStructuredEvidence_sourceBlockId_idx" ON "KnowledgeStructuredComponentEvidence"("sourceBlockId");

ALTER TABLE "KnowledgeStructuredComponentEvidence" ADD CONSTRAINT "KnowledgeStructuredEvidence_checklistItemId_fkey"
  FOREIGN KEY ("checklistItemId") REFERENCES "KnowledgeChecklistItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "KnowledgeStructuredComponentEvidence" ADD CONSTRAINT "KnowledgeStructuredEvidence_procedureStepId_fkey"
  FOREIGN KEY ("procedureStepId") REFERENCES "KnowledgeProcedureStep"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "KnowledgeStructuredComponentEvidence" ADD CONSTRAINT "KnowledgeStructuredEvidence_sourceBlockId_fkey"
  FOREIGN KEY ("sourceBlockId") REFERENCES "KnowledgeSourceBlock"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE OR REPLACE FUNCTION "knowledge_prevent_structured_component_mutation"() RETURNS trigger AS $$
BEGIN RAISE EXCEPTION 'Structured Knowledge component history is immutable'; END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER "KnowledgeChecklist_append_only" BEFORE UPDATE OR DELETE ON "KnowledgeChecklist" FOR EACH ROW EXECUTE FUNCTION "knowledge_prevent_structured_component_mutation"();
CREATE TRIGGER "KnowledgeChecklistItem_append_only" BEFORE UPDATE OR DELETE ON "KnowledgeChecklistItem" FOR EACH ROW EXECUTE FUNCTION "knowledge_prevent_structured_component_mutation"();
CREATE TRIGGER "KnowledgeProcedure_append_only" BEFORE UPDATE OR DELETE ON "KnowledgeProcedure" FOR EACH ROW EXECUTE FUNCTION "knowledge_prevent_structured_component_mutation"();
CREATE TRIGGER "KnowledgeProcedureStep_append_only" BEFORE UPDATE OR DELETE ON "KnowledgeProcedureStep" FOR EACH ROW EXECUTE FUNCTION "knowledge_prevent_structured_component_mutation"();
CREATE TRIGGER "KnowledgeStructuredComponentEvidence_append_only" BEFORE UPDATE OR DELETE ON "KnowledgeStructuredComponentEvidence" FOR EACH ROW EXECUTE FUNCTION "knowledge_prevent_structured_component_mutation"();

CREATE OR REPLACE FUNCTION "knowledge_require_structured_component_evidence"() RETURNS trigger AS $$
BEGIN
  IF TG_TABLE_NAME = 'KnowledgeChecklistItem' AND NOT EXISTS (
    SELECT 1 FROM "KnowledgeStructuredComponentEvidence" e WHERE e."checklistItemId" = NEW."id"
  ) THEN RAISE EXCEPTION 'Knowledge checklist item requires source-block evidence'; END IF;
  IF TG_TABLE_NAME = 'KnowledgeProcedureStep' AND NOT EXISTS (
    SELECT 1 FROM "KnowledgeStructuredComponentEvidence" e WHERE e."procedureStepId" = NEW."id"
  ) THEN RAISE EXCEPTION 'Knowledge procedure step requires source-block evidence'; END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;
CREATE CONSTRAINT TRIGGER "KnowledgeChecklistItem_evidence_required"
AFTER INSERT ON "KnowledgeChecklistItem" DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION "knowledge_require_structured_component_evidence"();
CREATE CONSTRAINT TRIGGER "KnowledgeProcedureStep_evidence_required"
AFTER INSERT ON "KnowledgeProcedureStep" DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION "knowledge_require_structured_component_evidence"();
