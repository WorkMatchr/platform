import 'server-only'
import { Prisma } from '@/generated/prisma/client'
import { z } from 'zod'
import { requireMarketplacePlatformAdmin } from '@/lib/marketplace/marketplace-authorization'
import { runSerializableFinancialTransaction } from './financial-transaction'
import { allocateInvoiceSequence, formatFinancialDocumentNumber } from './invoice-service'
import { mirrorCreditNoteSnapshot } from './credit-note-snapshot'

const inputSchema = z.object({
  actorUserId: z.string().uuid(), invoiceId: z.string().uuid(),
  amountInclVatCents: z.number().int().positive().max(2_000_000_000),
  reason: z.string().trim().min(10).max(500),
  idempotencyKey: z.string().min(12).max(160).regex(/^[A-Za-z0-9:_-]+$/),
})

/** Allocate from the immutable source, including the final rounding cent exactly once. */
export function allocateProCredit(originalGross: number, originalNet: number, creditedGross: number, creditedNet: number, amount: number) {
  if (![originalGross, originalNet, creditedGross, creditedNet, amount].every(Number.isSafeInteger)
    || originalGross <= 0 || originalNet < 0 || originalNet > originalGross || creditedGross < 0 || creditedNet < 0
    || amount <= 0 || creditedGross + amount > originalGross) throw new Error('PRO_CREDIT_LIMIT_EXCEEDED')
  const cumulative = Number((BigInt(creditedGross + amount) * BigInt(originalNet) * BigInt(2) + BigInt(originalGross)) / (BigInt(2) * BigInt(originalGross)))
  const net = cumulative - creditedNet
  if (net < 0 || net > amount) throw new Error('PRO_CREDIT_ALLOCATION_CONFLICT')
  return { net, vat: amount - net, gross: amount }
}

export async function issueProCredit(input: unknown) {
  const values = inputSchema.parse(input)
  return runSerializableFinancialTransaction(async transaction => {
    await requireMarketplacePlatformAdmin(transaction, values.actorUserId)
    await transaction.$queryRaw(Prisma.sql`SELECT id FROM "FinancialInvoice" WHERE id=${values.invoiceId}::uuid FOR UPDATE`)
    const existing = await transaction.financialInvoice.findUnique({ where: { proCreditKey: values.idempotencyKey } })
    if (existing) {
      if (existing.originalInvoiceId !== values.invoiceId || existing.amountInclVatCents !== -values.amountInclVatCents) throw new Error('PRO_CREDIT_IDEMPOTENCY_CONFLICT')
      return existing
    }
    const original = await transaction.financialInvoice.findUniqueOrThrow({ where: { id: values.invoiceId },
      include: { lines: true, vatSummaries: true, corrections: true, purchase: true, subscriptionPayment: true } })
    mirrorCreditNoteSnapshot(original)
    if (original.credits !== 0 || !original.molliePaymentId || !original.servicePeriodStart || !original.servicePeriodEnd
      || !(original.purchase?.kind === 'PRO_SUBSCRIPTION' && original.purchase.status === 'PAID' || original.subscriptionPayment?.status === 'PAID')
      || original.lines.length !== 1 || original.vatSummaries.length !== 1
      || original.packageDiscountCents + original.proDiscountCents + original.discountCodeDiscountCents !== 0) throw new Error('PAID_PRO_INVOICE_REQUIRED')
    const creditedGross = -original.corrections.reduce((sum, c) => sum + c.amountInclVatCents, 0)
    const creditedNet = -original.corrections.reduce((sum, c) => sum + c.amountExclVatCents, 0)
    const allocation = allocateProCredit(original.amountInclVatCents, original.amountExclVatCents, creditedGross, creditedNet, values.amountInclVatCents)
    const sequenceNumber = await allocateInvoiceSequence(transaction)
    const issuedAt = new Date()
    const invoice = await transaction.financialInvoice.create({ data: {
      documentType: 'CREDIT_NOTE', snapshotVersion: 2, proCreditKey: values.idempotencyKey,
      originalInvoiceId: original.id, organizationId: original.organizationId,
      invoiceNumber: formatFinancialDocumentNumber(sequenceNumber, issuedAt), sequenceNumber, issuedAt,
      pricingMode: original.pricingMode, supplyDate: original.supplyDate, advancePaymentDate: original.advancePaymentDate,
      servicePeriodStart: original.servicePeriodStart, servicePeriodEnd: original.servicePeriodEnd,
      sellerLegalName: original.sellerLegalName, sellerTradeName: original.sellerTradeName,
      sellerAddressLine: original.sellerAddressLine, sellerPostalCode: original.sellerPostalCode,
      sellerCity: original.sellerCity, sellerCountryCode: original.sellerCountryCode,
      sellerKvKNumber: original.sellerKvKNumber, sellerVatId: original.sellerVatId,
      customerOrganizationName: original.customerOrganizationName, customerAddressLine: original.customerAddressLine,
      customerPostalCode: original.customerPostalCode, customerCity: original.customerCity,
      customerCountryCode: original.customerCountryCode, customerKvKNumber: original.customerKvKNumber, customerVatId: original.customerVatId,
      packageSku: original.packageSku, packageLabel: `Correctie ${original.packageLabel}`, credits: 0,
      baseAmountCents: -allocation.net, packageDiscountCents: 0, proDiscountCents: 0, discountCodeDiscountCents: 0,
      amountExclVatCents: -allocation.net, vatRateBps: original.vatRateBps, vatAmountCents: -allocation.vat,
      amountInclVatCents: -allocation.gross, currency: original.currency, molliePaymentId: original.molliePaymentId,
      lines: { create: { position: 1, description: `Correctie ${original.invoiceNumber} — WorkMatchr Pro`, quantity: 1, unit: 'correctie',
        unitPriceExclVatCents: -allocation.net, grossAmountExclVatCents: -allocation.net, discountAmountCents: 0,
        netAmountExclVatCents: -allocation.net, vatRateBps: original.vatRateBps, vatAmountCents: -allocation.vat,
        amountInclVatCents: -allocation.gross, servicePeriodStart: original.servicePeriodStart, servicePeriodEnd: original.servicePeriodEnd } },
      vatSummaries: { create: { vatRateBps: original.vatRateBps, taxableAmountExclVatCents: -allocation.net, vatAmountCents: -allocation.vat, amountInclVatCents: -allocation.gross } },
    } })
    await transaction.financialEvent.create({ data: { actorUserId: values.actorUserId, invoiceId: invoice.id,
      eventType: 'PRO_CREDIT_ISSUED', result: 'SUCCEEDED', reason: values.reason, idempotencyKey: `pro-credit:${invoice.id}`,
      metadata: { originalInvoiceId: original.id, amountExclVatCents: allocation.net, vatAmountCents: allocation.vat, amountInclVatCents: allocation.gross, subscriptionUnchanged: true } } })
    await transaction.financialJorttSync.create({ data: { invoiceId: invoice.id, technicalReference: `workmatchr-invoice:${invoice.id}` } })
    return invoice // Deliberately no refund, email, wallet change or cancellation.
  })
}
