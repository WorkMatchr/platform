-- Additive contract extension only. Existing snapshots and migrations stay intact.
ALTER TABLE "FinancialInvoice" DROP CONSTRAINT "FinancialInvoice_snapshot_v2_dates_check";
ALTER TABLE "FinancialInvoice" ADD CONSTRAINT "FinancialInvoice_snapshot_v2_dates_check" CHECK (
  "snapshotVersion" IN (1, 2) AND ("snapshotVersion" = 1 OR (
    "supplyDate" IS NOT NULL
    AND ("documentType" = 'INVOICE' OR ("documentType" = 'CREDIT_NOTE' AND "originalInvoiceId" IS NOT NULL AND "refundId" IS NOT NULL))
    AND (("servicePeriodStart" IS NULL AND "servicePeriodEnd" IS NULL)
      OR ("servicePeriodStart" IS NOT NULL AND "servicePeriodEnd" > "servicePeriodStart"))
  ))
);
ALTER TABLE "FinancialInvoiceLine" DROP CONSTRAINT "FinancialInvoiceLine_values_check";
ALTER TABLE "FinancialInvoiceLine" ADD CONSTRAINT "FinancialInvoiceLine_values_check" CHECK (
  "position" > 0 AND "quantity" > 0 AND length(btrim("description")) > 0 AND length(btrim("unit")) > 0
  AND "grossAmountExclVatCents"::bigint = "quantity"::bigint * "unitPriceExclVatCents"
  AND (("unitPriceExclVatCents" >= 0 AND "discountAmountCents" >= 0 AND "discountAmountCents" <= "grossAmountExclVatCents" AND "vatAmountCents" >= 0)
    OR ("unitPriceExclVatCents" <= 0 AND "discountAmountCents" <= 0 AND "discountAmountCents" >= "grossAmountExclVatCents" AND "vatAmountCents" <= 0))
  AND "netAmountExclVatCents"::bigint = "grossAmountExclVatCents"::bigint - "discountAmountCents"
  AND "vatRateBps" BETWEEN 0 AND 10000
  AND "amountInclVatCents"::bigint = "netAmountExclVatCents"::bigint + "vatAmountCents"
  AND (("servicePeriodStart" IS NULL AND "servicePeriodEnd" IS NULL)
    OR ("servicePeriodStart" IS NOT NULL AND "servicePeriodEnd" > "servicePeriodStart"))
);
ALTER TABLE "FinancialInvoiceVatSummary" DROP CONSTRAINT "FinancialInvoiceVatSummary_values_check";
ALTER TABLE "FinancialInvoiceVatSummary" ADD CONSTRAINT "FinancialInvoiceVatSummary_values_check" CHECK (
  "vatRateBps" BETWEEN 0 AND 10000
  AND (("taxableAmountExclVatCents" >= 0 AND "vatAmountCents" >= 0) OR ("taxableAmountExclVatCents" <= 0 AND "vatAmountCents" <= 0))
  AND "amountInclVatCents"::bigint = "taxableAmountExclVatCents"::bigint + "vatAmountCents"
);

-- Keep ordinary invoice lines positive; only linked credit notes may be negative.
-- The existing deferred v2 totals/VAT validator continues unchanged for both types.
CREATE FUNCTION "financial_validate_document_sign"() RETURNS trigger AS $$
DECLARE target_id UUID; doc "FinancialInvoice"%ROWTYPE; original "FinancialInvoice"%ROWTYPE;
BEGIN
  IF TG_TABLE_NAME = 'FinancialInvoice' THEN target_id := NEW."id"; ELSE target_id := NEW."invoiceId"; END IF;
  SELECT * INTO doc FROM "FinancialInvoice" WHERE "id" = target_id;
  IF doc."documentType" = 'INVOICE' THEN
    IF EXISTS (SELECT 1 FROM "FinancialInvoiceLine" WHERE "invoiceId" = target_id AND ("unitPriceExclVatCents" < 0 OR "discountAmountCents" < 0 OR "vatAmountCents" < 0))
      OR EXISTS (SELECT 1 FROM "FinancialInvoiceVatSummary" WHERE "invoiceId" = target_id AND ("taxableAmountExclVatCents" < 0 OR "vatAmountCents" < 0)) THEN
      RAISE EXCEPTION 'invoice lines must remain nonnegative';
    END IF;
  ELSE
    IF doc."snapshotVersion" = 2 THEN
    SELECT * INTO original FROM "FinancialInvoice" WHERE "id" = doc."originalInvoiceId";
    IF NOT FOUND OR original."snapshotVersion" <> 2 OR original."documentType" <> 'INVOICE'
      OR doc."organizationId" <> original."organizationId" OR doc."currency" <> original."currency"
      OR doc."amountExclVatCents"::bigint <> -original."amountExclVatCents"::bigint
      OR doc."vatAmountCents"::bigint <> -original."vatAmountCents"::bigint
      OR doc."amountInclVatCents"::bigint <> -original."amountInclVatCents"::bigint
      OR NOT EXISTS (SELECT 1 FROM "FinancialRefund" r WHERE r."id" = doc."refundId" AND r."status" = 'REFUNDED'
        AND r."purchaseId" = original."purchaseId" AND r."amountCents" = original."amountInclVatCents") THEN
      RAISE EXCEPTION 'v2 credit note requires completed full refund and original v2 invoice';
    END IF;
    END IF;
    IF EXISTS (SELECT 1 FROM "FinancialInvoiceLine" WHERE "invoiceId" = target_id AND ("unitPriceExclVatCents" > 0 OR "discountAmountCents" > 0 OR "vatAmountCents" > 0))
      OR EXISTS (SELECT 1 FROM "FinancialInvoiceVatSummary" WHERE "invoiceId" = target_id AND ("taxableAmountExclVatCents" > 0 OR "vatAmountCents" > 0)) THEN
      RAISE EXCEPTION 'credit note lines must remain nonpositive';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE CONSTRAINT TRIGGER "FinancialInvoice_document_sign" AFTER INSERT ON "FinancialInvoice"
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION "financial_validate_document_sign"();
CREATE CONSTRAINT TRIGGER "FinancialInvoiceLine_document_sign" AFTER INSERT ON "FinancialInvoiceLine"
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION "financial_validate_document_sign"();
CREATE CONSTRAINT TRIGGER "FinancialInvoiceVatSummary_document_sign" AFTER INSERT ON "FinancialInvoiceVatSummary"
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION "financial_validate_document_sign"();
