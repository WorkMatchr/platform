import { describe, it, expect, vi, beforeEach } from 'vitest'
import { randomUUID } from 'node:crypto'
import { allocateLegalRefund } from './academy-legal-refund-policy'
const state = vi.hoisted(() => ({ db: null as unknown }))
vi.mock('@/lib/finance/financial-transaction', () => ({ runSerializableFinancialTransaction: (fn: (db: unknown) => unknown) => fn(state.db) }))
vi.mock('./academy-commerce-environment', () => ({ assertAcademyCommerceSandbox: vi.fn() }))
vi.mock('./academy-legal-refund-apply', () => ({ applyAcademyLegalRefund: vi.fn() }))
import { approveAcademyLegalRefund, executeAcademyLegalRefund } from './academy-legal-refund-service'
const zero = { amountInclVatCents: 0, amountExclVatCents: 0, vatAmountCents: 0 }
const original = { amountInclVatCents: 59500, amountExclVatCents: 49174, vatAmountCents: 10326 }
const seats = Array.from({length:5},(_,i)=>({id:randomUUID(),position:i+1}))
const pricingSnapshot={formatVersion:1,quantity:5,originalGrossCents:59500,finalGrossCents:59500,discountGrossCents:0,scheme:{kind:'NONE',grossCents:59500}}
function fixture() {
  return { $queryRaw: vi.fn(), user: { findFirst: vi.fn().mockResolvedValue({ id: 'operator' }) },
    academyLegalRefundDecision: { findUnique: vi.fn().mockResolvedValue(null), create: vi.fn(async ({ data }) => ({ id: randomUUID(), ...data })) },
    financialRefund: { create: vi.fn(async ({ data }) => ({ id: randomUUID(), status: 'PENDING', ...data })), findUniqueOrThrow: vi.fn() },
    financialPurchase: { findUnique: vi.fn().mockResolvedValue({ id: randomUUID(), kind: 'ACADEMY_COURSE', pricingMode: 'ACADEMY_SANDBOX', status: 'PAID', molliePaymentId: 'tr_fake',
      ...original, vatRateBps: 2100, academyOrder: { seats, quantity:5, pricingSnapshot, benefitProof:{} }, invoice: { snapshotVersion: 2 }, refunds: [] }), update: vi.fn() },
    academyRefundSeatAllocation: { createMany: vi.fn() }, financialEvent: { create: vi.fn() } }
}
let db: ReturnType<typeof fixture>
const input = () => ({ purchaseId: randomUUID(), requestKey: randomUUID(), reason: 'Afzonderlijk beoordeelde wettelijke aanspraak', legalEntitlementReviewed: true,
  ...allocateLegalRefund(original, zero, 11900), seatIds: [], seatAllocations:[{seatId:seats[0].id,amountCents:11900}] })
