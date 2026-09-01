import 'server-only'

import { Prisma } from '@/generated/prisma/client'
import { MOLLIE_SANDBOX_ACCEPTANCE_PRICING } from './mollie-test-pricing'
import { WORKMATCHR_SELLER } from './financial-contract'

type Transaction = Prisma.TransactionClient

type InvoiceV2LineInput = Readonly<{
  description: string
  quantity: number
  unit: string
  unitPriceExclVatCents: number
  discountAmountCents: number
  vatRateBps: number
  vatAmountCents: number
  servicePeriodStart?: Date | null
  servicePeriodEnd?: Date | null
}>

export function addUtcMonth(value: Date) {
  const result = new Date(value)
  result.setUTCMonth(result.getUTCMonth() + 1)
  return result
}

export function buildInvoiceV2Line(input: InvoiceV2LineInput) {
  if (!input.description.trim() || !input.unit.trim() || !Number.isSafeInteger(input.quantity) || input.quantity < 1) {
    throw new Error('INVOICE_V2_LINE_IDENTITY_REQUIRED')
  }
  if (!Number.isSafeInteger(input.unitPriceExclVatCents) || input.unitPriceExclVatCents < 0) {
    throw new Error('INVOICE_V2_UNIT_PRICE_INVALID')
  }
  const grossAmountExclVatCents = input.quantity * input.unitPriceExclVatCents
  const netAmountExclVatCents = grossAmountExclVatCents - input.discountAmountCents
  const amountInclVatCents = netAmountExclVatCents + input.vatAmountCents
  if (input.discountAmountCents < 0 || netAmountExclVatCents < 0 || input.vatAmountCents < 0) {
    throw new Error('INVOICE_V2_LINE_TOTALS_INVALID')
  }
  if ((input.servicePeriodStart && !input.servicePeriodEnd) || (!input.servicePeriodStart && input.servicePeriodEnd)
    || (input.servicePeriodStart && input.servicePeriodEnd && input.servicePeriodEnd <= input.servicePeriodStart)) {
    throw new Error('INVOICE_V2_SERVICE_PERIOD_INVALID')
  }
  return {
    position: 1,
    description: input.description.trim(),
    quantity: input.quantity,
    unit: input.unit.trim(),
    unitPriceExclVatCents: input.unitPriceExclVatCents,
    grossAmountExclVatCents,
    discountAmountCents: input.discountAmountCents,
    netAmountExclVatCents,
    vatRateBps: input.vatRateBps,
    vatAmountCents: input.vatAmountCents,
    amountInclVatCents,
    servicePeriodStart: input.servicePeriodStart ?? null,
    servicePeriodEnd: input.servicePeriodEnd ?? null,
  }
}

function validateCustomerInvoiceName(value: string) {
  const normalized = value.trim()
  if (normalized.length < 2) throw new Error('INVOICE_V2_CUSTOMER_LEGAL_OR_TRADE_NAME_REQUIRED')
  return normalized
}

