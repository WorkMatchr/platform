import 'server-only'

import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import { Prisma } from '@/generated/prisma/client'
import { getPrisma } from '@/lib/prisma'
import { recordFinancialRefundCreditPhaseInTransaction } from '@/lib/credits/credit-wallet-service'
import { requireMarketplacePlatformAdmin } from '@/lib/marketplace/marketplace-authorization'
import {
  centsToMollieValue,
  createMollieGateway,
  type MollieGateway,
  type MollieRefundSnapshot,
} from './mollie-gateway'
import { issueCreditNoteForCompletedRefund } from './invoice-service'
import { runSerializableFinancialTransaction } from './financial-transaction'

const inputSchema = z.object({
  actorUserId: z.string().uuid(),
  purchaseId: z.string().uuid(),
  reasonCode: z.enum(['DUPLICATE_CHARGE', 'CREDITS_NOT_DELIVERED', 'WORKMATCHR_TECHNICAL_ERROR', 'OTHER_APPROVED_WORKMATCHR_ERROR']),
  reason: z.string().trim().min(10).max(500),
  idempotencyKey: z.string().trim().min(12).max(160).regex(/^[A-Za-z0-9:_-]+$/),
})

async function lock(transaction: Prisma.TransactionClient, key: string) {
  await transaction.$queryRaw(Prisma.sql`SELECT pg_advisory_xact_lock(hashtextextended(${`refund:${key}`}, 0))::text AS "lock"`)
}

export function mapMollieRefundStatus(status: MollieRefundSnapshot['status']) {
  if (status === 'refunded') return 'REFUNDED' as const
  if (status === 'failed') return 'FAILED' as const
  if (status === 'canceled') return 'CANCELED' as const
  return 'PENDING' as const
}

export async function applyMollieRefundSnapshot(refundId: string, snapshot: MollieRefundSnapshot) {
  return runSerializableFinancialTransaction(async (transaction) => {
    await lock(transaction, refundId)
    const current = await transaction.financialRefund.findUniqueOrThrow({
      where: { id: refundId },
      include: { purchase: true, creditNote: true },
    })
    if (current.mollieRefundId && current.mollieRefundId !== snapshot.id) throw new Error('MOLLIE_REFUND_MISMATCH')
    const status = mapMollieRefundStatus(snapshot.status)
    const eventKey = `mollie-refund-status:${current.id}:${snapshot.status}`

    if (status === 'PENDING') {
      const refund = current.mollieRefundId
        ? current
        : await transaction.financialRefund.update({ where: { id: current.id }, data: { mollieRefundId: snapshot.id } })
      await transaction.financialEvent.upsert({
        where: { idempotencyKey: eventKey },
        create: {
          actorUserId: current.approvedByUserId,
          purchaseId: current.purchaseId,
          refundId: current.id,
          eventType: 'MOLLIE_REFUND_PENDING',
          result: 'PENDING',
          idempotencyKey: eventKey,
          metadata: { mollieRefundId: snapshot.id, providerStatus: snapshot.status },
        },
        update: {},
      })
      return { refund, creditNote: current.creditNote, reviewRequired: false }
    }

    if (current.status === status) return { refund: current, creditNote: current.creditNote, reviewRequired: false }
    if (current.status !== 'PENDING') throw new Error('REFUND_TERMINAL_STATE_CONFLICT')

    if (status === 'REFUNDED') {
      const ledger = await recordFinancialRefundCreditPhaseInTransaction(transaction, {
        refundId: current.id,
        organizationId: current.purchase.organizationId,
        actorUserId: current.approvedByUserId,
        credits: current.credits,
        phase: 'COMPLETE',
        reason: 'Credits afgeschreven na definitief bevestigde financiële terugbetaling.',
      })
      const refund = await transaction.financialRefund.update({
        where: { id: current.id },
        data: { status, mollieRefundId: snapshot.id, ledgerTransactionId: ledger.id, completedAt: new Date() },
      })
      await transaction.financialPurchase.update({
        where: { id: current.purchaseId },
        data: { status: 'REFUNDED', terminalAt: new Date() },
      })
      const creditNote = await issueCreditNoteForCompletedRefund(transaction, refund.id)
      await transaction.financialEvent.upsert({
        where: { idempotencyKey: eventKey },
        create: {
          actorUserId: current.approvedByUserId,
          purchaseId: current.purchaseId,
          invoiceId: creditNote.id,
          refundId: current.id,
          eventType: 'MOLLIE_REFUND_COMPLETED',
          result: 'SUCCEEDED',
          idempotencyKey: eventKey,
          metadata: { mollieRefundId: snapshot.id, providerStatus: snapshot.status },
        },
        update: {},
      })
      return { refund, creditNote, reviewRequired: false }
    }

    await recordFinancialRefundCreditPhaseInTransaction(transaction, {
      refundId: current.id,
      organizationId: current.purchase.organizationId,
      actorUserId: current.approvedByUserId,
      credits: current.credits,
      phase: 'RELEASE',
      reason: `Creditreservering vrijgegeven na definitieve refundstatus ${status}.`,
    })
    const refund = await transaction.financialRefund.update({
      where: { id: current.id },
      data: { status, mollieRefundId: snapshot.id },
    })
    await transaction.financialEvent.upsert({
      where: { idempotencyKey: eventKey },
      create: {
        actorUserId: current.approvedByUserId,
        purchaseId: current.purchaseId,
        refundId: current.id,
        eventType: status === 'FAILED' ? 'MOLLIE_REFUND_FAILED' : 'MOLLIE_REFUND_CANCELED',
        result: status,
        idempotencyKey: eventKey,
        metadata: { mollieRefundId: snapshot.id, providerStatus: snapshot.status },
      },
      update: {},
    })
    return { refund, creditNote: null, reviewRequired: false }
  })
}

