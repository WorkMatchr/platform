CREATE TYPE "LearningExamVersionStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'RETIRED');
CREATE TYPE "LearningExamAttemptStatus" AS ENUM ('IN_PROGRESS', 'SUBMITTED');

CREATE UNIQUE INDEX "LearningEnrollment_id_courseVersionId_userId_key" ON "LearningEnrollment"("id", "courseVersionId", "userId");

CREATE TABLE "LearningExam" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "courseId" UUID NOT NULL,
  "code" VARCHAR(80) NOT NULL,
  "title" VARCHAR(240) NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LearningExam_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "LearningExam_id_courseId_key" UNIQUE ("id", "courseId")
);
CREATE UNIQUE INDEX "LearningExam_code_key" ON "LearningExam"("code");
CREATE INDEX "LearningExam_courseId_idx" ON "LearningExam"("courseId");
ALTER TABLE "LearningExam" ADD CONSTRAINT "LearningExam_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "LearningCourse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "LearningExamVersion" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "examId" UUID NOT NULL,
  "courseId" UUID NOT NULL,
  "courseVersionId" UUID NOT NULL,
  "version" VARCHAR(40) NOT NULL,
  "status" "LearningExamVersionStatus" NOT NULL DEFAULT 'DRAFT',
  "questionCount" INTEGER NOT NULL,
  "maxScore" INTEGER NOT NULL,
  "passingScore" INTEGER NOT NULL,
  "passingPercentage" INTEGER NOT NULL,
  "timeLimitMinutes" INTEGER,
  "attemptLimit" INTEGER,
  "publishedAt" TIMESTAMPTZ(3),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LearningExamVersion_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "LearningExamVersion_id_examId_courseVersionId_key" UNIQUE ("id", "examId", "courseVersionId"),
  CONSTRAINT "LearningExamVersion_id_courseVersionId_key" UNIQUE ("id", "courseVersionId"),
  CONSTRAINT "LearningExamVersion_question_count_check" CHECK ("questionCount" > 0),
  CONSTRAINT "LearningExamVersion_score_config_check" CHECK ("maxScore" = "questionCount" AND "passingScore" BETWEEN 0 AND "maxScore" AND "passingPercentage" BETWEEN 0 AND 100 AND "passingPercentage" = floor(("passingScore" * 100.0) / "maxScore")::INTEGER),
  CONSTRAINT "LearningExamVersion_limits_check" CHECK (("timeLimitMinutes" IS NULL OR "timeLimitMinutes" > 0) AND ("attemptLimit" IS NULL OR "attemptLimit" > 0)),
  CONSTRAINT "LearningExamVersion_publication_check" CHECK (("status" = 'DRAFT' AND "publishedAt" IS NULL) OR ("status" IN ('PUBLISHED', 'RETIRED') AND "publishedAt" IS NOT NULL))
);
CREATE UNIQUE INDEX "LearningExamVersion_examId_version_key" ON "LearningExamVersion"("examId", "version");
CREATE UNIQUE INDEX "LearningExamVersion_published_exam_key" ON "LearningExamVersion"("examId") WHERE "status" = 'PUBLISHED';
CREATE INDEX "LearningExamVersion_status_publishedAt_idx" ON "LearningExamVersion"("status", "publishedAt");
ALTER TABLE "LearningExamVersion" ADD CONSTRAINT "LearningExamVersion_examId_courseId_fkey" FOREIGN KEY ("examId", "courseId") REFERENCES "LearningExam"("id", "courseId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LearningExamVersion" ADD CONSTRAINT "LearningExamVersion_courseVersionId_courseId_fkey" FOREIGN KEY ("courseVersionId", "courseId") REFERENCES "LearningCourseVersion"("id", "courseId") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "LearningExamQuestion" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "examVersionId" UUID NOT NULL,
  "questionId" UUID NOT NULL,
  "code" VARCHAR(40) NOT NULL,
  "position" INTEGER NOT NULL,
  "chapterNumber" INTEGER NOT NULL,
  "cognitiveLevel" VARCHAR(1) NOT NULL,
  "knowledgeAreas" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "isCritical" BOOLEAN NOT NULL DEFAULT FALSE,
  CONSTRAINT "LearningExamQuestion_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "LearningExamQuestion_examVersionId_questionId_key" UNIQUE ("examVersionId", "questionId"),
  CONSTRAINT "LearningExamQuestion_examVersionId_position_key" UNIQUE ("examVersionId", "position"),
  CONSTRAINT "LearningExamQuestion_examVersionId_code_key" UNIQUE ("examVersionId", "code"),
  CONSTRAINT "LearningExamQuestion_position_check" CHECK ("position" > 0),
  CONSTRAINT "LearningExamQuestion_code_check" CHECK ("code" ~ '^E[0-9]{2}$'),
  CONSTRAINT "LearningExamQuestion_chapter_check" CHECK ("chapterNumber" BETWEEN 1 AND 10),
  CONSTRAINT "LearningExamQuestion_cognitive_level_check" CHECK ("cognitiveLevel" IN ('B', 'T', 'A')),
  CONSTRAINT "LearningExamQuestion_knowledge_areas_check" CHECK (cardinality("knowledgeAreas") > 0)
);
CREATE INDEX "LearningExamQuestion_questionId_idx" ON "LearningExamQuestion"("questionId");
ALTER TABLE "LearningExamQuestion" ADD CONSTRAINT "LearningExamQuestion_examVersionId_fkey" FOREIGN KEY ("examVersionId") REFERENCES "LearningExamVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LearningExamQuestion" ADD CONSTRAINT "LearningExamQuestion_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "LearningQuestion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "LearningExamAttempt" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL,
  "enrollmentId" UUID NOT NULL,
  "examId" UUID NOT NULL,
  "examVersionId" UUID NOT NULL,
  "courseVersionId" UUID NOT NULL,
  "attemptNumber" INTEGER NOT NULL,
  "status" "LearningExamAttemptStatus" NOT NULL DEFAULT 'IN_PROGRESS',
  "currentPosition" INTEGER NOT NULL DEFAULT 1,
  "maxScore" INTEGER NOT NULL,
  "passingScore" INTEGER NOT NULL,
  "score" INTEGER,
  "percentage" INTEGER,
  "passed" BOOLEAN,
  "startedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "submittedAt" TIMESTAMPTZ(3),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LearningExamAttempt_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "LearningExamAttempt_enrollmentId_examId_attemptNumber_key" UNIQUE ("enrollmentId", "examId", "attemptNumber"),
  CONSTRAINT "LearningExamAttempt_id_examVersionId_key" UNIQUE ("id", "examVersionId"),
  CONSTRAINT "LearningExamAttempt_number_position_check" CHECK ("attemptNumber" > 0 AND "currentPosition" > 0),
  CONSTRAINT "LearningExamAttempt_score_snapshot_check" CHECK ("maxScore" > 0 AND "passingScore" BETWEEN 0 AND "maxScore"),
  CONSTRAINT "LearningExamAttempt_result_check" CHECK (
    ("status" = 'IN_PROGRESS' AND "submittedAt" IS NULL AND "score" IS NULL AND "percentage" IS NULL AND "passed" IS NULL)
    OR ("status" = 'SUBMITTED' AND "submittedAt" IS NOT NULL AND "score" BETWEEN 0 AND "maxScore" AND "percentage" = floor(("score" * 100.0) / "maxScore")::INTEGER AND "passed" = ("score" >= "passingScore"))
  )
);
CREATE UNIQUE INDEX "LearningExamAttempt_one_active_exam_idx" ON "LearningExamAttempt"("enrollmentId", "examId") WHERE "status" = 'IN_PROGRESS';
CREATE INDEX "LearningExamAttempt_userId_examId_startedAt_idx" ON "LearningExamAttempt"("userId", "examId", "startedAt");
CREATE INDEX "LearningExamAttempt_enrollmentId_examId_status_idx" ON "LearningExamAttempt"("enrollmentId", "examId", "status");
ALTER TABLE "LearningExamAttempt" ADD CONSTRAINT "LearningExamAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LearningExamAttempt" ADD CONSTRAINT "LearningExamAttempt_enrollmentId_courseVersionId_userId_fkey" FOREIGN KEY ("enrollmentId", "courseVersionId", "userId") REFERENCES "LearningEnrollment"("id", "courseVersionId", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LearningExamAttempt" ADD CONSTRAINT "LearningExamAttempt_examVersionId_examId_courseVersionId_fkey" FOREIGN KEY ("examVersionId", "examId", "courseVersionId") REFERENCES "LearningExamVersion"("id", "examId", "courseVersionId") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "LearningExamAnswer" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "attemptId" UUID NOT NULL,
  "examVersionId" UUID NOT NULL,
  "questionId" UUID NOT NULL,
  "answer" JSONB NOT NULL,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "LearningExamAnswer_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "LearningExamAnswer_attemptId_questionId_key" UNIQUE ("attemptId", "questionId")
);
CREATE INDEX "LearningExamAnswer_examVersionId_questionId_idx" ON "LearningExamAnswer"("examVersionId", "questionId");
ALTER TABLE "LearningExamAnswer" ADD CONSTRAINT "LearningExamAnswer_attemptId_examVersionId_fkey" FOREIGN KEY ("attemptId", "examVersionId") REFERENCES "LearningExamAttempt"("id", "examVersionId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LearningExamAnswer" ADD CONSTRAINT "LearningExamAnswer_examVersionId_questionId_fkey" FOREIGN KEY ("examVersionId", "questionId") REFERENCES "LearningExamQuestion"("examVersionId", "questionId") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE FUNCTION "learning_exam_version_guard"() RETURNS trigger AS $$
DECLARE
  configured_count INTEGER;
  first_position INTEGER;
  last_position INTEGER;
  invalid_question BOOLEAN;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW."status" <> 'DRAFT' OR NEW."publishedAt" IS NOT NULL THEN
      RAISE EXCEPTION 'LearningExamVersion must be created as DRAFT';
    END IF;
    RETURN NEW;
  END IF;
  IF TG_OP = 'DELETE' THEN
    IF OLD."status" <> 'DRAFT' THEN RAISE EXCEPTION 'Published or retired LearningExamVersion cannot be deleted'; END IF;
    RETURN OLD;
  END IF;
  IF OLD."status" <> 'DRAFT' THEN
    IF OLD."status" = 'PUBLISHED' AND NEW."status" = 'RETIRED'
      AND (to_jsonb(NEW) - 'status') IS NOT DISTINCT FROM (to_jsonb(OLD) - 'status') THEN RETURN NEW; END IF;
    IF to_jsonb(NEW) IS NOT DISTINCT FROM to_jsonb(OLD) THEN RETURN NEW; END IF;
    RAISE EXCEPTION 'Published or retired LearningExamVersion is immutable';
  END IF;
  IF NEW."status" = 'RETIRED' THEN RAISE EXCEPTION 'Draft LearningExamVersion must be published before retirement'; END IF;
  IF NEW."status" = 'PUBLISHED' THEN
    IF NEW."publishedAt" IS NULL THEN RAISE EXCEPTION 'Published LearningExamVersion requires publishedAt'; END IF;
    IF NEW."version" = 'WL-001-EXAM-1.0' AND
      (NEW."questionCount" <> 50 OR NEW."maxScore" <> 50 OR NEW."passingScore" <> 40 OR NEW."passingPercentage" <> 80
        OR NEW."timeLimitMinutes" IS NOT NULL OR NEW."attemptLimit" IS NOT NULL) THEN
      RAISE EXCEPTION 'WL-001-EXAM-1.0 must retain its approved 50-question, 40/50, untimed configuration';
    END IF;
    SELECT count(*)::INTEGER, min("position"), max("position")
      INTO configured_count, first_position, last_position
      FROM "LearningExamQuestion" WHERE "examVersionId" = NEW."id";
    IF configured_count <> NEW."questionCount" OR first_position <> 1 OR last_position <> NEW."questionCount" THEN
      RAISE EXCEPTION 'Published LearningExamVersion question set must be complete and consecutively positioned';
    END IF;
    SELECT EXISTS (
      SELECT 1 FROM "LearningExamQuestion" mapping
      JOIN "LearningQuestion" question ON question."id" = mapping."questionId"
      WHERE mapping."examVersionId" = NEW."id"
        AND (
          question."type" NOT IN ('SINGLE_CHOICE', 'MULTI_CHOICE')
          OR (question."type" = 'SINGLE_CHOICE' AND (
            jsonb_typeof(question."correctAnswer") <> 'array'
            OR jsonb_array_length(question."correctAnswer") <> 1
            OR (SELECT count(*) FROM "LearningQuestionOption" option WHERE option."questionId" = question."id" AND option."isCorrect") <> 1
            OR NOT EXISTS (SELECT 1 FROM "LearningQuestionOption" option WHERE option."questionId" = question."id" AND option."isCorrect" AND option."value" = question."correctAnswer"->>0)
          ))
          OR (question."type" = 'MULTI_CHOICE' AND (
            jsonb_typeof(question."correctAnswer") <> 'array'
            OR jsonb_array_length(question."correctAnswer") = 0
            OR (SELECT count(DISTINCT value) FROM jsonb_array_elements_text(question."correctAnswer") item(value)) <> jsonb_array_length(question."correctAnswer")
            OR EXISTS (SELECT 1 FROM jsonb_array_elements_text(question."correctAnswer") answer(value)
              WHERE NOT EXISTS (SELECT 1 FROM "LearningQuestionOption" option WHERE option."questionId" = question."id" AND option."isCorrect" AND option."value" = answer.value))
            OR EXISTS (SELECT 1 FROM "LearningQuestionOption" option WHERE option."questionId" = question."id" AND option."isCorrect"
              AND NOT EXISTS (SELECT 1 FROM jsonb_array_elements_text(question."correctAnswer") answer(value) WHERE answer.value = option."value"))
          ))
        )
    ) INTO invalid_question;
    IF invalid_question THEN RAISE EXCEPTION 'Published LearningExamVersion contains an invalid or unsupported question'; END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER "LearningExamVersion_immutable_published"
BEFORE INSERT OR UPDATE OR DELETE ON "LearningExamVersion"
FOR EACH ROW EXECUTE FUNCTION "learning_exam_version_guard"();

CREATE FUNCTION "learning_exam_question_guard"() RETURNS trigger AS $$
DECLARE
  version_id UUID;
  version_status "LearningExamVersionStatus";
BEGIN
  IF TG_OP = 'DELETE' THEN version_id := OLD."examVersionId"; ELSE version_id := NEW."examVersionId"; END IF;
  SELECT "status" INTO version_status FROM "LearningExamVersion" WHERE "id" = version_id;
  IF version_status IS DISTINCT FROM 'DRAFT' THEN RAISE EXCEPTION 'Questions in a published or retired exam version are immutable'; END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER "LearningExamQuestion_immutable_published"
BEFORE INSERT OR UPDATE OR DELETE ON "LearningExamQuestion"
FOR EACH ROW EXECUTE FUNCTION "learning_exam_question_guard"();

CREATE OR REPLACE FUNCTION "learning_question_is_editable"(question_id UUID) RETURNS BOOLEAN AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM "LearningContentBlock" block
    JOIN "LearningChapter" chapter ON chapter."id" = block."chapterId"
    JOIN "LearningCourseVersion" version ON version."id" = chapter."courseVersionId"
    WHERE block."questionId" = question_id AND version."status" IN ('PUBLISHED', 'RETIRED')
  ) AND NOT EXISTS (
    SELECT 1 FROM "LearningExamQuestion" mapping
    JOIN "LearningExamVersion" version ON version."id" = mapping."examVersionId"
    WHERE mapping."questionId" = question_id AND version."status" IN ('PUBLISHED', 'RETIRED')
  );
