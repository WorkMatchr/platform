ALTER TABLE "LearningProfile"
  ADD COLUMN "firstName" VARCHAR(100),
  ADD COLUMN "lastName" VARCHAR(100);

CREATE TYPE "LearningCertificateStatus" AS ENUM ('ACTIVE', 'REVOKED');

CREATE TABLE "LearningCertificate" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL,
  "courseId" UUID NOT NULL,
  "enrollmentId" UUID NOT NULL,
  "examAttemptId" UUID NOT NULL,
  "certificateNumber" VARCHAR(48) NOT NULL,
  "firstName" VARCHAR(100) NOT NULL,
  "lastName" VARCHAR(100) NOT NULL,
  "courseTitle" VARCHAR(240) NOT NULL,
  "courseVersion" VARCHAR(40) NOT NULL,
  "examVersion" VARCHAR(40) NOT NULL,
  "templateVersion" VARCHAR(40) NOT NULL,
  "issuedAt" TIMESTAMPTZ(3) NOT NULL,
  "status" "LearningCertificateStatus" NOT NULL DEFAULT 'ACTIVE',
  "revokedAt" TIMESTAMPTZ(3),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LearningCertificate_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "LearningCertificate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "LearningCertificate_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "LearningCourse"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "LearningCertificate_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "LearningEnrollment"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "LearningCertificate_examAttemptId_fkey" FOREIGN KEY ("examAttemptId") REFERENCES "LearningExamAttempt"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "LearningCertificate_revocation_check" CHECK (("status" = 'ACTIVE' AND "revokedAt" IS NULL) OR ("status" = 'REVOKED' AND "revokedAt" IS NOT NULL)),
  CONSTRAINT "LearningCertificate_number_format_check" CHECK ("certificateNumber" ~ '^WM-RIE-[0-9]{4}-[A-F0-9]{24}$')
);
CREATE UNIQUE INDEX "LearningCertificate_examAttemptId_key" ON "LearningCertificate"("examAttemptId");
CREATE UNIQUE INDEX "LearningCertificate_certificateNumber_key" ON "LearningCertificate"("certificateNumber");
CREATE UNIQUE INDEX "LearningCertificate_courseId_userId_key" ON "LearningCertificate"("courseId", "userId");
CREATE INDEX "LearningCertificate_userId_createdAt_idx" ON "LearningCertificate"("userId", "createdAt");
CREATE INDEX "LearningCertificate_status_issuedAt_idx" ON "LearningCertificate"("status", "issuedAt");

CREATE FUNCTION "validate_learning_certificate"() RETURNS TRIGGER AS $$
DECLARE
  attempt_row "LearningExamAttempt"%ROWTYPE;
  exam_code TEXT;
  course_code TEXT;
