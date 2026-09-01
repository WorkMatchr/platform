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
  ) l FULL JOIN (
    SELECT s."vatRateBps", s."taxableAmountExclVatCents", s."vatAmountCents", s."amountInclVatCents"
    FROM "FinancialInvoiceVatSummary" s WHERE s."invoiceId" = target_id
  ) s ON s."vatRateBps" = l."vatRateBps"
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
