import 'server-only'

import { Prisma } from '@/generated/prisma/client'
import { financialInvoiceEmail, sendAuthEmail, type AuthEmailDeliveryResult } from '@/lib/email'
import { getPrisma } from '@/lib/prisma'
import { getPublicAppBaseUrl } from '@/lib/public-app-url'
import { runSerializableFinancialTransaction } from './financial-transaction'

type InvoiceEmailSender = (email: ReturnType<typeof financialInvoiceEmail>) => Promise<AuthEmailDeliveryResult>

function deliveryKey(invoiceId: string) {
  return `invoice-email-sent:${invoiceId}`
}

export async function deliverFinancialInvoiceEmail(invoiceId: string, sender: InvoiceEmailSender = sendAuthEmail) {
  return runSerializableFinancialTransaction(async (transaction) => {
    await transaction.$queryRaw(Prisma.sql`SELECT pg_advisory_xact_lock(hashtextextended(${`financial-invoice-email:${invoiceId}`}, 0))::text AS "lock"`)
    const delivered = await transaction.financialEvent.findUnique({ where: { idempotencyKey: deliveryKey(invoiceId) } })
    if (delivered) return { delivered: true, idempotent: true }
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
    const delivery = await sender({ ...email, idempotencyKey: `invoice-email:${invoice.id}` })
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
  })
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
      reason: 'De factuurmail kon niet worden bezorgd en wordt bij een veilige webhookherhaling opnieuw geprobeerd.',
      idempotencyKey: `invoice-email-failed:${invoiceId}`,
      metadata: { retryable: true },
    },
    update: {},
  })
}
