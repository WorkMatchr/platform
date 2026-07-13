-- Module 4B: afleidbare metadata voor één gestandaardiseerd organisatielogo.
-- Bestandsinhoud en absolute opslagpaden blijven buiten PostgreSQL.
ALTER TABLE "Organization"
  ADD COLUMN "logoStorageKey" TEXT,
  ADD COLUMN "logoMimeType" TEXT,
  ADD COLUMN "logoSizeBytes" INTEGER,
  ADD COLUMN "logoWidth" INTEGER,
  ADD COLUMN "logoHeight" INTEGER,
  ADD COLUMN "logoUpdatedAt" TIMESTAMPTZ(3);

CREATE UNIQUE INDEX "Organization_logoStorageKey_key" ON "Organization"("logoStorageKey");

ALTER TABLE "Organization" ADD CONSTRAINT "Organization_logo_metadata_check" CHECK (
  (
    "logoStorageKey" IS NULL AND
    "logoMimeType" IS NULL AND
    "logoSizeBytes" IS NULL AND
    "logoWidth" IS NULL AND
    "logoHeight" IS NULL AND
    "logoUpdatedAt" IS NULL
  ) OR (
    "logoStorageKey" IS NOT NULL AND
    "logoMimeType" = 'image/webp' AND
    "logoSizeBytes" > 0 AND
    "logoWidth" > 0 AND
    "logoHeight" > 0 AND
    "logoUpdatedAt" IS NOT NULL
  )
);
