CREATE TYPE "ProviderDossierSection" AS ENUM ('ORGANIZATION', 'CAPABILITIES', 'SECTOR_EXPERIENCE', 'WORK_AREA', 'CAPACITY', 'PROFESSIONALS', 'QUALIFICATIONS', 'INSURANCE', 'EVIDENCE', 'DECLARATIONS');
CREATE TYPE "ProviderDossierSubmissionStatus" AS ENUM ('SUBMITTED', 'UNDER_REVIEW', 'ADDITIONAL_INFORMATION_REQUIRED', 'APPROVED', 'REJECTED', 'EXPIRED', 'WITHDRAWN');
CREATE TYPE "ProviderDossierReviewCaseStatus" AS ENUM ('OPEN', 'CLOSED');
CREATE TYPE "ProviderDossierFindingStatus" AS ENUM ('OPEN');

ALTER TABLE "ProviderCapacitySnapshot" ADD COLUMN "confirmedByUserId" UUID;
ALTER TABLE "ProviderQualificationDecision" ADD COLUMN "dossierCandidateId" UUID, ADD COLUMN "dossierReviewCaseId" UUID, ADD COLUMN "dossierSubmissionId" UUID;
ALTER TABLE "ProviderVerificationReview" ADD COLUMN "dossierCandidateId" UUID, ADD COLUMN "dossierReviewCaseId" UUID, ADD COLUMN "dossierSubmissionId" UUID;

CREATE TABLE "ProviderProfessionalIdentityRevision" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "professionalId" UUID NOT NULL, "version" INTEGER NOT NULL,
  "displayName" VARCHAR(160) NOT NULL, "functionalRole" VARCHAR(160) NOT NULL,
  "status" "ProviderRecordStatus" NOT NULL DEFAULT 'ACTIVE', "createdByUserId" UUID,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProviderProfessionalIdentityRevision_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProviderDossierSubmission" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "providerProfileId" UUID NOT NULL,
  "status" "ProviderDossierSubmissionStatus" NOT NULL DEFAULT 'SUBMITTED', "version" INTEGER NOT NULL DEFAULT 1,
  "currentCandidateId" UUID, "submittedByUserId" UUID NOT NULL, "idempotencyKey" VARCHAR(160) NOT NULL,
  "submittedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "closedAt" TIMESTAMPTZ(3),
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "ProviderDossierSubmission_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProviderDossierCandidate" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "providerProfileId" UUID NOT NULL, "submissionId" UUID NOT NULL,
  "candidateVersion" INTEGER NOT NULL, "sourceProfileVersion" INTEGER NOT NULL,
  "schemaVersion" VARCHAR(80) NOT NULL, "canonicalizationVersion" VARCHAR(80) NOT NULL,
  "sourceReferences" JSONB NOT NULL, "canonicalPayload" JSONB NOT NULL, "sha256" VARCHAR(64) NOT NULL,
  "createdByUserId" UUID NOT NULL, "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "capacitySnapshotId" UUID,
  CONSTRAINT "ProviderDossierCandidate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProviderDossierCandidateEvidence" (
  "candidateId" UUID NOT NULL, "evidenceRevisionId" UUID NOT NULL,
  CONSTRAINT "ProviderDossierCandidateEvidence_pkey" PRIMARY KEY ("candidateId", "evidenceRevisionId")
);

CREATE TABLE "ProviderDossierSubmissionHistory" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "submissionId" UUID NOT NULL, "candidateId" UUID NOT NULL,
  "fromStatus" "ProviderDossierSubmissionStatus", "toStatus" "ProviderDossierSubmissionStatus" NOT NULL,
  "reasonCode" VARCHAR(80), "reason" VARCHAR(500), "actorUserId" UUID NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProviderDossierSubmissionHistory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProviderDossierReviewCase" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "providerProfileId" UUID NOT NULL, "submissionId" UUID NOT NULL,
  "candidateId" UUID NOT NULL, "status" "ProviderDossierReviewCaseStatus" NOT NULL DEFAULT 'OPEN',
  "version" INTEGER NOT NULL DEFAULT 1, "openedByUserId" UUID NOT NULL,
  "openedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "closedByUserId" UUID, "closedAt" TIMESTAMPTZ(3),
  CONSTRAINT "ProviderDossierReviewCase_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProviderDossierFinding" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "reviewCaseId" UUID NOT NULL, "candidateId" UUID NOT NULL,
  "section" "ProviderDossierSection" NOT NULL, "reasonCode" VARCHAR(80) NOT NULL,
  "providerMessage" VARCHAR(1000) NOT NULL, "internalNote" VARCHAR(2000),
  "status" "ProviderDossierFindingStatus" NOT NULL DEFAULT 'OPEN', "createdByUserId" UUID NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProviderDossierFinding_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProviderDossierFindingResolution" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "findingId" UUID NOT NULL, "version" INTEGER NOT NULL,
  "response" VARCHAR(1000) NOT NULL, "resolvedByUserId" UUID NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProviderDossierFindingResolution_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProviderProfessionalIdentityRevision_professionalId_version_key" ON "ProviderProfessionalIdentityRevision"("professionalId", "version");
