-- Module 7, Werkset 7.1: veilige pseudonieme publieke conceptintakes.

CREATE TYPE "PublicIntakePhase" AS ENUM (
  'STARTED',
  'CLARIFYING',
  'SUMMARY_PRESENTED',
  'REGISTRATION_STARTED',
  'ACCOUNT_LINKED',
  'SUBMITTED',
  'ABANDONED'
);

CREATE TYPE "PublicIntakeEntryPoint" AS ENUM ('FREE_TEXT', 'RECOGNIZABLE_REQUEST');
CREATE TYPE "PublicIntakeQuestionPurpose" AS ENUM ('CLARIFICATION', 'MATCHING', 'ADMINISTRATION');
CREATE TYPE "PublicIntakeAnswerType" AS ENUM ('TEXT', 'OPTION', 'NUMBER', 'BOOLEAN', 'DATE', 'PERIOD');
CREATE TYPE "PublicIntakeAnswerDisposition" AS ENUM ('ANSWERED', 'UNKNOWN', 'SKIPPED');
CREATE TYPE "PublicIntakeEventType" AS ENUM (
  'DRAFT_CREATED',
  'ENTRY_POINT_SELECTED',
  'ORIGINAL_INPUT_RECORDED',
  'ANSWER_RECORDED',
  'ANSWER_REVISED',
  'QUESTION_SKIPPED',
  'PHASE_CHANGED',
  'DRAFT_RESUMED',
  'DRAFT_EXPIRED_ACCESS_REJECTED'
);

CREATE TABLE "PublicIntakeDraft" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "phase" "PublicIntakePhase" NOT NULL DEFAULT 'STARTED',
  "entryPoint" "PublicIntakeEntryPoint" NOT NULL,
  "originalInput" TEXT,
  "selectedRequestKey" VARCHAR(100),
  "flowVersion" VARCHAR(50) NOT NULL,
  "currentStep" VARCHAR(100),
  "version" INTEGER NOT NULL DEFAULT 1,
  "startedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastInteractionAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMPTZ(3) NOT NULL,
  "submittedAt" TIMESTAMPTZ(3),
  "linkedAt" TIMESTAMPTZ(3),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "PublicIntakeDraft_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PublicIntakeDraft_version_check" CHECK ("version" > 0),
  CONSTRAINT "PublicIntakeDraft_expiry_check" CHECK ("expiresAt" > "startedAt"),
  CONSTRAINT "PublicIntakeDraft_entry_check" CHECK (
    ("entryPoint" = 'FREE_TEXT' AND "originalInput" IS NOT NULL AND "selectedRequestKey" IS NULL)
    OR
    ("entryPoint" = 'RECOGNIZABLE_REQUEST' AND "selectedRequestKey" IS NOT NULL)
  ),
  CONSTRAINT "PublicIntakeDraft_linked_phase_check" CHECK (
    "linkedAt" IS NULL OR "phase" IN ('ACCOUNT_LINKED', 'SUBMITTED')
  ),
  CONSTRAINT "PublicIntakeDraft_submitted_phase_check" CHECK (
    ("phase" = 'SUBMITTED' AND "submittedAt" IS NOT NULL)
    OR
    ("phase" <> 'SUBMITTED' AND "submittedAt" IS NULL)
  )
);

CREATE TABLE "PublicIntakeSession" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "draftId" UUID NOT NULL,
  "tokenHash" CHAR(64) NOT NULL,
  "expiresAt" TIMESTAMPTZ(3) NOT NULL,
  "lastUsedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastResumeEventAt" TIMESTAMPTZ(3),
  "expiredAccessRecordedAt" TIMESTAMPTZ(3),
  "revokedAt" TIMESTAMPTZ(3),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PublicIntakeSession_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PublicIntakeSession_expiry_check" CHECK ("expiresAt" > "createdAt")
);

CREATE TABLE "PublicIntakeAnswer" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "draftId" UUID NOT NULL,
  "questionKey" VARCHAR(100) NOT NULL,
  "questionVersion" INTEGER NOT NULL,
  "answerType" "PublicIntakeAnswerType" NOT NULL,
  "disposition" "PublicIntakeAnswerDisposition" NOT NULL DEFAULT 'ANSWERED',
  "version" INTEGER NOT NULL DEFAULT 1,
  "textValue" TEXT,
  "optionValue" VARCHAR(100),
  "numberValue" DECIMAL(12,2),
  "booleanValue" BOOLEAN,
  "dateValue" DATE,
  "periodValue" VARCHAR(100),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "PublicIntakeAnswer_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PublicIntakeAnswer_version_check" CHECK ("version" > 0 AND "questionVersion" > 0)
);

