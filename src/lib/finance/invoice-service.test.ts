import { describe, expect, it, vi } from 'vitest'
import { formatFinancialDocumentNumber } from './invoice-service'

vi.mock('server-only', () => ({}))

describe('financiële documentnummering', () => {
  it('gebruikt WM-YYMM5NNN met een globale sequence', () => {
    expect(formatFinancialDocumentNumber(1, new Date('2026-08-09T12:00:00Z'))).toBe('WM-26085001')
    expect(formatFinancialDocumentNumber(42, new Date('2026-08-09T12:00:00Z'))).toBe('WM-26085042')
  })

  it('groeit zonder duplicerende afkap voorbij 999', () => {
    expect(formatFinancialDocumentNumber(1_000, new Date('2026-09-01T12:00:00Z'))).toBe('WM-260951000')
  })

  it('weigert ongeldige sequences', () => {
    expect(() => formatFinancialDocumentNumber(0, new Date())).toThrow('INVALID_INVOICE_SEQUENCE')
  })
})
