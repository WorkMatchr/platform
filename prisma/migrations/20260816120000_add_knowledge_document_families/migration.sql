-- Add an immutable, lightweight relation for source versions that form one document family.
ALTER TYPE "KnowledgeCanonicalSourceFamily" ADD VALUE 'NVAB';

CREATE TYPE "KnowledgeDocumentFamilyRole" AS ENUM (
  'PRIMARY_GUIDELINE', 'BACKGROUND_EVIDENCE', 'SUMMARY', 'CHECKLIST', 'APPENDIX', 'TOOL'
);

CREATE TABLE "KnowledgeDocumentFamily" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "code" VARCHAR(160) NOT NULL,
  "title" VARCHAR(300) NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "KnowledgeDocumentFamily_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "KnowledgeDocumentFamily_fields_check" CHECK (length(btrim("code")) > 0 AND length(btrim("title")) > 0)
);

CREATE TABLE "KnowledgeDocumentFamilyMember" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "documentFamilyId" UUID NOT NULL,
  "sourceVersionId" UUID NOT NULL,
  "role" "KnowledgeDocumentFamilyRole" NOT NULL,
  "sequence" INTEGER NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "KnowledgeDocumentFamilyMember_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "KnowledgeDocumentFamilyMember_sequence_check" CHECK ("sequence" > 0)
);

CREATE UNIQUE INDEX "KnowledgeDocumentFamily_code_key" ON "KnowledgeDocumentFamily"("code");
CREATE UNIQUE INDEX "KnowledgeDocumentFamilyMember_family_version_key" ON "KnowledgeDocumentFamilyMember"("documentFamilyId", "sourceVersionId");
CREATE UNIQUE INDEX "KnowledgeDocumentFamilyMember_family_sequence_key" ON "KnowledgeDocumentFamilyMember"("documentFamilyId", "sequence");
CREATE INDEX "KnowledgeDocumentFamilyMember_version_role_idx" ON "KnowledgeDocumentFamilyMember"("sourceVersionId", "role");

ALTER TABLE "KnowledgeDocumentFamilyMember" ADD CONSTRAINT "KnowledgeDocumentFamilyMember_family_fkey" FOREIGN KEY ("documentFamilyId") REFERENCES "KnowledgeDocumentFamily"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "KnowledgeDocumentFamilyMember" ADD CONSTRAINT "KnowledgeDocumentFamilyMember_version_fkey" FOREIGN KEY ("sourceVersionId") REFERENCES "KnowledgeSourceVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE FUNCTION "knowledge_prevent_document_family_mutation"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Knowledge document families are immutable'; END; $$;
CREATE TRIGGER "KnowledgeDocumentFamily_append_only" BEFORE UPDATE OR DELETE ON "KnowledgeDocumentFamily" FOR EACH ROW EXECUTE FUNCTION "knowledge_prevent_document_family_mutation"();
CREATE TRIGGER "KnowledgeDocumentFamilyMember_append_only" BEFORE UPDATE OR DELETE ON "KnowledgeDocumentFamilyMember" FOR EACH ROW EXECUTE FUNCTION "knowledge_prevent_document_family_mutation"();
