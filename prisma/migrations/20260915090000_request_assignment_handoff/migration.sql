-- ADR-024 Expand only. No backfill, data rewrite, or unrelated schema drift repair.
BEGIN;

-- Canonical 20 bootstrap. Existing identities and legacy FK targets are never rewritten.
CREATE TEMP TABLE canonical_specialisms (code text PRIMARY KEY,label text NOT NULL,position integer NOT NULL) ON COMMIT DROP;
INSERT INTO canonical_specialisms VALUES
('hogere-veiligheidskundige','Hogere veiligheidskundige',0),
('middelbare-veiligheidskundige','Middelbare veiligheidskundige',1),
('arbeidshygienist','Arbeidshygiënist',2),
('arbeids-en-organisatiedeskundige','Arbeids- en organisatiedeskundige',3),
('bedrijfsarts','Bedrijfsarts',4),
('ergonoom','Ergonoom',5),
('machineveiligheid','Machineveiligheid',6),
('gevaarlijke-stoffen','Specialist gevaarlijke stoffen',7),
('explosieveiligheid','ATEX- en explosieveiligheidsdeskundige',8),
('incidentonderzoek','Incidentonderzoeker',9),
('brandveiligheid','Brandveiligheid',10),
('geluidsdeskundige','Geluidsdeskundige',11),
('stralingsdeskundige','Stralingsdeskundige',12),
('arbeidspsycholoog','Arbeidspsycholoog',13),
('vertrouwenspersoon','Vertrouwenspersoon',14),
('casemanager-verzuim','Casemanager verzuim',15),
('preventiemedewerker','Preventiemedewerker',16),
('bhv-deskundige','BHV-deskundige',17),
('arbodienst','Arbodienst',18),
('keuringsinstantie','Keuringsinstantie',19);
DO $$ DECLARE tid uuid; vid uuid;
BEGIN
 -- Known slugs must retain their meaning; equal labels on another slug are ambiguous.
 IF EXISTS (SELECT 1 FROM "Specialism" s JOIN canonical_specialisms c ON s.slug=c.code WHERE s.name<>c.label OR NOT s."isActive")
 OR EXISTS (SELECT 1 FROM "Specialism" s JOIN canonical_specialisms c ON lower(s.name)=lower(c.label) WHERE s.slug<>c.code) THEN
  RAISE EXCEPTION 'Canonical specialism identity collision: manual review required';
 END IF;
 IF EXISTS (SELECT 1 FROM "ProviderTaxonomy" WHERE (kind='SPECIALISM' AND code<>'SPECIALISM') OR (code='SPECIALISM' AND kind<>'SPECIALISM')) THEN
  RAISE EXCEPTION 'Canonical taxonomy identity collision';
 END IF;
 INSERT INTO "Specialism" (id,slug,name,"isActive","createdAt","updatedAt")
 SELECT gen_random_uuid(),code,label,true,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP FROM canonical_specialisms
 ON CONFLICT (slug) DO NOTHING;
 INSERT INTO "ProviderTaxonomy" (id,kind,code,name) VALUES(gen_random_uuid(),'SPECIALISM','SPECIALISM','SPECIALISM') ON CONFLICT (kind) DO NOTHING;
 SELECT id INTO STRICT tid FROM "ProviderTaxonomy" WHERE kind='SPECIALISM';
 IF EXISTS (SELECT 1 FROM "ProviderTaxonomyVersion" WHERE "taxonomyId"=tid AND version>3) THEN RAISE EXCEPTION 'Unexpected future specialism taxonomy'; END IF;
 SELECT id INTO vid FROM "ProviderTaxonomyVersion" WHERE "taxonomyId"=tid AND version=3;
 IF vid IS NOT NULL THEN
  IF NOT EXISTS (SELECT 1 FROM "ProviderTaxonomyVersion" WHERE id=vid AND status='PUBLISHED' AND checksum='64b26d3b4ae173ac370d074607873ad3a22a1d6f3dcfea026080115fcb927ca7')
   OR (SELECT count(*) FROM "ProviderTaxonomyTerm" WHERE "versionId"=vid)<>20
   OR EXISTS (SELECT 1 FROM canonical_specialisms c WHERE NOT EXISTS (SELECT 1 FROM "ProviderTaxonomyTerm" t WHERE t."versionId"=vid AND t.code=c.code AND t.label=c.label AND t."sortOrder"=c.position AND t."isActive")) THEN
   RAISE EXCEPTION 'Existing canonical v3 differs: immutable taxonomy will not be rewritten';
  END IF;
 ELSE
  UPDATE "ProviderTaxonomyVersion" SET status='RETIRED',"retiredAt"=COALESCE("retiredAt",CURRENT_TIMESTAMP) WHERE "taxonomyId"=tid AND status='PUBLISHED';
  vid:=gen_random_uuid();
  INSERT INTO "ProviderTaxonomyVersion" (id,"taxonomyId",version,status,checksum,"publishedAt") VALUES(vid,tid,3,'PUBLISHED','64b26d3b4ae173ac370d074607873ad3a22a1d6f3dcfea026080115fcb927ca7',CURRENT_TIMESTAMP);
  INSERT INTO "ProviderTaxonomyTerm" (id,"versionId",code,label,"sortOrder","isActive") SELECT gen_random_uuid(),vid,code,label,position,true FROM canonical_specialisms;
 END IF;
 IF EXISTS (SELECT 1 FROM "ProviderSpecialismTaxonomyMap" m JOIN "Specialism" s ON s.id=m."specialismId" JOIN canonical_specialisms c ON c.code=s.slug JOIN "ProviderTaxonomyTerm" t ON t.id=m."termId" WHERE t.code<>c.code)
 OR EXISTS (SELECT 1 FROM "ProviderSpecialismTaxonomyMap" m JOIN "ProviderTaxonomyTerm" t ON t.id=m."termId" JOIN "Specialism" s ON s.id=m."specialismId" WHERE t."versionId"=vid AND t.code<>s.slug) THEN
  RAISE EXCEPTION 'Canonical mapping collision';
 END IF;
 INSERT INTO "ProviderSpecialismTaxonomyMap" ("termId","specialismId") SELECT t.id,s.id FROM "ProviderTaxonomyTerm" t JOIN "Specialism" s ON s.slug=t.code WHERE t."versionId"=vid
 ON CONFLICT ("specialismId") DO UPDATE SET "termId"=EXCLUDED."termId" WHERE "ProviderSpecialismTaxonomyMap"."termId"<>EXCLUDED."termId";
 IF (SELECT count(*) FROM "ProviderSpecialismTaxonomyMap" m JOIN "ProviderTaxonomyTerm" t ON t.id=m."termId" WHERE t."versionId"=vid)<>20 THEN RAISE EXCEPTION 'Incomplete canonical mappings'; END IF;
