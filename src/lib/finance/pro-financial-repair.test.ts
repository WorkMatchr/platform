import { describe, expect, it, vi } from 'vitest'
import { allocateProCredit } from './pro-credit-service'
import { firstProPeriodEnd, recurringContractPeriod, resolveProInvoiceSource } from './pro-payment-source'

describe('Pro correction contract', () => {
  it('allocates every cent once across partial credits, including the final VAT cent', () => {
    let gross = 0; let net = 0; let vat = 0
    for (const amount of [1, 1, 997, 333, 4597]) {
      const part = allocateProCredit(5929, 4900, gross, net, amount)
      gross += part.gross; net += part.net; vat += part.vat
    }
    expect({ gross, net, vat }).toEqual({ gross: 5929, net: 4900, vat: 1029 })
    expect(() => allocateProCredit(5929, 4900, gross, net, 1)).toThrow('PRO_CREDIT_LIMIT_EXCEEDED')
  })
  it.each([0, -1, 1.5, 5930, Infinity, NaN])('rejects invalid/overcredit amount %s', amount => {
    expect(() => allocateProCredit(5929, 4900, 0, 0, amount)).toThrow()
  })
  it('anchors renewal to the contract and restores month-end after February', () => {
    const anchor = new Date('2026-01-31T14:00:00Z')
    expect(firstProPeriodEnd(anchor)).toEqual(new Date('2026-02-28T14:00:00Z'))
    expect(recurringContractPeriod(anchor, '2026-02-28T00:00:00Z')).toEqual({ start: new Date('2026-02-28T14:00:00Z'), end: new Date('2026-03-31T14:00:00Z') })
    expect(() => recurringContractPeriod(anchor, '2026-04-01T00:00:00Z')).toThrow('PRO_PAYMENT_SCHEDULE_REVIEW_REQUIRED')
    expect(() => recurringContractPeriod(anchor, null)).toThrow('PRO_PAYMENT_SCHEDULE_REQUIRED')
    expect(() => recurringContractPeriod(anchor, '2026-01-31')).toThrow('PRO_PAYMENT_BEFORE_RENEWAL')
  })
  it('finds the paid retry and rejects ambiguous or cross-tenant sources', async () => {
    const invoice = { purchaseId: 'paid', organizationId: 'org', documentType: 'INVOICE', snapshotVersion: 2,
      servicePeriodStart: new Date('2026-01-01'), servicePeriodEnd: new Date('2026-02-01'), molliePaymentId: 'tr_paid', amountInclVatCents: 5929 }
    const purchase = { id: 'paid', kind: 'PRO_SUBSCRIPTION', status: 'PAID', organizationId: 'org', invoice, molliePaymentId: 'tr_paid', amountInclVatCents: 5929 }
    const subscription = { organizationId: 'org', firstPaymentPurchase: { status: 'EXPIRED' }, firstPaymentAttempts: [{ purchase }] }
    const tx = { professionalSubscription: { findUniqueOrThrow: vi.fn().mockResolvedValue(subscription) } }
    expect((await resolveProInvoiceSource(tx as never, 'sub')).purchase.id).toBe('paid')
    tx.professionalSubscription.findUniqueOrThrow.mockResolvedValue({ ...subscription, firstPaymentPurchase: { ...purchase, id: 'other' } })
    await expect(resolveProInvoiceSource(tx as never, 'sub')).rejects.toThrow('PRO_PAID_INVOICE_SOURCE_AMBIGUOUS')
    tx.professionalSubscription.findUniqueOrThrow.mockResolvedValue({ ...subscription, organizationId: 'foreign' })
    await expect(resolveProInvoiceSource(tx as never, 'sub')).rejects.toThrow('PRO_PAID_INVOICE_SOURCE_MISMATCH')
  })
})