async function createInvoiceV2Details(transaction: Transaction, invoiceId: string, line: ReturnType<typeof buildInvoiceV2Line>) {
  await transaction.financialInvoiceLine.create({ data: { invoiceId, ...line } })
  await transaction.financialInvoiceVatSummary.create({
    data: {
      invoiceId,
      vatRateBps: line.vatRateBps,
      taxableAmountExclVatCents: line.netAmountExclVatCents,
      vatAmountCents: line.vatAmountCents,
      amountInclVatCents: line.amountInclVatCents,
    },
  })
}

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
  const purchase = await transaction.financialPurchase.findUnique({
    where: { id: purchaseId },
    include: { creditedTransaction: { select: { createdAt: true } } },
  })
  if (!purchase || purchase.status !== 'PAID' || !purchase.molliePaymentId) throw new Error('PAID_PURCHASE_REQUIRED')
  const paidAt = purchase.paidAt
  if (!paidAt) throw new Error('INVOICE_V2_PAYMENT_DATE_REQUIRED')
  const isCredits = purchase.kind === 'CREDIT_PACKAGE'
  const supplyDate = isCredits ? purchase.creditedTransaction?.createdAt : paidAt
  if (!supplyDate) throw new Error('INVOICE_V2_SUPPLY_DATE_REQUIRED')
  const servicePeriodStart = isCredits ? null : paidAt
  const servicePeriodEnd = servicePeriodStart ? addUtcMonth(servicePeriodStart) : null
  if (isCredits && (purchase.credits < 1 || purchase.baseAmountCents % purchase.credits !== 0)) {
    throw new Error('INVOICE_V2_CREDIT_UNIT_PRICE_NOT_EXACT')
  }
  const totalDiscount = purchase.packageDiscountCents + purchase.proDiscountCents + purchase.discountCodeDiscountCents
  const line = buildInvoiceV2Line({
    description: isCredits ? `${purchase.credits} WorkMatchr credits` : 'WorkMatchr Pro',
    quantity: isCredits ? purchase.credits : 1,
    unit: isCredits ? 'credit' : 'maand',
    unitPriceExclVatCents: isCredits ? purchase.baseAmountCents / purchase.credits : purchase.baseAmountCents,
    discountAmountCents: totalDiscount,
    vatRateBps: purchase.vatRateBps,
    vatAmountCents: purchase.vatAmountCents,
    servicePeriodStart,
    servicePeriodEnd,
  })
  if (line.netAmountExclVatCents !== purchase.amountExclVatCents || line.amountInclVatCents !== purchase.amountInclVatCents) {
    throw new Error('INVOICE_V2_PURCHASE_TOTAL_MISMATCH')
  }
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
      snapshotVersion: 2,
      supplyDate,
      advancePaymentDate: paidAt < supplyDate ? paidAt : null,
      servicePeriodStart,
      servicePeriodEnd,
      sellerLegalName: WORKMATCHR_SELLER.legalName,
      sellerTradeName: WORKMATCHR_SELLER.tradeName,
      sellerAddressLine: WORKMATCHR_SELLER.addressLine,
      sellerPostalCode: WORKMATCHR_SELLER.postalCode,
      sellerCity: WORKMATCHR_SELLER.city,
      sellerCountryCode: WORKMATCHR_SELLER.countryCode,
      sellerKvKNumber: WORKMATCHR_SELLER.chamberOfCommerceNumber,
      sellerVatId: WORKMATCHR_SELLER.vatId,
      customerOrganizationName: validateCustomerInvoiceName(purchase.billingOrganizationName),
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
  await createInvoiceV2Details(transaction, invoice.id, line)
  await transaction.financialJorttSync.create({ data: { invoiceId: invoice.id, technicalReference: `workmatchr-invoice:${invoice.id}` } })
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
  await transaction.financialJorttSync.create({ data: { invoiceId: invoice.id, technicalReference: `workmatchr-invoice:${invoice.id}` } })
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
  if (!payment.periodStart || !payment.periodEnd) throw new Error('INVOICE_V2_SERVICE_PERIOD_REQUIRED')
  const line = buildInvoiceV2Line({
    description: 'WorkMatchr Pro', quantity: 1, unit: 'maand',
    unitPriceExclVatCents: payment.amountExclVatCents, discountAmountCents: 0,
    vatRateBps: payment.vatRateBps, vatAmountCents: payment.vatAmountCents,
    servicePeriodStart: payment.periodStart, servicePeriodEnd: payment.periodEnd,
  })
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
      snapshotVersion: 2,
      supplyDate: payment.periodStart,
      advancePaymentDate: issuedAt < payment.periodStart ? issuedAt : null,
      servicePeriodStart: payment.periodStart,
      servicePeriodEnd: payment.periodEnd,
      sellerLegalName: WORKMATCHR_SELLER.legalName,
      sellerTradeName: WORKMATCHR_SELLER.tradeName,
      sellerAddressLine: WORKMATCHR_SELLER.addressLine,
      sellerPostalCode: WORKMATCHR_SELLER.postalCode,
      sellerCity: WORKMATCHR_SELLER.city,
      sellerCountryCode: WORKMATCHR_SELLER.countryCode,
      sellerKvKNumber: WORKMATCHR_SELLER.chamberOfCommerceNumber,
      sellerVatId: WORKMATCHR_SELLER.vatId,
      customerOrganizationName: validateCustomerInvoiceName(customerSnapshot.customerOrganizationName),
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
  await createInvoiceV2Details(transaction, invoice.id, line)
  await transaction.financialJorttSync.create({ data: { invoiceId: invoice.id, technicalReference: `workmatchr-invoice:${invoice.id}` } })
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