$$ LANGUAGE sql STABLE;

CREATE FUNCTION "learning_exam_attempt_guard"() RETURNS trigger AS $$
DECLARE
  exam_status "LearningExamVersionStatus";
  configured_max INTEGER;
  configured_pass INTEGER;
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'LearningExamAttempt history cannot be deleted'; END IF;
  IF TG_OP = 'INSERT' THEN
    IF NEW."status" <> 'IN_PROGRESS' OR NEW."score" IS NOT NULL OR NEW."percentage" IS NOT NULL OR NEW."passed" IS NOT NULL OR NEW."submittedAt" IS NOT NULL THEN
      RAISE EXCEPTION 'Exam attempts must start as an unscored IN_PROGRESS attempt';
    END IF;
    SELECT "status", "maxScore", "passingScore" INTO exam_status, configured_max, configured_pass
      FROM "LearningExamVersion" WHERE "id" = NEW."examVersionId";
    IF exam_status <> 'PUBLISHED' OR NEW."maxScore" <> configured_max OR NEW."passingScore" <> configured_pass THEN
      RAISE EXCEPTION 'Attempt must reference a published exam version and snapshot its scoring configuration';
    END IF;
    RETURN NEW;
  END IF;
  IF OLD."status" = 'SUBMITTED' THEN
    IF to_jsonb(NEW) IS NOT DISTINCT FROM to_jsonb(OLD) THEN RETURN NEW; END IF;
    RAISE EXCEPTION 'Submitted LearningExamAttempt is immutable';
  END IF;
  IF ROW(NEW."id", NEW."userId", NEW."enrollmentId", NEW."examId", NEW."examVersionId", NEW."courseVersionId", NEW."attemptNumber", NEW."maxScore", NEW."passingScore", NEW."startedAt", NEW."createdAt")
    IS DISTINCT FROM ROW(OLD."id", OLD."userId", OLD."enrollmentId", OLD."examId", OLD."examVersionId", OLD."courseVersionId", OLD."attemptNumber", OLD."maxScore", OLD."passingScore", OLD."startedAt", OLD."createdAt") THEN
    RAISE EXCEPTION 'Exam attempt identity and score snapshots are immutable';
  END IF;
  IF NEW."status" = 'IN_PROGRESS' AND (NEW."submittedAt" IS NOT NULL OR NEW."score" IS NOT NULL OR NEW."percentage" IS NOT NULL OR NEW."passed" IS NOT NULL) THEN
    RAISE EXCEPTION 'An in-progress exam attempt cannot have a result';
  END IF;
  IF NEW."status" = 'SUBMITTED' THEN
    IF NEW."submittedAt" IS NULL OR NEW."score" IS NULL OR NEW."percentage" IS NULL OR NEW."passed" IS NULL
      OR NEW."score" < 0 OR NEW."score" > NEW."maxScore"
      OR NEW."percentage" <> floor((NEW."score" * 100.0) / NEW."maxScore")::INTEGER
      OR NEW."passed" <> (NEW."score" >= NEW."passingScore") THEN
      RAISE EXCEPTION 'Submitted exam result is incomplete or inconsistent';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER "LearningExamAttempt_immutable_submitted"
