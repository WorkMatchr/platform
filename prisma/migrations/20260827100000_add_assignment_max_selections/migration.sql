ALTER TABLE "Assignment"
ADD COLUMN "maxSelections" INTEGER NOT NULL DEFAULT 3;

ALTER TABLE "Assignment"
ADD CONSTRAINT "Assignment_maxSelections_check"
CHECK ("maxSelections" BETWEEN 3 AND 5);
