-- Additive link between validated knowledge and the existing central sector taxonomy.
CREATE TABLE "KnowledgeSectorApplicability" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "externalKey" VARCHAR(160) NOT NULL,
  "sectorId" UUID NOT NULL,
  "topicId" UUID,
  "claimId" UUID,
  "rationale" VARCHAR(1000),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "KnowledgeSectorApplicability_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "KnowledgeSectorApplicability_target_check" CHECK (num_nonnulls("topicId", "claimId") = 1),
  CONSTRAINT "KnowledgeSectorApplicability_sectorId_fkey" FOREIGN KEY ("sectorId") REFERENCES "Sector"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "KnowledgeSectorApplicability_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "KnowledgeTopic"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "KnowledgeSectorApplicability_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "KnowledgeClaim"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "KnowledgeSectorApplicability_externalKey_key" ON "KnowledgeSectorApplicability"("externalKey");
CREATE UNIQUE INDEX "KnowledgeSectorApplicability_sector_topic_key" ON "KnowledgeSectorApplicability"("sectorId", "topicId") WHERE "topicId" IS NOT NULL;
CREATE UNIQUE INDEX "KnowledgeSectorApplicability_sector_claim_key" ON "KnowledgeSectorApplicability"("sectorId", "claimId") WHERE "claimId" IS NOT NULL;
CREATE INDEX "KnowledgeSectorApplicability_sectorId_idx" ON "KnowledgeSectorApplicability"("sectorId");
CREATE INDEX "KnowledgeSectorApplicability_topicId_idx" ON "KnowledgeSectorApplicability"("topicId");
CREATE INDEX "KnowledgeSectorApplicability_claimId_idx" ON "KnowledgeSectorApplicability"("claimId");

CREATE TRIGGER "KnowledgeSectorApplicability_append_only"
BEFORE UPDATE OR DELETE ON "KnowledgeSectorApplicability"
FOR EACH ROW EXECUTE FUNCTION "knowledge_prevent_history_mutation"();
