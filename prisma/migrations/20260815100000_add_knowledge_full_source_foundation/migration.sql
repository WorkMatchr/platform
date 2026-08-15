-- Add an internal, immutable full-source layer alongside the existing controlled fragments and claims.
CREATE TYPE "KnowledgeFullExtractionRunStatus" AS ENUM ('COMPLETED', 'FAILED');
CREATE TYPE "KnowledgeSourcePageStatus" AS ENUM ('EXTRACTED', 'EMPTY', 'FAILED');
CREATE TYPE "KnowledgeSourceBlockType" AS ENUM ('HEADING', 'PARAGRAPH', 'LIST_ITEM', 'TABLE', 'FOOTNOTE', 'CAPTION', 'EXAMPLE', 'HEADER_FOOTER');

CREATE TABLE "KnowledgeExtractionRun" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "sourceVersionId" UUID NOT NULL,
  "previousRunId" UUID,
  "extractorName" VARCHAR(120) NOT NULL,
  "extractorVersion" VARCHAR(80) NOT NULL,
  "configurationVersion" VARCHAR(80) NOT NULL,
  "status" "KnowledgeFullExtractionRunStatus" NOT NULL,
  "pageCount" INTEGER NOT NULL,
  "extractionFingerprint" VARCHAR(64) NOT NULL,
  "warningSummary" VARCHAR(1000),
  "errorCategory" VARCHAR(80),
  "startedAt" TIMESTAMPTZ(3) NOT NULL,
  "completedAt" TIMESTAMPTZ(3) NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "KnowledgeExtractionRun_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "KnowledgeExtractionRun_pageCount_check" CHECK ("pageCount" >= 0),
  CONSTRAINT "KnowledgeExtractionRun_fingerprint_check" CHECK ("extractionFingerprint" ~ '^[0-9a-f]{64}$'),
  CONSTRAINT "KnowledgeExtractionRun_time_check" CHECK ("completedAt" >= "startedAt"),
  CONSTRAINT "KnowledgeExtractionRun_status_error_check" CHECK (
    ("status" = 'COMPLETED' AND "errorCategory" IS NULL) OR
    ("status" = 'FAILED' AND "errorCategory" IS NOT NULL)
  )
);

CREATE TABLE "KnowledgeSourcePage" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "extractionRunId" UUID NOT NULL,
  "pageNumber" INTEGER NOT NULL,
  "status" "KnowledgeSourcePageStatus" NOT NULL,
  "textHash" VARCHAR(64) NOT NULL,
  "ocrUsed" BOOLEAN NOT NULL DEFAULT false,
  "confidence" DECIMAL(5,4),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "KnowledgeSourcePage_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "KnowledgeSourcePage_pageNumber_check" CHECK ("pageNumber" > 0),
  CONSTRAINT "KnowledgeSourcePage_textHash_check" CHECK ("textHash" ~ '^[0-9a-f]{64}$'),
  CONSTRAINT "KnowledgeSourcePage_confidence_check" CHECK ("confidence" IS NULL OR ("confidence" >= 0 AND "confidence" <= 1))
);

CREATE TABLE "KnowledgeSourceBlock" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "sourcePageId" UUID NOT NULL,
  "extractionRunId" UUID NOT NULL,
  "globalSequence" INTEGER NOT NULL,
  "pageSequence" INTEGER NOT NULL,
  "sectionPath" VARCHAR(500),
  "blockType" "KnowledgeSourceBlockType" NOT NULL,
  "exactText" TEXT NOT NULL,
  "normalizedSearchText" TEXT NOT NULL,
  "textHash" VARCHAR(64) NOT NULL,
  "extractionMethod" VARCHAR(80) NOT NULL,
  "confidence" DECIMAL(5,4),
  "requiresReview" BOOLEAN NOT NULL DEFAULT false,
  "searchVector" tsvector GENERATED ALWAYS AS (to_tsvector('dutch', coalesce("normalizedSearchText", ''))) STORED,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "KnowledgeSourceBlock_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "KnowledgeSourceBlock_sequence_check" CHECK ("globalSequence" > 0 AND "pageSequence" > 0),
  CONSTRAINT "KnowledgeSourceBlock_text_check" CHECK (length(btrim("exactText")) > 0 AND length(btrim("normalizedSearchText")) > 0),
  CONSTRAINT "KnowledgeSourceBlock_textHash_check" CHECK ("textHash" ~ '^[0-9a-f]{64}$'),
  CONSTRAINT "KnowledgeSourceBlock_confidence_check" CHECK ("confidence" IS NULL OR ("confidence" >= 0 AND "confidence" <= 1))
);

CREATE TABLE "KnowledgeFragmentBlock" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "fragmentId" UUID NOT NULL,
  "blockId" UUID NOT NULL,
  "sequence" INTEGER NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "KnowledgeFragmentBlock_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "KnowledgeFragmentBlock_sequence_check" CHECK ("sequence" > 0)
);

