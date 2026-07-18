ALTER TABLE "ProviderDossierFindingResolution" ADD COLUMN "candidateId" UUID;

CREATE INDEX "ProviderDossierFindingResolution_candidateId_idx"
ON "ProviderDossierFindingResolution"("candidateId");

ALTER TABLE "ProviderDossierFindingResolution"
ADD CONSTRAINT "ProviderDossierFindingResolution_candidateId_fkey"
FOREIGN KEY ("candidateId") REFERENCES "ProviderDossierCandidate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE OR REPLACE FUNCTION workmatchr_validate_provider_dossier_submission_update()
RETURNS trigger AS $$
BEGIN
  IF NEW."providerProfileId" <> OLD."providerProfileId" OR NEW."submittedByUserId" <> OLD."submittedByUserId" OR NEW."idempotencyKey" <> OLD."idempotencyKey" OR NEW."submittedAt" <> OLD."submittedAt" THEN
    RAISE EXCEPTION 'Vaste submissionvelden zijn immutable';
  END IF;
  IF NEW."status" = OLD."status" THEN
    IF NOT (OLD."currentCandidateId" IS NULL AND NEW."currentCandidateId" IS NOT NULL AND NEW."version" = OLD."version") THEN RAISE EXCEPTION 'Ongeldige submissionwijziging zonder statusovergang'; END IF;
  ELSIF NOT (
    (OLD."status" = 'SUBMITTED' AND NEW."status" IN ('UNDER_REVIEW', 'WITHDRAWN')) OR
    (OLD."status" = 'UNDER_REVIEW' AND NEW."status" IN ('ADDITIONAL_INFORMATION_REQUIRED', 'APPROVED', 'REJECTED', 'WITHDRAWN')) OR
    (OLD."status" = 'ADDITIONAL_INFORMATION_REQUIRED' AND NEW."status" IN ('SUBMITTED', 'WITHDRAWN'))
  ) THEN RAISE EXCEPTION 'Ongeldige provider submissionstatusovergang'; END IF;
  IF NEW."status" <> OLD."status" AND NEW."version" <> OLD."version" + 1 THEN RAISE EXCEPTION 'Statusovergang vereist exact één versieverhoging'; END IF;
  IF NEW."status" = 'WITHDRAWN' AND NEW."closedAt" IS NULL THEN RAISE EXCEPTION 'Intrekking vereist sluitingsdatum'; END IF;
  IF NEW."currentCandidateId" IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM "ProviderDossierCandidate" WHERE "id" = NEW."currentCandidateId" AND "submissionId" = NEW."id" AND "providerProfileId" = NEW."providerProfileId"
  ) THEN RAISE EXCEPTION 'Actuele candidate behoort niet tot de submission'; END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION workmatchr_validate_finding_resolution_candidate()
RETURNS trigger AS $$
BEGIN
  IF NEW."candidateId" IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM "ProviderDossierFinding" f
    JOIN "ProviderDossierReviewCase" r ON r."id" = f."reviewCaseId"
    JOIN "ProviderDossierCandidate" c ON c."id" = NEW."candidateId"
    WHERE f."id" = NEW."findingId" AND c."submissionId" = r."submissionId" AND c."candidateVersion" > 1
  ) THEN RAISE EXCEPTION 'Resolutioncandidate behoort niet tot dezelfde herindiening'; END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "validate_provider_dossier_resolution_candidate"
BEFORE INSERT ON "ProviderDossierFindingResolution"
FOR EACH ROW EXECUTE FUNCTION workmatchr_validate_finding_resolution_candidate();
