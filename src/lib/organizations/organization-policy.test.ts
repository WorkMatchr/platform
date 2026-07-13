import { describe, expect, it } from 'vitest'
import { canCreateOrganization, canManageOrganization, shouldCreateProviderProfile } from './organization-policy'

describe('organisatiebeleid', () => {
  it('laat uitsluitend ACTIVE gebruikers organisaties aanmaken', () => {
    expect(canCreateOrganization('ACTIVE')).toBe(true)
    expect(canCreateOrganization('BLOCKED')).toBe(false)
    expect(canCreateOrganization('ARCHIVED')).toBe(false)
    expect(canCreateOrganization('INVITED')).toBe(false)
  })

  it.each(['OWNER', 'ADMIN'] as const)('%s mag een actieve organisatie beheren', (role) => {
    expect(canManageOrganization(role, 'ACTIVE', 'ACTIVE')).toBe(true)
  })

  it('maakt MEMBER read-only en weigert inactieve contexten', () => {
    expect(canManageOrganization('MEMBER', 'ACTIVE', 'ACTIVE')).toBe(false)
    expect(canManageOrganization('OWNER', 'SUSPENDED', 'ACTIVE')).toBe(false)
    expect(canManageOrganization('OWNER', 'ACTIVE', 'SUSPENDED')).toBe(false)
    expect(canManageOrganization('ADMIN', 'ACTIVE', 'ARCHIVED')).toBe(false)
  })

  it('maakt alleen voor PROVIDER en BOTH een aanbiederprofiel', () => {
    expect(shouldCreateProviderProfile('CLIENT')).toBe(false)
    expect(shouldCreateProviderProfile('PROVIDER')).toBe(true)
    expect(shouldCreateProviderProfile('BOTH')).toBe(true)
  })
})