BEFORE INSERT OR UPDATE OR DELETE ON "LearningExamAttempt"
FOR EACH ROW EXECUTE FUNCTION "learning_exam_attempt_guard"();

CREATE FUNCTION "learning_exam_answer_guard"() RETURNS trigger AS $$
DECLARE
  attempt_id UUID;
  version_id UUID;
  question_id UUID;
  answer_value JSONB;
  attempt_status "LearningExamAttemptStatus";
  question_type "LearningQuestionType";
  answer_count INTEGER;
  distinct_count INTEGER;
  valid_count INTEGER;
BEGIN
  IF TG_OP = 'DELETE' THEN
    attempt_id := OLD."attemptId";
  ELSE
    attempt_id := NEW."attemptId";
    version_id := NEW."examVersionId";
    question_id := NEW."questionId";
    answer_value := NEW."answer";
  END IF;
  SELECT "status" INTO attempt_status FROM "LearningExamAttempt" WHERE "id" = attempt_id;
  IF attempt_status IS DISTINCT FROM 'IN_PROGRESS' THEN RAISE EXCEPTION 'Answers can only be changed during an active exam attempt'; END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  SELECT question."type" INTO question_type
    FROM "LearningExamQuestion" mapping JOIN "LearningQuestion" question ON question."id" = mapping."questionId"
    WHERE mapping."examVersionId" = version_id AND mapping."questionId" = question_id;
  IF question_type IS NULL THEN RAISE EXCEPTION 'Answer question is not part of this exam version'; END IF;
  IF question_type = 'SINGLE_CHOICE' THEN
    IF jsonb_typeof(answer_value) <> 'string'
      OR NOT EXISTS (SELECT 1 FROM "LearningQuestionOption" option WHERE option."questionId" = question_id AND option."value" = answer_value #>> '{}') THEN
      RAISE EXCEPTION 'Single-choice answer must select an option belonging to its exam question';
    END IF;
  ELSIF question_type = 'MULTI_CHOICE' THEN
    IF jsonb_typeof(answer_value) <> 'array' THEN RAISE EXCEPTION 'Multi-choice answer must be a JSON array'; END IF;
    SELECT count(*)::INTEGER, count(DISTINCT value)::INTEGER INTO answer_count, distinct_count
      FROM jsonb_array_elements_text(answer_value) item(value);
    SELECT count(*)::INTEGER INTO valid_count
      FROM jsonb_array_elements_text(answer_value) item(value)
      JOIN "LearningQuestionOption" option ON option."questionId" = question_id AND option."value" = item.value;
    IF answer_count <> distinct_count OR answer_count <> valid_count THEN
      RAISE EXCEPTION 'Multi-choice answer contains duplicate or foreign options';
    END IF;
  ELSE
    RAISE EXCEPTION 'Unsupported question type in exam answer';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER "LearningExamAnswer_active_only"
BEFORE INSERT OR UPDATE OR DELETE ON "LearningExamAnswer"
FOR EACH ROW EXECUTE FUNCTION "learning_exam_answer_guard"();
