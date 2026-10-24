-- CreateEnum
CREATE TYPE "LearningRetentionParticipationStatus" AS ENUM ('ACTIVE', 'STOPPED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "LearningRetentionProgramVersionStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'RETIRED');

-- CreateTable
CREATE TABLE "LearningRetentionProgram" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "courseId" UUID NOT NULL,
    "code" VARCHAR(80) NOT NULL,
    "title" VARCHAR(240) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LearningRetentionProgram_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LearningRetentionProgramVersion" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "programId" UUID NOT NULL,
    "courseId" UUID NOT NULL,
    "version" VARCHAR(40) NOT NULL,
    "status" "LearningRetentionProgramVersionStatus" NOT NULL DEFAULT 'DRAFT',
    "durationWeeks" INTEGER NOT NULL DEFAULT 12,
    "questionsPerWeek" INTEGER NOT NULL DEFAULT 5,
    "openAfterProgramDays" INTEGER NOT NULL DEFAULT 30,
    "selectionPolicyVersion" VARCHAR(60) NOT NULL,
    "consentVersion" VARCHAR(40) NOT NULL,
    "consentCopy" TEXT NOT NULL,
    "publishedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LearningRetentionProgramVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LearningRetentionQuestion" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "questionId" UUID NOT NULL,
    "bankVersion" VARCHAR(40) NOT NULL,
    "chapterNumber" INTEGER NOT NULL,
    "cognitiveLevel" VARCHAR(1) NOT NULL,
    "criticalConcept" BOOLEAN NOT NULL DEFAULT false,
    "legalReviewRequired" BOOLEAN NOT NULL DEFAULT false,
    "correctFeedback" TEXT NOT NULL,
    "incorrectFeedback" TEXT NOT NULL,
    "status" VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LearningRetentionQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LearningRetentionParticipation" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "learningEnrollmentId" UUID NOT NULL,
    "courseVersionId" UUID NOT NULL,
    "programVersionId" UUID NOT NULL,
    "courseId" UUID NOT NULL,
    "status" "LearningRetentionParticipationStatus" NOT NULL DEFAULT 'ACTIVE',
    "consentedAt" TIMESTAMPTZ(3) NOT NULL,
    "consentVersion" VARCHAR(40) NOT NULL,
    "startedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "stoppedAt" TIMESTAMPTZ(3),
    "completedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LearningRetentionParticipation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LearningRetentionWeeklyCheck" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "participationId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "weekNumber" INTEGER NOT NULL,
    "availableAt" TIMESTAMPTZ(3) NOT NULL,
    "closesAt" TIMESTAMPTZ(3) NOT NULL,
    "completedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LearningRetentionWeeklyCheck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LearningRetentionWeeklyQuestion" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "weeklyCheckId" UUID NOT NULL,
    "retentionQuestionId" UUID NOT NULL,
    "position" INTEGER NOT NULL,
    "selectionReason" VARCHAR(20) NOT NULL,

    CONSTRAINT "LearningRetentionWeeklyQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LearningRetentionWeeklyAnswer" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "weeklyCheckId" UUID NOT NULL,
    "weeklyQuestionId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "answer" JSONB NOT NULL,
    "correct" BOOLEAN NOT NULL,
    "answeredAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LearningRetentionWeeklyAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LearningAnnualReminder" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "enrollmentId" UUID NOT NULL,
    "qualifyingAttemptId" UUID NOT NULL,
    "consentedAt" TIMESTAMPTZ(3) NOT NULL,
    "consentVersion" VARCHAR(40) NOT NULL,
    "scheduledFor" TIMESTAMPTZ(3) NOT NULL,
    "revokedAt" TIMESTAMPTZ(3),
    "sentAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LearningAnnualReminder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LearningRetentionAnnualCheck" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "reminderId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "checkVersion" VARCHAR(40) NOT NULL DEFAULT 'WL-001-ANNUAL-CHECK-1.0',
    "availableAt" TIMESTAMPTZ(3) NOT NULL,
    "startedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMPTZ(3),
    "score" INTEGER,
    "maxScore" INTEGER NOT NULL DEFAULT 10,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LearningRetentionAnnualCheck_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "LearningRetentionAnnualCheck_score_check" CHECK ("score" IS NULL OR "score" BETWEEN 0 AND 10),
    CONSTRAINT "LearningRetentionAnnualCheck_maxScore_check" CHECK ("maxScore" = 10),
    CONSTRAINT "LearningRetentionAnnualCheck_completion_check" CHECK (("completedAt" IS NULL) = ("score" IS NULL))
);