CREATE UNIQUE INDEX "KnowledgeExtractionRun_sourceVersionId_extractionFingerprint_key" ON "KnowledgeExtractionRun"("sourceVersionId", "extractionFingerprint");
CREATE INDEX "KnowledgeExtractionRun_sourceVersionId_createdAt_idx" ON "KnowledgeExtractionRun"("sourceVersionId", "createdAt");
CREATE UNIQUE INDEX "KnowledgeExtractionRun_previousRunId_key" ON "KnowledgeExtractionRun"("previousRunId");
CREATE INDEX "KnowledgeExtractionRun_status_createdAt_idx" ON "KnowledgeExtractionRun"("status", "createdAt");

CREATE UNIQUE INDEX "KnowledgeSourcePage_extractionRunId_pageNumber_key" ON "KnowledgeSourcePage"("extractionRunId", "pageNumber");
CREATE UNIQUE INDEX "KnowledgeSourcePage_id_extractionRunId_key" ON "KnowledgeSourcePage"("id", "extractionRunId");
CREATE INDEX "KnowledgeSourcePage_status_createdAt_idx" ON "KnowledgeSourcePage"("status", "createdAt");

CREATE UNIQUE INDEX "KnowledgeSourceBlock_extractionRunId_globalSequence_key" ON "KnowledgeSourceBlock"("extractionRunId", "globalSequence");
CREATE UNIQUE INDEX "KnowledgeSourceBlock_sourcePageId_pageSequence_key" ON "KnowledgeSourceBlock"("sourcePageId", "pageSequence");
CREATE INDEX "KnowledgeSourceBlock_sourcePageId_blockType_idx" ON "KnowledgeSourceBlock"("sourcePageId", "blockType");
CREATE INDEX "KnowledgeSourceBlock_extractionRunId_blockType_idx" ON "KnowledgeSourceBlock"("extractionRunId", "blockType");
CREATE INDEX "KnowledgeSourceBlock_searchVector_idx" ON "KnowledgeSourceBlock" USING GIN ("searchVector");

CREATE UNIQUE INDEX "KnowledgeFragmentBlock_fragmentId_blockId_key" ON "KnowledgeFragmentBlock"("fragmentId", "blockId");
CREATE UNIQUE INDEX "KnowledgeFragmentBlock_fragmentId_sequence_key" ON "KnowledgeFragmentBlock"("fragmentId", "sequence");
CREATE INDEX "KnowledgeFragmentBlock_blockId_idx" ON "KnowledgeFragmentBlock"("blockId");

ALTER TABLE "KnowledgeExtractionRun" ADD CONSTRAINT "KnowledgeExtractionRun_sourceVersionId_fkey" FOREIGN KEY ("sourceVersionId") REFERENCES "KnowledgeSourceVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "KnowledgeExtractionRun" ADD CONSTRAINT "KnowledgeExtractionRun_previousRunId_fkey" FOREIGN KEY ("previousRunId") REFERENCES "KnowledgeExtractionRun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "KnowledgeSourcePage" ADD CONSTRAINT "KnowledgeSourcePage_extractionRunId_fkey" FOREIGN KEY ("extractionRunId") REFERENCES "KnowledgeExtractionRun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "KnowledgeSourceBlock" ADD CONSTRAINT "KnowledgeSourceBlock_page_run_fkey" FOREIGN KEY ("sourcePageId", "extractionRunId") REFERENCES "KnowledgeSourcePage"("id", "extractionRunId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "KnowledgeFragmentBlock" ADD CONSTRAINT "KnowledgeFragmentBlock_fragmentId_fkey" FOREIGN KEY ("fragmentId") REFERENCES "KnowledgeFragment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "KnowledgeFragmentBlock" ADD CONSTRAINT "KnowledgeFragmentBlock_blockId_fkey" FOREIGN KEY ("blockId") REFERENCES "KnowledgeSourceBlock"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE FUNCTION "knowledge_prevent_full_source_mutation"() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Knowledge full-source history is immutable';
END;
$$;

CREATE TRIGGER "KnowledgeExtractionRun_append_only" BEFORE UPDATE OR DELETE ON "KnowledgeExtractionRun" FOR EACH ROW EXECUTE FUNCTION "knowledge_prevent_full_source_mutation"();
CREATE TRIGGER "KnowledgeSourcePage_append_only" BEFORE UPDATE OR DELETE ON "KnowledgeSourcePage" FOR EACH ROW EXECUTE FUNCTION "knowledge_prevent_full_source_mutation"();
CREATE TRIGGER "KnowledgeSourceBlock_append_only" BEFORE UPDATE OR DELETE ON "KnowledgeSourceBlock" FOR EACH ROW EXECUTE FUNCTION "knowledge_prevent_full_source_mutation"();
CREATE TRIGGER "KnowledgeFragmentBlock_append_only" BEFORE UPDATE OR DELETE ON "KnowledgeFragmentBlock" FOR EACH ROW EXECUTE FUNCTION "knowledge_prevent_full_source_mutation"();
