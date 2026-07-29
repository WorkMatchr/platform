CREATE TYPE "PublicIntakeAIClassificationStatus" AS ENUM ('PROCESSING', 'COMPLETED');

CREATE TABLE "PublicIntakeAIClassificationCache" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "inputFingerprint" CHAR(64) NOT NULL,
    "classifierVersion" VARCHAR(100) NOT NULL,
    "provider" VARCHAR(50) NOT NULL,
    "model" VARCHAR(100) NOT NULL,
    "status" "PublicIntakeAIClassificationStatus" NOT NULL DEFAULT 'PROCESSING',
    "classificationJson" JSONB,
    "fallbackReason" VARCHAR(50),
    "providerStatusCode" INTEGER,
    "completedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PublicIntakeAIClassificationCache_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "PublicIntakeAIClassificationCache_completion_check" CHECK (
      (
        "status" = 'PROCESSING'
        AND "classificationJson" IS NULL
        AND "fallbackReason" IS NULL
        AND "providerStatusCode" IS NULL
        AND "completedAt" IS NULL
      )
      OR
      (
        "status" = 'COMPLETED'
        AND "completedAt" IS NOT NULL
        AND (
          ("classificationJson" IS NOT NULL AND "fallbackReason" IS NULL)
          OR
          ("classificationJson" IS NULL AND "fallbackReason" IS NOT NULL)
        )
      )
    )
);

CREATE UNIQUE INDEX "PublicIntakeAIClassificationCache_inputFingerprint_key"
ON "PublicIntakeAIClassificationCache"("inputFingerprint");

CREATE INDEX "PublicIntakeAIClassificationCache_status_createdAt_idx"
ON "PublicIntakeAIClassificationCache"("status", "createdAt");

CREATE INDEX "PublicIntakeAIClassificationCache_completedAt_idx"
ON "PublicIntakeAIClassificationCache"("completedAt");
