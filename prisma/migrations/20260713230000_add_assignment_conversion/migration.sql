-- Module 5B.2: transactionele opdrachtvorming en append-only opdrachthistorie.

-- AlterTable
ALTER TABLE "Intake"
ADD COLUMN "submittedByUserId" UUID,
ADD COLUMN "convertedAt" TIMESTAMPTZ(3);

-- AlterTable
ALTER TABLE "Assignment"
ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "AssignmentStatusHistory" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "assignmentId" UUID NOT NULL,
    "fromStatus" "AssignmentStatus",
    "toStatus" "AssignmentStatus" NOT NULL,
    "changedByUserId" UUID NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssignmentStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssignmentRevision" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "assignmentId" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "primarySpecialismId" UUID,
    "sectorId" UUID,
    "employeeCount" INTEGER,
    "desiredStartDate" DATE,
    "responseDeadline" TIMESTAMPTZ(3),
    "locationId" UUID,
    "allowsRemoteWork" BOOLEAN NOT NULL,
    "changedByUserId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssignmentRevision_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Intake_submittedByUserId_idx" ON "Intake"("submittedByUserId");

-- CreateIndex
CREATE INDEX "AssignmentStatusHistory_assignmentId_createdAt_idx" ON "AssignmentStatusHistory"("assignmentId", "createdAt");

-- CreateIndex
CREATE INDEX "AssignmentStatusHistory_changedByUserId_idx" ON "AssignmentStatusHistory"("changedByUserId");

-- CreateIndex
CREATE INDEX "AssignmentStatusHistory_toStatus_idx" ON "AssignmentStatusHistory"("toStatus");

-- CreateIndex
CREATE INDEX "AssignmentRevision_assignmentId_idx" ON "AssignmentRevision"("assignmentId");

-- CreateIndex
CREATE INDEX "AssignmentRevision_primarySpecialismId_idx" ON "AssignmentRevision"("primarySpecialismId");

-- CreateIndex
CREATE INDEX "AssignmentRevision_sectorId_idx" ON "AssignmentRevision"("sectorId");

-- CreateIndex
CREATE INDEX "AssignmentRevision_locationId_idx" ON "AssignmentRevision"("locationId");

-- CreateIndex
CREATE INDEX "AssignmentRevision_changedByUserId_idx" ON "AssignmentRevision"("changedByUserId");

-- CreateIndex
CREATE INDEX "AssignmentRevision_createdAt_idx" ON "AssignmentRevision"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AssignmentRevision_assignmentId_version_key" ON "AssignmentRevision"("assignmentId", "version");

