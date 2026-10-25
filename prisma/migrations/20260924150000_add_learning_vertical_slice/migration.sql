CREATE TYPE "LearningCourseStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');
CREATE TYPE "LearningCourseVersionStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'RETIRED');
CREATE TYPE "LearningEnrollmentStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED');
CREATE TYPE "LearningProgressStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED');
CREATE TYPE "LearningContentBlockType" AS ENUM ('HEADING', 'TEXT', 'CALLOUT', 'IMAGE', 'PROCESS', 'SINGLE_CHOICE', 'MULTI_CHOICE', 'TRUE_FALSE', 'SORTING', 'CASE_STUDY', 'SUMMARY');
CREATE TYPE "LearningQuestionType" AS ENUM ('SINGLE_CHOICE', 'MULTI_CHOICE', 'TRUE_FALSE', 'SORTING', 'CASE_STUDY');

CREATE TABLE "LearningProfile" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "LearningProfile_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "LearningProfile_userId_key" ON "LearningProfile"("userId");
CREATE INDEX "LearningProfile_createdAt_idx" ON "LearningProfile"("createdAt");
ALTER TABLE "LearningProfile" ADD CONSTRAINT "LearningProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "LearningCourse" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "slug" VARCHAR(120) NOT NULL,
  "code" VARCHAR(40) NOT NULL,
  "title" VARCHAR(240) NOT NULL,
  "description" TEXT NOT NULL,
  "status" "LearningCourseStatus" NOT NULL DEFAULT 'DRAFT',
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "LearningCourse_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "LearningCourse_slug_key" ON "LearningCourse"("slug");
CREATE UNIQUE INDEX "LearningCourse_code_key" ON "LearningCourse"("code");
CREATE INDEX "LearningCourse_status_title_idx" ON "LearningCourse"("status", "title");

CREATE TABLE "LearningCourseVersion" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "courseId" UUID NOT NULL,
  "version" VARCHAR(40) NOT NULL,
  "status" "LearningCourseVersionStatus" NOT NULL DEFAULT 'DRAFT',
  "publishedAt" TIMESTAMPTZ(3),
  "validFrom" TIMESTAMPTZ(3),
  "reviewDueAt" TIMESTAMPTZ(3),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LearningCourseVersion_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "LearningCourseVersion_courseId_version_key" ON "LearningCourseVersion"("courseId", "version");
CREATE UNIQUE INDEX "LearningCourseVersion_id_courseId_key" ON "LearningCourseVersion"("id", "courseId");
CREATE UNIQUE INDEX "LearningCourseVersion_published_course_key" ON "LearningCourseVersion"("courseId") WHERE "status" = 'PUBLISHED';
CREATE INDEX "LearningCourseVersion_status_publishedAt_idx" ON "LearningCourseVersion"("status", "publishedAt");
ALTER TABLE "LearningCourseVersion" ADD CONSTRAINT "LearningCourseVersion_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "LearningCourse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "LearningChapter" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "courseVersionId" UUID NOT NULL,
  "slug" VARCHAR(120) NOT NULL,
  "title" VARCHAR(240) NOT NULL,
  "position" INTEGER NOT NULL,
  "estimatedMinutes" INTEGER NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LearningChapter_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "LearningChapter_position_check" CHECK ("position" > 0),
  CONSTRAINT "LearningChapter_estimatedMinutes_check" CHECK ("estimatedMinutes" > 0)
);
CREATE UNIQUE INDEX "LearningChapter_courseVersionId_slug_key" ON "LearningChapter"("courseVersionId", "slug");
CREATE UNIQUE INDEX "LearningChapter_courseVersionId_position_key" ON "LearningChapter"("courseVersionId", "position");
CREATE UNIQUE INDEX "LearningChapter_id_courseVersionId_key" ON "LearningChapter"("id", "courseVersionId");
CREATE INDEX "LearningChapter_courseVersionId_position_idx" ON "LearningChapter"("courseVersionId", "position");
ALTER TABLE "LearningChapter" ADD CONSTRAINT "LearningChapter_courseVersionId_fkey" FOREIGN KEY ("courseVersionId") REFERENCES "LearningCourseVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "LearningQuestion" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "code" VARCHAR(80) NOT NULL,
  "knowledgeArea" VARCHAR(120) NOT NULL,
  "learningObjective" VARCHAR(240) NOT NULL,
  "type" "LearningQuestionType" NOT NULL,
  "difficulty" INTEGER NOT NULL DEFAULT 1,
  "questionText" TEXT NOT NULL,
  "explanation" TEXT NOT NULL,
  "correctAnswer" JSONB NOT NULL,
  "status" VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
  "version" INTEGER NOT NULL DEFAULT 1,
  CONSTRAINT "LearningQuestion_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "LearningQuestion_difficulty_check" CHECK ("difficulty" BETWEEN 1 AND 5),
  CONSTRAINT "LearningQuestion_version_check" CHECK ("version" > 0)
);
CREATE UNIQUE INDEX "LearningQuestion_code_version_key" ON "LearningQuestion"("code", "version");
CREATE INDEX "LearningQuestion_knowledgeArea_learningObjective_idx" ON "LearningQuestion"("knowledgeArea", "learningObjective");
CREATE INDEX "LearningQuestion_status_type_idx" ON "LearningQuestion"("status", "type");

