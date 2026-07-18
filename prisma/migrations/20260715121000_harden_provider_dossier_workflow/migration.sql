-- Databasebrede workflowuniciteit; terminale submissions tellen niet als actief.
CREATE UNIQUE INDEX "ProviderDossierSubmission_one_active_per_provider"
ON "ProviderDossierSubmission" ("providerProfileId")
WHERE "status" IN ('SUBMITTED', 'UNDER_REVIEW', 'ADDITIONAL_INFORMATION_REQUIRED');

CREATE UNIQUE INDEX "ProviderDossierReviewCase_one_open_per_provider"
ON "ProviderDossierReviewCase" ("providerProfileId") WHERE "status" = 'OPEN';

ALTER TABLE "ProviderDossierCandidate"
  ADD CONSTRAINT "ProviderDossierCandidate_positive_versions" CHECK ("candidateVersion" > 0 AND "sourceProfileVersion" > 0),
  ADD CONSTRAINT "ProviderDossierCandidate_sha256_format" CHECK ("sha256" ~ '^[0-9a-f]{64}$');
ALTER TABLE "ProviderProfessionalIdentityRevision"
  ADD CONSTRAINT "ProviderProfessionalIdentityRevision_valid" CHECK ("version" > 0 AND char_length(btrim("displayName")) >= 2 AND char_length(btrim("functionalRole")) >= 2);
ALTER TABLE "ProviderDossierSubmission"
  ADD CONSTRAINT "ProviderDossierSubmission_positive_version" CHECK ("version" > 0),
  ADD CONSTRAINT "ProviderDossierSubmission_idempotency_not_blank" CHECK (char_length(btrim("idempotencyKey")) > 0);
ALTER TABLE "ProviderDossierFinding"
  ADD CONSTRAINT "ProviderDossierFinding_provider_message_length" CHECK (char_length(btrim("providerMessage")) BETWEEN 10 AND 1000),
  ADD CONSTRAINT "ProviderDossierFinding_reason_not_blank" CHECK (char_length(btrim("reasonCode")) > 0);
ALTER TABLE "ProviderDossierFindingResolution"
  ADD CONSTRAINT "ProviderDossierFindingResolution_valid" CHECK ("version" > 0 AND char_length(btrim("response")) BETWEEN 10 AND 1000);

CREATE OR REPLACE FUNCTION workmatchr_reject_provider_dossier_mutation()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Immutable providerdossierhistorie mag niet worden gewijzigd';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "immutable_provider_dossier_candidate" BEFORE UPDATE OR DELETE ON "ProviderDossierCandidate" FOR EACH ROW EXECUTE FUNCTION workmatchr_reject_provider_dossier_mutation();
CREATE TRIGGER "immutable_provider_dossier_candidate_evidence" BEFORE UPDATE OR DELETE ON "ProviderDossierCandidateEvidence" FOR EACH ROW EXECUTE FUNCTION workmatchr_reject_provider_dossier_mutation();
CREATE TRIGGER "immutable_provider_dossier_history" BEFORE UPDATE OR DELETE ON "ProviderDossierSubmissionHistory" FOR EACH ROW EXECUTE FUNCTION workmatchr_reject_provider_dossier_mutation();
CREATE TRIGGER "immutable_provider_dossier_finding" BEFORE UPDATE OR DELETE ON "ProviderDossierFinding" FOR EACH ROW EXECUTE FUNCTION workmatchr_reject_provider_dossier_mutation();
CREATE TRIGGER "immutable_provider_dossier_resolution" BEFORE UPDATE OR DELETE ON "ProviderDossierFindingResolution" FOR EACH ROW EXECUTE FUNCTION workmatchr_reject_provider_dossier_mutation();
CREATE TRIGGER "immutable_provider_professional_identity_revision" BEFORE UPDATE OR DELETE ON "ProviderProfessionalIdentityRevision" FOR EACH ROW EXECUTE FUNCTION workmatchr_reject_provider_dossier_mutation();

