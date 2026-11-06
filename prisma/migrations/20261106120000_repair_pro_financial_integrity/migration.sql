-- Additive P1 extension. No historical records are rewritten. Existing duplicates stop migration.
CREATE UNIQUE INDEX "ProfessionalSubscriptionPayment_one_paid_provider_payment"
  ON "ProfessionalSubscriptionPayment" ("molliePaymentId") WHERE status = 'PAID';
ALTER TABLE "FinancialInvoice" ADD COLUMN "proCreditKey" VARCHAR(160);
CREATE UNIQUE INDEX "FinancialInvoice_proCreditKey_key" ON "FinancialInvoice" ("proCreditKey");
ALTER TABLE "FinancialRefund" ALTER COLUMN "purchaseId" DROP NOT NULL,
  ADD COLUMN "proCreditNoteId" UUID,
  ADD COLUMN "providerDispatchVersion" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "providerAttemptedAt" TIMESTAMPTZ(3),
  ADD COLUMN "reconciliationRequired" BOOLEAN NOT NULL DEFAULT false;
-- Existing refund attempts have unknown dispatch history: lookup only, never automatically send again.
ALTER TABLE "FinancialRefund" ALTER COLUMN "providerDispatchVersion" SET DEFAULT 1;
ALTER TABLE "FinancialRefund" ADD CONSTRAINT "FinancialRefund_dispatch_version_check" CHECK ("providerDispatchVersion" IN (0, 1));
CREATE UNIQUE INDEX "FinancialRefund_proCreditNoteId_key" ON "FinancialRefund" ("proCreditNoteId");
ALTER TABLE "FinancialRefund" ADD CONSTRAINT "FinancialRefund_proCreditNoteId_fkey"
  FOREIGN KEY ("proCreditNoteId") REFERENCES "FinancialInvoice"(id) ON DELETE RESTRICT;
ALTER TABLE "FinancialRefund" DROP CONSTRAINT "FinancialRefund_amount_check";
ALTER TABLE "FinancialRefund" ADD CONSTRAINT "FinancialRefund_amount_check" CHECK (
  "amountCents" > 0 AND (("purchaseId" IS NOT NULL AND "proCreditNoteId" IS NULL AND credits > 0)
    OR ("purchaseId" IS NULL AND "proCreditNoteId" IS NOT NULL AND credits = 0 AND "ledgerTransactionId" IS NULL)));
ALTER TABLE "FinancialInvoice" DROP CONSTRAINT "FinancialInvoice_source_check";
ALTER TABLE "FinancialInvoice" ADD CONSTRAINT "FinancialInvoice_source_check" CHECK (
  ("documentType" = 'INVOICE' AND num_nonnulls("purchaseId", "subscriptionPaymentId") = 1 AND "refundId" IS NULL AND "proCreditKey" IS NULL)
  OR ("documentType" = 'CREDIT_NOTE' AND "purchaseId" IS NULL AND "subscriptionPaymentId" IS NULL
    AND num_nonnulls("refundId", "proCreditKey") = 1 AND "originalInvoiceId" IS NOT NULL));

CREATE FUNCTION financial_validate_pro_credit() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE original "FinancialInvoice"%ROWTYPE; total BIGINT; net BIGINT; vat BIGINT;
BEGIN
  IF NEW."proCreditKey" IS NULL THEN RETURN NEW; END IF;
  SELECT * INTO original FROM "FinancialInvoice" WHERE id = NEW."originalInvoiceId" FOR UPDATE;
  IF NOT FOUND OR original."documentType" <> 'INVOICE' OR original."snapshotVersion" <> 2
    OR original."organizationId" <> NEW."organizationId" OR original.credits <> 0
    OR NOT (original."subscriptionPaymentId" IS NOT NULL OR EXISTS (
      SELECT 1 FROM "FinancialPurchase" p WHERE p.id = original."purchaseId" AND p.kind = 'PRO_SUBSCRIPTION' AND p.status = 'PAID'))
    OR NEW."servicePeriodStart" IS DISTINCT FROM original."servicePeriodStart"
    OR NEW."servicePeriodEnd" IS DISTINCT FROM original."servicePeriodEnd"
    OR NEW."vatRateBps" <> original."vatRateBps" OR NEW.currency <> original.currency
    OR NEW."molliePaymentId" IS DISTINCT FROM original."molliePaymentId" THEN
    RAISE EXCEPTION 'PRO_CREDIT_SOURCE_INVALID';
  END IF;
  SELECT -COALESCE(sum("amountInclVatCents"),0), -COALESCE(sum("amountExclVatCents"),0), -COALESCE(sum("vatAmountCents"),0)
    INTO total, net, vat FROM "FinancialInvoice" WHERE "originalInvoiceId" = original.id;
  IF total > original."amountInclVatCents" OR net > original."amountExclVatCents" OR vat > original."vatAmountCents" THEN
    RAISE EXCEPTION 'PRO_CREDIT_LIMIT_EXCEEDED';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM "FinancialEvent" e JOIN "User" u ON u.id=e."actorUserId"
    JOIN "OrganizationMembership" m ON m."userId"=u.id JOIN "Organization" o ON o.id=m."organizationId"
    WHERE e."invoiceId"=NEW.id AND e."eventType"='PRO_CREDIT_ISSUED' AND length(btrim(e.reason)) >= 10
    AND u.status='ACTIVE' AND u."platformRole"='ADMIN' AND m.status='ACTIVE' AND m.role IN ('OWNER','ADMIN')
    AND o."systemKey"='WORKMATCHR_PLATFORM' AND o.status='ACTIVE') THEN RAISE EXCEPTION 'PRO_CREDIT_AUTHORIZATION_REQUIRED'; END IF;
  RETURN NEW;
