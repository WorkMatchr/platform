import { describe, expect, it } from 'vitest'
import {
  accountTypeSupportsClientWork,
  accountTypeSupportsProfessionalWork,
  isAccountTypeCompatibleWithOrganization,
  organizationTypeForAccountType,
} from './account-type-policy'

describe('accounttypebeleid', () => {
  it('koppelt nieuwe accounttypen deterministisch aan één organisatietype', () => {
    expect(organizationTypeForAccountType('CLIENT')).toBe('CLIENT')
    expect(organizationTypeForAccountType('PROFESSIONAL')).toBe('PROVIDER')
  })

  it('scheidt opdrachtgever- en professionalwerk strikt', () => {
    expect(accountTypeSupportsClientWork('CLIENT')).toBe(true)
    expect(accountTypeSupportsClientWork('PROFESSIONAL')).toBe(false)
    expect(accountTypeSupportsProfessionalWork('PROFESSIONAL')).toBe(true)
    expect(accountTypeSupportsProfessionalWork('CLIENT')).toBe(false)
  })

  it('behoudt BOTH uitsluitend als compatibele legacy-professionalorganisatie', () => {
    expect(isAccountTypeCompatibleWithOrganization('PROFESSIONAL', 'BOTH')).toBe(true)
    expect(isAccountTypeCompatibleWithOrganization('CLIENT', 'BOTH')).toBe(false)
    expect(isAccountTypeCompatibleWithOrganization(null, 'PLATFORM_OPERATOR')).toBe(true)
  })
})
