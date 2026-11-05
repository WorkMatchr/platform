-- D09/D10: append-only monetary attribution. No historical order/refund backfill.
CREATE TABLE IF NOT EXISTS "AcademyRefundSeatAllocation" (
 "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 "refundId" uuid NOT NULL REFERENCES "FinancialRefund"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 "seatId" uuid NOT NULL REFERENCES "LearningAcademySeat"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 "originalAmountCents" integer NOT NULL CHECK ("originalAmountCents">=0),
 "amountCents" integer NOT NULL CHECK ("amountCents">0 AND "amountCents"<="originalAmountCents"),
 "policyVersion" varchar(60) NOT NULL CHECK ("policyVersion"='ORIGINAL_SEAT_CONSIDERATION_V1'),
 "createdAt" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE("refundId","seatId")
);
CREATE INDEX IF NOT EXISTS "AcademyRefundSeatAllocation_seatId_createdAt_idx" ON "AcademyRefundSeatAllocation"("seatId","createdAt");

CREATE FUNCTION academy_original_seat_amount(purchase_id uuid, seat_id uuid) RETURNS integer LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog AS $$
DECLARE o public."LearningAcademyOrder"%ROWTYPE; p public."FinancialPurchase"%ROWTYPE; s public."LearningAcademySeat"%ROWTYPE;
 snap jsonb; proof jsonb; base bigint; final_g bigint; discount_g bigint; personal bigint:=0; pos integer; item jsonb; discounts bigint:=0; positions integer[]:='{}';
BEGIN
 SELECT * INTO STRICT p FROM public."FinancialPurchase" WHERE id=purchase_id;
 SELECT * INTO STRICT o FROM public."LearningAcademyOrder" WHERE "purchaseId"=p.id;
 SELECT * INTO STRICT s FROM public."LearningAcademySeat" WHERE id=seat_id AND "orderId"=o.id;
 snap=o."pricingSnapshot";proof=o."benefitProof";
 IF o.quantity NOT IN (1,5) OR snap IS NULL OR jsonb_typeof(snap)<>'object' OR (snap->>'formatVersion')::int IS DISTINCT FROM 1
   OR (snap->>'quantity')::int IS DISTINCT FROM o.quantity OR (SELECT count(*) FROM public."LearningAcademySeat" WHERE "orderId"=o.id)<>o.quantity
   OR EXISTS(SELECT 1 FROM public."LearningAcademySeat" WHERE "orderId"=o.id AND (position<1 OR position>o.quantity))
   OR coalesce(snap->'scheme'->>'kind','') NOT IN ('NONE','ALUMNI','CODE','ACCOUNT','ORGANIZATION')
 THEN RAISE EXCEPTION 'ACADEMY_ALUMNI_REFUND_REVIEW_REQUIRED'; END IF;
 base=(snap->>'originalGrossCents')::bigint;final_g=(snap->>'finalGrossCents')::bigint;discount_g=(snap->>'discountGrossCents')::bigint;
 IF base IS NULL OR final_g IS NULL OR discount_g IS NULL OR base<0 OR discount_g<0 OR final_g<0 OR base>2147483647
   OR base-discount_g<>final_g OR final_g<>p."amountInclVatCents" OR (snap->'scheme'->>'grossCents')::bigint IS DISTINCT FROM final_g
 THEN RAISE EXCEPTION 'ACADEMY_ALUMNI_REFUND_REVIEW_REQUIRED'; END IF;
 IF snap->'scheme'->>'kind'='ALUMNI' THEN
   IF proof->>'applied' IS DISTINCT FROM 'true' OR jsonb_typeof(proof->'participants') IS DISTINCT FROM 'array' OR jsonb_array_length(proof->'participants')<>o.quantity THEN RAISE EXCEPTION 'ACADEMY_ALUMNI_REFUND_REVIEW_REQUIRED'; END IF;
   FOR item IN SELECT value FROM jsonb_array_elements(proof->'participants') LOOP
     pos=(item->>'position')::int;
     IF pos IS NULL OR pos<1 OR pos>o.quantity OR pos=ANY(positions) OR item->>'discountCents' IS NULL
       OR (item->>'discountCents')::bigint<0 OR (item->>'discountCents')::bigint>base/o.quantity+(CASE WHEN pos<=base%o.quantity THEN 1 ELSE 0 END)
     THEN RAISE EXCEPTION 'ACADEMY_ALUMNI_REFUND_REVIEW_REQUIRED'; END IF;
     positions=array_append(positions,pos);discounts=discounts+(item->>'discountCents')::bigint;
     IF pos=s.position THEN personal=(item->>'discountCents')::bigint; END IF;
   END LOOP;
   IF discounts<>discount_g THEN RAISE EXCEPTION 'ACADEMY_ALUMNI_REFUND_REVIEW_REQUIRED'; END IF;
 ELSE
   IF snap->'scheme'->>'kind'='NONE' AND discount_g<>0 THEN RAISE EXCEPTION 'ACADEMY_ALUMNI_REFUND_REVIEW_REQUIRED'; END IF;
   base=final_g;
 END IF;
 RETURN (base/o.quantity+(CASE WHEN s.position<=base%o.quantity THEN 1 ELSE 0 END)-personal)::integer;
