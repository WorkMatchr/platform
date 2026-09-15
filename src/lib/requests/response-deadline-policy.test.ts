import { describe, expect, it } from 'vitest'
import { responseDeadline } from './response-deadline-policy'
import { expertiseSpecialismSlugs } from './expertise-specialism-reference'
import { requestedExpertiseOptions } from './simple-advice-contract'

describe('WorkMatchr response deadline', () => {
  it.each([
    ['2026-09-15T10:15:32.123Z', '2026-09-29T10:15:32.123Z'],
    ['2026-03-20T11:00:00.000Z', '2026-04-03T10:00:00.000Z'],
    ['2026-10-20T10:00:00.000Z', '2026-11-03T11:00:00.000Z'],
    ['2026-12-25T12:00:00.000Z', '2027-01-08T12:00:00.000Z'],
  ])('adds 14 Amsterdam calendar days to %s', (source, expected) => {
    const date = new Date(source)
    expect(responseDeadline(date).toISOString()).toBe(expected)
    expect(date.toISOString()).toBe(source)
  })
  it('rejects invalid timestamps', () => expect(() => responseDeadline(new Date('invalid'))).toThrow())
  it('maps exactly the accepted 20 identities without duplicate target identities', () => {
    expect(Object.keys(expertiseSpecialismSlugs).sort()).toEqual(requestedExpertiseOptions.map(o => o.value).sort())
    expect(new Set(Object.values(expertiseSpecialismSlugs)).size).toBe(20)
  })
})
