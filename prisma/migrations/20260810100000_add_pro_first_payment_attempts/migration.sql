-- Keep every failed first-payment attempt immutable while allowing one pending
-- Pro subscription to be retried without replacing its original snapshot.
CREATE TABLE "ProfessionalSubscriptionFirstPaymentAttempt" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "subscriptionId" UUID NOT NULL,
  "purchaseId" UUID NOT NULL,
  "attemptNumber" INTEGER NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProfessionalSubscriptionFirstPaymentAttempt_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProfessionalSubscriptionFirstPaymentAttempt_purchaseId_key"
  ON "ProfessionalSubscriptionFirstPaymentAttempt"("purchaseId");
CREATE UNIQUE INDEX "ProfessionalSubscriptionFirstPaymentAttempt_subscriptionId_attemptNumber_key"
  ON "ProfessionalSubscriptionFirstPaymentAttempt"("subscriptionId", "attemptNumber");
CREATE INDEX "ProfessionalSubscriptionFirstPaymentAttempt_subscriptionId_createdAt_idx"
  ON "ProfessionalSubscriptionFirstPaymentAttempt"("subscriptionId", "createdAt");

ALTER TABLE "ProfessionalSubscriptionFirstPaymentAttempt"
  ADD CONSTRAINT "ProfessionalSubscriptionFirstPaymentAttempt_subscriptionId_fkey"
  FOREIGN KEY ("subscriptionId") REFERENCES "ProfessionalSubscription"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProfessionalSubscriptionFirstPaymentAttempt"
  ADD CONSTRAINT "ProfessionalSubscriptionFirstPaymentAttempt_purchaseId_fkey"
  FOREIGN KEY ("purchaseId") REFERENCES "FinancialPurchase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ProfessionalSubscriptionFirstPaymentAttempt"
  ADD CONSTRAINT "ProfessionalSubscriptionFirstPaymentAttempt_attemptNumber_check"
  CHECK ("attemptNumber" > 0);
