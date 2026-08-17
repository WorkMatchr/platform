-- Add an immutable canonical identity layer without backfilling or changing existing sources.
CREATE TYPE "KnowledgeCanonicalIdentityType" AS ENUM ('URL', 'BIBLIOGRAPHIC');

CREATE TABLE "KnowledgeSourceCanonicalIdentity" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "sourceId" UUID NOT NULL,
  "identityType" "KnowledgeCanonicalIdentityType" NOT NULL,
  "canonicalFingerprint" VARCHAR(64) NOT NULL,
  "canonicalUrl" VARCHAR(1000),
  "bibliographicPublisher" VARCHAR(200),
  "bibliographicSeries" VARCHAR(200),
  "bibliographicTitle" VARCHAR(300),
  "bibliographicEdition" VARCHAR(120),
  "bibliographicYear" INTEGER,
  "bibliographicIsbn" VARCHAR(13),
  "bibliographicPublicationCode" VARCHAR(120),
  "supersedesIdentityId" UUID,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "KnowledgeSourceCanonicalIdentity_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "KnowledgeSourceCanonicalIdentity_fingerprint_check" CHECK ("canonicalFingerprint" ~ '^[0-9a-f]{64}$'),
  CONSTRAINT "KnowledgeSourceCanonicalIdentity_shape_check" CHECK (
    (
      "identityType" = 'URL' AND "canonicalUrl" ~ '^https://' AND
      num_nonnulls("bibliographicPublisher", "bibliographicSeries", "bibliographicTitle", "bibliographicEdition", "bibliographicYear", "bibliographicIsbn", "bibliographicPublicationCode") = 0
    ) OR (
      "identityType" = 'BIBLIOGRAPHIC' AND "canonicalUrl" IS NULL AND
      length(btrim("bibliographicPublisher")) > 0 AND
      length(btrim("bibliographicSeries")) > 0 AND
      length(btrim("bibliographicTitle")) > 0 AND
      length(btrim("bibliographicPublicationCode")) > 0 AND
      ("bibliographicEdition" IS NOT NULL OR "bibliographicYear" IS NOT NULL) AND
      ("bibliographicIsbn" IS NOT NULL OR "bibliographicEdition" IS NOT NULL) AND
      ("bibliographicYear" IS NULL OR "bibliographicYear" BETWEEN 1800 AND 9999) AND
      ("bibliographicIsbn" IS NULL OR "bibliographicIsbn" ~ '^(97[89][0-9]{10}|[0-9]{9}[0-9X])$')
    )
  )
);

CREATE UNIQUE INDEX "KnowledgeSourceCanonicalIdentity_sourceId_key" ON "KnowledgeSourceCanonicalIdentity"("sourceId");
CREATE UNIQUE INDEX "KnowledgeSourceCanonicalIdentity_canonicalFingerprint_key" ON "KnowledgeSourceCanonicalIdentity"("canonicalFingerprint");
CREATE UNIQUE INDEX "KnowledgeSourceCanonicalIdentity_supersedesIdentityId_key" ON "KnowledgeSourceCanonicalIdentity"("supersedesIdentityId");
CREATE UNIQUE INDEX "KnowledgeSourceCanonicalIdentity_bibliographicIsbn_key" ON "KnowledgeSourceCanonicalIdentity"("bibliographicIsbn") WHERE "bibliographicIsbn" IS NOT NULL;
CREATE INDEX "KnowledgeSourceCanonicalIdentity_type_publisher_series_idx" ON "KnowledgeSourceCanonicalIdentity"("identityType", "bibliographicPublisher", "bibliographicSeries");
CREATE INDEX "KnowledgeSourceCanonicalIdentity_publicationCode_year_idx" ON "KnowledgeSourceCanonicalIdentity"("bibliographicPublicationCode", "bibliographicYear");

ALTER TABLE "KnowledgeSourceCanonicalIdentity" ADD CONSTRAINT "KnowledgeSourceCanonicalIdentity_source_fkey"
  FOREIGN KEY ("sourceId") REFERENCES "KnowledgeSource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "KnowledgeSourceCanonicalIdentity" ADD CONSTRAINT "KnowledgeSourceCanonicalIdentity_supersedes_fkey"
  FOREIGN KEY ("supersedesIdentityId") REFERENCES "KnowledgeSourceCanonicalIdentity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE FUNCTION "knowledge_prevent_canonical_identity_mutation"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Knowledge canonical source identity is immutable'; END; $$;