CREATE INDEX "ProviderProfessionalIdentityRevision_professionalId_status_idx" ON "ProviderProfessionalIdentityRevision"("professionalId", "status");
CREATE UNIQUE INDEX "ProviderDossierSubmission_currentCandidateId_key" ON "ProviderDossierSubmission"("currentCandidateId");
CREATE UNIQUE INDEX "ProviderDossierSubmission_providerProfileId_idempotencyKey_key" ON "ProviderDossierSubmission"("providerProfileId", "idempotencyKey");
CREATE INDEX "ProviderDossierSubmission_providerProfileId_status_idx" ON "ProviderDossierSubmission"("providerProfileId", "status");
CREATE UNIQUE INDEX "ProviderDossierCandidate_providerProfileId_candidateVersion_key" ON "ProviderDossierCandidate"("providerProfileId", "candidateVersion");
CREATE UNIQUE INDEX "ProviderDossierCandidate_submissionId_candidateVersion_key" ON "ProviderDossierCandidate"("submissionId", "candidateVersion");
CREATE INDEX "ProviderDossierCandidate_providerProfileId_createdAt_idx" ON "ProviderDossierCandidate"("providerProfileId", "createdAt");
CREATE INDEX "ProviderDossierCandidate_sha256_idx" ON "ProviderDossierCandidate"("sha256");
CREATE INDEX "ProviderDossierCandidateEvidence_evidenceRevisionId_idx" ON "ProviderDossierCandidateEvidence"("evidenceRevisionId");
CREATE INDEX "ProviderDossierSubmissionHistory_submissionId_createdAt_idx" ON "ProviderDossierSubmissionHistory"("submissionId", "createdAt");
CREATE INDEX "ProviderDossierReviewCase_providerProfileId_status_idx" ON "ProviderDossierReviewCase"("providerProfileId", "status");
CREATE INDEX "ProviderDossierReviewCase_submissionId_openedAt_idx" ON "ProviderDossierReviewCase"("submissionId", "openedAt");
CREATE INDEX "ProviderDossierFinding_reviewCaseId_section_idx" ON "ProviderDossierFinding"("reviewCaseId", "section");
CREATE INDEX "ProviderDossierFinding_candidateId_idx" ON "ProviderDossierFinding"("candidateId");
CREATE UNIQUE INDEX "ProviderDossierFindingResolution_findingId_version_key" ON "ProviderDossierFindingResolution"("findingId", "version");
CREATE INDEX "ProviderDossierFindingResolution_findingId_createdAt_idx" ON "ProviderDossierFindingResolution"("findingId", "createdAt");
CREATE INDEX "ProviderQualificationDecision_dossierCandidateId_idx" ON "ProviderQualificationDecision"("dossierCandidateId");
CREATE INDEX "ProviderVerificationReview_dossierCandidateId_idx" ON "ProviderVerificationReview"("dossierCandidateId");

