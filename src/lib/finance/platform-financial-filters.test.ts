import { describe, expect, it } from 'vitest'
import { paginationHref, parseDateBoundary, parsePage } from './platform-financial-filters'

describe('platform financiële filters', () => {
  it('normaliseert ongeldige paginanummers fail-safe', () => {
    expect(parsePage(undefined)).toBe(1)
    expect(parsePage('-2')).toBe(1)
    expect(parsePage('3')).toBe(3)
  })

  it('maakt inclusieve UTC-daggrenzen zonder vrije datuminterpretatie', () => {
    expect(parseDateBoundary('2026-08-24')?.toISOString()).toBe('2026-08-24T00:00:00.000Z')
    expect(parseDateBoundary('2026-08-24', true)?.toISOString()).toBe('2026-08-24T23:59:59.999Z')
    expect(parseDateBoundary('24-08-2026')).toBeUndefined()
  })

  it('behoudt actieve filters bij paginering', () => {
    expect(paginationHref('/platformbeheer/financien/betalingen', { status: 'PAID', organization: 'Acme', page: '2' }, 3))
      .toBe('/platformbeheer/financien/betalingen?status=PAID&organization=Acme&page=3')
  })
})
