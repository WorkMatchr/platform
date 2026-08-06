-- Valideer na de afzonderlijk gecommitte backfill alle historische en actuele
-- opdrachtlocaties. Nieuwe writes werden al door de NOT VALID-constraints bewaakt.
ALTER TABLE "Assignment"
  VALIDATE CONSTRAINT "Assignment_location_count_check";

ALTER TABLE "Assignment"
  VALIDATE CONSTRAINT "Assignment_location_shape_check";

ALTER TABLE "AssignmentRevision"
  VALIDATE CONSTRAINT "AssignmentRevision_location_count_check";

ALTER TABLE "AssignmentRevision"
  VALIDATE CONSTRAINT "AssignmentRevision_location_shape_check";
