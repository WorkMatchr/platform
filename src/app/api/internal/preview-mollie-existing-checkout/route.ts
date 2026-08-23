import { createHash } from 'node:crypto'

import { buildFinancialInvoicePdf } from '@/lib/finance/financial-invoice-pdf'
import { processMolliePayment } from '@/lib/finance/financial-purchase-service'
import { getPrisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const PAYMENT_ID = 'tr_xxNfEhXRqSrrGoUSQGmVJ'

async function getPayment(apiKey: string) {
  const response = await fetch(`https://api.mollie.com/v2/payments/${PAYMENT_ID}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
    cache: 'no-store',
  })
  if (!response.ok) throw new Error('MOLLIE_PAYMENT_READ_FAILED')
  return response.json() as Promise<{
    id: string
    mode: string
    status: string
    method?: string | null
    paidAt?: string | null
    _links?: { checkout?: { href?: string | null } }
  }>
}

function previewApiKey() {
  if (process.env.VERCEL_ENV !== 'preview') return null
  const apiKey = process.env.MOLLIE_API_KEY?.trim()
  return apiKey?.startsWith('test_') ? apiKey : null
}

export async function GET() {
  const apiKey = previewApiKey()
  if (!apiKey) return new Response(null, { status: 404 })

  const payment = await getPayment(apiKey)
  if (payment.id !== PAYMENT_ID || payment.mode !== 'test') return new Response(null, { status: 404 })
  const checkoutUrl = payment._links?.checkout?.href
  const purchase = await getPrisma().financialPurchase.findUnique({
    where: { molliePaymentId: PAYMENT_ID },
    include: { creditedTransaction: true, invoice: true, paymentEvents: true, events: true },
  })
  return Response.json({
    id: payment.id,
    status: payment.status,
    mode: payment.mode,
    method: payment.method ?? null,
    paidAtPresent: Boolean(payment.paidAt),
    checkoutUrl: checkoutUrl?.startsWith('https://www.mollie.com/checkout/') ? checkoutUrl : null,
    workmatchr: purchase ? {
      status: purchase.status,
      creditedExactlyOnce: Boolean(purchase.creditedTransactionId)
        && purchase.creditedTransaction?.type === 'PURCHASE'
        && purchase.creditedTransaction.amount === purchase.credits,
      invoiceCreated: Boolean(purchase.invoice),
      paymentEventCount: purchase.paymentEvents.length,
      invoiceMailSentCount: purchase.events.filter((event) => event.eventType === 'INVOICE_EMAIL_SENT').length,
      invoiceMailFailedCount: purchase.events.filter((event) => event.eventType === 'INVOICE_EMAIL_FAILED').length,
    } : null,
  })
}

export async function POST() {
  const apiKey = previewApiKey()
  if (!apiKey) return new Response(null, { status: 404 })
  const payment = await getPayment(apiKey)
  if (payment.id !== PAYMENT_ID || payment.mode !== 'test' || payment.status !== 'paid' || !payment.paidAt) {
    return Response.json({ processed: false, status: payment.status, paidAtPresent: Boolean(payment.paidAt) }, { status: 409 })
  }

  const first = await processMolliePayment(PAYMENT_ID)
  const beforeReplay = await getPrisma().financialPurchase.findUniqueOrThrow({
    where: { molliePaymentId: PAYMENT_ID },
    include: { creditedTransaction: true, invoice: true, paymentEvents: true, events: true },
  })
  const second = await processMolliePayment(PAYMENT_ID)
  const afterReplay = await getPrisma().financialPurchase.findUniqueOrThrow({
    where: { molliePaymentId: PAYMENT_ID },
    include: { creditedTransaction: true, invoice: true, paymentEvents: true, events: true },
  })
  if (!afterReplay.invoice) throw new Error('PREVIEW_INVOICE_E2E_INVOICE_MISSING')

  const firstPdf = await buildFinancialInvoicePdf(afterReplay.invoice)
  const secondPdf = await buildFinancialInvoicePdf(afterReplay.invoice)
  const pdfHash = (value: Uint8Array) => createHash('sha256').update(value).digest('hex')
  const otherOrganization = await getPrisma().organization.findFirst({
    where: { id: { not: afterReplay.organizationId }, status: 'ACTIVE' },
    select: { id: true },
  })
  const crossTenantInvoice = otherOrganization
    ? await getPrisma().financialInvoice.findFirst({
      where: { id: afterReplay.invoice.id, organizationId: otherOrganization.id },
      select: { id: true },
    })
    : null
  const negativePurchases = await getPrisma().financialPurchase.findMany({
    where: { organizationId: afterReplay.organizationId, status: { in: ['FAILED', 'EXPIRED'] } },
    select: { creditedTransactionId: true, invoice: { select: { id: true } }, events: { select: { eventType: true } } },
  })
  const mailCount = afterReplay.events.filter((event) => event.eventType === 'INVOICE_EMAIL_SENT').length

  return Response.json({
    processed: true,
    firstStatus: first.status,
    replayStatus: second.status,
    purchasePaid: afterReplay.status === 'PAID',
    creditedExactlyOnce: Boolean(afterReplay.creditedTransactionId)
      && afterReplay.creditedTransaction?.type === 'PURCHASE'
      && afterReplay.creditedTransaction.amount === afterReplay.credits,
    invoiceCreated: Boolean(afterReplay.invoice),
    invoiceSnapshotCorrect: afterReplay.invoice.amountExclVatCents === 100
      && afterReplay.invoice.vatRateBps === 2100
      && afterReplay.invoice.vatAmountCents === 21
      && afterReplay.invoice.amountInclVatCents === 121
      && afterReplay.invoice.currency === 'EUR',
    invoiceMailCount: mailCount,
    pdfGenerated: firstPdf.length > 0,
    pdfDeterministic: pdfHash(firstPdf) === pdfHash(secondPdf),
    replayCreditUnchanged: beforeReplay.creditedTransactionId === afterReplay.creditedTransactionId,
    replayInvoiceUnchanged: beforeReplay.invoice?.id === afterReplay.invoice.id,
    replayPaymentEventsUnchanged: beforeReplay.paymentEvents.length === afterReplay.paymentEvents.length,
    replayMailUnchanged: beforeReplay.events.filter((event) => event.eventType === 'INVOICE_EMAIL_SENT').length === mailCount,
    crossTenantDenied: Boolean(otherOrganization) && crossTenantInvoice === null,
    failedExpiredNoInvoiceCreditOrMail: negativePurchases.length > 0 && negativePurchases.every((item) =>
      item.creditedTransactionId === null
      && item.invoice === null
      && item.events.every((event) => event.eventType !== 'INVOICE_EMAIL_SENT')),
    invoiceId: afterReplay.invoice.id,
  })
}