export async function refundWorkmatchrError(input: unknown, gateway: MollieGateway = createMollieGateway()) {
  const values = inputSchema.parse(input)
  const prepared = await runSerializableFinancialTransaction(async (transaction) => {
    await requireMarketplacePlatformAdmin(transaction, values.actorUserId)
    await lock(transaction, values.idempotencyKey)
    const existing = await transaction.financialRefund.findUnique({ where: { idempotencyKey: values.idempotencyKey }, include: { purchase: true, creditNote: true } })
    if (existing) return { refund: existing, reviewRequired: existing.purchase.status === 'REFUND_REVIEW_REQUIRED' }
    const purchase = await transaction.financialPurchase.findUnique({ where: { id: values.purchaseId }, include: { creditedTransaction: true } })
    if (!purchase || purchase.status !== 'PAID' || !purchase.molliePaymentId || !purchase.creditedTransaction) throw new Error('PAID_CREDIT_PURCHASE_REQUIRED')
    const laterUsage = await transaction.creditTransaction.findFirst({
      where: { creditAccountId: purchase.creditedTransaction.creditAccountId, createdAt: { gt: purchase.creditedTransaction.createdAt }, totalDelta: { lt: 0 } },
      select: { id: true },
    })
    const refundId = randomUUID()
    if (laterUsage) {
      const refund = await transaction.financialRefund.create({
        data: { id: refundId, purchaseId: purchase.id, approvedByUserId: values.actorUserId, status: 'PENDING', reason: `${values.reasonCode}: ${values.reason}`, amountCents: purchase.amountInclVatCents, credits: purchase.credits, idempotencyKey: values.idempotencyKey },
        include: { purchase: true },
      })
      await transaction.financialPurchase.update({ where: { id: purchase.id }, data: { status: 'REFUND_REVIEW_REQUIRED' } })
      return { refund, reviewRequired: true }
    }
    const refund = await transaction.financialRefund.create({
      data: { id: refundId, purchaseId: purchase.id, approvedByUserId: values.actorUserId, reason: `${values.reasonCode}: ${values.reason}`, amountCents: purchase.amountInclVatCents, credits: purchase.credits, idempotencyKey: values.idempotencyKey },
      include: { purchase: true },
    })
    await recordFinancialRefundCreditPhaseInTransaction(transaction, { refundId, organizationId: purchase.organizationId, actorUserId: values.actorUserId, credits: purchase.credits, phase: 'RESERVE', reason: 'Credits gereserveerd voor goedgekeurde WorkMatchr-terugbetaling.' })
    return { refund, reviewRequired: false }
  })
  if (prepared.reviewRequired) return prepared
  if (prepared.refund.status === 'REFUNDED') {
    const creditNote = await getPrisma().financialInvoice.findUnique({ where: { refundId: prepared.refund.id } })
    return { refund: prepared.refund, creditNote, reviewRequired: false }
  }
  if (['FAILED', 'CANCELED'].includes(prepared.refund.status)) return { refund: prepared.refund, creditNote: null, reviewRequired: false }
  const purchase = prepared.refund.purchase
  if (!purchase.molliePaymentId) throw new Error('MOLLIE_PAYMENT_REQUIRED')
  if (prepared.refund.mollieRefundId) {
    const snapshot = await gateway.getRefund({ paymentId: purchase.molliePaymentId, refundId: prepared.refund.mollieRefundId })
    return applyMollieRefundSnapshot(prepared.refund.id, snapshot)
  }
  let remote: Awaited<ReturnType<MollieGateway['createRefund']>>
  try {
    remote = await gateway.createRefund({
      paymentId: purchase.molliePaymentId,
      amountValue: centsToMollieValue(prepared.refund.amountCents),
      currency: 'EUR',
      description: 'Door WorkMatchr goedgekeurde technische correctie',
      idempotencyKey: `mollie-refund-${prepared.refund.id}`,
      metadata: { refundId: prepared.refund.id, purchaseId: purchase.id },
    })
  } catch (error) {
    await getPrisma().$transaction(async (transaction) => {
      await recordFinancialRefundCreditPhaseInTransaction(transaction, { refundId: prepared.refund.id, organizationId: purchase.organizationId, actorUserId: values.actorUserId, credits: prepared.refund.credits, phase: 'RELEASE', reason: 'Creditreservering vrijgegeven omdat de terugbetaling niet is bevestigd.' })
      await transaction.financialRefund.update({ where: { id: prepared.refund.id }, data: { status: 'FAILED' } })
      await transaction.financialEvent.upsert({
        where: { idempotencyKey: `mollie-refund-request-failed:${prepared.refund.id}` },
        create: {
          actorUserId: values.actorUserId,
          purchaseId: purchase.id,
          refundId: prepared.refund.id,
          eventType: 'MOLLIE_REFUND_REQUEST_FAILED',
          result: 'FAILED',
          idempotencyKey: `mollie-refund-request-failed:${prepared.refund.id}`,
        },
        update: {},
      })
    })
    throw error
  }
  return applyMollieRefundSnapshot(prepared.refund.id, remote)
}

