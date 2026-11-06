-- Integration only: preserve both existing Academy and P1 Pro validators.
-- No source migration or financial data is rewritten; no trigger is disabled.
ALTER TABLE "FinancialRefund" DROP CONSTRAINT "FinancialRefund_amount_check";
ALTER TABLE "FinancialRefund" ADD CONSTRAINT "FinancialRefund_amount_check" CHECK (
 "amountCents">0 AND (
  ("purchaseId" IS NOT NULL AND "proCreditNoteId" IS NULL AND credits>=0)
  OR ("purchaseId" IS NULL AND "proCreditNoteId" IS NOT NULL AND "legalDecisionId" IS NULL AND credits=0 AND "ledgerTransactionId" IS NULL)
 ));
-- The existing Academy trigger proves that purchase-based zero-credit refunds
-- are Academy purchases and checks their exact approved amounts/authority.
CREATE OR REPLACE FUNCTION academy_refund_amount_guard() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog AS $$
DECLARE p public."FinancialPurchase"%ROWTYPE; d public."AcademyLegalRefundDecision"%ROWTYPE; used_g bigint; used_n bigint; used_v bigint; new_n bigint; new_v bigint;
BEGIN
 -- A Pro refund has no purchase. Its immutable credit source is validated by
 -- FinancialRefund_pro_source_valid and the deferred Pro credit authorization.
 IF TG_OP <> 'DELETE' AND NEW."proCreditNoteId" IS NOT NULL THEN
   IF NEW."purchaseId" IS NOT NULL OR NEW."legalDecisionId" IS NOT NULL OR NEW.credits <> 0 THEN
     RAISE EXCEPTION 'PRO_REFUND_CREDIT_MISMATCH';
   END IF;
   RETURN NEW;
 END IF;
 IF TG_OP='DELETE' AND OLD."proCreditNoteId" IS NOT NULL THEN
   RAISE EXCEPTION 'PRO_REFUND_HISTORY_IMMUTABLE';
 END IF;
 IF TG_OP='UPDATE'  AND OLD."purchaseId" IS DISTINCT FROM NEW."purchaseId" AND EXISTS(SELECT 1 FROM public."FinancialPurchase" WHERE id=OLD."purchaseId" AND kind::text='ACADEMY_COURSE') THEN RAISE EXCEPTION 'ACADEMY_REFUND_HISTORY_IMMUTABLE'; END IF;
 SELECT * INTO STRICT p FROM public."FinancialPurchase" WHERE id=CASE WHEN TG_OP='DELETE' THEN OLD."purchaseId" ELSE NEW."purchaseId" END FOR UPDATE;
 IF p.kind::text<>'ACADEMY_COURSE' THEN
   IF TG_OP='INSERT' AND (NEW.credits<=0 OR NEW."legalDecisionId" IS NOT NULL) THEN RAISE EXCEPTION 'FINANCIAL_REFUND_CREDIT_CONTEXT_REQUIRED'; END IF;
   IF TG_OP='UPDATE' AND NEW."legalDecisionId" IS NOT NULL THEN RAISE EXCEPTION 'FINANCIAL_REFUND_CREDIT_CONTEXT_REQUIRED'; END IF;
   IF TG_OP='DELETE' THEN RETURN OLD; END IF; RETURN NEW;
 END IF;
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'ACADEMY_REFUND_HISTORY_IMMUTABLE'; END IF;
 IF TG_OP='UPDATE' AND (
   (to_jsonb(NEW)-ARRAY['status','mollieRefundId','completedAt']) IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['status','mollieRefundId','completedAt'])
   OR (OLD.status::text IN ('REFUNDED','FAILED','CANCELED') AND NEW IS DISTINCT FROM OLD)
   OR (OLD."mollieRefundId" IS NOT NULL AND NEW."mollieRefundId" IS DISTINCT FROM OLD."mollieRefundId"))
 THEN RAISE EXCEPTION 'ACADEMY_REFUND_HISTORY_IMMUTABLE'; END IF;
 IF NEW.credits<>0 THEN RAISE EXCEPTION 'FINANCIAL_REFUND_CREDIT_CONTEXT_REQUIRED'; END IF;
 IF NEW."legalDecisionId" IS NULL THEN
   IF NEW."amountCents"<>p."amountInclVatCents" THEN RAISE EXCEPTION 'ACADEMY_FULL_REFUND_REQUIRED'; END IF;
   new_n=p."amountExclVatCents"; new_v=p."vatAmountCents";
 ELSE
   SELECT * INTO STRICT d FROM public."AcademyLegalRefundDecision" WHERE id=NEW."legalDecisionId";
   IF p."pricingMode"::text<>'ACADEMY_SANDBOX' OR d."purchaseId"<>p.id OR d."approvedByUserId"<>NEW."approvedByUserId" OR d."amountInclVatCents"<>NEW."amountCents" OR d.reason<>NEW.reason
      OR NEW."idempotencyKey"<>'academy-legal-refund:'||d.id::text OR NEW.status::text NOT IN ('PENDING','REFUNDED','FAILED','CANCELED') OR (TG_OP='INSERT' AND NEW.status::text<>'PENDING')
   THEN RAISE EXCEPTION 'ACADEMY_LEGAL_REFUND_DECISION_MISMATCH'; END IF;
   new_n=d."amountExclVatCents"; new_v=d."vatAmountCents";
 END IF;
 IF NEW.status::text IN ('PENDING','REFUNDED') THEN
   SELECT coalesce(sum(r."amountCents"),0),coalesce(sum(coalesce(a."amountExclVatCents",p."amountExclVatCents")),0),coalesce(sum(coalesce(a."vatAmountCents",p."vatAmountCents")),0)
   INTO used_g,used_n,used_v FROM public."FinancialRefund" r LEFT JOIN public."AcademyLegalRefundDecision" a ON a.id=r."legalDecisionId" WHERE r."purchaseId"=p.id AND r.id<>NEW.id AND r.status::text IN ('PENDING','REFUNDED');
   IF used_g+NEW."amountCents">p."amountInclVatCents" OR used_n+new_n>p."amountExclVatCents" OR used_v+new_v>p."vatAmountCents" THEN RAISE EXCEPTION 'ACADEMY_REFUND_CAP_EXCEEDED'; END IF;
 END IF;
 RETURN NEW;
END $$;

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
    IF doc."snapshotVersion" = 2 AND doc."proCreditKey" IS NULL THEN
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

-- Compliance's earlier binding constraint omitted the existing Academy kind.
-- Preserve organization requirements for B2B products and the sandbox-only Academy boundary.
ALTER TABLE "FinancialPurchase" DROP CONSTRAINT "FinancialPurchase_kind_credits_check";
ALTER TABLE "FinancialPurchase" ADD CONSTRAINT "FinancialPurchase_kind_credits_check" CHECK (
 (kind::text='CREDIT_PACKAGE' AND credits>0 AND "organizationId" IS NOT NULL AND "complianceRunId" IS NULL)
 OR (kind::text='PRO_SUBSCRIPTION' AND credits=0 AND "organizationId" IS NOT NULL AND "complianceRunId" IS NULL)
 OR (kind::text='ACADEMY_COURSE' AND credits=0 AND "pricingMode"::text='ACADEMY_SANDBOX' AND "complianceRunId" IS NULL AND "creditedTransactionId" IS NULL)
 OR (kind::text='COMPLIANCE_SCAN' AND credits=0 AND "organizationId" IS NOT NULL AND "complianceRunId" IS NOT NULL AND "creditedTransactionId" IS NULL)
);