END $$;

CREATE FUNCTION academy_refund_seat_guard() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog AS $$
DECLARE r public."FinancialRefund"%ROWTYPE; p public."FinancialPurchase"%ROWTYPE; used bigint;
BEGIN
 IF TG_OP<>'INSERT' THEN RAISE EXCEPTION 'ACADEMY_REFUND_SEAT_IMMUTABLE'; END IF;
 SELECT * INTO STRICT r FROM public."FinancialRefund" WHERE id=NEW."refundId";
 SELECT * INTO STRICT p FROM public."FinancialPurchase" WHERE id=r."purchaseId" FOR UPDATE;
 IF p.kind::text<>'ACADEMY_COURSE' OR p."pricingMode"::text<>'ACADEMY_SANDBOX' OR r."legalDecisionId" IS NULL OR r.status::text<>'PENDING'
   OR NEW."originalAmountCents"<>public.academy_original_seat_amount(p.id,NEW."seatId")
 THEN RAISE EXCEPTION 'ACADEMY_REFUND_SEAT_CONTEXT_REQUIRED'; END IF;
 IF EXISTS(SELECT 1 FROM public."FinancialRefund" other WHERE other."purchaseId"=p.id AND other.id<>r.id AND other.status::text IN ('PENDING','REFUNDED')
   AND other."amountCents"<>(SELECT coalesce(sum(a."amountCents"),0) FROM public."AcademyRefundSeatAllocation" a WHERE a."refundId"=other.id))
 THEN RAISE EXCEPTION 'ACADEMY_ALUMNI_REFUND_REVIEW_REQUIRED'; END IF;
 SELECT coalesce(sum(a."amountCents"),0) INTO used FROM public."AcademyRefundSeatAllocation" a JOIN public."FinancialRefund" f ON f.id=a."refundId"
 WHERE a."seatId"=NEW."seatId" AND f.status::text IN ('PENDING','REFUNDED');
 IF used+NEW."amountCents">NEW."originalAmountCents" THEN RAISE EXCEPTION 'ACADEMY_REFUND_SEAT_CAP_EXCEEDED'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER "AcademyRefundSeatAllocation_guard" BEFORE INSERT OR UPDATE OR DELETE ON "AcademyRefundSeatAllocation" FOR EACH ROW EXECUTE FUNCTION academy_refund_seat_guard();

-- Deferred so a decision, refund and all allocations can be inserted atomically.
CREATE FUNCTION academy_refund_seat_totals() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog AS $$
DECLARE r public."FinancialRefund"%ROWTYPE; target uuid;
BEGIN
 IF TG_TABLE_NAME='FinancialRefund' THEN target=NEW.id; ELSE target=NEW."refundId"; END IF;
 SELECT * INTO STRICT r FROM public."FinancialRefund" WHERE id=target;
 IF r."legalDecisionId" IS NOT NULL AND r."amountCents"<>(SELECT coalesce(sum("amountCents"),0) FROM public."AcademyRefundSeatAllocation" WHERE "refundId"=r.id)
 THEN RAISE EXCEPTION 'ACADEMY_REFUND_SEAT_TOTAL_MISMATCH'; END IF;
 RETURN NEW;
END $$;
CREATE CONSTRAINT TRIGGER "FinancialRefund_seat_totals" AFTER INSERT OR UPDATE ON "FinancialRefund" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION academy_refund_seat_totals();
CREATE CONSTRAINT TRIGGER "AcademyRefundSeatAllocation_totals" AFTER INSERT ON "AcademyRefundSeatAllocation" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION academy_refund_seat_totals();
