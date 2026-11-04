import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { MollieGateway, MollieRefundSnapshot } from '@/lib/finance/mollie-gateway'

const context = vi.hoisted(() => ({ db: null as unknown }))
vi.mock('@/lib/prisma', () => ({ getPrisma: () => context.db }))
vi.mock('@/lib/finance/financial-transaction', () => ({ runSerializableFinancialTransaction: (work: (db: unknown) => unknown) => work(context.db) }))
vi.mock('./academy-commerce-environment', () => ({ assertAcademyCommerceSandbox: vi.fn() }))
vi.mock('@/lib/finance/invoice-service', () => ({ issueCreditNoteForCompletedRefund: vi.fn().mockResolvedValue({ id: 'credit-note' }) }))
import { issueCreditNoteForCompletedRefund } from '@/lib/finance/invoice-service'
import { applyAcademyRefundInTransaction, requestAcademyRefund } from './academy-commerce-refund'

function fixture() {
  return {
    $queryRaw: vi.fn().mockResolvedValue([]),
    user: { findFirst: vi.fn().mockResolvedValue(null) },
    financialRefund: { update: vi.fn(async ({ data }: { data: object }) => ({ id: 'refund', ...data })), create: vi.fn() },
    financialPurchase: { update: vi.fn(), updateMany: vi.fn(), findUnique: vi.fn() },
    financialInvoice: { findUnique: vi.fn().mockResolvedValue({ id: 'credit-note' }) },
    financialEvent: { upsert: vi.fn() },
    learningAcademySeat: { findMany: vi.fn().mockResolvedValue([{ id: 'seat', enrollmentId: 'enrollment' }]), update: vi.fn() },
    learningAcademySeatEvent: { create: vi.fn() },
    learningEnrollment: { update: vi.fn() },
    learningRetentionParticipation: { findMany: vi.fn().mockResolvedValue([{ id: 'participation' }]) },
    learningAnnualReminder: { findMany: vi.fn().mockResolvedValue([{ id: 'reminder' }]) },
    notificationOutbox: { updateMany: vi.fn() },
    learningCertificate: { update: vi.fn(), delete: vi.fn() },
    learningExamAttempt: { update: vi.fn(), delete: vi.fn() },
    learningChapterProgress: { deleteMany: vi.fn() },
  }
}
let db: ReturnType<typeof fixture>
function current() {
  return { id: 'refund', purchaseId: 'purchase', approvedByUserId: 'operator', status: 'PENDING', credits: 0, amountCents: 14900, mollieRefundId: null as string | null,
    purchase: { id: 'purchase', kind: 'ACADEMY_COURSE', status: 'REFUND_REVIEW_REQUIRED', amountInclVatCents: 14900, currency: 'EUR', molliePaymentId: 'tr_fixture' } }
}
const snapshot = (status: MollieRefundSnapshot['status'] = 'refunded'): MollieRefundSnapshot => ({ id: 're_fixture', paymentId: 'tr_fixture', amountValue: '149.00', currency: 'EUR', status })
async function apply(value = current(), remote = snapshot()) {
  return applyAcademyRefundInTransaction(db as unknown as Parameters<typeof applyAcademyRefundInTransaction>[0], value as unknown as Parameters<typeof applyAcademyRefundInTransaction>[1], remote)
}
beforeEach(() => { vi.clearAllMocks(); db = fixture(); context.db = db })

describe('Academy full-refund safety with fake persistence and transport', () => {
  it('requires a current platform operator before refund creation or provider contact', async () => {
    const createRefund = vi.fn()
    await expect(requestAcademyRefund('student', 'purchase', 'Synthetic test reason', { createRefund } as unknown as MollieGateway)).rejects.toMatchObject({ code: 'ACCESS_DENIED' })
    expect(db.user.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ status: 'ACTIVE', platformRole: 'ADMIN', memberships: { some: expect.objectContaining({ status: 'ACTIVE', role: { in: ['OWNER', 'ADMIN'] }, organization: { status: 'ACTIVE', systemKey: 'WORKMATCHR_PLATFORM' } }) } }) }))
    expect(createRefund).not.toHaveBeenCalled()
    expect(db.financialRefund.create).not.toHaveBeenCalled()
  })

  it.each([{ amountValue: '1.00' }, { currency: 'USD' }, { paymentId: 'tr_other' }, { id: 're_other' }])('rejects unbound provider evidence %j without writes', async change => {
    const value = { ...current(), mollieRefundId: 're_fixture' }
    await expect(apply(value, { ...snapshot(), ...change })).rejects.toThrow('REFUND_MISMATCH')
    expect(db.financialRefund.update).not.toHaveBeenCalled()
    expect(db.learningEnrollment.update).not.toHaveBeenCalled()
  })

  it('rejects partial or credit-based Academy refunds rather than inventing a seat-allocation policy', async () => {
    await expect(apply({ ...current(), amountCents: 600 })).rejects.toThrow('FULL_REFUND_REQUIRED')
    await expect(apply({ ...current(), credits: 1 })).rejects.toThrow('FULL_REFUND_REQUIRED')
    expect(db.financialRefund.update).not.toHaveBeenCalled()
  })

  it.each(['queued', 'pending', 'processing'] as const)('does not revoke access or credit an invoice for %s', async status => {
    await apply(current(), snapshot(status))
    expect(db.financialRefund.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'PENDING' }) }))
    expect(db.learningEnrollment.update).not.toHaveBeenCalled()
    expect(issueCreditNoteForCompletedRefund).not.toHaveBeenCalled()
  })

  it.each(['failed', 'canceled'] as const)('preserves access on a %s refund', async status => {
    await apply(current(), snapshot(status))
    expect(db.financialPurchase.updateMany).toHaveBeenCalledWith({ where: { id: 'purchase', status: 'REFUND_REVIEW_REQUIRED' }, data: { status: 'PAID' } })
    expect(db.learningEnrollment.update).not.toHaveBeenCalled()
    expect(issueCreditNoteForCompletedRefund).not.toHaveBeenCalled()
  })

  it('revokes only after confirmation, blocks pending learning mail, preserves achievements and handles replay', async () => {
    const result = await apply()
    expect(result.refund.status).toBe('REFUNDED')
    expect(db.learningEnrollment.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'enrollment' }, data: expect.objectContaining({ accessRevokedAt: expect.any(Date), accessRevocationReason: 'ACADEMY_REFUND' }) }))
    expect(db.notificationOutbox.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ status: 'PENDING' }), data: { status: 'FAILED', lastErrorCode: 'ACADEMY_ACCESS_REVOKED' } }))
    expect(db.financialEvent.upsert).toHaveBeenCalledWith(expect.objectContaining({ where: { idempotencyKey: 'academy-refund:refund:REFUNDED' }, create: expect.objectContaining({ purchaseId: 'purchase', refundId: 'refund', eventType: 'ACADEMY_REFUND_STATUS' }) }))
    await apply({ ...current(), status: 'REFUNDED', mollieRefundId: 're_fixture' })
    expect(db.learningEnrollment.update).toHaveBeenCalledTimes(1)
    expect(issueCreditNoteForCompletedRefund).toHaveBeenCalledTimes(1)
    expect(db.learningCertificate.update).not.toHaveBeenCalled()
    expect(db.learningCertificate.delete).not.toHaveBeenCalled()
    expect(db.learningExamAttempt.update).not.toHaveBeenCalled()
    expect(db.learningExamAttempt.delete).not.toHaveBeenCalled()
    expect(db.learningChapterProgress.deleteMany).not.toHaveBeenCalled()
  })
})
