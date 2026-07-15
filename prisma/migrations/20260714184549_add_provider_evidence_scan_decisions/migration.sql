-- CreateTable
CREATE TABLE "ProviderEvidenceScanDecision" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "evidenceRevisionId" UUID NOT NULL,
    "scanStatus" "ProviderEvidenceScanStatus" NOT NULL,
    "scannerReference" TEXT NOT NULL,
    "checksum" VARCHAR(64) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProviderEvidenceScanDecision_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProviderEvidenceScanDecision_evidenceRevisionId_key" ON "ProviderEvidenceScanDecision"("evidenceRevisionId");

-- CreateIndex
CREATE INDEX "ProviderEvidenceScanDecision_scanStatus_createdAt_idx" ON "ProviderEvidenceScanDecision"("scanStatus", "createdAt");

-- AddForeignKey
ALTER TABLE "ProviderEvidenceScanDecision" ADD CONSTRAINT "ProviderEvidenceScanDecision_evidenceRevisionId_fkey" FOREIGN KEY ("evidenceRevisionId") REFERENCES "ProviderEvidenceRevision"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ProviderEvidenceScanDecision"
  ADD CONSTRAINT "ProviderEvidenceScanDecision_final_status_check" CHECK ("scanStatus" IN ('CLEAN', 'QUARANTINED', 'REJECTED')),
  ADD CONSTRAINT "ProviderEvidenceScanDecision_checksum_check" CHECK ("checksum" ~ '^[0-9a-f]{64}$');

CREATE TRIGGER "immutable_providerevidencescandecision"
BEFORE UPDATE OR DELETE ON "ProviderEvidenceScanDecision"
FOR EACH ROW EXECUTE FUNCTION workmatchr_reject_provider_history_mutation();
