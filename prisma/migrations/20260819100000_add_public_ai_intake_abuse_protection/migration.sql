CREATE TABLE "PublicIntakeAbuseBucket" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "environment" VARCHAR(20) NOT NULL,
    "operation" VARCHAR(30) NOT NULL,
    "subjectType" VARCHAR(20) NOT NULL,
    "subjectHash" CHAR(64) NOT NULL,
    "windowStartedAt" TIMESTAMPTZ(3) NOT NULL,
    "windowEndsAt" TIMESTAMPTZ(3) NOT NULL,
    "requestCount" INTEGER NOT NULL DEFAULT 1,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "PublicIntakeAbuseBucket_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "PublicIntakeAbuseBucket_environment_check"
      CHECK ("environment" IN ('production', 'preview', 'development', 'test')),
    CONSTRAINT "PublicIntakeAbuseBucket_operation_check"
      CHECK ("operation" IN ('INTAKE_REQUEST', 'AI_CLASSIFICATION')),
    CONSTRAINT "PublicIntakeAbuseBucket_subject_type_check"
      CHECK ("subjectType" IN ('IP', 'SESSION', 'GLOBAL')),
    CONSTRAINT "PublicIntakeAbuseBucket_subject_hash_check"
      CHECK ("subjectHash" ~ '^[0-9a-f]{64}$'),
    CONSTRAINT "PublicIntakeAbuseBucket_window_check"
      CHECK ("windowEndsAt" > "windowStartedAt" AND "expiresAt" >= "windowEndsAt"),
    CONSTRAINT "PublicIntakeAbuseBucket_request_count_check"
      CHECK ("requestCount" > 0)
);

CREATE UNIQUE INDEX "PublicIntakeAbuseBucket_identity_key"
  ON "PublicIntakeAbuseBucket"("environment", "operation", "subjectType", "subjectHash", "windowStartedAt", "windowEndsAt");
CREATE INDEX "PublicIntakeAbuseBucket_expiresAt_idx"
  ON "PublicIntakeAbuseBucket"("expiresAt");
CREATE INDEX "PublicIntakeAbuseBucket_operation_windowEndsAt_idx"
  ON "PublicIntakeAbuseBucket"("operation", "windowEndsAt");
