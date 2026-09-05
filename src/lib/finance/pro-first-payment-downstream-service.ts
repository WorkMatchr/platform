import 'server-only'

import { getPrisma } from '@/lib/prisma'
import {
  deliverFinancialInvoiceEmail,
  recordFinancialInvoiceEmailFailure,
} from './financial-invoice-delivery-service'
import { createJorttGateway } from './jortt-api-gateway'
import { syncFinancialInvoiceToJortt, type JorttGateway } from './jortt-sync-service'

type DownstreamStepResult = Readonly<{
  status: 'COMPLETED' | 'ALREADY_COMPLETED' | 'FAILED'
  errorCode?: string
}>

export type ProFirstPaymentDownstreamResult = Readonly<{
  subscriptionId: string
  purchaseId: string
  invoiceId: string
  invoiceEmail: DownstreamStepResult
  jortt: DownstreamStepResult
}>

type Dependencies = Readonly<{
  deliverInvoiceEmail?: typeof deliverFinancialInvoiceEmail
  recordInvoiceEmailFailure?: typeof recordFinancialInvoiceEmailFailure
  syncInvoiceToJortt?: typeof syncFinancialInvoiceToJortt
  jorttGateway?: JorttGateway
}>

function safeErrorCode(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : ''
  return /^[A-Z0-9_]{3,80}$/.test(message) ? message : fallback
}

async function resolvePaidFirstPaymentInvoice(subscriptionId: string) {
  const subscription = await getPrisma().professionalSubscription.findUnique({
    where: { id: subscriptionId },
    select: {
      id: true,
      status: true,
      mollieSubscriptionId: true,
      firstPaymentPurchase: {
        select: {
          id: true,
          kind: true,
          status: true,
          createdByUserId: true,
          invoice: { select: { id: true, snapshotVersion: true } },
        },
      },
      firstPaymentAttempts: {
        select: {
          purchase: {
            select: {
              id: true,
              kind: true,
              status: true,
              createdByUserId: true,
              invoice: { select: { id: true, snapshotVersion: true } },
            },
          },
        },
      },
    },
  })
  if (!subscription || subscription.status !== 'ACTIVE' || !subscription.mollieSubscriptionId) {
    throw new Error('PRO_DOWNSTREAM_SUBSCRIPTION_NOT_ACTIVE')
  }
  const candidates = [
    subscription.firstPaymentPurchase,
    ...subscription.firstPaymentAttempts.map(({ purchase }) => purchase),
  ].filter((purchase): purchase is NonNullable<typeof purchase> => (
    purchase?.kind === 'PRO_SUBSCRIPTION'
    && purchase.status === 'PAID'
    && purchase.invoice !== null
  ))
  const uniqueCandidates = [...new Map(candidates.map((purchase) => [purchase.id, purchase])).values()]
  if (uniqueCandidates.length !== 1) throw new Error('PRO_DOWNSTREAM_PAID_INVOICE_AMBIGUOUS')
  const purchase = uniqueCandidates[0]
  if (!purchase.invoice || purchase.invoice.snapshotVersion !== 2) {
    throw new Error('PRO_DOWNSTREAM_SNAPSHOT_V2_REQUIRED')
  }
  return { subscription, purchase, invoice: purchase.invoice }
}

export async function finalizeProFirstPaymentDownstream(
  subscriptionId: string,
  dependencies: Dependencies = {},
): Promise<ProFirstPaymentDownstreamResult> {
  const { subscription, purchase, invoice } = await resolvePaidFirstPaymentInvoice(subscriptionId)
  const deliverInvoiceEmail = dependencies.deliverInvoiceEmail ?? deliverFinancialInvoiceEmail
  const recordInvoiceEmailFailure = dependencies.recordInvoiceEmailFailure ?? recordFinancialInvoiceEmailFailure
  const syncInvoiceToJortt = dependencies.syncInvoiceToJortt ?? syncFinancialInvoiceToJortt

  let invoiceEmail: DownstreamStepResult
  try {
    const delivery = await deliverInvoiceEmail(invoice.id)
    invoiceEmail = { status: delivery.idempotent ? 'ALREADY_COMPLETED' : 'COMPLETED' }
  } catch (error) {
    await recordInvoiceEmailFailure(invoice.id, purchase.id, purchase.createdByUserId)
    invoiceEmail = { status: 'FAILED', errorCode: safeErrorCode(error, 'INVOICE_EMAIL_DELIVERY_FAILED') }
  }

  let jortt: DownstreamStepResult
  try {
    const sync = await syncInvoiceToJortt(invoice.id, dependencies.jorttGateway ?? createJorttGateway())
    jortt = { status: sync.status === 'SYNCED' ? 'COMPLETED' : 'FAILED' }
  } catch (error) {
    jortt = { status: 'FAILED', errorCode: safeErrorCode(error, 'JORTT_PROVIDER_ERROR') }
  }

  return {
    subscriptionId: subscription.id,
    purchaseId: purchase.id,
    invoiceId: invoice.id,
    invoiceEmail,
    jortt,
  }
}
