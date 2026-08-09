import { processMolliePayment } from '@/lib/finance/financial-purchase-service'

export async function POST(request: Request) {
  const contentType = request.headers.get('content-type') ?? ''
  let paymentId = ''
  if (contentType.includes('application/json')) {
    const body = await request.json().catch(() => null) as { id?: unknown } | null
    paymentId = typeof body?.id === 'string' ? body.id : ''
  } else {
    const formData = await request.formData().catch(() => null)
    paymentId = String(formData?.get('id') ?? '')
  }
  if (!/^tr_[A-Za-z0-9]+$/.test(paymentId)) return new Response('Invalid payment id', { status: 400 })
  try {
    await processMolliePayment(paymentId)
    return new Response('OK', { status: 200 })
  } catch {
    return new Response('Payment processing failed', { status: 500 })
  }
}
