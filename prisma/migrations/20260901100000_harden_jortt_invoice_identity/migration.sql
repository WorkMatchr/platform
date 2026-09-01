ALTER TABLE "FinancialJorttSync"
  ADD COLUMN "technicalReference" VARCHAR(80);

CREATE UNIQUE INDEX "FinancialJorttSync_technicalReference_key"
  ON "FinancialJorttSync"("technicalReference");

ALTER TABLE "FinancialJorttSync"
  ADD CONSTRAINT "FinancialJorttSync_technicalReference_matches_invoice_check"
  CHECK (
    "technicalReference" IS NULL
    OR "technicalReference" = 'workmatchr-invoice:' || "invoiceId"::text
  );
