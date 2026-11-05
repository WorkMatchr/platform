import 'server-only'
import type { Prisma, FinancialRefund, FinancialPurchase } from '@/generated/prisma/client'
import { issueCreditNoteForCompletedRefund } from '@/lib/finance/invoice-service'
import { centsToMollieValue, type MollieRefundSnapshot } from '@/lib/finance/mollie-gateway'
import { assertAcademyCommerceSandbox } from './academy-commerce-environment'
import { commerceAssert } from './academy-commerce-policy'
import { lockAcademyCommerce, revokeAcademyPurchaseEntitlements } from './academy-commerce-access'

export async function applyAcademyLegalRefund(tx: Prisma.TransactionClient, current: FinancialRefund & { purchase: FinancialPurchase }, snapshot: MollieRefundSnapshot) {
  assertAcademyCommerceSandbox()
  await lockAcademyCommerce(tx, `purchase:${current.purchaseId}`)
  commerceAssert(current.legalDecisionId && current.purchase.kind === 'ACADEMY_COURSE' && current.purchase.pricingMode === 'ACADEMY_SANDBOX', 'ACADEMY_LEGAL_REFUND_DECISION_REQUIRED')
  const decision = await tx.academyLegalRefundDecision.findUniqueOrThrow({ where: { id: current.legalDecisionId } })
  commerceAssert(decision.purchaseId === current.purchaseId && decision.amountInclVatCents === current.amountCents && current.credits === 0
    && (!current.mollieRefundId || current.mollieRefundId === snapshot.id) && snapshot.paymentId === current.purchase.molliePaymentId
    && snapshot.currency === current.purchase.currency && snapshot.amountValue === centsToMollieValue(current.amountCents), 'ACADEMY_REFUND_MISMATCH')
  if (current.status === 'REFUNDED') return { refund: current, creditNote: await tx.financialInvoice.findUnique({ where: { refundId: current.id } }), reviewRequired: false, academySandbox: true }
  commerceAssert(current.status === 'PENDING', 'ACADEMY_REFUND_TERMINAL')
  const status = snapshot.status === 'refunded' ? 'REFUNDED' : snapshot.status === 'failed' ? 'FAILED' : snapshot.status === 'canceled' ? 'CANCELED' : 'PENDING'
  const now = new Date()
  const refund = await tx.financialRefund.update({ where: { id: current.id }, data: { status, mollieRefundId: snapshot.id, ...(status === 'REFUNDED' ? { completedAt: now } : {}) } })
  const totals = await tx.financialRefund.findMany({ where: { purchaseId: current.purchaseId, status: { in: ['PENDING', 'REFUNDED'] } }, select: { status: true, amountCents: true } })
  const fullyRefunded = totals.filter(r => r.status === 'REFUNDED').reduce((sum, r) => sum + r.amountCents, 0) === current.purchase.amountInclVatCents
  await tx.financialPurchase.update({ where: { id: current.purchaseId }, data: { status: fullyRefunded ? 'REFUNDED' : totals.some(r => r.status === 'PENDING') ? 'REFUND_REVIEW_REQUIRED' : 'PAID', ...(fullyRefunded ? { terminalAt: now } : {}) } })
  let creditNote = null
  if (status === 'REFUNDED') {
    await revokeAcademyPurchaseEntitlements(tx, current.purchaseId, now, fullyRefunded ? undefined : decision.seatIds)
    creditNote = await issueCreditNoteForCompletedRefund(tx, current.id)
  }
  await tx.financialEvent.upsert({ where: { idempotencyKey: `academy-legal-refund:${current.id}:${status}` }, create: { purchaseId: current.purchaseId, refundId: current.id, eventType: 'ACADEMY_LEGAL_REFUND_STATUS', result: status, idempotencyKey: `academy-legal-refund:${current.id}:${status}` }, update: {} })
  return { refund, creditNote, reviewRequired: false, academySandbox: true }
}
