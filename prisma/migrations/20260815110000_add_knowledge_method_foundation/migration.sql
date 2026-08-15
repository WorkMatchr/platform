-- Add an immutable method aggregate over existing structured Knowledge objects.
CREATE TYPE "KnowledgeMethodEvidenceRole" AS ENUM ('BASIS', 'INPUT', 'STEP', 'OUTPUT', 'LIMITATION');

CREATE TABLE "KnowledgeMethod" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "code" VARCHAR(120) NOT NULL, "revision" INTEGER NOT NULL,
  "title" VARCHAR(240) NOT NULL, "purpose" VARCHAR(1500) NOT NULL, "applicability" JSONB NOT NULL,
  "inputContract" JSONB NOT NULL, "outputContract" JSONB NOT NULL, "limitations" VARCHAR(2000) NOT NULL,
  "temporalStatus" "KnowledgeTemporalStatus" NOT NULL, "validationStatus" "KnowledgeValidationStatus" NOT NULL DEFAULT 'UNVALIDATED',
  "publicationStatus" "KnowledgePublicationStatus" NOT NULL DEFAULT 'DRAFT', "accessTier" "KnowledgeAccessTier" NOT NULL DEFAULT 'INTERNAL_REVIEWER',
  "contentFingerprint" VARCHAR(64) NOT NULL, "supersedesMethodId" UUID, "createdByActor" VARCHAR(80) NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "KnowledgeMethod_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "KnowledgeMethod_revision_check" CHECK ("revision" > 0),
  CONSTRAINT "KnowledgeMethod_fingerprint_check" CHECK ("contentFingerprint" ~ '^[0-9a-f]{64}$'),
  CONSTRAINT "KnowledgeMethod_safe_status_check" CHECK ("publicationStatus" = 'DRAFT' AND "validationStatus" = 'UNVALIDATED')
);

CREATE TABLE "KnowledgeMethodComponent" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "methodId" UUID NOT NULL, "sequence" INTEGER NOT NULL,
  "label" VARCHAR(240) NOT NULL, "procedureId" UUID, "checklistId" UUID, "ruleId" UUID, "calculationId" UUID, "formTemplateId" UUID,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "KnowledgeMethodComponent_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "KnowledgeMethodComponent_sequence_check" CHECK ("sequence" > 0),
  CONSTRAINT "KnowledgeMethodComponent_exactly_one_reference_check" CHECK (num_nonnulls("procedureId", "checklistId", "ruleId", "calculationId", "formTemplateId") = 1)
);

CREATE TABLE "KnowledgeMethodEvidence" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "methodId" UUID NOT NULL, "componentId" UUID, "sourceBlockId" UUID NOT NULL,
  "evidenceRole" "KnowledgeMethodEvidenceRole" NOT NULL, "sequence" INTEGER NOT NULL, "rationale" VARCHAR(1000) NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "KnowledgeMethodEvidence_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "KnowledgeMethodEvidence_sequence_check" CHECK ("sequence" > 0)
);

CREATE UNIQUE INDEX "KnowledgeMethod_code_revision_key" ON "KnowledgeMethod"("code", "revision");
CREATE UNIQUE INDEX "KnowledgeMethod_code_contentFingerprint_key" ON "KnowledgeMethod"("code", "contentFingerprint");
CREATE UNIQUE INDEX "KnowledgeMethod_supersedesMethodId_key" ON "KnowledgeMethod"("supersedesMethodId");
CREATE INDEX "KnowledgeMethod_code_supersedesMethodId_idx" ON "KnowledgeMethod"("code", "supersedesMethodId");
CREATE INDEX "KnowledgeMethod_publicationStatus_validationStatus_accessTi_idx" ON "KnowledgeMethod"("publicationStatus", "validationStatus", "accessTier");
CREATE UNIQUE INDEX "KnowledgeMethodComponent_id_methodId_key" ON "KnowledgeMethodComponent"("id", "methodId");
CREATE UNIQUE INDEX "KnowledgeMethodComponent_methodId_sequence_key" ON "KnowledgeMethodComponent"("methodId", "sequence");
CREATE INDEX "KnowledgeMethodComponent_procedureId_idx" ON "KnowledgeMethodComponent"("procedureId");
CREATE INDEX "KnowledgeMethodComponent_checklistId_idx" ON "KnowledgeMethodComponent"("checklistId");
CREATE INDEX "KnowledgeMethodComponent_ruleId_idx" ON "KnowledgeMethodComponent"("ruleId");
CREATE INDEX "KnowledgeMethodComponent_calculationId_idx" ON "KnowledgeMethodComponent"("calculationId");
CREATE INDEX "KnowledgeMethodComponent_formTemplateId_idx" ON "KnowledgeMethodComponent"("formTemplateId");
CREATE UNIQUE INDEX "KnowledgeMethodEvidence_methodId_sequence_key" ON "KnowledgeMethodEvidence"("methodId", "sequence");
CREATE UNIQUE INDEX "KnowledgeMethodEvidence_methodId_sourceBlockId_componentId__key" ON "KnowledgeMethodEvidence"("methodId", "sourceBlockId", "componentId", "evidenceRole") NULLS NOT DISTINCT;
CREATE INDEX "KnowledgeMethodEvidence_componentId_sequence_idx" ON "KnowledgeMethodEvidence"("componentId", "sequence");
CREATE INDEX "KnowledgeMethodEvidence_sourceBlockId_idx" ON "KnowledgeMethodEvidence"("sourceBlockId");

