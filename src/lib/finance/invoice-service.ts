import 'server-only'

import { Prisma } from '@/generated/prisma/client'
import { MOLLIE_SANDBOX_ACCEPTANCE_PRICING } from './mollie-test-pricing'
import { WORKMATCHR_SELLER } from './financial-contract'

type Transaction = Prisma.TransactionClient

function dutchDateParts(value: Date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Amsterdam',
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(value)
  return {
    year: parts.find((part) => part.type === 'year')?.value ?? String(value.getUTCFullYear()),
    month: parts.find((part) => part.type === 'month')?.value ?? String(value.getUTCMonth() + 1).padStart(2, '0'),
  }
}

export function formatFinancialDocumentNumber(sequence: number, issuedAt: Date) {
  if (!Number.isSafeInteger(sequence) || sequence < 1) throw new Error('INVALID_INVOICE_SEQUENCE')
  const { year, month } = dutchDateParts(issuedAt)
  return `WM-${year.slice(-2)}${month}5${String(sequence).padStart(3, '0')}`
}

async function allocateInvoiceSequence(transaction: Transaction) {
  await transaction.$queryRaw(Prisma.sql`SELECT pg_advisory_xact_lock(hashtextextended('financial-invoice-counter', 0))::text AS "lock"`)
  await transaction.$executeRaw(Prisma.sql`
    INSERT INTO "FinancialInvoiceCounter" ("id", "nextNumber", "updatedAt")
    VALUES (1, 1, NOW())
    ON CONFLICT ("id") DO NOTHING
  `)
  const [counter] = await transaction.$queryRaw<Array<{ nextNumber: number }>>(Prisma.sql`
    SELECT "nextNumber" FROM "FinancialInvoiceCounter" WHERE "id" = 1 FOR UPDATE
  `)
  if (!counter) throw new Error('INVOICE_COUNTER_UNAVAILABLE')
  await transaction.financialInvoiceCounter.update({ where: { id: 1 }, data: { nextNumber: counter.nextNumber + 1 } })
  return counter.nextNumber
}

export async function issueInvoiceForPaidPurchase(
  transaction: Transaction,
  purchaseId: string,
  issuedAt = new Date(),
) {
  const existing = await transaction.financialInvoice.findUnique({ where: { purchaseId } })
  if (existing) return existing
  const purchase = await transaction.financialPurchase.findUnique({ where: { id: purchaseId } })
  if (!purchase || purchase.status !== 'PAID' || !purchase.molliePaymentId) throw new Error('PAID_PURCHASE_REQUIRED')
  const sequenceNumber = await allocateInvoiceSequence(transaction)
  const invoice = await transaction.financialInvoice.create({
    data: {
      documentType: 'INVOICE',
      pricingMode: purchase.pricingMode,
      invoiceNumber: formatFinancialDocumentNumber(sequenceNumber, issuedAt),
      sequenceNumber,
      purchaseId: purchase.id,
      organizationId: purchase.organizationId,
      issuedAt,
      sellerLegalName: WORKMATCHR_SELLER.legalName,
      sellerTradeName: WORKMATCHR_SELLER.tradeName,
      sellerAddressLine: WORKMATCHR_SELLER.addressLine,
      sellerPostalCode: WORKMATCHR_SELLER.postalCode,
      sellerCity: WORKMATCHR_SELLER.city,
      sellerCountryCode: WORKMATCHR_SELLER.countryCode,
      sellerKvKNumber: WORKMATCHR_SELLER.chamberOfCommerceNumber,
      sellerVatId: WORKMATCHR_SELLER.vatId,
      customerOrganizationName: purchase.billingOrganizationName,
      customerAddressLine: purchase.billingAddressLine,
      customerPostalCode: purchase.billingPostalCode,
      customerCity: purchase.billingCity,
      customerCountryCode: purchase.billingCountryCode,
      customerKvKNumber: purchase.billingKvKNumber,
      customerVatId: purchase.billingVatId,
      packageSku: purchase.packageSku,
      packageLabel: purchase.packageLabel,
      credits: purchase.credits,
      baseAmountCents: purchase.baseAmountCents,
      packageDiscountCents: purchase.packageDiscountCents,
      proDiscountCents: purchase.proDiscountCents,
      discountCodeDiscountCents: purchase.discountCodeDiscountCents,
      amountExclVatCents: purchase.amountExclVatCents,
      vatRateBps: purchase.vatRateBps,
      vatAmountCents: purchase.vatAmountCents,
      amountInclVatCents: purchase.amountInclVatCents,
      currency: purchase.currency,
      molliePaymentId: purchase.molliePaymentId,
    },
  })
  await transaction.financialJorttSync.create({ data: { invoiceId: invoice.id } })
  await transaction.financialEvent.create({
    data: {
      actorUserId: purchase.createdByUserId,
      purchaseId: purchase.id,
      invoiceId: invoice.id,
      eventType: 'INVOICE_ISSUED',
      result: 'SUCCEEDED',
      idempotencyKey: `invoice-issued:${purchase.id}`,
      metadata: {
        invoiceNumber: invoice.invoiceNumber,
        sequenceNumber,
        pricingMode: invoice.pricingMode,
        pricingPolicy: invoice.pricingMode === 'MOLLIE_TEST_ACCEPTANCE'
          ? MOLLIE_SANDBOX_ACCEPTANCE_PRICING
          : 'STANDARD',
        amountExclVatCents: invoice.amountExclVatCents,
        vatAmountCents: invoice.vatAmountCents,
        amountInclVatCents: invoice.amountInclVatCents,
        currency: invoice.currency,
      },
    },
  })
  return invoice
}

