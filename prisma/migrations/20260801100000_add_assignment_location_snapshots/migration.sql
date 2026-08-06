-- Additieve, getypeerde opdrachtlocatie. locationType en de snapshotvelden zijn
-- leidend; locationId blijft uitsluitend de bronreferentie voor REGISTERED en
-- allowsRemoteWork blijft een compatibiliteitsprojectie.
CREATE TYPE "AssignmentLocationType" AS ENUM (
  'REGISTERED',
  'OTHER',
  'MULTIPLE',
  'REMOTE',
  'UNKNOWN'
);

ALTER TABLE "Assignment"
  ADD COLUMN "locationType" "AssignmentLocationType" NOT NULL DEFAULT 'UNKNOWN',
  ADD COLUMN "locationName" TEXT,
  ADD COLUMN "locationAddressLine" TEXT,
  ADD COLUMN "locationPostalCode" TEXT,
  ADD COLUMN "locationCity" TEXT,
  ADD COLUMN "locationProvince" TEXT,
  ADD COLUMN "locationCountryCode" CHAR(2),
  ADD COLUMN "locationRegion" TEXT,
  ADD COLUMN "locationDescription" TEXT,
  ADD COLUMN "locationCount" INTEGER;

ALTER TABLE "AssignmentRevision"
  ADD COLUMN "locationType" "AssignmentLocationType" NOT NULL DEFAULT 'UNKNOWN',
  ADD COLUMN "locationName" TEXT,
  ADD COLUMN "locationAddressLine" TEXT,
  ADD COLUMN "locationPostalCode" TEXT,
  ADD COLUMN "locationCity" TEXT,
  ADD COLUMN "locationProvince" TEXT,
  ADD COLUMN "locationCountryCode" CHAR(2),
  ADD COLUMN "locationRegion" TEXT,
  ADD COLUMN "locationDescription" TEXT,
  ADD COLUMN "locationCount" INTEGER;

ALTER TABLE "Assignment"
  ADD CONSTRAINT "Assignment_location_count_check" CHECK (
    "locationCount" IS NULL OR "locationCount" > 0
  ) NOT VALID,
  ADD CONSTRAINT "Assignment_location_shape_check" CHECK (
    ("locationType" = 'REGISTERED' AND "locationId" IS NOT NULL AND NULLIF(BTRIM("locationName"), '') IS NOT NULL AND NULLIF(BTRIM("locationCity"), '') IS NOT NULL)
    OR ("locationType" = 'OTHER' AND "locationId" IS NULL AND (NULLIF(BTRIM("locationCity"), '') IS NOT NULL OR NULLIF(BTRIM("locationRegion"), '') IS NOT NULL))
    OR ("locationType" = 'MULTIPLE' AND "locationId" IS NULL)
    OR ("locationType" IN ('REMOTE', 'UNKNOWN') AND "locationId" IS NULL)
  ) NOT VALID;

ALTER TABLE "AssignmentRevision"
  ADD CONSTRAINT "AssignmentRevision_location_count_check" CHECK (
    "locationCount" IS NULL OR "locationCount" > 0
  ) NOT VALID,
  ADD CONSTRAINT "AssignmentRevision_location_shape_check" CHECK (
    ("locationType" = 'REGISTERED' AND "locationId" IS NOT NULL AND NULLIF(BTRIM("locationName"), '') IS NOT NULL AND NULLIF(BTRIM("locationCity"), '') IS NOT NULL)
    OR ("locationType" = 'OTHER' AND "locationId" IS NULL AND (NULLIF(BTRIM("locationCity"), '') IS NOT NULL OR NULLIF(BTRIM("locationRegion"), '') IS NOT NULL))
    OR ("locationType" = 'MULTIPLE' AND "locationId" IS NULL)
    OR ("locationType" IN ('REMOTE', 'UNKNOWN') AND "locationId" IS NULL)
  ) NOT VALID;

