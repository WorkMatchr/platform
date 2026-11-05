-- D09: explicitly approved sandbox legal decisions; original migrations remain untouched.
CREATE TABLE "AcademyLegalRefundDecision" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "purchaseId" uuid NOT NULL REFERENCES "FinancialPurchase"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "approvedByUserId" uuid NOT NULL REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "requestKey" uuid NOT NULL UNIQUE,
  "reason" varchar(500) NOT NULL CHECK (length(btrim("reason")) BETWEEN 10 AND 500),
  "amountInclVatCents" integer NOT NULL CHECK ("amountInclVatCents">0),
  "amountExclVatCents" integer NOT NULL CHECK ("amountExclVatCents">=0),
  "vatAmountCents" integer NOT NULL CHECK ("vatAmountCents">=0),
  "seatIds" uuid[] NOT NULL,
  "sourceSnapshot" jsonb NOT NULL,
  "createdAt" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK ("amountInclVatCents"="amountExclVatCents"+"vatAmountCents")
);
CREATE INDEX "AcademyLegalRefundDecision_purchaseId_createdAt_idx" ON "AcademyLegalRefundDecision"("purchaseId","createdAt");
ALTER TABLE "FinancialRefund" ADD COLUMN "legalDecisionId" uuid;
ALTER TABLE "FinancialRefund" ADD CONSTRAINT "FinancialRefund_legalDecisionId_fkey" FOREIGN KEY ("legalDecisionId") REFERENCES "AcademyLegalRefundDecision"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE UNIQUE INDEX "FinancialRefund_legalDecisionId_key" ON "FinancialRefund"("legalDecisionId");
DROP INDEX "FinancialRefund_one_academy_full_refund";
CREATE UNIQUE INDEX "FinancialRefund_one_academy_full_refund" ON "FinancialRefund"("purchaseId") WHERE credits=0 AND "legalDecisionId" IS NULL;

CREATE FUNCTION academy_legal_refund_decision_guard() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog AS $$
DECLARE p public."FinancialPurchase"%ROWTYPE; used_g bigint; used_n bigint; used_v bigint; expected_n bigint;
BEGIN
 IF TG_OP<>'INSERT' THEN RAISE EXCEPTION 'ACADEMY_LEGAL_DECISION_IMMUTABLE'; END IF;
 SELECT * INTO STRICT p FROM public."FinancialPurchase" WHERE id=NEW."purchaseId" FOR UPDATE;
 IF p.kind::text<>'ACADEMY_COURSE' OR p."pricingMode"::text<>'ACADEMY_SANDBOX' OR p.status::text NOT IN ('PAID','REFUND_REVIEW_REQUIRED') OR p."molliePaymentId" IS NULL
   OR NOT EXISTS(SELECT 1 FROM public."LearningAcademyOrder" WHERE "purchaseId"=p.id)
   OR NOT EXISTS(SELECT 1 FROM public."FinancialInvoice" WHERE "purchaseId"=p.id AND "snapshotVersion"=2)
 THEN RAISE EXCEPTION 'ACADEMY_LEGAL_REFUND_SANDBOX_PURCHASE_REQUIRED'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public."User" u JOIN public."OrganizationMembership" m ON m."userId"=u.id JOIN public."Organization" o ON o.id=m."organizationId"
   WHERE u.id=NEW."approvedByUserId" AND u.status::text='ACTIVE' AND u."platformRole"::text='ADMIN' AND m.status::text='ACTIVE' AND m.role::text IN ('OWNER','ADMIN') AND o.status::text='ACTIVE' AND o."systemKey"='WORKMATCHR_PLATFORM')
 THEN RAISE EXCEPTION 'ACADEMY_LEGAL_REFUND_AUTHORIZATION_REQUIRED'; END IF;
 IF cardinality(NEW."seatIds")<>(SELECT count(DISTINCT id) FROM unnest(NEW."seatIds") id)
   OR EXISTS(SELECT 1 FROM unnest(NEW."seatIds") AS chosen(seat_id) WHERE NOT EXISTS(SELECT 1 FROM public."LearningAcademySeat" s JOIN public."LearningAcademyOrder" o ON o.id=s."orderId" WHERE s.id=chosen.seat_id AND o."purchaseId"=p.id))
 THEN RAISE EXCEPTION 'ACADEMY_LEGAL_REFUND_SEAT_MISMATCH'; END IF;
 SELECT coalesce(sum(r."amountCents"),0),coalesce(sum(coalesce(d."amountExclVatCents",p."amountExclVatCents")),0),coalesce(sum(coalesce(d."vatAmountCents",p."vatAmountCents")),0)
 INTO used_g,used_n,used_v FROM public."FinancialRefund" r LEFT JOIN public."AcademyLegalRefundDecision" d ON d.id=r."legalDecisionId" WHERE r."purchaseId"=p.id AND r.status::text IN ('PENDING','REFUNDED');
 IF NEW."amountInclVatCents">p."amountInclVatCents"-used_g THEN RAISE EXCEPTION 'ACADEMY_REFUND_CAP_EXCEEDED'; END IF;
 expected_n=round(NEW."amountInclVatCents"::numeric*(p."amountExclVatCents"-used_n)/(p."amountInclVatCents"-used_g));
 IF NEW."amountExclVatCents"<>expected_n OR NEW."vatAmountCents"<>NEW."amountInclVatCents"-expected_n
 OR NEW."sourceSnapshot" IS DISTINCT FROM jsonb_build_object('allocationVersion','ORIGINAL_REMAINING_HALF_UP_V1','taxReview','TAX REVIEW REQUIRED','gross',p."amountInclVatCents",'net',p."amountExclVatCents",'vat',p."vatAmountCents",'vatRateBps',p."vatRateBps",'reservedGross',used_g,'reservedNet',used_n,'reservedVat',used_v)
 THEN RAISE EXCEPTION 'ACADEMY_LEGAL_REFUND_ALLOCATION_MISMATCH'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER "AcademyLegalRefundDecision_guard" BEFORE INSERT OR UPDATE OR DELETE ON "AcademyLegalRefundDecision" FOR EACH ROW EXECUTE FUNCTION academy_legal_refund_decision_guard();

