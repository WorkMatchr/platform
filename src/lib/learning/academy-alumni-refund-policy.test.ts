import { describe, expect, it } from 'vitest'
import { academyAlumniRefundState } from './academy-alumni-refund-policy'
const refund = (id: string, amountCents: number, status = 'REFUNDED') => ({ id, amountCents, status })
describe('D10 confirmed original-amount classification', () => {
  it('keeps a partial refund distinct from full repayment, including the last cent', () => {
    expect(academyAlumniRefundState(14900, [])).toBe('NONE')
    expect(academyAlumniRefundState(14900, [refund('a', 14899)])).toBe('PARTIAL')
    expect(academyAlumniRefundState(14900, [refund('a', 14899), refund('b', 1)])).toBe('FULL')
  })
  it.each(['PENDING', 'FAILED', 'CANCELED'])('ignores %s amounts for alumni revocation', status => {
    expect(academyAlumniRefundState(14900, [refund('a', 14900, status)])).toBe('NONE')
    expect(academyAlumniRefundState(14900, [refund('a', 100), refund('b', 14800, status)])).toBe('PARTIAL')
  })
  it('is idempotent across replay and independent of processing order', () => {
    const a = refund('a', 5000), b = refund('b', 9900)
    expect(academyAlumniRefundState(14900, [a, a, b, b])).toBe('FULL')
    expect(academyAlumniRefundState(14900, [b, a])).toBe('FULL')
    expect(academyAlumniRefundState(14900, [a, a])).toBe('PARTIAL')
  })
  it('fails closed on contradictory replay, missing identity or excessive evidence', () => {
    expect(academyAlumniRefundState(14900, [refund('a', 100), refund('a', 200)])).toBe('INVALID')
    expect(academyAlumniRefundState(14900, [refund('', 100)])).toBe('INVALID')
    expect(academyAlumniRefundState(14900, [refund('a', 14901)])).toBe('INVALID')
  })
  it.each([0, -1, NaN, Infinity, 1.5])('rejects unsupported original consideration %s', amount => {
    expect(academyAlumniRefundState(amount, [])).toBe('INVALID')
  })
})
