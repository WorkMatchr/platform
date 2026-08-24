ALTER TABLE "FinancialInvoice"
  ADD COLUMN "snapshotVersion" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "supplyDate" TIMESTAMPTZ(3),
  ADD COLUMN "advancePaymentDate" TIMESTAMPTZ(3),
  ADD COLUMN "servicePeriodStart" TIMESTAMPTZ(3),
  ADD COLUMN "servicePeriodEnd" TIMESTAMPTZ(3);

CREATE TABLE "FinancialInvoiceLine" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "invoiceId" UUID NOT NULL,
  "position" INTEGER NOT NULL,
  "description" VARCHAR(500) NOT NULL,
  "quantity" INTEGER NOT NULL,
  "unit" VARCHAR(40) NOT NULL,
  "unitPriceExclVatCents" INTEGER NOT NULL,
  "grossAmountExclVatCents" INTEGER NOT NULL,
  "discountAmountCents" INTEGER NOT NULL,
  "netAmountExclVatCents" INTEGER NOT NULL,
  "vatRateBps" INTEGER NOT NULL,
  "vatAmountCents" INTEGER NOT NULL,
  "amountInclVatCents" INTEGER NOT NULL,
  "servicePeriodStart" TIMESTAMPTZ(3),
  "servicePeriodEnd" TIMESTAMPTZ(3),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FinancialInvoiceLine_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "FinancialInvoiceLine_values_check" CHECK (
    "position" > 0 AND "quantity" > 0 AND length(btrim("description")) > 0 AND length(btrim("unit")) > 0
    AND "unitPriceExclVatCents" >= 0
    AND "grossAmountExclVatCents" = "quantity" * "unitPriceExclVatCents"
    AND "discountAmountCents" >= 0 AND "discountAmountCents" <= "grossAmountExclVatCents"
    AND "netAmountExclVatCents" = "grossAmountExclVatCents" - "discountAmountCents"
    AND "vatRateBps" BETWEEN 0 AND 10000 AND "vatAmountCents" >= 0
    AND "amountInclVatCents" = "netAmountExclVatCents" + "vatAmountCents"
    AND (("servicePeriodStart" IS NULL AND "servicePeriodEnd" IS NULL)
      OR ("servicePeriodStart" IS NOT NULL AND "servicePeriodEnd" > "servicePeriodStart"))
  )
);

CREATE TABLE "FinancialInvoiceVatSummary" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "invoiceId" UUID NOT NULL,
  "vatRateBps" INTEGER NOT NULL,
  "taxableAmountExclVatCents" INTEGER NOT NULL,
  "vatAmountCents" INTEGER NOT NULL,
  "amountInclVatCents" INTEGER NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FinancialInvoiceVatSummary_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "FinancialInvoiceVatSummary_values_check" CHECK (
    "vatRateBps" BETWEEN 0 AND 10000 AND "taxableAmountExclVatCents" >= 0
    AND "vatAmountCents" >= 0
    AND "amountInclVatCents" = "taxableAmountExclVatCents" + "vatAmountCents"
  )
);

CREATE UNIQUE INDEX "FinancialInvoiceLine_invoiceId_position_key" ON "FinancialInvoiceLine"("invoiceId", "position");
CREATE INDEX "FinancialInvoiceLine_invoiceId_idx" ON "FinancialInvoiceLine"("invoiceId");
CREATE UNIQUE INDEX "FinancialInvoiceVatSummary_invoiceId_vatRateBps_key" ON "FinancialInvoiceVatSummary"("invoiceId", "vatRateBps");
CREATE INDEX "FinancialInvoiceVatSummary_invoiceId_idx" ON "FinancialInvoiceVatSummary"("invoiceId");

ALTER TABLE "FinancialInvoiceLine" ADD CONSTRAINT "FinancialInvoiceLine_invoiceId_fkey"
  FOREIGN KEY ("invoiceId") REFERENCES "FinancialInvoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FinancialInvoiceVatSummary" ADD CONSTRAINT "FinancialInvoiceVatSummary_invoiceId_fkey"
  FOREIGN KEY ("invoiceId") REFERENCES "FinancialInvoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "FinancialInvoice" ADD CONSTRAINT "FinancialInvoice_snapshot_v2_dates_check" CHECK (
  "snapshotVersion" IN (1, 2) AND ("snapshotVersion" = 1 OR (
    "snapshotVersion" = 2 AND "documentType" = 'INVOICE' AND "supplyDate" IS NOT NULL
    AND (("servicePeriodStart" IS NULL AND "servicePeriodEnd" IS NULL)
      OR ("servicePeriodStart" IS NOT NULL AND "servicePeriodEnd" > "servicePeriodStart"))
  ))
);