-- Replace only the refund trigger. The original invoice context guard remains unchanged.
DROP TRIGGER "FinancialRefund_academy_context" ON "FinancialRefund";
CREATE FUNCTION academy_refund_amount_guard() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog AS $$
DECLARE p public."FinancialPurchase"%ROWTYPE; d public."AcademyLegalRefundDecision"%ROWTYPE; used_g bigint; used_n bigint; used_v bigint; new_n bigint; new_v bigint;
BEGIN
 IF TG_OP='UPDATE' AND OLD."purchaseId" IS DISTINCT FROM NEW."purchaseId" AND EXISTS(SELECT 1 FROM public."FinancialPurchase" WHERE id=OLD."purchaseId" AND kind::text='ACADEMY_COURSE') THEN RAISE EXCEPTION 'ACADEMY_REFUND_HISTORY_IMMUTABLE'; END IF;
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
CREATE TRIGGER "FinancialRefund_academy_context" BEFORE INSERT OR UPDATE OR DELETE ON "FinancialRefund" FOR EACH ROW EXECUTE FUNCTION academy_refund_amount_guard();

CREATE FUNCTION academy_legal_credit_note_guard() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog AS $$
DECLARE d public."AcademyLegalRefundDecision"%ROWTYPE;
BEGIN
 IF EXISTS(SELECT 1 FROM public."FinancialRefund" WHERE id=NEW."refundId" AND "legalDecisionId" IS NOT NULL AND status::text<>'REFUNDED') THEN RAISE EXCEPTION 'COMPLETED_REFUND_REQUIRED'; END IF;
 SELECT a.* INTO d FROM public."AcademyLegalRefundDecision" a JOIN public."FinancialRefund" r ON r."legalDecisionId"=a.id WHERE r.id=NEW."refundId" AND r.status::text='REFUNDED';
 IF FOUND AND (NEW."documentType"::text<>'CREDIT_NOTE' OR NEW."pricingMode"::text<>'ACADEMY_SANDBOX' OR NEW."amountInclVatCents"<>-d."amountInclVatCents" OR NEW."amountExclVatCents"<>-d."amountExclVatCents" OR NEW."vatAmountCents"<>-d."vatAmountCents") THEN RAISE EXCEPTION 'ACADEMY_LEGAL_CREDIT_NOTE_MISMATCH'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER "FinancialInvoice_legal_refund_amounts" BEFORE INSERT ON "FinancialInvoice" FOR EACH ROW EXECUTE FUNCTION academy_legal_credit_note_guard();