BEGIN
  SELECT a.* INTO attempt_row
  FROM "LearningExamAttempt" a
  WHERE a."id" = NEW."examAttemptId";
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Certificate requires an existing passed exam attempt';
  END IF;
  SELECT e."code", c."code" INTO exam_code, course_code
  FROM "LearningExam" e
  JOIN "LearningCourse" c ON c."id" = e."courseId"
  WHERE e."id" = attempt_row."examId";
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Certificate attempt must belong to a course and exam';
  END IF;
  IF attempt_row."status" <> 'SUBMITTED' OR attempt_row."passed" IS DISTINCT FROM TRUE OR attempt_row."submittedAt" IS NULL
    OR attempt_row."userId" <> NEW."userId" OR attempt_row."enrollmentId" <> NEW."enrollmentId"
    OR attempt_row."examId" IS NULL OR exam_code <> 'WL-001-FINAL' OR course_code <> 'WL-001' OR NEW."courseId" <> (SELECT e."courseId" FROM "LearningExam" e WHERE e."id" = attempt_row."examId")
    OR NEW."courseVersion" IS DISTINCT FROM (SELECT cv."version" FROM "LearningCourseVersion" cv WHERE cv."id" = attempt_row."courseVersionId")
    OR NEW."examVersion" IS DISTINCT FROM (SELECT ev."version" FROM "LearningExamVersion" ev WHERE ev."id" = attempt_row."examVersionId")
    OR NEW."issuedAt" IS DISTINCT FROM attempt_row."submittedAt" THEN
    RAISE EXCEPTION 'Certificate requires the first submitted, passed WL-001 final exam attempt';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM "LearningExamAttempt" earlier
    JOIN "LearningExam" earlier_exam ON earlier_exam."id" = earlier."examId"
    JOIN "LearningCourse" earlier_course ON earlier_course."id" = earlier_exam."courseId"
    WHERE earlier."userId" = NEW."userId"
      AND earlier."status" = 'SUBMITTED'
      AND earlier."passed" IS TRUE
      AND earlier."submittedAt" IS NOT NULL
      AND earlier_exam."code" = 'WL-001-FINAL'
      AND earlier_course."code" = 'WL-001'
      AND (earlier."submittedAt", earlier."attemptNumber") < (attempt_row."submittedAt", attempt_row."attemptNumber")
  ) THEN
    RAISE EXCEPTION 'Certificate must reference the first passed WL-001 final exam attempt';
  END IF;
  IF length(trim(NEW."firstName")) = 0 OR length(trim(NEW."lastName")) = 0
    OR (SELECT count(*) FROM "LearningChapter" ch WHERE ch."courseVersionId" = attempt_row."courseVersionId") <> 10
    OR (SELECT count(*) FROM "LearningChapterProgress" p WHERE p."enrollmentId" = NEW."enrollmentId" AND p."courseVersionId" = attempt_row."courseVersionId" AND p."status" = 'COMPLETED') <> 10 THEN
    RAISE EXCEPTION 'Certificate requires a complete WL-001 course and a non-empty name snapshot';
  END IF;
  IF EXISTS (SELECT 1 FROM "LearningCertificate" c WHERE c."userId" = NEW."userId" AND c."courseId" = NEW."courseId" AND c."id" <> NEW."id") THEN
    RAISE EXCEPTION 'Certificate already exists for this student and course';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER "LearningCertificate_validate_insert" BEFORE INSERT ON "LearningCertificate"
  FOR EACH ROW EXECUTE FUNCTION "validate_learning_certificate"();

CREATE FUNCTION "protect_learning_certificate"() RETURNS TRIGGER AS $$
BEGIN
  IF OLD."id" <> NEW."id" OR OLD."userId" <> NEW."userId" OR OLD."courseId" <> NEW."courseId"
    OR OLD."enrollmentId" <> NEW."enrollmentId" OR OLD."examAttemptId" <> NEW."examAttemptId"
    OR OLD."certificateNumber" <> NEW."certificateNumber" OR OLD."firstName" <> NEW."firstName"
    OR OLD."lastName" <> NEW."lastName" OR OLD."courseTitle" <> NEW."courseTitle"
    OR OLD."courseVersion" <> NEW."courseVersion" OR OLD."examVersion" <> NEW."examVersion"
    OR OLD."templateVersion" <> NEW."templateVersion" OR OLD."issuedAt" <> NEW."issuedAt"
    OR OLD."createdAt" <> NEW."createdAt" THEN
    RAISE EXCEPTION 'Issued certificate content is immutable';
  END IF;
  IF OLD."status" = 'REVOKED' OR (OLD."status" = 'ACTIVE' AND NEW."status" NOT IN ('ACTIVE', 'REVOKED')) THEN
    RAISE EXCEPTION 'Invalid certificate status transition';
  END IF;
  IF OLD."status" = 'ACTIVE' AND NEW."status" = 'REVOKED' AND NEW."revokedAt" IS NULL THEN
    RAISE EXCEPTION 'Revocation timestamp is required';
  END IF;
  IF OLD."status" = NEW."status" AND OLD."revokedAt" IS DISTINCT FROM NEW."revokedAt" THEN
    RAISE EXCEPTION 'Revocation timestamp is immutable';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER "LearningCertificate_immutable_update" BEFORE UPDATE ON "LearningCertificate"
  FOR EACH ROW EXECUTE FUNCTION "protect_learning_certificate"();
CREATE FUNCTION "prevent_learning_certificate_delete"() RETURNS TRIGGER AS $$
BEGIN RAISE EXCEPTION 'Issued certificates cannot be deleted'; END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER "LearningCertificate_no_delete" BEFORE DELETE ON "LearningCertificate"
  FOR EACH ROW EXECUTE FUNCTION "prevent_learning_certificate_delete"();
