export const dynamic = 'force-dynamic'

const PAYMENT_ID = 'tr_xxNfEhXRqSrrGoUSQGmVJ'

export async function GET() {
  if (process.env.VERCEL_ENV !== 'preview') return new Response(null, { status: 404 })
  const apiKey = process.env.MOLLIE_API_KEY?.trim()
  if (!apiKey?.startsWith('test_')) return new Response(null, { status: 404 })

  const response = await fetch(`https://api.mollie.com/v2/payments/${PAYMENT_ID}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
    cache: 'no-store',
  })
  if (!response.ok) throw new Error('MOLLIE_PAYMENT_READ_FAILED')
  const payment = await response.json() as {
    id: string
    mode: string
    status: string
    _links?: { checkout?: { href?: string | null } }
  }
  if (payment.id !== PAYMENT_ID || payment.mode !== 'test' || payment.status !== 'open') {
    return Response.json({ checkoutUrl: null, reusable: false })
  }
  const checkoutUrl = payment._links?.checkout?.href
  if (!checkoutUrl || !checkoutUrl.startsWith('https://www.mollie.com/checkout/')) {
    return Response.json({ checkoutUrl: null, reusable: false })
  }
  return Response.json({ checkoutUrl, reusable: true })
}
