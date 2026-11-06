-- AlterTable
ALTER TABLE "LearningAcademyOrder" ADD COLUMN     "priceVersionId" UUID,
ADD COLUMN     "pricingSnapshot" JSONB;

-- CreateTable
CREATE TABLE "LearningAcademyPriceVersion" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "scopeKey" VARCHAR(40) NOT NULL,
    "courseId" UUID,
    "revision" INTEGER NOT NULL,
    "individualCents" INTEGER NOT NULL,
    "fiveCents" INTEGER NOT NULL,
    "followUpIndividualCents" INTEGER NOT NULL,
    "followUpFiveCents" INTEGER NOT NULL,
    "vatRateBps" INTEGER NOT NULL,
    "vatTreatment" VARCHAR(20) NOT NULL,
    "taxStatus" VARCHAR(30) NOT NULL,
    "taxReference" VARCHAR(500) NOT NULL,
    "createdByUserId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LearningAcademyPriceVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LearningAcademyPromotion" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "revision" INTEGER NOT NULL DEFAULT 1,
    "kind" VARCHAR(20) NOT NULL,
    "label" VARCHAR(120) NOT NULL,
    "code" VARCHAR(40),
    "userId" UUID,
    "organizationId" UUID,
    "percentage" INTEGER NOT NULL,
    "courseIds" UUID[],
    "active" BOOLEAN NOT NULL DEFAULT true,
    "validFrom" TIMESTAMPTZ(3),
    "validUntil" TIMESTAMPTZ(3),
    "maximumUses" INTEGER,
    "maximumPerAccount" INTEGER,
    "quantity" INTEGER,
    "creationKey" UUID NOT NULL,
    "creationFingerprint" CHAR(64) NOT NULL,
    "createdByUserId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "LearningAcademyPromotion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LearningAcademyPromotionUse" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "promotionId" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "buyerUserId" UUID NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'RESERVED',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "committedAt" TIMESTAMPTZ(3),
    "releasedAt" TIMESTAMPTZ(3),

    CONSTRAINT "LearningAcademyPromotionUse_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LearningAcademyPriceVersion_courseId_revision_idx" ON "LearningAcademyPriceVersion"("courseId", "revision");

-- CreateIndex
CREATE UNIQUE INDEX "LearningAcademyPriceVersion_scopeKey_revision_key" ON "LearningAcademyPriceVersion"("scopeKey", "revision");

-- CreateIndex
CREATE UNIQUE INDEX "LearningAcademyPromotion_code_key" ON "LearningAcademyPromotion"("code");

-- CreateIndex
CREATE INDEX "LearningAcademyPromotion_kind_active_idx" ON "LearningAcademyPromotion"("kind", "active");

-- CreateIndex
CREATE UNIQUE INDEX "LearningAcademyPromotion_createdByUserId_creationKey_key" ON "LearningAcademyPromotion"("createdByUserId", "creationKey");

-- CreateIndex
CREATE UNIQUE INDEX "LearningAcademyPromotionUse_orderId_key" ON "LearningAcademyPromotionUse"("orderId");

-- CreateIndex
CREATE INDEX "LearningAcademyPromotionUse_promotionId_status_idx" ON "LearningAcademyPromotionUse"("promotionId", "status");

-- CreateIndex
CREATE INDEX "LearningAcademyPromotionUse_promotionId_buyerUserId_status_idx" ON "LearningAcademyPromotionUse"("promotionId", "buyerUserId", "status");

