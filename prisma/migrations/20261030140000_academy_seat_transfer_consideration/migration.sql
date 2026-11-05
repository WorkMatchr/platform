-- Additive sandbox transfer consideration; no historical order/price rewrite.
CREATE TABLE "LearningAcademySeatTransfer" (
 "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(), "seatId" UUID NOT NULL,
 "purchaseId" UUID NOT NULL UNIQUE, "targetUserId" UUID NOT NULL,
 "targetEmail" VARCHAR(320) NOT NULL, "requestKey" VARCHAR(160) NOT NULL UNIQUE,
 "snapshot" JSONB NOT NULL, "appliedAt" TIMESTAMPTZ(3),
 "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "LearningAcademySeatTransfer_seatId_fkey" FOREIGN KEY ("seatId") REFERENCES "LearningAcademySeat"(id) ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "LearningAcademySeatTransfer_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "FinancialPurchase"(id) ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "LearningAcademySeatTransfer_seatId_createdAt_idx" ON "LearningAcademySeatTransfer"("seatId","createdAt");
CREATE FUNCTION public.academy_transfer_guard() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog AS $$
DECLARE s public."LearningAcademySeat"%ROWTYPE; p public."FinancialPurchase"%ROWTYPE; o public."LearningAcademyOrder"%ROWTYPE; original public."FinancialPurchase"%ROWTYPE; benefit jsonb; recovered int; expected int; qualifies boolean;
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'ACADEMY_TRANSFER_IMMUTABLE'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('academy-commerce:seat:'||NEW."seatId"::text,0));
 SELECT * INTO STRICT s FROM public."LearningAcademySeat" WHERE id=NEW."seatId";
 SELECT * INTO STRICT p FROM public."FinancialPurchase" WHERE id=NEW."purchaseId";
 IF p.kind::text<>'ACADEMY_COURSE' OR p."pricingMode"::text<>'ACADEMY_SANDBOX'
 OR p."amountInclVatCents" IS DISTINCT FROM (NEW.snapshot->>'amountInclVatCents')::int
 OR p."vatRateBps" IS DISTINCT FROM (NEW.snapshot->>'vatRateBps')::int
 OR NOT EXISTS(SELECT 1 FROM public."User" u WHERE u.id=NEW."targetUserId" AND u.status::text='ACTIVE' AND u."emailVerified" AND lower(u.email)=NEW."targetEmail")
 THEN RAISE EXCEPTION 'ACADEMY_TRANSFER_CONTEXT_INVALID'; END IF;
 IF TG_OP='INSERT' THEN
  SELECT * INTO STRICT o FROM public."LearningAcademyOrder" WHERE id=s."orderId";
  SELECT * INTO STRICT original FROM public."FinancialPurchase" WHERE id=o."purchaseId";
  SELECT value INTO benefit FROM jsonb_array_elements(COALESCE(o."benefitProof"->'participants','[]'::jsonb)) WHERE (value->>'position')::int=s.position;
  SELECT COALESCE(sum(q."amountInclVatCents"),0)::int INTO recovered FROM public."LearningAcademySeatTransfer" t JOIN public."FinancialPurchase" q ON q.id=t."purchaseId" WHERE t."seatId"=s.id AND t."appliedAt" IS NOT NULL AND q.status::text='PAID';
  qualifies := benefit->>'userId'=NEW."targetUserId"::text OR EXISTS (
   SELECT 1 FROM public."LearningExamAttempt" a JOIN public."LearningExamVersion" v ON v.id=a."examVersionId" JOIN public."LearningCourseVersion" cv ON cv.id=o."courseVersionId"
   WHERE a.id::text=NEW.snapshot->>'qualifyingAttemptId' AND a."userId"=NEW."targetUserId" AND a.status::text='SUBMITTED' AND a.passed AND v."courseId"<>cv."courseId"
  );
  expected:=CASE WHEN COALESCE(qualifies,false) THEN 0 ELSE COALESCE((benefit->>'discountCents')::int,0)-recovered END;
  IF o.quantity<>5 OR original.status::text<>'PAID' OR p."organizationId" IS DISTINCT FROM original."organizationId"
   OR NEW.snapshot->'originalBenefitProof' IS DISTINCT FROM o."benefitProof"
   OR NEW.snapshot->'originalPricingSnapshot' IS DISTINCT FROM COALESCE(o."pricingSnapshot",'null'::jsonb)
   OR p."vatRateBps"<>original."vatRateBps" OR p."amountInclVatCents"<>expected OR expected<0
  THEN RAISE EXCEPTION 'ACADEMY_TRANSFER_ORIGINAL_PRICE_REQUIRED'; END IF;
  IF NEW."appliedAt" IS NOT NULL OR s.status NOT IN ('AVAILABLE','INVITED') OR s."acceptedAt" IS NOT NULL THEN RAISE EXCEPTION 'ACADEMY_TRANSFER_BEFORE_ACTIVATION_ONLY'; END IF;
  IF EXISTS(SELECT 1 FROM public."LearningAcademySeatTransfer" t JOIN public."FinancialPurchase" q ON q.id=t."purchaseId" WHERE t."seatId"=s.id AND t."appliedAt" IS NULL AND q.status::text NOT IN ('FAILED','CANCELED','EXPIRED')) THEN RAISE EXCEPTION 'ACADEMY_TRANSFER_PENDING'; END IF;
 ELSE
  IF (to_jsonb(NEW)-'appliedAt') IS DISTINCT FROM (to_jsonb(OLD)-'appliedAt') OR OLD."appliedAt" IS NOT NULL OR NEW."appliedAt" IS NULL THEN RAISE EXCEPTION 'ACADEMY_TRANSFER_IMMUTABLE'; END IF;
  IF p.status::text<>'PAID' OR s.status NOT IN ('AVAILABLE','INVITED') OR s."acceptedAt" IS NOT NULL THEN RAISE EXCEPTION 'ACADEMY_TRANSFER_PAYMENT_REQUIRED'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER "LearningAcademySeatTransfer_context" BEFORE INSERT OR UPDATE OR DELETE ON "LearningAcademySeatTransfer" FOR EACH ROW EXECUTE FUNCTION public.academy_transfer_guard();

