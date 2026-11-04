-- AlterEnum
ALTER TYPE "FinancialPurchaseKind" ADD VALUE 'ACADEMY_COURSE';

-- AlterEnum
ALTER TYPE "FinancialPricingMode" ADD VALUE 'ACADEMY_SANDBOX';

-- AlterTable
ALTER TABLE "FinancialPurchase" ALTER COLUMN "organizationId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "FinancialInvoice" ALTER COLUMN "organizationId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "LearningEnrollment" ADD COLUMN     "accessRevocationReason" VARCHAR(80),
ADD COLUMN     "accessRevokedAt" TIMESTAMPTZ(3);

-- CreateTable
CREATE TABLE "LearningAcademyOrder" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "purchaseId" UUID NOT NULL,
    "buyerUserId" UUID NOT NULL,
    "courseVersionId" UUID NOT NULL,
    "buyerType" VARCHAR(20) NOT NULL,
    "quantity" INTEGER NOT NULL,
    "pricingPolicyVersion" VARCHAR(80) NOT NULL,
    "benefitProof" JSONB NOT NULL,
    "legalAgreement" JSONB NOT NULL,
    "agreedAt" TIMESTAMPTZ(3) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LearningAcademyOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LearningAcademySeat" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "orderId" UUID NOT NULL,
    "position" INTEGER NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'AVAILABLE',
    "invitedEmail" VARCHAR(320),
    "invitedAt" TIMESTAMPTZ(3),
    "inviteExpiresAt" TIMESTAMPTZ(3),
    "userId" UUID,
    "enrollmentId" UUID,
    "acceptedAt" TIMESTAMPTZ(3),
    "acceptedTermsVersion" VARCHAR(80),
    "revokedAt" TIMESTAMPTZ(3),

    CONSTRAINT "LearningAcademySeat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LearningAcademySeatEvent" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "seatId" UUID NOT NULL,
    "actorUserId" UUID NOT NULL,
    "action" VARCHAR(80) NOT NULL,
    "metadata" JSONB NOT NULL,
    "occurredAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LearningAcademySeatEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LearningAcademyOrder_purchaseId_key" ON "LearningAcademyOrder"("purchaseId");

-- CreateIndex
CREATE INDEX "LearningAcademyOrder_buyerUserId_createdAt_idx" ON "LearningAcademyOrder"("buyerUserId", "createdAt");

-- CreateIndex
CREATE INDEX "LearningAcademySeat_userId_status_idx" ON "LearningAcademySeat"("userId", "status");

-- CreateIndex
CREATE INDEX "LearningAcademySeat_enrollmentId_idx" ON "LearningAcademySeat"("enrollmentId");

-- CreateIndex
CREATE UNIQUE INDEX "LearningAcademySeat_orderId_position_key" ON "LearningAcademySeat"("orderId", "position");

-- CreateIndex
CREATE INDEX "LearningAcademySeatEvent_seatId_occurredAt_idx" ON "LearningAcademySeatEvent"("seatId", "occurredAt");