CREATE TABLE "PublicIntakeAnswerRevision" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "draftId" UUID NOT NULL,
  "answerId" UUID NOT NULL,
  "questionKey" VARCHAR(100) NOT NULL,
  "questionVersion" INTEGER NOT NULL,
  "revisionNumber" INTEGER NOT NULL,
  "answerType" "PublicIntakeAnswerType" NOT NULL,
  "disposition" "PublicIntakeAnswerDisposition" NOT NULL,
  "textValue" TEXT,
  "optionValue" VARCHAR(100),
  "numberValue" DECIMAL(12,2),
  "booleanValue" BOOLEAN,
  "dateValue" DATE,
  "periodValue" VARCHAR(100),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PublicIntakeAnswerRevision_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PublicIntakeAnswerRevision_version_check" CHECK (
    "revisionNumber" > 0 AND "questionVersion" > 0
  )
);

CREATE TABLE "PublicIntakeEvent" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "draftId" UUID NOT NULL,
  "sequence" INTEGER NOT NULL,
  "type" "PublicIntakeEventType" NOT NULL,
  "fromPhase" "PublicIntakePhase",
  "toPhase" "PublicIntakePhase",
  "questionKey" VARCHAR(100),
  "answerRevisionNumber" INTEGER,
  "detailCode" VARCHAR(100),
  "occurredAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PublicIntakeEvent_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PublicIntakeEvent_sequence_check" CHECK ("sequence" > 0),
  CONSTRAINT "PublicIntakeEvent_revision_check" CHECK (
    "answerRevisionNumber" IS NULL OR "answerRevisionNumber" > 0
  ),
  CONSTRAINT "PublicIntakeEvent_phase_check" CHECK (
    ("type" = 'PHASE_CHANGED' AND "fromPhase" IS NOT NULL AND "toPhase" IS NOT NULL)
    OR
    ("type" <> 'PHASE_CHANGED' AND "fromPhase" IS NULL AND "toPhase" IS NULL)
  )
);

CREATE UNIQUE INDEX "PublicIntakeSession_draftId_key" ON "PublicIntakeSession"("draftId");
CREATE UNIQUE INDEX "PublicIntakeSession_tokenHash_key" ON "PublicIntakeSession"("tokenHash");
CREATE INDEX "PublicIntakeSession_expiresAt_idx" ON "PublicIntakeSession"("expiresAt");
CREATE INDEX "PublicIntakeSession_revokedAt_idx" ON "PublicIntakeSession"("revokedAt");
CREATE INDEX "PublicIntakeDraft_phase_lastInteractionAt_idx" ON "PublicIntakeDraft"("phase", "lastInteractionAt");
CREATE INDEX "PublicIntakeDraft_expiresAt_idx" ON "PublicIntakeDraft"("expiresAt");
CREATE INDEX "PublicIntakeDraft_createdAt_idx" ON "PublicIntakeDraft"("createdAt");
CREATE UNIQUE INDEX "PublicIntakeAnswer_draftId_questionKey_key" ON "PublicIntakeAnswer"("draftId", "questionKey");
CREATE INDEX "PublicIntakeAnswer_draftId_idx" ON "PublicIntakeAnswer"("draftId");
CREATE INDEX "PublicIntakeAnswer_questionKey_idx" ON "PublicIntakeAnswer"("questionKey");
CREATE UNIQUE INDEX "PublicIntakeAnswerRevision_answerId_revisionNumber_key"
  ON "PublicIntakeAnswerRevision"("answerId", "revisionNumber");
CREATE INDEX "PublicIntakeAnswerRevision_draftId_questionKey_createdAt_idx"
  ON "PublicIntakeAnswerRevision"("draftId", "questionKey", "createdAt");
