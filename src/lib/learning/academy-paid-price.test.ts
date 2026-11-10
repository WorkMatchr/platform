import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { pilotAssessment, pilotQuote, pilotTax, PILOT_GROSS_CENTS } from './academy-paid-price'

describe('Nederlandse vooruitbetaalde Academy-pilot', () => {
  beforeEach(() => {
    vi.stubEnv('ACADEMY_PILOT_TAX', 'NL_KOR_CONFIRMED')
    vi.stubEnv('ACADEMY_CONFIRMED_KOR_END_DATE', undefined)
    vi.stubEnv('ACADEMY_KOR_END_DECISION_REF', undefined)
  })
  afterEach(() => vi.unstubAllEnvs())
  const cutoff = '2030-04-01'
  const before = new Date('2030-03-31T21:59:59.999Z')
  const after = new Date('2030-03-31T22:00:00.000Z')
  it('belast ook na een beoogde einddatum niets zolang geen beëindiging is bevestigd', () => {
    expect(pilotQuote(PILOT_GROSS_CENTS, after)).toMatchObject({
      baseAmountCents: 14900,
      discountCodeDiscountCents: 14751,
      vatRateBps: 0,
      vatAmountCents: 0,
      amountInclVatCents: 149,
    })
  })
  it('gebruikt de bevestigde Nederlandse kalenderdag, inclusief de grens bij zomertijd', () => {
    vi.stubEnv('ACADEMY_CONFIRMED_KOR_END_DATE', cutoff)
    vi.stubEnv('ACADEMY_KOR_END_DECISION_REF', 'synthetic-decision')
    expect(pilotTax(before)).toEqual('NL_KOR')
    expect(pilotQuote(PILOT_GROSS_CENTS, after)).toMatchObject({
      baseAmountCents: 12314,
      amountExclVatCents: 123,
      discountCodeDiscountCents: 12191,
      vatRateBps: 2100,
      vatAmountCents: 26,
      amountInclVatCents: 149,
    })
    expect(14900 - 12314).toBe(2586)
  })
  it.each([
    ['2030-02-30', 'test'],
    [cutoff, ''],
    ['', 'test'],
  ])('weigert onvolledig of ongeldig besluit %s / %s', (date, ref) => {
    vi.stubEnv('ACADEMY_CONFIRMED_KOR_END_DATE', date)
    vi.stubEnv('ACADEMY_KOR_END_DECISION_REF', ref)
    expect(() => pilotTax(after)).toThrow('PILOT_TAX_REVIEW_REQUIRED')
  })
  it.each(['2030-12-31T23:00:00.000Z', '2030-03-31T22:00:00.000Z'])('bewijst beide zijden van de regimegrens op %s', boundary => {
    const at = new Date(boundary)
    const prior = new Date(at.getTime() - 1)
    const day = new Date(at.getTime() + 7200000).toISOString().slice(0, 10)
    vi.stubEnv('ACADEMY_CONFIRMED_KOR_END_DATE', day)
    vi.stubEnv('ACADEMY_KOR_END_DECISION_REF', 'synthetic')
    const sale = { id: 'synthetic', createdAt: prior, vatRateBps: 0 }
    expect(pilotTax(prior)).toBe('NL_KOR')
    expect(pilotTax(at)).toBe('NL_STANDARD')
    expect(() => pilotAssessment(sale, at, at)).toThrow('PILOT_TAX_POINT_REVIEW_REQUIRED')
    vi.stubEnv('ACADEMY_PILOT_TAX_DECISION', 'synthetic|INVOICE|' + prior.toISOString() + '|decision')
    expect(pilotAssessment(sale, at, at).at).toEqual(prior)
    vi.stubEnv('ACADEMY_PILOT_TAX_DECISION', 'synthetic|RECEIPT|' + at.toISOString() + '|decision')
    expect(pilotAssessment(sale, at, at).at).toEqual(at)
    expect(() => pilotAssessment(sale, prior, at)).toThrow('PILOT_TAX_POINT_REVIEW_REQUIRED')
  })
  it('weigert onbekende fiscale status', () => {
    vi.stubEnv('ACADEMY_PILOT_TAX', undefined)
    expect(() => pilotTax(before)).toThrow()
  })
})
