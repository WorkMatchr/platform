ALTER TYPE "FinancialPurchaseKind" ADD VALUE 'ACADEMY_COURSE';

ALTER TABLE "FinancialPurchase" ALTER COLUMN "organizationId" DROP NOT NULL;
ALTER TABLE "FinancialInvoice" ALTER COLUMN "organizationId" DROP NOT NULL,
  ADD COLUMN "academyTaxTreatment" text CHECK ("academyTaxTreatment" IS NULL OR
    ("academyTaxTreatment" = 'NL_KOR' AND "vatRateBps" = 0 AND "vatAmountCents" = 0)
    OR ("academyTaxTreatment" = 'NL_STANDARD' AND "vatRateBps" = 2100));
CREATE FUNCTION academy_private_invoice_buyer() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $$
BEGIN
  IF NEW."organizationId" IS NULL AND NOT EXISTS (
    SELECT 1 FROM public."FinancialPurchase" p WHERE p.id=NEW."purchaseId" AND p."organizationId" IS NULL
      AND p.kind::text='ACADEMY_COURSE' AND NEW."documentType"='INVOICE' AND NEW."subscriptionPaymentId" IS NULL
  ) THEN RAISE EXCEPTION 'PRIVATE_ACADEMY_PURCHASE_REQUIRED'; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER "academy_private_invoice_buyer" BEFORE INSERT OR UPDATE ON "FinancialInvoice"
  FOR EACH ROW EXECUTE FUNCTION academy_private_invoice_buyer();

ALTER TABLE "FinancialPurchase" DROP CONSTRAINT "FinancialPurchase_kind_credits_check",
  ADD CONSTRAINT "FinancialPurchase_kind_credits_check" CHECK (
    (kind = 'CREDIT_PACKAGE' AND credits > 0 AND "organizationId" IS NOT NULL) OR (kind = 'PRO_SUBSCRIPTION' AND credits = 0 AND "organizationId" IS NOT NULL)
    OR (kind::text = 'ACADEMY_COURSE' AND credits = 0 AND "amountInclVatCents" > 0 AND "discountCodeId" IS NOT NULL)
  );

ALTER TABLE "LearningPilotAssignment"
  ADD COLUMN "paidSlot" smallint,
  ADD COLUMN "regularGrossCents" integer,
  ADD COLUMN "offlineMinutes" integer,
  ADD COLUMN feedback jsonb,
  ADD CONSTRAINT "LearningPilotAssignment_paid_slot_check" CHECK (
    ("paidSlot" IS NULL AND "regularGrossCents" IS NULL)
    OR ("paidSlot" BETWEEN 1 AND 3 AND "paidSlot" IS NOT NULL AND "regularGrossCents" BETWEEN 1 AND 10000000 AND "regularGrossCents" IS NOT NULL)
  ),
  ADD CONSTRAINT "LearningPilotAssignment_offline_check" CHECK ("offlineMinutes" BETWEEN 0 AND 1440),
  ADD UNIQUE ("paidSlot");
CREATE UNIQUE INDEX "LearningPilotAssignment_paid_person" ON "LearningPilotAssignment" ("userId") WHERE "paidSlot" IS NOT NULL;
CREATE UNIQUE INDEX "FinancialPurchase_paid_pilot_code" ON "FinancialPurchase" ("discountCodeId") WHERE "packageSku" IN ('ACADEMY_WL001_R07','ACADEMY_WL002_R07','ACADEMY_WL003_R07');
