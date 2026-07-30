CREATE TYPE "RequestOfferSlotStatus" AS ENUM (
  'CLAIMED',
  'RELEASED'
);

CREATE TYPE "RequestOfferSlotEventType" AS ENUM (
  'CLAIMED',
  'RELEASED'
);

CREATE UNIQUE INDEX "RequestInterest_id_requestId_providerOrganizationId_key"
  ON "RequestInterest"("id", "requestId", "providerOrganizationId");

CREATE TABLE "RequestOfferSlot" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "requestId" UUID NOT NULL,
  "providerOrganizationId" UUID NOT NULL,
  "requestInterestId" UUID NOT NULL,
  "slotNumber" INTEGER NOT NULL,
  "status" "RequestOfferSlotStatus" NOT NULL DEFAULT 'CLAIMED',
  "claimedAt" TIMESTAMPTZ(3) NOT NULL,
  "expiresAt" TIMESTAMPTZ(3),
  "releasedAt" TIMESTAMPTZ(3),
  "createdByUserId" UUID NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RequestOfferSlot_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "RequestOfferSlot_slot_number_check"
    CHECK ("slotNumber" BETWEEN 1 AND 3),
  CONSTRAINT "RequestOfferSlot_status_timestamp_check" CHECK (
    ("status" = 'CLAIMED' AND "releasedAt" IS NULL)
    OR ("status" = 'RELEASED' AND "releasedAt" IS NOT NULL)
  )
);

CREATE TABLE "RequestOfferSlotEvent" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "offerSlotId" UUID NOT NULL,
  "requestId" UUID NOT NULL,
  "providerOrganizationId" UUID NOT NULL,
  "actorUserId" UUID NOT NULL,
  "type" "RequestOfferSlotEventType" NOT NULL,
  "fromStatus" "RequestOfferSlotStatus",
  "toStatus" "RequestOfferSlotStatus" NOT NULL,
  "slotNumber" INTEGER NOT NULL,
  "idempotencyKey" VARCHAR(180) NOT NULL,
  "occurredAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RequestOfferSlotEvent_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "RequestOfferSlotEvent_slot_number_check"
    CHECK ("slotNumber" BETWEEN 1 AND 3),
  CONSTRAINT "RequestOfferSlotEvent_transition_check" CHECK (
    ("type" = 'CLAIMED' AND "toStatus" = 'CLAIMED')
    OR (
      "type" = 'RELEASED'
      AND "fromStatus" = 'CLAIMED'
      AND "toStatus" = 'RELEASED'
    )
  )
);

CREATE UNIQUE INDEX "RequestOfferSlot_requestInterestId_key"
  ON "RequestOfferSlot"("requestInterestId");
CREATE UNIQUE INDEX "RequestOfferSlot_requestId_providerOrganizationId_key"
  ON "RequestOfferSlot"("requestId", "providerOrganizationId");
CREATE UNIQUE INDEX "RequestOfferSlot_requestInterestId_requestId_providerOrganizationId_key"
  ON "RequestOfferSlot"("requestInterestId", "requestId", "providerOrganizationId");
CREATE UNIQUE INDEX "RequestOfferSlot_active_request_slot_key"
  ON "RequestOfferSlot"("requestId", "slotNumber")
  WHERE "status" = 'CLAIMED';
CREATE INDEX "RequestOfferSlot_requestId_status_slotNumber_idx"
  ON "RequestOfferSlot"("requestId", "status", "slotNumber");
CREATE INDEX "RequestOfferSlot_providerOrganizationId_status_createdAt_idx"
  ON "RequestOfferSlot"("providerOrganizationId", "status", "createdAt");
CREATE INDEX "RequestOfferSlot_createdByUserId_createdAt_idx"
  ON "RequestOfferSlot"("createdByUserId", "createdAt");

CREATE UNIQUE INDEX "RequestOfferSlotEvent_idempotencyKey_key"
  ON "RequestOfferSlotEvent"("idempotencyKey");
CREATE INDEX "RequestOfferSlotEvent_offerSlotId_occurredAt_idx"
  ON "RequestOfferSlotEvent"("offerSlotId", "occurredAt");
CREATE INDEX "RequestOfferSlotEvent_requestId_occurredAt_idx"
  ON "RequestOfferSlotEvent"("requestId", "occurredAt");
CREATE INDEX "RequestOfferSlotEvent_providerOrganizationId_occurredAt_idx"
  ON "RequestOfferSlotEvent"("providerOrganizationId", "occurredAt");
CREATE INDEX "RequestOfferSlotEvent_actorUserId_occurredAt_idx"
  ON "RequestOfferSlotEvent"("actorUserId", "occurredAt");

ALTER TABLE "RequestOfferSlot"
  ADD CONSTRAINT "RequestOfferSlot_requestId_fkey"
  FOREIGN KEY ("requestId") REFERENCES "Request"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RequestOfferSlot"
  ADD CONSTRAINT "RequestOfferSlot_providerOrganizationId_fkey"
  FOREIGN KEY ("providerOrganizationId") REFERENCES "Organization"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RequestOfferSlot"
  ADD CONSTRAINT "RequestOfferSlot_requestInterest_fkey"
  FOREIGN KEY ("requestInterestId", "requestId", "providerOrganizationId")
  REFERENCES "RequestInterest"("id", "requestId", "providerOrganizationId")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RequestOfferSlot"
  ADD CONSTRAINT "RequestOfferSlot_createdByUserId_fkey"
  FOREIGN KEY ("createdByUserId") REFERENCES "User"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "RequestOfferSlotEvent"
  ADD CONSTRAINT "RequestOfferSlotEvent_offerSlotId_fkey"
  FOREIGN KEY ("offerSlotId") REFERENCES "RequestOfferSlot"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RequestOfferSlotEvent"
  ADD CONSTRAINT "RequestOfferSlotEvent_requestId_fkey"
  FOREIGN KEY ("requestId") REFERENCES "Request"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RequestOfferSlotEvent"
  ADD CONSTRAINT "RequestOfferSlotEvent_providerOrganizationId_fkey"
  FOREIGN KEY ("providerOrganizationId") REFERENCES "Organization"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RequestOfferSlotEvent"
  ADD CONSTRAINT "RequestOfferSlotEvent_actorUserId_fkey"
  FOREIGN KEY ("actorUserId") REFERENCES "User"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TRIGGER "RequestOfferSlotEvent_immutable"
BEFORE UPDATE OR DELETE ON "RequestOfferSlotEvent"
FOR EACH ROW EXECUTE FUNCTION workmatchr_reject_advice_dossier_history_mutation();
