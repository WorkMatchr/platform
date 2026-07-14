-- Module 5C.2: gecontroleerde opdrachtpublicatie met immutable publicatiesnapshot.

-- De eerdere modules maakten deze statussen nog niet bereikbaar. Stop veilig wanneer
-- bestaande marktstatussen niet herleidbaar zouden kunnen worden gemigreerd.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "Assignment"
    WHERE "status" IN (
      'OPEN', 'MATCHING', 'AWAITING_RESPONSES', 'IN_SELECTION', 'AWARDED', 'CLOSED'
    )
  ) THEN
    RAISE EXCEPTION 'Module 5C.2-migratie gestopt: bestaande marktstatus vereist handmatige beoordeling.';
  END IF;
END $$;

ALTER TABLE "Assignment"
  ADD COLUMN "publishedByUserId" UUID,
  ADD COLUMN "publishedVersion" INTEGER;

CREATE INDEX "Assignment_publishedByUserId_idx" ON "Assignment"("publishedByUserId");
CREATE INDEX "Assignment_publishedAt_idx" ON "Assignment"("publishedAt");
CREATE UNIQUE INDEX "Assignment_id_publishedVersion_key" ON "Assignment"("id", "publishedVersion");

ALTER TABLE "Assignment"
  ADD CONSTRAINT "Assignment_publishedByUserId_fkey"
    FOREIGN KEY ("publishedByUserId") REFERENCES "User"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "Assignment_published_revision_fkey"
    FOREIGN KEY ("id", "publishedVersion")
    REFERENCES "AssignmentRevision"("assignmentId", "version")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Assignment"
  ADD CONSTRAINT "Assignment_publication_metadata_check" CHECK (
    (
      "status" IN ('DRAFT', 'READY_FOR_REVIEW')
      AND "publishedAt" IS NULL
      AND "publishedByUserId" IS NULL
      AND "publishedVersion" IS NULL
    )
    OR (
      "status" IN ('OPEN', 'MATCHING', 'AWAITING_RESPONSES', 'IN_SELECTION', 'AWARDED', 'CLOSED')
      AND "publishedAt" IS NOT NULL
      AND "publishedByUserId" IS NOT NULL
      AND "publishedVersion" IS NOT NULL
    )
    OR (
      "status" IN ('CANCELLED', 'ARCHIVED')
      AND (
        (
          "publishedAt" IS NULL
          AND "publishedByUserId" IS NULL
          AND "publishedVersion" IS NULL
        )
        OR (
          "publishedAt" IS NOT NULL
          AND "publishedByUserId" IS NOT NULL
          AND "publishedVersion" IS NOT NULL
        )
      )
    )
  ),
  ADD CONSTRAINT "Assignment_published_version_check" CHECK (
    "publishedVersion" IS NULL
    OR ("publishedVersion" > 0 AND "publishedVersion" <= "version")
  );

-- Versie 1 kent maximaal één publicatie en één intrekking na publicatie.
CREATE UNIQUE INDEX "AssignmentStatusHistory_one_publication_key"
  ON "AssignmentStatusHistory"("assignmentId")
  WHERE "fromStatus" = 'READY_FOR_REVIEW' AND "toStatus" = 'OPEN';

CREATE UNIQUE INDEX "AssignmentStatusHistory_one_withdrawal_key"
  ON "AssignmentStatusHistory"("assignmentId")
  WHERE "fromStatus" = 'OPEN' AND "toStatus" = 'CANCELLED';

ALTER TABLE "AssignmentStatusHistory"
  ADD CONSTRAINT "AssignmentStatusHistory_withdrawal_reason_check" CHECK (
    NOT ("fromStatus" = 'OPEN' AND "toStatus" = 'CANCELLED')
    OR CHAR_LENGTH(BTRIM("reason")) BETWEEN 10 AND 500
  );

-- Assignment.version stijgt ook bij statusovergangen. Een inhoudsrevisie moet
-- daarom de actuele opdrachtversie gebruiken en strikt nieuwer zijn, maar hoeft
-- niet direct op de vorige inhoudsrevisie aan te sluiten.
CREATE OR REPLACE FUNCTION "validate_assignment_revision_sequence"() RETURNS trigger AS $$
DECLARE
  current_assignment_version INTEGER;
  latest_revision_version INTEGER;
BEGIN
  SELECT "version" INTO current_assignment_version
  FROM "Assignment"
  WHERE "id" = NEW."assignmentId";

  SELECT COALESCE(MAX("version"), 0) INTO latest_revision_version
  FROM "AssignmentRevision"
  WHERE "assignmentId" = NEW."assignmentId";

  IF NEW."version" <> current_assignment_version OR NEW."version" <= latest_revision_version THEN
    RAISE EXCEPTION 'Opdrachtrevisie sluit niet aan op de actuele opdrachtversie.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Zakelijke opdrachtinhoud en publicatiemetadata veranderen niet meer nadat de
