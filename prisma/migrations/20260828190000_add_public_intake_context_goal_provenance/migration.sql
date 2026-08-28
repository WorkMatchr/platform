ALTER TYPE "PublicIntakeAnswerType" ADD VALUE 'MULTI_OPTION' AFTER 'OPTION';

ALTER TABLE "PublicIntakeContextQuestion"
  ADD COLUMN "contextGoalCode" VARCHAR(120),
  ADD COLUMN "planningSnapshot" JSONB;

ALTER TABLE "PublicIntakeContextQuestion"
  ADD CONSTRAINT "PublicIntakeContextQuestion_contextGoalCode_check"
  CHECK (
    "contextGoalCode" IS NULL
    OR "contextGoalCode" ~ '^[A-Z0-9_]{2,120}$'
  );

CREATE INDEX "PublicIntakeContextQuestion_contextGoalCode_idx"
  ON "PublicIntakeContextQuestion"("contextGoalCode");

ALTER TABLE "PublicIntakeAnswer"
  ADD COLUMN "multiOptionValues" VARCHAR(100)[] NOT NULL DEFAULT ARRAY[]::VARCHAR(100)[];

ALTER TABLE "PublicIntakeAnswerRevision"
  ADD COLUMN "multiOptionValues" VARCHAR(100)[] NOT NULL DEFAULT ARRAY[]::VARCHAR(100)[];

CREATE OR REPLACE FUNCTION workmatchr_validate_public_intake_answer_values() RETURNS trigger AS $$
DECLARE
  populated INTEGER;
BEGIN
  populated :=
    (NEW."textValue" IS NOT NULL)::int +
    (NEW."optionValue" IS NOT NULL)::int +
    (cardinality(NEW."multiOptionValues") > 0)::int +
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
    OR (NEW."answerType" = 'MULTI_OPTION' AND cardinality(NEW."multiOptionValues") > 0)
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