-- AddForeignKey
ALTER TABLE "LearningAcademyOrder" ADD CONSTRAINT "LearningAcademyOrder_priceVersionId_fkey" FOREIGN KEY ("priceVersionId") REFERENCES "LearningAcademyPriceVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningAcademyPriceVersion" ADD CONSTRAINT "LearningAcademyPriceVersion_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "LearningCourse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningAcademyPriceVersion" ADD CONSTRAINT "LearningAcademyPriceVersion_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningAcademyPromotion" ADD CONSTRAINT "LearningAcademyPromotion_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningAcademyPromotion" ADD CONSTRAINT "LearningAcademyPromotion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningAcademyPromotion" ADD CONSTRAINT "LearningAcademyPromotion_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningAcademyPromotionUse" ADD CONSTRAINT "LearningAcademyPromotionUse_promotionId_fkey" FOREIGN KEY ("promotionId") REFERENCES "LearningAcademyPromotion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningAcademyPromotionUse" ADD CONSTRAINT "LearningAcademyPromotionUse_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "LearningAcademyOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningAcademyPromotionUse" ADD CONSTRAINT "LearningAcademyPromotionUse_buyerUserId_fkey" FOREIGN KEY ("buyerUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Additive price/promotion policy. Existing migration checksums and orders are untouched.
ALTER TABLE "LearningAcademyPromotion" ALTER COLUMN "courseIds" SET NOT NULL;
ALTER TABLE "LearningAcademyPriceVersion" ADD CONSTRAINT "AcademyPrice_values" CHECK (
  revision>0 AND "scopeKey"=COALESCE("courseId"::text,'DEFAULT')
  AND "individualCents" BETWEEN 0 AND 2000000000 AND "fiveCents" BETWEEN 0 AND 2000000000
  AND "followUpIndividualCents" BETWEEN 0 AND "individualCents" AND "followUpFiveCents" BETWEEN 0 AND "fiveCents"
  AND "vatRateBps" IN (0,900,2100) AND "vatTreatment" IN ('TAXABLE','EXEMPT')
  AND "taxStatus" IN ('TAX_REVIEW_REQUIRED','APPROVED')
  AND ("taxStatus"<>'APPROVED' OR length("taxReference")>=10)
  AND ("vatTreatment"<>'EXEMPT' OR ("vatRateBps"=0 AND "taxStatus"='APPROVED'))
);
CREATE TRIGGER "AcademyPrice_immutable" BEFORE UPDATE OR DELETE ON "LearningAcademyPriceVersion" FOR EACH ROW EXECUTE FUNCTION financial_immutable_record();
ALTER TABLE "LearningAcademyPromotion" ADD CONSTRAINT "AcademyPromotion_values" CHECK (
  revision>0 AND percentage BETWEEN 0 AND 100 AND length(label)>=3
  AND ((kind='ACCOUNT' AND "userId" IS NOT NULL AND "organizationId" IS NULL AND code IS NULL)
    OR (kind='ORGANIZATION' AND "organizationId" IS NOT NULL AND "userId" IS NULL AND code IS NULL)
    OR (kind='CODE' AND "userId" IS NULL AND "organizationId" IS NULL AND code ~ '^[A-Z0-9][A-Z0-9_-]{2,39}$'))
  AND ("validUntil" IS NULL OR "validFrom" IS NULL OR "validUntil">"validFrom")
  AND ("maximumUses" IS NULL OR "maximumUses">0) AND ("maximumPerAccount" IS NULL OR "maximumPerAccount">0)
  AND (quantity IS NULL OR quantity IN (1,5)) AND array_position("courseIds",NULL) IS NULL
);
CREATE FUNCTION academy_promotion_config_guard() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog AS $$
BEGIN
  IF TG_OP='DELETE' THEN RAISE EXCEPTION 'ACADEMY_PROMOTION_HISTORY_REQUIRED'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('academy-commerce:pricing',0));
  IF EXISTS(SELECT 1 FROM unnest(NEW."courseIds") x WHERE NOT EXISTS(SELECT 1 FROM public."LearningCourse" c WHERE c.id=x))
    OR cardinality(NEW."courseIds")<>(SELECT count(DISTINCT x) FROM unnest(NEW."courseIds") x)
    THEN RAISE EXCEPTION 'ACADEMY_PROMOTION_COURSE_INVALID'; END IF;
  IF TG_OP='UPDATE' THEN
    IF NEW.id<>OLD.id OR NEW.kind<>OLD.kind OR NEW.code IS DISTINCT FROM OLD.code OR NEW."userId" IS DISTINCT FROM OLD."userId"
      OR NEW."organizationId" IS DISTINCT FROM OLD."organizationId" OR NEW."createdByUserId"<>OLD."createdByUserId"
      OR NEW."creationKey"<>OLD."creationKey" OR NEW."creationFingerprint"<>OLD."creationFingerprint"
      OR NEW."createdAt"<>OLD."createdAt" OR NEW.revision<>OLD.revision+1 THEN RAISE EXCEPTION 'ACADEMY_PROMOTION_IDENTITY_IMMUTABLE'; END IF;
    IF NEW."maximumUses" IS NOT NULL AND (SELECT count(*) FROM public."LearningAcademyPromotionUse" WHERE "promotionId"=NEW.id AND status IN ('RESERVED','COMMITTED'))>NEW."maximumUses"
      THEN RAISE EXCEPTION 'ACADEMY_PROMOTION_LIMIT_BELOW_USAGE'; END IF;
    IF NEW."maximumPerAccount" IS NOT NULL AND EXISTS(SELECT 1 FROM public."LearningAcademyPromotionUse" WHERE "promotionId"=NEW.id AND status IN ('RESERVED','COMMITTED') GROUP BY "buyerUserId" HAVING count(*)>NEW."maximumPerAccount")
      THEN RAISE EXCEPTION 'ACADEMY_PROMOTION_LIMIT_BELOW_USAGE'; END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "AcademyPromotion_guard" BEFORE INSERT OR UPDATE OR DELETE ON "LearningAcademyPromotion" FOR EACH ROW EXECUTE FUNCTION academy_promotion_config_guard();
