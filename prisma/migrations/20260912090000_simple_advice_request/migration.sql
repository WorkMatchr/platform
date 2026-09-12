-- Additive user-authored intake snapshot on the existing immutable dossier version.
ALTER TABLE "AdviceDossierVersion" ADD COLUMN "simpleRequestSnapshot" JSONB;
ALTER TABLE "AdviceDossierVersion" ADD CONSTRAINT "AdviceDossierVersion_simple_request_object" CHECK ("simpleRequestSnapshot" IS NULL OR jsonb_typeof("simpleRequestSnapshot") = 'object');
-- A topic-only request intentionally makes no expertise claim.
ALTER TABLE "Request" ALTER COLUMN "primaryExpertise" DROP NOT NULL;
ALTER TYPE "RequestRequestedStart" ADD VALUE 'WITHIN_TWO_WEEKS';
ALTER TYPE "RequestRequestedStart" ADD VALUE 'LATER';
ALTER TYPE "RequestRequestedStart" ADD VALUE 'SPECIFIC_DATE';
ALTER TYPE "AdviceDossierSourceRoute" ADD VALUE 'SIMPLE_ADVICE';