ALTER TABLE "ProviderCapacitySnapshot" ADD CONSTRAINT "ProviderCapacitySnapshot_confirmedByUserId_fkey" FOREIGN KEY ("confirmedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProviderProfessionalIdentityRevision" ADD CONSTRAINT "ProviderProfessionalIdentityRevision_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "ProviderProfessional"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProviderProfessionalIdentityRevision" ADD CONSTRAINT "ProviderProfessionalIdentityRevision_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProviderDossierSubmission" ADD CONSTRAINT "ProviderDossierSubmission_providerProfileId_fkey" FOREIGN KEY ("providerProfileId") REFERENCES "ProviderProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProviderDossierSubmission" ADD CONSTRAINT "ProviderDossierSubmission_currentCandidateId_fkey" FOREIGN KEY ("currentCandidateId") REFERENCES "ProviderDossierCandidate"("id") ON DELETE RESTRICT ON UPDATE CASCADE DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE "ProviderDossierSubmission" ADD CONSTRAINT "ProviderDossierSubmission_submittedByUserId_fkey" FOREIGN KEY ("submittedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProviderDossierCandidate" ADD CONSTRAINT "ProviderDossierCandidate_providerProfileId_fkey" FOREIGN KEY ("providerProfileId") REFERENCES "ProviderProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProviderDossierCandidate" ADD CONSTRAINT "ProviderDossierCandidate_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "ProviderDossierSubmission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProviderDossierCandidate" ADD CONSTRAINT "ProviderDossierCandidate_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProviderDossierCandidate" ADD CONSTRAINT "ProviderDossierCandidate_capacitySnapshotId_fkey" FOREIGN KEY ("capacitySnapshotId") REFERENCES "ProviderCapacitySnapshot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProviderDossierCandidateEvidence" ADD CONSTRAINT "ProviderDossierCandidateEvidence_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "ProviderDossierCandidate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProviderDossierCandidateEvidence" ADD CONSTRAINT "ProviderDossierCandidateEvidence_evidenceRevisionId_fkey" FOREIGN KEY ("evidenceRevisionId") REFERENCES "ProviderEvidenceRevision"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProviderDossierSubmissionHistory" ADD CONSTRAINT "ProviderDossierSubmissionHistory_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "ProviderDossierSubmission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProviderDossierSubmissionHistory" ADD CONSTRAINT "ProviderDossierSubmissionHistory_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "ProviderDossierCandidate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProviderDossierSubmissionHistory" ADD CONSTRAINT "ProviderDossierSubmissionHistory_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProviderDossierReviewCase" ADD CONSTRAINT "ProviderDossierReviewCase_providerProfileId_fkey" FOREIGN KEY ("providerProfileId") REFERENCES "ProviderProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProviderDossierReviewCase" ADD CONSTRAINT "ProviderDossierReviewCase_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "ProviderDossierSubmission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProviderDossierReviewCase" ADD CONSTRAINT "ProviderDossierReviewCase_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "ProviderDossierCandidate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProviderDossierReviewCase" ADD CONSTRAINT "ProviderDossierReviewCase_openedByUserId_fkey" FOREIGN KEY ("openedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProviderDossierReviewCase" ADD CONSTRAINT "ProviderDossierReviewCase_closedByUserId_fkey" FOREIGN KEY ("closedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProviderDossierFinding" ADD CONSTRAINT "ProviderDossierFinding_reviewCaseId_fkey" FOREIGN KEY ("reviewCaseId") REFERENCES "ProviderDossierReviewCase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProviderDossierFinding" ADD CONSTRAINT "ProviderDossierFinding_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "ProviderDossierCandidate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProviderDossierFinding" ADD CONSTRAINT "ProviderDossierFinding_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProviderDossierFindingResolution" ADD CONSTRAINT "ProviderDossierFindingResolution_findingId_fkey" FOREIGN KEY ("findingId") REFERENCES "ProviderDossierFinding"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProviderDossierFindingResolution" ADD CONSTRAINT "ProviderDossierFindingResolution_resolvedByUserId_fkey" FOREIGN KEY ("resolvedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProviderVerificationReview" ADD CONSTRAINT "ProviderVerificationReview_dossierCandidateId_fkey" FOREIGN KEY ("dossierCandidateId") REFERENCES "ProviderDossierCandidate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProviderVerificationReview" ADD CONSTRAINT "ProviderVerificationReview_dossierSubmissionId_fkey" FOREIGN KEY ("dossierSubmissionId") REFERENCES "ProviderDossierSubmission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProviderVerificationReview" ADD CONSTRAINT "ProviderVerificationReview_dossierReviewCaseId_fkey" FOREIGN KEY ("dossierReviewCaseId") REFERENCES "ProviderDossierReviewCase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProviderQualificationDecision" ADD CONSTRAINT "ProviderQualificationDecision_dossierCandidateId_fkey" FOREIGN KEY ("dossierCandidateId") REFERENCES "ProviderDossierCandidate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProviderQualificationDecision" ADD CONSTRAINT "ProviderQualificationDecision_dossierSubmissionId_fkey" FOREIGN KEY ("dossierSubmissionId") REFERENCES "ProviderDossierSubmission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProviderQualificationDecision" ADD CONSTRAINT "ProviderQualificationDecision_dossierReviewCaseId_fkey" FOREIGN KEY ("dossierReviewCaseId") REFERENCES "ProviderDossierReviewCase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
