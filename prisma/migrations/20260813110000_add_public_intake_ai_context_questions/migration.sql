-- Immutable, catalog-backed snapshots for AI-selected public-intake context questions.
ALTER TYPE "PublicIntakeAnswerSource" ADD VALUE IF NOT EXISTS 'AI_CONTEXT_PLANNER';

CREATE TABLE "PublicIntakeContextQuestion" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "draftId" UUID NOT NULL,
  "questionKey" VARCHAR(100) NOT NULL,
  "catalogVersion" VARCHAR(100) NOT NULL,
  "textSnapshot" VARCHAR(500) NOT NULL,
  "answerType" "PublicIntakeAnswerType" NOT NULL,
  "category" VARCHAR(50) NOT NULL,
  "sequence" INTEGER NOT NULL,
  "source" VARCHAR(50) NOT NULL DEFAULT 'AI_CONTEXT_PLANNER',
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PublicIntakeContextQuestion_source_check" CHECK ("source" = 'AI_CONTEXT_PLANNER'),
  CONSTRAINT "PublicIntakeContextQuestion_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PublicIntakeContextQuestion_draftId_fkey"
    FOREIGN KEY ("draftId") REFERENCES "PublicIntakeDraft"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "PublicIntakeContextQuestion_draftId_questionKey_key"
  ON "PublicIntakeContextQuestion"("draftId", "questionKey");
CREATE UNIQUE INDEX "PublicIntakeContextQuestion_draftId_sequence_key"
  ON "PublicIntakeContextQuestion"("draftId", "sequence");
CREATE INDEX "PublicIntakeContextQuestion_draftId_createdAt_idx"
  ON "PublicIntakeContextQuestion"("draftId", "createdAt");

CREATE OR REPLACE FUNCTION "prevent_public_intake_context_question_mutation"()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'PublicIntakeContextQuestion records are immutable';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "PublicIntakeContextQuestion_immutable"
BEFORE UPDATE OR DELETE ON "PublicIntakeContextQuestion"
FOR EACH ROW EXECUTE FUNCTION "prevent_public_intake_context_question_mutation"();
