ALTER TYPE "FinancialSyncStatus" ADD VALUE IF NOT EXISTS 'RETRY_REQUIRED';

ALTER TABLE "FinancialJorttSync"
  ADD COLUMN "remoteInvoiceNumber" VARCHAR(80);

CREATE INDEX "FinancialJorttSync_remoteInvoiceNumber_idx"
  ON "FinancialJorttSync"("remoteInvoiceNumber");
