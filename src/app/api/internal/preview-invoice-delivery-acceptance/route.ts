import { timingSafeEqual } from 'node:crypto'
import { Resend } from 'resend'
import { deliverFinancialInvoiceEmail } from '@/lib/finance/financial-invoice-delivery-service'
import { sendAuthEmail, type AuthEmail, type AuthEmailDeliveryResult } from '@/lib/email'
import { getPrisma } from '@/lib/prisma'
import { getPublicAppBaseUrl } from '@/lib/public-app-url'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const fixtureRecipient = 'preview-invoice-e2e-member-20260823@workmatchr.example.invalid'
const expectedRecipient = 'info@workmatchr.nl'
const notFound = () => new Response('Not found', { status: 404 })

function authorized(request: Request) {
  const expected = process.env.INVOICE_PREVIEW_ACCEPTANCE_SECRET ?? ''
  const supplied = request.headers.get('x-workmatchr-acceptance-secret') ?? ''
  if (expected.length < 32 || supplied.length !== expected.length) return false
  return timingSafeEqual(Buffer.from(supplied), Buffer.from(expected))
}

export async function POST(request: Request) {
  if (process.env.VERCEL_ENV !== 'preview' || process.env.VERCEL_GIT_COMMIT_REF !== 'codex/financial-document-email-branding' || !authorized(request)) return notFound()
  if (!process.env.RESEND_API_KEY?.startsWith('re_') || process.env.PREVIEW_EMAIL_RECIPIENT_OVERRIDE !== expectedRecipient) return new Response('Preview mail is niet veilig geconfigureerd.', { status: 503 })
  const appBaseUrl = getPublicAppBaseUrl()
  if (!appBaseUrl.endsWith('.vercel.app') || appBaseUrl.includes('www.workmatchr.nl')) return new Response('Preview URL is niet veilig geconfigureerd.', { status: 503 })

  const prisma = getPrisma()
  const invoice = await prisma.financialInvoice.findFirst({
    where: { purchase: { status: 'PAID', paidAt: { not: null }, createdByUser: { email: fixtureRecipient } }, events: { none: { idempotencyKey: { startsWith: 'invoice-email-sent:' } } } },
    include: { purchase: true },
    orderBy: { issuedAt: 'desc' },
  })
  if (!invoice?.purchase?.paidAt) return new Response('Geen ongeleverde Preview-fixturefactuur gevonden.', { status: 409 })

  let email: AuthEmail | null = null
  let delivery: AuthEmailDeliveryResult | null = null
  const sender = async (message: AuthEmail) => {
    email = message
    delivery = await sendAuthEmail(message)
    return delivery
  }
  const first = await deliverFinancialInvoiceEmail(invoice.id, sender)
  if (!email || !delivery) return new Response('Factuurmail niet verzonden.', { status: 500 })
  const sentEmail = email as AuthEmail
  const sentDelivery = delivery as AuthEmailDeliveryResult
  const expectedPath = `/credits/facturen/${invoice.id}/pdf`
  const brandedHtml = sentEmail.html.includes('Uw betaling is ontvangen') && sentEmail.html.includes('Factuur bekijken') && sentEmail.html.includes('workmatchr-logo.png')
  const plainText = sentEmail.text.includes('Uw betaling is ontvangen') && sentEmail.text.includes('Factuur bekijken:')
  const invoiceDataCorrect = sentEmail.html.includes(invoice.invoiceNumber) && sentEmail.text.includes(invoice.invoiceNumber)
  const ctaCorrect = sentEmail.html.includes(expectedPath) && sentEmail.text.includes(expectedPath) && !sentEmail.html.includes('https://www.workmatchr.nl/credits/facturen') && !sentEmail.text.includes('https://www.workmatchr.nl/credits/facturen')
  if (!brandedHtml || !plainText || !invoiceDataCorrect || !ctaCorrect || sentDelivery.transport !== 'RESEND' || !sentDelivery.previewRecipientOverrideUsed) return new Response('Factuurmailacceptatie faalde.', { status: 500 })

  const provider = await new Resend(process.env.RESEND_API_KEY).emails.get(sentDelivery.messageId)
  const providerData = provider.data as unknown as { to?: string[]; subject?: string } | null
  if (provider.error || !providerData?.to?.includes(expectedRecipient) || !providerData.subject?.startsWith('[PREVIEW TEST]')) return new Response('Resend-bevestiging faalde.', { status: 500 })

  const key = `invoice-email-sent:${invoice.id}`
  const afterFirst = await prisma.financialEvent.count({ where: { idempotencyKey: key } })
  const replay = await deliverFinancialInvoiceEmail(invoice.id, sender)
  const afterReplay = await prisma.financialEvent.count({ where: { idempotencyKey: key } })
  if (!first.delivered || first.idempotent || !replay.delivered || !replay.idempotent || afterFirst !== 1 || afterReplay !== 1) return new Response('Replaycontrole faalde.', { status: 500 })

  return Response.json({ messageId: sentDelivery.messageId, recipient: expectedRecipient, subject: providerData.subject, ctaHost: new URL(appBaseUrl).host, mailsAfterReplay: afterReplay, brandedHtml, plainText, invoiceDataCorrect, replayIdempotent: true }, { headers: { 'Cache-Control': 'private, no-store' } })
}
