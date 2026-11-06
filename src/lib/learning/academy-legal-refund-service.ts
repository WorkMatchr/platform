import 'server-only'
import { z } from 'zod'
import { runSerializableFinancialTransaction } from '@/lib/finance/financial-transaction'
import { requireMarketplacePlatformAdmin } from '@/lib/marketplace/marketplace-authorization'
import { centsToMollieValue, type MollieGateway } from '@/lib/finance/mollie-gateway'
import { assertAcademyCommerceSandbox } from './academy-commerce-environment'
import { commerceAssert } from './academy-commerce-policy'
import { lockAcademyCommerce } from './academy-commerce-access'
import { allocateLegalRefund, LEGAL_REFUND_ALLOCATION } from './academy-legal-refund-policy'
import { originalAcademySeatAmounts, ACADEMY_SEAT_ALLOCATION_VERSION } from './academy-seat-refund-policy'
import { applyAcademyLegalRefund } from './academy-legal-refund-apply'

const approval = z.object({ purchaseId: z.string().uuid(), requestKey: z.string().uuid(), reason: z.string().trim().min(10).max(500),
  amountInclVatCents: z.number().int().positive(), amountExclVatCents: z.number().int().nonnegative(), vatAmountCents: z.number().int().nonnegative(),
  seatAllocations: z.array(z.object({ seatId: z.string().uuid(), amountCents: z.number().int().positive() }).strict()).min(1).max(5),
  seatIds: z.array(z.string().uuid()).max(5), legalEntitlementReviewed: z.literal(true) }).strict()
/** Operator-only server service: no public route and no automated legal eligibility decision. */
export async function approveAcademyLegalRefund(actorId: string, raw: unknown) {
  assertAcademyCommerceSandbox()
  const input = approval.parse(raw)
  commerceAssert(new Set(input.seatIds).size === input.seatIds.length, 'ACADEMY_LEGAL_REFUND_SEAT_MISMATCH')
  input.seatIds.sort()
  input.seatAllocations.sort((a,b) => a.seatId.localeCompare(b.seatId))
  commerceAssert(new Set(input.seatAllocations.map(a => a.seatId)).size === input.seatAllocations.length, 'ACADEMY_LEGAL_REFUND_SEAT_MISMATCH')
  return runSerializableFinancialTransaction(async tx => {
    await requireMarketplacePlatformAdmin(tx, actorId)
    await lockAcademyCommerce(tx, `purchase:${input.purchaseId}`)
    const old = await tx.academyLegalRefundDecision.findUnique({ where: { requestKey: input.requestKey }, include: { refund: { include: { seatAllocations: true } } } })
    if (old) {
      commerceAssert(old.approvedByUserId === actorId && old.purchaseId === input.purchaseId && old.reason === input.reason
        && old.amountInclVatCents === input.amountInclVatCents && old.amountExclVatCents === input.amountExclVatCents && old.vatAmountCents === input.vatAmountCents
        && JSON.stringify(old.seatIds) === JSON.stringify(input.seatIds)
        && JSON.stringify(old.refund?.seatAllocations.map(({seatId,amountCents}) => ({seatId,amountCents})).sort((a,b) => a.seatId.localeCompare(b.seatId))) === JSON.stringify(input.seatAllocations), 'ACADEMY_LEGAL_REFUND_REPLAY_MISMATCH')
      return old
    }
    const purchase = await tx.financialPurchase.findUnique({ where: { id: input.purchaseId }, include: { academyOrder: { include: { seats: true } }, invoice: true, refunds: { include: { legalDecision: true, seatAllocations: true } } } })
    commerceAssert(purchase?.kind === 'ACADEMY_COURSE' && purchase.pricingMode === 'ACADEMY_SANDBOX' && purchase.academyOrder && purchase.invoice?.snapshotVersion === 2
      && purchase.molliePaymentId && ['PAID', 'REFUND_REVIEW_REQUIRED'].includes(purchase.status), 'ACADEMY_LEGAL_REFUND_SANDBOX_PURCHASE_REQUIRED')
    commerceAssert(input.seatIds.every(id => purchase.academyOrder!.seats.some(seat => seat.id === id)), 'ACADEMY_LEGAL_REFUND_SEAT_MISMATCH')
    const reserved = purchase.refunds.filter(r => ['PENDING', 'REFUNDED'].includes(r.status)).reduce((sum, r) => ({
      amountInclVatCents: sum.amountInclVatCents + r.amountCents,
      amountExclVatCents: sum.amountExclVatCents + (r.legalDecision?.amountExclVatCents ?? purchase.amountExclVatCents),
      vatAmountCents: sum.vatAmountCents + (r.legalDecision?.vatAmountCents ?? purchase.vatAmountCents),
    }), { amountInclVatCents: 0, amountExclVatCents: 0, vatAmountCents: 0 })
    const amounts = allocateLegalRefund(purchase, reserved, input.amountInclVatCents)
    commerceAssert(amounts.amountExclVatCents === input.amountExclVatCents && amounts.vatAmountCents === input.vatAmountCents, 'ACADEMY_LEGAL_REFUND_ALLOCATION_MISMATCH')
    const originals = originalAcademySeatAmounts({ ...purchase.academyOrder, amountInclVatCents: purchase.amountInclVatCents })
    commerceAssert(input.seatAllocations.reduce((sum,a) => sum+a.amountCents,0) === input.amountInclVatCents, 'ACADEMY_LEGAL_REFUND_ALLOCATION_MISMATCH')
    const reservedRefunds = purchase.refunds.filter(r => ['PENDING','REFUNDED'].includes(r.status))
    commerceAssert(reservedRefunds.every(r => r.seatAllocations.reduce((sum,a) => sum+a.amountCents,0) === r.amountCents), 'ACADEMY_ALUMNI_REFUND_REVIEW_REQUIRED')
    const allocations = input.seatAllocations.map(a => {
      const original = originals.find(s => s.seatId === a.seatId)
      commerceAssert(original, 'ACADEMY_LEGAL_REFUND_SEAT_MISMATCH')
      const used = reservedRefunds.flatMap(r => r.seatAllocations).filter(line => line.seatId === a.seatId).reduce((sum,line) => sum+line.amountCents,0)
      commerceAssert(used+a.amountCents <= original.originalAmountCents, 'ACADEMY_REFUND_SEAT_CAP_EXCEEDED')
      return { ...a, originalAmountCents: original.originalAmountCents, policyVersion: ACADEMY_SEAT_ALLOCATION_VERSION }
    })
    const decision = await tx.academyLegalRefundDecision.create({ data: { purchaseId: purchase.id, approvedByUserId: actorId, requestKey: input.requestKey,
      reason: input.reason, ...amounts, seatIds: input.seatIds, sourceSnapshot: { allocationVersion: LEGAL_REFUND_ALLOCATION, taxReview: 'TAX REVIEW REQUIRED',
        gross: purchase.amountInclVatCents, net: purchase.amountExclVatCents, vat: purchase.vatAmountCents, vatRateBps: purchase.vatRateBps,
        reservedGross: reserved.amountInclVatCents, reservedNet: reserved.amountExclVatCents, reservedVat: reserved.vatAmountCents } } })
    const refund = await tx.financialRefund.create({ data: { purchaseId: purchase.id, approvedByUserId: actorId, legalDecisionId: decision.id,
      reason: decision.reason, amountCents: amounts.amountInclVatCents, credits: 0, idempotencyKey: `academy-legal-refund:${decision.id}` } })
    await tx.academyRefundSeatAllocation.createMany({ data: allocations.map(a => ({ ...a, refundId: refund.id })) })
    await tx.financialPurchase.update({ where: { id: purchase.id }, data: { status: 'REFUND_REVIEW_REQUIRED' } })
    await tx.financialEvent.create({ data: { purchaseId: purchase.id, refundId: refund.id, eventType: 'ACADEMY_LEGAL_REFUND_APPROVED', result: 'TAX_REVIEW_REQUIRED', idempotencyKey: `academy-legal-refund-approved:${decision.id}` } })
    return { ...decision, refund: { ...refund, seatAllocations: allocations } }
  })
}