-- AddForeignKey
ALTER TABLE "Intake" ADD CONSTRAINT "Intake_submittedByUserId_fkey" FOREIGN KEY ("submittedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignmentStatusHistory" ADD CONSTRAINT "AssignmentStatusHistory_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "Assignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignmentStatusHistory" ADD CONSTRAINT "AssignmentStatusHistory_changedByUserId_fkey" FOREIGN KEY ("changedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignmentRevision" ADD CONSTRAINT "AssignmentRevision_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "Assignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignmentRevision" ADD CONSTRAINT "AssignmentRevision_primarySpecialismId_fkey" FOREIGN KEY ("primarySpecialismId") REFERENCES "Specialism"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignmentRevision" ADD CONSTRAINT "AssignmentRevision_sectorId_fkey" FOREIGN KEY ("sectorId") REFERENCES "Sector"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignmentRevision" ADD CONSTRAINT "AssignmentRevision_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "OrganizationLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignmentRevision" ADD CONSTRAINT "AssignmentRevision_changedByUserId_fkey" FOREIGN KEY ("changedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Bestaande opdrachten krijgen een herleidbare beginstatus en inhoudssnapshot.
INSERT INTO "AssignmentStatusHistory" (
  "assignmentId", "fromStatus", "toStatus", "changedByUserId", "reason", "createdAt"
)
SELECT
  "id", NULL, "status", "createdByUserId", 'Bestaande opdracht opgenomen bij migratie.', "createdAt"
FROM "Assignment";

INSERT INTO "AssignmentRevision" (
  "assignmentId", "version", "title", "description", "primarySpecialismId", "sectorId",
  "employeeCount", "desiredStartDate", "responseDeadline", "locationId", "allowsRemoteWork",
  "changedByUserId", "createdAt"
)
SELECT
  "id", 1, "title", "description", "primarySpecialismId", "sectorId",
  "employeeCount", "desiredStartDate", "responseDeadline", "locationId", "allowsRemoteWork",
  "createdByUserId", "createdAt"
FROM "Assignment";

-- CheckConstraints
ALTER TABLE "Assignment"
  ADD CONSTRAINT "Assignment_version_positive_check" CHECK ("version" > 0);

ALTER TABLE "AssignmentStatusHistory"
  ADD CONSTRAINT "AssignmentStatusHistory_transition_check" CHECK (
    "fromStatus" IS NULL OR "fromStatus" <> "toStatus"
  ),
  ADD CONSTRAINT "AssignmentStatusHistory_reason_check" CHECK (
    "reason" IS NULL OR NULLIF(BTRIM("reason"), '') IS NOT NULL
  );

ALTER TABLE "AssignmentRevision"
  ADD CONSTRAINT "AssignmentRevision_version_positive_check" CHECK ("version" > 0),
  ADD CONSTRAINT "AssignmentRevision_title_check" CHECK (
    NULLIF(BTRIM("title"), '') IS NOT NULL
  ),
  ADD CONSTRAINT "AssignmentRevision_description_check" CHECK (
    NULLIF(BTRIM("description"), '') IS NOT NULL
  ),
  ADD CONSTRAINT "AssignmentRevision_employee_count_check" CHECK (
    "employeeCount" IS NULL OR "employeeCount" >= 0
  );

-- Stop bij legacy indieningsmetadata die niet veilig aan een actor en conversie is te koppelen.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "Intake"
    WHERE "submittedAt" IS NOT NULL OR "status" IN ('SUBMITTED', 'CONVERTED')
  ) THEN
    RAISE EXCEPTION 'Module 5B.2-migratie gestopt: bestaande ingediende of geconverteerde intake vereist handmatige beoordeling.';
  END IF;
END $$;

ALTER TABLE "Intake"
  ADD CONSTRAINT "Intake_submission_metadata_check" CHECK (
    (
      "status" = 'SUBMITTED'
      AND "submittedAt" IS NOT NULL
      AND "submittedByUserId" IS NOT NULL
      AND "convertedAt" IS NULL
    )
    OR (
      "status" = 'CONVERTED'
      AND "submittedAt" IS NOT NULL
      AND "submittedByUserId" IS NOT NULL
      AND "convertedAt" IS NOT NULL
      AND "convertedAt" >= "submittedAt"
    )
    OR (
      "status" NOT IN ('SUBMITTED', 'CONVERTED')
      AND "submittedAt" IS NULL
      AND "submittedByUserId" IS NULL
      AND "convertedAt" IS NULL
    )
  );

-- Status- en inhoudshistorie zijn append-only.
CREATE TRIGGER "AssignmentStatusHistory_append_only_trigger"
BEFORE UPDATE OR DELETE ON "AssignmentStatusHistory"
FOR EACH ROW EXECUTE FUNCTION "prevent_append_only_change"();

CREATE TRIGGER "AssignmentRevision_append_only_trigger"
BEFORE UPDATE OR DELETE ON "AssignmentRevision"
FOR EACH ROW EXECUTE FUNCTION "prevent_append_only_change"();

-- Iedere revisie moet exact aansluiten op de actuele Assignment-versie.
CREATE FUNCTION "validate_assignment_revision_sequence"() RETURNS trigger AS $$
DECLARE
  current_assignment_version INTEGER;
  expected_revision_version INTEGER;