export async function issueCreditNoteForCompletedRefund(
  transaction: Transaction,
  refundId: string,
  issuedAt = new Date(),
) {
  const existing = await transaction.financialInvoice.findUnique({ where: { refundId } })
  if (existing) return existing
  const refund = await transaction.financialRefund.findUnique({
    where: { id: refundId },
    include: { purchase: { include: { invoice: true } } },
  })
  if (!refund || refund.status !== 'REFUNDED' || !refund.purchase.invoice) throw new Error('COMPLETED_REFUND_REQUIRED')
  const original = refund.purchase.invoice
  const sequenceNumber = await allocateInvoiceSequence(transaction)
  const ratio = refund.amountCents / refund.purchase.amountInclVatCents
  const scale = (value: number) => -Math.round(value * ratio)
  const invoice = await transaction.financialInvoice.create({
    data: {
      documentType: 'CREDIT_NOTE',
      pricingMode: original.pricingMode,
      invoiceNumber: formatFinancialDocumentNumber(sequenceNumber, issuedAt),
      sequenceNumber,
      refundId: refund.id,
      originalInvoiceId: original.id,
      organizationId: original.organizationId,
      issuedAt,
      sellerLegalName: original.sellerLegalName,
      sellerTradeName: original.sellerTradeName,
      sellerAddressLine: original.sellerAddressLine,
      sellerPostalCode: original.sellerPostalCode,
      sellerCity: original.sellerCity,
      sellerCountryCode: original.sellerCountryCode,
      sellerKvKNumber: original.sellerKvKNumber,
      sellerVatId: original.sellerVatId,
      customerOrganizationName: original.customerOrganizationName,
      customerAddressLine: original.customerAddressLine,
      customerPostalCode: original.customerPostalCode,
      customerCity: original.customerCity,
      customerCountryCode: original.customerCountryCode,
      customerKvKNumber: original.customerKvKNumber,
      customerVatId: original.customerVatId,
      packageSku: original.packageSku,
      packageLabel: `Correctie ${original.packageLabel}`,
      credits: -refund.credits,
      baseAmountCents: scale(original.baseAmountCents),
      packageDiscountCents: scale(original.packageDiscountCents),
      proDiscountCents: scale(original.proDiscountCents),
      discountCodeDiscountCents: scale(original.discountCodeDiscountCents),
      amountExclVatCents: scale(original.amountExclVatCents),
      vatRateBps: original.vatRateBps,
      vatAmountCents: scale(original.vatAmountCents),
      amountInclVatCents: -refund.amountCents,
      currency: original.currency,
      molliePaymentId: original.molliePaymentId,
    },
  })
  await transaction.financialJorttSync.create({ data: { invoiceId: invoice.id } })
  return invoice
}

