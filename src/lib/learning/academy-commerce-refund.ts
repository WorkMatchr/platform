import { applyAcademyLegalRefund } from './academy-legal-refund-apply'
import 'server-only'
import type { Prisma, FinancialRefund, FinancialPurchase } from '@/generated/prisma/client'
import { runSerializableFinancialTransaction } from '@/lib/finance/financial-transaction'
import { requireMarketplacePlatformAdmin } from '@/lib/marketplace/marketplace-authorization'
import { issueCreditNoteForCompletedRefund } from '@/lib/finance/invoice-service'
import { createMollieGateway, centsToMollieValue, type MollieGateway, type MollieRefundSnapshot } from '@/lib/finance/mollie-gateway'
import { commerceAssert } from './academy-commerce-policy'
import { assertAcademyCommerceSandbox } from './academy-commerce-environment'
import { lockAcademyCommerce, revokeAcademyPurchaseEntitlements } from './academy-commerce-access'

export async function applyAcademyRefundInTransaction(tx: Prisma.TransactionClient, current: FinancialRefund & { purchase: FinancialPurchase }, snapshot: MollieRefundSnapshot) {
  assertAcademyCommerceSandbox()
  commerceAssert(current.purchaseId === current.purchase.id, 'ACADEMY_REFUND_SOURCE_REQUIRED')
  if (current.legalDecisionId) return applyAcademyLegalRefund(tx, current, snapshot)
  await lockAcademyCommerce(tx, `purchase:${current.purchaseId}`)
  commerceAssert(current.purchase.kind === 'ACADEMY_COURSE' && current.credits === 0 && current.amountCents === current.purchase.amountInclVatCents, 'ACADEMY_FULL_REFUND_REQUIRED')
  commerceAssert((!current.mollieRefundId || current.mollieRefundId === snapshot.id) && snapshot.paymentId === current.purchase.molliePaymentId && snapshot.currency === current.purchase.currency && snapshot.amountValue === centsToMollieValue(current.amountCents), 'ACADEMY_REFUND_MISMATCH')
  if (current.status === 'REFUNDED') return { refund: current, creditNote: await tx.financialInvoice.findUnique({ where: { refundId: current.id } }), reviewRequired: false, academySandbox: true }
  commerceAssert(current.status === 'PENDING', 'ACADEMY_REFUND_TERMINAL')
  const status = snapshot.status === 'refunded' ? 'REFUNDED' : snapshot.status === 'failed' ? 'FAILED' : snapshot.status === 'canceled' ? 'CANCELED' : 'PENDING'
  const now = new Date()
  const refund = await tx.financialRefund.update({ where: { id: current.id }, data: { status, mollieRefundId: snapshot.id, ...(status === 'REFUNDED' ? { completedAt: now } : {}) } })
  let creditNote = null
  if (status === 'REFUNDED') {
    await tx.financialPurchase.update({ where: { id: current.purchase.id }, data: { status: 'REFUNDED', terminalAt: now } })
    await revokeAcademyPurchaseEntitlements(tx, current.purchase.id, now)
    creditNote = await issueCreditNoteForCompletedRefund(tx, current.id)
  } else if (status === 'FAILED' || status === 'CANCELED') {
    await tx.financialPurchase.updateMany({ where: { id: current.purchase.id, status: 'REFUND_REVIEW_REQUIRED' }, data: { status: 'PAID' } })
  }
  await tx.financialEvent.upsert({ where: { idempotencyKey: `academy-refund:${current.id}:${status}` }, create: { purchaseId: current.purchaseId, refundId: current.id, eventType: 'ACADEMY_REFUND_STATUS', result: status, idempotencyKey: `academy-refund:${current.id}:${status}` }, update: {} })
  return { refund, creditNote, reviewRequired: false, academySandbox: true }
}

export async function requestAcademyRefund(actorId: string, purchaseId: string, reason: string, gateway: MollieGateway = createMollieGateway()) {
  assertAcademyCommerceSandbox()
  commerceAssert(reason.trim().length >= 10 && reason.length <= 500, 'ACADEMY_REFUND_REASON_REQUIRED')
  const prepared = await runSerializableFinancialTransaction(async tx => {
    await requireMarketplacePlatformAdmin(tx, actorId)
    await lockAcademyCommerce(tx, `purchase:${purchaseId}`)
    const purchase = await tx.financialPurchase.findUnique({ where: { id: purchaseId }, include: { academyOrder: true } })
    commerceAssert(purchase?.academyOrder && purchase.kind === 'ACADEMY_COURSE' && ['PAID','REFUND_REVIEW_REQUIRED','REFUNDED'].includes(purchase.status) && purchase.molliePaymentId, 'ACADEMY_PAID_PURCHASE_REQUIRED')
    const key = `academy-full-refund:${purchase.id}`
    const old = await tx.financialRefund.findUnique({ where: { idempotencyKey: key } })
    if (old) return { refund: old, purchase }
    const refund = await tx.financialRefund.create({ data: { purchaseId, approvedByUserId: actorId, reason, amountCents: purchase.amountInclVatCents, credits: 0, idempotencyKey: key } })
    await tx.financialPurchase.update({ where: { id: purchaseId }, data: { status: 'REFUND_REVIEW_REQUIRED' } })
    return { refund, purchase }
  })
  if (['REFUNDED','FAILED','CANCELED'].includes(prepared.refund.status)) return prepared.refund
  const snapshot = prepared.refund.mollieRefundId
    ? await gateway.getRefund({ paymentId: prepared.purchase.molliePaymentId!, refundId: prepared.refund.mollieRefundId })
    : await gateway.createRefund({ paymentId: prepared.purchase.molliePaymentId!, amountValue: centsToMollieValue(prepared.refund.amountCents), currency: 'EUR', description: 'WorkMatchr Academy sandboxterugbetaling', idempotencyKey: prepared.refund.idempotencyKey, metadata: { refundId: prepared.refund.id, purchaseId } })
  // Network ambiguity leaves the same PENDING intent; provider idempotency protects retries.
  return runSerializableFinancialTransaction(async tx => {
    await lockAcademyCommerce(tx, `purchase:${purchaseId}`)
    const current = await tx.financialRefund.findUniqueOrThrow({ where: { id: prepared.refund.id }, include: { purchase: true } })
    return (await applyAcademyRefundInTransaction(tx, { ...current, purchase: requireAcademyPurchase(current.purchase) }, snapshot)).refund
  })
}

function requireAcademyPurchase(purchase: FinancialPurchase | null): FinancialPurchase {
  commerceAssert(purchase?.kind === 'ACADEMY_COURSE', 'ACADEMY_REFUND_SOURCE_REQUIRED')
  return purchase
}
