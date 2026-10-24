-- Forward-only correction for databases that applied the original retention migration.
-- CREATE OR REPLACE preserves the function identity used by its existing constraint
-- triggers, so this works both after a fresh original migration and as an upgrade.
CREATE OR REPLACE FUNCTION "learning_retention_check_completion_guard"() RETURNS trigger AS $$
DECLARE expected_count INTEGER; check_id UUID;
BEGIN
  IF TG_TABLE_NAME = 'LearningRetentionWeeklyCheck' THEN
    expected_count := 5;
    check_id := CASE WHEN TG_OP = 'DELETE' THEN OLD."id" ELSE NEW."id" END;
    IF (SELECT count(*) FROM "LearningRetentionWeeklyQuestion" WHERE "weeklyCheckId" = check_id) <> expected_count THEN
      RAISE EXCEPTION 'A weekly retention check must have exactly five fixed question versions';
    END IF;
  ELSIF TG_TABLE_NAME = 'LearningRetentionWeeklyQuestion' THEN
    expected_count := 5;
    check_id := CASE WHEN TG_OP = 'DELETE' THEN OLD."weeklyCheckId" ELSE NEW."weeklyCheckId" END;
    IF (SELECT count(*) FROM "LearningRetentionWeeklyQuestion" WHERE "weeklyCheckId" = check_id) <> expected_count THEN
      RAISE EXCEPTION 'A weekly retention check must have exactly five fixed question versions';
    END IF;
  ELSIF TG_TABLE_NAME = 'LearningRetentionAnnualCheck' THEN
    expected_count := 10;
    check_id := CASE WHEN TG_OP = 'DELETE' THEN OLD."id" ELSE NEW."id" END;
    IF (SELECT count(*) FROM "LearningRetentionAnnualQuestion" WHERE "annualCheckId" = check_id) <> expected_count THEN
      RAISE EXCEPTION 'An annual retention check must have exactly ten fixed question versions';
    END IF;
    IF (SELECT count(DISTINCT metadata."chapterNumber")
        FROM "LearningRetentionAnnualQuestion" assignment
        JOIN "LearningRetentionQuestion" metadata ON metadata."id" = assignment."retentionQuestionId"
        JOIN "LearningQuestion" question ON question."id" = metadata."questionId"
        WHERE assignment."annualCheckId" = check_id
          AND metadata."status" = 'PUBLISHED'
          AND question."status" = 'PUBLISHED_PROTOTYPE'
          AND metadata."chapterNumber" BETWEEN 1 AND 10) <> 10 THEN
      RAISE EXCEPTION 'An annual retention check must include one published question from each chapter H1-H10';
    END IF;
  ELSE
    expected_count := 10;
    check_id := CASE WHEN TG_OP = 'DELETE' THEN OLD."annualCheckId" ELSE NEW."annualCheckId" END;
    IF (SELECT count(*) FROM "LearningRetentionAnnualQuestion" WHERE "annualCheckId" = check_id) <> expected_count THEN
      RAISE EXCEPTION 'An annual retention check must have exactly ten fixed question versions';
    END IF;
    IF (SELECT count(DISTINCT metadata."chapterNumber")
        FROM "LearningRetentionAnnualQuestion" assignment
        JOIN "LearningRetentionQuestion" metadata ON metadata."id" = assignment."retentionQuestionId"
        JOIN "LearningQuestion" question ON question."id" = metadata."questionId"
        WHERE assignment."annualCheckId" = check_id
          AND metadata."status" = 'PUBLISHED'
          AND question."status" = 'PUBLISHED_PROTOTYPE'
          AND metadata."chapterNumber" BETWEEN 1 AND 10) <> 10 THEN
      RAISE EXCEPTION 'An annual retention check must include one published question from each chapter H1-H10';
    END IF;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;
