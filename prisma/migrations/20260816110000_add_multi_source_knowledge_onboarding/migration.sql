-- Add immutable canonical/artifact/scope metadata without changing existing Knowledge records.
CREATE TYPE "KnowledgeCanonicalSourceFamily" AS ENUM ('LEGISLATION','LABOUR_INSPECTORATE','GOVERNMENT_GUIDANCE','PGS','AI_SHEET','ARBOCATALOGUE','TNO','SER','RIVM','STANDARD','INTERNATIONAL_GUIDANCE');
CREATE TYPE "KnowledgeSourceAuthorityStatus" AS ENUM ('OFFICIAL_PRIMARY','OFFICIAL_GUIDANCE','AUTHORIZED_PUBLICATION','PROFESSIONAL_REFERENCE','UNKNOWN');
CREATE TYPE "KnowledgeSourceArtifactType" AS ENUM ('OFFICIAL_DOWNLOAD','LOCAL_SNAPSHOT','BROWSER_RENDERED_SNAPSHOT','LEGAL_TEXT_SNAPSHOT');
CREATE TYPE "KnowledgeScopeEffect" AS ENUM ('APPLIES','CONDITIONAL','EXCLUDES');
ALTER TYPE "KnowledgeSourceFormat" ADD VALUE 'HTML';
ALTER TYPE "KnowledgeSourceFormat" ADD VALUE 'TEXT';

ALTER TABLE "KnowledgeSource" ADD COLUMN "canonicalFamily" "KnowledgeCanonicalSourceFamily";
ALTER TABLE "KnowledgeSource" ADD COLUMN "authorityStatus" "KnowledgeSourceAuthorityStatus" NOT NULL DEFAULT 'UNKNOWN';

CREATE TABLE "KnowledgeSourceArtifact" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "sourceVersionId" UUID NOT NULL,
  "artifactType" "KnowledgeSourceArtifactType" NOT NULL, "mediaType" VARCHAR(120) NOT NULL,
  "locator" VARCHAR(1000) NOT NULL, "checksum" VARCHAR(64) NOT NULL,
  "retrievedAt" TIMESTAMPTZ(3) NOT NULL, "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "KnowledgeSourceArtifact_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "KnowledgeSourceArtifact_checksum_check" CHECK ("checksum" ~ '^[0-9a-f]{64}$'),
  CONSTRAINT "KnowledgeSourceArtifact_fields_check" CHECK (length(btrim("mediaType")) > 0 AND length(btrim("locator")) > 0)
);

CREATE TABLE "KnowledgeSourceApplicability" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "sourceId" UUID, "sourceVersionId" UUID, "sourceBlockId" UUID,
  "jurisdiction" VARCHAR(40) NOT NULL, "scopeCode" VARCHAR(120) NOT NULL, "effect" "KnowledgeScopeEffect" NOT NULL,
  "rationale" VARCHAR(1000) NOT NULL, "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "KnowledgeSourceApplicability_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "KnowledgeSourceApplicability_exactly_one_parent_check" CHECK (num_nonnulls("sourceId","sourceVersionId","sourceBlockId") = 1),
  CONSTRAINT "KnowledgeSourceApplicability_fields_check" CHECK (length(btrim("jurisdiction")) >= 2 AND length(btrim("scopeCode")) > 0 AND length(btrim("rationale")) > 0)
);

CREATE INDEX "KnowledgeSource_canonicalFamily_authorityStatus_idx" ON "KnowledgeSource"("canonicalFamily","authorityStatus");
CREATE UNIQUE INDEX "KnowledgeSourceArtifact_version_type_checksum_key" ON "KnowledgeSourceArtifact"("sourceVersionId","artifactType","checksum");
CREATE INDEX "KnowledgeSourceArtifact_version_retrieved_idx" ON "KnowledgeSourceArtifact"("sourceVersionId","retrievedAt");
CREATE UNIQUE INDEX "KnowledgeSourceApplicability_source_key" ON "KnowledgeSourceApplicability"("sourceId","jurisdiction","scopeCode","effect");
CREATE UNIQUE INDEX "KnowledgeSourceApplicability_version_key" ON "KnowledgeSourceApplicability"("sourceVersionId","jurisdiction","scopeCode","effect");
CREATE UNIQUE INDEX "KnowledgeSourceApplicability_block_key" ON "KnowledgeSourceApplicability"("sourceBlockId","jurisdiction","scopeCode","effect");
CREATE INDEX "KnowledgeSourceApplicability_scope_idx" ON "KnowledgeSourceApplicability"("jurisdiction","scopeCode","effect");

ALTER TABLE "KnowledgeSourceArtifact" ADD CONSTRAINT "KnowledgeSourceArtifact_version_fkey" FOREIGN KEY ("sourceVersionId") REFERENCES "KnowledgeSourceVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "KnowledgeSourceApplicability" ADD CONSTRAINT "KnowledgeSourceApplicability_source_fkey" FOREIGN KEY ("sourceId") REFERENCES "KnowledgeSource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "KnowledgeSourceApplicability" ADD CONSTRAINT "KnowledgeSourceApplicability_version_fkey" FOREIGN KEY ("sourceVersionId") REFERENCES "KnowledgeSourceVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "KnowledgeSourceApplicability" ADD CONSTRAINT "KnowledgeSourceApplicability_block_fkey" FOREIGN KEY ("sourceBlockId") REFERENCES "KnowledgeSourceBlock"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE FUNCTION "knowledge_prevent_multi_source_metadata_mutation"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Knowledge multi-source metadata is immutable'; END; $$;
CREATE FUNCTION "knowledge_protect_canonical_source_identity"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD."canonicalFamily" IS NOT NULL AND (
    NEW."code" IS DISTINCT FROM OLD."code" OR NEW."publisher" IS DISTINCT FROM OLD."publisher" OR
    NEW."sourceUrl" IS DISTINCT FROM OLD."sourceUrl" OR NEW."jurisdiction" IS DISTINCT FROM OLD."jurisdiction" OR
    NEW."canonicalFamily" IS DISTINCT FROM OLD."canonicalFamily" OR NEW."authorityStatus" IS DISTINCT FROM OLD."authorityStatus" OR
    NEW."sourceFamily" IS DISTINCT FROM OLD."sourceFamily" OR NEW."independenceGroup" IS DISTINCT FROM OLD."independenceGroup"
  ) THEN RAISE EXCEPTION 'Canonical Knowledge source identity is immutable'; END IF;
  RETURN NEW;