BEGIN
  SELECT "version" INTO current_assignment_version
  FROM "Assignment"
  WHERE "id" = NEW."assignmentId";

  SELECT COALESCE(MAX("version"), 0) + 1 INTO expected_revision_version
  FROM "AssignmentRevision"
  WHERE "assignmentId" = NEW."assignmentId";

  IF NEW."version" <> current_assignment_version OR NEW."version" <> expected_revision_version THEN
    RAISE EXCEPTION 'Opdrachtrevisie sluit niet aan op de actuele opdrachtversie.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "AssignmentRevision_sequence_trigger"
BEFORE INSERT ON "AssignmentRevision"
FOR EACH ROW EXECUTE FUNCTION "validate_assignment_revision_sequence"();

-- Een gevormde intake kan niet worden teruggezet naar een bewerkbare status.
CREATE FUNCTION "protect_converted_intake_status"() RETURNS trigger AS $$
BEGIN
  IF OLD."status" = 'CONVERTED' AND NEW."status" <> 'CONVERTED' THEN
    RAISE EXCEPTION 'Een geconverteerde intake kan niet worden teruggedraaid.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "Intake_converted_status_immutable_trigger"
BEFORE UPDATE OF "status" ON "Intake"
FOR EACH ROW EXECUTE FUNCTION "protect_converted_intake_status"();

-- De herkomst van een opdracht wordt na koppeling niet gewijzigd of verwijderd.
CREATE FUNCTION "protect_assignment_intake_link"() RETURNS trigger AS $$
BEGIN
  IF OLD."intakeId" IS NOT NULL AND NEW."intakeId" IS DISTINCT FROM OLD."intakeId" THEN
    RAISE EXCEPTION 'De intakekoppeling van een opdracht is immutable.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "Assignment_intake_link_immutable_trigger"
BEFORE UPDATE OF "intakeId" ON "Assignment"
FOR EACH ROW EXECUTE FUNCTION "protect_assignment_intake_link"();

-- Actuele antwoorden en optiekeuzes zijn na indiening niet meer wijzigbaar.
CREATE FUNCTION "protect_submitted_intake_answer"() RETURNS trigger AS $$
DECLARE
  target_intake_id UUID;
  target_status "IntakeStatus";
BEGIN
  target_intake_id := CASE WHEN TG_OP = 'DELETE' THEN OLD."intakeId" ELSE NEW."intakeId" END;
  SELECT "status" INTO target_status FROM "Intake" WHERE "id" = target_intake_id;

  IF target_status IN ('SUBMITTED', 'CONVERTED') THEN
    RAISE EXCEPTION 'Antwoorden van een ingediende intake zijn immutable.';
  END IF;

  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "IntakeAnswer_submitted_immutable_trigger"
BEFORE INSERT OR UPDATE OR DELETE ON "IntakeAnswer"
FOR EACH ROW EXECUTE FUNCTION "protect_submitted_intake_answer"();

CREATE FUNCTION "protect_submitted_intake_answer_option"() RETURNS trigger AS $$
DECLARE
  target_answer_id UUID;
  target_status "IntakeStatus";
BEGIN
  target_answer_id := CASE WHEN TG_OP = 'DELETE' THEN OLD."intakeAnswerId" ELSE NEW."intakeAnswerId" END;
  SELECT i."status" INTO target_status
  FROM "IntakeAnswer" a
  JOIN "Intake" i ON i."id" = a."intakeId"
  WHERE a."id" = target_answer_id;

  IF target_status IN ('SUBMITTED', 'CONVERTED') THEN
    RAISE EXCEPTION 'Antwoordopties van een ingediende intake zijn immutable.';
  END IF;

  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "IntakeAnswerOption_submitted_immutable_trigger"
BEFORE INSERT OR UPDATE OR DELETE ON "IntakeAnswerOption"
FOR EACH ROW EXECUTE FUNCTION "protect_submitted_intake_answer_option"();
