import { expect, it } from 'vitest'
import { f4Price, selectF4Price, F4_PRO_ENTITLEMENT_APPROVED } from './compliance-f4-pricing'
it('bevriest eerste scan met exacte B2B-centbedragen', () => { expect(f4Price('FIRST_SCAN')).toMatchObject({ amountExclVatCents: 2495, vatAmountCents: 524, amountInclVatCents: 3019, vatRateBps: 2100, contractVersion: '2026-11-05.1' }); expect(Object.isFrozen(f4Price('FIRST_SCAN'))).toBe(true) })
it('bevriest opvolgtarief zonder onbewezen toegang te verlenen', () => { expect(f4Price('FOLLOW_UP_SCAN')).toMatchObject({ amountExclVatCents: 1495, vatAmountCents: 314, amountInclVatCents: 1809 }); expect(() => selectF4Price('FOLLOW_UP_SCAN')).toThrow('FOLLOW_UP_ELIGIBILITY_NOT_APPROVED'); expect(F4_PRO_ENTITLEMENT_APPROVED).toBe(false) })
it('kent geen willekeurig product of gratis standaardfallback', () => { expect(() => f4Price('PRO_INCLUDED' as never)).toThrow(); expect(selectF4Price('FIRST_SCAN').amountInclVatCents).toBe(3019) })