END $$;
-- END CANONICAL BOOTSTRAP


ALTER TABLE "Assignment" ADD COLUMN "requestId" UUID;
ALTER TABLE "Request" ADD COLUMN "adviceDossierVersionId" UUID;

CREATE UNIQUE INDEX "AdviceDossierVersion_id_adviceDossierId_key" ON "AdviceDossierVersion"("id", "adviceDossierId");
CREATE UNIQUE INDEX "Request_id_organizationId_key" ON "Request"("id", "organizationId");
CREATE UNIQUE INDEX "Request_id_adviceDossierVersionId_key" ON "Request"("id", "adviceDossierVersionId");
CREATE INDEX "Request_adviceDossierVersionId_adviceDossierId_idx" ON "Request"("adviceDossierVersionId", "adviceDossierId");
CREATE UNIQUE INDEX "Assignment_requestId_key" ON "Assignment"("requestId");
CREATE UNIQUE INDEX "Assignment_id_requestId_key" ON "Assignment"("id", "requestId");
CREATE UNIQUE INDEX "Assignment_requestId_clientOrganizationId_key" ON "Assignment"("requestId", "clientOrganizationId");

ALTER TABLE "Request" ADD CONSTRAINT "Request_adviceDossierVersionId_adviceDossierId_fkey"
  FOREIGN KEY ("adviceDossierVersionId", "adviceDossierId") REFERENCES "AdviceDossierVersion"("id", "adviceDossierId") ON DELETE RESTRICT ON UPDATE RESTRICT;
