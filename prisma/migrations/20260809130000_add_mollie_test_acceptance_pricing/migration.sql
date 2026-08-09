-- AddEnum
CREATE TYPE "FinancialPricingMode" AS ENUM ('STANDARD', 'MOLLIE_TEST_ACCEPTANCE');

-- AddColumns
ALTER TABLE "FinancialPurchase"
  ADD COLUMN "pricingMode" "FinancialPricingMode" NOT NULL DEFAULT 'STANDARD';

ALTER TABLE "FinancialInvoice"
  ADD COLUMN "pricingMode" "FinancialPricingMode" NOT NULL DEFAULT 'STANDARD';

-- Only the fixed 25-credit Mollie sandbox acceptance price may use the test mode.
ALTER TABLE "FinancialPurchase"
  ADD CONSTRAINT "FinancialPurchase_test_pricing_check" CHECK (
    "pricingMode" = 'STANDARD'
    OR (
      "pricingMode" = 'MOLLIE_TEST_ACCEPTANCE'
      AND "kind" = 'CREDIT_PACKAGE'
      AND "packageSku" = 'CREDITS_25'
      AND "credits" = 25
      AND "baseAmountCents" = 100
      AND "packageDiscountCents" = 0
      AND "proDiscountCents" = 0
      AND "discountCodeDiscountCents" = 0
      AND "discountCodeId" IS NULL
      AND "discountCodeSnapshot" IS NULL
      AND "amountExclVatCents" = 100
      AND "vatRateBps" = 2100
      AND "vatAmountCents" = 21
      AND "amountInclVatCents" = 121
      AND "currency" = 'EUR'
    )
  );

-- The pricing mode is part of the immutable purchase snapshot.
CREATE OR REPLACE FUNCTION "financial_protect_purchase_snapshot"() RETURNS trigger AS $$
BEGIN
  IF ROW(NEW."organizationId", NEW."createdByUserId", NEW."kind", NEW."pricingMode", NEW."packageSku", NEW."packageLabel", NEW."credits",
    NEW."baseAmountCents", NEW."packageDiscountCents", NEW."proDiscountCents", NEW."discountCodeDiscountCents",
    NEW."amountExclVatCents", NEW."vatRateBps", NEW."vatAmountCents", NEW."amountInclVatCents", NEW."currency",
    NEW."discountCodeId", NEW."discountCodeSnapshot", NEW."billingOrganizationName", NEW."billingAddressLine",
    NEW."billingPostalCode", NEW."billingCity", NEW."billingCountryCode", NEW."billingKvKNumber", NEW."billingVatId",
    NEW."idempotencyKey", NEW."createdAt") IS DISTINCT FROM ROW(OLD."organizationId", OLD."createdByUserId", OLD."kind",
    OLD."pricingMode", OLD."packageSku", OLD."packageLabel", OLD."credits", OLD."baseAmountCents", OLD."packageDiscountCents",
    OLD."proDiscountCents", OLD."discountCodeDiscountCents", OLD."amountExclVatCents", OLD."vatRateBps",
    OLD."vatAmountCents", OLD."amountInclVatCents", OLD."currency", OLD."discountCodeId", OLD."discountCodeSnapshot",
    OLD."billingOrganizationName", OLD."billingAddressLine", OLD."billingPostalCode", OLD."billingCity",
    OLD."billingCountryCode", OLD."billingKvKNumber", OLD."billingVatId", OLD."idempotencyKey", OLD."createdAt") THEN
    RAISE EXCEPTION 'financial purchase snapshot is immutable';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
