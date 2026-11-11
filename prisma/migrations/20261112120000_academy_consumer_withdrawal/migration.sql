BEGIN;
ALTER TABLE "LearningPilotAssignment" ADD COLUMN "cohortEndsAt" timestamptz(3), ADD COLUMN "measurementsPurgedAt" timestamptz(3);
ALTER TABLE "FinancialRefund" ADD COLUMN "academyWithdrawalEventId" uuid UNIQUE REFERENCES "FinancialEvent"(id) ON DELETE RESTRICT;
ALTER TABLE "FinancialRefund" DROP CONSTRAINT "FinancialRefund_amount_check",
 ADD CONSTRAINT "FinancialRefund_amount_check" CHECK ("amountCents">0 AND (
 ("purchaseId" IS NOT NULL AND "proCreditNoteId" IS NULL AND "academyWithdrawalEventId" IS NULL AND credits>0)
 OR ("purchaseId" IS NULL AND "proCreditNoteId" IS NOT NULL AND "academyWithdrawalEventId" IS NULL AND credits=0 AND "ledgerTransactionId" IS NULL)
 OR ("purchaseId" IS NOT NULL AND "proCreditNoteId" IS NULL AND "academyWithdrawalEventId" IS NOT NULL AND credits=0 AND "ledgerTransactionId" IS NULL)));
CREATE FUNCTION academy_validate_withdrawal_refund() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $$
BEGIN
 IF TG_OP='UPDATE' AND NEW."academyWithdrawalEventId" IS DISTINCT FROM OLD."academyWithdrawalEventId" THEN
   RAISE EXCEPTION 'IMMUTABLE_WITHDRAWAL'; END IF;
 IF NEW."academyWithdrawalEventId" IS NOT NULL AND NOT EXISTS (
   SELECT FROM public."FinancialEvent" e JOIN public."FinancialPurchase" p ON e."purchaseId"=p.id
   JOIN public."FinancialInvoice" i ON i."purchaseId"=p.id
   WHERE e.id=NEW."academyWithdrawalEventId" AND e."eventType"='ACADEMY_WITHDRAWAL_RECEIVED'
   AND e."idempotencyKey"='academy-withdrawal:'||p.id AND e."actorUserId"=p."createdByUserId"
   AND p.id=NEW."purchaseId" AND p.kind='ACADEMY_COURSE' AND p."organizationId" IS NULL
   AND p."amountInclVatCents"=NEW."amountCents" AND i."amountInclVatCents"=NEW."amountCents"
   AND p."molliePaymentId"=i."molliePaymentId") THEN RAISE EXCEPTION 'INVALID_ACADEMY_REFUND'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER academy_validate_withdrawal_refund BEFORE INSERT OR UPDATE ON "FinancialRefund"
 FOR EACH ROW EXECUTE FUNCTION academy_validate_withdrawal_refund();
CREATE OR REPLACE FUNCTION academy_private_invoice_buyer() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $$
BEGIN
 IF NEW."organizationId" IS NULL AND NOT EXISTS (
   SELECT FROM public."FinancialPurchase" p WHERE p.id=NEW."purchaseId" AND p."organizationId" IS NULL
   AND p.kind='ACADEMY_COURSE' AND NEW."documentType"='INVOICE' AND NEW."subscriptionPaymentId" IS NULL
 ) AND NOT EXISTS (
   SELECT FROM public."FinancialRefund" r JOIN public."FinancialInvoice" i ON i."purchaseId"=r."purchaseId"
   WHERE NEW."documentType"='CREDIT_NOTE' AND r.id=NEW."refundId" AND r."academyWithdrawalEventId" IS NOT NULL
   AND i.id=NEW."originalInvoiceId" AND i."organizationId" IS NULL AND r.status='REFUNDED'
   AND NEW."academyTaxTreatment" IS NOT DISTINCT FROM i."academyTaxTreatment"
   AND NEW."amountInclVatCents"=-i."amountInclVatCents" AND NEW."molliePaymentId"=i."molliePaymentId"
 ) THEN RAISE EXCEPTION 'PRIVATE_ACADEMY_PURCHASE_REQUIRED'; END IF;
 RETURN NEW;
END $$;
COMMIT;
