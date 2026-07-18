-- ADR-013 Fase 1 (Expand): uitsluitend additieve, backward-compatible fundamenten.
ALTER TYPE "UserStatus" ADD VALUE IF NOT EXISTS 'DELETION_PENDING';
ALTER TYPE "UserStatus" ADD VALUE IF NOT EXISTS 'ANONYMIZED';
ALTER TYPE "OrganizationType" ADD VALUE IF NOT EXISTS 'PLATFORM_OPERATOR';

CREATE TYPE "UserMigrationClassification" AS ENUM ('MIGRATION_TEMP');
CREATE TYPE "AccountProvisioningEventType" AS ENUM (
  'ACCOUNT_INVITED',
  'ACCOUNT_CREATED',
  'INVITATION_ACCEPTED',
  'ORGANIZATION_LINKED',
  'ROLE_GRANTED',
  'ROLE_CHANGED',
  'ACCOUNT_BLOCKED',
  'ACCOUNT_UNBLOCKED',
  'DELETION_REQUESTED',
  'ACCOUNT_DELETED',
  'ACCOUNT_ANONYMIZED',
  'MEMBERSHIP_TERMINATED',
  'MIGRATED_UNKNOWN'
);
CREATE TYPE "OrganizationMembershipEventType" AS ENUM (
  'MEMBERSHIP_CREATED',
  'INVITATION_SENT',
  'INVITATION_ACCEPTED',
  'ROLE_CHANGED',
  'STATUS_CHANGED',
  'MEMBERSHIP_TERMINATED',
  'ORGANIZATION_TRANSFER_PREPARED',
  'MIGRATION_CLASSIFIED'
);

ALTER TABLE "User"
  ADD COLUMN "createdByUserId" UUID,
  ADD COLUMN "blockedAt" TIMESTAMPTZ(3),
  ADD COLUMN "blockedByUserId" UUID,
  ADD COLUMN "deletionRequestedAt" TIMESTAMPTZ(3),
  ADD COLUMN "deletionRequestedByUserId" UUID,
  ADD COLUMN "deletionEffectiveAt" TIMESTAMPTZ(3),
  ADD COLUMN "anonymizedAt" TIMESTAMPTZ(3),
  ADD COLUMN "retentionPurgeAt" TIMESTAMPTZ(3),
  ADD COLUMN "lifecycleReasonCode" VARCHAR(80),
  ADD COLUMN "lifecycleReasonNote" VARCHAR(500),
  ADD COLUMN "migrationClassification" "UserMigrationClassification";

ALTER TABLE "Organization"
  ADD COLUMN "systemKey" VARCHAR(100);

CREATE TABLE "AccountProvisioningEvent" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "eventType" "AccountProvisioningEventType" NOT NULL,
  "subjectUserId" UUID NOT NULL,
  "actorUserId" UUID,
  "organizationId" UUID,
  "membershipId" UUID,
  "occurredAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reasonCode" VARCHAR(80),
  "metadata" JSONB,
  "correlationId" VARCHAR(160),
  "idempotencyKey" VARCHAR(160),
  "schemaVersion" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AccountProvisioningEvent_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AccountProvisioningEvent_schema_version_check" CHECK ("schemaVersion" > 0),
  CONSTRAINT "AccountProvisioningEvent_idempotency_not_blank" CHECK ("idempotencyKey" IS NULL OR char_length(btrim("idempotencyKey")) > 0)
);

CREATE TABLE "OrganizationMembershipEvent" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "eventType" "OrganizationMembershipEventType" NOT NULL,
  "membershipId" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "actorUserId" UUID,
  "previousRole" "OrganizationMembershipRole",
  "newRole" "OrganizationMembershipRole",
  "previousStatus" "MembershipStatus",
  "newStatus" "MembershipStatus",
  "occurredAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reasonCode" VARCHAR(80) NOT NULL,
  "correlationId" VARCHAR(160),
  "idempotencyKey" VARCHAR(160),
  "metadata" JSONB,
  "schemaVersion" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OrganizationMembershipEvent_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "OrganizationMembershipEvent_schema_version_check" CHECK ("schemaVersion" > 0),
  CONSTRAINT "OrganizationMembershipEvent_reason_not_blank" CHECK (char_length(btrim("reasonCode")) > 0),
  CONSTRAINT "OrganizationMembershipEvent_idempotency_not_blank" CHECK ("idempotencyKey" IS NULL OR char_length(btrim("idempotencyKey")) > 0)
);

CREATE TABLE "DeletedAccountRetention" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "subjectUserId" UUID NOT NULL,
  "encryptedEmail" TEXT,
  "normalizedEmailHash" VARCHAR(128),
  "encryptionKeyReference" VARCHAR(255),
  "retainedAt" TIMESTAMPTZ(3) NOT NULL,
  "purgeAt" TIMESTAMPTZ(3) NOT NULL,
  "purgedAt" TIMESTAMPTZ(3),
  "reasonCode" VARCHAR(80) NOT NULL,
  "schemaVersion" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DeletedAccountRetention_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "DeletedAccountRetention_schema_version_check" CHECK ("schemaVersion" > 0),
  CONSTRAINT "DeletedAccountRetention_reason_not_blank" CHECK (char_length(btrim("reasonCode")) > 0),
  CONSTRAINT "DeletedAccountRetention_maximum_period_check" CHECK ("purgeAt" > "retainedAt" AND "purgeAt" <= "retainedAt" + INTERVAL '30 days'),
  CONSTRAINT "DeletedAccountRetention_purged_at_check" CHECK ("purgedAt" IS NULL OR "purgedAt" >= "retainedAt"),
  CONSTRAINT "DeletedAccountRetention_encryption_reference_check" CHECK (("encryptedEmail" IS NULL) = ("encryptionKeyReference" IS NULL))
);

