-- CreateEnum
CREATE TYPE "MarketplaceMatchRunStatus" AS ENUM ('RUNNING', 'COMPLETED', 'FAILED', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "MarketplaceMatchCandidateStatus" AS ENUM ('EXCLUDED', 'ELIGIBLE', 'SELECTED');

-- CreateEnum
CREATE TYPE "ProviderInvitationStatus" AS ENUM ('INVITED', 'ACCEPTED', 'DECLINED', 'EXPIRED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "ProviderParticipationStatus" AS ENUM ('ACTIVE', 'WITHDRAWN', 'EXPIRED', 'CLOSED');

-- CreateEnum
CREATE TYPE "QuoteStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'WITHDRAWN', 'EXPIRED', 'REJECTED', 'AWARDED');

-- CreateEnum
CREATE TYPE "AwardDecisionStatus" AS ENUM ('FINAL', 'ESCALATED');

-- CreateEnum
CREATE TYPE "CreditReservationStatus" AS ENUM ('ACTIVE', 'CONSUMED', 'RELEASED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "MessageChannelStatus" AS ENUM ('OPEN', 'READ_ONLY', 'CLOSED');

-- CreateEnum
CREATE TYPE "MarketplaceMessageStatus" AS ENUM ('SENT', 'REMOVED');

-- CreateEnum
CREATE TYPE "NotificationOutboxStatus" AS ENUM ('PENDING', 'PROCESSING', 'SENT', 'FAILED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "CreditTransactionType" ADD VALUE 'ADMIN_GRANT';
ALTER TYPE "CreditTransactionType" ADD VALUE 'ADMIN_CORRECTION';
ALTER TYPE "CreditTransactionType" ADD VALUE 'RESERVATION';
ALTER TYPE "CreditTransactionType" ADD VALUE 'RESERVATION_RELEASE';
ALTER TYPE "CreditTransactionType" ADD VALUE 'CONSUMPTION';

-- AlterTable
ALTER TABLE "CreditAccount" ADD COLUMN     "availableBalance" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "reservedBalance" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "spentBalance" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "CreditTransaction" ADD COLUMN     "availableAfter" INTEGER,
ADD COLUMN     "idempotencyKey" VARCHAR(120),
ADD COLUMN     "reason" VARCHAR(500),
ADD COLUMN     "reservationId" UUID,
ADD COLUMN     "reservedAfter" INTEGER,
ADD COLUMN     "spentAfter" INTEGER;

-- CreateTable
CREATE TABLE "MarketplaceMatchRun" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "assignmentId" UUID NOT NULL,
    "assignmentVersion" INTEGER NOT NULL,
    "status" "MarketplaceMatchRunStatus" NOT NULL DEFAULT 'RUNNING',
    "engineVersion" VARCHAR(40) NOT NULL,
    "modelVersion" VARCHAR(40) NOT NULL,
    "ruleVersion" VARCHAR(40) NOT NULL,
    "taxonomyVersion" VARCHAR(80) NOT NULL,
    "startedByUserId" UUID NOT NULL,
    "idempotencyKey" VARCHAR(120) NOT NULL,
    "confidenceLevel" VARCHAR(20) NOT NULL,
    "confidenceReasons" TEXT[],
    "assignmentSnapshot" JSONB NOT NULL,
    "inputChecksum" CHAR(64) NOT NULL,
    "decisionReport" JSONB,
    "decisionChecksum" CHAR(64),
    "startedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMPTZ(3),

    CONSTRAINT "MarketplaceMatchRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketplaceMatchCandidate" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "matchRunId" UUID NOT NULL,
    "providerProfileId" UUID NOT NULL,
    "projectionId" UUID NOT NULL,
    "status" "MarketplaceMatchCandidateStatus" NOT NULL,
    "rank" INTEGER,
    "scoreNumerator" INTEGER,
    "scoreDenominator" INTEGER,
    "normalizedScore" INTEGER,
    "exclusionReasons" TEXT[],
    "explanation" JSONB NOT NULL,
    "tieBreaker" JSONB,
    "providerSnapshot" JSONB NOT NULL,
    "snapshotChecksum" CHAR(64) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketplaceMatchCandidate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketplaceMatchIntervention" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "matchRunId" UUID NOT NULL,
    "actorUserId" UUID NOT NULL,
    "reason" VARCHAR(500) NOT NULL,
    "originalSelection" JSONB NOT NULL,
    "replacementSelection" JSONB NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketplaceMatchIntervention_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderInvitation" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "assignmentId" UUID NOT NULL,
    "matchRunId" UUID NOT NULL,
    "matchCandidateId" UUID NOT NULL,
    "providerProfileId" UUID NOT NULL,
    "providerOrganizationId" UUID NOT NULL,
    "status" "ProviderInvitationStatus" NOT NULL DEFAULT 'INVITED',
    "creditCost" INTEGER NOT NULL,
    "deadlineAt" TIMESTAMPTZ(3) NOT NULL,
    "snapshot" JSONB NOT NULL,
    "snapshotChecksum" CHAR(64) NOT NULL,
    "idempotencyKey" VARCHAR(120) NOT NULL,
    "invitedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acceptedAt" TIMESTAMPTZ(3),
    "acceptedByUserId" UUID,
    "declinedAt" TIMESTAMPTZ(3),
    "withdrawnAt" TIMESTAMPTZ(3),

    CONSTRAINT "ProviderInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderParticipation" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "assignmentId" UUID NOT NULL,
    "invitationId" UUID NOT NULL,
    "providerProfileId" UUID NOT NULL,
    "providerOrganizationId" UUID NOT NULL,
    "status" "ProviderParticipationStatus" NOT NULL DEFAULT 'ACTIVE',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdByUserId" UUID NOT NULL,
    "idempotencyKey" VARCHAR(120) NOT NULL,
    "acceptedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMPTZ(3),

    CONSTRAINT "ProviderParticipation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Quote" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "assignmentId" UUID NOT NULL,
    "participationId" UUID NOT NULL,
    "providerProfileId" UUID NOT NULL,
    "providerOrganizationId" UUID NOT NULL,
    "status" "QuoteStatus" NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "currentVersionId" UUID,
    "submittedVersionId" UUID,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "submittedAt" TIMESTAMPTZ(3),

    CONSTRAINT "Quote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuoteVersion" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "quoteId" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "priceCents" BIGINT NOT NULL,
    "priceExplanation" VARCHAR(1000) NOT NULL,
    "approach" TEXT NOT NULL,
    "planning" VARCHAR(2000) NOT NULL,
    "terms" VARCHAR(2000),
    "validUntil" DATE,
    "submittedByUserId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuoteVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AwardDecision" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "assignmentId" UUID NOT NULL,
    "quoteId" UUID NOT NULL,
    "quoteVersionId" UUID NOT NULL,
    "providerOrganizationId" UUID NOT NULL,
    "clientOrganizationId" UUID NOT NULL,
    "decidedByUserId" UUID NOT NULL,
    "status" "AwardDecisionStatus" NOT NULL DEFAULT 'FINAL',
    "motivation" VARCHAR(1000) NOT NULL,
    "snapshot" JSONB NOT NULL,
    "snapshotChecksum" CHAR(64) NOT NULL,
    "idempotencyKey" VARCHAR(120) NOT NULL,
    "decidedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AwardDecision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreditReservation" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "creditAccountId" UUID NOT NULL,
    "participationId" UUID NOT NULL,
    "amount" INTEGER NOT NULL,
    "status" "CreditReservationStatus" NOT NULL DEFAULT 'ACTIVE',
    "idempotencyKey" VARCHAR(120) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "consumedAt" TIMESTAMPTZ(3),
    "releasedAt" TIMESTAMPTZ(3),
    "releaseReason" VARCHAR(500),

    CONSTRAINT "CreditReservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketplaceMessageChannel" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "assignmentId" UUID NOT NULL,
    "participationId" UUID NOT NULL,
    "clientOrganizationId" UUID NOT NULL,
    "providerProfileId" UUID NOT NULL,
    "status" "MessageChannelStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMPTZ(3),

    CONSTRAINT "MarketplaceMessageChannel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketplaceMessage" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "channelId" UUID NOT NULL,
    "senderUserId" UUID NOT NULL,
    "senderOrganizationId" UUID NOT NULL,
    "content" VARCHAR(4000) NOT NULL,
    "status" "MarketplaceMessageStatus" NOT NULL DEFAULT 'SENT',
    "idempotencyKey" VARCHAR(120) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "removedAt" TIMESTAMPTZ(3),

    CONSTRAINT "MarketplaceMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketplaceNotification" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "recipientUserId" UUID NOT NULL,
    "eventId" VARCHAR(120) NOT NULL,
    "type" VARCHAR(80) NOT NULL,
    "title" VARCHAR(160) NOT NULL,
    "body" VARCHAR(500) NOT NULL,
    "targetRoute" VARCHAR(300) NOT NULL,
    "idempotencyKey" VARCHAR(160) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMPTZ(3),
    "readByUserId" UUID,

    CONSTRAINT "MarketplaceNotification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationOutbox" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "eventId" VARCHAR(120) NOT NULL,
    "channel" VARCHAR(20) NOT NULL,
    "recipientUserId" UUID,
    "templateKey" VARCHAR(80) NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "NotificationOutboxStatus" NOT NULL DEFAULT 'PENDING',
    "idempotencyKey" VARCHAR(160) NOT NULL,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "availableAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMPTZ(3),
    "lastErrorCode" VARCHAR(80),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationOutbox_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketplaceAuditEvent" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "actorUserId" UUID,
    "actorRole" VARCHAR(80) NOT NULL,
    "organizationId" UUID,
    "action" VARCHAR(100) NOT NULL,
    "entityType" VARCHAR(80) NOT NULL,
    "entityId" UUID NOT NULL,
    "previousState" VARCHAR(80),
    "nextState" VARCHAR(80),
    "reason" VARCHAR(500),
    "correlationKey" VARCHAR(160),
    "metadata" JSONB,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketplaceAuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MarketplaceMatchRun_idempotencyKey_key" ON "MarketplaceMatchRun"("idempotencyKey");

-- CreateIndex
CREATE INDEX "MarketplaceMatchRun_assignmentId_startedAt_idx" ON "MarketplaceMatchRun"("assignmentId", "startedAt");

-- CreateIndex
CREATE INDEX "MarketplaceMatchRun_status_idx" ON "MarketplaceMatchRun"("status");

-- CreateIndex
CREATE INDEX "MarketplaceMatchCandidate_matchRunId_status_rank_idx" ON "MarketplaceMatchCandidate"("matchRunId", "status", "rank");

-- CreateIndex
CREATE INDEX "MarketplaceMatchCandidate_providerProfileId_idx" ON "MarketplaceMatchCandidate"("providerProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "MarketplaceMatchCandidate_matchRunId_providerProfileId_key" ON "MarketplaceMatchCandidate"("matchRunId", "providerProfileId");

-- CreateIndex
CREATE INDEX "MarketplaceMatchIntervention_matchRunId_createdAt_idx" ON "MarketplaceMatchIntervention"("matchRunId", "createdAt");

-- CreateIndex
CREATE INDEX "MarketplaceMatchIntervention_actorUserId_idx" ON "MarketplaceMatchIntervention"("actorUserId");

-- CreateIndex
CREATE UNIQUE INDEX "ProviderInvitation_matchCandidateId_key" ON "ProviderInvitation"("matchCandidateId");

-- CreateIndex
CREATE UNIQUE INDEX "ProviderInvitation_idempotencyKey_key" ON "ProviderInvitation"("idempotencyKey");

-- CreateIndex
CREATE INDEX "ProviderInvitation_providerOrganizationId_status_idx" ON "ProviderInvitation"("providerOrganizationId", "status");

-- CreateIndex
CREATE INDEX "ProviderInvitation_assignmentId_status_idx" ON "ProviderInvitation"("assignmentId", "status");

-- CreateIndex
CREATE INDEX "ProviderInvitation_deadlineAt_idx" ON "ProviderInvitation"("deadlineAt");

-- CreateIndex
CREATE UNIQUE INDEX "ProviderInvitation_assignmentId_providerProfileId_key" ON "ProviderInvitation"("assignmentId", "providerProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "ProviderParticipation_invitationId_key" ON "ProviderParticipation"("invitationId");

-- CreateIndex
CREATE UNIQUE INDEX "ProviderParticipation_idempotencyKey_key" ON "ProviderParticipation"("idempotencyKey");

-- CreateIndex
CREATE INDEX "ProviderParticipation_providerOrganizationId_status_idx" ON "ProviderParticipation"("providerOrganizationId", "status");

-- CreateIndex
CREATE INDEX "ProviderParticipation_assignmentId_status_idx" ON "ProviderParticipation"("assignmentId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ProviderParticipation_assignmentId_providerProfileId_key" ON "ProviderParticipation"("assignmentId", "providerProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "Quote_participationId_key" ON "Quote"("participationId");

-- CreateIndex
CREATE UNIQUE INDEX "Quote_currentVersionId_key" ON "Quote"("currentVersionId");

-- CreateIndex
CREATE UNIQUE INDEX "Quote_submittedVersionId_key" ON "Quote"("submittedVersionId");

-- CreateIndex
CREATE INDEX "Quote_assignmentId_status_idx" ON "Quote"("assignmentId", "status");

-- CreateIndex
CREATE INDEX "Quote_providerOrganizationId_status_idx" ON "Quote"("providerOrganizationId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Quote_assignmentId_providerProfileId_key" ON "Quote"("assignmentId", "providerProfileId");

-- CreateIndex
CREATE INDEX "QuoteVersion_quoteId_createdAt_idx" ON "QuoteVersion"("quoteId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "QuoteVersion_quoteId_version_key" ON "QuoteVersion"("quoteId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "AwardDecision_assignmentId_key" ON "AwardDecision"("assignmentId");

-- CreateIndex
CREATE UNIQUE INDEX "AwardDecision_quoteId_key" ON "AwardDecision"("quoteId");

-- CreateIndex
CREATE UNIQUE INDEX "AwardDecision_quoteVersionId_key" ON "AwardDecision"("quoteVersionId");

-- CreateIndex
CREATE UNIQUE INDEX "AwardDecision_idempotencyKey_key" ON "AwardDecision"("idempotencyKey");

-- CreateIndex
CREATE INDEX "AwardDecision_providerOrganizationId_idx" ON "AwardDecision"("providerOrganizationId");

-- CreateIndex
CREATE INDEX "AwardDecision_clientOrganizationId_idx" ON "AwardDecision"("clientOrganizationId");

-- CreateIndex
CREATE INDEX "AwardDecision_decidedAt_idx" ON "AwardDecision"("decidedAt");

-- CreateIndex
CREATE UNIQUE INDEX "CreditReservation_participationId_key" ON "CreditReservation"("participationId");

-- CreateIndex
CREATE UNIQUE INDEX "CreditReservation_idempotencyKey_key" ON "CreditReservation"("idempotencyKey");

-- CreateIndex
CREATE INDEX "CreditReservation_creditAccountId_status_idx" ON "CreditReservation"("creditAccountId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "MarketplaceMessageChannel_participationId_key" ON "MarketplaceMessageChannel"("participationId");

-- CreateIndex
CREATE INDEX "MarketplaceMessageChannel_clientOrganizationId_status_idx" ON "MarketplaceMessageChannel"("clientOrganizationId", "status");

-- CreateIndex
CREATE INDEX "MarketplaceMessageChannel_providerProfileId_status_idx" ON "MarketplaceMessageChannel"("providerProfileId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "MarketplaceMessageChannel_assignmentId_providerProfileId_key" ON "MarketplaceMessageChannel"("assignmentId", "providerProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "MarketplaceMessage_idempotencyKey_key" ON "MarketplaceMessage"("idempotencyKey");

-- CreateIndex
CREATE INDEX "MarketplaceMessage_channelId_createdAt_idx" ON "MarketplaceMessage"("channelId", "createdAt");

-- CreateIndex
CREATE INDEX "MarketplaceMessage_senderOrganizationId_idx" ON "MarketplaceMessage"("senderOrganizationId");

-- CreateIndex
CREATE UNIQUE INDEX "MarketplaceNotification_idempotencyKey_key" ON "MarketplaceNotification"("idempotencyKey");

-- CreateIndex
CREATE INDEX "MarketplaceNotification_recipientUserId_readAt_createdAt_idx" ON "MarketplaceNotification"("recipientUserId", "readAt", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "MarketplaceNotification_recipientUserId_eventId_key" ON "MarketplaceNotification"("recipientUserId", "eventId");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationOutbox_idempotencyKey_key" ON "NotificationOutbox"("idempotencyKey");

-- CreateIndex
CREATE INDEX "NotificationOutbox_status_availableAt_idx" ON "NotificationOutbox"("status", "availableAt");

-- CreateIndex
CREATE INDEX "NotificationOutbox_eventId_idx" ON "NotificationOutbox"("eventId");

-- CreateIndex
CREATE INDEX "MarketplaceAuditEvent_entityType_entityId_createdAt_idx" ON "MarketplaceAuditEvent"("entityType", "entityId", "createdAt");

-- CreateIndex
CREATE INDEX "MarketplaceAuditEvent_organizationId_createdAt_idx" ON "MarketplaceAuditEvent"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "MarketplaceAuditEvent_actorUserId_createdAt_idx" ON "MarketplaceAuditEvent"("actorUserId", "createdAt");

-- CreateIndex
CREATE INDEX "MarketplaceAuditEvent_correlationKey_idx" ON "MarketplaceAuditEvent"("correlationKey");

-- CreateIndex
CREATE UNIQUE INDEX "CreditTransaction_idempotencyKey_key" ON "CreditTransaction"("idempotencyKey");

-- CreateIndex
CREATE INDEX "CreditTransaction_reservationId_idx" ON "CreditTransaction"("reservationId");

-- AddForeignKey
ALTER TABLE "CreditTransaction" ADD CONSTRAINT "CreditTransaction_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "CreditReservation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceMatchRun" ADD CONSTRAINT "MarketplaceMatchRun_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "Assignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceMatchRun" ADD CONSTRAINT "MarketplaceMatchRun_startedByUserId_fkey" FOREIGN KEY ("startedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceMatchCandidate" ADD CONSTRAINT "MarketplaceMatchCandidate_matchRunId_fkey" FOREIGN KEY ("matchRunId") REFERENCES "MarketplaceMatchRun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceMatchCandidate" ADD CONSTRAINT "MarketplaceMatchCandidate_providerProfileId_fkey" FOREIGN KEY ("providerProfileId") REFERENCES "ProviderProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceMatchCandidate" ADD CONSTRAINT "MarketplaceMatchCandidate_projectionId_fkey" FOREIGN KEY ("projectionId") REFERENCES "TrustedProviderProjection"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceMatchIntervention" ADD CONSTRAINT "MarketplaceMatchIntervention_matchRunId_fkey" FOREIGN KEY ("matchRunId") REFERENCES "MarketplaceMatchRun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceMatchIntervention" ADD CONSTRAINT "MarketplaceMatchIntervention_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderInvitation" ADD CONSTRAINT "ProviderInvitation_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "Assignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderInvitation" ADD CONSTRAINT "ProviderInvitation_matchRunId_fkey" FOREIGN KEY ("matchRunId") REFERENCES "MarketplaceMatchRun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderInvitation" ADD CONSTRAINT "ProviderInvitation_matchCandidateId_fkey" FOREIGN KEY ("matchCandidateId") REFERENCES "MarketplaceMatchCandidate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderInvitation" ADD CONSTRAINT "ProviderInvitation_providerProfileId_fkey" FOREIGN KEY ("providerProfileId") REFERENCES "ProviderProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderInvitation" ADD CONSTRAINT "ProviderInvitation_providerOrganizationId_fkey" FOREIGN KEY ("providerOrganizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderInvitation" ADD CONSTRAINT "ProviderInvitation_acceptedByUserId_fkey" FOREIGN KEY ("acceptedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderParticipation" ADD CONSTRAINT "ProviderParticipation_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "Assignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderParticipation" ADD CONSTRAINT "ProviderParticipation_invitationId_fkey" FOREIGN KEY ("invitationId") REFERENCES "ProviderInvitation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderParticipation" ADD CONSTRAINT "ProviderParticipation_providerProfileId_fkey" FOREIGN KEY ("providerProfileId") REFERENCES "ProviderProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderParticipation" ADD CONSTRAINT "ProviderParticipation_providerOrganizationId_fkey" FOREIGN KEY ("providerOrganizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderParticipation" ADD CONSTRAINT "ProviderParticipation_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "Assignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_participationId_fkey" FOREIGN KEY ("participationId") REFERENCES "ProviderParticipation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_providerProfileId_fkey" FOREIGN KEY ("providerProfileId") REFERENCES "ProviderProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_providerOrganizationId_fkey" FOREIGN KEY ("providerOrganizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_currentVersionId_fkey" FOREIGN KEY ("currentVersionId") REFERENCES "QuoteVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_submittedVersionId_fkey" FOREIGN KEY ("submittedVersionId") REFERENCES "QuoteVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteVersion" ADD CONSTRAINT "QuoteVersion_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteVersion" ADD CONSTRAINT "QuoteVersion_submittedByUserId_fkey" FOREIGN KEY ("submittedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AwardDecision" ADD CONSTRAINT "AwardDecision_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "Assignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AwardDecision" ADD CONSTRAINT "AwardDecision_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AwardDecision" ADD CONSTRAINT "AwardDecision_quoteVersionId_fkey" FOREIGN KEY ("quoteVersionId") REFERENCES "QuoteVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AwardDecision" ADD CONSTRAINT "AwardDecision_decidedByUserId_fkey" FOREIGN KEY ("decidedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditReservation" ADD CONSTRAINT "CreditReservation_creditAccountId_fkey" FOREIGN KEY ("creditAccountId") REFERENCES "CreditAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditReservation" ADD CONSTRAINT "CreditReservation_participationId_fkey" FOREIGN KEY ("participationId") REFERENCES "ProviderParticipation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceMessageChannel" ADD CONSTRAINT "MarketplaceMessageChannel_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "Assignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceMessageChannel" ADD CONSTRAINT "MarketplaceMessageChannel_participationId_fkey" FOREIGN KEY ("participationId") REFERENCES "ProviderParticipation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceMessageChannel" ADD CONSTRAINT "MarketplaceMessageChannel_clientOrganizationId_fkey" FOREIGN KEY ("clientOrganizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceMessageChannel" ADD CONSTRAINT "MarketplaceMessageChannel_providerProfileId_fkey" FOREIGN KEY ("providerProfileId") REFERENCES "ProviderProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceMessage" ADD CONSTRAINT "MarketplaceMessage_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "MarketplaceMessageChannel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceMessage" ADD CONSTRAINT "MarketplaceMessage_senderUserId_fkey" FOREIGN KEY ("senderUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceNotification" ADD CONSTRAINT "MarketplaceNotification_recipientUserId_fkey" FOREIGN KEY ("recipientUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceNotification" ADD CONSTRAINT "MarketplaceNotification_readByUserId_fkey" FOREIGN KEY ("readByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceAuditEvent" ADD CONSTRAINT "MarketplaceAuditEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceAuditEvent" ADD CONSTRAINT "MarketplaceAuditEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Preserve the legacy available balance while the new ledger totals become authoritative.
UPDATE "CreditAccount"
SET "availableBalance" = "balance"
WHERE "balance" <> 0;

ALTER TABLE "CreditAccount"
  ADD CONSTRAINT "CreditAccount_balances_non_negative_check"
  CHECK ("availableBalance" >= 0 AND "reservedBalance" >= 0 AND "spentBalance" >= 0),
  ADD CONSTRAINT "CreditAccount_balance_projection_check"
  CHECK ("balance" = "availableBalance");

ALTER TABLE "CreditReservation"
  ADD CONSTRAINT "CreditReservation_amount_positive_check" CHECK ("amount" > 0),
  ADD CONSTRAINT "CreditReservation_terminal_timestamp_check" CHECK (
    ("status" = 'ACTIVE' AND "consumedAt" IS NULL AND "releasedAt" IS NULL)
    OR ("status" = 'CONSUMED' AND "consumedAt" IS NOT NULL AND "releasedAt" IS NULL)
    OR ("status" IN ('RELEASED', 'CANCELLED') AND "consumedAt" IS NULL AND "releasedAt" IS NOT NULL)
  );

ALTER TABLE "ProviderInvitation"
  ADD CONSTRAINT "ProviderInvitation_credit_cost_positive_check" CHECK ("creditCost" > 0),
  ADD CONSTRAINT "ProviderInvitation_deadline_after_invite_check" CHECK ("deadlineAt" > "invitedAt");

ALTER TABLE "MarketplaceMatchCandidate"
  ADD CONSTRAINT "MarketplaceMatchCandidate_score_check" CHECK (
    ("status" = 'EXCLUDED' AND "rank" IS NULL AND "normalizedScore" IS NULL)
    OR ("status" IN ('ELIGIBLE', 'SELECTED') AND "rank" > 0 AND "scoreNumerator" >= 0 AND "scoreDenominator" > 0 AND "normalizedScore" BETWEEN 0 AND 10000)
  );

ALTER TABLE "QuoteVersion"
  ADD CONSTRAINT "QuoteVersion_price_positive_check" CHECK ("priceCents" > 0);

CREATE OR REPLACE FUNCTION "workmatchr_prevent_marketplace_history_mutation"()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION '% is append-only', TG_TABLE_NAME;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "MarketplaceMatchCandidate_append_only"
BEFORE UPDATE OR DELETE ON "MarketplaceMatchCandidate"
FOR EACH ROW EXECUTE FUNCTION "workmatchr_prevent_marketplace_history_mutation"();

CREATE TRIGGER "MarketplaceMatchIntervention_append_only"
BEFORE UPDATE OR DELETE ON "MarketplaceMatchIntervention"
FOR EACH ROW EXECUTE FUNCTION "workmatchr_prevent_marketplace_history_mutation"();

CREATE TRIGGER "QuoteVersion_append_only"
BEFORE UPDATE OR DELETE ON "QuoteVersion"
FOR EACH ROW EXECUTE FUNCTION "workmatchr_prevent_marketplace_history_mutation"();

CREATE TRIGGER "AwardDecision_append_only"
BEFORE UPDATE OR DELETE ON "AwardDecision"
FOR EACH ROW EXECUTE FUNCTION "workmatchr_prevent_marketplace_history_mutation"();

CREATE TRIGGER "CreditTransaction_append_only_v2"
BEFORE UPDATE OR DELETE ON "CreditTransaction"
FOR EACH ROW EXECUTE FUNCTION "workmatchr_prevent_marketplace_history_mutation"();

CREATE TRIGGER "MarketplaceAuditEvent_append_only"
BEFORE UPDATE OR DELETE ON "MarketplaceAuditEvent"
FOR EACH ROW EXECUTE FUNCTION "workmatchr_prevent_marketplace_history_mutation"();
