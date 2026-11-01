// Isolated test fixture for the two existing models only. No migration runner,
// migration registry, accounts, provider configuration or copied database data.
export const contactRetentionFixture = `
CREATE TYPE "NotificationOutboxStatus" AS ENUM ('PENDING', 'PROCESSING', 'SENT', 'FAILED');
CREATE TABLE "NotificationOutbox" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "eventId" varchar(120) NOT NULL, "channel" varchar(20) NOT NULL,
  "recipientUserId" uuid, "templateKey" varchar(80) NOT NULL, "payload" jsonb NOT NULL,
  "status" "NotificationOutboxStatus" NOT NULL DEFAULT 'PENDING',
  "idempotencyKey" varchar(160) NOT NULL UNIQUE, "attemptCount" integer NOT NULL DEFAULT 0,
  "availableAt" timestamptz(3) NOT NULL DEFAULT now(), "processedAt" timestamptz(3),
  "lastErrorCode" varchar(80), "createdAt" timestamptz(3) NOT NULL DEFAULT now(),
  "leaseToken" uuid, "leaseUntil" timestamptz(3), "firstAttemptAt" timestamptz(3),
  "providerMessageId" varchar(160), "deliveryFingerprint" char(64)
);
CREATE INDEX ON "NotificationOutbox" ("status", "availableAt");
CREATE INDEX ON "NotificationOutbox" ("eventId");
CREATE TABLE "RateLimit" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "key" text NOT NULL UNIQUE,
  "count" integer NOT NULL, "lastRequest" bigint NOT NULL
);`