CREATE INDEX "User_createdByUserId_idx" ON "User"("createdByUserId");
CREATE INDEX "User_blockedByUserId_idx" ON "User"("blockedByUserId");
CREATE INDEX "User_deletionRequestedByUserId_idx" ON "User"("deletionRequestedByUserId");
CREATE INDEX "User_migrationClassification_idx" ON "User"("migrationClassification");
CREATE UNIQUE INDEX "Organization_systemKey_key" ON "Organization"("systemKey");
CREATE UNIQUE INDEX "AccountProvisioningEvent_idempotencyKey_key" ON "AccountProvisioningEvent"("idempotencyKey");
CREATE INDEX "AccountProvisioningEvent_subjectUserId_occurredAt_idx" ON "AccountProvisioningEvent"("subjectUserId", "occurredAt");
CREATE INDEX "AccountProvisioningEvent_actorUserId_occurredAt_idx" ON "AccountProvisioningEvent"("actorUserId", "occurredAt");
CREATE INDEX "AccountProvisioningEvent_organizationId_occurredAt_idx" ON "AccountProvisioningEvent"("organizationId", "occurredAt");
CREATE INDEX "AccountProvisioningEvent_membershipId_occurredAt_idx" ON "AccountProvisioningEvent"("membershipId", "occurredAt");
CREATE INDEX "AccountProvisioningEvent_eventType_occurredAt_idx" ON "AccountProvisioningEvent"("eventType", "occurredAt");
CREATE UNIQUE INDEX "OrganizationMembershipEvent_idempotencyKey_key" ON "OrganizationMembershipEvent"("idempotencyKey");
CREATE INDEX "OrganizationMembershipEvent_membershipId_occurredAt_idx" ON "OrganizationMembershipEvent"("membershipId", "occurredAt");
CREATE INDEX "OrganizationMembershipEvent_userId_occurredAt_idx" ON "OrganizationMembershipEvent"("userId", "occurredAt");
CREATE INDEX "OrganizationMembershipEvent_organizationId_occurredAt_idx" ON "OrganizationMembershipEvent"("organizationId", "occurredAt");
CREATE INDEX "OrganizationMembershipEvent_actorUserId_occurredAt_idx" ON "OrganizationMembershipEvent"("actorUserId", "occurredAt");
CREATE INDEX "OrganizationMembershipEvent_eventType_occurredAt_idx" ON "OrganizationMembershipEvent"("eventType", "occurredAt");
CREATE UNIQUE INDEX "DeletedAccountRetention_subjectUserId_key" ON "DeletedAccountRetention"("subjectUserId");
CREATE INDEX "DeletedAccountRetention_purgeAt_purgedAt_idx" ON "DeletedAccountRetention"("purgeAt", "purgedAt");

ALTER TABLE "Organization"
  ADD CONSTRAINT "Organization_system_key_format_check" CHECK ("systemKey" IS NULL OR "systemKey" ~ '^[A-Z][A-Z0-9_]{2,99}$'),
  ADD CONSTRAINT "Organization_platform_identity_check" CHECK (
    ("organizationType" = 'PLATFORM_OPERATOR' AND "systemKey" IS NOT NULL)
    OR ("organizationType" <> 'PLATFORM_OPERATOR' AND "systemKey" IS NULL)
  );

ALTER TABLE "User" ADD CONSTRAINT "User_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "User" ADD CONSTRAINT "User_blockedByUserId_fkey" FOREIGN KEY ("blockedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "User" ADD CONSTRAINT "User_deletionRequestedByUserId_fkey" FOREIGN KEY ("deletionRequestedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AccountProvisioningEvent" ADD CONSTRAINT "AccountProvisioningEvent_subjectUserId_fkey" FOREIGN KEY ("subjectUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AccountProvisioningEvent" ADD CONSTRAINT "AccountProvisioningEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AccountProvisioningEvent" ADD CONSTRAINT "AccountProvisioningEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AccountProvisioningEvent" ADD CONSTRAINT "AccountProvisioningEvent_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "OrganizationMembership"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OrganizationMembershipEvent" ADD CONSTRAINT "OrganizationMembershipEvent_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "OrganizationMembership"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OrganizationMembershipEvent" ADD CONSTRAINT "OrganizationMembershipEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OrganizationMembershipEvent" ADD CONSTRAINT "OrganizationMembershipEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OrganizationMembershipEvent" ADD CONSTRAINT "OrganizationMembershipEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DeletedAccountRetention" ADD CONSTRAINT "DeletedAccountRetention_subjectUserId_fkey" FOREIGN KEY ("subjectUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE OR REPLACE FUNCTION workmatchr_reject_account_architecture_history_mutation()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Append-only account- en membershiphistorie mag niet worden gewijzigd';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "immutable_account_provisioning_event"
BEFORE UPDATE OR DELETE ON "AccountProvisioningEvent"
FOR EACH ROW EXECUTE FUNCTION workmatchr_reject_account_architecture_history_mutation();

CREATE TRIGGER "immutable_organization_membership_event"
BEFORE UPDATE OR DELETE ON "OrganizationMembershipEvent"
FOR EACH ROW EXECUTE FUNCTION workmatchr_reject_account_architecture_history_mutation();
