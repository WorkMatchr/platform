import { getPrisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const FIXTURE_EMAIL = 'preview-invoice-e2e-member-20260823@workmatchr.example.invalid'

export async function GET() {
  if (process.env.VERCEL_ENV !== 'preview') return new Response(null, { status: 404 })

  const apiKey = process.env.MOLLIE_API_KEY?.trim()
  if (!apiKey?.startsWith('test_')) return new Response(null, { status: 404 })

  const purchase = await getPrisma().financialPurchase.findFirst({
    where: {
      createdByUser: { email: FIXTURE_EMAIL },
      pricingMode: 'MOLLIE_TEST_ACCEPTANCE',
      molliePaymentId: { not: null },
    },
    orderBy: { createdAt: 'desc' },
    select: {
      molliePaymentId: true,
      status: true,
      paidAt: true,
      terminalAt: true,
      creditedTransactionId: true,
      invoice: { select: { id: true } },
      paymentEvents: {
        orderBy: { createdAt: 'asc' },
        select: { status: true, providerOccurredAt: true },
      },
    },
  })
  if (!purchase?.molliePaymentId) return new Response(null, { status: 404 })

  const response = await fetch(`https://api.mollie.com/v2/payments/${encodeURIComponent(purchase.molliePaymentId)}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
    cache: 'no-store',
  })
  if (!response.ok) throw new Error('MOLLIE_PAYMENT_STATUS_READ_FAILED')
  const payment = await response.json() as {
    id: string
    status: string
    mode: string
    method?: string | null
    paidAt?: string | null
  }

  return Response.json({
    mollie: {
      id: payment.id,
      status: payment.status,
      mode: payment.mode,
      method: payment.method ?? null,
      paidAtPresent: Boolean(payment.paidAt),
    },
    workmatchr: {
      purchaseStatus: purchase.status,
      paidAtPresent: Boolean(purchase.paidAt),
      terminalAtPresent: Boolean(purchase.terminalAt),
      credited: Boolean(purchase.creditedTransactionId),
      invoiceCreated: Boolean(purchase.invoice),
      paymentEvents: purchase.paymentEvents.map((event) => ({
        status: event.status,
        providerOccurredAtPresent: Boolean(event.providerOccurredAt),
      })),
    },
  })
}