-- Together with the existing Request_tenant_organization_check, this FK also
-- protects against parent-side changes and concurrent tenant changes.
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_requestId_clientOrganizationId_fkey"
  FOREIGN KEY ("requestId", "clientOrganizationId") REFERENCES "Request"("id", "organizationId") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_exclusive_source_check"
  CHECK (num_nonnulls("intakeId", "requestId") <= 1);

CREATE TABLE "RequestAssignmentHandoff" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "requestId" UUID NOT NULL,
  "assignmentId" UUID NOT NULL,
  "adviceDossierVersionId" UUID NOT NULL,
  "createdByUserId" UUID NOT NULL,
  "snapshot" JSONB NOT NULL,
  "snapshotChecksum" CHAR(64) NOT NULL,
  "schemaVersion" INTEGER NOT NULL,
  "idempotencyKey" VARCHAR(180) NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RequestAssignmentHandoff_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "RequestAssignmentHandoff_checksum_check" CHECK ("snapshotChecksum" ~ '^[0-9a-f]{64}$'),
  CONSTRAINT "RequestAssignmentHandoff_schema_version_check" CHECK ("schemaVersion" > 0)
);
CREATE UNIQUE INDEX "RequestAssignmentHandoff_requestId_key" ON "RequestAssignmentHandoff"("requestId");
CREATE UNIQUE INDEX "RequestAssignmentHandoff_assignmentId_key" ON "RequestAssignmentHandoff"("assignmentId");
CREATE UNIQUE INDEX "RequestAssignmentHandoff_idempotencyKey_key" ON "RequestAssignmentHandoff"("idempotencyKey");
CREATE UNIQUE INDEX "RequestAssignmentHandoff_requestId_adviceDossierVersionId_key" ON "RequestAssignmentHandoff"("requestId", "adviceDossierVersionId");
CREATE UNIQUE INDEX "RequestAssignmentHandoff_assignmentId_requestId_key" ON "RequestAssignmentHandoff"("assignmentId", "requestId");
CREATE INDEX "RequestAssignmentHandoff_adviceDossierVersionId_idx" ON "RequestAssignmentHandoff"("adviceDossierVersionId");
CREATE INDEX "RequestAssignmentHandoff_createdByUserId_createdAt_idx" ON "RequestAssignmentHandoff"("createdByUserId", "createdAt");
ALTER TABLE "RequestAssignmentHandoff" ADD CONSTRAINT "RequestAssignmentHandoff_requestId_adviceDossierVersionId_fkey"
  FOREIGN KEY ("requestId", "adviceDossierVersionId") REFERENCES "Request"("id", "adviceDossierVersionId") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "RequestAssignmentHandoff" ADD CONSTRAINT "RequestAssignmentHandoff_assignmentId_requestId_fkey"
  FOREIGN KEY ("assignmentId", "requestId") REFERENCES "Assignment"("id", "requestId") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "RequestAssignmentHandoff" ADD CONSTRAINT "RequestAssignmentHandoff_adviceDossierVersionId_fkey"
  FOREIGN KEY ("adviceDossierVersionId") REFERENCES "AdviceDossierVersion"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "RequestAssignmentHandoff" ADD CONSTRAINT "RequestAssignmentHandoff_createdByUserId_fkey"
  FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

CREATE FUNCTION "adr024_validate_assignment_request_tenant"() RETURNS trigger AS $$
BEGIN
  IF NEW."requestId" IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM "Request" r WHERE r."id" = NEW."requestId"
      AND r."organizationId" = NEW."clientOrganizationId"
      AND r."tenantId" = NEW."clientOrganizationId"
  ) THEN
    RAISE EXCEPTION 'ADR024 assignment/request tenant mismatch' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE CONSTRAINT TRIGGER "Assignment_request_tenant_integrity"