CREATE OR REPLACE FUNCTION academy_commerce_seat_guard() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog AS $$
DECLARE o public."LearningAcademyOrder"%ROWTYPE; p public."FinancialPurchase"%ROWTYPE; e public."LearningEnrollment"%ROWTYPE; u public."User"%ROWTYPE; course_id uuid; proof jsonb;
BEGIN
  IF TG_OP='DELETE' THEN RAISE EXCEPTION 'ACADEMY_SEAT_HISTORY_IMMUTABLE'; END IF;
  SELECT * INTO STRICT o FROM public."LearningAcademyOrder" WHERE id=NEW."orderId";
  SELECT * INTO STRICT p FROM public."FinancialPurchase" WHERE id=o."purchaseId";
  IF NEW.position > o.quantity THEN RAISE EXCEPTION 'ACADEMY_SEAT_POSITION_INVALID'; END IF;
  IF TG_OP='UPDATE' AND (NEW."orderId" IS DISTINCT FROM OLD."orderId" OR NEW.position IS DISTINCT FROM OLD.position)
    THEN RAISE EXCEPTION 'ACADEMY_SEAT_IDENTITY_IMMUTABLE'; END IF;
  IF TG_OP='UPDATE' AND OLD.status IN ('ACTIVE','REVOKED') AND (
    NEW."userId" IS DISTINCT FROM OLD."userId" OR NEW."enrollmentId" IS DISTINCT FROM OLD."enrollmentId"
    OR NEW."acceptedAt" IS DISTINCT FROM OLD."acceptedAt" OR NEW."acceptedTermsVersion" IS DISTINCT FROM OLD."acceptedTermsVersion"
    OR NEW."invitedEmail" IS DISTINCT FROM OLD."invitedEmail" OR (OLD.status='REVOKED' AND NEW.status <> 'REVOKED')
    OR NEW.status NOT IN ('ACTIVE','REVOKED')) THEN RAISE EXCEPTION 'ACADEMY_ACCEPTED_SEAT_IMMUTABLE'; END IF;
  IF NEW.status IN ('INVITED','ACTIVE') AND p.status::text <> 'PAID' THEN RAISE EXCEPTION 'ACADEMY_CONFIRMED_PAYMENT_REQUIRED'; END IF;
  IF TG_OP='UPDATE' AND OLD.status IN ('AVAILABLE','INVITED') AND (NEW.status='ACTIVE' OR NEW."invitedEmail" IS DISTINCT FROM OLD."invitedEmail") AND EXISTS (
    SELECT 1 FROM public."LearningAcademySeatTransfer" t JOIN public."FinancialPurchase" q ON q.id=t."purchaseId" WHERE t."seatId"=NEW.id AND t."appliedAt" IS NULL AND q.status::text NOT IN ('FAILED','CANCELED','EXPIRED')
  ) THEN RAISE EXCEPTION 'ACADEMY_TRANSFER_PENDING'; END IF;
  IF NEW.status='ACTIVE' THEN
    SELECT * INTO STRICT e FROM public."LearningEnrollment" WHERE id=NEW."enrollmentId";
    SELECT * INTO STRICT u FROM public."User" WHERE id=NEW."userId";
    SELECT "courseId" INTO STRICT course_id FROM public."LearningCourseVersion" WHERE id=o."courseVersionId";
    PERFORM pg_advisory_xact_lock(hashtextextended('academy-commerce:access:' || u.id::text || ':' || course_id::text,0));
    IF e."userId" <> u.id OR e."courseVersionId" <> o."courseVersionId" OR u.status::text <> 'ACTIVE' OR NOT u."emailVerified"
      OR (o.quantity=1 AND u.id<>o."buyerUserId") OR (o.quantity=5 AND lower(u.email) IS DISTINCT FROM NEW."invitedEmail")
      THEN RAISE EXCEPTION 'ACADEMY_PARTICIPANT_MISMATCH'; END IF;
    IF EXISTS (SELECT 1 FROM public."LearningAcademySeat" s JOIN public."LearningAcademyOrder" x ON x.id=s."orderId" JOIN public."LearningCourseVersion" v ON v.id=x."courseVersionId" WHERE s.id<>NEW.id AND s.status='ACTIVE' AND s."userId"=u.id AND v."courseId"=course_id)
      THEN RAISE EXCEPTION 'ACADEMY_DUPLICATE_PARTICIPANT'; END IF;
    SELECT value INTO proof FROM jsonb_array_elements(COALESCE(o."benefitProof"->'participants','[]'::jsonb)) WHERE (value->>'position')::int=NEW.position;
    IF (COALESCE((proof->>'discountCents')::int,0)>0 OR COALESCE((proof->>'identityLocked')::boolean,false)) AND proof->>'userId' IS DISTINCT FROM u.id::text AND NOT EXISTS (
      SELECT 1 FROM public."LearningAcademySeatTransfer" t JOIN public."FinancialPurchase" q ON q.id=t."purchaseId"
      WHERE t."seatId"=NEW.id AND t."targetUserId"=u.id AND t."targetEmail"=NEW."invitedEmail" AND t."appliedAt" IS NOT NULL AND q.status::text='PAID'
    )
      THEN RAISE EXCEPTION 'ACADEMY_BENEFIT_IDENTITY_MISMATCH'; END IF;
  END IF;
  RETURN NEW;
END $$;