export async function issueInvoiceForPaidSubscriptionPayment(
  transaction: Transaction,
  subscriptionPaymentId: string,
  issuedAt = new Date(),
) {
  const existing = await transaction.financialInvoice.findUnique({ where: { subscriptionPaymentId } })
  if (existing) return existing
  const payment = await transaction.professionalSubscriptionPayment.findUnique({
    where: { id: subscriptionPaymentId },
    include: {
      subscription: {
        include: { firstPaymentPurchase: { include: { invoice: true } } },
      },
    },
  })
  const customerSnapshot = payment?.subscription.firstPaymentPurchase?.invoice
  if (!payment || payment.status !== 'PAID' || !customerSnapshot) {
    throw new Error('PAID_SUBSCRIPTION_PAYMENT_WITH_CUSTOMER_SNAPSHOT_REQUIRED')
  }
  const sequenceNumber = await allocateInvoiceSequence(transaction)
  const invoice = await transaction.financialInvoice.create({
    data: {
      documentType: 'INVOICE',
      pricingMode: 'STANDARD',
      invoiceNumber: formatFinancialDocumentNumber(sequenceNumber, issuedAt),
      sequenceNumber,
      subscriptionPaymentId: payment.id,
      organizationId: payment.subscription.organizationId,
      issuedAt,
      sellerLegalName: WORKMATCHR_SELLER.legalName,
      sellerTradeName: WORKMATCHR_SELLER.tradeName,
      sellerAddressLine: WORKMATCHR_SELLER.addressLine,
      sellerPostalCode: WORKMATCHR_SELLER.postalCode,
      sellerCity: WORKMATCHR_SELLER.city,
      sellerCountryCode: WORKMATCHR_SELLER.countryCode,
      sellerKvKNumber: WORKMATCHR_SELLER.chamberOfCommerceNumber,
      sellerVatId: WORKMATCHR_SELLER.vatId,
      customerOrganizationName: customerSnapshot.customerOrganizationName,
      customerAddressLine: customerSnapshot.customerAddressLine,
      customerPostalCode: customerSnapshot.customerPostalCode,
      customerCity: customerSnapshot.customerCity,
      customerCountryCode: customerSnapshot.customerCountryCode,
      customerKvKNumber: customerSnapshot.customerKvKNumber,
      customerVatId: customerSnapshot.customerVatId,
      packageSku: payment.subscription.planCode,
      packageLabel: payment.subscription.planLabel,
      credits: 0,
      baseAmountCents: payment.amountExclVatCents,
      packageDiscountCents: 0,
      proDiscountCents: 0,
      discountCodeDiscountCents: 0,
      amountExclVatCents: payment.amountExclVatCents,
      vatRateBps: payment.vatRateBps,
      vatAmountCents: payment.vatAmountCents,
      amountInclVatCents: payment.amountInclVatCents,
      currency: payment.currency,
      molliePaymentId: payment.molliePaymentId,
    },
  })
  await transaction.financialJorttSync.create({ data: { invoiceId: invoice.id } })
  await transaction.financialEvent.create({
    data: {
      subscriptionId: payment.subscriptionId,
      invoiceId: invoice.id,
      eventType: 'PRO_INVOICE_ISSUED',
      result: 'SUCCEEDED',
      idempotencyKey: `pro-invoice-issued:${payment.id}`,
      metadata: { invoiceNumber: invoice.invoiceNumber, sequenceNumber },
    },
  })
  return invoice
}