AFTER INSERT OR UPDATE ON "Assignment"
FOR EACH ROW EXECUTE FUNCTION "adr024_validate_assignment_request_tenant"();

-- Supplement existing immutability functions; never replace their protections.
CREATE FUNCTION "adr024_protect_request_version"() RETURNS trigger AS $$
BEGIN
  IF (OLD."publishedAt" IS NOT NULL OR OLD."status" = 'PUBLISHED')
    AND OLD."adviceDossierVersionId" IS NOT NULL
    AND NEW."adviceDossierVersionId" IS DISTINCT FROM OLD."adviceDossierVersionId" THEN
    RAISE EXCEPTION 'ADR024 published Request version is immutable';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER "Request_advice_version_immutable"
BEFORE UPDATE ON "Request" FOR EACH ROW EXECUTE FUNCTION "adr024_protect_request_version"();

CREATE FUNCTION "adr024_protect_assignment_sources"() RETURNS trigger AS $$
BEGIN
  IF OLD."publishedAt" IS NOT NULL AND (
    NEW."requestId" IS DISTINCT FROM OLD."requestId"
    OR NEW."intakeId" IS DISTINCT FROM OLD."intakeId"
  ) THEN
    RAISE EXCEPTION 'ADR024 published Assignment sources are immutable';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER "Assignment_sources_immutable"
BEFORE UPDATE ON "Assignment" FOR EACH ROW EXECUTE FUNCTION "adr024_protect_assignment_sources"();

CREATE TRIGGER "RequestAssignmentHandoff_immutable"
BEFORE UPDATE OR DELETE ON "RequestAssignmentHandoff"
FOR EACH ROW EXECUTE FUNCTION "prevent_append_only_change"();

-- A recovery source binding cannot commit without its immutable handoff.
CREATE FUNCTION "adr024_require_handoff"() RETURNS trigger AS $$
BEGIN
  IF NEW."adviceDossierVersionId" IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM "RequestAssignmentHandoff" h WHERE h."requestId"=NEW."id"
      AND h."adviceDossierVersionId"=NEW."adviceDossierVersionId"
  ) THEN RAISE EXCEPTION 'Canonical Request requires its immutable handoff'; END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE CONSTRAINT TRIGGER "Request_handoff_complete"
AFTER INSERT OR UPDATE ON "Request" DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION "adr024_require_handoff"();

CREATE FUNCTION "adr024_require_assignment_handoff"() RETURNS trigger AS $$
BEGIN
 IF NEW."requestId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "RequestAssignmentHandoff" h WHERE h."assignmentId"=NEW."id" AND h."requestId"=NEW."requestId") THEN
  RAISE EXCEPTION 'Canonical Assignment requires its immutable handoff';
 END IF;
 RETURN NEW;
END; $$ LANGUAGE plpgsql;
CREATE CONSTRAINT TRIGGER "Assignment_handoff_complete" AFTER INSERT OR UPDATE ON "Assignment"
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION "adr024_require_assignment_handoff"();
-- New canonical cohorts cannot write the parallel legacy participation flow.
CREATE FUNCTION "adr024_block_parallel_request_participation"() RETURNS trigger AS $$
BEGIN
 IF EXISTS(SELECT 1 FROM "Request" WHERE "id"=NEW."requestId" AND "adviceDossierVersionId" IS NOT NULL) THEN
  RAISE EXCEPTION 'Canonical requests use Assignment participation';
 END IF;
 RETURN NEW;
END; $$ LANGUAGE plpgsql;
CREATE TRIGGER "RequestInterest_canonical_guard" BEFORE INSERT OR UPDATE ON "RequestInterest"
FOR EACH ROW EXECUTE FUNCTION "adr024_block_parallel_request_participation"();
CREATE TRIGGER "RequestOfferSlot_canonical_guard" BEFORE INSERT OR UPDATE ON "RequestOfferSlot"
FOR EACH ROW EXECUTE FUNCTION "adr024_block_parallel_request_participation"();

COMMIT;
