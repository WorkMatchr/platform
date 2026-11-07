import { describe, expect, it } from 'vitest'
import { formatQuoteExpiry, isQuoteExpired, parseQuoteValidUntilDate, quoteExpiryFromSqlDate, quoteValidityInputDate } from './quote-validity-date'

describe('Dutch calendar-day quote validity', () => {
  it.each([
    ['2026-11-15', '2026-11-15T23:00:00.000Z'],
    ['2026-06-15', '2026-06-15T22:00:00.000Z'],
    ['2026-03-28', '2026-03-28T23:00:00.000Z'],
    ['2026-03-29', '2026-03-29T22:00:00.000Z'],
    ['2026-10-24', '2026-10-24T22:00:00.000Z'],
    ['2026-10-25', '2026-10-25T23:00:00.000Z'],
    ['2026-12-31', '2026-12-31T23:00:00.000Z'],
    ['2028-02-29', '2028-02-29T23:00:00.000Z'],
    ['2026-04-30', '2026-04-30T22:00:00.000Z'],
  ])('stores the exclusive start of the next Amsterdam day for %s', (input, expected) => {
    const stored = parseQuoteValidUntilDate(input)
    expect(stored.toISOString()).toBe(input + 'T00:00:00.000Z')
    expect(quoteValidityInputDate(stored)).toBe(input)
    expect(quoteExpiryFromSqlDate(stored).toISOString()).toBe(expected)
    const end = new Date(expected)
    expect(isQuoteExpired(stored, new Date(end.getTime() - 1))).toBe(false)
    expect(isQuoteExpired(stored, end)).toBe(true)
  })

  it('renders a stored calendar date in Amsterdam and refuses to truncate an explicit timestamp', () => {
    const stored = new Date('2026-11-15T00:00:00Z')
    expect(parseQuoteValidUntilDate(stored)).toBe(stored)
    expect(formatQuoteExpiry(stored)).toContain('16 november 2026')
    expect(() => parseQuoteValidUntilDate(new Date('2026-11-15T12:45:00Z'))).toThrow(RangeError)
  })

  it('can display a historical calendar date even when its timezone offset includes seconds', () => {
    expect(formatQuoteExpiry(parseQuoteValidUntilDate('1800-01-01'))).toContain('2 januari 1800')
  })

  it.each(['2026-02-29', '2026-02-30', '2026-13-01', '2026-00-10', '2026-11-31', '2026-11-15T12:00:00Z', '15-11-2026', ''])('rejects invalid or timestamp inputs: %s', input => {
    expect(() => parseQuoteValidUntilDate(input)).toThrow(RangeError)
  })
})