CREATE OR REPLACE FUNCTION "financial_validate_invoice_v2"() RETURNS trigger AS $$
DECLARE
  target_id UUID;
  invoice_record "FinancialInvoice"%ROWTYPE;
  line_count INTEGER;
  line_net BIGINT;
  line_vat BIGINT;
  line_total BIGINT;
  line_discount BIGINT;
  summary_net BIGINT;
  summary_vat BIGINT;
  summary_total BIGINT;
  summary_mismatch INTEGER;
BEGIN
  IF TG_TABLE_NAME = 'FinancialInvoice' THEN target_id := NEW."id"; ELSE target_id := NEW."invoiceId"; END IF;
  SELECT * INTO invoice_record FROM "FinancialInvoice" WHERE "id" = target_id;
  IF NOT FOUND OR invoice_record."snapshotVersion" <> 2 THEN RETURN NEW; END IF;

  SELECT count(*), COALESCE(sum("netAmountExclVatCents"), 0), COALESCE(sum("vatAmountCents"), 0),
    COALESCE(sum("amountInclVatCents"), 0), COALESCE(sum("discountAmountCents"), 0)
  INTO line_count, line_net, line_vat, line_total, line_discount
  FROM "FinancialInvoiceLine" WHERE "invoiceId" = target_id;

  SELECT COALESCE(sum("taxableAmountExclVatCents"), 0), COALESCE(sum("vatAmountCents"), 0),
    COALESCE(sum("amountInclVatCents"), 0)
  INTO summary_net, summary_vat, summary_total
  FROM "FinancialInvoiceVatSummary" WHERE "invoiceId" = target_id;

  SELECT count(*) INTO summary_mismatch FROM (
    SELECT l."vatRateBps", sum(l."netAmountExclVatCents") AS net, sum(l."vatAmountCents") AS vat,
      sum(l."amountInclVatCents") AS total
    FROM "FinancialInvoiceLine" l WHERE l."invoiceId" = target_id GROUP BY l."vatRateBps"
  ) l FULL JOIN "FinancialInvoiceVatSummary" s
    ON s."invoiceId" = target_id AND s."vatRateBps" = l."vatRateBps"
  WHERE l."vatRateBps" IS NULL OR s."vatRateBps" IS NULL OR l.net <> s."taxableAmountExclVatCents"
    OR l.vat <> s."vatAmountCents" OR l.total <> s."amountInclVatCents";

  IF line_count < 1 OR line_net <> invoice_record."amountExclVatCents"
    OR line_vat <> invoice_record."vatAmountCents" OR line_total <> invoice_record."amountInclVatCents"
    OR line_discount <> invoice_record."packageDiscountCents" + invoice_record."proDiscountCents" + invoice_record."discountCodeDiscountCents"
    OR summary_net <> invoice_record."amountExclVatCents" OR summary_vat <> invoice_record."vatAmountCents"
    OR summary_total <> invoice_record."amountInclVatCents" OR summary_mismatch <> 0 THEN
    RAISE EXCEPTION 'financial invoice v2 totals or VAT summaries are incomplete or inconsistent';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE CONSTRAINT TRIGGER "FinancialInvoice_v2_complete" AFTER INSERT ON "FinancialInvoice"
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION "financial_validate_invoice_v2"();
CREATE CONSTRAINT TRIGGER "FinancialInvoiceLine_v2_complete" AFTER INSERT ON "FinancialInvoiceLine"
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION "financial_validate_invoice_v2"();
CREATE CONSTRAINT TRIGGER "FinancialInvoiceVatSummary_v2_complete" AFTER INSERT ON "FinancialInvoiceVatSummary"
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION "financial_validate_invoice_v2"();

CREATE TRIGGER "FinancialInvoiceLine_immutable" BEFORE UPDATE OR DELETE ON "FinancialInvoiceLine"
  FOR EACH ROW EXECUTE FUNCTION "financial_immutable_record"();
CREATE TRIGGER "FinancialInvoiceVatSummary_immutable" BEFORE UPDATE OR DELETE ON "FinancialInvoiceVatSummary"
  FOR EACH ROW EXECUTE FUNCTION "financial_immutable_record"();