CREATE INDEX "PublicIntakeAnswerRevision_answerId_idx" ON "PublicIntakeAnswerRevision"("answerId");
CREATE UNIQUE INDEX "PublicIntakeEvent_draftId_sequence_key" ON "PublicIntakeEvent"("draftId", "sequence");
CREATE INDEX "PublicIntakeEvent_draftId_occurredAt_idx" ON "PublicIntakeEvent"("draftId", "occurredAt");
CREATE INDEX "PublicIntakeEvent_type_occurredAt_idx" ON "PublicIntakeEvent"("type", "occurredAt");

ALTER TABLE "PublicIntakeSession"
  ADD CONSTRAINT "PublicIntakeSession_draftId_fkey"
  FOREIGN KEY ("draftId") REFERENCES "PublicIntakeDraft"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PublicIntakeAnswer"
  ADD CONSTRAINT "PublicIntakeAnswer_draftId_fkey"
  FOREIGN KEY ("draftId") REFERENCES "PublicIntakeDraft"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PublicIntakeAnswerRevision"
  ADD CONSTRAINT "PublicIntakeAnswerRevision_draftId_fkey"
  FOREIGN KEY ("draftId") REFERENCES "PublicIntakeDraft"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PublicIntakeAnswerRevision"
  ADD CONSTRAINT "PublicIntakeAnswerRevision_answerId_fkey"
  FOREIGN KEY ("answerId") REFERENCES "PublicIntakeAnswer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PublicIntakeEvent"
  ADD CONSTRAINT "PublicIntakeEvent_draftId_fkey"
  FOREIGN KEY ("draftId") REFERENCES "PublicIntakeDraft"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE FUNCTION workmatchr_validate_public_intake_answer_values() RETURNS trigger AS $$
DECLARE
  populated INTEGER;
BEGIN
  populated :=
    (NEW."textValue" IS NOT NULL)::int +
    (NEW."optionValue" IS NOT NULL)::int +
    (NEW."numberValue" IS NOT NULL)::int +
    (NEW."booleanValue" IS NOT NULL)::int +
    (NEW."dateValue" IS NOT NULL)::int +
    (NEW."periodValue" IS NOT NULL)::int;

  IF NEW."disposition" IN ('UNKNOWN', 'SKIPPED') AND populated <> 0 THEN
    RAISE EXCEPTION 'Een overgeslagen of onbekend antwoord mag geen waarde bevatten.';
  END IF;

  IF NEW."disposition" = 'ANSWERED' AND populated <> 1 THEN
    RAISE EXCEPTION 'Een publiek intakeantwoord moet exact één getypeerde waarde bevatten.';
  END IF;

  IF NEW."disposition" = 'ANSWERED' AND NOT (
    (NEW."answerType" = 'TEXT' AND NEW."textValue" IS NOT NULL)
    OR (NEW."answerType" = 'OPTION' AND NEW."optionValue" IS NOT NULL)
    OR (NEW."answerType" = 'NUMBER' AND NEW."numberValue" IS NOT NULL)
    OR (NEW."answerType" = 'BOOLEAN' AND NEW."booleanValue" IS NOT NULL)
    OR (NEW."answerType" = 'DATE' AND NEW."dateValue" IS NOT NULL)
    OR (NEW."answerType" = 'PERIOD' AND NEW."periodValue" IS NOT NULL)
  ) THEN
    RAISE EXCEPTION 'De opgeslagen waarde past niet bij het antwoordtype.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "PublicIntakeAnswer_validate_values"
BEFORE INSERT OR UPDATE ON "PublicIntakeAnswer"
FOR EACH ROW EXECUTE FUNCTION workmatchr_validate_public_intake_answer_values();

CREATE TRIGGER "PublicIntakeAnswerRevision_validate_values"
BEFORE INSERT ON "PublicIntakeAnswerRevision"
FOR EACH ROW EXECUTE FUNCTION workmatchr_validate_public_intake_answer_values();

CREATE FUNCTION workmatchr_validate_public_intake_revision() RETURNS trigger AS $$
DECLARE
  expected_revision INTEGER;
  current_answer "PublicIntakeAnswer"%ROWTYPE;
