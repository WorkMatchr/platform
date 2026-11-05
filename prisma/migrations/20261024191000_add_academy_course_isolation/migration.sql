-- Additive Academy bindings. Existing immutable WL-001 rows stay unchanged;
-- legacy NULL bank/program bindings resolve only to the original WL-001 bank.
ALTER TABLE "LearningRetentionProgramVersion" ADD COLUMN "bankVersion" VARCHAR(40);
ALTER TABLE "LearningRetentionAnnualCheck" ADD COLUMN "programVersionId" UUID;
ALTER TABLE "LearningRetentionParticipation" ADD CONSTRAINT "LearningRetentionParticipation_course_version_course_fkey"
  FOREIGN KEY ("courseVersionId", "courseId") REFERENCES "LearningCourseVersion"("id", "courseId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LearningRetentionAnnualCheck" ADD CONSTRAINT "LearningRetentionAnnualCheck_programVersionId_fkey"
  FOREIGN KEY ("programVersionId") REFERENCES "LearningRetentionProgramVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "LearningRetentionAnnualCheck_programVersionId_idx" ON "LearningRetentionAnnualCheck"("programVersionId");

CREATE TABLE "LearningAcademyImport" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "courseVersionId" UUID NOT NULL,
  "bundleHash" VARCHAR(64) NOT NULL,
  "operatorReference" VARCHAR(120) NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LearningAcademyImport_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "LearningAcademyImport_courseVersionId_fkey" FOREIGN KEY ("courseVersionId") REFERENCES "LearningCourseVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "LearningAcademyImport_hash_check" CHECK ("bundleHash" ~ '^[a-f0-9]{64}$'),
  CONSTRAINT "LearningAcademyImport_operator_check" CHECK (length(trim("operatorReference")) > 0)
);
CREATE UNIQUE INDEX "LearningAcademyImport_courseVersionId_bundleHash_key" ON "LearningAcademyImport"("courseVersionId", "bundleHash");
CREATE FUNCTION "academy_import_append_only"() RETURNS TRIGGER AS $$
BEGIN RAISE EXCEPTION 'Academy import receipts are append-only audit history'; END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER "LearningAcademyImport_append_only" BEFORE UPDATE OR DELETE ON "LearningAcademyImport"
  FOR EACH ROW EXECUTE FUNCTION "academy_import_append_only"();

CREATE OR REPLACE FUNCTION "validate_learning_certificate"() RETURNS TRIGGER AS $$
DECLARE attempt_row "LearningExamAttempt"%ROWTYPE; exam_code TEXT; course_code TEXT;
  actual_course UUID; expected_chapters INTEGER; completed_chapters INTEGER;
BEGIN
  SELECT * INTO attempt_row FROM "LearningExamAttempt" WHERE "id" = NEW."examAttemptId";
  IF NOT FOUND THEN RAISE EXCEPTION 'Certificate requires an existing passed exam attempt'; END IF;
  SELECT e."code", c."code", c."id" INTO exam_code, course_code, actual_course
    FROM "LearningExam" e JOIN "LearningCourse" c ON c."id" = e."courseId" WHERE e."id" = attempt_row."examId";
  IF NOT FOUND OR actual_course <> NEW."courseId" OR exam_code <> course_code || '-FINAL'
    OR attempt_row."status" <> 'SUBMITTED' OR attempt_row."passed" IS DISTINCT FROM TRUE
    OR attempt_row."submittedAt" IS NULL OR attempt_row."userId" <> NEW."userId"
    OR attempt_row."enrollmentId" <> NEW."enrollmentId"
    OR NEW."issuedAt" IS DISTINCT FROM attempt_row."submittedAt"
    OR NEW."courseVersion" IS DISTINCT FROM (SELECT "version" FROM "LearningCourseVersion" WHERE "id" = attempt_row."courseVersionId")
    OR NEW."examVersion" IS DISTINCT FROM (SELECT "version" FROM "LearningExamVersion" WHERE "id" = attempt_row."examVersionId") THEN
    RAISE EXCEPTION 'Certificate must match its owner, course, qualifying final attempt and immutable version snapshots';
  END IF;
  IF EXISTS (
    SELECT 1 FROM "LearningExamAttempt" earlier JOIN "LearningExam" e ON e."id" = earlier."examId"
    WHERE earlier."userId" = NEW."userId" AND e."courseId" = NEW."courseId"
      AND e."code" = course_code || '-FINAL' AND earlier."status" = 'SUBMITTED'
      AND earlier."passed" IS TRUE AND earlier."submittedAt" IS NOT NULL
      AND (earlier."submittedAt", earlier."attemptNumber", earlier."id")
        < (attempt_row."submittedAt", attempt_row."attemptNumber", attempt_row."id")
  ) THEN RAISE EXCEPTION 'Certificate must reference the first passed final attempt for this course'; END IF;
  SELECT count(*) INTO expected_chapters FROM "LearningChapter" WHERE "courseVersionId" = attempt_row."courseVersionId";
  SELECT count(*) INTO completed_chapters FROM "LearningChapterProgress"
    WHERE "enrollmentId" = NEW."enrollmentId" AND "courseVersionId" = attempt_row."courseVersionId" AND "status" = 'COMPLETED';
  IF expected_chapters = 0 OR expected_chapters <> completed_chapters OR length(trim(NEW."firstName")) = 0 OR length(trim(NEW."lastName")) = 0 THEN
    RAISE EXCEPTION 'Certificate requires the complete qualifying course and a non-empty name snapshot';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "academy_retention_bank_guard"() RETURNS TRIGGER AS $$