CREATE TABLE "LearningContentBlock" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "chapterId" UUID NOT NULL,
  "position" INTEGER NOT NULL,
  "type" "LearningContentBlockType" NOT NULL,
  "data" JSONB NOT NULL,
  "questionId" UUID,
  CONSTRAINT "LearningContentBlock_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "LearningContentBlock_position_check" CHECK ("position" > 0)
);
CREATE UNIQUE INDEX "LearningContentBlock_chapterId_position_key" ON "LearningContentBlock"("chapterId", "position");
CREATE INDEX "LearningContentBlock_chapterId_position_idx" ON "LearningContentBlock"("chapterId", "position");
CREATE INDEX "LearningContentBlock_questionId_idx" ON "LearningContentBlock"("questionId");
ALTER TABLE "LearningContentBlock" ADD CONSTRAINT "LearningContentBlock_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "LearningChapter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LearningContentBlock" ADD CONSTRAINT "LearningContentBlock_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "LearningQuestion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "LearningQuestionOption" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "questionId" UUID NOT NULL,
  "value" VARCHAR(100) NOT NULL,
  "text" TEXT NOT NULL,
  "isCorrect" BOOLEAN NOT NULL DEFAULT false,
  "position" INTEGER NOT NULL,
  CONSTRAINT "LearningQuestionOption_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "LearningQuestionOption_position_check" CHECK ("position" > 0)
);
CREATE UNIQUE INDEX "LearningQuestionOption_questionId_position_key" ON "LearningQuestionOption"("questionId", "position");
CREATE UNIQUE INDEX "LearningQuestionOption_questionId_value_key" ON "LearningQuestionOption"("questionId", "value");
CREATE INDEX "LearningQuestionOption_questionId_idx" ON "LearningQuestionOption"("questionId");
ALTER TABLE "LearningQuestionOption" ADD CONSTRAINT "LearningQuestionOption_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "LearningQuestion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "LearningEnrollment" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL,
  "courseVersionId" UUID NOT NULL,
  "status" "LearningEnrollmentStatus" NOT NULL DEFAULT 'NOT_STARTED',
  "startedAt" TIMESTAMPTZ(3),
  "completedAt" TIMESTAMPTZ(3),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "LearningEnrollment_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "LearningEnrollment_dates_check" CHECK (("status" = 'NOT_STARTED' AND "startedAt" IS NULL AND "completedAt" IS NULL) OR ("status" = 'IN_PROGRESS' AND "startedAt" IS NOT NULL AND "completedAt" IS NULL) OR ("status" = 'COMPLETED' AND "startedAt" IS NOT NULL AND "completedAt" IS NOT NULL))
);
CREATE UNIQUE INDEX "LearningEnrollment_userId_courseVersionId_key" ON "LearningEnrollment"("userId", "courseVersionId");
CREATE UNIQUE INDEX "LearningEnrollment_id_courseVersionId_key" ON "LearningEnrollment"("id", "courseVersionId");
CREATE UNIQUE INDEX "LearningEnrollment_id_userId_key" ON "LearningEnrollment"("id", "userId");
CREATE INDEX "LearningEnrollment_userId_status_updatedAt_idx" ON "LearningEnrollment"("userId", "status", "updatedAt");
ALTER TABLE "LearningEnrollment" ADD CONSTRAINT "LearningEnrollment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LearningEnrollment" ADD CONSTRAINT "LearningEnrollment_courseVersionId_fkey" FOREIGN KEY ("courseVersionId") REFERENCES "LearningCourseVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "LearningChapterProgress" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "enrollmentId" UUID NOT NULL,
  "courseVersionId" UUID NOT NULL,
  "chapterId" UUID NOT NULL,
  "status" "LearningProgressStatus" NOT NULL DEFAULT 'NOT_STARTED',
  "progressPercentage" INTEGER NOT NULL DEFAULT 0,
  "startedAt" TIMESTAMPTZ(3),
  "lastVisitedAt" TIMESTAMPTZ(3),
  "completedAt" TIMESTAMPTZ(3),
  "lastCompletedBlockId" UUID,
  CONSTRAINT "LearningChapterProgress_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "LearningChapterProgress_percentage_check" CHECK ("progressPercentage" BETWEEN 0 AND 100),
  CONSTRAINT "LearningChapterProgress_dates_check" CHECK (("status" = 'NOT_STARTED' AND "completedAt" IS NULL) OR ("status" = 'IN_PROGRESS' AND "startedAt" IS NOT NULL AND "completedAt" IS NULL) OR ("status" = 'COMPLETED' AND "startedAt" IS NOT NULL AND "completedAt" IS NOT NULL))
);
CREATE UNIQUE INDEX "LearningChapterProgress_enrollmentId_chapterId_key" ON "LearningChapterProgress"("enrollmentId", "chapterId");
CREATE INDEX "LearningChapterProgress_enrollmentId_status_idx" ON "LearningChapterProgress"("enrollmentId", "status");
ALTER TABLE "LearningChapterProgress" ADD CONSTRAINT "LearningChapterProgress_enrollmentId_courseVersionId_fkey" FOREIGN KEY ("enrollmentId", "courseVersionId") REFERENCES "LearningEnrollment"("id", "courseVersionId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LearningChapterProgress" ADD CONSTRAINT "LearningChapterProgress_chapterId_courseVersionId_fkey" FOREIGN KEY ("chapterId", "courseVersionId") REFERENCES "LearningChapter"("id", "courseVersionId") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "LearningQuestionAttempt" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "enrollmentId" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "questionId" UUID NOT NULL,
  "chapterId" UUID NOT NULL,
  "attemptNumber" INTEGER NOT NULL,
  "answer" JSONB NOT NULL,
  "correct" BOOLEAN NOT NULL,
  "answeredAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LearningQuestionAttempt_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "LearningQuestionAttempt_number_check" CHECK ("attemptNumber" > 0)
);
CREATE UNIQUE INDEX "LearningQuestionAttempt_enrollmentId_questionId_attemptNumb_key" ON "LearningQuestionAttempt"("enrollmentId", "questionId", "attemptNumber");
CREATE INDEX "LearningQuestionAttempt_userId_enrollmentId_answeredAt_idx" ON "LearningQuestionAttempt"("userId", "enrollmentId", "answeredAt");
CREATE INDEX "LearningQuestionAttempt_questionId_answeredAt_idx" ON "LearningQuestionAttempt"("questionId", "answeredAt");
ALTER TABLE "LearningQuestionAttempt" ADD CONSTRAINT "LearningQuestionAttempt_enrollmentId_userId_fkey" FOREIGN KEY ("enrollmentId", "userId") REFERENCES "LearningEnrollment"("id", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LearningQuestionAttempt" ADD CONSTRAINT "LearningQuestionAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LearningQuestionAttempt" ADD CONSTRAINT "LearningQuestionAttempt_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "LearningQuestion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LearningQuestionAttempt" ADD CONSTRAINT "LearningQuestionAttempt_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "LearningChapter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "LearningInteractionAttempt" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "enrollmentId" UUID NOT NULL,
  "contentBlockId" UUID NOT NULL,
  "completedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LearningInteractionAttempt_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "LearningInteractionAttempt_enrollmentId_contentBlockId_key" ON "LearningInteractionAttempt"("enrollmentId", "contentBlockId");
CREATE INDEX "LearningInteractionAttempt_enrollmentId_completedAt_idx" ON "LearningInteractionAttempt"("enrollmentId", "completedAt");
ALTER TABLE "LearningInteractionAttempt" ADD CONSTRAINT "LearningInteractionAttempt_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "LearningEnrollment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LearningInteractionAttempt" ADD CONSTRAINT "LearningInteractionAttempt_contentBlockId_fkey" FOREIGN KEY ("contentBlockId") REFERENCES "LearningContentBlock"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LearningCourseVersion" ADD COLUMN "sourceMetadata" JSONB;

CREATE FUNCTION "learning_protect_published_course_version"() RETURNS trigger AS $$
BEGIN
  IF OLD."status" IN ('PUBLISHED', 'RETIRED') THEN
    IF OLD."status" = 'PUBLISHED'
      AND NEW."status" = 'RETIRED'
      AND (to_jsonb(NEW) - 'status') IS NOT DISTINCT FROM (to_jsonb(OLD) - 'status') THEN
      RETURN NEW;
    END IF;
    IF to_jsonb(NEW) IS NOT DISTINCT FROM to_jsonb(OLD) THEN
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'Published or retired LearningCourseVersion is immutable';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER "LearningCourseVersion_immutable_published"
BEFORE UPDATE ON "LearningCourseVersion"
FOR EACH ROW EXECUTE FUNCTION "learning_protect_published_course_version"();
CREATE FUNCTION "learning_reject_published_course_version_delete"() RETURNS trigger AS $$
BEGIN
  IF OLD."status" IN ('PUBLISHED', 'RETIRED') THEN
    RAISE EXCEPTION 'Published or retired LearningCourseVersion cannot be deleted';
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER "LearningCourseVersion_no_delete_published"
BEFORE DELETE ON "LearningCourseVersion"
FOR EACH ROW EXECUTE FUNCTION "learning_reject_published_course_version_delete"();

CREATE FUNCTION "learning_chapter_version_is_editable"(version_id UUID) RETURNS BOOLEAN AS $$
  SELECT COALESCE((SELECT "status" = 'DRAFT' FROM "LearningCourseVersion" WHERE "id" = version_id), false);
$$ LANGUAGE sql STABLE;
CREATE FUNCTION "learning_protect_published_chapter"() RETURNS trigger AS $$
DECLARE
  old_version UUID;
  new_version UUID;
BEGIN
  IF TG_OP <> 'INSERT' THEN old_version := OLD."courseVersionId"; END IF;
  IF TG_OP <> 'DELETE' THEN new_version := NEW."courseVersionId"; END IF;
  IF (old_version IS NOT NULL AND NOT "learning_chapter_version_is_editable"(old_version))
    OR (new_version IS NOT NULL AND NOT "learning_chapter_version_is_editable"(new_version)) THEN
    RAISE EXCEPTION 'Chapter content for a published or retired course version is immutable';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER "LearningChapter_immutable_published"
BEFORE INSERT OR UPDATE OR DELETE ON "LearningChapter"
FOR EACH ROW EXECUTE FUNCTION "learning_protect_published_chapter"();

CREATE FUNCTION "learning_protect_published_block"() RETURNS trigger AS $$
DECLARE
  old_version UUID;
  new_version UUID;
BEGIN
  IF TG_OP <> 'INSERT' THEN
    SELECT "courseVersionId" INTO old_version FROM "LearningChapter" WHERE "id" = OLD."chapterId";
  END IF;
  IF TG_OP <> 'DELETE' THEN
    SELECT "courseVersionId" INTO new_version FROM "LearningChapter" WHERE "id" = NEW."chapterId";
  END IF;
  IF (old_version IS NOT NULL AND NOT "learning_chapter_version_is_editable"(old_version))
    OR (new_version IS NOT NULL AND NOT "learning_chapter_version_is_editable"(new_version)) THEN
    RAISE EXCEPTION 'Content blocks for a published or retired course version are immutable';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER "LearningContentBlock_immutable_published"
BEFORE INSERT OR UPDATE OR DELETE ON "LearningContentBlock"
FOR EACH ROW EXECUTE FUNCTION "learning_protect_published_block"();

CREATE FUNCTION "learning_question_is_editable"(question_id UUID) RETURNS BOOLEAN AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM "LearningContentBlock" block
    JOIN "LearningChapter" chapter ON chapter."id" = block."chapterId"
    JOIN "LearningCourseVersion" version ON version."id" = chapter."courseVersionId"
    WHERE block."questionId" = question_id AND version."status" IN ('PUBLISHED', 'RETIRED')
  );