ALTER TABLE "LearningAcademyPromotionUse" ADD CONSTRAINT "AcademyPromotionUse_state" CHECK (
 (status='RESERVED' AND "committedAt" IS NULL AND "releasedAt" IS NULL)
 OR (status='COMMITTED' AND "committedAt" IS NOT NULL AND "releasedAt" IS NULL)
 OR (status='RELEASED' AND "committedAt" IS NULL AND "releasedAt" IS NOT NULL));
CREATE FUNCTION academy_promotion_use_guard() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog AS $$
DECLARE o public."LearningAcademyOrder"%ROWTYPE; p public."FinancialPurchase"%ROWTYPE; r public."LearningAcademyPromotion"%ROWTYPE; course_id uuid;
BEGIN
  IF TG_OP='DELETE' THEN RAISE EXCEPTION 'ACADEMY_PROMOTION_HISTORY_REQUIRED'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('academy-commerce:pricing',0));
  SELECT * INTO STRICT o FROM public."LearningAcademyOrder" WHERE id=NEW."orderId";
  SELECT * INTO STRICT p FROM public."FinancialPurchase" WHERE id=o."purchaseId";
  SELECT * INTO STRICT r FROM public."LearningAcademyPromotion" WHERE id=NEW."promotionId";
  SELECT "courseId" INTO STRICT course_id FROM public."LearningCourseVersion" WHERE id=o."courseVersionId";
  IF NEW."buyerUserId"<>o."buyerUserId" OR o."pricingSnapshot"->'scheme'->>'id' IS DISTINCT FROM r.id::text THEN RAISE EXCEPTION 'ACADEMY_PROMOTION_ORDER_MISMATCH'; END IF;
  IF TG_OP='INSERT' THEN
    IF NEW.status<>'RESERVED' OR NOT r.active OR (r."validFrom" IS NOT NULL AND r."validFrom">statement_timestamp()) OR (r."validUntil" IS NOT NULL AND r."validUntil"<=statement_timestamp())
      OR (r.quantity IS NOT NULL AND r.quantity<>o.quantity) OR (cardinality(r."courseIds")>0 AND NOT(course_id=ANY(r."courseIds")))
      OR (r.kind='ACCOUNT' AND r."userId"<>NEW."buyerUserId") OR (r.kind='ORGANIZATION' AND r."organizationId" IS DISTINCT FROM p."organizationId")
      OR (o."pricingSnapshot"->'scheme'->>'revision')::int IS DISTINCT FROM r.revision
      OR (o."pricingSnapshot"->'scheme'->>'percentage')::int IS DISTINCT FROM r.percentage
      THEN RAISE EXCEPTION 'ACADEMY_PROMOTION_NOT_APPLICABLE'; END IF;
    IF r."maximumUses" IS NOT NULL AND (SELECT count(*) FROM public."LearningAcademyPromotionUse" WHERE "promotionId"=r.id AND status IN ('RESERVED','COMMITTED'))>=r."maximumUses"
      THEN RAISE EXCEPTION 'ACADEMY_PROMOTION_LIMIT'; END IF;
    IF r."maximumPerAccount" IS NOT NULL AND (SELECT count(*) FROM public."LearningAcademyPromotionUse" WHERE "promotionId"=r.id AND "buyerUserId"=NEW."buyerUserId" AND status IN ('RESERVED','COMMITTED'))>=r."maximumPerAccount"
      THEN RAISE EXCEPTION 'ACADEMY_PROMOTION_ACCOUNT_LIMIT'; END IF;
  ELSE
    IF OLD.status<>'RESERVED' OR NEW.status NOT IN ('COMMITTED','RELEASED') OR NEW.id<>OLD.id OR NEW."orderId"<>OLD."orderId" OR NEW."promotionId"<>OLD."promotionId" OR NEW."buyerUserId"<>OLD."buyerUserId" OR NEW."createdAt"<>OLD."createdAt"
      THEN RAISE EXCEPTION 'ACADEMY_PROMOTION_USE_IMMUTABLE'; END IF;
    IF NEW.status='COMMITTED' AND p.status::text<>'PAID' THEN RAISE EXCEPTION 'ACADEMY_PAYMENT_REQUIRED'; END IF;
    IF NEW.status='RELEASED' AND (p.status::text NOT IN ('CANCELED','FAILED','EXPIRED') OR (p."molliePaymentId" IS NULL AND EXISTS(SELECT 1 FROM public."FinancialEvent" WHERE "idempotencyKey"='academy-contract-confirmed:'||p.id::text)))
      THEN RAISE EXCEPTION 'ACADEMY_PAYMENT_RECONCILIATION_REQUIRED'; END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "AcademyPromotionUse_guard" BEFORE INSERT OR UPDATE OR DELETE ON "LearningAcademyPromotionUse" FOR EACH ROW EXECUTE FUNCTION academy_promotion_use_guard();