-- publicatie is vastgelegd. Statusovergangen voor latere modules blijven mogelijk.
CREATE FUNCTION "protect_published_assignment"() RETURNS trigger AS $$
BEGIN
  IF OLD."publishedAt" IS NOT NULL THEN
    IF NEW."intakeId" IS DISTINCT FROM OLD."intakeId"
      OR NEW."clientOrganizationId" IS DISTINCT FROM OLD."clientOrganizationId"
      OR NEW."createdByUserId" IS DISTINCT FROM OLD."createdByUserId"
      OR NEW."title" IS DISTINCT FROM OLD."title"
      OR NEW."description" IS DISTINCT FROM OLD."description"
      OR NEW."primarySpecialismId" IS DISTINCT FROM OLD."primarySpecialismId"
      OR NEW."sectorId" IS DISTINCT FROM OLD."sectorId"
      OR NEW."employeeCount" IS DISTINCT FROM OLD."employeeCount"
      OR NEW."desiredStartDate" IS DISTINCT FROM OLD."desiredStartDate"
      OR NEW."responseDeadline" IS DISTINCT FROM OLD."responseDeadline"
      OR NEW."locationId" IS DISTINCT FROM OLD."locationId"
      OR NEW."allowsRemoteWork" IS DISTINCT FROM OLD."allowsRemoteWork"
    THEN
      RAISE EXCEPTION 'Gepubliceerde opdrachtinhoud is immutable.';
    END IF;

    IF NEW."publishedAt" IS DISTINCT FROM OLD."publishedAt"
      OR NEW."publishedByUserId" IS DISTINCT FROM OLD."publishedByUserId"
      OR NEW."publishedVersion" IS DISTINCT FROM OLD."publishedVersion"
    THEN
      RAISE EXCEPTION 'Publicatiemetadata is immutable.';
    END IF;

    IF OLD."status" = 'CANCELLED' AND NEW."status" <> 'CANCELLED' THEN
      RAISE EXCEPTION 'Een ingetrokken opdracht kan niet opnieuw worden gepubliceerd.';
    END IF;

    IF NEW."status" IN ('DRAFT', 'READY_FOR_REVIEW') THEN
      RAISE EXCEPTION 'Een gepubliceerde opdracht kan niet terug naar een interne status.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "Assignment_published_immutable_trigger"
BEFORE UPDATE ON "Assignment"
FOR EACH ROW EXECUTE FUNCTION "protect_published_assignment"();

-- Gevraagde specialismen zijn onderdeel van de zakelijke opdrachtinhoud.
CREATE FUNCTION "protect_published_assignment_specialism"() RETURNS trigger AS $$
DECLARE
  target_assignment_id UUID;
  publication_time TIMESTAMPTZ;
BEGIN
  target_assignment_id := COALESCE(NEW."assignmentId", OLD."assignmentId");

  SELECT "publishedAt" INTO publication_time
  FROM "Assignment"
  WHERE "id" = target_assignment_id;

  IF publication_time IS NOT NULL THEN
    RAISE EXCEPTION 'Specialismen van een gepubliceerde opdracht zijn immutable.';
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "AssignmentSpecialism_published_immutable_trigger"
BEFORE INSERT OR UPDATE OR DELETE ON "AssignmentSpecialism"
FOR EACH ROW EXECUTE FUNCTION "protect_published_assignment_specialism"();

-- Publicatie- en intrekkingshistorie moeten bij de actuele opdrachttoestand horen.
CREATE FUNCTION "validate_assignment_publication_history_row"() RETURNS trigger AS $$
DECLARE
  target_status "AssignmentStatus";
  target_published_at TIMESTAMPTZ;
  target_published_by UUID;
BEGIN
  SELECT "status", "publishedAt", "publishedByUserId"
  INTO target_status, target_published_at, target_published_by
  FROM "Assignment"
  WHERE "id" = NEW."assignmentId";

  IF NEW."toStatus" = 'OPEN' THEN
    IF NEW."fromStatus" <> 'READY_FOR_REVIEW'
      OR target_status <> 'OPEN'
      OR target_published_at IS NULL
      OR target_published_by IS NULL
      OR NEW."changedByUserId" <> target_published_by
      OR NEW."createdAt" IS DISTINCT FROM target_published_at
    THEN
      RAISE EXCEPTION 'Publicatiehistorie komt niet overeen met de opdrachtpublicatie.';
    END IF;
  END IF;

  IF NEW."fromStatus" = 'OPEN' AND NEW."toStatus" = 'CANCELLED' THEN
    IF target_status <> 'CANCELLED' OR target_published_at IS NULL THEN
      RAISE EXCEPTION 'Intrekkingshistorie hoort niet bij een ingetrokken publicatie.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "AssignmentStatusHistory_publication_integrity_trigger"
BEFORE INSERT ON "AssignmentStatusHistory"
FOR EACH ROW EXECUTE FUNCTION "validate_assignment_publication_history_row"();

-- De opdracht mag aan het einde van een transactie niet gepubliceerd zijn zonder
-- precies één bijbehorende en inhoudelijk overeenkomende historieregel.
CREATE FUNCTION "validate_assignment_publication_history_complete"() RETURNS trigger AS $$
DECLARE
  matching_publications INTEGER;
BEGIN
  IF NEW."publishedAt" IS NOT NULL THEN
    SELECT COUNT(*) INTO matching_publications
    FROM "AssignmentStatusHistory"
    WHERE "assignmentId" = NEW."id"
      AND "fromStatus" = 'READY_FOR_REVIEW'
      AND "toStatus" = 'OPEN'
      AND "changedByUserId" = NEW."publishedByUserId"
      AND "createdAt" = NEW."publishedAt";

    IF matching_publications <> 1 THEN
      RAISE EXCEPTION 'Gepubliceerde opdracht mist consistente publicatiehistorie.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE CONSTRAINT TRIGGER "Assignment_publication_history_complete_trigger"
AFTER INSERT OR UPDATE ON "Assignment"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION "validate_assignment_publication_history_complete"();
