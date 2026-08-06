-- CreateEnum
CREATE TYPE "KnowledgeSourceType" AS ENUM ('AI_SHEET', 'LEGISLATION', 'REGULATION', 'INSPECTORATE_GUIDANCE', 'ARBOCATALOGUE', 'STANDARD', 'RESEARCH', 'PROFESSIONAL_GUIDANCE', 'INTERNAL_EXPERTISE', 'CASE_LAW', 'OTHER');

-- CreateEnum
CREATE TYPE "KnowledgeSourceFormat" AS ENUM ('PDF', 'LEGACY_DOC');

-- CreateEnum
CREATE TYPE "KnowledgeCopyrightClassification" AS ENUM ('PUBLIC_DOMAIN', 'OPEN_LICENSE', 'RESTRICTED_REFERENCE_ONLY', 'INTERNAL', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "KnowledgeAuthorityLevel" AS ENUM ('PRIMARY_LEGAL', 'OFFICIAL_GUIDANCE', 'CONSENSUS_STANDARD', 'PROFESSIONAL_GUIDANCE', 'RESEARCH', 'INTERNAL', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "KnowledgeTemporalStatus" AS ENUM ('UNKNOWN', 'CURRENT', 'HISTORICAL', 'SUPERSEDED', 'WITHDRAWN', 'UNDER_REVIEW');

-- CreateEnum
CREATE TYPE "KnowledgeExtractionStatus" AS ENUM ('NOT_STARTED', 'READY', 'EXTRACTED', 'UNSUPPORTED_FOR_EXTRACTION', 'FAILED');

-- CreateEnum
CREATE TYPE "KnowledgeReviewStatus" AS ENUM ('NOT_REVIEWED', 'REVIEW_REQUIRED', 'IN_REVIEW', 'REVIEWED', 'REJECTED');

-- CreateEnum
CREATE TYPE "KnowledgeTopicStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "KnowledgeDomain" AS ENUM ('POLICY_AND_MANAGEMENT', 'ERGONOMICS', 'HAZARDOUS_SUBSTANCES', 'NOISE', 'CONFINED_SPACES', 'EMERGENCY_RESPONSE', 'PPE', 'OCCUPATIONAL_HEALTH', 'MACHINERY', 'MEASUREMENT', 'LEGAL', 'OTHER');

-- CreateEnum
CREATE TYPE "KnowledgeClaimType" AS ENUM ('DEFINITION', 'HAZARD', 'RISK', 'HEALTH_EFFECT', 'LEGAL_REQUIREMENT', 'PROHIBITION', 'THRESHOLD', 'RECOMMENDATION', 'CONTROL_MEASURE', 'RESPONSIBILITY', 'ROLE', 'EXCEPTION', 'CONDITION', 'PROCEDURAL_STEP', 'INSPECTION_POINT', 'MEASUREMENT_REQUIREMENT', 'RECORD_RETENTION', 'TRAINING_REQUIREMENT', 'PPE_REQUIREMENT', 'EMERGENCY_REQUIREMENT', 'OTHER');

-- CreateEnum
CREATE TYPE "KnowledgeValidationStatus" AS ENUM ('UNVALIDATED', 'PARTIALLY_VALIDATED', 'VALIDATED', 'CONFLICTING', 'REJECTED', 'EXPIRED', 'REVIEW_REQUIRED');

-- CreateEnum
CREATE TYPE "KnowledgePublicationStatus" AS ENUM ('DRAFT', 'INTERNAL_REVIEW', 'APPROVED', 'PUBLISHED', 'ARCHIVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "KnowledgeConfidenceLevel" AS ENUM ('UNKNOWN', 'LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "KnowledgeSupportType" AS ENUM ('DIRECT_SUPPORT', 'PARTIAL_SUPPORT', 'CONTEXT', 'CONTRADICTS', 'SUPERSEDES', 'HISTORICAL_ORIGIN');

-- CreateEnum
CREATE TYPE "KnowledgeValidationMethod" AS ENUM ('HUMAN_EXPERT_REVIEW', 'CROSS_SOURCE_CHECK', 'LEGAL_SOURCE_CHECK', 'AUTOMATED_CONSISTENCY_CHECK', 'EDITORIAL_REVIEW');

-- CreateEnum
CREATE TYPE "KnowledgeValidatorType" AS ENUM ('HUMAN', 'SYSTEM');

-- CreateEnum
CREATE TYPE "KnowledgeRelationType" AS ENUM ('IS_A', 'PART_OF', 'CAUSES', 'MAY_CAUSE', 'PREVENTS', 'MITIGATES', 'REQUIRES', 'PROHIBITS', 'APPLIES_TO', 'MEASURED_BY', 'CONTROLLED_BY', 'RELEVANT_TO', 'SUPERSEDES', 'CONFLICTS_WITH', 'IMPLEMENTED_BY', 'PERFORMED_BY', 'TRIGGERS', 'INPUT_FOR', 'OUTPUT_OF');

-- CreateEnum
CREATE TYPE "KnowledgeRuleType" AS ENUM ('DECISION_RULE', 'ELIGIBILITY_RULE', 'CLASSIFICATION_RULE', 'COMPLIANCE_RULE', 'WARNING_RULE', 'ROUTING_RULE');

-- CreateEnum
CREATE TYPE "KnowledgeAccessTier" AS ENUM ('PUBLIC_BASIC', 'REGISTERED_BASIC', 'PROFESSIONAL_PRO', 'ORGANIZATION_BUSINESS', 'INTERNAL_REVIEWER', 'PLATFORM_ADMIN');

-- CreateEnum
CREATE TYPE "KnowledgeChecklistAnswerType" AS ENUM ('YES_NO', 'SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'NUMBER', 'TEXT', 'NOT_APPLICABLE');

-- CreateEnum
CREATE TYPE "KnowledgeReviewPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "KnowledgeReviewTaskStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "KnowledgeAuditEventType" AS ENUM ('SOURCE_REGISTERED', 'SOURCE_VERSION_ADDED', 'EXTRACTION_STARTED', 'EXTRACTION_COMPLETED', 'EXTRACTION_FAILED', 'CLAIM_CREATED', 'CLAIM_UPDATED', 'VALIDATION_ADDED', 'VALIDATION_REVOKED', 'CLAIM_APPROVED', 'CLAIM_PUBLISHED', 'CLAIM_ARCHIVED', 'CONFLICT_DETECTED', 'IMPORT_STARTED', 'IMPORT_COMPLETED', 'IMPORT_FAILED');

-- CreateTable
CREATE TABLE "KnowledgeSource" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "sourceType" "KnowledgeSourceType" NOT NULL,
    "sourceFormat" "KnowledgeSourceFormat" NOT NULL,
    "code" VARCHAR(80) NOT NULL,
    "title" VARCHAR(300) NOT NULL,
    "publisher" VARCHAR(200),
    "publicationDate" DATE,
    "edition" VARCHAR(120),
    "language" VARCHAR(12) NOT NULL DEFAULT 'nl',
    "jurisdiction" VARCHAR(40) NOT NULL DEFAULT 'NL',
    "sourceUrl" VARCHAR(1000),
    "localReference" VARCHAR(200),
    "copyrightClassification" "KnowledgeCopyrightClassification" NOT NULL,
    "authorityLevel" "KnowledgeAuthorityLevel" NOT NULL,
    "temporalStatus" "KnowledgeTemporalStatus" NOT NULL DEFAULT 'UNKNOWN',
    "sourceFamily" VARCHAR(120) NOT NULL,
    "independenceGroup" VARCHAR(120) NOT NULL,
    "isPrimarySource" BOOLEAN NOT NULL DEFAULT false,
    "notes" VARCHAR(1000),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "KnowledgeSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowledgeSourceVersion" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "sourceId" UUID NOT NULL,
    "versionLabel" VARCHAR(120) NOT NULL,
    "publicationDate" DATE,
    "validFrom" DATE,
    "validUntil" DATE,
    "checksum" VARCHAR(64),
    "extractionStatus" "KnowledgeExtractionStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "reviewStatus" "KnowledgeReviewStatus" NOT NULL DEFAULT 'NOT_REVIEWED',
    "importedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "KnowledgeSourceVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowledgeFragment" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "externalKey" VARCHAR(160) NOT NULL,
    "sourceVersionId" UUID NOT NULL,
    "pageFrom" INTEGER,
    "pageTo" INTEGER,
    "sectionPath" VARCHAR(500),
    "fragmentType" VARCHAR(80) NOT NULL,
    "internalExcerpt" VARCHAR(500),
    "excerptHash" VARCHAR(64),
    "extractionMethod" VARCHAR(80) NOT NULL,
    "requiresReview" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KnowledgeFragment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowledgeTopic" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "slug" VARCHAR(160) NOT NULL,
    "title" VARCHAR(240) NOT NULL,
    "description" VARCHAR(1000) NOT NULL,
    "domain" "KnowledgeDomain" NOT NULL,
    "parentTopicId" UUID,
    "status" "KnowledgeTopicStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "KnowledgeTopic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowledgeClaim" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "externalKey" VARCHAR(160) NOT NULL,
    "topicId" UUID NOT NULL,
    "claimType" "KnowledgeClaimType" NOT NULL,
    "statement" VARCHAR(1500) NOT NULL,
    "normalizedStatement" VARCHAR(1500),
    "applicability" VARCHAR(1000) NOT NULL,
    "jurisdiction" VARCHAR(40) NOT NULL DEFAULT 'NL',
    "validFrom" DATE,
    "validUntil" DATE,
    "temporalStatus" "KnowledgeTemporalStatus" NOT NULL DEFAULT 'UNKNOWN',
    "validationStatus" "KnowledgeValidationStatus" NOT NULL DEFAULT 'UNVALIDATED',
    "publicationStatus" "KnowledgePublicationStatus" NOT NULL DEFAULT 'DRAFT',
    "confidenceLevel" "KnowledgeConfidenceLevel" NOT NULL DEFAULT 'UNKNOWN',
    "accessTier" "KnowledgeAccessTier" NOT NULL DEFAULT 'INTERNAL_REVIEWER',
    "copyrightCheckPassed" BOOLEAN NOT NULL DEFAULT false,
    "nextReviewAt" TIMESTAMPTZ(3),
    "createdByActor" VARCHAR(80) NOT NULL,
    "createdByUserId" UUID,
    "reviewedByUserId" UUID,
    "reviewedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "KnowledgeClaim_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowledgeCitation" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "claimId" UUID NOT NULL,
    "sourceVersionId" UUID NOT NULL,
    "fragmentId" UUID,
    "supportType" "KnowledgeSupportType" NOT NULL,
    "citationNote" VARCHAR(500),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KnowledgeCitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowledgeValidation" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "claimId" UUID NOT NULL,
    "validationMethod" "KnowledgeValidationMethod" NOT NULL,
    "status" "KnowledgeValidationStatus" NOT NULL,
    "validatorType" "KnowledgeValidatorType" NOT NULL,
    "validatorUserId" UUID,
    "rationale" VARCHAR(1500) NOT NULL,
    "validatedAt" TIMESTAMPTZ(3) NOT NULL,
    "nextReviewAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "KnowledgeValidation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowledgeRelation" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "externalKey" VARCHAR(160) NOT NULL,
    "fromTopicId" UUID,
    "fromClaimId" UUID,
    "toTopicId" UUID,
    "toClaimId" UUID,
    "relationType" "KnowledgeRelationType" NOT NULL,
    "rationale" VARCHAR(1000),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KnowledgeRelation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowledgeRule" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" VARCHAR(120) NOT NULL,
    "title" VARCHAR(240) NOT NULL,
    "description" VARCHAR(1000) NOT NULL,
    "ruleType" "KnowledgeRuleType" NOT NULL,
    "ruleVersion" INTEGER NOT NULL,
    "inputSchema" JSONB NOT NULL,
    "expression" JSONB NOT NULL,
    "outputSchema" JSONB NOT NULL,
    "validationStatus" "KnowledgeValidationStatus" NOT NULL DEFAULT 'UNVALIDATED',
    "publicationStatus" "KnowledgePublicationStatus" NOT NULL DEFAULT 'DRAFT',
    "accessTier" "KnowledgeAccessTier" NOT NULL DEFAULT 'INTERNAL_REVIEWER',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "KnowledgeRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowledgeCalculation" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" VARCHAR(120) NOT NULL,
    "title" VARCHAR(240) NOT NULL,
    "description" VARCHAR(1000) NOT NULL,
    "calculationType" VARCHAR(80) NOT NULL,
    "calculationVersion" INTEGER NOT NULL,
    "inputSchema" JSONB NOT NULL,
    "formulaRepresentation" JSONB NOT NULL,
    "outputSchema" JSONB NOT NULL,
    "unitDefinitions" JSONB NOT NULL,
    "limitations" VARCHAR(1500) NOT NULL,
    "validationStatus" "KnowledgeValidationStatus" NOT NULL DEFAULT 'UNVALIDATED',
    "publicationStatus" "KnowledgePublicationStatus" NOT NULL DEFAULT 'DRAFT',
    "accessTier" "KnowledgeAccessTier" NOT NULL DEFAULT 'INTERNAL_REVIEWER',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "KnowledgeCalculation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowledgeChecklist" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" VARCHAR(120) NOT NULL,
    "version" INTEGER NOT NULL,
    "title" VARCHAR(240) NOT NULL,
    "description" VARCHAR(1000) NOT NULL,
    "topicId" UUID NOT NULL,
    "audience" "KnowledgeAccessTier" NOT NULL,
    "scoringMethod" VARCHAR(80) NOT NULL,
    "validationStatus" "KnowledgeValidationStatus" NOT NULL DEFAULT 'UNVALIDATED',
    "publicationStatus" "KnowledgePublicationStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "KnowledgeChecklist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowledgeChecklistItem" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "checklistId" UUID NOT NULL,
    "order" INTEGER NOT NULL,
    "question" VARCHAR(1000) NOT NULL,
    "answerType" "KnowledgeChecklistAnswerType" NOT NULL,
    "answerOptions" JSONB,
    "scoreRules" JSONB,
    "explanationClaimId" UUID,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "KnowledgeChecklistItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowledgeProcedure" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" VARCHAR(120) NOT NULL,
    "version" INTEGER NOT NULL,
    "title" VARCHAR(240) NOT NULL,
    "description" VARCHAR(1000) NOT NULL,
    "topicId" UUID NOT NULL,
    "audience" "KnowledgeAccessTier" NOT NULL,
    "prerequisites" JSONB NOT NULL,
    "validationStatus" "KnowledgeValidationStatus" NOT NULL DEFAULT 'UNVALIDATED',
    "publicationStatus" "KnowledgePublicationStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "KnowledgeProcedure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowledgeProcedureStep" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "procedureId" UUID NOT NULL,
    "order" INTEGER NOT NULL,
    "title" VARCHAR(240) NOT NULL,
    "instruction" VARCHAR(1500) NOT NULL,
    "conditionRuleId" UUID,
    "responsibleRoleId" UUID,
    "evidenceRequired" VARCHAR(500),
    "warningClaimId" UUID,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "KnowledgeProcedureStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowledgeRole" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" VARCHAR(120) NOT NULL,
    "title" VARCHAR(240) NOT NULL,
    "description" VARCHAR(1000) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "KnowledgeRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowledgeResponsibility" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "roleId" UUID NOT NULL,
    "claimId" UUID,
    "procedureId" UUID,
    "procedureStepId" UUID,
    "description" VARCHAR(1000) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KnowledgeResponsibility_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowledgeFormTemplate" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" VARCHAR(120) NOT NULL,
    "title" VARCHAR(240) NOT NULL,
    "description" VARCHAR(1000) NOT NULL,
    "topicId" UUID NOT NULL,
    "schemaVersion" INTEGER NOT NULL,
    "formSchema" JSONB NOT NULL,
    "validationStatus" "KnowledgeValidationStatus" NOT NULL DEFAULT 'UNVALIDATED',
    "publicationStatus" "KnowledgePublicationStatus" NOT NULL DEFAULT 'DRAFT',
    "accessTier" "KnowledgeAccessTier" NOT NULL DEFAULT 'INTERNAL_REVIEWER',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "KnowledgeFormTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowledgeReviewTask" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "entityType" VARCHAR(80) NOT NULL,
    "entityId" UUID NOT NULL,
    "reviewReason" VARCHAR(1000) NOT NULL,
    "priority" "KnowledgeReviewPriority" NOT NULL DEFAULT 'NORMAL',
    "status" "KnowledgeReviewTaskStatus" NOT NULL DEFAULT 'OPEN',
    "assignedToId" UUID,
    "dueAt" TIMESTAMPTZ(3),
    "completedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "KnowledgeReviewTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowledgeAuditEvent" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "eventType" "KnowledgeAuditEventType" NOT NULL,
    "entityType" VARCHAR(80) NOT NULL,
    "entityId" UUID,
    "actorUserId" UUID,
    "actorType" VARCHAR(80) NOT NULL,
    "result" VARCHAR(80) NOT NULL,
    "reason" VARCHAR(1000),
    "metadata" JSONB,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KnowledgeAuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "KnowledgeSource_code_key" ON "KnowledgeSource"("code");

-- CreateIndex
CREATE INDEX "KnowledgeSource_sourceType_temporalStatus_idx" ON "KnowledgeSource"("sourceType", "temporalStatus");

-- CreateIndex
CREATE INDEX "KnowledgeSource_sourceFamily_independenceGroup_idx" ON "KnowledgeSource"("sourceFamily", "independenceGroup");

-- CreateIndex
CREATE INDEX "KnowledgeSource_authorityLevel_idx" ON "KnowledgeSource"("authorityLevel");

-- CreateIndex
CREATE INDEX "KnowledgeSourceVersion_checksum_idx" ON "KnowledgeSourceVersion"("checksum");

-- CreateIndex
CREATE INDEX "KnowledgeSourceVersion_extractionStatus_reviewStatus_idx" ON "KnowledgeSourceVersion"("extractionStatus", "reviewStatus");

-- CreateIndex
CREATE UNIQUE INDEX "KnowledgeSourceVersion_sourceId_versionLabel_key" ON "KnowledgeSourceVersion"("sourceId", "versionLabel");

-- CreateIndex
CREATE UNIQUE INDEX "KnowledgeFragment_externalKey_key" ON "KnowledgeFragment"("externalKey");

-- CreateIndex
CREATE INDEX "KnowledgeFragment_sourceVersionId_pageFrom_idx" ON "KnowledgeFragment"("sourceVersionId", "pageFrom");

-- CreateIndex
CREATE INDEX "KnowledgeFragment_requiresReview_idx" ON "KnowledgeFragment"("requiresReview");

-- CreateIndex
CREATE UNIQUE INDEX "KnowledgeTopic_slug_key" ON "KnowledgeTopic"("slug");

-- CreateIndex
CREATE INDEX "KnowledgeTopic_domain_status_idx" ON "KnowledgeTopic"("domain", "status");

-- CreateIndex
CREATE INDEX "KnowledgeTopic_parentTopicId_idx" ON "KnowledgeTopic"("parentTopicId");

-- CreateIndex
CREATE UNIQUE INDEX "KnowledgeClaim_externalKey_key" ON "KnowledgeClaim"("externalKey");

-- CreateIndex
CREATE INDEX "KnowledgeClaim_topicId_claimType_idx" ON "KnowledgeClaim"("topicId", "claimType");

-- CreateIndex
CREATE INDEX "KnowledgeClaim_publicationStatus_validationStatus_accessTie_idx" ON "KnowledgeClaim"("publicationStatus", "validationStatus", "accessTier");

-- CreateIndex
CREATE INDEX "KnowledgeClaim_temporalStatus_jurisdiction_idx" ON "KnowledgeClaim"("temporalStatus", "jurisdiction");

-- CreateIndex
CREATE INDEX "KnowledgeClaim_normalizedStatement_idx" ON "KnowledgeClaim"("normalizedStatement");

-- CreateIndex
CREATE INDEX "KnowledgeCitation_sourceVersionId_supportType_idx" ON "KnowledgeCitation"("sourceVersionId", "supportType");

-- CreateIndex
CREATE INDEX "KnowledgeCitation_fragmentId_idx" ON "KnowledgeCitation"("fragmentId");

-- CreateIndex
CREATE UNIQUE INDEX "KnowledgeCitation_claimId_sourceVersionId_fragmentId_suppor_key" ON "KnowledgeCitation"("claimId", "sourceVersionId", "fragmentId", "supportType");

-- CreateIndex
CREATE INDEX "KnowledgeValidation_claimId_validatedAt_idx" ON "KnowledgeValidation"("claimId", "validatedAt");

-- CreateIndex
CREATE INDEX "KnowledgeValidation_status_nextReviewAt_idx" ON "KnowledgeValidation"("status", "nextReviewAt");

-- CreateIndex
CREATE UNIQUE INDEX "KnowledgeRelation_externalKey_key" ON "KnowledgeRelation"("externalKey");

-- CreateIndex
CREATE INDEX "KnowledgeRelation_fromTopicId_relationType_idx" ON "KnowledgeRelation"("fromTopicId", "relationType");

-- CreateIndex
CREATE INDEX "KnowledgeRelation_fromClaimId_relationType_idx" ON "KnowledgeRelation"("fromClaimId", "relationType");

-- CreateIndex
CREATE INDEX "KnowledgeRelation_toTopicId_relationType_idx" ON "KnowledgeRelation"("toTopicId", "relationType");

-- CreateIndex
CREATE INDEX "KnowledgeRelation_toClaimId_relationType_idx" ON "KnowledgeRelation"("toClaimId", "relationType");

-- CreateIndex
CREATE INDEX "KnowledgeRule_publicationStatus_validationStatus_idx" ON "KnowledgeRule"("publicationStatus", "validationStatus");

-- CreateIndex
CREATE UNIQUE INDEX "KnowledgeRule_code_ruleVersion_key" ON "KnowledgeRule"("code", "ruleVersion");

-- CreateIndex
CREATE INDEX "KnowledgeCalculation_publicationStatus_validationStatus_idx" ON "KnowledgeCalculation"("publicationStatus", "validationStatus");

-- CreateIndex
CREATE UNIQUE INDEX "KnowledgeCalculation_code_calculationVersion_key" ON "KnowledgeCalculation"("code", "calculationVersion");

-- CreateIndex
CREATE INDEX "KnowledgeChecklist_topicId_publicationStatus_idx" ON "KnowledgeChecklist"("topicId", "publicationStatus");

-- CreateIndex
CREATE UNIQUE INDEX "KnowledgeChecklist_code_version_key" ON "KnowledgeChecklist"("code", "version");

-- CreateIndex
CREATE INDEX "KnowledgeChecklistItem_explanationClaimId_idx" ON "KnowledgeChecklistItem"("explanationClaimId");

-- CreateIndex
CREATE UNIQUE INDEX "KnowledgeChecklistItem_checklistId_order_key" ON "KnowledgeChecklistItem"("checklistId", "order");

-- CreateIndex
CREATE INDEX "KnowledgeProcedure_topicId_publicationStatus_idx" ON "KnowledgeProcedure"("topicId", "publicationStatus");

-- CreateIndex
CREATE UNIQUE INDEX "KnowledgeProcedure_code_version_key" ON "KnowledgeProcedure"("code", "version");

-- CreateIndex
CREATE INDEX "KnowledgeProcedureStep_conditionRuleId_idx" ON "KnowledgeProcedureStep"("conditionRuleId");

-- CreateIndex
CREATE INDEX "KnowledgeProcedureStep_responsibleRoleId_idx" ON "KnowledgeProcedureStep"("responsibleRoleId");

-- CreateIndex
CREATE INDEX "KnowledgeProcedureStep_warningClaimId_idx" ON "KnowledgeProcedureStep"("warningClaimId");

-- CreateIndex
CREATE UNIQUE INDEX "KnowledgeProcedureStep_procedureId_order_key" ON "KnowledgeProcedureStep"("procedureId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "KnowledgeRole_code_key" ON "KnowledgeRole"("code");

-- CreateIndex
CREATE INDEX "KnowledgeResponsibility_roleId_idx" ON "KnowledgeResponsibility"("roleId");

-- CreateIndex
CREATE INDEX "KnowledgeResponsibility_claimId_idx" ON "KnowledgeResponsibility"("claimId");

-- CreateIndex
CREATE INDEX "KnowledgeResponsibility_procedureId_idx" ON "KnowledgeResponsibility"("procedureId");

-- CreateIndex
CREATE INDEX "KnowledgeResponsibility_procedureStepId_idx" ON "KnowledgeResponsibility"("procedureStepId");

-- CreateIndex
CREATE INDEX "KnowledgeFormTemplate_topicId_publicationStatus_idx" ON "KnowledgeFormTemplate"("topicId", "publicationStatus");

-- CreateIndex
CREATE UNIQUE INDEX "KnowledgeFormTemplate_code_schemaVersion_key" ON "KnowledgeFormTemplate"("code", "schemaVersion");

-- CreateIndex
CREATE INDEX "KnowledgeReviewTask_status_priority_dueAt_idx" ON "KnowledgeReviewTask"("status", "priority", "dueAt");

-- CreateIndex
CREATE INDEX "KnowledgeReviewTask_entityType_entityId_idx" ON "KnowledgeReviewTask"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "KnowledgeReviewTask_assignedToId_status_idx" ON "KnowledgeReviewTask"("assignedToId", "status");

-- CreateIndex
CREATE INDEX "KnowledgeAuditEvent_entityType_entityId_createdAt_idx" ON "KnowledgeAuditEvent"("entityType", "entityId", "createdAt");

-- CreateIndex
CREATE INDEX "KnowledgeAuditEvent_eventType_createdAt_idx" ON "KnowledgeAuditEvent"("eventType", "createdAt");

-- CreateIndex
CREATE INDEX "KnowledgeAuditEvent_actorUserId_createdAt_idx" ON "KnowledgeAuditEvent"("actorUserId", "createdAt");

-- RenameForeignKey
ALTER TABLE "RequestOfferSlot" RENAME CONSTRAINT "RequestOfferSlot_requestInterest_fkey" TO "RequestOfferSlot_requestInterestId_requestId_providerOrgan_fkey";

-- AddForeignKey
ALTER TABLE "KnowledgeSourceVersion" ADD CONSTRAINT "KnowledgeSourceVersion_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "KnowledgeSource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeFragment" ADD CONSTRAINT "KnowledgeFragment_sourceVersionId_fkey" FOREIGN KEY ("sourceVersionId") REFERENCES "KnowledgeSourceVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeTopic" ADD CONSTRAINT "KnowledgeTopic_parentTopicId_fkey" FOREIGN KEY ("parentTopicId") REFERENCES "KnowledgeTopic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeClaim" ADD CONSTRAINT "KnowledgeClaim_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "KnowledgeTopic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeClaim" ADD CONSTRAINT "KnowledgeClaim_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeClaim" ADD CONSTRAINT "KnowledgeClaim_reviewedByUserId_fkey" FOREIGN KEY ("reviewedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeCitation" ADD CONSTRAINT "KnowledgeCitation_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "KnowledgeClaim"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeCitation" ADD CONSTRAINT "KnowledgeCitation_sourceVersionId_fkey" FOREIGN KEY ("sourceVersionId") REFERENCES "KnowledgeSourceVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeCitation" ADD CONSTRAINT "KnowledgeCitation_fragmentId_fkey" FOREIGN KEY ("fragmentId") REFERENCES "KnowledgeFragment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeValidation" ADD CONSTRAINT "KnowledgeValidation_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "KnowledgeClaim"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeValidation" ADD CONSTRAINT "KnowledgeValidation_validatorUserId_fkey" FOREIGN KEY ("validatorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeRelation" ADD CONSTRAINT "KnowledgeRelation_fromTopicId_fkey" FOREIGN KEY ("fromTopicId") REFERENCES "KnowledgeTopic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeRelation" ADD CONSTRAINT "KnowledgeRelation_fromClaimId_fkey" FOREIGN KEY ("fromClaimId") REFERENCES "KnowledgeClaim"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeRelation" ADD CONSTRAINT "KnowledgeRelation_toTopicId_fkey" FOREIGN KEY ("toTopicId") REFERENCES "KnowledgeTopic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeRelation" ADD CONSTRAINT "KnowledgeRelation_toClaimId_fkey" FOREIGN KEY ("toClaimId") REFERENCES "KnowledgeClaim"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeChecklist" ADD CONSTRAINT "KnowledgeChecklist_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "KnowledgeTopic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeChecklistItem" ADD CONSTRAINT "KnowledgeChecklistItem_checklistId_fkey" FOREIGN KEY ("checklistId") REFERENCES "KnowledgeChecklist"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeChecklistItem" ADD CONSTRAINT "KnowledgeChecklistItem_explanationClaimId_fkey" FOREIGN KEY ("explanationClaimId") REFERENCES "KnowledgeClaim"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeProcedure" ADD CONSTRAINT "KnowledgeProcedure_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "KnowledgeTopic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeProcedureStep" ADD CONSTRAINT "KnowledgeProcedureStep_procedureId_fkey" FOREIGN KEY ("procedureId") REFERENCES "KnowledgeProcedure"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeProcedureStep" ADD CONSTRAINT "KnowledgeProcedureStep_conditionRuleId_fkey" FOREIGN KEY ("conditionRuleId") REFERENCES "KnowledgeRule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeProcedureStep" ADD CONSTRAINT "KnowledgeProcedureStep_responsibleRoleId_fkey" FOREIGN KEY ("responsibleRoleId") REFERENCES "KnowledgeRole"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeProcedureStep" ADD CONSTRAINT "KnowledgeProcedureStep_warningClaimId_fkey" FOREIGN KEY ("warningClaimId") REFERENCES "KnowledgeClaim"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeResponsibility" ADD CONSTRAINT "KnowledgeResponsibility_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "KnowledgeRole"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeResponsibility" ADD CONSTRAINT "KnowledgeResponsibility_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "KnowledgeClaim"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeResponsibility" ADD CONSTRAINT "KnowledgeResponsibility_procedureId_fkey" FOREIGN KEY ("procedureId") REFERENCES "KnowledgeProcedure"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeResponsibility" ADD CONSTRAINT "KnowledgeResponsibility_procedureStepId_fkey" FOREIGN KEY ("procedureStepId") REFERENCES "KnowledgeProcedureStep"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeFormTemplate" ADD CONSTRAINT "KnowledgeFormTemplate_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "KnowledgeTopic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeReviewTask" ADD CONSTRAINT "KnowledgeReviewTask_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeAuditEvent" ADD CONSTRAINT "KnowledgeAuditEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Knowledge Engine integrity constraints
ALTER TABLE "KnowledgeSource"
  ADD CONSTRAINT "KnowledgeSource_localReference_relative_check"
  CHECK (
    "localReference" IS NULL OR (
      "localReference" !~ '^[A-Za-z]:[\\/]'
      AND "localReference" !~ '^/'
      AND "localReference" !~ '\\.\\.[\\/]'
    )
  );

ALTER TABLE "KnowledgeSourceVersion"
  ADD CONSTRAINT "KnowledgeSourceVersion_validity_check"
  CHECK ("validUntil" IS NULL OR "validFrom" IS NULL OR "validUntil" > "validFrom"),
  ADD CONSTRAINT "KnowledgeSourceVersion_checksum_check"
  CHECK ("checksum" IS NULL OR "checksum" ~ '^[0-9a-f]{64}$');

ALTER TABLE "KnowledgeFragment"
  ADD CONSTRAINT "KnowledgeFragment_pages_check"
  CHECK (
    ("pageFrom" IS NULL OR "pageFrom" > 0)
    AND ("pageTo" IS NULL OR "pageTo" > 0)
    AND ("pageFrom" IS NULL OR "pageTo" IS NULL OR "pageTo" >= "pageFrom")
  ),
  ADD CONSTRAINT "KnowledgeFragment_reference_check"
  CHECK ("pageFrom" IS NOT NULL OR "sectionPath" IS NOT NULL),
  ADD CONSTRAINT "KnowledgeFragment_excerpt_length_check"
  CHECK ("internalExcerpt" IS NULL OR char_length("internalExcerpt") <= 500),
  ADD CONSTRAINT "KnowledgeFragment_excerpt_hash_check"
  CHECK ("excerptHash" IS NULL OR "excerptHash" ~ '^[0-9a-f]{64}$');

ALTER TABLE "KnowledgeClaim"
  ADD CONSTRAINT "KnowledgeClaim_validity_check"
  CHECK ("validUntil" IS NULL OR "validFrom" IS NULL OR "validUntil" > "validFrom"),
  ADD CONSTRAINT "KnowledgeClaim_published_integrity_check"
  CHECK (
    "publicationStatus" <> 'PUBLISHED'
    OR (
      "validationStatus" = 'VALIDATED'
      AND "copyrightCheckPassed" = TRUE
      AND "reviewedByUserId" IS NOT NULL
      AND "reviewedAt" IS NOT NULL
    )
  );

ALTER TABLE "KnowledgeRelation"
  ADD CONSTRAINT "KnowledgeRelation_source_check"
  CHECK (num_nonnulls("fromTopicId", "fromClaimId") = 1),
  ADD CONSTRAINT "KnowledgeRelation_target_check"
  CHECK (num_nonnulls("toTopicId", "toClaimId") = 1),
  ADD CONSTRAINT "KnowledgeRelation_not_self_check"
  CHECK (
    "fromTopicId" IS DISTINCT FROM "toTopicId"
    OR "fromClaimId" IS DISTINCT FROM "toClaimId"
  );

ALTER TABLE "KnowledgeResponsibility"
  ADD CONSTRAINT "KnowledgeResponsibility_target_check"
  CHECK (num_nonnulls("claimId", "procedureId", "procedureStepId") = 1);

ALTER TABLE "KnowledgeChecklistItem"
  ADD CONSTRAINT "KnowledgeChecklistItem_order_check" CHECK ("order" > 0);

ALTER TABLE "KnowledgeProcedureStep"
  ADD CONSTRAINT "KnowledgeProcedureStep_order_check" CHECK ("order" > 0);

CREATE OR REPLACE FUNCTION "knowledge_prevent_history_mutation"()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Knowledge Engine-historie is append-only';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "KnowledgeFragment_append_only"
BEFORE UPDATE OR DELETE ON "KnowledgeFragment"
FOR EACH ROW EXECUTE FUNCTION "knowledge_prevent_history_mutation"();

CREATE TRIGGER "KnowledgeCitation_append_only"
BEFORE UPDATE OR DELETE ON "KnowledgeCitation"
FOR EACH ROW EXECUTE FUNCTION "knowledge_prevent_history_mutation"();

CREATE TRIGGER "KnowledgeValidation_append_only"
BEFORE UPDATE OR DELETE ON "KnowledgeValidation"
FOR EACH ROW EXECUTE FUNCTION "knowledge_prevent_history_mutation"();

CREATE TRIGGER "KnowledgeAuditEvent_append_only"
BEFORE UPDATE OR DELETE ON "KnowledgeAuditEvent"
FOR EACH ROW EXECUTE FUNCTION "knowledge_prevent_history_mutation"();

CREATE OR REPLACE FUNCTION "knowledge_protect_published_claim"()
RETURNS trigger AS $$
BEGIN
  IF OLD."publicationStatus" = 'PUBLISHED' THEN
    RAISE EXCEPTION 'Gepubliceerde kennisclaims mogen niet worden gewijzigd of verwijderd';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "KnowledgeClaim_protect_published"
BEFORE UPDATE OR DELETE ON "KnowledgeClaim"
FOR EACH ROW EXECUTE FUNCTION "knowledge_protect_published_claim"();