CREATE FUNCTION "knowledge_assert_new_source_has_canonical_identity"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW."canonicalFamily" IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM "KnowledgeSourceCanonicalIdentity" identity WHERE identity."sourceId" = NEW."id"
  ) THEN RAISE EXCEPTION 'Canonical Knowledge source requires exactly one canonical identity'; END IF;
  RETURN NEW;
END; $$;

CREATE FUNCTION "knowledge_assert_source_still_matches_canonical_identity"() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE identity_record "KnowledgeSourceCanonicalIdentity"%ROWTYPE;
BEGIN
  SELECT * INTO identity_record FROM "KnowledgeSourceCanonicalIdentity" identity WHERE identity."sourceId" = NEW."id";
  IF NOT FOUND THEN RETURN NEW; END IF;
  IF identity_record."identityType" = 'URL' AND NEW."sourceUrl" IS DISTINCT FROM identity_record."canonicalUrl" THEN
    RAISE EXCEPTION 'URL identity must equal KnowledgeSource.sourceUrl';
  END IF;
  IF identity_record."identityType" = 'BIBLIOGRAPHIC' AND (
    NEW."sourceUrl" IS NOT NULL OR NEW."publisher" IS DISTINCT FROM identity_record."bibliographicPublisher" OR
    NEW."title" IS DISTINCT FROM identity_record."bibliographicTitle"
  ) THEN RAISE EXCEPTION 'Bibliographic identity must equal source publisher and title'; END IF;
  RETURN NEW;
END; $$;

CREATE FUNCTION "knowledge_assert_canonical_identity_matches_source"() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE source_record "KnowledgeSource"%ROWTYPE;
BEGIN
  SELECT * INTO source_record FROM "KnowledgeSource" WHERE "id" = NEW."sourceId";
  IF NOT FOUND OR source_record."canonicalFamily" IS NULL THEN
    RAISE EXCEPTION 'Canonical identity requires a canonical Knowledge source';
  END IF;
  IF NEW."identityType" = 'URL' AND source_record."sourceUrl" IS DISTINCT FROM NEW."canonicalUrl" THEN
    RAISE EXCEPTION 'URL identity must equal KnowledgeSource.sourceUrl';
  END IF;
  IF NEW."identityType" = 'BIBLIOGRAPHIC' AND source_record."sourceUrl" IS NOT NULL THEN
    RAISE EXCEPTION 'Bibliographic identity cannot have KnowledgeSource.sourceUrl';
  END IF;
  IF NEW."identityType" = 'BIBLIOGRAPHIC' AND (
    source_record."publisher" IS DISTINCT FROM NEW."bibliographicPublisher" OR
    source_record."title" IS DISTINCT FROM NEW."bibliographicTitle"
  ) THEN RAISE EXCEPTION 'Bibliographic identity must equal source publisher and title'; END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER "KnowledgeSourceCanonicalIdentity_append_only"
  BEFORE UPDATE OR DELETE ON "KnowledgeSourceCanonicalIdentity"
  FOR EACH ROW EXECUTE FUNCTION "knowledge_prevent_canonical_identity_mutation"();
CREATE CONSTRAINT TRIGGER "KnowledgeSource_requires_canonical_identity"
  AFTER INSERT ON "KnowledgeSource" DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION "knowledge_assert_new_source_has_canonical_identity"();
CREATE CONSTRAINT TRIGGER "KnowledgeSource_matches_existing_canonical_identity"
  AFTER UPDATE ON "KnowledgeSource" DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION "knowledge_assert_source_still_matches_canonical_identity"();
CREATE CONSTRAINT TRIGGER "KnowledgeSourceCanonicalIdentity_matches_source"
  AFTER INSERT ON "KnowledgeSourceCanonicalIdentity" DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION "knowledge_assert_canonical_identity_matches_source"();