-- CreateTable
CREATE TABLE "LearningRetentionAnnualQuestion" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "annualCheckId" UUID NOT NULL,
    "retentionQuestionId" UUID NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "LearningRetentionAnnualQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LearningRetentionAnnualAnswer" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "annualCheckId" UUID NOT NULL,
    "annualQuestionId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "answer" JSONB NOT NULL,
    "correct" BOOLEAN NOT NULL,
    "answeredAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LearningRetentionAnnualAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LearningRetentionProgram_code_key" ON "LearningRetentionProgram"("code");

-- CreateIndex
CREATE INDEX "LearningRetentionProgram_courseId_idx" ON "LearningRetentionProgram"("courseId");

-- CreateIndex
CREATE UNIQUE INDEX "LearningRetentionProgram_id_courseId_key" ON "LearningRetentionProgram"("id", "courseId");

-- CreateIndex
CREATE UNIQUE INDEX "LearningRetentionProgramVersion_version_key" ON "LearningRetentionProgramVersion"("version");

-- CreateIndex
CREATE INDEX "LearningRetentionProgramVersion_programId_status_publishedA_idx" ON "LearningRetentionProgramVersion"("programId", "status", "publishedAt");

-- CreateIndex
CREATE UNIQUE INDEX "LearningRetentionProgramVersion_id_courseId_key" ON "LearningRetentionProgramVersion"("id", "courseId");

-- CreateIndex
CREATE UNIQUE INDEX "LearningRetentionQuestion_questionId_key" ON "LearningRetentionQuestion"("questionId");

-- CreateIndex
CREATE INDEX "LearningRetentionQuestion_status_chapterNumber_cognitiveLev_idx" ON "LearningRetentionQuestion"("status", "chapterNumber", "cognitiveLevel");

-- CreateIndex
CREATE UNIQUE INDEX "LearningRetentionQuestion_id_bankVersion_key" ON "LearningRetentionQuestion"("id", "bankVersion");

-- CreateIndex
CREATE INDEX "LearningRetentionParticipation_userId_status_startedAt_idx" ON "LearningRetentionParticipation"("userId", "status", "startedAt");

-- CreateIndex
CREATE UNIQUE INDEX "LearningRetentionParticipation_learningEnrollmentId_program_key" ON "LearningRetentionParticipation"("learningEnrollmentId", "programVersionId");

-- CreateIndex
CREATE UNIQUE INDEX "LearningRetentionParticipation_id_userId_key" ON "LearningRetentionParticipation"("id", "userId");

-- CreateIndex
CREATE INDEX "LearningRetentionWeeklyCheck_userId_availableAt_closesAt_idx" ON "LearningRetentionWeeklyCheck"("userId", "availableAt", "closesAt");

-- CreateIndex
CREATE UNIQUE INDEX "LearningRetentionWeeklyCheck_participationId_weekNumber_key" ON "LearningRetentionWeeklyCheck"("participationId", "weekNumber");

-- CreateIndex
CREATE UNIQUE INDEX "LearningRetentionWeeklyCheck_id_userId_key" ON "LearningRetentionWeeklyCheck"("id", "userId");

-- CreateIndex
CREATE INDEX "LearningRetentionWeeklyQuestion_retentionQuestionId_idx" ON "LearningRetentionWeeklyQuestion"("retentionQuestionId");

