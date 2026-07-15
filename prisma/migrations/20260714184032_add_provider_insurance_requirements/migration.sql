-- CreateTable
CREATE TABLE "ProviderInsuranceRequirementConfig" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "version" INTEGER NOT NULL,
    "status" "ProviderTaxonomyVersionStatus" NOT NULL DEFAULT 'DRAFT',
    "effectiveFrom" TIMESTAMPTZ(3),
    "effectiveUntil" TIMESTAMPTZ(3),
    "checksum" VARCHAR(64),
    "publishedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProviderInsuranceRequirementConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderInsuranceRequirement" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "configId" UUID NOT NULL,
    "insuranceTypeTermId" UUID NOT NULL,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "minimumVerification" "ProviderVerificationLevel" NOT NULL,
    "minimumCoverageCents" BIGINT,
    "coverageGeography" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProviderInsuranceRequirement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProviderInsuranceRequirementConfig_version_key" ON "ProviderInsuranceRequirementConfig"("version");

-- CreateIndex
CREATE INDEX "ProviderInsuranceRequirement_insuranceTypeTermId_idx" ON "ProviderInsuranceRequirement"("insuranceTypeTermId");

-- CreateIndex
CREATE UNIQUE INDEX "ProviderInsuranceRequirement_configId_insuranceTypeTermId_key" ON "ProviderInsuranceRequirement"("configId", "insuranceTypeTermId");

-- AddForeignKey
ALTER TABLE "ProviderInsuranceRequirement" ADD CONSTRAINT "ProviderInsuranceRequirement_configId_fkey" FOREIGN KEY ("configId") REFERENCES "ProviderInsuranceRequirementConfig"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderInsuranceRequirement" ADD CONSTRAINT "ProviderInsuranceRequirement_insuranceTypeTermId_fkey" FOREIGN KEY ("insuranceTypeTermId") REFERENCES "ProviderTaxonomyTerm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ProviderInsuranceRequirementConfig"
  ADD CONSTRAINT "ProviderInsuranceRequirementConfig_version_check" CHECK ("version" > 0),
  ADD CONSTRAINT "ProviderInsuranceRequirementConfig_validity_check" CHECK ("effectiveUntil" IS NULL OR "effectiveFrom" IS NULL OR "effectiveUntil" > "effectiveFrom"),
  ADD CONSTRAINT "ProviderInsuranceRequirementConfig_publication_check" CHECK (
    ("status" = 'DRAFT' AND "publishedAt" IS NULL)
    OR ("status" IN ('PUBLISHED', 'RETIRED') AND "publishedAt" IS NOT NULL AND "checksum" ~ '^[0-9a-f]{64}$')
  );

ALTER TABLE "ProviderInsuranceRequirement"
  ADD CONSTRAINT "ProviderInsuranceRequirement_coverage_check" CHECK ("minimumCoverageCents" IS NULL OR "minimumCoverageCents" >= 0);

CREATE UNIQUE INDEX "ProviderInsuranceRequirementConfig_one_published"
ON "ProviderInsuranceRequirementConfig" (("status")) WHERE "status" = 'PUBLISHED';