export type AcademyLegalRefundFakeGateway = Pick<MollieGateway, 'createRefund' | 'getRefund'> & { transport: 'FAKE' }
/** Intentionally has no production transport/default gateway. No live provider activation. */
export async function executeAcademyLegalRefund(actorId: string, decisionId: string, gateway: AcademyLegalRefundFakeGateway) {
  assertAcademyCommerceSandbox()
  commerceAssert(gateway?.transport === 'FAKE', 'ACADEMY_LEGAL_REFUND_FAKE_PROVIDER_REQUIRED')
  const current = await runSerializableFinancialTransaction(async tx => {
    await requireMarketplacePlatformAdmin(tx, actorId)
    const refund = await tx.financialRefund.findUniqueOrThrow({ where: { legalDecisionId: decisionId }, include: { purchase: true, seatAllocations: true } })
    commerceAssert(refund.purchase?.pricingMode === 'ACADEMY_SANDBOX', 'ACADEMY_LEGAL_REFUND_SANDBOX_PURCHASE_REQUIRED')
    return { ...refund, purchase: refund.purchase }
  })
  if (['REFUNDED', 'FAILED', 'CANCELED'].includes(current.status)) return current
  commerceAssert(current.seatAllocations.reduce((sum,a) => sum+a.amountCents,0) === current.amountCents, 'ACADEMY_ALUMNI_REFUND_REVIEW_REQUIRED')
  const snapshot = current.mollieRefundId
    ? await gateway.getRefund({ paymentId: current.purchase.molliePaymentId!, refundId: current.mollieRefundId })
    : await gateway.createRefund({ paymentId: current.purchase.molliePaymentId!, amountValue: centsToMollieValue(current.amountCents), currency: 'EUR',
      description: 'Academy sandbox wettelijke restitutie', idempotencyKey: current.idempotencyKey, metadata: { refundId: current.id, purchaseId: current.purchase.id } })
  // Ambiguous transport failures leave the existing reservation intact; retry uses the same key.
  return runSerializableFinancialTransaction(async tx => {
    await lockAcademyCommerce(tx, `purchase:${current.purchaseId}`)
    const fresh = await tx.financialRefund.findUniqueOrThrow({ where: { id: current.id }, include: { purchase: true, seatAllocations: true } })
    commerceAssert(fresh.purchase?.kind === 'ACADEMY_COURSE', 'ACADEMY_REFUND_SOURCE_REQUIRED')
    return (await applyAcademyLegalRefund(tx, { ...fresh, purchase: fresh.purchase }, snapshot)).refund
  })
}
