-- Immutable archive for ordinary platform-admin communications only.
CREATE TYPE "AdminCommunicationKind" AS ENUM ('ADMINISTRATIVE');
CREATE TYPE "AdminCommunicationDeliveryStatus" AS ENUM ('PROVIDER_ACCEPTED', 'FAILED', 'DEVELOPMENT_ONLY');

CREATE TABLE "AdminCommunication" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "kind" "AdminCommunicationKind" NOT NULL DEFAULT 'ADMINISTRATIVE',
  "targetEntityType" VARCHAR(40) NOT NULL,
  "targetEntityId" UUID NOT NULL,
  "authorUserId" UUID NOT NULL,
  "subject" VARCHAR(160) NOT NULL,
  "textSnapshot" TEXT NOT NULL,
  "htmlSnapshot" TEXT,
  "dispatchKey" VARCHAR(120) NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AdminCommunication_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AdminCommunication_dispatchKey_key" UNIQUE ("dispatchKey"),
  CONSTRAINT "AdminCommunication_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "AdminCommunicationDeliveryAttempt" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "communicationId" UUID NOT NULL,
  "attemptNumber" INTEGER NOT NULL,
  "transport" VARCHAR(40) NOT NULL,
  "providerMessageId" VARCHAR(255),
  "providerStatus" "AdminCommunicationDeliveryStatus" NOT NULL,
  "failureCode" VARCHAR(120),
  "occurredAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AdminCommunicationDeliveryAttempt_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AdminCommunicationDeliveryAttempt_communicationId_attemptNumber_key" UNIQUE ("communicationId", "attemptNumber"),
  CONSTRAINT "AdminCommunicationDeliveryAttempt_communicationId_fkey" FOREIGN KEY ("communicationId") REFERENCES "AdminCommunication"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "AdminCommunicationDeliveryAttempt_attemptNumber_check" CHECK ("attemptNumber" > 0),
  CONSTRAINT "AdminCommunicationDeliveryAttempt_failureCode_check" CHECK (("providerStatus" = 'FAILED') = ("failureCode" IS NOT NULL))
);

ALTER TABLE "AdminActionLog" ADD COLUMN "adminCommunicationId" UUID;
ALTER TABLE "AdminActionLog" ADD CONSTRAINT "AdminActionLog_adminCommunicationId_fkey" FOREIGN KEY ("adminCommunicationId") REFERENCES "AdminCommunication"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "AdminCommunication_targetEntityType_targetEntityId_createdAt_idx" ON "AdminCommunication"("targetEntityType", "targetEntityId", "createdAt");
CREATE INDEX "AdminCommunication_authorUserId_createdAt_idx" ON "AdminCommunication"("authorUserId", "createdAt");
CREATE INDEX "AdminCommunicationDeliveryAttempt_communicationId_occurredAt_idx" ON "AdminCommunicationDeliveryAttempt"("communicationId", "occurredAt");
CREATE INDEX "AdminActionLog_adminCommunicationId_idx" ON "AdminActionLog"("adminCommunicationId");

CREATE OR REPLACE FUNCTION "admin_communication_immutable_record"() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'admin communication archive records are immutable';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "AdminCommunication_immutable"
  BEFORE UPDATE OR DELETE ON "AdminCommunication"
  FOR EACH ROW EXECUTE FUNCTION "admin_communication_immutable_record"();

CREATE TRIGGER "AdminCommunicationDeliveryAttempt_immutable"
  BEFORE UPDATE OR DELETE ON "AdminCommunicationDeliveryAttempt"
  FOR EACH ROW EXECUTE FUNCTION "admin_communication_immutable_record"();
