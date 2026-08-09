-- Koppel append-only financiële events expliciet aan de refund-lifecycle.
ALTER TABLE "FinancialEvent"
  ADD COLUMN "refundId" UUID;

CREATE INDEX "FinancialEvent_refundId_createdAt_idx"
  ON "FinancialEvent"("refundId", "createdAt");

ALTER TABLE "FinancialEvent"
  ADD CONSTRAINT "FinancialEvent_refundId_fkey"
  FOREIGN KEY ("refundId") REFERENCES "FinancialRefund"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
