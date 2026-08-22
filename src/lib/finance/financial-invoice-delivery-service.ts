import 'server-only'

import { Prisma } from '@/generated/prisma/client'
import { siteConfig } from '@/config/site'
import { financialInvoiceEmail, sendAuthEmail, type AuthEmailDeliveryResult } from '@/lib/email'
import { getPrisma } from '@/lib/prisma'
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
      include: { purchase: { include: { createdByUser: { select: { email: true, name: true } } } } },
    })
    if (!invoice?.purchase || invoice.purchase.status !== 'PAID') throw new Error('PAID_PURCHASE_INVOICE_REQUIRED')
    const recipient = invoice.purchase.createdByUser
    const downloadUrl = new URL(`/credits/facturen/${invoice.id}/pdf`, siteConfig.url).toString()
    const email = financialInvoiceEmail({
      to: recipient.email,
      recipientName: recipient.name,
      invoiceNumber: invoice.invoiceNumber,
      downloadUrl,
    })
    const delivery = await sender({ ...email, idempotencyKey: `invoice-email:${invoice.id}` })
    await transaction.financialEvent.create({
      data: {
        actorUserId: invoice.purchase.createdByUserId,
        purchaseId: invoice.purchaseId,
        invoiceId: invoice.id,
        eventType: 'INVOICE_EMAIL_SENT',
        result: 'SUCCEEDED',
        idempotencyKey: deliveryKey(invoice.id),
        metadata: { transport: delivery.transport, status: delivery.status, invoiceNumber: invoice.invoiceNumber },
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
