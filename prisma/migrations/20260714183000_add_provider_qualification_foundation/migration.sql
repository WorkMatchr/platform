-- CreateEnum
CREATE TYPE "ProviderLifecycleStatus" AS ENUM ('DRAFT', 'READY_FOR_REVIEW', 'IN_REVIEW', 'CHANGES_REQUESTED', 'QUALIFIED', 'SUSPENDED', 'REJECTED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ProviderReadinessStatus" AS ENUM ('INCOMPLETE', 'READY', 'STALE');

-- CreateEnum
CREATE TYPE "ProviderPlatformQualificationStatus" AS ENUM ('NOT_ASSESSED', 'PENDING', 'QUALIFIED', 'CHANGES_REQUESTED', 'REJECTED', 'SUSPENDED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ProviderSelectabilityStatus" AS ENUM ('NOT_SELECTABLE', 'SELECTABLE', 'STALE', 'BLOCKED');

-- CreateEnum
CREATE TYPE "ProviderVerificationLevel" AS ENUM ('SELF_DECLARED', 'DOCUMENT_CHECKED', 'VERIFIED');

-- CreateEnum
CREATE TYPE "ProviderCapacityLevel" AS ENUM ('LIMITED', 'NORMAL', 'AMPLE');

-- CreateEnum
CREATE TYPE "ProviderDeliveryMode" AS ENUM ('ON_SITE', 'HYBRID', 'REMOTE');

-- CreateEnum
CREATE TYPE "ProviderTaxonomyKind" AS ENUM ('SERVICE', 'SPECIALISM', 'SECTOR', 'COMPETENCY', 'QUALIFICATION', 'CERTIFICATION', 'REGION', 'INSURANCE_TYPE');

-- CreateEnum
CREATE TYPE "ProviderTaxonomyVersionStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'RETIRED');

-- CreateEnum
CREATE TYPE "ProviderRecordStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ProviderPlatformPermission" AS ENUM ('PROVIDER_REVIEWER', 'PROVIDER_APPROVER', 'PROVIDER_AUDITOR');

-- CreateEnum
CREATE TYPE "ProviderQualificationScope" AS ENUM ('PLATFORM', 'CAPABILITY');

-- CreateEnum
CREATE TYPE "ProviderQualificationOutcome" AS ENUM ('QUALIFIED', 'CHANGES_REQUESTED', 'REJECTED', 'SUSPENDED', 'RESTORED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ProviderVerificationOutcome" AS ENUM ('DOCUMENT_CHECKED', 'VERIFIED', 'CHANGES_REQUESTED', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ProviderBlockType" AS ENUM ('COMPLIANCE', 'QUALIFICATION', 'SECURITY', 'LEGAL', 'DATA_QUALITY');

-- CreateEnum
CREATE TYPE "ProviderEvidenceStatus" AS ENUM ('DRAFT', 'AVAILABLE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ProviderEvidenceScanStatus" AS ENUM ('PENDING', 'CLEAN', 'QUARANTINED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ProviderTermStatus" AS ENUM ('DRAFT', 'ACTIVE', 'RETIRED');

-- CreateEnum
CREATE TYPE "ProviderRequirementKind" AS ENUM ('QUALIFICATION', 'CERTIFICATION');

-- AlterTable
ALTER TABLE "ProviderProfile" ADD COLUMN     "lifecycleStatus" "ProviderLifecycleStatus" NOT NULL DEFAULT 'DRAFT',
ADD COLUMN     "platformQualificationStatus" "ProviderPlatformQualificationStatus" NOT NULL DEFAULT 'NOT_ASSESSED',
ADD COLUMN     "readinessStatus" "ProviderReadinessStatus" NOT NULL DEFAULT 'INCOMPLETE',
ADD COLUMN     "selectabilityStatus" "ProviderSelectabilityStatus" NOT NULL DEFAULT 'NOT_SELECTABLE',
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "ProviderTaxonomy" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "kind" "ProviderTaxonomyKind" NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProviderTaxonomy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderReasonCode" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "ProviderReasonCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderTaxonomyVersion" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "taxonomyId" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "status" "ProviderTaxonomyVersionStatus" NOT NULL DEFAULT 'DRAFT',
    "checksum" VARCHAR(64),
    "publishedAt" TIMESTAMPTZ(3),
    "retiredAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProviderTaxonomyVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderTaxonomyTerm" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "versionId" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "parentId" UUID,
    "sortOrder" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProviderTaxonomyTerm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderSpecialismTaxonomyMap" (
    "termId" UUID NOT NULL,
    "specialismId" UUID NOT NULL,

    CONSTRAINT "ProviderSpecialismTaxonomyMap_pkey" PRIMARY KEY ("termId")
);

-- CreateTable
CREATE TABLE "ProviderSectorTaxonomyMap" (
    "termId" UUID NOT NULL,
    "sectorId" UUID NOT NULL,

    CONSTRAINT "ProviderSectorTaxonomyMap_pkey" PRIMARY KEY ("termId")
);

-- CreateTable
CREATE TABLE "ProviderCertificationTaxonomyMap" (
    "termId" UUID NOT NULL,
    "certificationId" UUID NOT NULL,

    CONSTRAINT "ProviderCertificationTaxonomyMap_pkey" PRIMARY KEY ("termId")
);

-- CreateTable
CREATE TABLE "ProviderPlatformPermissionGrant" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "permission" "ProviderPlatformPermission" NOT NULL,
    "validFrom" TIMESTAMPTZ(3) NOT NULL,
    "validUntil" TIMESTAMPTZ(3),
    "grantedByUserId" UUID NOT NULL,
    "reasonCode" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProviderPlatformPermissionGrant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderPlatformPermissionRevocation" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "grantId" UUID NOT NULL,
    "revokedByUserId" UUID NOT NULL,
    "reasonCode" TEXT NOT NULL,
    "revokedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProviderPlatformPermissionRevocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderCapability" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "providerProfileId" UUID NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" "ProviderRecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "legacySourceId" UUID,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProviderCapability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderCapabilityRevision" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "providerCapabilityId" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "serviceTermId" UUID,
    "specialismTermId" UUID,
    "competencyTermId" UUID,
    "deliveryModes" "ProviderDeliveryMode"[],
    "verificationLevel" "ProviderVerificationLevel" NOT NULL DEFAULT 'SELF_DECLARED',
    "validFrom" TIMESTAMPTZ(3),
    "validUntil" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProviderCapabilityRevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderSectorExperience" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "providerProfileId" UUID NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" "ProviderRecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "legacySourceId" UUID,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProviderSectorExperience_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderSectorExperienceRevision" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "sectorExperienceId" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "sectorTermId" UUID NOT NULL,
    "experienceYears" INTEGER,
    "verificationLevel" "ProviderVerificationLevel" NOT NULL DEFAULT 'SELF_DECLARED',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProviderSectorExperienceRevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderWorkArea" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "providerProfileId" UUID NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" "ProviderRecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProviderWorkArea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderWorkAreaRevision" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workAreaId" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "regionTermId" UUID NOT NULL,
    "maxTravelDistanceKm" INTEGER,
    "verificationLevel" "ProviderVerificationLevel" NOT NULL DEFAULT 'SELF_DECLARED',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProviderWorkAreaRevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderCapacitySnapshot" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "providerProfileId" UUID NOT NULL,
    "acceptsNewAssignments" BOOLEAN NOT NULL,
    "earliestStartDate" DATE,
    "capacityLevel" "ProviderCapacityLevel" NOT NULL,
    "confirmedAt" TIMESTAMPTZ(3) NOT NULL,
    "validUntil" TIMESTAMPTZ(3) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProviderCapacitySnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderProfessional" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "providerProfileId" UUID NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" "ProviderRecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProviderProfessional_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderProfessionalPrivateData" (
    "professionalId" UUID NOT NULL,
    "displayName" TEXT NOT NULL,
    "contactEmail" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "ProviderProfessionalPrivateData_pkey" PRIMARY KEY ("professionalId")
);

-- CreateTable
CREATE TABLE "ProviderProfessionalQualification" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "professionalId" UUID NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" "ProviderRecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProviderProfessionalQualification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderProfessionalQualificationRevision" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "qualificationId" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "qualificationTermId" UUID NOT NULL,
    "issuer" TEXT,
    "registrationNumber" TEXT,
    "issuedAt" DATE,
    "validUntil" DATE,
    "verificationLevel" "ProviderVerificationLevel" NOT NULL DEFAULT 'SELF_DECLARED',
    "evidenceRevisionId" UUID,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProviderProfessionalQualificationRevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderProfessionalQualificationCapability" (
    "qualificationId" UUID NOT NULL,
    "capabilityId" UUID NOT NULL,

    CONSTRAINT "ProviderProfessionalQualificationCapability_pkey" PRIMARY KEY ("qualificationId","capabilityId")
);

-- CreateTable
CREATE TABLE "ProviderOrganizationQualification" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "providerProfileId" UUID NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" "ProviderRecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "legacySourceId" UUID,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProviderOrganizationQualification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderOrganizationQualificationRevision" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "qualificationId" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "qualificationTermId" UUID NOT NULL,
    "registrationNumber" TEXT,
    "issuedAt" DATE,
    "validUntil" DATE,
    "verificationLevel" "ProviderVerificationLevel" NOT NULL DEFAULT 'SELF_DECLARED',
    "evidenceRevisionId" UUID,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProviderOrganizationQualificationRevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderCapabilityRequirementConfig" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "version" INTEGER NOT NULL,
    "status" "ProviderTaxonomyVersionStatus" NOT NULL DEFAULT 'DRAFT',
    "effectiveFrom" TIMESTAMPTZ(3),
    "effectiveUntil" TIMESTAMPTZ(3),
    "checksum" VARCHAR(64),
    "publishedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProviderCapabilityRequirementConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderCapabilityQualificationRequirement" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "configId" UUID NOT NULL,
    "serviceTermId" UUID NOT NULL,
    "specialismTermId" UUID,
    "requirementTermId" UUID NOT NULL,
    "kind" "ProviderRequirementKind" NOT NULL,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "minimumVerification" "ProviderVerificationLevel" NOT NULL,
    "requiresValidity" BOOLEAN NOT NULL DEFAULT true,
    "requiresProfessionalLiability" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProviderCapabilityQualificationRequirement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderInsurance" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "providerProfileId" UUID NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" "ProviderRecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProviderInsurance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderInsuranceRevision" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "insuranceId" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "insuranceTypeTermId" UUID NOT NULL,
    "insurer" TEXT NOT NULL,
    "policyReference" TEXT NOT NULL,
    "effectiveFrom" DATE NOT NULL,
    "expiresAt" DATE NOT NULL,
    "insuredOrganizationId" UUID NOT NULL,
    "coverageAmountCents" BIGINT,
    "coverageGeography" TEXT,
    "evidenceRevisionId" UUID NOT NULL,
    "verificationLevel" "ProviderVerificationLevel" NOT NULL DEFAULT 'SELF_DECLARED',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProviderInsuranceRevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderEvidenceDocument" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "providerProfileId" UUID NOT NULL,
    "status" "ProviderEvidenceStatus" NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProviderEvidenceDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderEvidenceRevision" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "evidenceDocumentId" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "storageKey" TEXT NOT NULL,
    "originalFileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "sha256" VARCHAR(64) NOT NULL,
    "scanStatus" "ProviderEvidenceScanStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProviderEvidenceRevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderTermDocument" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProviderTermDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderTermDocumentVersion" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "documentId" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "status" "ProviderTermStatus" NOT NULL DEFAULT 'DRAFT',
    "effectiveFrom" TIMESTAMPTZ(3),
    "effectiveUntil" TIMESTAMPTZ(3),
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "contentReference" TEXT,
    "checksum" VARCHAR(64),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProviderTermDocumentVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderTermAcceptance" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "providerProfileId" UUID NOT NULL,
    "documentVersionId" UUID NOT NULL,
    "acceptedByUserId" UUID NOT NULL,
    "acceptedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProviderTermAcceptance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderVerificationReview" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "providerProfileId" UUID NOT NULL,
    "capabilityRevisionId" UUID,
    "sectorExperienceRevisionId" UUID,
    "workAreaRevisionId" UUID,
    "professionalQualificationRevisionId" UUID,
    "organizationQualificationRevisionId" UUID,
    "insuranceRevisionId" UUID,
    "evidenceRevisionId" UUID,
    "outcome" "ProviderVerificationOutcome" NOT NULL,
    "resultingLevel" "ProviderVerificationLevel" NOT NULL,
    "reviewerUserId" UUID NOT NULL,
    "reasonCode" TEXT NOT NULL,
    "validFrom" TIMESTAMPTZ(3) NOT NULL,
    "validUntil" TIMESTAMPTZ(3),
    "checksum" VARCHAR(64) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProviderVerificationReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderQualificationDecision" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "providerProfileId" UUID NOT NULL,
    "capabilityId" UUID,
    "scope" "ProviderQualificationScope" NOT NULL,
    "outcome" "ProviderQualificationOutcome" NOT NULL,
    "requirementConfigId" UUID,
    "reviewedByUserId" UUID NOT NULL,
    "approvedByUserId" UUID NOT NULL,
    "reasonCode" TEXT NOT NULL,
    "validFrom" TIMESTAMPTZ(3) NOT NULL,
    "validUntil" TIMESTAMPTZ(3),
    "sourceChecksum" VARCHAR(64) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProviderQualificationDecision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderReadinessAssessment" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "providerProfileId" UUID NOT NULL,
    "status" "ProviderReadinessStatus" NOT NULL,
    "reasonCodes" TEXT[],
    "sourceVersion" INTEGER NOT NULL,
    "assessedByUserId" UUID,
    "checksum" VARCHAR(64) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProviderReadinessAssessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderSelectabilityAssessment" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "providerProfileId" UUID NOT NULL,
    "readinessAssessmentId" UUID NOT NULL,
    "status" "ProviderSelectabilityStatus" NOT NULL,
    "reasonCodes" TEXT[],
    "sourceVersion" INTEGER NOT NULL,
    "assessedByUserId" UUID,
    "checksum" VARCHAR(64) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProviderSelectabilityAssessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderBlock" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "providerProfileId" UUID NOT NULL,
    "type" "ProviderBlockType" NOT NULL,
    "reasonCode" TEXT NOT NULL,
    "blockedByUserId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProviderBlock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderBlockRelease" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "blockId" UUID NOT NULL,
    "reasonCode" TEXT NOT NULL,
    "releasedByUserId" UUID NOT NULL,
    "releasedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProviderBlockRelease_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrustedProviderProjection" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "providerProfileId" UUID NOT NULL,
    "readinessAssessmentId" UUID NOT NULL,
    "selectabilityAssessmentId" UUID NOT NULL,
    "schemaVersion" INTEGER NOT NULL,
    "canonicalizationVersion" TEXT NOT NULL,
    "sourceVersion" INTEGER NOT NULL,
    "payload" JSONB NOT NULL,
    "sha256" VARCHAR(64) NOT NULL,
    "validFrom" TIMESTAMPTZ(3) NOT NULL,
    "validUntil" TIMESTAMPTZ(3) NOT NULL,
    "createdByUserId" UUID,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrustedProviderProjection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrustedProviderProjectionInvalidation" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "projectionId" UUID NOT NULL,
    "reasonCode" TEXT NOT NULL,
    "invalidatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrustedProviderProjectionInvalidation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderMigrationAudit" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "providerProfileId" UUID NOT NULL,
    "migrationCode" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceId" UUID NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" UUID NOT NULL,
    "resultCode" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProviderMigrationAudit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProviderTaxonomy_kind_key" ON "ProviderTaxonomy"("kind");

-- CreateIndex
CREATE UNIQUE INDEX "ProviderTaxonomy_code_key" ON "ProviderTaxonomy"("code");

-- CreateIndex
CREATE UNIQUE INDEX "ProviderReasonCode_code_key" ON "ProviderReasonCode"("code");

-- CreateIndex
CREATE INDEX "ProviderReasonCode_domain_isActive_idx" ON "ProviderReasonCode"("domain", "isActive");

-- CreateIndex
CREATE INDEX "ProviderTaxonomyVersion_status_idx" ON "ProviderTaxonomyVersion"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ProviderTaxonomyVersion_taxonomyId_version_key" ON "ProviderTaxonomyVersion"("taxonomyId", "version");

-- CreateIndex
CREATE INDEX "ProviderTaxonomyTerm_parentId_idx" ON "ProviderTaxonomyTerm"("parentId");

-- CreateIndex
CREATE UNIQUE INDEX "ProviderTaxonomyTerm_versionId_code_key" ON "ProviderTaxonomyTerm"("versionId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "ProviderTaxonomyTerm_versionId_sortOrder_key" ON "ProviderTaxonomyTerm"("versionId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "ProviderSpecialismTaxonomyMap_specialismId_key" ON "ProviderSpecialismTaxonomyMap"("specialismId");

-- CreateIndex
CREATE UNIQUE INDEX "ProviderSectorTaxonomyMap_sectorId_key" ON "ProviderSectorTaxonomyMap"("sectorId");

-- CreateIndex
CREATE UNIQUE INDEX "ProviderCertificationTaxonomyMap_certificationId_key" ON "ProviderCertificationTaxonomyMap"("certificationId");

-- CreateIndex
CREATE INDEX "ProviderPlatformPermissionGrant_userId_permission_validFrom_idx" ON "ProviderPlatformPermissionGrant"("userId", "permission", "validFrom", "validUntil");

-- CreateIndex
CREATE UNIQUE INDEX "ProviderPlatformPermissionRevocation_grantId_key" ON "ProviderPlatformPermissionRevocation"("grantId");

-- CreateIndex
CREATE UNIQUE INDEX "ProviderCapability_legacySourceId_key" ON "ProviderCapability"("legacySourceId");

-- CreateIndex
CREATE INDEX "ProviderCapability_providerProfileId_status_idx" ON "ProviderCapability"("providerProfileId", "status");

-- CreateIndex
CREATE INDEX "ProviderCapabilityRevision_serviceTermId_specialismTermId_idx" ON "ProviderCapabilityRevision"("serviceTermId", "specialismTermId");

-- CreateIndex
CREATE INDEX "ProviderCapabilityRevision_verificationLevel_idx" ON "ProviderCapabilityRevision"("verificationLevel");

-- CreateIndex
CREATE UNIQUE INDEX "ProviderCapabilityRevision_providerCapabilityId_version_key" ON "ProviderCapabilityRevision"("providerCapabilityId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "ProviderSectorExperience_legacySourceId_key" ON "ProviderSectorExperience"("legacySourceId");

-- CreateIndex
CREATE INDEX "ProviderSectorExperience_providerProfileId_status_idx" ON "ProviderSectorExperience"("providerProfileId", "status");

-- CreateIndex
CREATE INDEX "ProviderSectorExperienceRevision_sectorTermId_idx" ON "ProviderSectorExperienceRevision"("sectorTermId");

-- CreateIndex
CREATE UNIQUE INDEX "ProviderSectorExperienceRevision_sectorExperienceId_version_key" ON "ProviderSectorExperienceRevision"("sectorExperienceId", "version");

-- CreateIndex
CREATE INDEX "ProviderWorkArea_providerProfileId_status_idx" ON "ProviderWorkArea"("providerProfileId", "status");

-- CreateIndex
CREATE INDEX "ProviderWorkAreaRevision_regionTermId_idx" ON "ProviderWorkAreaRevision"("regionTermId");

-- CreateIndex
CREATE UNIQUE INDEX "ProviderWorkAreaRevision_workAreaId_version_key" ON "ProviderWorkAreaRevision"("workAreaId", "version");

-- CreateIndex
CREATE INDEX "ProviderCapacitySnapshot_providerProfileId_validUntil_idx" ON "ProviderCapacitySnapshot"("providerProfileId", "validUntil");

-- CreateIndex
CREATE INDEX "ProviderProfessional_providerProfileId_status_idx" ON "ProviderProfessional"("providerProfileId", "status");

-- CreateIndex
CREATE INDEX "ProviderProfessionalQualification_professionalId_status_idx" ON "ProviderProfessionalQualification"("professionalId", "status");

-- CreateIndex
CREATE INDEX "ProviderProfessionalQualificationRevision_qualificationTerm_idx" ON "ProviderProfessionalQualificationRevision"("qualificationTermId", "validUntil");

-- CreateIndex
CREATE UNIQUE INDEX "ProviderProfessionalQualificationRevision_qualificationId_v_key" ON "ProviderProfessionalQualificationRevision"("qualificationId", "version");

-- CreateIndex
CREATE INDEX "ProviderProfessionalQualificationCapability_capabilityId_idx" ON "ProviderProfessionalQualificationCapability"("capabilityId");

-- CreateIndex
CREATE UNIQUE INDEX "ProviderOrganizationQualification_legacySourceId_key" ON "ProviderOrganizationQualification"("legacySourceId");

-- CreateIndex
CREATE INDEX "ProviderOrganizationQualification_providerProfileId_status_idx" ON "ProviderOrganizationQualification"("providerProfileId", "status");

-- CreateIndex
CREATE INDEX "ProviderOrganizationQualificationRevision_qualificationTerm_idx" ON "ProviderOrganizationQualificationRevision"("qualificationTermId", "validUntil");

-- CreateIndex
CREATE UNIQUE INDEX "ProviderOrganizationQualificationRevision_qualificationId_v_key" ON "ProviderOrganizationQualificationRevision"("qualificationId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "ProviderCapabilityRequirementConfig_version_key" ON "ProviderCapabilityRequirementConfig"("version");

-- CreateIndex
CREATE INDEX "ProviderCapabilityQualificationRequirement_serviceTermId_sp_idx" ON "ProviderCapabilityQualificationRequirement"("serviceTermId", "specialismTermId");

-- CreateIndex
CREATE UNIQUE INDEX "ProviderCapabilityQualificationRequirement_configId_service_key" ON "ProviderCapabilityQualificationRequirement"("configId", "serviceTermId", "specialismTermId", "requirementTermId");

-- CreateIndex
CREATE INDEX "ProviderInsurance_providerProfileId_status_idx" ON "ProviderInsurance"("providerProfileId", "status");

-- CreateIndex
CREATE INDEX "ProviderInsuranceRevision_insuranceTypeTermId_expiresAt_idx" ON "ProviderInsuranceRevision"("insuranceTypeTermId", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "ProviderInsuranceRevision_insuranceId_version_key" ON "ProviderInsuranceRevision"("insuranceId", "version");

-- CreateIndex
CREATE INDEX "ProviderEvidenceDocument_providerProfileId_status_idx" ON "ProviderEvidenceDocument"("providerProfileId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ProviderEvidenceRevision_storageKey_key" ON "ProviderEvidenceRevision"("storageKey");

-- CreateIndex
CREATE INDEX "ProviderEvidenceRevision_scanStatus_idx" ON "ProviderEvidenceRevision"("scanStatus");

-- CreateIndex
CREATE UNIQUE INDEX "ProviderEvidenceRevision_evidenceDocumentId_version_key" ON "ProviderEvidenceRevision"("evidenceDocumentId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "ProviderTermDocument_code_key" ON "ProviderTermDocument"("code");

-- CreateIndex
CREATE INDEX "ProviderTermDocumentVersion_status_effectiveFrom_effectiveU_idx" ON "ProviderTermDocumentVersion"("status", "effectiveFrom", "effectiveUntil");

-- CreateIndex
CREATE UNIQUE INDEX "ProviderTermDocumentVersion_documentId_version_key" ON "ProviderTermDocumentVersion"("documentId", "version");

-- CreateIndex
CREATE INDEX "ProviderTermAcceptance_acceptedByUserId_acceptedAt_idx" ON "ProviderTermAcceptance"("acceptedByUserId", "acceptedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ProviderTermAcceptance_providerProfileId_documentVersionId_key" ON "ProviderTermAcceptance"("providerProfileId", "documentVersionId");

-- CreateIndex
CREATE INDEX "ProviderVerificationReview_providerProfileId_createdAt_idx" ON "ProviderVerificationReview"("providerProfileId", "createdAt");

-- CreateIndex
CREATE INDEX "ProviderVerificationReview_reviewerUserId_createdAt_idx" ON "ProviderVerificationReview"("reviewerUserId", "createdAt");

-- CreateIndex
CREATE INDEX "ProviderQualificationDecision_providerProfileId_scope_creat_idx" ON "ProviderQualificationDecision"("providerProfileId", "scope", "createdAt");

-- CreateIndex
CREATE INDEX "ProviderQualificationDecision_capabilityId_createdAt_idx" ON "ProviderQualificationDecision"("capabilityId", "createdAt");

-- CreateIndex
CREATE INDEX "ProviderReadinessAssessment_providerProfileId_createdAt_idx" ON "ProviderReadinessAssessment"("providerProfileId", "createdAt");

-- CreateIndex
CREATE INDEX "ProviderSelectabilityAssessment_providerProfileId_createdAt_idx" ON "ProviderSelectabilityAssessment"("providerProfileId", "createdAt");

-- CreateIndex
CREATE INDEX "ProviderBlock_providerProfileId_type_createdAt_idx" ON "ProviderBlock"("providerProfileId", "type", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ProviderBlockRelease_blockId_key" ON "ProviderBlockRelease"("blockId");

-- CreateIndex
CREATE INDEX "TrustedProviderProjection_providerProfileId_validUntil_idx" ON "TrustedProviderProjection"("providerProfileId", "validUntil");

-- CreateIndex
CREATE INDEX "TrustedProviderProjection_sha256_idx" ON "TrustedProviderProjection"("sha256");

-- CreateIndex
CREATE UNIQUE INDEX "TrustedProviderProjection_providerProfileId_sourceVersion_key" ON "TrustedProviderProjection"("providerProfileId", "sourceVersion");

-- CreateIndex
CREATE UNIQUE INDEX "TrustedProviderProjectionInvalidation_projectionId_key" ON "TrustedProviderProjectionInvalidation"("projectionId");

-- CreateIndex
CREATE INDEX "ProviderMigrationAudit_providerProfileId_createdAt_idx" ON "ProviderMigrationAudit"("providerProfileId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ProviderMigrationAudit_migrationCode_sourceType_sourceId_key" ON "ProviderMigrationAudit"("migrationCode", "sourceType", "sourceId");

-- CreateIndex
CREATE INDEX "ProviderProfile_lifecycleStatus_idx" ON "ProviderProfile"("lifecycleStatus");

-- CreateIndex
CREATE INDEX "ProviderProfile_readinessStatus_idx" ON "ProviderProfile"("readinessStatus");

-- CreateIndex
CREATE INDEX "ProviderProfile_platformQualificationStatus_idx" ON "ProviderProfile"("platformQualificationStatus");

-- CreateIndex
CREATE INDEX "ProviderProfile_selectabilityStatus_idx" ON "ProviderProfile"("selectabilityStatus");

-- AddForeignKey
ALTER TABLE "ProviderTaxonomyVersion" ADD CONSTRAINT "ProviderTaxonomyVersion_taxonomyId_fkey" FOREIGN KEY ("taxonomyId") REFERENCES "ProviderTaxonomy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderTaxonomyTerm" ADD CONSTRAINT "ProviderTaxonomyTerm_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "ProviderTaxonomyVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderTaxonomyTerm" ADD CONSTRAINT "ProviderTaxonomyTerm_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "ProviderTaxonomyTerm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderSpecialismTaxonomyMap" ADD CONSTRAINT "ProviderSpecialismTaxonomyMap_termId_fkey" FOREIGN KEY ("termId") REFERENCES "ProviderTaxonomyTerm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderSpecialismTaxonomyMap" ADD CONSTRAINT "ProviderSpecialismTaxonomyMap_specialismId_fkey" FOREIGN KEY ("specialismId") REFERENCES "Specialism"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderSectorTaxonomyMap" ADD CONSTRAINT "ProviderSectorTaxonomyMap_termId_fkey" FOREIGN KEY ("termId") REFERENCES "ProviderTaxonomyTerm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderSectorTaxonomyMap" ADD CONSTRAINT "ProviderSectorTaxonomyMap_sectorId_fkey" FOREIGN KEY ("sectorId") REFERENCES "Sector"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderCertificationTaxonomyMap" ADD CONSTRAINT "ProviderCertificationTaxonomyMap_termId_fkey" FOREIGN KEY ("termId") REFERENCES "ProviderTaxonomyTerm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderCertificationTaxonomyMap" ADD CONSTRAINT "ProviderCertificationTaxonomyMap_certificationId_fkey" FOREIGN KEY ("certificationId") REFERENCES "Certification"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderPlatformPermissionGrant" ADD CONSTRAINT "ProviderPlatformPermissionGrant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderPlatformPermissionGrant" ADD CONSTRAINT "ProviderPlatformPermissionGrant_grantedByUserId_fkey" FOREIGN KEY ("grantedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderPlatformPermissionRevocation" ADD CONSTRAINT "ProviderPlatformPermissionRevocation_grantId_fkey" FOREIGN KEY ("grantId") REFERENCES "ProviderPlatformPermissionGrant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderPlatformPermissionRevocation" ADD CONSTRAINT "ProviderPlatformPermissionRevocation_revokedByUserId_fkey" FOREIGN KEY ("revokedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderCapability" ADD CONSTRAINT "ProviderCapability_providerProfileId_fkey" FOREIGN KEY ("providerProfileId") REFERENCES "ProviderProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderCapabilityRevision" ADD CONSTRAINT "ProviderCapabilityRevision_providerCapabilityId_fkey" FOREIGN KEY ("providerCapabilityId") REFERENCES "ProviderCapability"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderCapabilityRevision" ADD CONSTRAINT "ProviderCapabilityRevision_serviceTermId_fkey" FOREIGN KEY ("serviceTermId") REFERENCES "ProviderTaxonomyTerm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderCapabilityRevision" ADD CONSTRAINT "ProviderCapabilityRevision_specialismTermId_fkey" FOREIGN KEY ("specialismTermId") REFERENCES "ProviderTaxonomyTerm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderCapabilityRevision" ADD CONSTRAINT "ProviderCapabilityRevision_competencyTermId_fkey" FOREIGN KEY ("competencyTermId") REFERENCES "ProviderTaxonomyTerm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderSectorExperience" ADD CONSTRAINT "ProviderSectorExperience_providerProfileId_fkey" FOREIGN KEY ("providerProfileId") REFERENCES "ProviderProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderSectorExperienceRevision" ADD CONSTRAINT "ProviderSectorExperienceRevision_sectorExperienceId_fkey" FOREIGN KEY ("sectorExperienceId") REFERENCES "ProviderSectorExperience"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderSectorExperienceRevision" ADD CONSTRAINT "ProviderSectorExperienceRevision_sectorTermId_fkey" FOREIGN KEY ("sectorTermId") REFERENCES "ProviderTaxonomyTerm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderWorkArea" ADD CONSTRAINT "ProviderWorkArea_providerProfileId_fkey" FOREIGN KEY ("providerProfileId") REFERENCES "ProviderProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderWorkAreaRevision" ADD CONSTRAINT "ProviderWorkAreaRevision_workAreaId_fkey" FOREIGN KEY ("workAreaId") REFERENCES "ProviderWorkArea"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderWorkAreaRevision" ADD CONSTRAINT "ProviderWorkAreaRevision_regionTermId_fkey" FOREIGN KEY ("regionTermId") REFERENCES "ProviderTaxonomyTerm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderCapacitySnapshot" ADD CONSTRAINT "ProviderCapacitySnapshot_providerProfileId_fkey" FOREIGN KEY ("providerProfileId") REFERENCES "ProviderProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderProfessional" ADD CONSTRAINT "ProviderProfessional_providerProfileId_fkey" FOREIGN KEY ("providerProfileId") REFERENCES "ProviderProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderProfessionalPrivateData" ADD CONSTRAINT "ProviderProfessionalPrivateData_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "ProviderProfessional"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderProfessionalQualification" ADD CONSTRAINT "ProviderProfessionalQualification_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "ProviderProfessional"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderProfessionalQualificationRevision" ADD CONSTRAINT "ProviderProfessionalQualificationRevision_qualificationId_fkey" FOREIGN KEY ("qualificationId") REFERENCES "ProviderProfessionalQualification"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderProfessionalQualificationRevision" ADD CONSTRAINT "ProviderProfessionalQualificationRevision_qualificationTer_fkey" FOREIGN KEY ("qualificationTermId") REFERENCES "ProviderTaxonomyTerm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderProfessionalQualificationRevision" ADD CONSTRAINT "ProviderProfessionalQualificationRevision_evidenceRevision_fkey" FOREIGN KEY ("evidenceRevisionId") REFERENCES "ProviderEvidenceRevision"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderProfessionalQualificationCapability" ADD CONSTRAINT "ProviderProfessionalQualificationCapability_qualificationI_fkey" FOREIGN KEY ("qualificationId") REFERENCES "ProviderProfessionalQualification"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderProfessionalQualificationCapability" ADD CONSTRAINT "ProviderProfessionalQualificationCapability_capabilityId_fkey" FOREIGN KEY ("capabilityId") REFERENCES "ProviderCapability"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderOrganizationQualification" ADD CONSTRAINT "ProviderOrganizationQualification_providerProfileId_fkey" FOREIGN KEY ("providerProfileId") REFERENCES "ProviderProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderOrganizationQualificationRevision" ADD CONSTRAINT "ProviderOrganizationQualificationRevision_qualificationId_fkey" FOREIGN KEY ("qualificationId") REFERENCES "ProviderOrganizationQualification"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderOrganizationQualificationRevision" ADD CONSTRAINT "ProviderOrganizationQualificationRevision_qualificationTer_fkey" FOREIGN KEY ("qualificationTermId") REFERENCES "ProviderTaxonomyTerm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderOrganizationQualificationRevision" ADD CONSTRAINT "ProviderOrganizationQualificationRevision_evidenceRevision_fkey" FOREIGN KEY ("evidenceRevisionId") REFERENCES "ProviderEvidenceRevision"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderCapabilityQualificationRequirement" ADD CONSTRAINT "ProviderCapabilityQualificationRequirement_configId_fkey" FOREIGN KEY ("configId") REFERENCES "ProviderCapabilityRequirementConfig"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderCapabilityQualificationRequirement" ADD CONSTRAINT "ProviderCapabilityQualificationRequirement_serviceTermId_fkey" FOREIGN KEY ("serviceTermId") REFERENCES "ProviderTaxonomyTerm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderCapabilityQualificationRequirement" ADD CONSTRAINT "ProviderCapabilityQualificationRequirement_specialismTermI_fkey" FOREIGN KEY ("specialismTermId") REFERENCES "ProviderTaxonomyTerm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderCapabilityQualificationRequirement" ADD CONSTRAINT "ProviderCapabilityQualificationRequirement_requirementTerm_fkey" FOREIGN KEY ("requirementTermId") REFERENCES "ProviderTaxonomyTerm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderInsurance" ADD CONSTRAINT "ProviderInsurance_providerProfileId_fkey" FOREIGN KEY ("providerProfileId") REFERENCES "ProviderProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderInsuranceRevision" ADD CONSTRAINT "ProviderInsuranceRevision_insuranceId_fkey" FOREIGN KEY ("insuranceId") REFERENCES "ProviderInsurance"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderInsuranceRevision" ADD CONSTRAINT "ProviderInsuranceRevision_insuranceTypeTermId_fkey" FOREIGN KEY ("insuranceTypeTermId") REFERENCES "ProviderTaxonomyTerm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderInsuranceRevision" ADD CONSTRAINT "ProviderInsuranceRevision_insuredOrganizationId_fkey" FOREIGN KEY ("insuredOrganizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderInsuranceRevision" ADD CONSTRAINT "ProviderInsuranceRevision_evidenceRevisionId_fkey" FOREIGN KEY ("evidenceRevisionId") REFERENCES "ProviderEvidenceRevision"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderEvidenceDocument" ADD CONSTRAINT "ProviderEvidenceDocument_providerProfileId_fkey" FOREIGN KEY ("providerProfileId") REFERENCES "ProviderProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderEvidenceRevision" ADD CONSTRAINT "ProviderEvidenceRevision_evidenceDocumentId_fkey" FOREIGN KEY ("evidenceDocumentId") REFERENCES "ProviderEvidenceDocument"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderTermDocumentVersion" ADD CONSTRAINT "ProviderTermDocumentVersion_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "ProviderTermDocument"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderTermAcceptance" ADD CONSTRAINT "ProviderTermAcceptance_providerProfileId_fkey" FOREIGN KEY ("providerProfileId") REFERENCES "ProviderProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderTermAcceptance" ADD CONSTRAINT "ProviderTermAcceptance_documentVersionId_fkey" FOREIGN KEY ("documentVersionId") REFERENCES "ProviderTermDocumentVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderTermAcceptance" ADD CONSTRAINT "ProviderTermAcceptance_acceptedByUserId_fkey" FOREIGN KEY ("acceptedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderVerificationReview" ADD CONSTRAINT "ProviderVerificationReview_providerProfileId_fkey" FOREIGN KEY ("providerProfileId") REFERENCES "ProviderProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderVerificationReview" ADD CONSTRAINT "ProviderVerificationReview_capabilityRevisionId_fkey" FOREIGN KEY ("capabilityRevisionId") REFERENCES "ProviderCapabilityRevision"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderVerificationReview" ADD CONSTRAINT "ProviderVerificationReview_sectorExperienceRevisionId_fkey" FOREIGN KEY ("sectorExperienceRevisionId") REFERENCES "ProviderSectorExperienceRevision"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderVerificationReview" ADD CONSTRAINT "ProviderVerificationReview_workAreaRevisionId_fkey" FOREIGN KEY ("workAreaRevisionId") REFERENCES "ProviderWorkAreaRevision"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderVerificationReview" ADD CONSTRAINT "ProviderVerificationReview_professionalQualificationRevisi_fkey" FOREIGN KEY ("professionalQualificationRevisionId") REFERENCES "ProviderProfessionalQualificationRevision"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderVerificationReview" ADD CONSTRAINT "ProviderVerificationReview_organizationQualificationRevisi_fkey" FOREIGN KEY ("organizationQualificationRevisionId") REFERENCES "ProviderOrganizationQualificationRevision"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderVerificationReview" ADD CONSTRAINT "ProviderVerificationReview_insuranceRevisionId_fkey" FOREIGN KEY ("insuranceRevisionId") REFERENCES "ProviderInsuranceRevision"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderVerificationReview" ADD CONSTRAINT "ProviderVerificationReview_evidenceRevisionId_fkey" FOREIGN KEY ("evidenceRevisionId") REFERENCES "ProviderEvidenceRevision"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderVerificationReview" ADD CONSTRAINT "ProviderVerificationReview_reviewerUserId_fkey" FOREIGN KEY ("reviewerUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderQualificationDecision" ADD CONSTRAINT "ProviderQualificationDecision_providerProfileId_fkey" FOREIGN KEY ("providerProfileId") REFERENCES "ProviderProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderQualificationDecision" ADD CONSTRAINT "ProviderQualificationDecision_capabilityId_fkey" FOREIGN KEY ("capabilityId") REFERENCES "ProviderCapability"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderQualificationDecision" ADD CONSTRAINT "ProviderQualificationDecision_requirementConfigId_fkey" FOREIGN KEY ("requirementConfigId") REFERENCES "ProviderCapabilityRequirementConfig"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderQualificationDecision" ADD CONSTRAINT "ProviderQualificationDecision_reviewedByUserId_fkey" FOREIGN KEY ("reviewedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderQualificationDecision" ADD CONSTRAINT "ProviderQualificationDecision_approvedByUserId_fkey" FOREIGN KEY ("approvedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderReadinessAssessment" ADD CONSTRAINT "ProviderReadinessAssessment_providerProfileId_fkey" FOREIGN KEY ("providerProfileId") REFERENCES "ProviderProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderReadinessAssessment" ADD CONSTRAINT "ProviderReadinessAssessment_assessedByUserId_fkey" FOREIGN KEY ("assessedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderSelectabilityAssessment" ADD CONSTRAINT "ProviderSelectabilityAssessment_providerProfileId_fkey" FOREIGN KEY ("providerProfileId") REFERENCES "ProviderProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderSelectabilityAssessment" ADD CONSTRAINT "ProviderSelectabilityAssessment_readinessAssessmentId_fkey" FOREIGN KEY ("readinessAssessmentId") REFERENCES "ProviderReadinessAssessment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderSelectabilityAssessment" ADD CONSTRAINT "ProviderSelectabilityAssessment_assessedByUserId_fkey" FOREIGN KEY ("assessedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderBlock" ADD CONSTRAINT "ProviderBlock_providerProfileId_fkey" FOREIGN KEY ("providerProfileId") REFERENCES "ProviderProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderBlock" ADD CONSTRAINT "ProviderBlock_blockedByUserId_fkey" FOREIGN KEY ("blockedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderBlockRelease" ADD CONSTRAINT "ProviderBlockRelease_blockId_fkey" FOREIGN KEY ("blockId") REFERENCES "ProviderBlock"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderBlockRelease" ADD CONSTRAINT "ProviderBlockRelease_releasedByUserId_fkey" FOREIGN KEY ("releasedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrustedProviderProjection" ADD CONSTRAINT "TrustedProviderProjection_providerProfileId_fkey" FOREIGN KEY ("providerProfileId") REFERENCES "ProviderProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrustedProviderProjection" ADD CONSTRAINT "TrustedProviderProjection_readinessAssessmentId_fkey" FOREIGN KEY ("readinessAssessmentId") REFERENCES "ProviderReadinessAssessment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrustedProviderProjection" ADD CONSTRAINT "TrustedProviderProjection_selectabilityAssessmentId_fkey" FOREIGN KEY ("selectabilityAssessmentId") REFERENCES "ProviderSelectabilityAssessment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrustedProviderProjection" ADD CONSTRAINT "TrustedProviderProjection_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrustedProviderProjectionInvalidation" ADD CONSTRAINT "TrustedProviderProjectionInvalidation_projectionId_fkey" FOREIGN KEY ("projectionId") REFERENCES "TrustedProviderProjection"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderMigrationAudit" ADD CONSTRAINT "ProviderMigrationAudit_providerProfileId_fkey" FOREIGN KEY ("providerProfileId") REFERENCES "ProviderProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Domain constraints that Prisma cannot express.
ALTER TABLE "ProviderProfile"
  ADD CONSTRAINT "ProviderProfile_version_check" CHECK ("version" > 0);

ALTER TABLE "ProviderTaxonomyVersion"
  ADD CONSTRAINT "ProviderTaxonomyVersion_version_check" CHECK ("version" > 0),
  ADD CONSTRAINT "ProviderTaxonomyVersion_publication_check" CHECK (
    ("status" = 'DRAFT' AND "publishedAt" IS NULL AND "retiredAt" IS NULL)
    OR ("status" = 'PUBLISHED' AND "publishedAt" IS NOT NULL AND "retiredAt" IS NULL AND "checksum" ~ '^[0-9a-f]{64}$')
    OR ("status" = 'RETIRED' AND "publishedAt" IS NOT NULL AND "retiredAt" IS NOT NULL AND "checksum" ~ '^[0-9a-f]{64}$')
  );

ALTER TABLE "ProviderPlatformPermissionGrant"
  ADD CONSTRAINT "ProviderPlatformPermissionGrant_validity_check" CHECK ("validUntil" IS NULL OR "validUntil" > "validFrom");

ALTER TABLE "ProviderCapability"
  ADD CONSTRAINT "ProviderCapability_version_check" CHECK ("version" > 0);
ALTER TABLE "ProviderCapabilityRevision"
  ADD CONSTRAINT "ProviderCapabilityRevision_version_check" CHECK ("version" > 0),
  ADD CONSTRAINT "ProviderCapabilityRevision_validity_check" CHECK ("validUntil" IS NULL OR "validFrom" IS NULL OR "validUntil" > "validFrom"),
  ADD CONSTRAINT "ProviderCapabilityRevision_classification_check" CHECK ("serviceTermId" IS NOT NULL OR "specialismTermId" IS NOT NULL);

ALTER TABLE "ProviderSectorExperience"
  ADD CONSTRAINT "ProviderSectorExperience_version_check" CHECK ("version" > 0);
ALTER TABLE "ProviderSectorExperienceRevision"
  ADD CONSTRAINT "ProviderSectorExperienceRevision_version_check" CHECK ("version" > 0),
  ADD CONSTRAINT "ProviderSectorExperienceRevision_experience_check" CHECK ("experienceYears" IS NULL OR "experienceYears" >= 0);

ALTER TABLE "ProviderWorkArea"
  ADD CONSTRAINT "ProviderWorkArea_version_check" CHECK ("version" > 0);
ALTER TABLE "ProviderWorkAreaRevision"
  ADD CONSTRAINT "ProviderWorkAreaRevision_version_check" CHECK ("version" > 0),
  ADD CONSTRAINT "ProviderWorkAreaRevision_distance_check" CHECK ("maxTravelDistanceKm" IS NULL OR "maxTravelDistanceKm" >= 0);

ALTER TABLE "ProviderCapacitySnapshot"
  ADD CONSTRAINT "ProviderCapacitySnapshot_validity_check" CHECK (
    "validUntil" > "confirmedAt" AND "validUntil" <= "confirmedAt" + INTERVAL '30 days'
  );

ALTER TABLE "ProviderProfessional"
  ADD CONSTRAINT "ProviderProfessional_version_check" CHECK ("version" > 0);
ALTER TABLE "ProviderProfessionalQualification"
  ADD CONSTRAINT "ProviderProfessionalQualification_version_check" CHECK ("version" > 0);
ALTER TABLE "ProviderProfessionalQualificationRevision"
  ADD CONSTRAINT "ProviderProfessionalQualificationRevision_version_check" CHECK ("version" > 0),
  ADD CONSTRAINT "ProviderProfessionalQualificationRevision_validity_check" CHECK ("validUntil" IS NULL OR "issuedAt" IS NULL OR "validUntil" >= "issuedAt");

ALTER TABLE "ProviderOrganizationQualification"
  ADD CONSTRAINT "ProviderOrganizationQualification_version_check" CHECK ("version" > 0);
ALTER TABLE "ProviderOrganizationQualificationRevision"
  ADD CONSTRAINT "ProviderOrganizationQualificationRevision_version_check" CHECK ("version" > 0),
  ADD CONSTRAINT "ProviderOrganizationQualificationRevision_validity_check" CHECK ("validUntil" IS NULL OR "issuedAt" IS NULL OR "validUntil" >= "issuedAt");

ALTER TABLE "ProviderCapabilityRequirementConfig"
  ADD CONSTRAINT "ProviderCapabilityRequirementConfig_version_check" CHECK ("version" > 0),
  ADD CONSTRAINT "ProviderCapabilityRequirementConfig_validity_check" CHECK ("effectiveUntil" IS NULL OR "effectiveFrom" IS NULL OR "effectiveUntil" > "effectiveFrom"),
  ADD CONSTRAINT "ProviderCapabilityRequirementConfig_publication_check" CHECK (
    ("status" = 'DRAFT' AND "publishedAt" IS NULL)
    OR ("status" IN ('PUBLISHED', 'RETIRED') AND "publishedAt" IS NOT NULL AND "checksum" ~ '^[0-9a-f]{64}$')
  );

ALTER TABLE "ProviderInsuranceRevision"
  ADD CONSTRAINT "ProviderInsuranceRevision_version_check" CHECK ("version" > 0),
  ADD CONSTRAINT "ProviderInsuranceRevision_validity_check" CHECK ("expiresAt" >= "effectiveFrom"),
  ADD CONSTRAINT "ProviderInsuranceRevision_coverage_check" CHECK ("coverageAmountCents" IS NULL OR "coverageAmountCents" >= 0);

ALTER TABLE "ProviderEvidenceRevision"
  ADD CONSTRAINT "ProviderEvidenceRevision_version_check" CHECK ("version" > 0),
  ADD CONSTRAINT "ProviderEvidenceRevision_size_check" CHECK ("sizeBytes" > 0),
  ADD CONSTRAINT "ProviderEvidenceRevision_sha256_check" CHECK ("sha256" ~ '^[0-9a-f]{64}$');

ALTER TABLE "ProviderTermDocumentVersion"
  ADD CONSTRAINT "ProviderTermDocumentVersion_version_check" CHECK ("version" > 0),
  ADD CONSTRAINT "ProviderTermDocumentVersion_validity_check" CHECK ("effectiveUntil" IS NULL OR "effectiveFrom" IS NULL OR "effectiveUntil" > "effectiveFrom"),
  ADD CONSTRAINT "ProviderTermDocumentVersion_activation_check" CHECK (
    "status" <> 'ACTIVE' OR ("effectiveFrom" IS NOT NULL AND "contentReference" IS NOT NULL AND "checksum" ~ '^[0-9a-f]{64}$')
  );

ALTER TABLE "ProviderVerificationReview"
  ADD CONSTRAINT "ProviderVerificationReview_subject_check" CHECK (
    num_nonnulls("capabilityRevisionId", "sectorExperienceRevisionId", "workAreaRevisionId", "professionalQualificationRevisionId", "organizationQualificationRevisionId", "insuranceRevisionId", "evidenceRevisionId") = 1
  ),
  ADD CONSTRAINT "ProviderVerificationReview_validity_check" CHECK ("validUntil" IS NULL OR "validUntil" > "validFrom"),
  ADD CONSTRAINT "ProviderVerificationReview_checksum_check" CHECK ("checksum" ~ '^[0-9a-f]{64}$');

ALTER TABLE "ProviderQualificationDecision"
  ADD CONSTRAINT "ProviderQualificationDecision_scope_check" CHECK (
    ("scope" = 'PLATFORM' AND "capabilityId" IS NULL)
    OR ("scope" = 'CAPABILITY' AND "capabilityId" IS NOT NULL)
  ),
  ADD CONSTRAINT "ProviderQualificationDecision_four_eyes_check" CHECK ("reviewedByUserId" <> "approvedByUserId"),
  ADD CONSTRAINT "ProviderQualificationDecision_validity_check" CHECK ("validUntil" IS NULL OR "validUntil" > "validFrom"),
  ADD CONSTRAINT "ProviderQualificationDecision_checksum_check" CHECK ("sourceChecksum" ~ '^[0-9a-f]{64}$');

ALTER TABLE "ProviderReadinessAssessment"
  ADD CONSTRAINT "ProviderReadinessAssessment_version_check" CHECK ("sourceVersion" > 0),
  ADD CONSTRAINT "ProviderReadinessAssessment_checksum_check" CHECK ("checksum" ~ '^[0-9a-f]{64}$');
ALTER TABLE "ProviderSelectabilityAssessment"
  ADD CONSTRAINT "ProviderSelectabilityAssessment_version_check" CHECK ("sourceVersion" > 0),
  ADD CONSTRAINT "ProviderSelectabilityAssessment_checksum_check" CHECK ("checksum" ~ '^[0-9a-f]{64}$');

ALTER TABLE "TrustedProviderProjection"
  ADD CONSTRAINT "TrustedProviderProjection_version_check" CHECK ("schemaVersion" > 0 AND "sourceVersion" > 0),
  ADD CONSTRAINT "TrustedProviderProjection_validity_check" CHECK ("validUntil" > "validFrom"),
  ADD CONSTRAINT "TrustedProviderProjection_checksum_check" CHECK ("sha256" ~ '^[0-9a-f]{64}$');

-- Append-only and immutable domain records.
CREATE OR REPLACE FUNCTION workmatchr_reject_provider_history_mutation()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Providerhistorie is immutable';
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  immutable_table text;
BEGIN
  FOREACH immutable_table IN ARRAY ARRAY[
    'ProviderCapabilityRevision',
    'ProviderSectorExperienceRevision',
    'ProviderWorkAreaRevision',
    'ProviderCapacitySnapshot',
    'ProviderProfessionalQualificationRevision',
    'ProviderOrganizationQualificationRevision',
    'ProviderInsuranceRevision',
    'ProviderEvidenceRevision',
    'ProviderTermAcceptance',
    'ProviderVerificationReview',
    'ProviderQualificationDecision',
    'ProviderReadinessAssessment',
    'ProviderSelectabilityAssessment',
    'ProviderBlock',
    'ProviderBlockRelease',
    'TrustedProviderProjection',
    'TrustedProviderProjectionInvalidation',
    'ProviderPlatformPermissionRevocation',
    'ProviderMigrationAudit'
  ]
  LOOP
    EXECUTE format(
      'CREATE TRIGGER %I BEFORE UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION workmatchr_reject_provider_history_mutation()',
      'immutable_' || lower(immutable_table),
      immutable_table
    );
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION workmatchr_protect_published_provider_taxonomy()
RETURNS trigger AS $$
BEGIN
  IF OLD."status" IN ('PUBLISHED', 'RETIRED') THEN
    RAISE EXCEPTION 'Gepubliceerde providertaxonomie is immutable';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "immutable_published_provider_taxonomy_version"
BEFORE UPDATE OR DELETE ON "ProviderTaxonomyVersion"
FOR EACH ROW EXECUTE FUNCTION workmatchr_protect_published_provider_taxonomy();

CREATE OR REPLACE FUNCTION workmatchr_protect_published_provider_taxonomy_term()
RETURNS trigger AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "ProviderTaxonomyVersion"
    WHERE "id" = OLD."versionId" AND "status" IN ('PUBLISHED', 'RETIRED')
  ) THEN
    RAISE EXCEPTION 'Term van gepubliceerde providertaxonomie is immutable';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "immutable_published_provider_taxonomy_term"
BEFORE UPDATE OR DELETE ON "ProviderTaxonomyTerm"
FOR EACH ROW EXECUTE FUNCTION workmatchr_protect_published_provider_taxonomy_term();

CREATE UNIQUE INDEX "ProviderCapabilityRequirementConfig_one_published"
ON "ProviderCapabilityRequirementConfig" (("status")) WHERE "status" = 'PUBLISHED';

CREATE UNIQUE INDEX "ProviderTaxonomyVersion_one_published_per_taxonomy"
ON "ProviderTaxonomyVersion" ("taxonomyId") WHERE "status" = 'PUBLISHED';