END $$;
CREATE CONSTRAINT TRIGGER "FinancialInvoice_pro_credit_valid" AFTER INSERT ON "FinancialInvoice"
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION financial_validate_pro_credit();

CREATE FUNCTION financial_validate_pro_refund() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE credit "FinancialInvoice"%ROWTYPE;
BEGIN
  IF TG_OP = 'UPDATE' AND (NEW."proCreditNoteId" IS DISTINCT FROM OLD."proCreditNoteId"
    OR NEW."purchaseId" IS DISTINCT FROM OLD."purchaseId" OR NEW."amountCents" <> OLD."amountCents"
    OR NEW."approvedByUserId" <> OLD."approvedByUserId" OR NEW."idempotencyKey" <> OLD."idempotencyKey"
    OR NEW."providerDispatchVersion" <> OLD."providerDispatchVersion"
    OR (OLD."providerAttemptedAt" IS NOT NULL AND NEW."providerAttemptedAt" IS DISTINCT FROM OLD."providerAttemptedAt")
    OR (OLD."mollieRefundId" IS NOT NULL AND NEW."mollieRefundId" IS DISTINCT FROM OLD."mollieRefundId")
    OR (OLD.status = 'REFUNDED' AND NEW.status <> 'REFUNDED')) THEN
    RAISE EXCEPTION 'REFUND_SOURCE_IMMUTABLE';
  END IF;
  IF NEW."proCreditNoteId" IS NULL THEN RETURN NEW; END IF;
  SELECT * INTO credit FROM "FinancialInvoice" WHERE id=NEW."proCreditNoteId";
  IF credit."proCreditKey" IS NULL OR NEW."amountCents" <> -credit."amountInclVatCents" THEN
    RAISE EXCEPTION 'PRO_REFUND_CREDIT_MISMATCH';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "FinancialRefund_pro_source_valid" BEFORE INSERT OR UPDATE ON "FinancialRefund"
  FOR EACH ROW EXECUTE FUNCTION financial_validate_pro_refund();

-- Preserve every existing refund/sign guard; independent Pro credits use the stricter dedicated source/cumulative/audit validator.
ALTER TABLE "FinancialInvoice" DROP CONSTRAINT "FinancialInvoice_snapshot_v2_dates_check";
ALTER TABLE "FinancialInvoice" ADD CONSTRAINT "FinancialInvoice_snapshot_v2_dates_check" CHECK (
  "snapshotVersion" IN (1, 2) AND ("snapshotVersion" = 1 OR (
    "supplyDate" IS NOT NULL
    AND ("documentType" = 'INVOICE' OR ("documentType" = 'CREDIT_NOTE' AND "originalInvoiceId" IS NOT NULL AND num_nonnulls("refundId", "proCreditKey") = 1))
    AND (("servicePeriodStart" IS NULL AND "servicePeriodEnd" IS NULL)
      OR ("servicePeriodStart" IS NOT NULL AND "servicePeriodEnd" > "servicePeriodStart"))
  ))
);

CREATE OR REPLACE FUNCTION "financial_validate_document_sign"() RETURNS trigger AS $$
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
    IF doc."snapshotVersion" = 2 AND doc."proCreditKey" IS NULL THEN
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
