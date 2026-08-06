-- Geordende locaties voor opdrachten die op meerdere plaatsen worden uitgevoerd.
-- De scalair locationCount blijft alleen een afgeleide compatibiliteitswaarde.
CREATE TABLE "AssignmentLocationItem" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "assignmentId" UUID NOT NULL,
  "position" INTEGER NOT NULL,
  "placeOrRegion" TEXT NOT NULL,
  "normalizedValue" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AssignmentLocationItem_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AssignmentLocationItem_position_check" CHECK ("position" BETWEEN 1 AND 25),
  CONSTRAINT "AssignmentLocationItem_value_check" CHECK (
    NULLIF(BTRIM("placeOrRegion"), '') IS NOT NULL AND CHAR_LENGTH("placeOrRegion") <= 120
  )
);

CREATE TABLE "AssignmentRevisionLocationItem" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "assignmentRevisionId" UUID NOT NULL,
  "position" INTEGER NOT NULL,
  "placeOrRegion" TEXT NOT NULL,
  "normalizedValue" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AssignmentRevisionLocationItem_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AssignmentRevisionLocationItem_position_check" CHECK ("position" BETWEEN 1 AND 25),
  CONSTRAINT "AssignmentRevisionLocationItem_value_check" CHECK (
    NULLIF(BTRIM("placeOrRegion"), '') IS NOT NULL AND CHAR_LENGTH("placeOrRegion") <= 120
  )
);

CREATE UNIQUE INDEX "AssignmentLocationItem_assignmentId_position_key"
  ON "AssignmentLocationItem"("assignmentId", "position");
CREATE UNIQUE INDEX "AssignmentLocationItem_assignmentId_normalizedValue_key"
  ON "AssignmentLocationItem"("assignmentId", "normalizedValue");
CREATE INDEX "AssignmentLocationItem_assignmentId_idx"
  ON "AssignmentLocationItem"("assignmentId");

CREATE UNIQUE INDEX "AssignmentRevisionLocationItem_assignmentRevisionId_position_key"
  ON "AssignmentRevisionLocationItem"("assignmentRevisionId", "position");
CREATE UNIQUE INDEX "AssignmentRevisionLocationItem_assignmentRevisionId_normalizedValue_key"
  ON "AssignmentRevisionLocationItem"("assignmentRevisionId", "normalizedValue");
CREATE INDEX "AssignmentRevisionLocationItem_assignmentRevisionId_idx"
  ON "AssignmentRevisionLocationItem"("assignmentRevisionId");

ALTER TABLE "AssignmentLocationItem"
  ADD CONSTRAINT "AssignmentLocationItem_assignmentId_fkey"
  FOREIGN KEY ("assignmentId") REFERENCES "Assignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "AssignmentRevisionLocationItem"
  ADD CONSTRAINT "AssignmentRevisionLocationItem_assignmentRevisionId_fkey"
  FOREIGN KEY ("assignmentRevisionId") REFERENCES "AssignmentRevision"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Een bestaande MULTIPLE-snapshot zonder een herleidbare lijst wordt niet
-- stilzwijgend herschreven. De migratie stopt fail-closed voor handmatige beoordeling.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "Assignment" WHERE "locationType" = 'MULTIPLE')
    OR EXISTS (SELECT 1 FROM "AssignmentRevision" WHERE "locationType" = 'MULTIPLE')
  THEN
    RAISE EXCEPTION 'Bestaande MULTIPLE-opdrachtlocaties vereisen handmatige migratiebeoordeling.';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION "protect_assignment_location_item"() RETURNS trigger AS $$
DECLARE
  parent_assignment_id UUID;
  parent_published_at TIMESTAMPTZ;
BEGIN
  parent_assignment_id := COALESCE(NEW."assignmentId", OLD."assignmentId");
  SELECT "publishedAt" INTO parent_published_at
  FROM "Assignment" WHERE "id" = parent_assignment_id;
  IF parent_published_at IS NOT NULL THEN
    RAISE EXCEPTION 'Gepubliceerde opdrachtlocaties zijn immutable.';
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "AssignmentLocationItem_protect_published_trigger"
  BEFORE INSERT OR UPDATE OR DELETE ON "AssignmentLocationItem"
  FOR EACH ROW EXECUTE FUNCTION "protect_assignment_location_item"();

CREATE OR REPLACE FUNCTION "protect_assignment_revision_location_item"() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Opdrachtrevisielocaties zijn append-only.';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "AssignmentRevisionLocationItem_append_only_trigger"
  BEFORE UPDATE OR DELETE ON "AssignmentRevisionLocationItem"
  FOR EACH ROW EXECUTE FUNCTION "protect_assignment_revision_location_item"();