CREATE FUNCTION academy_order_pricing_guard() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog AS $$
DECLARE p public."FinancialPurchase"%ROWTYPE; v public."LearningAcademyPriceVersion"%ROWTYPE; expected_gross int; expected_final int; qualified int; follow_price int; scheme_kind text;
BEGIN
  IF NEW."pricingSnapshot" IS NULL THEN
    IF NEW."priceVersionId" IS NOT NULL THEN RAISE EXCEPTION 'ACADEMY_PRICE_SNAPSHOT_REQUIRED'; END IF;
    RETURN NEW; -- preserved legacy import/test records, no in-place backfill
  END IF;
  SELECT * INTO STRICT p FROM public."FinancialPurchase" WHERE id=NEW."purchaseId";
  IF NEW."priceVersionId" IS NOT NULL THEN
    SELECT * INTO STRICT v FROM public."LearningAcademyPriceVersion" WHERE id=NEW."priceVersionId";
    expected_gross:=CASE WHEN NEW.quantity=1 THEN v."individualCents" ELSE v."fiveCents" END;
    IF v."courseId" IS NOT NULL AND v."courseId"<>(SELECT "courseId" FROM public."LearningCourseVersion" WHERE id=NEW."courseVersionId") THEN RAISE EXCEPTION 'ACADEMY_PRICE_COURSE_MISMATCH'; END IF;
  ELSE expected_gross:=CASE WHEN NEW.quantity=1 THEN 14900 ELSE 59500 END;
  END IF;
  scheme_kind:=NEW."pricingSnapshot"->'scheme'->>'kind';
  IF scheme_kind='NONE' THEN expected_final:=expected_gross;
  ELSIF scheme_kind='ALUMNI' THEN
    SELECT count(*) INTO qualified FROM jsonb_array_elements(NEW."benefitProof"->'participants') x WHERE x->>'attemptId' IS NOT NULL;
    IF qualified<1 OR qualified>NEW.quantity OR (NEW."benefitProof"->>'applied')::boolean IS DISTINCT FROM true THEN RAISE EXCEPTION 'ACADEMY_BENEFIT_NOT_ESTABLISHED'; END IF;
    follow_price:=CASE WHEN NEW."priceVersionId" IS NULL THEN CASE WHEN NEW.quantity=1 THEN 13999 ELSE 56500 END ELSE CASE WHEN NEW.quantity=1 THEN v."followUpIndividualCents" ELSE v."followUpFiveCents" END END;
    expected_final:=CASE WHEN NEW.quantity=1 THEN follow_price ELSE round((expected_gross::bigint*5-qualified::bigint*(expected_gross-follow_price))/5.0)::int END;
  ELSIF scheme_kind IN ('ACCOUNT','ORGANIZATION','CODE') THEN
    IF (NEW."pricingSnapshot"->'scheme'->>'percentage')::int NOT BETWEEN 0 AND 100 OR NEW."pricingSnapshot"->'scheme'->>'id' IS NULL THEN RAISE EXCEPTION 'ACADEMY_PROMOTION_INVALID'; END IF;
    expected_final:=expected_gross-round(expected_gross::bigint*(NEW."pricingSnapshot"->'scheme'->>'percentage')::int/100.0)::int;
  ELSE RAISE EXCEPTION 'ACADEMY_PROMOTION_INVALID'; END IF;
  IF (NEW."pricingSnapshot"->>'formatVersion')::int IS DISTINCT FROM 1
    OR p."amountInclVatCents" IS DISTINCT FROM expected_final
    OR (NEW."pricingSnapshot"->>'quantity')::int IS DISTINCT FROM NEW.quantity
    OR (NEW."pricingSnapshot"->>'originalGrossCents')::int IS DISTINCT FROM expected_gross
    OR (NEW."pricingSnapshot"->>'finalGrossCents')::int IS DISTINCT FROM p."amountInclVatCents"
    OR (NEW."pricingSnapshot"->'scheme'->>'grossCents')::int IS DISTINCT FROM p."amountInclVatCents"
    OR (NEW."pricingSnapshot"->>'discountGrossCents')::int IS DISTINCT FROM expected_gross-p."amountInclVatCents"
    THEN RAISE EXCEPTION 'ACADEMY_PRICE_SNAPSHOT_MISMATCH'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "AcademyOrder_pricing" BEFORE INSERT ON "LearningAcademyOrder" FOR EACH ROW EXECUTE FUNCTION academy_order_pricing_guard();
