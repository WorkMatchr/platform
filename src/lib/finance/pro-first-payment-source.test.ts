import { describe, expect, it } from 'vitest'
import { resolveCanonicalProFirstPayment } from './pro-first-payment-source'

type Source = { id: string; kind: string; status: string; invoice: { id: string } | null }
const paid: Source = { id: 'retry', kind: 'PRO_SUBSCRIPTION', status: 'PAID', invoice: { id: 'immutable' } }
const failed: Source = { ...paid, id: 'original', status: 'FAILED', invoice: null }
describe('canonieke Pro-first-paymentbron', () => {
  it('negeert de gefaalde oorspronkelijke aankoop en kiest de betaalde retry', () => {
    expect(resolveCanonicalProFirstPayment({ firstPaymentPurchase: failed, firstPaymentAttempts: [{ purchase: failed }, { purchase: paid }] })).toBe(paid)
  })
  it('dedupliceert dezelfde purchase uit beide relaties', () => {
    expect(resolveCanonicalProFirstPayment({ firstPaymentPurchase: paid, firstPaymentAttempts: [{ purchase: paid }] })).toBe(paid)
  })
  it('weigert meerdere betaalde purchases, ook als een factuur ontbreekt', () => {
    expect(() => resolveCanonicalProFirstPayment({ firstPaymentPurchase: paid, firstPaymentAttempts: [{ purchase: { ...paid, id: 'other', invoice: null } }] })).toThrow('AMBIGUOUS')
  })
  it('weigert een ontbrekende betaalde bron of factuur', () => {
    expect(() => resolveCanonicalProFirstPayment({ firstPaymentPurchase: failed, firstPaymentAttempts: [] })).toThrow('AMBIGUOUS')
    expect(() => resolveCanonicalProFirstPayment({ firstPaymentPurchase: { ...paid, invoice: null }, firstPaymentAttempts: [] })).toThrow('INVOICE_REQUIRED')
  })
})
