import { describe, expect, it, vi } from 'vitest'
import { centsToMollieValue, mollieValueToCents } from './mollie-gateway'

vi.mock('server-only', () => ({}))

describe('Mollie-bedragconversie', () => {
  it.each([[0, '0.00'], [1, '0.01'], [121, '1.21'], [3_025, '30.25'], [5_929, '59.29']])(
    'converteert %i cent verliesvrij naar %s',
    (cents, value) => {
      expect(centsToMollieValue(cents)).toBe(value)
      expect(mollieValueToCents(value)).toBe(cents)
    },
  )

  it('weigert floats, negatieve bedragen en ongeldige Mollie-notatie', () => {
    expect(() => centsToMollieValue(1.5)).toThrow('INVALID_MONEY_AMOUNT')
    expect(() => centsToMollieValue(-1)).toThrow('INVALID_MONEY_AMOUNT')
    expect(() => mollieValueToCents('12,50')).toThrow('INVALID_MOLLIE_AMOUNT')
  })
})
