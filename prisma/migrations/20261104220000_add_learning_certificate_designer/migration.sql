-- Additive, no backfill. Original certificate and assessment protections remain intact.
CREATE TABLE "LearningCertificateDesign" (
 "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(), "familyId" UUID NOT NULL, "version" INTEGER NOT NULL CHECK ("version">0),
 "name" VARCHAR(160) NOT NULL, "state" VARCHAR(20) NOT NULL DEFAULT 'DRAFT' CHECK ("state" IN ('DRAFT','REVIEW','APPROVED','ACTIVE','ARCHIVED')),
 "revision" INTEGER NOT NULL DEFAULT 1 CHECK ("revision">0), "definition" JSONB NOT NULL, "checksum" VARCHAR(64) NOT NULL CHECK ("checksum" ~ '^[a-f0-9]{64}$'),
 "reviewedChecksum" VARCHAR(64), "createdBy" UUID NOT NULL REFERENCES "User"("id") ON DELETE RESTRICT,
 "reviewedBy" UUID REFERENCES "User"("id") ON DELETE RESTRICT, "reviewedAt" TIMESTAMPTZ(3), "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "LearningCertificateDesign_familyId_version_key" UNIQUE ("familyId","version"),
 CHECK ("state" NOT IN ('APPROVED','ACTIVE') OR ("reviewedBy" IS NOT NULL AND "reviewedAt" IS NOT NULL AND "reviewedChecksum" = "checksum"))
);
CREATE UNIQUE INDEX "LearningCertificateDesign_one_active" ON "LearningCertificateDesign"("familyId") WHERE "state"='ACTIVE';
CREATE TABLE "LearningCertificateDesignBinding" (
 "scope" VARCHAR(48) PRIMARY KEY, "designId" UUID NOT NULL REFERENCES "LearningCertificateDesign"("id") ON DELETE RESTRICT,
 "updatedAt" TIMESTAMPTZ(3) NOT NULL
);
ALTER TABLE "LearningCertificate" ADD COLUMN "designSnapshot" JSONB;

CREATE FUNCTION protect_certificate_design() RETURNS trigger LANGUAGE plpgsql AS $design$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Archive certificate designs instead of deleting'; END IF;
 IF OLD."state"<>'DRAFT' AND (OLD."definition" IS DISTINCT FROM NEW."definition" OR OLD."checksum"<>NEW."checksum" OR OLD."name"<>NEW."name") THEN RAISE EXCEPTION 'Reviewed designs are immutable'; END IF;
 IF OLD."id"<>NEW."id" OR OLD."familyId"<>NEW."familyId" OR OLD."version"<>NEW."version" OR OLD."createdBy"<>NEW."createdBy" OR OLD."createdAt"<>NEW."createdAt" THEN RAISE EXCEPTION 'Design identity immutable'; END IF;
 IF NEW."revision"<>OLD."revision"+1 THEN RAISE EXCEPTION 'Design revision required'; END IF;
 IF OLD."state"<>NEW."state" AND NOT (
 (OLD."state"='DRAFT' AND NEW."state"='REVIEW') OR (OLD."state"='REVIEW' AND NEW."state" IN ('DRAFT','APPROVED')) OR
 (OLD."state"='APPROVED' AND NEW."state" IN ('ACTIVE','ARCHIVED')) OR (OLD."state"='ACTIVE' AND NEW."state"='ARCHIVED')
 ) THEN RAISE EXCEPTION 'Invalid design lifecycle'; END IF;
 IF OLD."state" IN ('APPROVED','ACTIVE','ARCHIVED') AND (OLD."reviewedBy" IS DISTINCT FROM NEW."reviewedBy" OR OLD."reviewedAt" IS DISTINCT FROM NEW."reviewedAt" OR OLD."reviewedChecksum" IS DISTINCT FROM NEW."reviewedChecksum") THEN RAISE EXCEPTION 'Design review immutable'; END IF;
 RETURN NEW;
END $design$;
CREATE TRIGGER "LearningCertificateDesign_protect" BEFORE UPDATE OR DELETE ON "LearningCertificateDesign" FOR EACH ROW EXECUTE FUNCTION protect_certificate_design();

CREATE FUNCTION validate_certificate_design_binding() RETURNS trigger LANGUAGE plpgsql AS $binding$
BEGIN
 IF NEW."scope"<>'GLOBAL' AND NOT EXISTS (SELECT 1 FROM "LearningCourse" WHERE "id"::text=NEW."scope") THEN RAISE EXCEPTION 'Unknown course'; END IF;
 IF NOT EXISTS (SELECT 1 FROM "LearningCertificateDesign" WHERE "id"=NEW."designId" AND "state"='ACTIVE') THEN RAISE EXCEPTION 'Only active designs can be selected'; END IF;
 RETURN NEW;
END $binding$;
CREATE TRIGGER "LearningCertificateDesignBinding_validate" BEFORE INSERT OR UPDATE ON "LearningCertificateDesignBinding" FOR EACH ROW EXECUTE FUNCTION validate_certificate_design_binding();

CREATE FUNCTION protect_certificate_design_snapshot() RETURNS trigger LANGUAGE plpgsql AS $snapshot$
BEGIN
 IF TG_OP='UPDATE' AND OLD."designSnapshot" IS DISTINCT FROM NEW."designSnapshot" THEN RAISE EXCEPTION 'Certificate design snapshot immutable'; END IF;
 IF TG_OP='INSERT' AND NEW."designSnapshot" IS NOT NULL THEN
  IF NEW."templateVersion"<>'ACADEMY-DESIGN-1' OR NOT EXISTS (
   SELECT 1 FROM "LearningCertificateDesign" d WHERE d."id"::text=NEW."designSnapshot"->>'designId' AND d."state"='ACTIVE'
   AND d."checksum"=NEW."designSnapshot"->>'checksum' AND d."definition"=NEW."designSnapshot"->'definition'
  ) THEN RAISE EXCEPTION 'Certificate requires active reviewed design'; END IF;
 END IF;
 IF NEW."templateVersion"='ACADEMY-DESIGN-1' AND NEW."designSnapshot" IS NULL THEN RAISE EXCEPTION 'Missing design snapshot'; END IF;
 RETURN NEW;
END $snapshot$;
CREATE TRIGGER "LearningCertificate_design_snapshot" BEFORE INSERT OR UPDATE ON "LearningCertificate" FOR EACH ROW EXECUTE FUNCTION protect_certificate_design_snapshot();
