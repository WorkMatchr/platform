import { z } from 'zod'
import { requireUser } from '@/lib/authorization'
import { requestWithdrawal, withdrawalReceipt } from '@/lib/learning/academy-withdrawal'

type Context = { params: Promise<{ purchaseId: string }> }
async function receipt(userId: string, id: string) {
  const text = await withdrawalReceipt(userId, id)
  return text ? new Response(text, { headers: { 'Content-Type': 'text/plain; charset=utf-8',
    'Content-Disposition': 'attachment; filename="WorkMatchr-herroeping-' + id + '.txt"',
    'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' } }) : new Response(null, { status: 404 })
}
export async function GET(_request: Request, {params}: Context) {
  const user = await requireUser('/account/academy-aankopen')
  const { purchaseId } = await params
  if (!z.uuid().safeParse(purchaseId).success) return new Response(null, {status:404})
  return receipt(user.id, purchaseId)
}
export async function POST(request: Request, {params}: Context) {
  if (request.headers.get('origin') !== new URL(request.url).origin) return new Response(null, { status: 403 })
  const user = await requireUser('/account/academy-aankopen')
  const { purchaseId } = await params
  if (!z.uuid().safeParse(purchaseId).success) return new Response(null, {status:404})
  try { await requestWithdrawal(user.id, purchaseId) } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'P2025') return new Response(null, {status:404})
    throw error
  }
  return receipt(user.id, purchaseId)
}
