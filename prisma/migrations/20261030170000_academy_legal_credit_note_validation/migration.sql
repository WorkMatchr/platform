-- Forward-only correction after real commit acceptance exposed the deferred full-refund guard.
-- Ordinary invoice/full-credit rules and deferred totals/VAT validators remain active.
CREATE OR REPLACE FUNCTION "financial_validate_document_sign"() RETURNS trigger SECURITY INVOKER SET search_path=pg_catalog AS $$
DECLARE target_id UUID; doc public."FinancialInvoice"%ROWTYPE; original public."FinancialInvoice"%ROWTYPE; decision public."AcademyLegalRefundDecision"%ROWTYPE;
BEGIN
  IF TG_TABLE_NAME = 'FinancialInvoice' THEN target_id := NEW."id"; ELSE target_id := NEW."invoiceId"; END IF;
  SELECT * INTO doc FROM public."FinancialInvoice" WHERE "id" = target_id;
  IF doc."documentType" = 'INVOICE' THEN
    IF EXISTS (SELECT 1 FROM public."FinancialInvoiceLine" WHERE "invoiceId" = target_id AND ("unitPriceExclVatCents" < 0 OR "discountAmountCents" < 0 OR "vatAmountCents" < 0))
      OR EXISTS (SELECT 1 FROM public."FinancialInvoiceVatSummary" WHERE "invoiceId" = target_id AND ("taxableAmountExclVatCents" < 0 OR "vatAmountCents" < 0)) THEN
      RAISE EXCEPTION 'invoice lines must remain nonnegative';
    END IF;
  ELSE
    IF doc."snapshotVersion" = 2 THEN
    SELECT * INTO original FROM public."FinancialInvoice" WHERE "id" = doc."originalInvoiceId";
    IF NOT FOUND THEN RAISE EXCEPTION 'original invoice required'; END IF;
    SELECT d.* INTO decision FROM public."AcademyLegalRefundDecision" d JOIN public."FinancialRefund" r ON r."legalDecisionId"=d.id WHERE r.id=doc."refundId";
    IF FOUND THEN
      IF doc."pricingMode"::text<>'ACADEMY_SANDBOX' OR original."pricingMode"::text<>'ACADEMY_SANDBOX'
        OR original."snapshotVersion"<>2 OR original."documentType"::text<>'INVOICE'
        OR doc."organizationId" IS DISTINCT FROM original."organizationId" OR doc.currency IS DISTINCT FROM original.currency
        OR doc."amountExclVatCents"<>-decision."amountExclVatCents" OR doc."vatAmountCents"<>-decision."vatAmountCents" OR doc."amountInclVatCents"<>-decision."amountInclVatCents"
        OR NOT EXISTS(SELECT 1 FROM public."FinancialRefund" r JOIN public."FinancialPurchase" p ON p.id=r."purchaseId"
          WHERE r.id=doc."refundId" AND r.status::text='REFUNDED' AND r."purchaseId"=original."purchaseId" AND r."purchaseId"=decision."purchaseId"
          AND p.kind::text='ACADEMY_COURSE' AND p."pricingMode"::text='ACADEMY_SANDBOX' AND r."amountCents"=decision."amountInclVatCents")
      THEN RAISE EXCEPTION 'v2 legal credit note requires approved completed sandbox refund'; END IF;
    ELSE
    IF original."snapshotVersion" <> 2 OR original."documentType" <> 'INVOICE'
      OR doc."organizationId" <> original."organizationId" OR doc."currency" <> original."currency"
      OR doc."amountExclVatCents"::bigint <> -original."amountExclVatCents"::bigint
      OR doc."vatAmountCents"::bigint <> -original."vatAmountCents"::bigint
      OR doc."amountInclVatCents"::bigint <> -original."amountInclVatCents"::bigint
      OR NOT EXISTS (SELECT 1 FROM public."FinancialRefund" r WHERE r."id" = doc."refundId" AND r."status" = 'REFUNDED'
        AND r."purchaseId" = original."purchaseId" AND r."amountCents" = original."amountInclVatCents") THEN
      RAISE EXCEPTION 'v2 credit note requires completed full refund and original v2 invoice';
    END IF;
    END IF;
    END IF;
    IF EXISTS (SELECT 1 FROM public."FinancialInvoiceLine" WHERE "invoiceId" = target_id AND ("unitPriceExclVatCents" > 0 OR "discountAmountCents" > 0 OR "vatAmountCents" > 0))
      OR EXISTS (SELECT 1 FROM public."FinancialInvoiceVatSummary" WHERE "invoiceId" = target_id AND ("taxableAmountExclVatCents" > 0 OR "vatAmountCents" > 0)) THEN
      RAISE EXCEPTION 'credit note lines must remain nonpositive';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