DECLARE course_code TEXT;
BEGIN
  SELECT "code" INTO course_code FROM "LearningCourse" WHERE "id" = NEW."courseId";
  IF NEW."bankVersion" IS NULL THEN
    IF course_code <> 'WL-001' OR NEW."version" <> 'WL-001-RETENTION-1.0' THEN
      RAISE EXCEPTION 'An Academy program version requires its explicit course-scoped bank';
    END IF;
  ELSIF NEW."bankVersion" NOT LIKE course_code || '-RETENTION-%' THEN
    RAISE EXCEPTION 'Retention bank namespace must match the program course';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER "LearningRetentionProgramVersion_bank_guard" BEFORE INSERT OR UPDATE ON "LearningRetentionProgramVersion"
  FOR EACH ROW EXECUTE FUNCTION "academy_retention_bank_guard"();

CREATE FUNCTION "academy_retention_assignment_guard"() RETURNS TRIGGER AS $$
DECLARE expected_bank TEXT; actual_bank TEXT; actual_status TEXT; question_status TEXT;
  program_course UUID; enrollment_course UUID; program_status TEXT;
BEGIN
  IF TG_TABLE_NAME = 'LearningRetentionWeeklyQuestion' THEN
    SELECT COALESCE(v."bankVersion", CASE WHEN c."code" = 'WL-001' AND v."version" = 'WL-001-RETENTION-1.0' THEN 'WL-001-RETENTION-1.0' END),
      v."courseId", v."status"::TEXT, cv."courseId"
      INTO expected_bank, program_course, program_status, enrollment_course
      FROM "LearningRetentionWeeklyCheck" w JOIN "LearningRetentionParticipation" p ON p."id" = w."participationId"
      JOIN "LearningRetentionProgramVersion" v ON v."id" = p."programVersionId"
      JOIN "LearningCourseVersion" cv ON cv."id" = p."courseVersionId"
      JOIN "LearningCourse" c ON c."id" = v."courseId" WHERE w."id" = NEW."weeklyCheckId";
  ELSE
    SELECT COALESCE(v."bankVersion", CASE WHEN c."code" = 'WL-001' AND (v."id" IS NULL OR v."version" = 'WL-001-RETENTION-1.0') THEN 'WL-001-RETENTION-1.0' END),
      COALESCE(v."courseId", cv."courseId"), COALESCE(v."status"::TEXT, CASE WHEN c."code" = 'WL-001' THEN 'PUBLISHED' END), cv."courseId"
      INTO expected_bank, program_course, program_status, enrollment_course
      FROM "LearningRetentionAnnualCheck" a JOIN "LearningAnnualReminder" r ON r."id" = a."reminderId"
      JOIN "LearningEnrollment" e ON e."id" = r."enrollmentId" JOIN "LearningCourseVersion" cv ON cv."id" = e."courseVersionId"
      JOIN "LearningCourse" c ON c."id" = cv."courseId"
      LEFT JOIN "LearningRetentionProgramVersion" v ON v."id" = a."programVersionId" WHERE a."id" = NEW."annualCheckId";
  END IF;
  SELECT m."bankVersion", m."status", q."status" INTO actual_bank, actual_status, question_status
    FROM "LearningRetentionQuestion" m JOIN "LearningQuestion" q ON q."id" = m."questionId" WHERE m."id" = NEW."retentionQuestionId";
  IF expected_bank IS NULL OR program_course IS DISTINCT FROM enrollment_course OR program_status <> 'PUBLISHED'
    OR actual_bank IS DISTINCT FROM expected_bank OR actual_status IS DISTINCT FROM 'PUBLISHED'
    OR question_status IS DISTINCT FROM 'PUBLISHED_PROTOTYPE' THEN
    RAISE EXCEPTION 'Retention assignment requires the published bank of its own course and program version';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER "LearningRetentionWeeklyQuestion_bank_guard" BEFORE INSERT ON "LearningRetentionWeeklyQuestion"
  FOR EACH ROW EXECUTE FUNCTION "academy_retention_assignment_guard"();
CREATE TRIGGER "LearningRetentionAnnualQuestion_bank_guard" BEFORE INSERT ON "LearningRetentionAnnualQuestion"
  FOR EACH ROW EXECUTE FUNCTION "academy_retention_assignment_guard"();
