import 'server-only'
import type { Prisma } from '@/generated/prisma/client'

/** Resolve the paid retry without rewriting the original attempt or its invoice. */
export async function resolveProInvoiceSource(transaction: Prisma.TransactionClient, subscriptionId: string) {
  const subscription = await transaction.professionalSubscription.findUniqueOrThrow({
    where: { id: subscriptionId },
    include: { firstPaymentPurchase: { include: { invoice: true } }, firstPaymentAttempts: { include: { purchase: { include: { invoice: true } } } } },
  })
  const candidates = [subscription.firstPaymentPurchase, ...subscription.firstPaymentAttempts.map(a => a.purchase)]
    .filter(p => p?.kind === 'PRO_SUBSCRIPTION' && p.status === 'PAID')
  const unique = [...new Map(candidates.map(p => [p!.id, p!])).values()]
  if (unique.length !== 1) throw new Error('PRO_PAID_INVOICE_SOURCE_AMBIGUOUS')
  const purchase = unique[0]
  const invoice = purchase.invoice
  if (!invoice || purchase.organizationId !== subscription.organizationId || invoice.organizationId !== subscription.organizationId
    || invoice.purchaseId !== purchase.id || invoice.documentType !== 'INVOICE' || invoice.snapshotVersion !== 2
    || !invoice.servicePeriodStart || !invoice.servicePeriodEnd || !purchase.molliePaymentId
    || invoice.molliePaymentId !== purchase.molliePaymentId || invoice.amountInclVatCents !== purchase.amountInclVatCents) {
    throw new Error('PRO_PAID_INVOICE_SOURCE_MISMATCH')
  }
  return { subscription, purchase, invoice }
}

function anchoredMonth(anchor: Date, offset: number) {
  const result = new Date(anchor)
  result.setUTCDate(1)
  result.setUTCMonth(anchor.getUTCMonth() + offset)
  const last = new Date(Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)).getUTCDate()
  result.setUTCDate(Math.min(anchor.getUTCDate(), last))
  return result
}

export function firstProPeriodEnd(paidAt: Date) {
  return anchoredMonth(paidAt, 1)
}

/** Contract month is anchored to the paid initial invoice, never to settlement time. */
export function recurringContractPeriod(anchor: Date, createdAt: string | null) {
  const created = new Date(createdAt ?? '')
  if (!Number.isFinite(created.getTime()) || !Number.isFinite(anchor.getTime())) throw new Error('PRO_PAYMENT_SCHEDULE_REQUIRED')
  const offset = (created.getUTCFullYear() - anchor.getUTCFullYear()) * 12 + created.getUTCMonth() - anchor.getUTCMonth()
  // The provider schedules a date, whereas the original purchase also contains a time.
  if (created.toISOString().slice(0, 10) !== anchoredMonth(anchor, offset).toISOString().slice(0, 10)) throw new Error('PRO_PAYMENT_SCHEDULE_REVIEW_REQUIRED')
  if (offset < 1) throw new Error('PRO_PAYMENT_BEFORE_RENEWAL')
  return { start: anchoredMonth(anchor, offset), end: anchoredMonth(anchor, offset + 1) }
}
