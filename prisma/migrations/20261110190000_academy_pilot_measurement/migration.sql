CREATE TABLE "LearningPilotAssignment" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" uuid NOT NULL REFERENCES "User"(id) ON DELETE RESTRICT,
  "courseVersionId" uuid NOT NULL REFERENCES "LearningCourseVersion"(id) ON DELETE RESTRICT,
  "discountCodeId" uuid NOT NULL REFERENCES "DiscountCode"(id) ON DELETE RESTRICT,
  "enrollmentId" uuid UNIQUE,
  "redeemedAt" timestamptz(3),
  "lastPulseAt" timestamptz(3),
  "lastContext" text,
  "clockId" uuid,
  pauses integer NOT NULL DEFAULT 0,
  gaps integer NOT NULL DEFAULT 0,
  UNIQUE ("userId","courseVersionId"),
  UNIQUE ("enrollmentId","courseVersionId","userId"),
  FOREIGN KEY ("enrollmentId","courseVersionId","userId") REFERENCES "LearningEnrollment"(id,"courseVersionId","userId") ON DELETE RESTRICT,
  CHECK (("enrollmentId" IS NULL) = ("redeemedAt" IS NULL)),
  CHECK (pauses >= 0 AND gaps >= 0)
);
CREATE INDEX "LearningPilotAssignment_discountCodeId_idx" ON "LearningPilotAssignment"("discountCodeId");
CREATE TABLE "LearningPilotDuration" (
  "assignmentId" uuid NOT NULL REFERENCES "LearningPilotAssignment"(id) ON DELETE CASCADE,
  context text NOT NULL,
  "activeMs" integer NOT NULL CHECK ("activeMs" >= 0),
  PRIMARY KEY ("assignmentId", context)
);
