import 'server-only'

import { createHash } from 'node:crypto'
import { Prisma } from '@/generated/prisma/client'
import { financialInvoiceEmail, sendAuthEmail, type AuthEmailDeliveryResult } from '@/lib/email'
import { getPrisma } from '@/lib/prisma'
import { getPublicAppBaseUrl } from '@/lib/public-app-url'
import { runSerializableFinancialTransaction } from './financial-transaction'

type InvoiceEmailSender = (email: ReturnType<typeof financialInvoiceEmail>) => Promise<AuthEmailDeliveryResult>

function deliveryKey(invoiceId: string) {
  return `invoice-email-sent:${invoiceId}`
}

export const INVOICE_EMAIL_RETRY_WINDOW_MS = 23 * 60 * 60_000
const attemptKey = (invoiceId: string) => `invoice-email-started:${invoiceId}`
const reconciliationRequired = () => new Error('INVOICE_EMAIL_RECONCILIATION_REQUIRED')

async function deliveryContext(transaction: Prisma.TransactionClient, invoiceId: string) {
  const invoice = await transaction.financialInvoice.findUnique({
    where: { id: invoiceId },
    include: {
      purchase: { include: { createdByUser: { select: { email: true, displayName: true } } } },
      refund: { include: { purchase: { include: { createdByUser: { select: { email: true, displayName: true } } } } } },
      originalInvoice: true,
    },
  })
  const isCreditNote = invoice?.documentType === 'CREDIT_NOTE'
  const purchase = isCreditNote ? invoice.refund?.purchase : invoice?.purchase
  if (isCreditNote) {
    if (!invoice.refund || invoice.refund.status !== 'REFUNDED' || !invoice.refund.completedAt
      || !purchase || !invoice.originalInvoice || invoice.originalInvoice.purchaseId !== purchase.id
      || invoice.originalInvoice.organizationId !== invoice.organizationId || purchase.organizationId !== invoice.organizationId
      || invoice.amountInclVatCents !== -invoice.refund.amountCents) throw new Error('COMPLETED_REFUND_CREDIT_NOTE_REQUIRED')
  } else if (!purchase || purchase.status !== 'PAID' || !purchase.paidAt) throw new Error('PAID_PURCHASE_INVOICE_REQUIRED')
  if (!invoice || !purchase) throw new Error('PAID_PURCHASE_INVOICE_REQUIRED')
  const recipient = purchase.createdByUser
  const downloadUrl = new URL(`/credits/facturen/${invoice.id}/pdf`, getPublicAppBaseUrl()).toString()
  const email = financialInvoiceEmail({
    to: recipient.email,
    recipientName: recipient.displayName?.trim() || 'gebruiker',
    invoiceNumber: invoice.invoiceNumber,
    documentType: isCreditNote ? 'CREDIT_NOTE' : 'INVOICE',
    paidAmountInclVatCents: invoice.amountInclVatCents,
    paidAt: isCreditNote ? invoice.issuedAt : purchase.paidAt!,
    downloadUrl,
  })
  const fingerprint = createHash('sha256').update(JSON.stringify([
    email, process.env.AUTH_EMAIL_FROM ?? '', process.env.VERCEL_ENV ?? '',
    process.env.PREVIEW_EMAIL_RECIPIENT_OVERRIDE ?? '',
  ])).digest('hex')
  return { invoice, purchase, isCreditNote, email, fingerprint }
}

async function lockDelivery(transaction: Prisma.TransactionClient, invoiceId: string) {
  await transaction.$queryRaw(Prisma.sql`SELECT pg_advisory_xact_lock(hashtextextended(${`financial-invoice-email:${invoiceId}`}, 0))::text AS "lock"`)
}