beforeEach(() => { vi.clearAllMocks(); db = fixture(); state.db = db })
describe('D09 bounded original-snapshot allocation', () => {
  it('reconciles every cent for sequential partial refunds, including final rounding', () => {
    for (let gross = 1; gross < 70; gross++) for (let net = 0; net <= gross; net++) {
      const total = { amountInclVatCents: gross, amountExclVatCents: net, vatAmountCents: gross - net }; let used = { ...zero }
      while (used.amountInclVatCents < gross) {
        const part = allocateLegalRefund(total, used, Math.min(3, gross - used.amountInclVatCents))
        used = { amountInclVatCents: used.amountInclVatCents + part.amountInclVatCents, amountExclVatCents: used.amountExclVatCents + part.amountExclVatCents, vatAmountCents: used.vatAmountCents + part.vatAmountCents }
        expect(used.amountExclVatCents).toBeLessThanOrEqual(net); expect(used.vatAmountCents).toBeLessThanOrEqual(gross - net)
      }
      expect(used).toEqual(total)
    }
  })
  it.each([0, -1, 59501, 1.5, NaN, Infinity])('rejects invalid or excessive amount %s', amount => expect(() => allocateLegalRefund(original, zero, amount)).toThrow())
  it('reserves pending capacity and never reads current prices', () => {
    const first = allocateLegalRefund(original, zero, 10000)
    expect(() => allocateLegalRefund(original, first, 49501)).toThrow('CAP_EXCEEDED')
    const last = allocateLegalRefund(original, first, 49500)
    expect(last.amountExclVatCents + first.amountExclVatCents).toBe(original.amountExclVatCents)
  })
})
describe('D09 explicit human approval and fake-only execution', () => {
  it('requires current platform authority before creating anything', async () => {
    db.user.findFirst.mockResolvedValue(null as never)
    await expect(approveAcademyLegalRefund('student', input())).rejects.toThrow()
    expect(db.academyLegalRefundDecision.create).not.toHaveBeenCalled(); expect(db.financialRefund.create).not.toHaveBeenCalled()
  })
  it('rejects automatic approval, duplicate seats, foreign seats and unapproved amounts', async () => {
    const request = input(), seat = randomUUID()
    await expect(approveAcademyLegalRefund('operator', { ...request, legalEntitlementReviewed: false })).rejects.toThrow()
    await expect(approveAcademyLegalRefund('operator', { ...request, seatIds: [seat, seat] })).rejects.toThrow('SEAT_MISMATCH')
    await expect(approveAcademyLegalRefund('operator', { ...request, seatIds: [seat] })).rejects.toThrow('SEAT_MISMATCH')
    await expect(approveAcademyLegalRefund('operator', { ...request, amountExclVatCents: 1 })).rejects.toThrow('ALLOCATION_MISMATCH')
    expect(db.financialRefund.create).not.toHaveBeenCalled()
  })
  it('creates immutable approval, one pending intent and audit without provider contact', async () => {
    const request = input(), result = await approveAcademyLegalRefund('operator', request)
    expect(result.sourceSnapshot).toMatchObject({ taxReview: 'TAX REVIEW REQUIRED', gross: 59500 })
    expect(db.financialRefund.create).toHaveBeenCalledWith({ data: expect.objectContaining({ legalDecisionId: result.id, amountCents: 11900, credits: 0 }) })
    expect(db.financialEvent.create).toHaveBeenCalledTimes(1)
    db.academyLegalRefundDecision.findUnique.mockResolvedValue({ ...result, purchaseId: request.purchaseId } as never)
    await approveAcademyLegalRefund('operator', request)
    expect(db.financialRefund.create).toHaveBeenCalledTimes(1)
    await expect(approveAcademyLegalRefund('operator', { ...request, reason: 'Gewijzigde wettelijke motivering' })).rejects.toThrow('REPLAY_MISMATCH')
  })
  it('requires explicit complete per-seat money and refuses foreign or duplicate allocation',async()=>{
    const request=input()
    await expect(approveAcademyLegalRefund('operator',{...request,seatAllocations:[]})).rejects.toThrow()
    await expect(approveAcademyLegalRefund('operator',{...request,seatAllocations:[{seatId:randomUUID(),amountCents:11900}]})).rejects.toThrow('SEAT_MISMATCH')
    await expect(approveAcademyLegalRefund('operator',{...request,seatAllocations:[{seatId:seats[0].id,amountCents:100}]})).rejects.toThrow('ALLOCATION_MISMATCH')
    await expect(approveAcademyLegalRefund('operator',{...request,seatAllocations:[...request.seatAllocations,...request.seatAllocations]})).rejects.toThrow('SEAT_MISMATCH')
    expect(db.financialRefund.create).not.toHaveBeenCalled()
  })
  it('rejects excessive per-seat money even when package has remaining capacity',async()=>{
    const purchase=await db.financialPurchase.findUnique()
    const amounts=allocateLegalRefund(original,zero,100)
    db.financialPurchase.findUnique.mockResolvedValue({...purchase,refunds:[{id:randomUUID(),status:'PENDING',amountCents:100,legalDecision:amounts,seatAllocations:[{seatId:seats[0].id,amountCents:100}]}]} as never)
    const next=allocateLegalRefund(original,amounts,11900)
    await expect(approveAcademyLegalRefund('operator',{...input(),...next})).rejects.toThrow('SEAT_CAP_EXCEEDED')
    expect(db.financialRefund.create).not.toHaveBeenCalled()
  })
  it('requires review for an old partial refund without money attribution before reserving more',async()=>{
    const purchase=await db.financialPurchase.findUnique(),amounts=allocateLegalRefund(original,zero,100)
    db.financialPurchase.findUnique.mockResolvedValue({...purchase,refunds:[{id:randomUUID(),status:'REFUNDED',amountCents:100,legalDecision:amounts,seatAllocations:[]}]} as never)
    await expect(approveAcademyLegalRefund('operator',{...input(),...allocateLegalRefund(original,amounts,11900)})).rejects.toThrow('REVIEW_REQUIRED')
    expect(db.financialRefund.create).not.toHaveBeenCalled()
  })
  it.each(['STANDARD', 'ONBOARDING_SANDBOX'])('rejects non-Academy pricing mode %s', async mode => {
    const purchase = await db.financialPurchase.findUnique(); db.financialPurchase.findUnique.mockResolvedValue({ ...purchase, pricingMode: mode })
    await expect(approveAcademyLegalRefund('operator', input())).rejects.toThrow('SANDBOX_PURCHASE_REQUIRED')
  })
  it('rejects real transport before accessing persistence', async () => {
    const fake = { transport: 'LIVE', createRefund: vi.fn(), getRefund: vi.fn() }
    await expect(executeAcademyLegalRefund('operator', randomUUID(), fake as never)).rejects.toThrow('FAKE_PROVIDER_REQUIRED')
    expect(db.user.findFirst).not.toHaveBeenCalled(); expect(fake.createRefund).not.toHaveBeenCalled()
  })
  it('retains the exact pending intent on ambiguous fake network failure', async () => {
    const refund = { id: 'refund', status: 'PENDING', amountCents: 100, seatAllocations:[{amountCents:100}], idempotencyKey: 'original-key', purchase: { pricingMode: 'ACADEMY_SANDBOX', molliePaymentId: 'tr_fake' } }
    db.financialRefund.findUniqueOrThrow.mockResolvedValue(refund)
    const fake = { transport: 'FAKE' as const, createRefund: vi.fn().mockRejectedValue(new Error('SIMULATED_TIMEOUT')), getRefund: vi.fn() }
    await expect(executeAcademyLegalRefund('operator', randomUUID(), fake)).rejects.toThrow('SIMULATED_TIMEOUT')
    await expect(executeAcademyLegalRefund('operator', randomUUID(), fake)).rejects.toThrow('SIMULATED_TIMEOUT')
    expect(fake.createRefund.mock.calls.every(([call]) => call.idempotencyKey === 'original-key')).toBe(true)
    expect(db.financialRefund.create).not.toHaveBeenCalled(); expect(db.financialPurchase.update).not.toHaveBeenCalled()
  })
  it.each(['REFUNDED', 'FAILED', 'CANCELED'])('never repeats a terminal %s delivery', async status => {
    db.financialRefund.findUniqueOrThrow.mockResolvedValue({ status, purchase: { pricingMode: 'ACADEMY_SANDBOX' } })
    const fake = { transport: 'FAKE' as const, createRefund: vi.fn(), getRefund: vi.fn() }
    await executeAcademyLegalRefund('operator', randomUUID(), fake)
    expect(fake.createRefund).not.toHaveBeenCalled(); expect(fake.getRefund).not.toHaveBeenCalled()
  })
})
