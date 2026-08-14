-- Additive metadata required by the generic local Knowledge Engine import.
CREATE TYPE "KnowledgeMetadataStatus" AS ENUM ('COMPLETE', 'INCOMPLETE', 'UNCERTAIN');

ALTER TABLE "KnowledgeSource"
  ADD COLUMN "sourceModifiedDate" DATE,
  ADD COLUMN "applicabilityScope" VARCHAR(500),
  ADD COLUMN "metadataStatus" "KnowledgeMetadataStatus" NOT NULL DEFAULT 'UNCERTAIN';

CREATE INDEX "KnowledgeSource_metadataStatus_temporalStatus_idx"
  ON "KnowledgeSource"("metadataStatus", "temporalStatus");