CREATE OR REPLACE FUNCTION workmatchr_validate_provider_dossier_candidate()
RETURNS trigger AS $$
DECLARE submission_provider UUID;
BEGIN
  SELECT "providerProfileId" INTO submission_provider FROM "ProviderDossierSubmission" WHERE "id" = NEW."submissionId";
  IF submission_provider IS NULL OR submission_provider <> NEW."providerProfileId" THEN
    RAISE EXCEPTION 'Candidate en submission moeten tot dezelfde provider behoren';
  END IF;
  IF NEW."capacitySnapshotId" IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM "ProviderCapacitySnapshot" WHERE "id" = NEW."capacitySnapshotId" AND "providerProfileId" = NEW."providerProfileId"
  ) THEN RAISE EXCEPTION 'Capaciteitssnapshot behoort niet tot de provider'; END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER "validate_provider_dossier_candidate" BEFORE INSERT ON "ProviderDossierCandidate" FOR EACH ROW EXECUTE FUNCTION workmatchr_validate_provider_dossier_candidate();

CREATE OR REPLACE FUNCTION workmatchr_validate_provider_dossier_submission_update()
RETURNS trigger AS $$
BEGIN
  IF NEW."providerProfileId" <> OLD."providerProfileId" OR NEW."submittedByUserId" <> OLD."submittedByUserId" OR NEW."idempotencyKey" <> OLD."idempotencyKey" OR NEW."submittedAt" <> OLD."submittedAt" THEN
    RAISE EXCEPTION 'Vaste submissionvelden zijn immutable';
  END IF;
  IF NEW."status" = OLD."status" THEN
    IF NOT (OLD."currentCandidateId" IS NULL AND NEW."currentCandidateId" IS NOT NULL AND NEW."version" = OLD."version") THEN
      RAISE EXCEPTION 'Ongeldige submissionwijziging zonder statusovergang';
    END IF;
  ELSIF NOT (
    (OLD."status" = 'SUBMITTED' AND NEW."status" IN ('UNDER_REVIEW', 'WITHDRAWN')) OR
    (OLD."status" = 'UNDER_REVIEW' AND NEW."status" IN ('ADDITIONAL_INFORMATION_REQUIRED', 'APPROVED', 'REJECTED', 'WITHDRAWN')) OR
    (OLD."status" = 'ADDITIONAL_INFORMATION_REQUIRED' AND NEW."status" = 'SUBMITTED')
  ) THEN RAISE EXCEPTION 'Ongeldige provider submissionstatusovergang'; END IF;
  IF NEW."status" <> OLD."status" AND NEW."version" <> OLD."version" + 1 THEN
    RAISE EXCEPTION 'Statusovergang vereist exact één versieverhoging';
  END IF;
  IF NEW."status" = 'WITHDRAWN' AND NEW."closedAt" IS NULL THEN RAISE EXCEPTION 'Intrekking vereist sluitingsdatum'; END IF;
  IF NEW."currentCandidateId" IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM "ProviderDossierCandidate" WHERE "id" = NEW."currentCandidateId" AND "submissionId" = NEW."id" AND "providerProfileId" = NEW."providerProfileId"
  ) THEN RAISE EXCEPTION 'Actuele candidate behoort niet tot de submission'; END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER "validate_provider_dossier_submission_update" BEFORE UPDATE ON "ProviderDossierSubmission" FOR EACH ROW EXECUTE FUNCTION workmatchr_validate_provider_dossier_submission_update();
CREATE TRIGGER "protect_provider_dossier_submission_delete" BEFORE DELETE ON "ProviderDossierSubmission" FOR EACH ROW EXECUTE FUNCTION workmatchr_reject_provider_dossier_mutation();

