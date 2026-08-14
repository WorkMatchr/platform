-- Additive import-revision chain for immutable corrections of one source edition.
ALTER TYPE "KnowledgeAuditEventType" ADD VALUE 'IMPORT_CORRECTION_COMPLETED' AFTER 'IMPORT_COMPLETED';

ALTER TABLE "KnowledgeSourceVersion"
  ADD COLUMN "importRevision" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "contentFingerprint" VARCHAR(64),
  ADD COLUMN "supersedesVersionId" UUID;

DROP INDEX "KnowledgeSourceVersion_sourceId_versionLabel_key";

ALTER TABLE "KnowledgeSourceVersion"
  ADD CONSTRAINT "KnowledgeSourceVersion_importRevision_check" CHECK ("importRevision" > 0),
  ADD CONSTRAINT "KnowledgeSourceVersion_no_self_supersession_check" CHECK ("supersedesVersionId" IS NULL OR "supersedesVersionId" <> "id"),
  ADD CONSTRAINT "KnowledgeSourceVersion_supersedesVersionId_fkey"
    FOREIGN KEY ("supersedesVersionId") REFERENCES "KnowledgeSourceVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE UNIQUE INDEX "KnowledgeSourceVersion_sourceId_versionLabel_importRevision_key"
  ON "KnowledgeSourceVersion"("sourceId", "versionLabel", "importRevision");

-- One revision can have at most one direct successor. This prevents concurrent correction branches.
CREATE UNIQUE INDEX "KnowledgeSourceVersion_supersedesVersionId_key"
  ON "KnowledgeSourceVersion"("supersedesVersionId") WHERE "supersedesVersionId" IS NOT NULL;

CREATE INDEX "KnowledgeSourceVersion_sourceId_versionLabel_supersedesVersionId_idx"
  ON "KnowledgeSourceVersion"("sourceId", "versionLabel", "supersedesVersionId");
