-- ADR-013 Fase 2A: append-only systeemprovisioning voor de platformorganisatie.
CREATE TYPE "OrganizationProvisioningEventType" AS ENUM (
  'ORGANIZATION_BOOTSTRAPPED',
  'SYSTEM_IDENTITY_ASSIGNED',
  'GOVERNANCE_ACTIVATED'
);

CREATE TYPE "ProvisioningActorType" AS ENUM ('SYSTEM', 'USER');

CREATE TABLE "OrganizationProvisioningEvent" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "eventType" "OrganizationProvisioningEventType" NOT NULL,
  "organizationId" UUID NOT NULL,
  "actorType" "ProvisioningActorType" NOT NULL DEFAULT 'SYSTEM',
  "actorUserId" UUID,
  "occurredAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reasonCode" VARCHAR(80) NOT NULL,
  "metadata" JSONB,
  "correlationId" VARCHAR(160),
  "idempotencyKey" VARCHAR(160) NOT NULL,
  "schemaVersion" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OrganizationProvisioningEvent_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "OrganizationProvisioningEvent_actor_consistency_check" CHECK (
    ("actorType" = 'SYSTEM' AND "actorUserId" IS NULL)
    OR ("actorType" = 'USER' AND "actorUserId" IS NOT NULL)
  ),
  CONSTRAINT "OrganizationProvisioningEvent_reason_not_blank" CHECK (char_length(btrim("reasonCode")) > 0),
  CONSTRAINT "OrganizationProvisioningEvent_idempotency_not_blank" CHECK (char_length(btrim("idempotencyKey")) > 0),
  CONSTRAINT "OrganizationProvisioningEvent_schema_version_check" CHECK ("schemaVersion" > 0)
);

CREATE UNIQUE INDEX "OrganizationProvisioningEvent_idempotencyKey_key"
  ON "OrganizationProvisioningEvent"("idempotencyKey");
CREATE INDEX "OrganizationProvisioningEvent_organizationId_occurredAt_idx"
  ON "OrganizationProvisioningEvent"("organizationId", "occurredAt");
CREATE INDEX "OrganizationProvisioningEvent_actorUserId_occurredAt_idx"
  ON "OrganizationProvisioningEvent"("actorUserId", "occurredAt");
CREATE INDEX "OrganizationProvisioningEvent_eventType_occurredAt_idx"
  ON "OrganizationProvisioningEvent"("eventType", "occurredAt");

ALTER TABLE "OrganizationProvisioningEvent"
  ADD CONSTRAINT "OrganizationProvisioningEvent_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OrganizationProvisioningEvent"
  ADD CONSTRAINT "OrganizationProvisioningEvent_actorUserId_fkey"
  FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TRIGGER "immutable_organization_provisioning_event"
BEFORE UPDATE OR DELETE ON "OrganizationProvisioningEvent"
FOR EACH ROW EXECUTE FUNCTION workmatchr_reject_account_architecture_history_mutation();
