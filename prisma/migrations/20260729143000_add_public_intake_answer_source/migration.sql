CREATE TYPE "PublicIntakeAnswerSource" AS ENUM (
  'USER_INPUT',
  'AI_CONFIRMED',
  'USER_CORRECTED',
  'FALLBACK_SELECTION'
);

ALTER TABLE "PublicIntakeAnswer"
  ADD COLUMN "source" "PublicIntakeAnswerSource" NOT NULL DEFAULT 'USER_INPUT';

ALTER TABLE "PublicIntakeAnswerRevision"
  ADD COLUMN "source" "PublicIntakeAnswerSource" NOT NULL DEFAULT 'USER_INPUT';

CREATE INDEX "PublicIntakeAnswer_questionKey_source_idx"
  ON "PublicIntakeAnswer"("questionKey", "source");

CREATE INDEX "PublicIntakeAnswerRevision_questionKey_source_createdAt_idx"
  ON "PublicIntakeAnswerRevision"("questionKey", "source", "createdAt");
