ALTER TABLE "FinancialPurchase" ADD COLUMN "complianceRunId" UUID;
CREATE UNIQUE INDEX "FinancialPurchase_complianceRunId_key" ON "FinancialPurchase"("complianceRunId");
ALTER TABLE "FinancialPurchase" ADD CONSTRAINT "FinancialPurchase_complianceRunId_fkey" FOREIGN KEY ("complianceRunId") REFERENCES "ArboGuideRun"(id) ON DELETE RESTRICT;
ALTER TABLE "FinancialPurchase" DROP CONSTRAINT "FinancialPurchase_kind_credits_check";
ALTER TABLE "FinancialPurchase" ADD CONSTRAINT "FinancialPurchase_kind_credits_check" CHECK (
 (kind = 'CREDIT_PACKAGE' AND credits > 0 AND "complianceRunId" IS NULL) OR
 (kind = 'PRO_SUBSCRIPTION' AND credits = 0 AND "complianceRunId" IS NULL) OR
 (kind = 'COMPLIANCE_SCAN' AND credits = 0 AND "complianceRunId" IS NOT NULL AND "creditedTransactionId" IS NULL));
CREATE FUNCTION "protect_compliance_purchase_binding"() RETURNS trigger LANGUAGE plpgsql AS $guard$
BEGIN
 IF TG_OP = 'UPDATE' AND (OLD."complianceRunId" IS DISTINCT FROM NEW."complianceRunId" OR OLD.kind IS DISTINCT FROM NEW.kind)
 THEN RAISE EXCEPTION 'Purchase binding is immutable'; END IF;
 IF TG_OP = 'UPDATE' AND OLD.kind = 'COMPLIANCE_SCAN' AND
  (to_jsonb(NEW) - ARRAY['status','molliePaymentId','mollieCheckoutUrl','paymentCreatedAt','paidAt','terminalAt','updatedAt']) IS DISTINCT FROM
  (to_jsonb(OLD) - ARRAY['status','molliePaymentId','mollieCheckoutUrl','paymentCreatedAt','paidAt','terminalAt','updatedAt'])
 THEN RAISE EXCEPTION 'Compliance price and billing snapshot are immutable'; END IF;
 IF NEW.kind = 'COMPLIANCE_SCAN' AND NOT EXISTS (
  SELECT 1 FROM "ArboGuideRun" r WHERE r.id = NEW."complianceRunId" AND r."organizationId" = NEW."organizationId"
  AND r."completedByUserId" = NEW."createdByUserId" AND r."draftRevision" IS NOT NULL
 ) THEN RAISE EXCEPTION 'Purchase requires the same tenant and draft creator'; END IF;
 RETURN NEW;
END;
$guard$;
CREATE TRIGGER "FinancialPurchase_compliance_binding" BEFORE INSERT OR UPDATE ON "FinancialPurchase"
 FOR EACH ROW EXECUTE FUNCTION "protect_compliance_purchase_binding"();
