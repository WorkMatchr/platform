-- CreateEnum
CREATE TYPE "FinancialPurchaseKind" AS ENUM ('CREDIT_PACKAGE', 'PRO_SUBSCRIPTION');

-- CreateEnum
CREATE TYPE "FinancialPurchaseStatus" AS ENUM ('CREATED', 'PAYMENT_PENDING', 'PAID', 'FAILED', 'CANCELED', 'EXPIRED', 'REFUND_REVIEW_REQUIRED', 'PARTIALLY_REFUNDED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "FinancialPaymentStatus" AS ENUM ('OPEN', 'PENDING', 'PAID', 'FAILED', 'CANCELED', 'EXPIRED', 'PARTIALLY_REFUNDED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "FinancialDocumentType" AS ENUM ('INVOICE', 'CREDIT_NOTE');

-- CreateEnum
CREATE TYPE "FinancialSyncStatus" AS ENUM ('PENDING', 'PROCESSING', 'SYNCED', 'FAILED');

-- CreateEnum
CREATE TYPE "DiscountCodeStatus" AS ENUM ('ACTIVE', 'BLOCKED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "DiscountRedemptionStatus" AS ENUM ('RESERVED', 'APPLIED', 'RELEASED');

-- CreateEnum
CREATE TYPE "StarterBenefitDecision" AS ENUM ('ELIGIBLE', 'REVIEW_REQUIRED', 'INELIGIBLE');

-- CreateEnum
CREATE TYPE "StarterBenefitEvidenceSource" AS ENUM ('MANUAL_PLATFORM_REVIEW', 'KVK_PROVIDER');

-- CreateEnum
CREATE TYPE "ProfessionalSubscriptionStatus" AS ENUM ('PENDING_MANDATE', 'ACTIVE', 'PAST_DUE', 'SUSPENDED', 'EXPIRED', 'CANCELED');

-- CreateTable
CREATE TABLE "FinancialPurchase" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "createdByUserId" UUID NOT NULL,
    "kind" "FinancialPurchaseKind" NOT NULL DEFAULT 'CREDIT_PACKAGE',
    "status" "FinancialPurchaseStatus" NOT NULL DEFAULT 'CREATED',
    "packageSku" VARCHAR(40) NOT NULL,
    "packageLabel" VARCHAR(120) NOT NULL,
    "credits" INTEGER NOT NULL,
    "baseAmountCents" INTEGER NOT NULL,
    "packageDiscountCents" INTEGER NOT NULL DEFAULT 0,
    "proDiscountCents" INTEGER NOT NULL DEFAULT 0,
    "discountCodeDiscountCents" INTEGER NOT NULL DEFAULT 0,
    "amountExclVatCents" INTEGER NOT NULL,
    "vatRateBps" INTEGER NOT NULL,
    "vatAmountCents" INTEGER NOT NULL,
    "amountInclVatCents" INTEGER NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "discountCodeId" UUID,
    "discountCodeSnapshot" JSONB,
    "billingOrganizationName" VARCHAR(200) NOT NULL,
    "billingAddressLine" VARCHAR(200) NOT NULL,
    "billingPostalCode" VARCHAR(20) NOT NULL,
    "billingCity" VARCHAR(120) NOT NULL,
    "billingCountryCode" CHAR(2) NOT NULL,
    "billingKvKNumber" VARCHAR(20),
    "billingVatId" VARCHAR(40),
    "molliePaymentId" VARCHAR(80),
    "mollieCheckoutUrl" VARCHAR(500),
    "creditedTransactionId" UUID,
    "idempotencyKey" VARCHAR(160) NOT NULL,
    "paymentCreatedAt" TIMESTAMPTZ(3),
    "paidAt" TIMESTAMPTZ(3),
    "terminalAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "FinancialPurchase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinancialPaymentEvent" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "purchaseId" UUID NOT NULL,
    "molliePaymentId" VARCHAR(80) NOT NULL,
    "status" "FinancialPaymentStatus" NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "providerOccurredAt" TIMESTAMPTZ(3),
    "payloadFingerprint" CHAR(64) NOT NULL,
    "idempotencyKey" VARCHAR(160) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FinancialPaymentEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinancialRefund" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "purchaseId" UUID NOT NULL,
    "approvedByUserId" UUID NOT NULL,
    "status" "FinancialPaymentStatus" NOT NULL DEFAULT 'PENDING',
    "reason" VARCHAR(500) NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "credits" INTEGER NOT NULL,
    "mollieRefundId" VARCHAR(80),
    "ledgerTransactionId" UUID,
    "idempotencyKey" VARCHAR(160) NOT NULL,
    "requestedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMPTZ(3),

    CONSTRAINT "FinancialRefund_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinancialInvoiceCounter" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "nextNumber" INTEGER NOT NULL,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "FinancialInvoiceCounter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinancialInvoice" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "documentType" "FinancialDocumentType" NOT NULL DEFAULT 'INVOICE',
    "invoiceNumber" VARCHAR(40) NOT NULL,
    "sequenceNumber" INTEGER NOT NULL,
    "purchaseId" UUID,
    "refundId" UUID,
    "subscriptionPaymentId" UUID,
    "originalInvoiceId" UUID,
    "organizationId" UUID NOT NULL,
    "issuedAt" TIMESTAMPTZ(3) NOT NULL,
    "sellerLegalName" VARCHAR(200) NOT NULL,
    "sellerTradeName" VARCHAR(200) NOT NULL,
    "sellerAddressLine" VARCHAR(200) NOT NULL,
    "sellerPostalCode" VARCHAR(20) NOT NULL,
    "sellerCity" VARCHAR(120) NOT NULL,
    "sellerCountryCode" CHAR(2) NOT NULL,
    "sellerKvKNumber" VARCHAR(20) NOT NULL,
    "sellerVatId" VARCHAR(40) NOT NULL,
    "customerOrganizationName" VARCHAR(200) NOT NULL,
    "customerAddressLine" VARCHAR(200) NOT NULL,
    "customerPostalCode" VARCHAR(20) NOT NULL,
    "customerCity" VARCHAR(120) NOT NULL,
    "customerCountryCode" CHAR(2) NOT NULL,
    "customerKvKNumber" VARCHAR(20),
    "customerVatId" VARCHAR(40),
    "packageSku" VARCHAR(40) NOT NULL,
    "packageLabel" VARCHAR(120) NOT NULL,
    "credits" INTEGER NOT NULL,
    "baseAmountCents" INTEGER NOT NULL,
    "packageDiscountCents" INTEGER NOT NULL,
    "proDiscountCents" INTEGER NOT NULL,
    "discountCodeDiscountCents" INTEGER NOT NULL,
    "amountExclVatCents" INTEGER NOT NULL,
    "vatRateBps" INTEGER NOT NULL,
    "vatAmountCents" INTEGER NOT NULL,
    "amountInclVatCents" INTEGER NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "molliePaymentId" VARCHAR(80),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FinancialInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinancialJorttSync" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "invoiceId" UUID NOT NULL,
    "status" "FinancialSyncStatus" NOT NULL DEFAULT 'PENDING',
    "externalReference" VARCHAR(160),
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" TIMESTAMPTZ(3),
    "lastErrorCode" VARCHAR(80),
    "syncedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "FinancialJorttSync_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinancialJorttSyncAttempt" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "syncId" UUID NOT NULL,
    "attemptNumber" INTEGER NOT NULL,
    "status" "FinancialSyncStatus" NOT NULL,
    "errorCode" VARCHAR(80),
    "externalReference" VARCHAR(160),
    "idempotencyKey" VARCHAR(160) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FinancialJorttSyncAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiscountCode" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" VARCHAR(40) NOT NULL,
    "status" "DiscountCodeStatus" NOT NULL DEFAULT 'ACTIVE',
    "validFrom" TIMESTAMPTZ(3) NOT NULL,
    "validUntil" TIMESTAMPTZ(3),
    "maximumUses" INTEGER,
    "oncePerOrganization" BOOLEAN NOT NULL DEFAULT false,
    "newCustomersOnly" BOOLEAN NOT NULL DEFAULT false,
    "applicablePackageSkus" TEXT[],
    "minimumAmountCents" INTEGER,
    "percentageBps" INTEGER,
    "fixedAmountCents" INTEGER,
    "bonusCredits" INTEGER NOT NULL DEFAULT 0,
    "createdByUserId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "DiscountCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiscountRedemption" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "discountCodeId" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "purchaseId" UUID NOT NULL,
    "status" "DiscountRedemptionStatus" NOT NULL DEFAULT 'RESERVED',
    "discountCents" INTEGER NOT NULL,
    "bonusCredits" INTEGER NOT NULL DEFAULT 0,
    "idempotencyKey" VARCHAR(160) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "appliedAt" TIMESTAMPTZ(3),
    "releasedAt" TIMESTAMPTZ(3),

    CONSTRAINT "DiscountRedemption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StarterBenefitReview" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "reviewedByUserId" UUID NOT NULL,
    "decision" "StarterBenefitDecision" NOT NULL,
    "evidenceSource" "StarterBenefitEvidenceSource" NOT NULL,
    "chamberOfCommerceDate" DATE,
    "chamberOfCommerceHash" CHAR(64) NOT NULL,
    "ibanHash" CHAR(64),
    "accountIdentityHash" CHAR(64) NOT NULL,
    "nameCityHash" CHAR(64) NOT NULL,
    "emailDomainHash" CHAR(64),
    "reason" VARCHAR(500) NOT NULL,
    "idempotencyKey" VARCHAR(160) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StarterBenefitReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StarterBenefitGrant" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "reviewId" UUID NOT NULL,
    "grantedByUserId" UUID NOT NULL,
    "credits" INTEGER NOT NULL DEFAULT 25,
    "chamberOfCommerceHash" CHAR(64) NOT NULL,
    "ledgerTransactionId" UUID NOT NULL,
    "idempotencyKey" VARCHAR(160) NOT NULL,
    "grantedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StarterBenefitGrant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProfessionalSubscription" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "status" "ProfessionalSubscriptionStatus" NOT NULL DEFAULT 'PENDING_MANDATE',
    "planCode" VARCHAR(40) NOT NULL,
    "planLabel" VARCHAR(120) NOT NULL,
    "amountExclVatCents" INTEGER NOT NULL,
    "vatRateBps" INTEGER NOT NULL,
    "vatAmountCents" INTEGER NOT NULL,
    "amountInclVatCents" INTEGER NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "mollieCustomerId" VARCHAR(80),
    "mollieMandateId" VARCHAR(80),
    "mollieSubscriptionId" VARCHAR(80),
    "firstPaymentPurchaseId" UUID,
    "currentPeriodStart" TIMESTAMPTZ(3),
    "currentPeriodEnd" TIMESTAMPTZ(3),
    "pastDueAt" TIMESTAMPTZ(3),
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "activatedAt" TIMESTAMPTZ(3),
    "suspendedAt" TIMESTAMPTZ(3),
    "canceledAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "ProfessionalSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProfessionalSubscriptionPayment" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "subscriptionId" UUID NOT NULL,
    "molliePaymentId" VARCHAR(80) NOT NULL,
    "status" "FinancialPaymentStatus" NOT NULL,
    "amountExclVatCents" INTEGER NOT NULL,
    "vatRateBps" INTEGER NOT NULL,
    "vatAmountCents" INTEGER NOT NULL,
    "amountInclVatCents" INTEGER NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "periodStart" TIMESTAMPTZ(3),
    "periodEnd" TIMESTAMPTZ(3),
    "payloadFingerprint" CHAR(64) NOT NULL,
    "idempotencyKey" VARCHAR(160) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProfessionalSubscriptionPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinancialEvent" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "actorUserId" UUID,
    "purchaseId" UUID,
    "invoiceId" UUID,
    "subscriptionId" UUID,
    "eventType" VARCHAR(100) NOT NULL,
    "result" VARCHAR(80) NOT NULL,
    "reason" VARCHAR(500),
    "metadata" JSONB,
    "idempotencyKey" VARCHAR(160) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FinancialEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FinancialPurchase_molliePaymentId_key" ON "FinancialPurchase"("molliePaymentId");

-- CreateIndex
CREATE UNIQUE INDEX "FinancialPurchase_creditedTransactionId_key" ON "FinancialPurchase"("creditedTransactionId");

-- CreateIndex
CREATE UNIQUE INDEX "FinancialPurchase_idempotencyKey_key" ON "FinancialPurchase"("idempotencyKey");

-- CreateIndex
CREATE INDEX "FinancialPurchase_organizationId_createdAt_idx" ON "FinancialPurchase"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "FinancialPurchase_status_createdAt_idx" ON "FinancialPurchase"("status", "createdAt");

-- CreateIndex
CREATE INDEX "FinancialPurchase_discountCodeId_idx" ON "FinancialPurchase"("discountCodeId");

-- CreateIndex
CREATE UNIQUE INDEX "FinancialPaymentEvent_idempotencyKey_key" ON "FinancialPaymentEvent"("idempotencyKey");

-- CreateIndex
CREATE INDEX "FinancialPaymentEvent_purchaseId_createdAt_idx" ON "FinancialPaymentEvent"("purchaseId", "createdAt");

-- CreateIndex
CREATE INDEX "FinancialPaymentEvent_molliePaymentId_createdAt_idx" ON "FinancialPaymentEvent"("molliePaymentId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "FinancialRefund_mollieRefundId_key" ON "FinancialRefund"("mollieRefundId");

-- CreateIndex
CREATE UNIQUE INDEX "FinancialRefund_ledgerTransactionId_key" ON "FinancialRefund"("ledgerTransactionId");

-- CreateIndex
CREATE UNIQUE INDEX "FinancialRefund_idempotencyKey_key" ON "FinancialRefund"("idempotencyKey");

-- CreateIndex
CREATE INDEX "FinancialRefund_purchaseId_requestedAt_idx" ON "FinancialRefund"("purchaseId", "requestedAt");

-- CreateIndex
CREATE INDEX "FinancialRefund_status_requestedAt_idx" ON "FinancialRefund"("status", "requestedAt");

-- CreateIndex
CREATE UNIQUE INDEX "FinancialInvoice_invoiceNumber_key" ON "FinancialInvoice"("invoiceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "FinancialInvoice_sequenceNumber_key" ON "FinancialInvoice"("sequenceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "FinancialInvoice_purchaseId_key" ON "FinancialInvoice"("purchaseId");

-- CreateIndex
CREATE UNIQUE INDEX "FinancialInvoice_refundId_key" ON "FinancialInvoice"("refundId");

-- CreateIndex
CREATE UNIQUE INDEX "FinancialInvoice_subscriptionPaymentId_key" ON "FinancialInvoice"("subscriptionPaymentId");

-- CreateIndex
CREATE INDEX "FinancialInvoice_organizationId_issuedAt_idx" ON "FinancialInvoice"("organizationId", "issuedAt");

-- CreateIndex
CREATE INDEX "FinancialInvoice_documentType_issuedAt_idx" ON "FinancialInvoice"("documentType", "issuedAt");

-- CreateIndex
CREATE INDEX "FinancialInvoice_originalInvoiceId_idx" ON "FinancialInvoice"("originalInvoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "FinancialJorttSync_invoiceId_key" ON "FinancialJorttSync"("invoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "FinancialJorttSync_externalReference_key" ON "FinancialJorttSync"("externalReference");

-- CreateIndex
CREATE INDEX "FinancialJorttSync_status_nextAttemptAt_idx" ON "FinancialJorttSync"("status", "nextAttemptAt");

-- CreateIndex
CREATE UNIQUE INDEX "FinancialJorttSyncAttempt_idempotencyKey_key" ON "FinancialJorttSyncAttempt"("idempotencyKey");

-- CreateIndex
CREATE INDEX "FinancialJorttSyncAttempt_status_createdAt_idx" ON "FinancialJorttSyncAttempt"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "FinancialJorttSyncAttempt_syncId_attemptNumber_key" ON "FinancialJorttSyncAttempt"("syncId", "attemptNumber");

-- CreateIndex
CREATE UNIQUE INDEX "DiscountCode_code_key" ON "DiscountCode"("code");

-- CreateIndex
CREATE INDEX "DiscountCode_status_validFrom_validUntil_idx" ON "DiscountCode"("status", "validFrom", "validUntil");

-- CreateIndex
CREATE UNIQUE INDEX "DiscountRedemption_purchaseId_key" ON "DiscountRedemption"("purchaseId");

-- CreateIndex
CREATE UNIQUE INDEX "DiscountRedemption_idempotencyKey_key" ON "DiscountRedemption"("idempotencyKey");

-- CreateIndex
CREATE INDEX "DiscountRedemption_discountCodeId_status_idx" ON "DiscountRedemption"("discountCodeId", "status");

-- CreateIndex
CREATE INDEX "DiscountRedemption_organizationId_discountCodeId_status_idx" ON "DiscountRedemption"("organizationId", "discountCodeId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "StarterBenefitReview_idempotencyKey_key" ON "StarterBenefitReview"("idempotencyKey");

-- CreateIndex
CREATE INDEX "StarterBenefitReview_organizationId_createdAt_idx" ON "StarterBenefitReview"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "StarterBenefitReview_decision_createdAt_idx" ON "StarterBenefitReview"("decision", "createdAt");

-- CreateIndex
CREATE INDEX "StarterBenefitReview_chamberOfCommerceHash_idx" ON "StarterBenefitReview"("chamberOfCommerceHash");

-- CreateIndex
CREATE UNIQUE INDEX "StarterBenefitGrant_organizationId_key" ON "StarterBenefitGrant"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "StarterBenefitGrant_reviewId_key" ON "StarterBenefitGrant"("reviewId");

-- CreateIndex
CREATE UNIQUE INDEX "StarterBenefitGrant_chamberOfCommerceHash_key" ON "StarterBenefitGrant"("chamberOfCommerceHash");

-- CreateIndex
CREATE UNIQUE INDEX "StarterBenefitGrant_ledgerTransactionId_key" ON "StarterBenefitGrant"("ledgerTransactionId");

-- CreateIndex
CREATE UNIQUE INDEX "StarterBenefitGrant_idempotencyKey_key" ON "StarterBenefitGrant"("idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "ProfessionalSubscription_organizationId_key" ON "ProfessionalSubscription"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "ProfessionalSubscription_mollieCustomerId_key" ON "ProfessionalSubscription"("mollieCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "ProfessionalSubscription_mollieSubscriptionId_key" ON "ProfessionalSubscription"("mollieSubscriptionId");

-- CreateIndex
CREATE UNIQUE INDEX "ProfessionalSubscription_firstPaymentPurchaseId_key" ON "ProfessionalSubscription"("firstPaymentPurchaseId");

-- CreateIndex
CREATE INDEX "ProfessionalSubscription_status_updatedAt_idx" ON "ProfessionalSubscription"("status", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ProfessionalSubscriptionPayment_idempotencyKey_key" ON "ProfessionalSubscriptionPayment"("idempotencyKey");

-- CreateIndex
CREATE INDEX "ProfessionalSubscriptionPayment_subscriptionId_createdAt_idx" ON "ProfessionalSubscriptionPayment"("subscriptionId", "createdAt");

-- CreateIndex
CREATE INDEX "ProfessionalSubscriptionPayment_molliePaymentId_createdAt_idx" ON "ProfessionalSubscriptionPayment"("molliePaymentId", "createdAt");

-- CreateIndex
CREATE INDEX "ProfessionalSubscriptionPayment_status_createdAt_idx" ON "ProfessionalSubscriptionPayment"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "FinancialEvent_idempotencyKey_key" ON "FinancialEvent"("idempotencyKey");

-- CreateIndex
CREATE INDEX "FinancialEvent_purchaseId_createdAt_idx" ON "FinancialEvent"("purchaseId", "createdAt");

-- CreateIndex
CREATE INDEX "FinancialEvent_invoiceId_createdAt_idx" ON "FinancialEvent"("invoiceId", "createdAt");

-- CreateIndex
CREATE INDEX "FinancialEvent_subscriptionId_createdAt_idx" ON "FinancialEvent"("subscriptionId", "createdAt");

-- CreateIndex
CREATE INDEX "FinancialEvent_eventType_createdAt_idx" ON "FinancialEvent"("eventType", "createdAt");

-- AddForeignKey
ALTER TABLE "FinancialPurchase" ADD CONSTRAINT "FinancialPurchase_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialPurchase" ADD CONSTRAINT "FinancialPurchase_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialPurchase" ADD CONSTRAINT "FinancialPurchase_discountCodeId_fkey" FOREIGN KEY ("discountCodeId") REFERENCES "DiscountCode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialPurchase" ADD CONSTRAINT "FinancialPurchase_creditedTransactionId_fkey" FOREIGN KEY ("creditedTransactionId") REFERENCES "CreditTransaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialPaymentEvent" ADD CONSTRAINT "FinancialPaymentEvent_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "FinancialPurchase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialRefund" ADD CONSTRAINT "FinancialRefund_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "FinancialPurchase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialRefund" ADD CONSTRAINT "FinancialRefund_approvedByUserId_fkey" FOREIGN KEY ("approvedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialRefund" ADD CONSTRAINT "FinancialRefund_ledgerTransactionId_fkey" FOREIGN KEY ("ledgerTransactionId") REFERENCES "CreditTransaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialInvoice" ADD CONSTRAINT "FinancialInvoice_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialInvoice" ADD CONSTRAINT "FinancialInvoice_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "FinancialPurchase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialInvoice" ADD CONSTRAINT "FinancialInvoice_refundId_fkey" FOREIGN KEY ("refundId") REFERENCES "FinancialRefund"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialInvoice" ADD CONSTRAINT "FinancialInvoice_subscriptionPaymentId_fkey" FOREIGN KEY ("subscriptionPaymentId") REFERENCES "ProfessionalSubscriptionPayment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialInvoice" ADD CONSTRAINT "FinancialInvoice_originalInvoiceId_fkey" FOREIGN KEY ("originalInvoiceId") REFERENCES "FinancialInvoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialJorttSync" ADD CONSTRAINT "FinancialJorttSync_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "FinancialInvoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialJorttSyncAttempt" ADD CONSTRAINT "FinancialJorttSyncAttempt_syncId_fkey" FOREIGN KEY ("syncId") REFERENCES "FinancialJorttSync"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscountCode" ADD CONSTRAINT "DiscountCode_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscountRedemption" ADD CONSTRAINT "DiscountRedemption_discountCodeId_fkey" FOREIGN KEY ("discountCodeId") REFERENCES "DiscountCode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscountRedemption" ADD CONSTRAINT "DiscountRedemption_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscountRedemption" ADD CONSTRAINT "DiscountRedemption_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "FinancialPurchase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StarterBenefitReview" ADD CONSTRAINT "StarterBenefitReview_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StarterBenefitReview" ADD CONSTRAINT "StarterBenefitReview_reviewedByUserId_fkey" FOREIGN KEY ("reviewedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StarterBenefitGrant" ADD CONSTRAINT "StarterBenefitGrant_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StarterBenefitGrant" ADD CONSTRAINT "StarterBenefitGrant_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "StarterBenefitReview"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StarterBenefitGrant" ADD CONSTRAINT "StarterBenefitGrant_grantedByUserId_fkey" FOREIGN KEY ("grantedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StarterBenefitGrant" ADD CONSTRAINT "StarterBenefitGrant_ledgerTransactionId_fkey" FOREIGN KEY ("ledgerTransactionId") REFERENCES "CreditTransaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfessionalSubscription" ADD CONSTRAINT "ProfessionalSubscription_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfessionalSubscription" ADD CONSTRAINT "ProfessionalSubscription_firstPaymentPurchaseId_fkey" FOREIGN KEY ("firstPaymentPurchaseId") REFERENCES "FinancialPurchase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfessionalSubscriptionPayment" ADD CONSTRAINT "ProfessionalSubscriptionPayment_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "ProfessionalSubscription"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialEvent" ADD CONSTRAINT "FinancialEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialEvent" ADD CONSTRAINT "FinancialEvent_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "FinancialPurchase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialEvent" ADD CONSTRAINT "FinancialEvent_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "FinancialInvoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialEvent" ADD CONSTRAINT "FinancialEvent_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "ProfessionalSubscription"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Financial integrity constraints
ALTER TABLE "FinancialPurchase" ADD CONSTRAINT "FinancialPurchase_amounts_check" CHECK (
  "credits" >= 0 AND "baseAmountCents" >= 0 AND "packageDiscountCents" >= 0 AND "proDiscountCents" >= 0
  AND "discountCodeDiscountCents" >= 0 AND "amountExclVatCents" >= 0 AND "vatRateBps" BETWEEN 0 AND 10000
  AND "vatAmountCents" >= 0 AND "amountInclVatCents" = "amountExclVatCents" + "vatAmountCents"
  AND "amountExclVatCents" = "baseAmountCents" - "packageDiscountCents" - "proDiscountCents" - "discountCodeDiscountCents"
  AND "currency" = 'EUR'
);
ALTER TABLE "FinancialPurchase" ADD CONSTRAINT "FinancialPurchase_kind_credits_check" CHECK (
  ("kind" = 'CREDIT_PACKAGE' AND "credits" > 0) OR ("kind" = 'PRO_SUBSCRIPTION' AND "credits" = 0)
);
ALTER TABLE "FinancialPaymentEvent" ADD CONSTRAINT "FinancialPaymentEvent_amount_check" CHECK ("amountCents" >= 0 AND "currency" = 'EUR');
ALTER TABLE "FinancialRefund" ADD CONSTRAINT "FinancialRefund_amount_check" CHECK ("amountCents" > 0 AND "credits" > 0);
ALTER TABLE "FinancialInvoiceCounter" ADD CONSTRAINT "FinancialInvoiceCounter_singleton_check" CHECK ("id" = 1 AND "nextNumber" > 0);
ALTER TABLE "FinancialInvoice" ADD CONSTRAINT "FinancialInvoice_totals_check" CHECK (
  "vatRateBps" BETWEEN 0 AND 10000 AND "amountInclVatCents" = "amountExclVatCents" + "vatAmountCents" AND "currency" = 'EUR'
  AND (("documentType" = 'INVOICE' AND "credits" >= 0 AND "amountExclVatCents" >= 0 AND "vatAmountCents" >= 0 AND "amountInclVatCents" >= 0)
    OR ("documentType" = 'CREDIT_NOTE' AND "credits" <= 0 AND "amountExclVatCents" <= 0 AND "vatAmountCents" <= 0 AND "amountInclVatCents" <= 0))
);
ALTER TABLE "FinancialInvoice" ADD CONSTRAINT "FinancialInvoice_source_check" CHECK (
  ("documentType" = 'INVOICE' AND num_nonnulls("purchaseId", "subscriptionPaymentId") = 1 AND "refundId" IS NULL)
  OR ("documentType" = 'CREDIT_NOTE' AND "refundId" IS NOT NULL AND "purchaseId" IS NULL AND "subscriptionPaymentId" IS NULL)
);
ALTER TABLE "DiscountCode" ADD CONSTRAINT "DiscountCode_configuration_check" CHECK (
  ("validUntil" IS NULL OR "validUntil" > "validFrom") AND ("maximumUses" IS NULL OR "maximumUses" > 0)
  AND ("minimumAmountCents" IS NULL OR "minimumAmountCents" >= 0)
  AND ("percentageBps" IS NULL OR "percentageBps" BETWEEN 1 AND 10000)
  AND ("fixedAmountCents" IS NULL OR "fixedAmountCents" > 0) AND "bonusCredits" >= 0
  AND ((CASE WHEN "percentageBps" IS NULL THEN 0 ELSE 1 END) + (CASE WHEN "fixedAmountCents" IS NULL THEN 0 ELSE 1 END) + (CASE WHEN "bonusCredits" > 0 THEN 1 ELSE 0 END) = 1)
);
ALTER TABLE "DiscountRedemption" ADD CONSTRAINT "DiscountRedemption_values_check" CHECK ("discountCents" >= 0 AND "bonusCredits" >= 0);
ALTER TABLE "StarterBenefitGrant" ADD CONSTRAINT "StarterBenefitGrant_credits_check" CHECK ("credits" = 25);
ALTER TABLE "ProfessionalSubscription" ADD CONSTRAINT "ProfessionalSubscription_amounts_check" CHECK (
  "amountExclVatCents" > 0 AND "vatRateBps" BETWEEN 0 AND 10000 AND "vatAmountCents" >= 0
  AND "amountInclVatCents" = "amountExclVatCents" + "vatAmountCents" AND "currency" = 'EUR' AND "retryCount" >= 0
);
ALTER TABLE "ProfessionalSubscriptionPayment" ADD CONSTRAINT "ProfessionalSubscriptionPayment_amounts_check" CHECK (
  "amountExclVatCents" > 0 AND "vatRateBps" BETWEEN 0 AND 10000 AND "vatAmountCents" >= 0
  AND "amountInclVatCents" = "amountExclVatCents" + "vatAmountCents" AND "currency" = 'EUR'
);

CREATE OR REPLACE FUNCTION "financial_immutable_record"() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'financial history records are immutable';
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION "financial_protect_purchase_snapshot"() RETURNS trigger AS $$
BEGIN
  IF ROW(NEW."organizationId", NEW."createdByUserId", NEW."kind", NEW."packageSku", NEW."packageLabel", NEW."credits",
    NEW."baseAmountCents", NEW."packageDiscountCents", NEW."proDiscountCents", NEW."discountCodeDiscountCents",
    NEW."amountExclVatCents", NEW."vatRateBps", NEW."vatAmountCents", NEW."amountInclVatCents", NEW."currency",
    NEW."discountCodeId", NEW."discountCodeSnapshot", NEW."billingOrganizationName", NEW."billingAddressLine",
    NEW."billingPostalCode", NEW."billingCity", NEW."billingCountryCode", NEW."billingKvKNumber", NEW."billingVatId",
    NEW."idempotencyKey", NEW."createdAt") IS DISTINCT FROM ROW(OLD."organizationId", OLD."createdByUserId", OLD."kind",
    OLD."packageSku", OLD."packageLabel", OLD."credits", OLD."baseAmountCents", OLD."packageDiscountCents",
    OLD."proDiscountCents", OLD."discountCodeDiscountCents", OLD."amountExclVatCents", OLD."vatRateBps",
    OLD."vatAmountCents", OLD."amountInclVatCents", OLD."currency", OLD."discountCodeId", OLD."discountCodeSnapshot",
    OLD."billingOrganizationName", OLD."billingAddressLine", OLD."billingPostalCode", OLD."billingCity",
    OLD."billingCountryCode", OLD."billingKvKNumber", OLD."billingVatId", OLD."idempotencyKey", OLD."createdAt") THEN
    RAISE EXCEPTION 'financial purchase snapshot is immutable';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION "financial_protect_subscription_snapshot"() RETURNS trigger AS $$
BEGIN
  IF ROW(NEW."organizationId", NEW."planCode", NEW."planLabel", NEW."amountExclVatCents", NEW."vatRateBps",
    NEW."vatAmountCents", NEW."amountInclVatCents", NEW."currency", NEW."firstPaymentPurchaseId", NEW."createdAt")
    IS DISTINCT FROM ROW(OLD."organizationId", OLD."planCode", OLD."planLabel", OLD."amountExclVatCents", OLD."vatRateBps",
    OLD."vatAmountCents", OLD."amountInclVatCents", OLD."currency", OLD."firstPaymentPurchaseId", OLD."createdAt") THEN
    RAISE EXCEPTION 'subscription financial snapshot is immutable';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "FinancialPaymentEvent_immutable" BEFORE UPDATE OR DELETE ON "FinancialPaymentEvent" FOR EACH ROW EXECUTE FUNCTION "financial_immutable_record"();
CREATE TRIGGER "FinancialInvoice_immutable" BEFORE UPDATE OR DELETE ON "FinancialInvoice" FOR EACH ROW EXECUTE FUNCTION "financial_immutable_record"();
CREATE TRIGGER "FinancialJorttSyncAttempt_immutable" BEFORE UPDATE OR DELETE ON "FinancialJorttSyncAttempt" FOR EACH ROW EXECUTE FUNCTION "financial_immutable_record"();
CREATE TRIGGER "StarterBenefitReview_immutable" BEFORE UPDATE OR DELETE ON "StarterBenefitReview" FOR EACH ROW EXECUTE FUNCTION "financial_immutable_record"();
CREATE TRIGGER "StarterBenefitGrant_immutable" BEFORE UPDATE OR DELETE ON "StarterBenefitGrant" FOR EACH ROW EXECUTE FUNCTION "financial_immutable_record"();
CREATE TRIGGER "ProfessionalSubscriptionPayment_immutable" BEFORE UPDATE OR DELETE ON "ProfessionalSubscriptionPayment" FOR EACH ROW EXECUTE FUNCTION "financial_immutable_record"();
CREATE TRIGGER "FinancialEvent_immutable" BEFORE UPDATE OR DELETE ON "FinancialEvent" FOR EACH ROW EXECUTE FUNCTION "financial_immutable_record"();
CREATE TRIGGER "FinancialPurchase_snapshot_immutable" BEFORE UPDATE ON "FinancialPurchase" FOR EACH ROW EXECUTE FUNCTION "financial_protect_purchase_snapshot"();
CREATE TRIGGER "ProfessionalSubscription_snapshot_immutable" BEFORE UPDATE ON "ProfessionalSubscription" FOR EACH ROW EXECUTE FUNCTION "financial_protect_subscription_snapshot"();
