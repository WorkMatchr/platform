import { getPrisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const EXPECTED_PREVIEW_BRANCH = 'codex/mollie-credit-acceptance'
const PURCHASE_IDEMPOTENCY_KEY = 'preview-mollie-acceptance-credit-purchase-20260822'

export async function GET() {
  if (process.env.VERCEL_ENV !== 'preview' || process.env.VERCEL_GIT_COMMIT_REF !== EXPECTED_PREVIEW_BRANCH) {
    return new Response(null, { status: 404 })
  }

  const purchase = await getPrisma().financialPurchase.findUnique({
    where: { idempotencyKey: PURCHASE_IDEMPOTENCY_KEY },
    select: { mollieCheckoutUrl: true, status: true },
  })
  if (!purchase?.mollieCheckoutUrl || purchase.status !== 'PAYMENT_PENDING') return new Response(null, { status: 404 })
  return Response.redirect(purchase.mollieCheckoutUrl, 302)
}
