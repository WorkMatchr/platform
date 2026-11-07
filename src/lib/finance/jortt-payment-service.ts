import 'server-only'
import { z } from 'zod'
import { getPrisma } from '@/lib/prisma'
import { requireMarketplacePlatformAdmin } from '@/lib/marketplace/marketplace-authorization'
import { runSerializableFinancialTransaction } from './financial-transaction'

export type JorttPaymentEvidence = { id: string; reference: string; totalCents: number; dueCents: number; currency: string;
  bookings: Array<{ id: string; description: string; amountCents: number; ledgerAccountId: string | null; bookDate: string }>;
  allowedLedgerAccounts: string[] }
export interface JorttPaymentGateway {
  inspectPayment(invoiceId: string): Promise<JorttPaymentEvidence>
  registerPayment(input: { invoiceId: string; amountCents: number; ledgerAccountId: string; bookDate: string; reference: string }): Promise<{ bookingId: string }>
}

export function confirmsJorttBooking(remote: JorttPaymentEvidence, invoice: { id: string; amountInclVatCents: number },
  ledgerAccountId: unknown, bookDate: unknown) {
  const [booking] = remote.bookings
  return typeof ledgerAccountId === 'string' && typeof bookDate === 'string' && remote.dueCents === 0
    && remote.bookings.length === 1 && !!booking.id && booking.description === `workmatchr-payment:${invoice.id}`
    && booking.amountCents === invoice.amountInclVatCents && booking.ledgerAccountId === ledgerAccountId && booking.bookDate === bookDate
}

/** Separate from document synchronization. An unknown POST is reconciled by reads, never replayed. */
export async function reconcileJorttPayment(input: unknown, gateway: JorttPaymentGateway) {
  const values = z.object({ actorUserId: z.string().uuid(), invoiceId: z.string().uuid(),
    ledgerAccountId: z.string().uuid(), reason: z.string().trim().min(10).max(500),
    bookDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }).parse(input)
  if (!Number.isFinite(Date.parse(values.bookDate)) || new Date(values.bookDate).toISOString().slice(0, 10) !== values.bookDate) throw new Error('JORTT_BOOK_DATE_INVALID')
  const prisma = getPrisma()
  await requireMarketplacePlatformAdmin(prisma, values.actorUserId)
  const invoice = await prisma.financialInvoice.findUniqueOrThrow({ where: { id: values.invoiceId },
    include: { jorttSync: true, purchase: true, subscriptionPayment: true } })
  if (invoice.documentType !== 'INVOICE' || !invoice.molliePaymentId || invoice.currency !== 'EUR'
    || !(invoice.purchase?.status === 'PAID' || invoice.subscriptionPayment?.status === 'PAID')
    || invoice.jorttSync?.status !== 'SYNCED' || !invoice.jorttSync.externalReference) throw new Error('JORTT_PAID_INVOICE_REQUIRED')
  const reference = `workmatchr-payment:${invoice.id}`
  const key = `jortt-payment-intent:${invoice.id}`
  const remote = await gateway.inspectPayment(invoice.jorttSync.externalReference)
  if (remote.id !== invoice.jorttSync.externalReference || remote.reference !== invoice.invoiceNumber
    || remote.totalCents !== invoice.amountInclVatCents || remote.currency !== invoice.currency) throw new Error('JORTT_PAYMENT_IDENTITY_MISMATCH')
  const matches = remote.bookings.filter(b => b.description === reference)
  const previous = await prisma.financialEvent.findUnique({ where: { idempotencyKey: key } })
  if (previous) {
    const data = previous.metadata as Record<string, unknown> | null
    if (data?.ledgerAccountId !== values.ledgerAccountId || data?.bookDate !== values.bookDate) throw new Error('JORTT_PAYMENT_INTENT_CONFLICT')
  }
  if (confirmsJorttBooking(remote, invoice, values.ledgerAccountId, values.bookDate)) {
    await prisma.financialEvent.upsert({ where: { idempotencyKey: `jortt-payment-confirmed:${invoice.id}` }, create: {
      actorUserId: values.actorUserId, invoiceId: invoice.id, eventType: 'JORTT_PAYMENT_CONFIRMED', result: 'SUCCEEDED',
      reason: values.reason, idempotencyKey: `jortt-payment-confirmed:${invoice.id}`,
      metadata: { bookingId: matches[0].id, ledgerAccountId: values.ledgerAccountId, bookDate: values.bookDate, amountCents: invoice.amountInclVatCents },
    }, update: {} })
    return { status: 'CONFIRMED' as const }
  }
  if (previous || matches.length || remote.bookings.length || remote.dueCents !== invoice.amountInclVatCents) return { status: 'REVIEW_REQUIRED' as const }
  if (!remote.allowedLedgerAccounts.includes(values.ledgerAccountId)) throw new Error('JORTT_PAYMENT_ACCOUNT_NOT_ALLOWED')
  const claimed = await runSerializableFinancialTransaction(async transaction => {
    await requireMarketplacePlatformAdmin(transaction, values.actorUserId)
    return transaction.financialEvent.createMany({ data: { actorUserId: values.actorUserId, invoiceId: invoice.id,
      eventType: 'JORTT_PAYMENT_INTENT', result: 'PENDING', reason: values.reason, idempotencyKey: key,
      metadata: { ledgerAccountId: values.ledgerAccountId, bookDate: values.bookDate, amountCents: invoice.amountInclVatCents } }, skipDuplicates: true })
  })
  if (claimed.count !== 1) return { status: 'REVIEW_REQUIRED' as const }
  try {
    await gateway.registerPayment({ invoiceId: remote.id, amountCents: invoice.amountInclVatCents, ledgerAccountId: values.ledgerAccountId, bookDate: values.bookDate, reference })
  } catch { return { status: 'REVIEW_REQUIRED' as const } }
  // Read after write; a successful HTTP response alone does not prove the invoice is settled.
  return reconcileJorttPayment(values, gateway)
}
