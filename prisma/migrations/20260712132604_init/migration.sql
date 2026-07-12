-- CreateEnum
CREATE TYPE "PlatformRole" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('INVITED', 'ACTIVE', 'BLOCKED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "OrganizationType" AS ENUM ('CLIENT', 'PROVIDER', 'BOTH');

-- CreateEnum
CREATE TYPE "OrganizationStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "OrganizationMembershipRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER');

-- CreateEnum
CREATE TYPE "MembershipStatus" AS ENUM ('INVITED', 'ACTIVE', 'SUSPENDED', 'REMOVED');

-- CreateEnum
CREATE TYPE "ProviderApprovalStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'APPROVED', 'REJECTED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "CertificationVerificationStatus" AS ENUM ('UNVERIFIED', 'PENDING', 'VERIFIED', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "IntakeStatus" AS ENUM ('DRAFT', 'IN_PROGRESS', 'READY_FOR_REVIEW', 'SUBMITTED', 'CONVERTED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "AssignmentStatus" AS ENUM ('DRAFT', 'READY_FOR_REVIEW', 'OPEN', 'MATCHING', 'AWAITING_RESPONSES', 'IN_SELECTION', 'AWARDED', 'CLOSED', 'CANCELLED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ProviderSelectionSource" AS ENUM ('AUTOMATIC', 'MANUAL_ADMIN', 'CLIENT_REQUEST');

-- CreateEnum
CREATE TYPE "ProviderSelectionStatus" AS ENUM ('SELECTED', 'INVITED', 'VIEWED', 'RESPONDED', 'DECLINED', 'REMOVED', 'AWARDED');

-- CreateEnum
CREATE TYPE "AssignmentResolutionType" AS ENUM ('PROVIDER_AWARDED', 'EXTERNAL_REFERRAL', 'SELF_HANDLED');

-- CreateEnum
CREATE TYPE "CreditTransactionType" AS ENUM ('PURCHASE', 'SPEND', 'REFUND', 'ADMIN_ADJUSTMENT', 'EXPIRATION');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" TEXT NOT NULL,
    "displayName" TEXT,
    "platformRole" "PlatformRole" NOT NULL DEFAULT 'USER',
    "status" "UserStatus" NOT NULL DEFAULT 'INVITED',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "archivedAt" TIMESTAMPTZ(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Organization" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "tradeName" TEXT,
    "chamberOfCommerceNumber" TEXT,
    "organizationType" "OrganizationType" NOT NULL,
    "status" "OrganizationStatus" NOT NULL DEFAULT 'PENDING',
    "website" TEXT,
    "phone" TEXT,
    "generalEmail" TEXT,
    "employeeCount" INTEGER,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "archivedAt" TIMESTAMPTZ(3),

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationMembership" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "role" "OrganizationMembershipRole" NOT NULL,
    "status" "MembershipStatus" NOT NULL DEFAULT 'INVITED',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "OrganizationMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationLocation" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "label" TEXT NOT NULL,
    "addressLine" TEXT NOT NULL,
    "postalCode" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "province" TEXT,
    "countryCode" CHAR(2) NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "archivedAt" TIMESTAMPTZ(3),

    CONSTRAINT "OrganizationLocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sector" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Sector_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationSector" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "sectorId" UUID NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrganizationSector_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Specialism" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "parentId" UUID,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Specialism_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderProfile" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "approvalStatus" "ProviderApprovalStatus" NOT NULL DEFAULT 'DRAFT',
    "approvedAt" TIMESTAMPTZ(3),
    "approvedByUserId" UUID,
    "rejectionReason" TEXT,
    "description" TEXT,
    "maxTravelDistanceKm" INTEGER,
    "acceptsRemoteWork" BOOLEAN NOT NULL DEFAULT false,
    "isAvailable" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "archivedAt" TIMESTAMPTZ(3),

    CONSTRAINT "ProviderProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderSpecialism" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "providerProfileId" UUID NOT NULL,
    "specialismId" UUID NOT NULL,
    "experienceYears" INTEGER,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "ProviderSpecialism_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderSector" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "providerProfileId" UUID NOT NULL,
    "sectorId" UUID NOT NULL,
    "experienceYears" INTEGER,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "ProviderSector_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Certification" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "issuer" TEXT,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Certification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderCertification" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "providerProfileId" UUID NOT NULL,
    "certificationId" UUID NOT NULL,
    "certificateNumber" TEXT,
    "issuedAt" DATE,
    "expiresAt" DATE,
    "verificationStatus" "CertificationVerificationStatus" NOT NULL DEFAULT 'UNVERIFIED',
    "verifiedAt" TIMESTAMPTZ(3),
    "verifiedByUserId" UUID,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "archivedAt" TIMESTAMPTZ(3),

    CONSTRAINT "ProviderCertification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Intake" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "clientOrganizationId" UUID,
    "createdByUserId" UUID,
    "freeText" TEXT NOT NULL,
    "status" "IntakeStatus" NOT NULL DEFAULT 'DRAFT',
    "detectedSpecialismId" UUID,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "submittedAt" TIMESTAMPTZ(3),
    "archivedAt" TIMESTAMPTZ(3),

    CONSTRAINT "Intake_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Assignment" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "intakeId" UUID,
    "clientOrganizationId" UUID NOT NULL,
    "createdByUserId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "AssignmentStatus" NOT NULL DEFAULT 'DRAFT',
    "primarySpecialismId" UUID,
    "sectorId" UUID,
    "employeeCount" INTEGER,
    "desiredStartDate" DATE,
    "responseDeadline" TIMESTAMPTZ(3),
    "locationId" UUID,
    "allowsRemoteWork" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "publishedAt" TIMESTAMPTZ(3),
    "closedAt" TIMESTAMPTZ(3),
    "archivedAt" TIMESTAMPTZ(3),

    CONSTRAINT "Assignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssignmentSpecialism" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "assignmentId" UUID NOT NULL,
    "specialismId" UUID NOT NULL,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssignmentSpecialism_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssignmentProviderSelection" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "assignmentId" UUID NOT NULL,
    "providerProfileId" UUID NOT NULL,
    "source" "ProviderSelectionSource" NOT NULL,
    "status" "ProviderSelectionStatus" NOT NULL DEFAULT 'SELECTED',
    "score" DECIMAL(5,2),
    "scoreDetails" JSONB,
    "selectedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "selectedByUserId" UUID,
    "respondedAt" TIMESTAMPTZ(3),
    "declinedAt" TIMESTAMPTZ(3),
    "removedAt" TIMESTAMPTZ(3),
    "removalReason" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "AssignmentProviderSelection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssignmentResolution" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "assignmentId" UUID NOT NULL,
    "type" "AssignmentResolutionType" NOT NULL,
    "providerProfileId" UUID,
    "decidedByUserId" UUID,
    "externalPartyName" TEXT,
    "notes" TEXT,
    "decidedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssignmentResolution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminActionLog" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "actorUserId" UUID NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" UUID NOT NULL,
    "reason" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminActionLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreditAccount" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "balance" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "CreditAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreditTransaction" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "creditAccountId" UUID NOT NULL,
    "type" "CreditTransactionType" NOT NULL,
    "amount" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "referenceType" TEXT,
    "referenceId" UUID,
    "description" TEXT,
    "createdByUserId" UUID,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CreditTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_status_idx" ON "User"("status");

-- CreateIndex
CREATE INDEX "User_createdAt_idx" ON "User"("createdAt");

-- CreateIndex
CREATE INDEX "Organization_organizationType_idx" ON "Organization"("organizationType");

-- CreateIndex
CREATE INDEX "Organization_status_idx" ON "Organization"("status");

-- CreateIndex
CREATE INDEX "Organization_createdAt_idx" ON "Organization"("createdAt");

-- CreateIndex
CREATE INDEX "OrganizationMembership_userId_idx" ON "OrganizationMembership"("userId");

-- CreateIndex
CREATE INDEX "OrganizationMembership_organizationId_idx" ON "OrganizationMembership"("organizationId");

-- CreateIndex
CREATE INDEX "OrganizationMembership_status_idx" ON "OrganizationMembership"("status");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationMembership_userId_organizationId_key" ON "OrganizationMembership"("userId", "organizationId");

-- CreateIndex
CREATE INDEX "OrganizationLocation_organizationId_idx" ON "OrganizationLocation"("organizationId");

-- CreateIndex
CREATE INDEX "OrganizationLocation_city_idx" ON "OrganizationLocation"("city");

-- CreateIndex
CREATE INDEX "OrganizationLocation_archivedAt_idx" ON "OrganizationLocation"("archivedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Sector_slug_key" ON "Sector"("slug");

-- CreateIndex
CREATE INDEX "Sector_isActive_idx" ON "Sector"("isActive");

-- CreateIndex
CREATE INDEX "OrganizationSector_organizationId_idx" ON "OrganizationSector"("organizationId");

-- CreateIndex
CREATE INDEX "OrganizationSector_sectorId_idx" ON "OrganizationSector"("sectorId");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationSector_organizationId_sectorId_key" ON "OrganizationSector"("organizationId", "sectorId");

-- CreateIndex
CREATE UNIQUE INDEX "Specialism_slug_key" ON "Specialism"("slug");

-- CreateIndex
CREATE INDEX "Specialism_parentId_idx" ON "Specialism"("parentId");

-- CreateIndex
CREATE INDEX "Specialism_isActive_idx" ON "Specialism"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "ProviderProfile_organizationId_key" ON "ProviderProfile"("organizationId");

-- CreateIndex
CREATE INDEX "ProviderProfile_approvalStatus_idx" ON "ProviderProfile"("approvalStatus");

-- CreateIndex
CREATE INDEX "ProviderProfile_isAvailable_idx" ON "ProviderProfile"("isAvailable");

-- CreateIndex
CREATE INDEX "ProviderProfile_archivedAt_idx" ON "ProviderProfile"("archivedAt");

-- CreateIndex
CREATE INDEX "ProviderSpecialism_providerProfileId_idx" ON "ProviderSpecialism"("providerProfileId");

-- CreateIndex
CREATE INDEX "ProviderSpecialism_specialismId_idx" ON "ProviderSpecialism"("specialismId");

-- CreateIndex
CREATE UNIQUE INDEX "ProviderSpecialism_providerProfileId_specialismId_key" ON "ProviderSpecialism"("providerProfileId", "specialismId");

-- CreateIndex
CREATE INDEX "ProviderSector_providerProfileId_idx" ON "ProviderSector"("providerProfileId");

-- CreateIndex
CREATE INDEX "ProviderSector_sectorId_idx" ON "ProviderSector"("sectorId");

-- CreateIndex
CREATE UNIQUE INDEX "ProviderSector_providerProfileId_sectorId_key" ON "ProviderSector"("providerProfileId", "sectorId");

-- CreateIndex
CREATE UNIQUE INDEX "Certification_slug_key" ON "Certification"("slug");

-- CreateIndex
CREATE INDEX "Certification_isActive_idx" ON "Certification"("isActive");

-- CreateIndex
CREATE INDEX "ProviderCertification_providerProfileId_idx" ON "ProviderCertification"("providerProfileId");

-- CreateIndex
CREATE INDEX "ProviderCertification_certificationId_idx" ON "ProviderCertification"("certificationId");

-- CreateIndex
CREATE INDEX "ProviderCertification_verificationStatus_idx" ON "ProviderCertification"("verificationStatus");

-- CreateIndex
CREATE INDEX "ProviderCertification_expiresAt_idx" ON "ProviderCertification"("expiresAt");

-- CreateIndex
CREATE INDEX "ProviderCertification_archivedAt_idx" ON "ProviderCertification"("archivedAt");

-- CreateIndex
CREATE INDEX "Intake_clientOrganizationId_idx" ON "Intake"("clientOrganizationId");

-- CreateIndex
CREATE INDEX "Intake_createdByUserId_idx" ON "Intake"("createdByUserId");

-- CreateIndex
CREATE INDEX "Intake_status_idx" ON "Intake"("status");

-- CreateIndex
CREATE INDEX "Intake_createdAt_idx" ON "Intake"("createdAt");

-- CreateIndex
CREATE INDEX "Intake_archivedAt_idx" ON "Intake"("archivedAt");

-- CreateIndex
CREATE INDEX "Assignment_intakeId_idx" ON "Assignment"("intakeId");

-- CreateIndex
CREATE INDEX "Assignment_clientOrganizationId_idx" ON "Assignment"("clientOrganizationId");

-- CreateIndex
CREATE INDEX "Assignment_createdByUserId_idx" ON "Assignment"("createdByUserId");

-- CreateIndex
CREATE INDEX "Assignment_status_idx" ON "Assignment"("status");

-- CreateIndex
CREATE INDEX "Assignment_primarySpecialismId_idx" ON "Assignment"("primarySpecialismId");

-- CreateIndex
CREATE INDEX "Assignment_sectorId_idx" ON "Assignment"("sectorId");

-- CreateIndex
CREATE INDEX "Assignment_locationId_idx" ON "Assignment"("locationId");

-- CreateIndex
CREATE INDEX "Assignment_createdAt_idx" ON "Assignment"("createdAt");

-- CreateIndex
CREATE INDEX "Assignment_responseDeadline_idx" ON "Assignment"("responseDeadline");

-- CreateIndex
CREATE INDEX "Assignment_archivedAt_idx" ON "Assignment"("archivedAt");

-- CreateIndex
CREATE INDEX "AssignmentSpecialism_assignmentId_idx" ON "AssignmentSpecialism"("assignmentId");

-- CreateIndex
CREATE INDEX "AssignmentSpecialism_specialismId_idx" ON "AssignmentSpecialism"("specialismId");

-- CreateIndex
CREATE UNIQUE INDEX "AssignmentSpecialism_assignmentId_specialismId_key" ON "AssignmentSpecialism"("assignmentId", "specialismId");

-- CreateIndex
CREATE INDEX "AssignmentProviderSelection_assignmentId_idx" ON "AssignmentProviderSelection"("assignmentId");

-- CreateIndex
CREATE INDEX "AssignmentProviderSelection_providerProfileId_idx" ON "AssignmentProviderSelection"("providerProfileId");

-- CreateIndex
CREATE INDEX "AssignmentProviderSelection_status_idx" ON "AssignmentProviderSelection"("status");

-- CreateIndex
CREATE INDEX "AssignmentProviderSelection_source_idx" ON "AssignmentProviderSelection"("source");

-- CreateIndex
CREATE INDEX "AssignmentProviderSelection_selectedAt_idx" ON "AssignmentProviderSelection"("selectedAt");

-- CreateIndex
CREATE UNIQUE INDEX "AssignmentProviderSelection_assignmentId_providerProfileId_key" ON "AssignmentProviderSelection"("assignmentId", "providerProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "AssignmentResolution_assignmentId_key" ON "AssignmentResolution"("assignmentId");

-- CreateIndex
CREATE INDEX "AssignmentResolution_type_idx" ON "AssignmentResolution"("type");

-- CreateIndex
CREATE INDEX "AssignmentResolution_providerProfileId_idx" ON "AssignmentResolution"("providerProfileId");

-- CreateIndex
CREATE INDEX "AssignmentResolution_decidedAt_idx" ON "AssignmentResolution"("decidedAt");

-- CreateIndex
CREATE INDEX "AdminActionLog_actorUserId_idx" ON "AdminActionLog"("actorUserId");

-- CreateIndex
CREATE INDEX "AdminActionLog_entityType_entityId_idx" ON "AdminActionLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AdminActionLog_createdAt_idx" ON "AdminActionLog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CreditAccount_organizationId_key" ON "CreditAccount"("organizationId");

-- CreateIndex
CREATE INDEX "CreditTransaction_creditAccountId_idx" ON "CreditTransaction"("creditAccountId");

-- CreateIndex
CREATE INDEX "CreditTransaction_type_idx" ON "CreditTransaction"("type");

-- CreateIndex
CREATE INDEX "CreditTransaction_createdByUserId_idx" ON "CreditTransaction"("createdByUserId");

-- CreateIndex
CREATE INDEX "CreditTransaction_createdAt_idx" ON "CreditTransaction"("createdAt");

-- CreateIndex
CREATE INDEX "CreditTransaction_referenceType_referenceId_idx" ON "CreditTransaction"("referenceType", "referenceId");

-- AddForeignKey
ALTER TABLE "OrganizationMembership" ADD CONSTRAINT "OrganizationMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationMembership" ADD CONSTRAINT "OrganizationMembership_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationLocation" ADD CONSTRAINT "OrganizationLocation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationSector" ADD CONSTRAINT "OrganizationSector_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationSector" ADD CONSTRAINT "OrganizationSector_sectorId_fkey" FOREIGN KEY ("sectorId") REFERENCES "Sector"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Specialism" ADD CONSTRAINT "Specialism_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Specialism"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderProfile" ADD CONSTRAINT "ProviderProfile_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderProfile" ADD CONSTRAINT "ProviderProfile_approvedByUserId_fkey" FOREIGN KEY ("approvedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderSpecialism" ADD CONSTRAINT "ProviderSpecialism_providerProfileId_fkey" FOREIGN KEY ("providerProfileId") REFERENCES "ProviderProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderSpecialism" ADD CONSTRAINT "ProviderSpecialism_specialismId_fkey" FOREIGN KEY ("specialismId") REFERENCES "Specialism"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderSector" ADD CONSTRAINT "ProviderSector_providerProfileId_fkey" FOREIGN KEY ("providerProfileId") REFERENCES "ProviderProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderSector" ADD CONSTRAINT "ProviderSector_sectorId_fkey" FOREIGN KEY ("sectorId") REFERENCES "Sector"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderCertification" ADD CONSTRAINT "ProviderCertification_providerProfileId_fkey" FOREIGN KEY ("providerProfileId") REFERENCES "ProviderProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderCertification" ADD CONSTRAINT "ProviderCertification_certificationId_fkey" FOREIGN KEY ("certificationId") REFERENCES "Certification"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderCertification" ADD CONSTRAINT "ProviderCertification_verifiedByUserId_fkey" FOREIGN KEY ("verifiedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Intake" ADD CONSTRAINT "Intake_clientOrganizationId_fkey" FOREIGN KEY ("clientOrganizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Intake" ADD CONSTRAINT "Intake_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Intake" ADD CONSTRAINT "Intake_detectedSpecialismId_fkey" FOREIGN KEY ("detectedSpecialismId") REFERENCES "Specialism"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_intakeId_fkey" FOREIGN KEY ("intakeId") REFERENCES "Intake"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_clientOrganizationId_fkey" FOREIGN KEY ("clientOrganizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_primarySpecialismId_fkey" FOREIGN KEY ("primarySpecialismId") REFERENCES "Specialism"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_sectorId_fkey" FOREIGN KEY ("sectorId") REFERENCES "Sector"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "OrganizationLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignmentSpecialism" ADD CONSTRAINT "AssignmentSpecialism_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "Assignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignmentSpecialism" ADD CONSTRAINT "AssignmentSpecialism_specialismId_fkey" FOREIGN KEY ("specialismId") REFERENCES "Specialism"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignmentProviderSelection" ADD CONSTRAINT "AssignmentProviderSelection_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "Assignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignmentProviderSelection" ADD CONSTRAINT "AssignmentProviderSelection_providerProfileId_fkey" FOREIGN KEY ("providerProfileId") REFERENCES "ProviderProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignmentProviderSelection" ADD CONSTRAINT "AssignmentProviderSelection_selectedByUserId_fkey" FOREIGN KEY ("selectedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignmentResolution" ADD CONSTRAINT "AssignmentResolution_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "Assignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignmentResolution" ADD CONSTRAINT "AssignmentResolution_providerProfileId_fkey" FOREIGN KEY ("providerProfileId") REFERENCES "ProviderProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignmentResolution" ADD CONSTRAINT "AssignmentResolution_decidedByUserId_fkey" FOREIGN KEY ("decidedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminActionLog" ADD CONSTRAINT "AdminActionLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditAccount" ADD CONSTRAINT "CreditAccount_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditTransaction" ADD CONSTRAINT "CreditTransaction_creditAccountId_fkey" FOREIGN KEY ("creditAccountId") REFERENCES "CreditAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditTransaction" ADD CONSTRAINT "CreditTransaction_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CheckConstraint
ALTER TABLE "Organization" ADD CONSTRAINT "Organization_employeeCount_check" CHECK ("employeeCount" IS NULL OR "employeeCount" >= 0);

-- CheckConstraint
ALTER TABLE "OrganizationLocation" ADD CONSTRAINT "OrganizationLocation_countryCode_check" CHECK ("countryCode" ~ '^[A-Z]{2}$');

-- CheckConstraint
ALTER TABLE "ProviderProfile" ADD CONSTRAINT "ProviderProfile_maxTravelDistanceKm_check" CHECK ("maxTravelDistanceKm" IS NULL OR "maxTravelDistanceKm" >= 0);

-- CheckConstraint
ALTER TABLE "ProviderSpecialism" ADD CONSTRAINT "ProviderSpecialism_experienceYears_check" CHECK ("experienceYears" IS NULL OR "experienceYears" >= 0);

-- CheckConstraint
ALTER TABLE "ProviderSector" ADD CONSTRAINT "ProviderSector_experienceYears_check" CHECK ("experienceYears" IS NULL OR "experienceYears" >= 0);

-- CheckConstraint
ALTER TABLE "ProviderCertification" ADD CONSTRAINT "ProviderCertification_dates_check" CHECK ("issuedAt" IS NULL OR "expiresAt" IS NULL OR "expiresAt" >= "issuedAt");

-- CheckConstraint
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_employeeCount_check" CHECK ("employeeCount" IS NULL OR "employeeCount" >= 0);

-- CheckConstraint
ALTER TABLE "AssignmentProviderSelection" ADD CONSTRAINT "AssignmentProviderSelection_score_check" CHECK ("score" IS NULL OR ("score" >= 0 AND "score" <= 100));

-- CheckConstraint
ALTER TABLE "AssignmentResolution" ADD CONSTRAINT "AssignmentResolution_fields_check" CHECK (
  ("type" = 'PROVIDER_AWARDED' AND "providerProfileId" IS NOT NULL AND "externalPartyName" IS NULL)
  OR ("type" = 'EXTERNAL_REFERRAL' AND "providerProfileId" IS NULL AND NULLIF(BTRIM("externalPartyName"), '') IS NOT NULL)
  OR ("type" = 'SELF_HANDLED' AND "providerProfileId" IS NULL AND "externalPartyName" IS NULL)
);

-- CheckConstraint
ALTER TABLE "CreditAccount" ADD CONSTRAINT "CreditAccount_balance_check" CHECK ("balance" >= 0);

-- CheckConstraint
ALTER TABLE "CreditTransaction" ADD CONSTRAINT "CreditTransaction_amount_check" CHECK ("amount" <> 0);

-- CheckConstraint
ALTER TABLE "CreditTransaction" ADD CONSTRAINT "CreditTransaction_balanceAfter_check" CHECK ("balanceAfter" >= 0);