BEGIN
  SELECT * INTO current_answer FROM "PublicIntakeAnswer" WHERE "id" = NEW."answerId";
  IF NOT FOUND
    OR current_answer."draftId" <> NEW."draftId"
    OR current_answer."questionKey" <> NEW."questionKey"
    OR current_answer."questionVersion" <> NEW."questionVersion"
    OR current_answer."answerType" <> NEW."answerType" THEN
    RAISE EXCEPTION 'De antwoordrevisie hoort niet bij het actuele antwoord.';
  END IF;

  SELECT COALESCE(MAX("revisionNumber"), 0) + 1 INTO expected_revision
  FROM "PublicIntakeAnswerRevision"
  WHERE "answerId" = NEW."answerId";

  IF NEW."revisionNumber" <> expected_revision OR NEW."revisionNumber" <> current_answer."version" THEN
    RAISE EXCEPTION 'De antwoordrevisie sluit niet opeenvolgend aan.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "PublicIntakeAnswerRevision_sequence"
BEFORE INSERT ON "PublicIntakeAnswerRevision"
FOR EACH ROW EXECUTE FUNCTION workmatchr_validate_public_intake_revision();

CREATE FUNCTION workmatchr_validate_public_intake_event_sequence() RETURNS trigger AS $$
DECLARE
  expected_sequence INTEGER;
BEGIN
  SELECT COALESCE(MAX("sequence"), 0) + 1 INTO expected_sequence
  FROM "PublicIntakeEvent"
  WHERE "draftId" = NEW."draftId";
  IF NEW."sequence" <> expected_sequence THEN
    RAISE EXCEPTION 'De publieke intake-eventvolgorde sluit niet aan.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "PublicIntakeEvent_sequence"
BEFORE INSERT ON "PublicIntakeEvent"
FOR EACH ROW EXECUTE FUNCTION workmatchr_validate_public_intake_event_sequence();

CREATE FUNCTION workmatchr_reject_public_intake_history_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION '% is append-only en mag niet worden gewijzigd of verwijderd.', TG_TABLE_NAME;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "PublicIntakeAnswerRevision_append_only"
BEFORE UPDATE OR DELETE ON "PublicIntakeAnswerRevision"
FOR EACH ROW EXECUTE FUNCTION workmatchr_reject_public_intake_history_mutation();

CREATE TRIGGER "PublicIntakeEvent_append_only"
BEFORE UPDATE OR DELETE ON "PublicIntakeEvent"
FOR EACH ROW EXECUTE FUNCTION workmatchr_reject_public_intake_history_mutation();

CREATE FUNCTION workmatchr_validate_public_intake_draft_update() RETURNS trigger AS $$
BEGIN
  IF OLD."entryPoint" <> NEW."entryPoint"
    OR OLD."originalInput" IS DISTINCT FROM NEW."originalInput"
    OR OLD."selectedRequestKey" IS DISTINCT FROM NEW."selectedRequestKey"
    OR OLD."flowVersion" <> NEW."flowVersion"
    OR OLD."startedAt" <> NEW."startedAt"
    OR OLD."expiresAt" <> NEW."expiresAt" THEN
    RAISE EXCEPTION 'De bron- en sessievelden van een publieke intake zijn immutable.';
  END IF;

  IF OLD."phase" <> NEW."phase" AND NOT (
    (OLD."phase" = 'STARTED' AND NEW."phase" IN ('CLARIFYING', 'ABANDONED'))
    OR (OLD."phase" = 'CLARIFYING' AND NEW."phase" IN ('SUMMARY_PRESENTED', 'ABANDONED'))
    OR (OLD."phase" = 'SUMMARY_PRESENTED' AND NEW."phase" IN ('CLARIFYING', 'REGISTRATION_STARTED', 'ABANDONED'))
    OR (OLD."phase" = 'REGISTRATION_STARTED' AND NEW."phase" IN ('SUMMARY_PRESENTED', 'ACCOUNT_LINKED', 'ABANDONED'))
    OR (OLD."phase" = 'ACCOUNT_LINKED' AND NEW."phase" = 'SUBMITTED')
    OR (OLD."phase" = 'ABANDONED' AND NEW."phase" IN ('CLARIFYING', 'SUMMARY_PRESENTED'))
  ) THEN
    RAISE EXCEPTION 'Ongeldige publieke intakefase-overgang.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "PublicIntakeDraft_validate_update"
BEFORE UPDATE ON "PublicIntakeDraft"
FOR EACH ROW EXECUTE FUNCTION workmatchr_validate_public_intake_draft_update();
