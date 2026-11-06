import 'server-only'
import { z } from 'zod'
import { Prisma } from '@/generated/prisma/client'
import { requireMarketplacePlatformAdmin } from '@/lib/marketplace/marketplace-authorization'
import { runSerializableFinancialTransaction } from './financial-transaction'
import { centsToMollieValue, createMollieGateway, type MollieGateway } from './mollie-gateway'
import { submitPreparedRefund } from './refund-service'

const schema = z.object({ actorUserId: z.string().uuid(), creditNoteId: z.string().uuid(),
  reason: z.string().trim().min(10).max(500), idempotencyKey: z.string().min(12).max(160).regex(/^[A-Za-z0-9:_-]+$/) })

/** Explicit cash action against an already issued credit. Never changes the subscription. */
export async function requestProRefund(input: unknown, gateway: MollieGateway = createMollieGateway()) {
  const values = schema.parse(input)
  const prepared = await runSerializableFinancialTransaction(async transaction => {
    await requireMarketplacePlatformAdmin(transaction, values.actorUserId)
    await transaction.$queryRaw(Prisma.sql`SELECT id FROM "FinancialInvoice" WHERE id=${values.creditNoteId}::uuid FOR UPDATE`)
    const credit = await transaction.financialInvoice.findUniqueOrThrow({ where: { id: values.creditNoteId }, include: { originalInvoice: true, proRefund: true } })
    if (!credit.proCreditKey || credit.documentType !== 'CREDIT_NOTE' || !credit.molliePaymentId || !credit.originalInvoice
      || credit.originalInvoice.organizationId !== credit.organizationId) throw new Error('PRO_CREDIT_REQUIRED')
    const byKey = await transaction.financialRefund.findUnique({ where: { idempotencyKey: values.idempotencyKey } })
    if (byKey && byKey.proCreditNoteId !== credit.id) throw new Error('REFUND_IDEMPOTENCY_CONFLICT')
    if (credit.proRefund) return { refund: credit.proRefund, paymentId: credit.molliePaymentId, original: credit.originalInvoice }
    const refund = await transaction.financialRefund.create({ data: { proCreditNoteId: credit.id,
      approvedByUserId: values.actorUserId, reason: values.reason, amountCents: -credit.amountInclVatCents,
      credits: 0, idempotencyKey: values.idempotencyKey } })
    await transaction.financialEvent.create({ data: { actorUserId: values.actorUserId, invoiceId: credit.id, refundId: refund.id,
      eventType: 'PRO_REFUND_AUTHORIZED', result: 'PENDING', reason: values.reason, idempotencyKey: `pro-refund-authorized:${refund.id}`,
      metadata: { originalInvoiceId: credit.originalInvoice.id, amountCents: refund.amountCents, subscriptionUnchanged: true } } })
    return { refund, paymentId: credit.molliePaymentId, original: credit.originalInvoice }
  })
  if (prepared.refund.status !== 'PENDING') return { refund: prepared.refund, reviewRequired: false }
  // Provider validation is read-only. Authorization is checked again before committing intent.
  const payment = await gateway.getPayment(prepared.paymentId)
  if (payment.id !== prepared.paymentId || payment.status !== 'paid' || payment.currency !== 'EUR'
    || payment.amountValue !== centsToMollieValue(prepared.original.amountInclVatCents)
    || payment.metadata.organizationId !== prepared.original.organizationId) throw new Error('PAID_PRO_PAYMENT_REQUIRED')
  return submitPreparedRefund(prepared.refund.id, prepared.paymentId, prepared.refund.amountCents, { creditNoteId: values.creditNoteId }, gateway, values.actorUserId)
}