CREATE OR REPLACE FUNCTION workmatchr_validate_provider_dossier_review_case()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NOT EXISTS (SELECT 1 FROM "ProviderDossierSubmission" s JOIN "ProviderDossierCandidate" c ON c."id" = NEW."candidateId" WHERE s."id" = NEW."submissionId" AND s."providerProfileId" = NEW."providerProfileId" AND c."submissionId" = s."id") THEN
      RAISE EXCEPTION 'Review case, submission en candidate zijn niet consistent';
    END IF;
    RETURN NEW;
  END IF;
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'Review case mag niet worden verwijderd'; END IF;
  IF OLD."status" <> 'OPEN' OR NEW."status" <> 'CLOSED' OR NEW."version" <> OLD."version" + 1 OR NEW."closedByUserId" IS NULL OR NEW."closedAt" IS NULL
    OR NEW."providerProfileId" <> OLD."providerProfileId" OR NEW."submissionId" <> OLD."submissionId" OR NEW."candidateId" <> OLD."candidateId"
    OR NEW."openedByUserId" <> OLD."openedByUserId" OR NEW."openedAt" <> OLD."openedAt" THEN
    RAISE EXCEPTION 'Alleen gecontroleerd sluiten van een review case is toegestaan';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER "validate_provider_dossier_review_case" BEFORE INSERT OR UPDATE OR DELETE ON "ProviderDossierReviewCase" FOR EACH ROW EXECUTE FUNCTION workmatchr_validate_provider_dossier_review_case();

CREATE OR REPLACE FUNCTION workmatchr_validate_provider_dossier_finding()
RETURNS trigger AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM "ProviderDossierReviewCase" WHERE "id" = NEW."reviewCaseId" AND "candidateId" = NEW."candidateId" AND "status" = 'OPEN') THEN
    RAISE EXCEPTION 'Finding vereist een open review case voor dezelfde candidate';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER "validate_provider_dossier_finding" BEFORE INSERT ON "ProviderDossierFinding" FOR EACH ROW EXECUTE FUNCTION workmatchr_validate_provider_dossier_finding();

CREATE OR REPLACE FUNCTION workmatchr_validate_capacity_confirmation()
RETURNS trigger AS $$
BEGIN
  IF NEW."confirmedByUserId" IS NULL THEN RAISE EXCEPTION 'Nieuwe capaciteitssnapshot vereist een bevestiger'; END IF;
  IF NEW."validUntil" <= NEW."confirmedAt" OR NEW."validUntil" > NEW."confirmedAt" + INTERVAL '30 days' THEN
    RAISE EXCEPTION 'Capaciteit mag maximaal 30 dagen geldig zijn';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER "validate_provider_capacity_confirmation" BEFORE INSERT ON "ProviderCapacitySnapshot" FOR EACH ROW EXECUTE FUNCTION workmatchr_validate_capacity_confirmation();

CREATE OR REPLACE FUNCTION workmatchr_validate_candidate_binding()
RETURNS trigger AS $$
BEGIN
  IF num_nonnulls(NEW."dossierCandidateId", NEW."dossierSubmissionId", NEW."dossierReviewCaseId") NOT IN (0, 3) THEN
    RAISE EXCEPTION 'Candidatebinding moet volledig of volledig afwezig zijn';
  END IF;
  IF NEW."dossierCandidateId" IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM "ProviderDossierCandidate" c JOIN "ProviderDossierReviewCase" r ON r."id" = NEW."dossierReviewCaseId"
    WHERE c."id" = NEW."dossierCandidateId" AND c."submissionId" = NEW."dossierSubmissionId" AND c."providerProfileId" = NEW."providerProfileId"
      AND r."candidateId" = c."id" AND r."submissionId" = c."submissionId"
  ) THEN RAISE EXCEPTION 'Candidatebinding behoort niet tot hetzelfde providerdossier'; END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER "validate_provider_verification_candidate_binding" BEFORE INSERT ON "ProviderVerificationReview" FOR EACH ROW EXECUTE FUNCTION workmatchr_validate_candidate_binding();
CREATE TRIGGER "validate_provider_qualification_candidate_binding" BEFORE INSERT ON "ProviderQualificationDecision" FOR EACH ROW EXECUTE FUNCTION workmatchr_validate_candidate_binding();
