import { beforeEach, describe, expect, it, vi } from 'vitest'
vi.mock('./academy-commerce-environment', () => ({ assertAcademyCommerceSandbox: vi.fn() }))
vi.mock('@/lib/finance/invoice-service', () => ({ issueCreditNoteForCompletedRefund: vi.fn().mockResolvedValue({ id: 'note' }) }))
import { issueCreditNoteForCompletedRefund } from '@/lib/finance/invoice-service'
import { applyAcademyLegalRefund } from './academy-legal-refund-apply'
const fixture = () => ({
  $queryRaw: vi.fn(), academyLegalRefundDecision: { findUniqueOrThrow: vi.fn().mockResolvedValue({ id: 'decision', purchaseId: 'purchase', amountInclVatCents: 100, seatIds: ['approved-seat'] }) },
  financialRefund: { update: vi.fn(async ({ data }) => ({ id: 'refund', ...data })), findMany: vi.fn().mockResolvedValue([{ status: 'REFUNDED', amountCents: 100 }]) },
  financialInvoice: { findUnique: vi.fn() }, financialPurchase: { update: vi.fn() }, financialEvent: { upsert: vi.fn() },
  learningAcademySeat: { findMany: vi.fn().mockResolvedValue([]) }, learningCertificate: { update: vi.fn() }, learningExamAttempt: { update: vi.fn() },
  academyPromotionUsage: { update: vi.fn() },
})
let db: ReturnType<typeof fixture>
const current = () => ({ id: 'refund', purchaseId: 'purchase', legalDecisionId: 'decision', status: 'PENDING', amountCents: 100, credits: 0, mollieRefundId: null,
  purchase: { kind: 'ACADEMY_COURSE', pricingMode: 'ACADEMY_SANDBOX', molliePaymentId: 'tr_fake', currency: 'EUR', amountInclVatCents: 500 } })
const snapshot = () => ({ id: 're_fake', paymentId: 'tr_fake', amountValue: '1.00', currency: 'EUR', status: 'refunded' as const })
beforeEach(() => { vi.clearAllMocks(); db = fixture() })
describe('D09 refund evidence and selective access', () => {
  it.each([{ paymentId: 'other' }, { amountValue: '5.00' }, { currency: 'USD' }, { id: 'other' }])('rejects mismatched provider evidence %j before mutation', async change => {
    await expect(applyAcademyLegalRefund(db as never, { ...current(), mollieRefundId: 're_fake' } as never, { ...snapshot(), ...change })).rejects.toThrow('REFUND_MISMATCH')
    expect(db.financialRefund.update).not.toHaveBeenCalled()
  })
  it('revokes only explicit decision seats without altering certificates, exams or consumed promotions', async () => {
    await applyAcademyLegalRefund(db as never, current() as never, snapshot())
    expect(db.learningAcademySeat.findMany).toHaveBeenCalledWith({ where: { order: { purchaseId: 'purchase' }, status: { not: 'REVOKED' }, id: { in: ['approved-seat'] } } })
    expect(db.learningCertificate.update).not.toHaveBeenCalled(); expect(db.learningExamAttempt.update).not.toHaveBeenCalled(); expect(db.academyPromotionUsage.update).not.toHaveBeenCalled()
    expect(db.financialPurchase.update).toHaveBeenCalledWith({ where: { id: 'purchase' }, data: { status: 'PAID' } })
  })
  it.each(['pending', 'queued', 'processing', 'failed', 'canceled'] as const)('never revokes or issues a credit note for %s', async status => {
    db.financialRefund.findMany.mockResolvedValue([])
    await applyAcademyLegalRefund(db as never, current() as never, { ...snapshot(), status })
    expect(db.learningAcademySeat.findMany).not.toHaveBeenCalled(); expect(issueCreditNoteForCompletedRefund).not.toHaveBeenCalled()
  })
  it('keeps review status while another refund remains pending', async () => {
    db.financialRefund.findMany.mockResolvedValue([{ status: 'PENDING', amountCents: 100 }])
    await applyAcademyLegalRefund(db as never, current() as never, { ...snapshot(), status: 'failed' })
    expect(db.financialPurchase.update).toHaveBeenCalledWith({ where: { id: 'purchase' }, data: { status: 'REFUND_REVIEW_REQUIRED' } })
  })
  it('replays confirmed evidence without another mutation or credit note', async () => {
    await applyAcademyLegalRefund(db as never, { ...current(), status: 'REFUNDED' } as never, snapshot())
    expect(db.financialRefund.update).not.toHaveBeenCalled(); expect(issueCreditNoteForCompletedRefund).not.toHaveBeenCalled()
  })
})
