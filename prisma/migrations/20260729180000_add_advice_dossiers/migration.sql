CREATE TYPE "AdviceDossierSourceRoute" AS ENUM (
  'HELP_REQUEST',
  'KNOWLEDGE',
  'DIRECT_SPECIALIST_SEARCH'
);

CREATE TYPE "AdviceDossierStatus" AS ENUM (
  'DRAFT',
  'ADVICE_READY',
  'SPECIALIST_SEARCHED',
  'ASSIGNMENT_STARTED',
  'COMPLETED',
  'ARCHIVED'
);

CREATE TYPE "AdviceDossierEventType" AS ENUM (
  'DOSSIER_CREATED',
  'VERSION_CREATED',
  'PDF_DOWNLOADED',
  'STATUS_CHANGED'
);

CREATE TABLE "AdviceDossierCounter" (
  "year" INTEGER NOT NULL,
  "nextNumber" INTEGER NOT NULL,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AdviceDossierCounter_pkey" PRIMARY KEY ("year"),
  CONSTRAINT "AdviceDossierCounter_year_check" CHECK ("year" >= 2020),
  CONSTRAINT "AdviceDossierCounter_next_number_check" CHECK ("nextNumber" > 0)
);

CREATE TABLE "AdviceDossier" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "dossierCode" VARCHAR(32) NOT NULL,
  "ownerUserId" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "sourceRoute" "AdviceDossierSourceRoute" NOT NULL,
  "sourcePublicIntakeDraftId" UUID,
  "subject" VARCHAR(200) NOT NULL,
  "status" "AdviceDossierStatus" NOT NULL DEFAULT 'ADVICE_READY',
  "currentVersionNumber" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMPTZ(3),
  "archivedAt" TIMESTAMPTZ(3),
  CONSTRAINT "AdviceDossier_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AdviceDossier_version_check" CHECK ("currentVersionNumber" > 0),
  CONSTRAINT "AdviceDossier_help_request_source_check" CHECK (
    ("sourceRoute" = 'HELP_REQUEST' AND "sourcePublicIntakeDraftId" IS NOT NULL)
    OR ("sourceRoute" <> 'HELP_REQUEST' AND "sourcePublicIntakeDraftId" IS NULL)
  ),
  CONSTRAINT "AdviceDossier_archived_status_check" CHECK (
    ("status" = 'ARCHIVED' AND "archivedAt" IS NOT NULL)
    OR ("status" <> 'ARCHIVED' AND "archivedAt" IS NULL)
  )
);

CREATE TABLE "AdviceDossierVersion" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "adviceDossierId" UUID NOT NULL,
  "versionNumber" INTEGER NOT NULL,
  "sourcePublicIntakeDraftId" UUID,
  "sourceDraftVersion" INTEGER,
  "originalHelpRequest" TEXT NOT NULL,
  "situationSummary" TEXT NOT NULL,
  "subject" VARCHAR(200) NOT NULL,
  "adviceTitle" VARCHAR(300) NOT NULL,
  "adviceBody" TEXT NOT NULL,
  "adviceReasons" JSONB NOT NULL,
  "selfActions" JSONB NOT NULL,
  "primaryProfessionalRequirementSnapshot" JSONB,
  "additionalProfessionalRequirementsSnapshot" JSONB NOT NULL,
  "knowledgeReferencesSnapshot" JSONB NOT NULL,
  "sourceReferencesSnapshot" JSONB NOT NULL,
  "uncertaintiesSnapshot" JSONB NOT NULL,
  "disclaimer" TEXT NOT NULL,
  "outcomeSpecificity" VARCHAR(50) NOT NULL,
  "completionStatus" VARCHAR(50) NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AdviceDossierVersion_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AdviceDossierVersion_version_check" CHECK ("versionNumber" > 0),
  CONSTRAINT "AdviceDossierVersion_source_pair_check" CHECK (
    ("sourcePublicIntakeDraftId" IS NULL AND "sourceDraftVersion" IS NULL)
    OR ("sourcePublicIntakeDraftId" IS NOT NULL AND "sourceDraftVersion" IS NOT NULL AND "sourceDraftVersion" > 0)
  ),
  CONSTRAINT "AdviceDossierVersion_json_arrays_check" CHECK (
    jsonb_typeof("adviceReasons") = 'array'
    AND jsonb_typeof("selfActions") = 'array'
    AND jsonb_typeof("additionalProfessionalRequirementsSnapshot") = 'array'
    AND jsonb_typeof("knowledgeReferencesSnapshot") = 'array'
    AND jsonb_typeof("sourceReferencesSnapshot") = 'array'
    AND jsonb_typeof("uncertaintiesSnapshot") = 'array'
  )
);

