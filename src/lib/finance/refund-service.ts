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
import { deliverCompletedRefundCreditNote } from './credit-note-delivery'
import { mirrorCreditNoteSnapshot } from './credit-note-snapshot'

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
  const result = await runSerializableFinancialTransaction(async (transaction) => {
    await lock(transaction, refundId)
    const current = await transaction.financialRefund.findUniqueOrThrow({
      where: { id: refundId },
      include: { purchase: true, creditNote: true, proCreditNote: true },
    })
    if (current.mollieRefundId && current.mollieRefundId !== snapshot.id) throw new Error('MOLLIE_REFUND_MISMATCH')
    const status = mapMollieRefundStatus(snapshot.status)
    const eventKey = `mollie-refund-status:${current.id}:${snapshot.status}`
    if (current.proCreditNoteId) {
      if (!current.proCreditNote || current.amountCents !== -current.proCreditNote.amountInclVatCents) throw new Error('PRO_REFUND_CREDIT_MISMATCH')
      if (current.status === 'REFUNDED' && status !== 'REFUNDED') return { refund: current, creditNote: null, reviewRequired: false }
      if (current.status !== 'PENDING' && current.status !== status) throw new Error('REFUND_TERMINAL_STATE_CONFLICT')
      const refund = await transaction.financialRefund.update({ where: { id: current.id }, data: {
        status, mollieRefundId: snapshot.id, reconciliationRequired: false, ...(status === 'REFUNDED' ? { completedAt: current.completedAt ?? new Date() } : {}),
      } })
      await transaction.financialEvent.upsert({ where: { idempotencyKey: eventKey }, create: {
        actorUserId: current.approvedByUserId, invoiceId: current.proCreditNoteId, refundId: current.id,
        eventType: 'PRO_REFUND_STATUS', result: status, idempotencyKey: eventKey,
        metadata: { providerStatus: snapshot.status, amountCents: current.amountCents, subscriptionUnchanged: true },
      }, update: {} })
      return { refund, creditNote: null, reviewRequired: false }
    }
    if (!current.purchase || !current.purchaseId) throw new Error('REFUND_SOURCE_REQUIRED')
    if (current.status === 'REFUNDED' && status !== 'REFUNDED') return { refund: current, creditNote: current.creditNote, reviewRequired: false }


    if (status === 'PENDING') {
      const refund = current.mollieRefundId
        ? current
        : await transaction.financialRefund.update({ where: { id: current.id }, data: { mollieRefundId: snapshot.id, reconciliationRequired: false } })
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

    if (!current.purchase.organizationId) throw Error('CREDIT_ORGANIZATION_REQUIRED')
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
        data: { status, reconciliationRequired: false, mollieRefundId: snapshot.id, ledgerTransactionId: ledger.id, completedAt: new Date() },
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
      data: { status, reconciliationRequired: false, mollieRefundId: snapshot.id },
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
  await deliverCompletedRefundCreditNote(result)
  return result
}

export async function refundWorkmatchrError(input: unknown, gateway: MollieGateway = createMollieGateway()) {
  const values = inputSchema.parse(input)
  const prepared = await runSerializableFinancialTransaction(async (transaction) => {
    await requireMarketplacePlatformAdmin(transaction, values.actorUserId)
    await lock(transaction, values.purchaseId)
    const existing = await transaction.financialRefund.findUnique({ where: { idempotencyKey: values.idempotencyKey }, include: { purchase: true, creditNote: true } })
    if (existing) {
      if (existing.purchaseId !== values.purchaseId || !existing.purchase) throw new Error('REFUND_IDEMPOTENCY_CONFLICT')
      return { refund: existing, reviewRequired: existing.purchase.status === 'REFUND_REVIEW_REQUIRED' }
    }
    const existingForPurchase = await transaction.financialRefund.findFirst({
      where: { purchaseId: values.purchaseId },
      orderBy: { requestedAt: 'desc' },
      include: { purchase: true, creditNote: true },
    })
    if (existingForPurchase) return { refund: existingForPurchase, reviewRequired: existingForPurchase.purchase?.status === 'REFUND_REVIEW_REQUIRED' }
    const purchase = await transaction.financialPurchase.findUnique({ where: { id: values.purchaseId }, include: {
      creditedTransaction: true, invoice: { include: { lines: true, vatSummaries: true } },
    } })
    if (!purchase || purchase.kind !== 'CREDIT_PACKAGE' || purchase.status !== 'PAID' || !purchase.molliePaymentId || !purchase.creditedTransaction) throw new Error('PAID_CREDIT_PURCHASE_REQUIRED')
    if (!purchase.invoice) throw new Error('CREDIT_NOTE_V2_SOURCE_REQUIRED')
    mirrorCreditNoteSnapshot(purchase.invoice)
    if (purchase.invoice.amountInclVatCents !== purchase.amountInclVatCents || purchase.invoice.credits !== purchase.credits
      || purchase.invoice.organizationId !== purchase.organizationId) throw new Error('FULL_REFUND_INVOICE_REQUIRED')
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
      await transaction.financialEvent.upsert({
        where: { idempotencyKey: `workmatchr-refund-review:${refund.id}` },
        create: {
          actorUserId: values.actorUserId,
          purchaseId: purchase.id,
          refundId: refund.id,
          eventType: 'WORKMATCHR_REFUND_REVIEW_REQUIRED',
          result: 'PENDING',
          idempotencyKey: `workmatchr-refund-review:${refund.id}`,
          metadata: { reasonCode: values.reasonCode },
        },
        update: {},
      })
      return { refund, reviewRequired: true }
    }
    const refund = await transaction.financialRefund.create({
      data: { id: refundId, purchaseId: purchase.id, approvedByUserId: values.actorUserId, reason: `${values.reasonCode}: ${values.reason}`, amountCents: purchase.amountInclVatCents, credits: purchase.credits, idempotencyKey: values.idempotencyKey },
      include: { purchase: true },
    })
    if (!purchase.organizationId) throw Error('CREDIT_ORGANIZATION_REQUIRED')
    await recordFinancialRefundCreditPhaseInTransaction(transaction, { refundId, organizationId: purchase.organizationId, actorUserId: values.actorUserId, credits: purchase.credits, phase: 'RESERVE', reason: 'Credits gereserveerd voor goedgekeurde WorkMatchr-terugbetaling.' })
    await transaction.financialEvent.upsert({
      where: { idempotencyKey: `workmatchr-refund-requested:${refund.id}` },
      create: {
        actorUserId: values.actorUserId,
        purchaseId: purchase.id,
        refundId: refund.id,
        eventType: 'WORKMATCHR_REFUND_REQUESTED',
        result: 'PENDING',
        idempotencyKey: `workmatchr-refund-requested:${refund.id}`,
        metadata: { reasonCode: values.reasonCode },
      },
      update: {},
    })
    return { refund, reviewRequired: false }
  })
  if (prepared.reviewRequired) return prepared
  if (prepared.refund.status === 'REFUNDED') {
    const creditNote = await getPrisma().financialInvoice.findUnique({ where: { refundId: prepared.refund.id } })
    await deliverCompletedRefundCreditNote({ refund: prepared.refund, creditNote })
    return { refund: prepared.refund, creditNote, reviewRequired: false }
  }
  if (['FAILED', 'CANCELED'].includes(prepared.refund.status)) return { refund: prepared.refund, creditNote: null, reviewRequired: false }
  const purchase = prepared.refund.purchase
  if (!purchase?.molliePaymentId) throw new Error('MOLLIE_PAYMENT_REQUIRED')
  if (prepared.refund.mollieRefundId) {
    const snapshot = await gateway.getRefund({ paymentId: purchase.molliePaymentId, refundId: prepared.refund.mollieRefundId })
    return applyMollieRefundSnapshot(prepared.refund.id, snapshot)
  }
  return submitPreparedRefund(prepared.refund.id, purchase.molliePaymentId, prepared.refund.amountCents, { purchaseId: purchase.id }, gateway, values.actorUserId)
}

export async function submitPreparedRefund(refundId: string, paymentId: string, amountCents: number,
  source: { purchaseId?: string; creditNoteId?: string }, gateway: MollieGateway, actorUserId: string) {
  // Persist intent BEFORE I/O. A crash or lost response is UNKNOWN, never proof of rejection.
  const claim = await runSerializableFinancialTransaction(async transaction => {
    await requireMarketplacePlatformAdmin(transaction, actorUserId)
    return transaction.financialRefund.updateMany({ where: { id: refundId, status: 'PENDING', providerDispatchVersion: 1, providerAttemptedAt: null },
      data: { providerAttemptedAt: new Date(), reconciliationRequired: true } })
  })
  if (claim.count !== 1) return reconcileMollieRefund(refundId, gateway)
  try {
    const remote = await gateway.createRefund({ paymentId, amountValue: centsToMollieValue(amountCents), currency: 'EUR',
      description: 'Door WorkMatchr goedgekeurde correctie', idempotencyKey: `mollie-refund-${refundId}`, metadata: { refundId, ...source } })
    return await applyMollieRefundSnapshot(refundId, remote)
  } catch {
    await getPrisma().financialEvent.upsert({ where: { idempotencyKey: `refund-uncertain:${refundId}` }, create: {
      refundId, eventType: 'MOLLIE_REFUND_UNCERTAIN', result: 'REVIEW_REQUIRED', idempotencyKey: `refund-uncertain:${refundId}`,
    }, update: {} }).catch(() => undefined)
    throw new Error('MOLLIE_REFUND_RECONCILIATION_REQUIRED')
  }
}

export async function reconcileMollieRefund(refundId: string, gateway: MollieGateway = createMollieGateway()) {
  const refund = await getPrisma().financialRefund.findUnique({
    where: { id: refundId },
    include: { purchase: { select: { molliePaymentId: true } }, creditNote: true, proCreditNote: true },
  })
  if (!refund) throw new Error('PENDING_MOLLIE_REFUND_REQUIRED')
  if (refund.status === 'REFUNDED') {
    await deliverCompletedRefundCreditNote({ refund, creditNote: refund.creditNote })
    return { refund, creditNote: refund.creditNote, reviewRequired: false }
  }
  if (['FAILED', 'CANCELED'].includes(refund.status)) return { refund, creditNote: null, reviewRequired: false }
  const paymentId = refund.purchase?.molliePaymentId ?? refund.proCreditNote?.molliePaymentId
  if (!paymentId) throw new Error('PENDING_MOLLIE_REFUND_REQUIRED')
  const snapshot = refund.mollieRefundId
    ? await gateway.getRefund({ paymentId, refundId: refund.mollieRefundId })
    : await gateway.findRefundByReference?.({ paymentId, refundId: refund.id, amountValue: centsToMollieValue(refund.amountCents), currency: 'EUR' })
  if (!snapshot) return { refund, creditNote: refund.creditNote, reviewRequired: true }

  return applyMollieRefundSnapshot(refund.id, snapshot)
}

export async function reconcilePendingMollieRefunds(gateway: MollieGateway = createMollieGateway()) {
  const refunds = await getPrisma().financialRefund.findMany({
    where: { status: 'PENDING', OR: [{ mollieRefundId: { not: null } }, { reconciliationRequired: true }] },
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