-- AddForeignKey
ALTER TABLE "LearningAcademyOrder" ADD CONSTRAINT "LearningAcademyOrder_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "FinancialPurchase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningAcademyOrder" ADD CONSTRAINT "LearningAcademyOrder_buyerUserId_fkey" FOREIGN KEY ("buyerUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningAcademyOrder" ADD CONSTRAINT "LearningAcademyOrder_courseVersionId_fkey" FOREIGN KEY ("courseVersionId") REFERENCES "LearningCourseVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningAcademySeat" ADD CONSTRAINT "LearningAcademySeat_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "LearningAcademyOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningAcademySeat" ADD CONSTRAINT "LearningAcademySeat_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningAcademySeat" ADD CONSTRAINT "LearningAcademySeat_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "LearningEnrollment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningAcademySeatEvent" ADD CONSTRAINT "LearningAcademySeatEvent_seatId_fkey" FOREIGN KEY ("seatId") REFERENCES "LearningAcademySeat"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningAcademySeatEvent" ADD CONSTRAINT "LearningAcademySeatEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Preserve legacy organization/credit contracts; only Academy supports private buyers.
ALTER TABLE "FinancialPurchase" DROP CONSTRAINT "FinancialPurchase_kind_credits_check";
ALTER TABLE "FinancialPurchase" ADD CONSTRAINT "FinancialPurchase_kind_credits_check" CHECK (
  ("kind"::text = 'CREDIT_PACKAGE' AND "credits" > 0 AND "organizationId" IS NOT NULL)
  OR ("kind"::text = 'PRO_SUBSCRIPTION' AND "credits" = 0 AND "organizationId" IS NOT NULL)
  OR ("kind"::text = 'ACADEMY_COURSE' AND "credits" = 0 AND "pricingMode"::text = 'ACADEMY_SANDBOX')
);
ALTER TABLE "FinancialRefund" DROP CONSTRAINT "FinancialRefund_amount_check";
ALTER TABLE "FinancialRefund" ADD CONSTRAINT "FinancialRefund_amount_check" CHECK ("amountCents" > 0 AND "credits" >= 0);
ALTER TABLE "LearningAcademyOrder" ADD CONSTRAINT "LearningAcademyOrder_values_check" CHECK (
  "quantity" IN (1,5) AND "buyerType" IN ('CONSUMER','BUSINESS') AND ("buyerType" <> 'CONSUMER' OR "quantity" = 1)
  AND "legalAgreement" @> '{"platformTermsAccepted":true,"academyTermsAccepted":true,"status":"DRAFT_TEST_ONLY"}'::jsonb
);
ALTER TABLE "LearningAcademySeat" ADD CONSTRAINT "LearningAcademySeat_values_check" CHECK (
  "position" BETWEEN 1 AND 5 AND "status" IN ('AVAILABLE','INVITED','ACTIVE','REVOKED')
  AND ("status" <> 'INVITED' OR ("invitedEmail" IS NOT NULL AND "invitedAt" IS NOT NULL AND "inviteExpiresAt" > "invitedAt"))
  AND ("status" <> 'ACTIVE' OR ("userId" IS NOT NULL AND "enrollmentId" IS NOT NULL AND "acceptedAt" IS NOT NULL AND "acceptedTermsVersion" IS NOT NULL))
  AND ("status" <> 'REVOKED' OR "revokedAt" IS NOT NULL)
  AND ("invitedEmail" IS NULL OR "invitedEmail" = lower(btrim("invitedEmail")))
);
CREATE UNIQUE INDEX "LearningAcademySeat_one_active_enrollment" ON "LearningAcademySeat" ("enrollmentId") WHERE "status"='ACTIVE';
CREATE UNIQUE INDEX "LearningAcademySeat_distinct_invitees" ON "LearningAcademySeat" ("orderId","invitedEmail") WHERE "status" <> 'REVOKED' AND "invitedEmail" IS NOT NULL;
CREATE UNIQUE INDEX "FinancialRefund_one_academy_full_refund" ON "FinancialRefund" ("purchaseId") WHERE "credits"=0;

CREATE FUNCTION academy_commerce_order_guard() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog AS $$
DECLARE p public."FinancialPurchase"%ROWTYPE; v public."LearningCourseVersion"%ROWTYPE;
BEGIN
  SELECT * INTO STRICT p FROM public."FinancialPurchase" WHERE id=NEW."purchaseId";
  SELECT * INTO STRICT v FROM public."LearningCourseVersion" WHERE id=NEW."courseVersionId";
  IF p.kind::text <> 'ACADEMY_COURSE' OR p."createdByUserId" <> NEW."buyerUserId" OR p.credits <> 0
    OR p."pricingMode"::text <> 'ACADEMY_SANDBOX' OR v.status::text <> 'PUBLISHED'
    OR (NEW."buyerType"='CONSUMER' AND p."organizationId" IS NOT NULL)
    OR (NEW."buyerType"='BUSINESS' AND p."organizationId" IS NULL)
  THEN RAISE EXCEPTION 'ACADEMY_ORDER_CONTEXT_INVALID'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "LearningAcademyOrder_context" BEFORE INSERT ON "LearningAcademyOrder" FOR EACH ROW EXECUTE FUNCTION academy_commerce_order_guard();
CREATE TRIGGER "LearningAcademyOrder_immutable" BEFORE UPDATE OR DELETE ON "LearningAcademyOrder" FOR EACH ROW EXECUTE FUNCTION financial_immutable_record();
CREATE TRIGGER "LearningAcademySeatEvent_immutable" BEFORE UPDATE OR DELETE ON "LearningAcademySeatEvent" FOR EACH ROW EXECUTE FUNCTION financial_immutable_record();