END; $$;
CREATE FUNCTION "knowledge_assert_pgs_scope"("checkedSourceId" UUID) RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  "checkedFamily" "KnowledgeCanonicalSourceFamily";
  "checkedJurisdiction" VARCHAR(40);
BEGIN
  SELECT "canonicalFamily", "jurisdiction"
    INTO "checkedFamily", "checkedJurisdiction"
    FROM "KnowledgeSource" WHERE "id" = "checkedSourceId";
  IF NOT FOUND OR "checkedFamily" IS DISTINCT FROM 'PGS' THEN RETURN; END IF;
  IF "checkedJurisdiction" IS DISTINCT FROM 'NL' THEN
    RAISE EXCEPTION 'Canonical PGS source requires jurisdiction NL';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM "KnowledgeSourceApplicability" a
    WHERE (a."sourceId" = "checkedSourceId" OR a."sourceVersionId" IN (
      SELECT v."id" FROM "KnowledgeSourceVersion" v WHERE v."sourceId" = "checkedSourceId"
    )) AND a."jurisdiction" = 'NL' AND a."scopeCode" = 'SEVESO' AND a."effect" = 'CONDITIONAL'
  ) THEN RAISE EXCEPTION 'Canonical PGS source requires NL / SEVESO / CONDITIONAL applicability'; END IF;
  IF EXISTS (
    SELECT 1 FROM "KnowledgeSourceApplicability" a
    WHERE (
      a."sourceId" = "checkedSourceId" OR
      a."sourceVersionId" IN (SELECT v."id" FROM "KnowledgeSourceVersion" v WHERE v."sourceId" = "checkedSourceId") OR
      a."sourceBlockId" IN (
        SELECT b."id" FROM "KnowledgeSourceBlock" b
        JOIN "KnowledgeSourcePage" p ON p."id" = b."sourcePageId"
        JOIN "KnowledgeExtractionRun" r ON r."id" = p."extractionRunId"
        JOIN "KnowledgeSourceVersion" v ON v."id" = r."sourceVersionId"
        WHERE v."sourceId" = "checkedSourceId"
      )
    ) AND (a."jurisdiction" <> 'NL' OR a."scopeCode" <> 'SEVESO' OR a."effect" <> 'CONDITIONAL')
  ) THEN RAISE EXCEPTION 'Canonical PGS source cannot have broader applicability'; END IF;
END; $$;
CREATE FUNCTION "knowledge_validate_pgs_source_scope"() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE "affectedSourceId" UUID;
BEGIN
  IF TG_TABLE_NAME = 'KnowledgeSource' THEN
    "affectedSourceId" := COALESCE(NEW."id", OLD."id");
  ELSE
    SELECT COALESCE(
      NEW."sourceId",
      (SELECT v."sourceId" FROM "KnowledgeSourceVersion" v WHERE v."id" = NEW."sourceVersionId"),
      (SELECT v."sourceId" FROM "KnowledgeSourceBlock" b
       JOIN "KnowledgeSourcePage" p ON p."id" = b."sourcePageId"
       JOIN "KnowledgeExtractionRun" r ON r."id" = p."extractionRunId"
       JOIN "KnowledgeSourceVersion" v ON v."id" = r."sourceVersionId"
       WHERE b."id" = NEW."sourceBlockId")
    ) INTO "affectedSourceId";
  END IF;
  PERFORM "knowledge_assert_pgs_scope"("affectedSourceId");
  RETURN NEW;
END; $$;
CREATE TRIGGER "KnowledgeSource_canonical_identity_immutable" BEFORE UPDATE ON "KnowledgeSource" FOR EACH ROW EXECUTE FUNCTION "knowledge_protect_canonical_source_identity"();
CREATE TRIGGER "KnowledgeSourceArtifact_append_only" BEFORE UPDATE OR DELETE ON "KnowledgeSourceArtifact" FOR EACH ROW EXECUTE FUNCTION "knowledge_prevent_multi_source_metadata_mutation"();
CREATE TRIGGER "KnowledgeSourceApplicability_append_only" BEFORE UPDATE OR DELETE ON "KnowledgeSourceApplicability" FOR EACH ROW EXECUTE FUNCTION "knowledge_prevent_multi_source_metadata_mutation"();
CREATE CONSTRAINT TRIGGER "KnowledgeSource_pgs_scope_required" AFTER INSERT OR UPDATE ON "KnowledgeSource" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION "knowledge_validate_pgs_source_scope"();
CREATE CONSTRAINT TRIGGER "KnowledgeSourceApplicability_pgs_scope_required" AFTER INSERT ON "KnowledgeSourceApplicability" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION "knowledge_validate_pgs_source_scope"();
