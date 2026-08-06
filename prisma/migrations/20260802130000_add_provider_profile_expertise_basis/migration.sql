-- Additive extension for the structured Dienstverlenersprofiel.
-- Capacity and availability intentionally remain outside this profile contract.
ALTER TYPE "ProviderTaxonomyKind" ADD VALUE IF NOT EXISTS 'MEMBERSHIP';
ALTER TYPE "ProviderTaxonomyKind" ADD VALUE IF NOT EXISTS 'REGISTRATION';
ALTER TYPE "ProviderTaxonomyKind" ADD VALUE IF NOT EXISTS 'WORK_MODE';

ALTER TABLE "ProviderProfile"
  ADD COLUMN "shortIntroduction" VARCHAR(300),
  ADD COLUMN "workingMethod" TEXT;

ALTER TABLE "ProviderTaxonomyTerm"
  ADD COLUMN "description" TEXT,
  ADD COLUMN "aliases" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

CREATE TABLE "ProviderProfileCoreExpertise" (
  "providerProfileId" UUID NOT NULL,
  "taxonomyTermId" UUID NOT NULL,
  "position" INTEGER NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProviderProfileCoreExpertise_pkey" PRIMARY KEY ("providerProfileId", "taxonomyTermId"),
  CONSTRAINT "ProviderProfileCoreExpertise_position_check" CHECK ("position" BETWEEN 1 AND 3),
  CONSTRAINT "ProviderProfileCoreExpertise_providerProfileId_fkey"
    FOREIGN KEY ("providerProfileId") REFERENCES "ProviderProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "ProviderProfileCoreExpertise_taxonomyTermId_fkey"
    FOREIGN KEY ("taxonomyTermId") REFERENCES "ProviderTaxonomyTerm"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "ProviderProfileCoreExpertise_providerProfileId_position_key"
  ON "ProviderProfileCoreExpertise"("providerProfileId", "position");
CREATE INDEX "ProviderProfileCoreExpertise_taxonomyTermId_idx"
  ON "ProviderProfileCoreExpertise"("taxonomyTermId");

CREATE TABLE "ProviderProfileWorkMode" (
  "providerProfileId" UUID NOT NULL,
  "taxonomyTermId" UUID NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProviderProfileWorkMode_pkey" PRIMARY KEY ("providerProfileId", "taxonomyTermId"),
  CONSTRAINT "ProviderProfileWorkMode_providerProfileId_fkey"
    FOREIGN KEY ("providerProfileId") REFERENCES "ProviderProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "ProviderProfileWorkMode_taxonomyTermId_fkey"
    FOREIGN KEY ("taxonomyTermId") REFERENCES "ProviderTaxonomyTerm"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "ProviderProfileWorkMode_taxonomyTermId_idx"
  ON "ProviderProfileWorkMode"("taxonomyTermId");
