import { describe, expect, it } from 'vitest'
import { parseQuoteValidUntilDate } from './quote-validity-date'

describe('Dutch calendar-day quote validity', () => {
  it.each([
    ['2026-11-15', '2026-11-15T23:00:00.000Z'],
    ['2026-06-15', '2026-06-15T22:00:00.000Z'],
    ['2026-03-28', '2026-03-28T23:00:00.000Z'],
    ['2026-03-29', '2026-03-29T22:00:00.000Z'],
    ['2026-10-24', '2026-10-24T22:00:00.000Z'],
    ['2026-10-25', '2026-10-25T23:00:00.000Z'],
    ['2026-12-31', '2026-12-31T23:00:00.000Z'],
  ])('stores the exclusive start of the next Amsterdam day for %s', (input, expected) => {
    const expiry = parseQuoteValidUntilDate(input)
    expect(expiry.toISOString()).toBe(expected)
    expect(new Date(expiry.getTime() - 1).getTime()).toBeLessThan(expiry.getTime())
    expect(expiry.toISOString().slice(0, 10)).toBe(input) // date input round-trip
  })

  it.each(['2026-02-30', '2026-13-01', '2026-00-10', '2026-11-31', '2026-11-15T12:00:00Z', '15-11-2026', ''])('rejects invalid or timestamp inputs: %s', input => {
    expect(() => parseQuoteValidUntilDate(input)).toThrow(RangeError)
  })
})