export async function reconcileMollieRefund(refundId: string, gateway: MollieGateway = createMollieGateway()) {
  const refund = await getPrisma().financialRefund.findUnique({
    where: { id: refundId },
    include: { purchase: { select: { molliePaymentId: true } }, creditNote: true },
  })
  if (!refund) throw new Error('PENDING_MOLLIE_REFUND_REQUIRED')
  if (refund.status === 'REFUNDED') return { refund, creditNote: refund.creditNote, reviewRequired: false }
  if (['FAILED', 'CANCELED'].includes(refund.status)) return { refund, creditNote: null, reviewRequired: false }
  if (!refund.mollieRefundId || !refund.purchase.molliePaymentId) {
    throw new Error('PENDING_MOLLIE_REFUND_REQUIRED')
  }
  const snapshot = await gateway.getRefund({ paymentId: refund.purchase.molliePaymentId, refundId: refund.mollieRefundId })
  return applyMollieRefundSnapshot(refund.id, snapshot)
}

export async function reconcilePendingMollieRefunds(gateway: MollieGateway = createMollieGateway()) {
  const refunds = await getPrisma().financialRefund.findMany({
    where: { status: 'PENDING', mollieRefundId: { not: null }, purchase: { molliePaymentId: { not: null } } },
    select: { id: true },
    orderBy: { requestedAt: 'asc' },
  })
  const result = { inspected: refunds.length, pending: 0, refunded: 0, failed: 0, canceled: 0, providerErrors: 0 }
  for (const refund of refunds) {
    try {
      const reconciled = await reconcileMollieRefund(refund.id, gateway)
      if (reconciled.refund.status === 'REFUNDED') result.refunded += 1
      else if (reconciled.refund.status === 'FAILED') result.failed += 1
      else if (reconciled.refund.status === 'CANCELED') result.canceled += 1
      else result.pending += 1
    } catch {
      result.providerErrors += 1
    }
  }
  return result
}