CREATE FUNCTION academy_order_promotion_count() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog AS $$
BEGIN
  IF NEW."pricingSnapshot"->'scheme'->>'id' IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public."LearningAcademyPromotionUse" WHERE "orderId"=NEW.id)
    THEN RAISE EXCEPTION 'ACADEMY_PROMOTION_RESERVATION_REQUIRED'; END IF;
  RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER "AcademyOrder_promotion_count" AFTER INSERT ON "LearningAcademyOrder" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION academy_order_promotion_count();
CREATE FUNCTION academy_zero_order_paid_guard() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog AS $$
DECLARE o public."LearningAcademyOrder"%ROWTYPE;
BEGIN
  IF NEW.kind::text='ACADEMY_COURSE' AND NEW."amountInclVatCents"=0 AND NEW.status::text='PAID' AND OLD.status::text<>'PAID' THEN
    SELECT * INTO STRICT o FROM public."LearningAcademyOrder" WHERE "purchaseId"=NEW.id;
    IF NEW."molliePaymentId" IS NOT NULL OR (o."pricingSnapshot"->>'finalGrossCents')::int IS DISTINCT FROM 0
      OR NOT ((o."pricingSnapshot"->>'originalGrossCents')::int=0 OR (o."pricingSnapshot"->'scheme'->>'percentage')::int=100 OR o."pricingSnapshot"->'scheme'->>'kind'='ALUMNI')
      THEN RAISE EXCEPTION 'ACADEMY_FREE_ORDER_INVALID'; END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "AcademyPurchase_zero" BEFORE UPDATE ON "FinancialPurchase" FOR EACH ROW EXECUTE FUNCTION academy_zero_order_paid_guard();

-- Narrow forward-only extension of the existing personal-alumni binding.
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
    IF (COALESCE((proof->>'discountCents')::int,0)>0 OR COALESCE((proof->>'identityLocked')::boolean,false)) AND proof->>'userId' IS DISTINCT FROM u.id::text
      THEN RAISE EXCEPTION 'ACADEMY_BENEFIT_IDENTITY_MISMATCH'; END IF;
  END IF;
  RETURN NEW;
END $$;
