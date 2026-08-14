-- Harden immutable import-revision provenance without changing existing content.
ALTER TABLE "KnowledgeSourceVersion"
  ADD CONSTRAINT "KnowledgeSourceVersion_contentFingerprint_check"
  CHECK ("contentFingerprint" IS NULL OR "contentFingerprint" ~ '^[0-9a-f]{64}$');

CREATE TRIGGER "KnowledgeSourceVersion_append_only"
BEFORE UPDATE OR DELETE ON "KnowledgeSourceVersion"
FOR EACH ROW EXECUTE FUNCTION "knowledge_prevent_history_mutation"();
