'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { reconcileProPayments } from '@/lib/finance/pro-payment-reconciliation'
import { issueProCredit } from '@/lib/finance/pro-credit-service'
import { requestProRefund } from '@/lib/finance/pro-refund-service'
import { reconcileJorttPayment } from '@/lib/finance/jortt-payment-service'
import { JorttApiGateway } from '@/lib/finance/jortt-api-gateway'
import { reconcileMollieRefund } from '@/lib/finance/refund-service'
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


export async function proFinancialCorrectionAction(formData: FormData) {
  const values = z.object({ invoiceId: z.string().uuid(), operation: z.enum(['credit', 'refund', 'refund-check', 'jortt-payment', 'pro-payments']),
    reason: z.string().trim().min(10).max(500), confirmed: z.literal('on'),
  }).safeParse(Object.fromEntries(formData))
  const administrator = await requirePlatformAdministrator('/platformbeheer/financien/facturen')
  if (!values.success) redirect('/platformbeheer/financien/facturen?fout=ongeldige-correctie')
  const returnTo = `/platformbeheer/financien/facturen/${values.data.invoiceId}`
  if (process.env.PRO_FINANCIAL_CORRECTIONS_ENABLED !== 'true') redirect(`${returnTo}?fout=niet-vrijgegeven`)
  let outcome = 'vastgelegd'
  try {
    const common = { actorUserId: administrator.id, invoiceId: values.data.invoiceId, reason: values.data.reason }
    if (values.data.operation === 'credit') {
      const amount = String(formData.get('amount') ?? '').replace(',', '.')
      if (!/^\d{1,7}\.\d{2}$/.test(amount)) throw new Error('INVALID_AMOUNT')
      const [euros, cents] = amount.split('.')
      await issueProCredit({ ...common, amountInclVatCents: Number(euros) * 100 + Number(cents), idempotencyKey: formData.get('idempotencyKey') })
    } else if (values.data.operation === 'refund') {
      const result = await requestProRefund({ ...common, creditNoteId: values.data.invoiceId, idempotencyKey: formData.get('idempotencyKey') })
      if (result.reviewRequired) outcome = 'controle-nodig'
    } else if (values.data.operation === 'refund-check') {
      const { getPrisma } = await import('@/lib/prisma')
      const refund = await getPrisma().financialRefund.findUniqueOrThrow({ where: { proCreditNoteId: values.data.invoiceId } })
      const result = await reconcileMollieRefund(refund.id)
      if (result.reviewRequired) outcome = 'controle-nodig'
    } else if (values.data.operation === 'pro-payments') {
      const { getPrisma } = await import('@/lib/prisma')
      const invoice = await getPrisma().financialInvoice.findUniqueOrThrow({ where: { id: values.data.invoiceId } })
      const subscription = await getPrisma().professionalSubscription.findUniqueOrThrow({ where: { organizationId: invoice.organizationId } })
      const result = await reconcileProPayments({ ...common, subscriptionId: subscription.id, after: new Date(String(formData.get('after'))) })
      if (result.failed) outcome = 'controle-nodig'
    } else {
      const result = await reconcileJorttPayment({ ...common, ledgerAccountId: formData.get('ledgerAccountId'), bookDate: formData.get('bookDate') }, new JorttApiGateway())
      if (result.status !== 'CONFIRMED') outcome = 'controle-nodig'
    }
  } catch {
    redirect(`${returnTo}?fout=controle-nodig`)
  }
  revalidatePath('/platformbeheer/financien', 'layout')
  redirect(`${returnTo}?resultaat=${outcome}`)
}
