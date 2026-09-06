import { describe, expect, it, vi } from 'vitest'
import { mirrorCreditNoteSnapshot } from './credit-note-snapshot'
import { issueCreditNoteForCompletedRefund } from './invoice-service'
vi.mock('server-only', () => ({}))

function source() {
  return {
    id: 'original', snapshotVersion: 2, documentType: 'INVOICE', currency: 'EUR', credits: 25, organizationId: 'org',
    supplyDate: new Date('2026-09-01'), baseAmountCents: 2500, packageDiscountCents: 0, proDiscountCents: 0, discountCodeDiscountCents: 0,
    amountExclVatCents: 2500, vatAmountCents: 525, amountInclVatCents: 3025,
    sellerLegalName: 'Historische leverancier', customerOrganizationName: 'Historische klant', customerAddressLine: 'Historisch adres 1',
    lines: [{ position: 1, description: '25 credits', quantity: 25, unit: 'credit', unitPriceExclVatCents: 100,
      grossAmountExclVatCents: 2500, discountAmountCents: 0, netAmountExclVatCents: 2500, vatRateBps: 2100, vatAmountCents: 525, amountInclVatCents: 3025,
      servicePeriodStart: null, servicePeriodEnd: null }],
    vatSummaries: [{ vatRateBps: 2100, taxableAmountExclVatCents: 2500, vatAmountCents: 525, amountInclVatCents: 3025 }],
  }
}
const mirror = (value: ReturnType<typeof source>) => mirrorCreditNoteSnapshot(value as never)
describe('immutable v2 creditnota', () => {
  it('spiegelt €25 + €5,25 = €30,25 zonder bronmutatie', () => {
    const original = source(); const before = structuredClone(original)
    expect(mirror(original)).toMatchObject({ lines: [{ quantity: 25, unitPriceExclVatCents: -100,
      grossAmountExclVatCents: -2500, netAmountExclVatCents: -2500, vatAmountCents: -525, amountInclVatCents: -3025 }],
    vatSummaries: [{ taxableAmountExclVatCents: -2500, vatAmountCents: -525, amountInclVatCents: -3025 }] })
    expect(original).toEqual(before)
  })
  it.each(['lines', 'vatSummaries'] as const)('weigert ontbrekende %s', key => {
    const original = source(); original[key] = []
    expect(() => mirror(original)).toThrow('CREDIT_NOTE_SOURCE_INCONSISTENT')
  })
  it('weigert v1 zonder stille conversie', () => {
    expect(() => mirror({ ...source(), snapshotVersion: 1 })).toThrow('CREDIT_NOTE_V2_SOURCE_REQUIRED')
  })
  it('weigert mismatch in totalen en btw-groep', () => {
    expect(() => mirror({ ...source(), amountInclVatCents: 3026 })).toThrow()
    const original = source(); original.vatSummaries[0].vatAmountCents = 524
    expect(() => mirror(original)).toThrow()
  })
  it('spiegelt opgeslagen korting zonder herberekening', () => {
    const original = source(); original.proDiscountCents = 250; original.amountExclVatCents = 2250
    original.vatAmountCents = 473; original.amountInclVatCents = 2723
    Object.assign(original.lines[0], { discountAmountCents: 250, netAmountExclVatCents: 2250, vatAmountCents: 473, amountInclVatCents: 2723 })
    Object.assign(original.vatSummaries[0], { taxableAmountExclVatCents: 2250, vatAmountCents: 473, amountInclVatCents: 2723 })
    expect(mirror(original).lines[0]).toMatchObject({ discountAmountCents: -250, netAmountExclVatCents: -2250, vatAmountCents: -473 })
  })
  function tx(status = 'REFUNDED') {
    const original = source()
    return { $queryRaw: vi.fn().mockResolvedValue([{ nextNumber: 10 }]), $executeRaw: vi.fn(), financialInvoiceCounter: { update: vi.fn() },
      financialInvoice: { findUnique: vi.fn().mockResolvedValue(null), create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => ({ id: 'credit-note', ...data })) },
      financialRefund: { findUnique: vi.fn().mockResolvedValue({ id: 'refund', status, amountCents: 3025, credits: 25,
        purchase: { amountInclVatCents: 3025, organizationId: 'org', invoice: original } }) }, financialJorttSync: { create: vi.fn() } }
  }
  it('maakt één v2-document en technische Jortt-projectie uit historische partijen', async () => {
    const transaction = tx()
    await issueCreditNoteForCompletedRefund(transaction as never, 'refund')
    expect(transaction.financialInvoice.create).toHaveBeenCalledWith({ data: expect.objectContaining({ snapshotVersion: 2,
      documentType: 'CREDIT_NOTE', originalInvoiceId: 'original', amountExclVatCents: -2500, vatAmountCents: -525,
      amountInclVatCents: -3025, sellerLegalName: 'Historische leverancier', customerOrganizationName: 'Historische klant',
      lines: { create: expect.any(Array) }, vatSummaries: { create: expect.any(Array) } }) })
    expect(transaction.financialJorttSync.create).toHaveBeenCalledWith({ data: { invoiceId: 'credit-note', technicalReference: 'workmatchr-invoice:credit-note' } })
  })
  it.each(['PENDING', 'FAILED'])('weigert %s refund vóór uitgifte', async status => {
    const transaction = tx(status)
    await expect(issueCreditNoteForCompletedRefund(transaction as never, 'refund')).rejects.toThrow('COMPLETED_REFUND_REQUIRED')
    expect(transaction.financialInvoice.create).not.toHaveBeenCalled()
  })
  it('hergebruikt bestaande creditnota zonder writes', async () => {
    const transaction = tx(); transaction.financialInvoice.findUnique.mockResolvedValue({ id: 'existing' } as never)
    expect(await issueCreditNoteForCompletedRefund(transaction as never, 'refund')).toEqual({ id: 'existing' })
    expect(transaction.financialInvoice.create).not.toHaveBeenCalled(); expect(transaction.financialJorttSync.create).not.toHaveBeenCalled()
  })
})
