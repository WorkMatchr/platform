'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { refundWorkmatchrError } from '@/lib/finance/refund-service'
import { createJorttGateway } from '@/lib/finance/jortt-api-gateway'
import { syncFinancialInvoiceToJortt } from '@/lib/finance/jortt-sync-service'
import { requirePlatformAdministrator } from '@/lib/platform-admin/platform-admin-authorization'

const refundSchema = z.object({
  purchaseId: z.string().uuid(),
  reasonCode: z.enum(['DUPLICATE_CHARGE', 'CREDITS_NOT_DELIVERED', 'WORKMATCHR_TECHNICAL_ERROR', 'OTHER_APPROVED_WORKMATCHR_ERROR']),
  reason: z.string().trim().min(10).max(500),
  idempotencyKey: z.string().trim().min(12).max(160).regex(/^[A-Za-z0-9:_-]+$/),
  confirmed: z.literal('on'),
})

const errorResult: Record<string, string> = {
  PAID_CREDIT_PURCHASE_REQUIRED: 'alleen-betaalde-credietaankoop',
  MOLLIE_REFUND_FAILED: 'provider-weigerde-terugbetaling',
}

export async function startPlatformFinancialRefundAction(formData: FormData) {
  const parsed = refundSchema.safeParse(Object.fromEntries(formData))
  const purchaseId = parsed.success ? parsed.data.purchaseId : String(formData.get('purchaseId') ?? '')
  const returnTo = z.string().uuid().safeParse(purchaseId).success
    ? `/platformbeheer/financien/betalingen/${purchaseId}`
    : '/platformbeheer/financien/betalingen'
  const administrator = await requirePlatformAdministrator(returnTo)
  if (!parsed.success) redirect(`${returnTo}?fout=ongeldige-terugbetaling`)

  let reviewRequired: boolean
  try {
    const result = await refundWorkmatchrError({
      actorUserId: administrator.id,
      purchaseId: parsed.data.purchaseId,
      reasonCode: parsed.data.reasonCode,
      reason: parsed.data.reason,
      idempotencyKey: parsed.data.idempotencyKey,
    })
    reviewRequired = result.reviewRequired
  } catch (error) {
    const code = error instanceof Error ? errorResult[error.message] : undefined
    redirect(`${returnTo}?fout=${code ?? 'terugbetaling-niet-gestart'}`)
  }
  revalidatePath('/platformbeheer/financien')
  revalidatePath('/platformbeheer/financien/betalingen')
  revalidatePath('/platformbeheer/financien/terugbetalingen')
  revalidatePath(returnTo)
  redirect(`${returnTo}?resultaat=${reviewRequired ? 'controle-nodig' : 'terugbetaling-gestart'}`)
}

export async function retryPlatformJorttSyncAction(formData: FormData) {
  const parsed = z.object({ invoiceId: z.string().uuid() }).safeParse(Object.fromEntries(formData))
  const returnTo = '/platformbeheer/financien/facturen'
  await requirePlatformAdministrator(returnTo)
  if (!parsed.success) redirect(`${returnTo}?fout=ongeldige-jortt-sync`)
  try {
    await syncFinancialInvoiceToJortt(parsed.data.invoiceId, createJorttGateway())
  } catch {
    revalidatePath(returnTo)
    redirect(`${returnTo}?fout=jortt-sync-mislukt`)
  }
  revalidatePath('/platformbeheer/financien')
  revalidatePath(returnTo)
  redirect(`${returnTo}?resultaat=jortt-gesynchroniseerd`)
}