CREATE TABLE "AdviceDossierEvent" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "adviceDossierId" UUID NOT NULL,
  "actorUserId" UUID NOT NULL,
  "type" "AdviceDossierEventType" NOT NULL,
  "versionNumber" INTEGER,
  "fromStatus" "AdviceDossierStatus",
  "toStatus" "AdviceDossierStatus",
  "idempotencyKey" VARCHAR(180) NOT NULL,
  "occurredAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AdviceDossierEvent_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AdviceDossierEvent_version_check" CHECK ("versionNumber" IS NULL OR "versionNumber" > 0),
  CONSTRAINT "AdviceDossierEvent_status_change_check" CHECK (
    ("type" = 'STATUS_CHANGED' AND "fromStatus" IS NOT NULL AND "toStatus" IS NOT NULL AND "fromStatus" <> "toStatus")
    OR ("type" <> 'STATUS_CHANGED' AND "fromStatus" IS NULL AND "toStatus" IS NULL)
  )
);

CREATE UNIQUE INDEX "AdviceDossier_dossierCode_key" ON "AdviceDossier"("dossierCode");
CREATE UNIQUE INDEX "AdviceDossier_sourcePublicIntakeDraftId_key" ON "AdviceDossier"("sourcePublicIntakeDraftId");
CREATE INDEX "AdviceDossier_ownerUserId_createdAt_idx" ON "AdviceDossier"("ownerUserId", "createdAt");
CREATE INDEX "AdviceDossier_organizationId_createdAt_idx" ON "AdviceDossier"("organizationId", "createdAt");
CREATE INDEX "AdviceDossier_status_createdAt_idx" ON "AdviceDossier"("status", "createdAt");
CREATE INDEX "AdviceDossier_createdAt_idx" ON "AdviceDossier"("createdAt");

CREATE UNIQUE INDEX "AdviceDossierVersion_adviceDossierId_versionNumber_key"
  ON "AdviceDossierVersion"("adviceDossierId", "versionNumber");
CREATE UNIQUE INDEX "AdviceDossierVersion_sourcePublicIntakeDraftId_sourceDraftVersion_key"
  ON "AdviceDossierVersion"("sourcePublicIntakeDraftId", "sourceDraftVersion");
CREATE INDEX "AdviceDossierVersion_adviceDossierId_createdAt_idx"
  ON "AdviceDossierVersion"("adviceDossierId", "createdAt");
CREATE INDEX "AdviceDossierVersion_sourcePublicIntakeDraftId_idx"
  ON "AdviceDossierVersion"("sourcePublicIntakeDraftId");

CREATE UNIQUE INDEX "AdviceDossierEvent_idempotencyKey_key" ON "AdviceDossierEvent"("idempotencyKey");
CREATE INDEX "AdviceDossierEvent_adviceDossierId_occurredAt_idx"
  ON "AdviceDossierEvent"("adviceDossierId", "occurredAt");
CREATE INDEX "AdviceDossierEvent_actorUserId_occurredAt_idx"
  ON "AdviceDossierEvent"("actorUserId", "occurredAt");
CREATE INDEX "AdviceDossierEvent_type_occurredAt_idx"
  ON "AdviceDossierEvent"("type", "occurredAt");

ALTER TABLE "AdviceDossier"
  ADD CONSTRAINT "AdviceDossier_ownerUserId_fkey"
  FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AdviceDossier"
  ADD CONSTRAINT "AdviceDossier_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AdviceDossier"
  ADD CONSTRAINT "AdviceDossier_sourcePublicIntakeDraftId_fkey"
  FOREIGN KEY ("sourcePublicIntakeDraftId") REFERENCES "PublicIntakeDraft"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AdviceDossierVersion"
  ADD CONSTRAINT "AdviceDossierVersion_adviceDossierId_fkey"
  FOREIGN KEY ("adviceDossierId") REFERENCES "AdviceDossier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AdviceDossierVersion"
  ADD CONSTRAINT "AdviceDossierVersion_sourcePublicIntakeDraftId_fkey"
  FOREIGN KEY ("sourcePublicIntakeDraftId") REFERENCES "PublicIntakeDraft"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AdviceDossierEvent"
  ADD CONSTRAINT "AdviceDossierEvent_adviceDossierId_fkey"
  FOREIGN KEY ("adviceDossierId") REFERENCES "AdviceDossier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AdviceDossierEvent"
  ADD CONSTRAINT "AdviceDossierEvent_actorUserId_fkey"
  FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE FUNCTION workmatchr_reject_advice_dossier_history_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION '% is immutable', TG_TABLE_NAME;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "AdviceDossierVersion_immutable"
BEFORE UPDATE OR DELETE ON "AdviceDossierVersion"
FOR EACH ROW EXECUTE FUNCTION workmatchr_reject_advice_dossier_history_mutation();

CREATE TRIGGER "AdviceDossierEvent_immutable"
BEFORE UPDATE OR DELETE ON "AdviceDossierEvent"
FOR EACH ROW EXECUTE FUNCTION workmatchr_reject_advice_dossier_history_mutation();