ALTER TABLE "KnowledgeMethod" ADD CONSTRAINT "KnowledgeMethod_supersedesMethodId_fkey" FOREIGN KEY ("supersedesMethodId") REFERENCES "KnowledgeMethod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "KnowledgeMethodComponent" ADD CONSTRAINT "KnowledgeMethodComponent_methodId_fkey" FOREIGN KEY ("methodId") REFERENCES "KnowledgeMethod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "KnowledgeMethodComponent" ADD CONSTRAINT "KnowledgeMethodComponent_procedureId_fkey" FOREIGN KEY ("procedureId") REFERENCES "KnowledgeProcedure"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "KnowledgeMethodComponent" ADD CONSTRAINT "KnowledgeMethodComponent_checklistId_fkey" FOREIGN KEY ("checklistId") REFERENCES "KnowledgeChecklist"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "KnowledgeMethodComponent" ADD CONSTRAINT "KnowledgeMethodComponent_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "KnowledgeRule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "KnowledgeMethodComponent" ADD CONSTRAINT "KnowledgeMethodComponent_calculationId_fkey" FOREIGN KEY ("calculationId") REFERENCES "KnowledgeCalculation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "KnowledgeMethodComponent" ADD CONSTRAINT "KnowledgeMethodComponent_formTemplateId_fkey" FOREIGN KEY ("formTemplateId") REFERENCES "KnowledgeFormTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "KnowledgeMethodEvidence" ADD CONSTRAINT "KnowledgeMethodEvidence_methodId_fkey" FOREIGN KEY ("methodId") REFERENCES "KnowledgeMethod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "KnowledgeMethodEvidence" ADD CONSTRAINT "KnowledgeMethodEvidence_componentId_methodId_fkey" FOREIGN KEY ("componentId", "methodId") REFERENCES "KnowledgeMethodComponent"("id", "methodId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "KnowledgeMethodEvidence" ADD CONSTRAINT "KnowledgeMethodEvidence_sourceBlockId_fkey" FOREIGN KEY ("sourceBlockId") REFERENCES "KnowledgeSourceBlock"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE OR REPLACE FUNCTION "knowledge_prevent_method_mutation"() RETURNS trigger AS $$
BEGIN RAISE EXCEPTION 'Knowledge method history is immutable'; END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER "KnowledgeMethod_append_only" BEFORE UPDATE OR DELETE ON "KnowledgeMethod" FOR EACH ROW EXECUTE FUNCTION "knowledge_prevent_method_mutation"();
CREATE TRIGGER "KnowledgeMethodComponent_append_only" BEFORE UPDATE OR DELETE ON "KnowledgeMethodComponent" FOR EACH ROW EXECUTE FUNCTION "knowledge_prevent_method_mutation"();
CREATE TRIGGER "KnowledgeMethodEvidence_append_only" BEFORE UPDATE OR DELETE ON "KnowledgeMethodEvidence" FOR EACH ROW EXECUTE FUNCTION "knowledge_prevent_method_mutation"();

CREATE OR REPLACE FUNCTION "knowledge_require_component_evidence"() RETURNS trigger AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM "KnowledgeMethodEvidence" e WHERE e."componentId" = NEW."id" AND e."methodId" = NEW."methodId") THEN
    RAISE EXCEPTION 'Knowledge method component requires evidence';
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;
CREATE CONSTRAINT TRIGGER "KnowledgeMethodComponent_evidence_required"
AFTER INSERT ON "KnowledgeMethodComponent" DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION "knowledge_require_component_evidence"();