-- CreateIndex
CREATE UNIQUE INDEX "LearningRetentionWeeklyQuestion_weeklyCheckId_position_key" ON "LearningRetentionWeeklyQuestion"("weeklyCheckId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "LearningRetentionWeeklyQuestion_weeklyCheckId_retentionQues_key" ON "LearningRetentionWeeklyQuestion"("weeklyCheckId", "retentionQuestionId");

-- CreateIndex
CREATE UNIQUE INDEX "LearningRetentionWeeklyQuestion_id_weeklyCheckId_key" ON "LearningRetentionWeeklyQuestion"("id", "weeklyCheckId");

-- CreateIndex
CREATE INDEX "LearningRetentionWeeklyAnswer_userId_answeredAt_idx" ON "LearningRetentionWeeklyAnswer"("userId", "answeredAt");

-- CreateIndex
CREATE UNIQUE INDEX "LearningRetentionWeeklyAnswer_weeklyQuestionId_key" ON "LearningRetentionWeeklyAnswer"("weeklyQuestionId");

-- CreateIndex
CREATE UNIQUE INDEX "LearningAnnualReminder_qualifyingAttemptId_key" ON "LearningAnnualReminder"("qualifyingAttemptId");

-- CreateIndex
CREATE INDEX "LearningAnnualReminder_revokedAt_scheduledFor_sentAt_idx" ON "LearningAnnualReminder"("revokedAt", "scheduledFor", "sentAt");

-- CreateIndex
CREATE UNIQUE INDEX "LearningAnnualReminder_enrollmentId_key" ON "LearningAnnualReminder"("enrollmentId");

-- CreateIndex
CREATE UNIQUE INDEX "LearningRetentionAnnualCheck_reminderId_key" ON "LearningRetentionAnnualCheck"("reminderId");

-- CreateIndex
CREATE INDEX "LearningRetentionAnnualCheck_userId_availableAt_idx" ON "LearningRetentionAnnualCheck"("userId", "availableAt");

-- CreateIndex
CREATE UNIQUE INDEX "LearningRetentionAnnualCheck_id_userId_key" ON "LearningRetentionAnnualCheck"("id", "userId");

-- CreateIndex
CREATE INDEX "LearningRetentionAnnualQuestion_retentionQuestionId_idx" ON "LearningRetentionAnnualQuestion"("retentionQuestionId");

-- CreateIndex
CREATE UNIQUE INDEX "LearningRetentionAnnualQuestion_annualCheckId_position_key" ON "LearningRetentionAnnualQuestion"("annualCheckId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "LearningRetentionAnnualQuestion_annualCheckId_retentionQues_key" ON "LearningRetentionAnnualQuestion"("annualCheckId", "retentionQuestionId");

-- CreateIndex
CREATE UNIQUE INDEX "LearningRetentionAnnualQuestion_id_annualCheckId_key" ON "LearningRetentionAnnualQuestion"("id", "annualCheckId");

-- CreateIndex
CREATE INDEX "LearningRetentionAnnualAnswer_userId_answeredAt_idx" ON "LearningRetentionAnnualAnswer"("userId", "answeredAt");

-- CreateIndex
CREATE UNIQUE INDEX "LearningRetentionAnnualAnswer_annualQuestionId_key" ON "LearningRetentionAnnualAnswer"("annualQuestionId");

CREATE UNIQUE INDEX "LearningExamAttempt_id_userId_enrollmentId_key"
  ON "LearningExamAttempt" ("id", "userId", "enrollmentId");
CREATE UNIQUE INDEX "LearningAnnualReminder_id_userId_key"
  ON "LearningAnnualReminder" ("id", "userId");
CREATE UNIQUE INDEX "LearningAnnualReminder_qualifyingAttemptId_userId_enrollmen_key"
  ON "LearningAnnualReminder" ("qualifyingAttemptId", "userId", "enrollmentId");
CREATE UNIQUE INDEX "LearningRetentionAnnualCheck_reminderId_userId_key"
  ON "LearningRetentionAnnualCheck" ("reminderId", "userId");

-- AddForeignKey
ALTER TABLE "LearningRetentionProgram" ADD CONSTRAINT "LearningRetentionProgram_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "LearningCourse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningRetentionProgramVersion" ADD CONSTRAINT "LearningRetentionProgramVersion_programId_courseId_fkey" FOREIGN KEY ("programId", "courseId") REFERENCES "LearningRetentionProgram"("id", "courseId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningRetentionQuestion" ADD CONSTRAINT "LearningRetentionQuestion_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "LearningQuestion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningRetentionParticipation" ADD CONSTRAINT "LearningRetentionParticipation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningRetentionParticipation" ADD CONSTRAINT "LearningRetentionParticipation_learningEnrollmentId_course_fkey" FOREIGN KEY ("learningEnrollmentId", "courseVersionId", "userId") REFERENCES "LearningEnrollment"("id", "courseVersionId", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningRetentionParticipation" ADD CONSTRAINT "LearningRetentionParticipation_programVersionId_courseId_fkey" FOREIGN KEY ("programVersionId", "courseId") REFERENCES "LearningRetentionProgramVersion"("id", "courseId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningRetentionWeeklyCheck" ADD CONSTRAINT "LearningRetentionWeeklyCheck_participationId_userId_fkey" FOREIGN KEY ("participationId", "userId") REFERENCES "LearningRetentionParticipation"("id", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningRetentionWeeklyQuestion" ADD CONSTRAINT "LearningRetentionWeeklyQuestion_weeklyCheckId_fkey" FOREIGN KEY ("weeklyCheckId") REFERENCES "LearningRetentionWeeklyCheck"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningRetentionWeeklyQuestion" ADD CONSTRAINT "LearningRetentionWeeklyQuestion_retentionQuestionId_fkey" FOREIGN KEY ("retentionQuestionId") REFERENCES "LearningRetentionQuestion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningRetentionWeeklyAnswer" ADD CONSTRAINT "LearningRetentionWeeklyAnswer_weeklyCheckId_userId_fkey" FOREIGN KEY ("weeklyCheckId", "userId") REFERENCES "LearningRetentionWeeklyCheck"("id", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningRetentionWeeklyAnswer" ADD CONSTRAINT "LearningRetentionWeeklyAnswer_weeklyQuestionId_weeklyCheck_fkey" FOREIGN KEY ("weeklyQuestionId", "weeklyCheckId") REFERENCES "LearningRetentionWeeklyQuestion"("id", "weeklyCheckId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningRetentionWeeklyAnswer" ADD CONSTRAINT "LearningRetentionWeeklyAnswer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningAnnualReminder" ADD CONSTRAINT "LearningAnnualReminder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningAnnualReminder" ADD CONSTRAINT "LearningAnnualReminder_enrollmentId_userId_fkey" FOREIGN KEY ("enrollmentId", "userId") REFERENCES "LearningEnrollment"("id", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningAnnualReminder" ADD CONSTRAINT "LearningAnnualReminder_qualifyingAttemptId_userId_enrollmentId_fkey" FOREIGN KEY ("qualifyingAttemptId", "userId", "enrollmentId") REFERENCES "LearningExamAttempt"("id", "userId", "enrollmentId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningRetentionAnnualCheck" ADD CONSTRAINT "LearningRetentionAnnualCheck_reminderId_userId_fkey" FOREIGN KEY ("reminderId", "userId") REFERENCES "LearningAnnualReminder"("id", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningRetentionAnnualCheck" ADD CONSTRAINT "LearningRetentionAnnualCheck_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningRetentionAnnualQuestion" ADD CONSTRAINT "LearningRetentionAnnualQuestion_annualCheckId_fkey" FOREIGN KEY ("annualCheckId") REFERENCES "LearningRetentionAnnualCheck"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningRetentionAnnualQuestion" ADD CONSTRAINT "LearningRetentionAnnualQuestion_retentionQuestionId_fkey" FOREIGN KEY ("retentionQuestionId") REFERENCES "LearningRetentionQuestion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningRetentionAnnualAnswer" ADD CONSTRAINT "LearningRetentionAnnualAnswer_annualCheckId_userId_fkey" FOREIGN KEY ("annualCheckId", "userId") REFERENCES "LearningRetentionAnnualCheck"("id", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningRetentionAnnualAnswer" ADD CONSTRAINT "LearningRetentionAnnualAnswer_annualQuestionId_annualCheck_fkey" FOREIGN KEY ("annualQuestionId", "annualCheckId") REFERENCES "LearningRetentionAnnualQuestion"("id", "annualCheckId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningRetentionAnnualAnswer" ADD CONSTRAINT "LearningRetentionAnnualAnswer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Retention domain bounds and one active cycle per learner/course/program version.
ALTER TABLE "LearningRetentionQuestion"
  ADD CONSTRAINT "LearningRetentionQuestion_chapter_check" CHECK ("chapterNumber" BETWEEN 1 AND 10),
  ADD CONSTRAINT "LearningRetentionQuestion_cognitive_level_check" CHECK ("cognitiveLevel" IN ('B', 'T', 'A')),
  ADD CONSTRAINT "LearningRetentionQuestion_status_check" CHECK ("status" IN ('DRAFT', 'PUBLISHED', 'RETIRED'));
ALTER TABLE "LearningRetentionParticipation"
  ADD CONSTRAINT "LearningRetentionParticipation_consent_version_check" CHECK (length(trim("consentVersion")) > 0),
  ADD CONSTRAINT "LearningRetentionParticipation_stop_state_check" CHECK (
    ("status" = 'ACTIVE' AND "stoppedAt" IS NULL AND "completedAt" IS NULL)
    OR ("status" = 'STOPPED' AND "stoppedAt" IS NOT NULL)
    OR ("status" = 'COMPLETED' AND "stoppedAt" IS NULL AND "completedAt" IS NOT NULL)
  );
ALTER TABLE "LearningRetentionWeeklyCheck"
  ADD CONSTRAINT "LearningRetentionWeeklyCheck_week_number_check" CHECK ("weekNumber" BETWEEN 1 AND 12),
  ADD CONSTRAINT "LearningRetentionWeeklyCheck_window_check" CHECK ("closesAt" > "availableAt");
ALTER TABLE "LearningRetentionWeeklyQuestion"
  ADD CONSTRAINT "LearningRetentionWeeklyQuestion_position_check" CHECK ("position" BETWEEN 1 AND 5),
  ADD CONSTRAINT "LearningRetentionWeeklyQuestion_reason_check" CHECK ("selectionReason" IN ('PERSONAL', 'CORE', 'SPREAD'));
ALTER TABLE "LearningRetentionAnnualQuestion"
  ADD CONSTRAINT "LearningRetentionAnnualQuestion_position_check" CHECK ("position" BETWEEN 1 AND 10);
ALTER TABLE "LearningAnnualReminder"
  ADD CONSTRAINT "LearningAnnualReminder_consent_version_check" CHECK (length(trim("consentVersion")) > 0);

CREATE UNIQUE INDEX "LearningRetentionParticipation_one_active_course_program_key"
  ON "LearningRetentionParticipation" ("userId", "courseId", "programVersionId")
  WHERE "status" = 'ACTIVE';
-- Used QuestionVersions are immutable even when not attached to a chapter block.
CREATE OR REPLACE FUNCTION "learning_question_is_editable"(question_id UUID) RETURNS BOOLEAN AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM "LearningContentBlock" block
    JOIN "LearningChapter" chapter ON chapter."id" = block."chapterId"
    JOIN "LearningCourseVersion" version ON version."id" = chapter."courseVersionId"
    WHERE block."questionId" = question_id AND version."status" IN ('PUBLISHED', 'RETIRED')
  ) AND NOT EXISTS (
    SELECT 1 FROM "LearningRetentionQuestion" retention_question
    WHERE retention_question."questionId" = question_id
      AND retention_question."status" IN ('PUBLISHED', 'RETIRED')
  ) AND NOT EXISTS (
    SELECT 1 FROM "LearningRetentionWeeklyQuestion" assignment
    JOIN "LearningRetentionQuestion" retention_question ON retention_question."id" = assignment."retentionQuestionId"
    WHERE retention_question."questionId" = question_id
  ) AND NOT EXISTS (
    SELECT 1 FROM "LearningRetentionAnnualQuestion" assignment
    JOIN "LearningRetentionQuestion" retention_question ON retention_question."id" = assignment."retentionQuestionId"
    WHERE retention_question."questionId" = question_id
  );
$$ LANGUAGE sql STABLE;

CREATE FUNCTION "learning_retention_version_immutable"() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD."status" <> 'DRAFT' THEN RAISE EXCEPTION 'Published or retired retention program versions are immutable'; END IF;
    RETURN OLD;
  END IF;
  IF OLD."status" IN ('PUBLISHED', 'RETIRED') THEN
    IF (to_jsonb(NEW) - 'status') IS DISTINCT FROM (to_jsonb(OLD) - 'status')
      OR OLD."status" <> 'PUBLISHED' OR NEW."status" <> 'RETIRED' THEN
      RAISE EXCEPTION 'Published or retired retention program versions are immutable';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER "LearningRetentionProgramVersion_immutable_published"
  BEFORE UPDATE OR DELETE ON "LearningRetentionProgramVersion"
  FOR EACH ROW EXECUTE FUNCTION "learning_retention_version_immutable"();

CREATE FUNCTION "learning_retention_question_immutable"() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD."status" <> 'DRAFT'
      OR EXISTS (SELECT 1 FROM "LearningRetentionWeeklyQuestion" WHERE "retentionQuestionId" = OLD."id")
      OR EXISTS (SELECT 1 FROM "LearningRetentionAnnualQuestion" WHERE "retentionQuestionId" = OLD."id") THEN
      RAISE EXCEPTION 'Published or used retention question versions are immutable';
    END IF;
    RETURN OLD;
  END IF;
  IF OLD."status" IN ('PUBLISHED', 'RETIRED') THEN
    IF (to_jsonb(NEW) - 'status') IS DISTINCT FROM (to_jsonb(OLD) - 'status')
      OR OLD."status" <> 'PUBLISHED' OR NEW."status" <> 'RETIRED' THEN
      RAISE EXCEPTION 'Published or retired retention question versions are immutable';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER "LearningRetentionQuestion_immutable_published"
  BEFORE UPDATE OR DELETE ON "LearningRetentionQuestion"
  FOR EACH ROW EXECUTE FUNCTION "learning_retention_question_immutable"();

CREATE FUNCTION "learning_retention_participation_guard"() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'Retention participation history cannot be deleted'; END IF;
  IF (to_jsonb(NEW) - ARRAY['status', 'stoppedAt', 'completedAt']::text[])
      IS DISTINCT FROM (to_jsonb(OLD) - ARRAY['status', 'stoppedAt', 'completedAt']::text[]) THEN
    RAISE EXCEPTION 'Retention consent and participation identity are immutable';
  END IF;
  IF OLD."status" = 'STOPPED' AND (NEW."status" <> 'STOPPED' OR NEW."stoppedAt" IS DISTINCT FROM OLD."stoppedAt") THEN
    RAISE EXCEPTION 'Stopped retention participation cannot be reactivated';
  END IF;
  IF OLD."status" = 'COMPLETED' AND NEW."status" <> 'COMPLETED' THEN
    RAISE EXCEPTION 'Completed retention participation cannot be reopened';
  END IF;
  IF OLD."status" = 'ACTIVE' AND NEW."status" = 'STOPPED' AND (NEW."stoppedAt" IS NULL OR NEW."completedAt" IS NOT NULL) THEN
    RAISE EXCEPTION 'Stopping retention participation requires stoppedAt only';
  END IF;
  IF OLD."status" = 'ACTIVE' AND NEW."status" = 'COMPLETED' AND (NEW."completedAt" IS NULL OR NEW."stoppedAt" IS NOT NULL) THEN
    RAISE EXCEPTION 'Completing retention participation requires completedAt only';
  END IF;
  IF OLD."status" = 'ACTIVE' AND NEW."status" = 'ACTIVE'
      AND (NEW."stoppedAt" IS NOT NULL OR NEW."completedAt" IS NOT NULL) THEN
    RAISE EXCEPTION 'Active retention participation cannot have a terminal timestamp';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER "LearningRetentionParticipation_guard"
  BEFORE UPDATE OR DELETE ON "LearningRetentionParticipation"
  FOR EACH ROW EXECUTE FUNCTION "learning_retention_participation_guard"();

CREATE FUNCTION "learning_annual_reminder_guard"() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'Annual reminder consent history cannot be deleted'; END IF;
  IF (to_jsonb(NEW) - ARRAY['revokedAt', 'sentAt']::text[])
      IS DISTINCT FROM (to_jsonb(OLD) - ARRAY['revokedAt', 'sentAt']::text[]) THEN
    RAISE EXCEPTION 'Annual reminder consent and schedule are immutable';
  END IF;
  IF OLD."revokedAt" IS NOT NULL AND NEW."revokedAt" IS DISTINCT FROM OLD."revokedAt" THEN
    RAISE EXCEPTION 'Annual reminder revocation is immutable';
  END IF;
  IF OLD."sentAt" IS NOT NULL AND NEW."sentAt" IS DISTINCT FROM OLD."sentAt" THEN
    RAISE EXCEPTION 'Annual reminder delivery history is immutable';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER "LearningAnnualReminder_guard"
  BEFORE UPDATE OR DELETE ON "LearningAnnualReminder"
  FOR EACH ROW EXECUTE FUNCTION "learning_annual_reminder_guard"();

CREATE FUNCTION "learning_retention_check_completion_guard"() RETURNS trigger AS $$
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
          AND metadata."status" = 'PUBLISHED' AND question."status" = 'PUBLISHED'
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
          AND metadata."status" = 'PUBLISHED' AND question."status" = 'PUBLISHED'
          AND metadata."chapterNumber" BETWEEN 1 AND 10) <> 10 THEN
      RAISE EXCEPTION 'An annual retention check must include one published question from each chapter H1-H10';
    END IF;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;
CREATE CONSTRAINT TRIGGER "LearningRetentionWeeklyCheck_exactly_five_questions"
  AFTER INSERT OR UPDATE ON "LearningRetentionWeeklyCheck"
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION "learning_retention_check_completion_guard"();
CREATE CONSTRAINT TRIGGER "LearningRetentionWeeklyQuestion_check_count"
  AFTER INSERT OR UPDATE OR DELETE ON "LearningRetentionWeeklyQuestion"
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION "learning_retention_check_completion_guard"();
CREATE CONSTRAINT TRIGGER "LearningRetentionAnnualCheck_exactly_ten_questions"
  AFTER INSERT OR UPDATE ON "LearningRetentionAnnualCheck"
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION "learning_retention_check_completion_guard"();
CREATE CONSTRAINT TRIGGER "LearningRetentionAnnualQuestion_check_count"
  AFTER INSERT OR UPDATE OR DELETE ON "LearningRetentionAnnualQuestion"
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION "learning_retention_check_completion_guard"();

CREATE FUNCTION "learning_retention_append_only"() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION '% is immutable history', TG_TABLE_NAME;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER "LearningRetentionWeeklyQuestion_append_only"
  BEFORE UPDATE OR DELETE ON "LearningRetentionWeeklyQuestion"
  FOR EACH ROW EXECUTE FUNCTION "learning_retention_append_only"();
CREATE TRIGGER "LearningRetentionWeeklyAnswer_append_only"
  BEFORE UPDATE OR DELETE ON "LearningRetentionWeeklyAnswer"
  FOR EACH ROW EXECUTE FUNCTION "learning_retention_append_only"();
CREATE TRIGGER "LearningRetentionAnnualQuestion_append_only"
  BEFORE UPDATE OR DELETE ON "LearningRetentionAnnualQuestion"
  FOR EACH ROW EXECUTE FUNCTION "learning_retention_append_only"();
CREATE TRIGGER "LearningRetentionAnnualAnswer_append_only"
  BEFORE UPDATE OR DELETE ON "LearningRetentionAnnualAnswer"
  FOR EACH ROW EXECUTE FUNCTION "learning_retention_append_only"();

CREATE FUNCTION "learning_annual_check_history_guard"() RETURNS trigger AS $$
DECLARE answer_count INTEGER; correct_count INTEGER;
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Annual retention check history cannot be deleted';
  END IF;
  IF OLD."completedAt" IS NOT NULL THEN
    RAISE EXCEPTION 'Completed annual retention check results are immutable';
  END IF;
  IF NEW."id" IS DISTINCT FROM OLD."id"
    OR NEW."reminderId" IS DISTINCT FROM OLD."reminderId"
    OR NEW."userId" IS DISTINCT FROM OLD."userId"
    OR NEW."checkVersion" IS DISTINCT FROM OLD."checkVersion"
    OR NEW."availableAt" IS DISTINCT FROM OLD."availableAt"
    OR NEW."startedAt" IS DISTINCT FROM OLD."startedAt"
    OR NEW."maxScore" IS DISTINCT FROM OLD."maxScore"
    OR NEW."createdAt" IS DISTINCT FROM OLD."createdAt" THEN
    RAISE EXCEPTION 'Annual retention check identity and question context are immutable';
  END IF;
  SELECT count(*), count(*) FILTER (WHERE "correct") INTO answer_count, correct_count
    FROM "LearningRetentionAnnualAnswer" WHERE "annualCheckId" = OLD."id" AND "userId" = OLD."userId";
  IF NEW."completedAt" IS NULL OR NEW."score" IS NULL OR answer_count <> 10 OR NEW."score" <> correct_count THEN
    RAISE EXCEPTION 'Annual retention check can complete only once all ten immutable answers are scored';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER "LearningRetentionAnnualCheck_history_guard"
  BEFORE UPDATE OR DELETE ON "LearningRetentionAnnualCheck"
  FOR EACH ROW EXECUTE FUNCTION "learning_annual_check_history_guard"();