export async function deliverFinancialInvoiceEmail(invoiceId: string, sender: InvoiceEmailSender = sendAuthEmail) {
  // Commit the first-attempt evidence BEFORE any provider call. A failed send or
  // lost acknowledgement must not roll back or restart its deduplication window.
  const attempt = await runSerializableFinancialTransaction(async transaction => {
    await lockDelivery(transaction, invoiceId)
    if (await transaction.financialEvent.findUnique({ where: { idempotencyKey: deliveryKey(invoiceId) } })) return null
    const existing = await transaction.financialEvent.findUnique({ where: { idempotencyKey: attemptKey(invoiceId) } })
    if (existing) return existing
    const { invoice, purchase, fingerprint, isCreditNote } = await deliveryContext(transaction, invoiceId)
    const failed = await transaction.financialEvent.findUnique({ where: { idempotencyKey: `invoice-email-failed:${invoiceId}` } })
    const age = Date.now() - invoice.issuedAt.getTime()
    // Historical ambiguous attempts have no trustworthy start/fingerprint.
    // Do not silently grant them a fresh provider idempotency window.
    if (failed || !Number.isFinite(age) || age < 0 || age >= INVOICE_EMAIL_RETRY_WINDOW_MS) throw reconciliationRequired()
    return transaction.financialEvent.create({ data: {
      actorUserId: purchase.createdByUserId, purchaseId: isCreditNote ? purchase.id : invoice.purchaseId,
      refundId: isCreditNote ? invoice.refundId : null, invoiceId,
      eventType: 'INVOICE_EMAIL_ATTEMPT_STARTED', result: 'STARTED', idempotencyKey: attemptKey(invoiceId),
      metadata: { version: 1, fingerprint },
    } })
  })
  if (!attempt) return { delivered: true, idempotent: true }
  // ReadCommitted observes SENT after waiting for the invoice lock. A serializable
  // snapshot taken before that wait can repeat an already accepted provider call.
  return getPrisma().$transaction(async transaction => {
    await lockDelivery(transaction, invoiceId)
    if (await transaction.financialEvent.findUnique({ where: { idempotencyKey: deliveryKey(invoiceId) } })) return { delivered: true, idempotent: true }
    const { invoice, purchase, isCreditNote, email, fingerprint } = await deliveryContext(transaction, invoiceId)
    const metadata = attempt.metadata as { version?: unknown; fingerprint?: unknown } | null
    const age = Date.now() - attempt.createdAt.getTime()
    const invoiceAge = Date.now() - invoice.issuedAt.getTime()
    if (metadata?.version !== 1 || metadata.fingerprint !== fingerprint || !Number.isFinite(age)
      || age < 0 || age >= INVOICE_EMAIL_RETRY_WINDOW_MS || !Number.isFinite(invoiceAge)
      || invoiceAge < 0 || invoiceAge >= INVOICE_EMAIL_RETRY_WINDOW_MS) throw reconciliationRequired()
    const delivery = await sender({ ...email, idempotencyKey: `invoice-email:${invoice.id}` })
    if (delivery.status !== 'ACCEPTED' || delivery.transport !== 'RESEND' || !delivery.messageId) throw new Error('INVOICE_EMAIL_NOT_ACCEPTED')
    await transaction.financialEvent.create({
      data: {
        actorUserId: purchase.createdByUserId,
        purchaseId: isCreditNote ? purchase.id : invoice.purchaseId,
        refundId: isCreditNote ? invoice.refundId : null,
        invoiceId: invoice.id,
        eventType: isCreditNote ? 'CREDIT_NOTE_EMAIL_SENT' : 'INVOICE_EMAIL_SENT',
        result: 'SUCCEEDED',
        idempotencyKey: deliveryKey(invoice.id),
        metadata: {
          transport: delivery.transport,
          status: delivery.status,
          invoiceNumber: invoice.invoiceNumber,
          previewRecipientOverrideUsed: delivery.previewRecipientOverrideUsed === true,
        },
      },
    })
    return { delivered: true, idempotent: false }
  }, { isolationLevel: 'ReadCommitted' })
}

export async function recordFinancialInvoiceEmailFailure(invoiceId: string, purchaseId: string, actorUserId: string | null) {
  await getPrisma().financialEvent.upsert({
    where: { idempotencyKey: `invoice-email-failed:${invoiceId}` },
    create: {
      actorUserId,
      purchaseId,
      invoiceId,
      eventType: 'INVOICE_EMAIL_FAILED',
      result: 'FAILED',
      reason: 'De factuurmail is niet bevestigd. Herhaling vereist een ongewijzigde inhoud binnen het veilige verzendvenster; anders is reconciliatie nodig.',
      idempotencyKey: `invoice-email-failed:${invoiceId}`,
      metadata: { boundedRetry: true },
    },
    update: {},
  })
}