UPDATE "Assignment" AS assignment
SET
  "locationType" = CASE
    WHEN assignment."locationId" IS NOT NULL THEN 'REGISTERED'::"AssignmentLocationType"
    WHEN assignment."allowsRemoteWork" = true THEN 'REMOTE'::"AssignmentLocationType"
    ELSE 'UNKNOWN'::"AssignmentLocationType"
  END,
  "locationName" = location."label",
  "locationAddressLine" = location."addressLine",
  "locationPostalCode" = location."postalCode",
  "locationCity" = location."city",
  "locationProvince" = location."province",
  "locationCountryCode" = location."countryCode",
  "locationRegion" = location."province"
FROM "OrganizationLocation" AS location
WHERE assignment."locationId" = location."id";

UPDATE "Assignment"
SET "locationType" = 'REMOTE'::"AssignmentLocationType"
WHERE "locationId" IS NULL AND "allowsRemoteWork" = true;

-- De bestaande append-only-trigger blijft de structurele bescherming. Alleen
-- deze eenmalige, gecontroleerde migratiebackfill krijgt tijdelijk toegang.
ALTER TABLE "AssignmentRevision" DISABLE TRIGGER "AssignmentRevision_append_only_trigger";

UPDATE "AssignmentRevision" AS revision
SET
  "locationType" = CASE
    WHEN revision."locationId" IS NOT NULL THEN 'REGISTERED'::"AssignmentLocationType"
    WHEN revision."allowsRemoteWork" = true THEN 'REMOTE'::"AssignmentLocationType"
    ELSE 'UNKNOWN'::"AssignmentLocationType"
  END,
  "locationName" = location."label",
  "locationAddressLine" = location."addressLine",
  "locationPostalCode" = location."postalCode",
  "locationCity" = location."city",
  "locationProvince" = location."province",
  "locationCountryCode" = location."countryCode",
  "locationRegion" = location."province"
FROM "OrganizationLocation" AS location
WHERE revision."locationId" = location."id";

UPDATE "AssignmentRevision"
SET "locationType" = 'REMOTE'::"AssignmentLocationType"
WHERE "locationId" IS NULL AND "allowsRemoteWork" = true;

ALTER TABLE "AssignmentRevision" ENABLE TRIGGER "AssignmentRevision_append_only_trigger";

-- Rapporteer historische opdrachten die niet als geregistreerd of remote konden
-- worden herkend. Zij blijven fail-safe publiceerbaar als expliciet UNKNOWN.
DO $$
DECLARE
  unknown_assignments INTEGER;
  unknown_revisions INTEGER;
BEGIN
  SELECT COUNT(*) INTO unknown_assignments FROM "Assignment" WHERE "locationType" = 'UNKNOWN';
  SELECT COUNT(*) INTO unknown_revisions FROM "AssignmentRevision" WHERE "locationType" = 'UNKNOWN';
  RAISE NOTICE 'Assignment location backfill: % assignments and % revisions classified as UNKNOWN', unknown_assignments, unknown_revisions;
END;
$$;

-- Breid de bestaande bescherming uit: ook de getypeerde locatie en haar
-- snapshotvelden zijn na publicatie immutable.
CREATE OR REPLACE FUNCTION "protect_published_assignment"() RETURNS trigger AS $$
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
      OR NEW."locationType" IS DISTINCT FROM OLD."locationType"
      OR NEW."locationId" IS DISTINCT FROM OLD."locationId"
      OR NEW."locationName" IS DISTINCT FROM OLD."locationName"
      OR NEW."locationAddressLine" IS DISTINCT FROM OLD."locationAddressLine"
      OR NEW."locationPostalCode" IS DISTINCT FROM OLD."locationPostalCode"
      OR NEW."locationCity" IS DISTINCT FROM OLD."locationCity"
      OR NEW."locationProvince" IS DISTINCT FROM OLD."locationProvince"
      OR NEW."locationCountryCode" IS DISTINCT FROM OLD."locationCountryCode"
      OR NEW."locationRegion" IS DISTINCT FROM OLD."locationRegion"
      OR NEW."locationDescription" IS DISTINCT FROM OLD."locationDescription"
      OR NEW."locationCount" IS DISTINCT FROM OLD."locationCount"
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