CREATE FUNCTION academy_commerce_seat_guard() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog AS $$
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
    IF COALESCE((proof->>'discountCents')::int,0)>0 AND proof->>'userId' IS DISTINCT FROM u.id::text
      THEN RAISE EXCEPTION 'ACADEMY_BENEFIT_IDENTITY_MISMATCH'; END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "LearningAcademySeat_context" BEFORE INSERT OR UPDATE OR DELETE ON "LearningAcademySeat" FOR EACH ROW EXECUTE FUNCTION academy_commerce_seat_guard();

CREATE FUNCTION academy_commerce_seat_count() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog AS $$
DECLARE target uuid; expected int; actual int;
BEGIN
  IF TG_TABLE_NAME='LearningAcademyOrder' THEN target:=NEW.id; ELSE target:=NEW."orderId"; END IF;
  SELECT quantity INTO STRICT expected FROM public."LearningAcademyOrder" WHERE id=target;
  SELECT count(*) INTO actual FROM public."LearningAcademySeat" WHERE "orderId"=target;
  IF actual<>expected THEN RAISE EXCEPTION 'ACADEMY_EXACT_SEAT_COUNT_REQUIRED'; END IF;
  RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER "LearningAcademyOrder_seat_count" AFTER INSERT ON "LearningAcademyOrder" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION academy_commerce_seat_count();
CREATE CONSTRAINT TRIGGER "LearningAcademySeat_seat_count" AFTER INSERT ON "LearningAcademySeat" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION academy_commerce_seat_count();

CREATE FUNCTION academy_financial_context_guard() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog AS $$
DECLARE source_purchase public."FinancialPurchase"%ROWTYPE; original_id uuid;
BEGIN
  IF TG_TABLE_NAME='FinancialRefund' THEN
    SELECT * INTO STRICT source_purchase FROM public."FinancialPurchase" WHERE id=NEW."purchaseId";
    IF (source_purchase.kind::text='ACADEMY_COURSE' AND (NEW.credits<>0 OR NEW."amountCents"<>source_purchase."amountInclVatCents"))
      OR (source_purchase.kind::text<>'ACADEMY_COURSE' AND NEW.credits<=0)
      THEN RAISE EXCEPTION 'FINANCIAL_REFUND_CREDIT_CONTEXT_REQUIRED'; END IF;
  ELSE
    IF NEW."purchaseId" IS NOT NULL THEN SELECT * INTO STRICT source_purchase FROM public."FinancialPurchase" WHERE id=NEW."purchaseId";
    ELSIF NEW."refundId" IS NOT NULL THEN SELECT p.* INTO STRICT source_purchase FROM public."FinancialPurchase" p JOIN public."FinancialRefund" r ON r."purchaseId"=p.id WHERE r.id=NEW."refundId";
    ELSE IF NEW."organizationId" IS NULL THEN RAISE EXCEPTION 'FINANCIAL_ORGANIZATION_REQUIRED'; END IF; RETURN NEW; END IF;
    IF NEW."refundId" IS NOT NULL THEN
      SELECT id INTO STRICT original_id FROM public."FinancialInvoice" WHERE "purchaseId"=source_purchase.id;
      IF NEW."originalInvoiceId" IS DISTINCT FROM original_id THEN RAISE EXCEPTION 'ACADEMY_CREDIT_NOTE_SOURCE_MISMATCH'; END IF;
    END IF;
    IF NEW."organizationId" IS DISTINCT FROM source_purchase."organizationId"
      OR (NEW."organizationId" IS NULL AND source_purchase.kind::text<>'ACADEMY_COURSE')
      OR NEW."pricingMode" IS DISTINCT FROM source_purchase."pricingMode"
      THEN RAISE EXCEPTION 'FINANCIAL_BUYER_CONTEXT_MISMATCH'; END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "FinancialRefund_academy_context" BEFORE INSERT ON "FinancialRefund" FOR EACH ROW EXECUTE FUNCTION academy_financial_context_guard();
CREATE TRIGGER "FinancialInvoice_academy_context" BEFORE INSERT ON "FinancialInvoice" FOR EACH ROW EXECUTE FUNCTION academy_financial_context_guard();