$$ LANGUAGE sql STABLE;
CREATE FUNCTION "learning_protect_published_question"() RETURNS trigger AS $$
DECLARE
  old_question UUID;
  new_question UUID;
BEGIN
  IF TG_OP <> 'INSERT' THEN old_question := OLD."id"; END IF;
  IF TG_OP <> 'DELETE' THEN new_question := NEW."id"; END IF;
  IF (old_question IS NOT NULL AND NOT "learning_question_is_editable"(old_question))
    OR (new_question IS NOT NULL AND NOT "learning_question_is_editable"(new_question)) THEN
    RAISE EXCEPTION 'Questions used in a published or retired course version are immutable';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER "LearningQuestion_immutable_published"
BEFORE UPDATE OR DELETE ON "LearningQuestion"
FOR EACH ROW EXECUTE FUNCTION "learning_protect_published_question"();
CREATE FUNCTION "learning_protect_published_question_option"() RETURNS trigger AS $$
DECLARE
  old_question UUID;
  new_question UUID;
BEGIN
  IF TG_OP <> 'INSERT' THEN old_question := OLD."questionId"; END IF;
  IF TG_OP <> 'DELETE' THEN new_question := NEW."questionId"; END IF;
  IF (old_question IS NOT NULL AND NOT "learning_question_is_editable"(old_question))
    OR (new_question IS NOT NULL AND NOT "learning_question_is_editable"(new_question)) THEN
    RAISE EXCEPTION 'Options for questions used in a published course version are immutable';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER "LearningQuestionOption_immutable_published"
BEFORE INSERT OR UPDATE OR DELETE ON "LearningQuestionOption"
FOR EACH ROW EXECUTE FUNCTION "learning_protect_published_question_option"();
