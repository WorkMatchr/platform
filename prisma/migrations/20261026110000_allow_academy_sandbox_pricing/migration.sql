-- Forward-only correction: retain the exact existing standard/25-credit policy;
-- add only the separately gated Academy test mode. No data mutation.
ALTER TABLE "FinancialPurchase" DROP CONSTRAINT "FinancialPurchase_test_pricing_check";
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
   OR (
    "pricingMode" = 'ACADEMY_SANDBOX' AND "kind" = 'ACADEMY_COURSE'
    AND "credits" = 0 AND "proDiscountCents" = 0 AND "discountCodeDiscountCents" = 0
    AND "discountCodeId" IS NULL AND "discountCodeSnapshot" IS NULL AND "currency" = 'EUR'
  ));
