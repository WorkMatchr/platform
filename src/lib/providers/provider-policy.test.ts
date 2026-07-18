import { describe, expect, it } from 'vitest'
import { canManageProviderData, isPermissionActive, requiresFourEyes } from './provider-policy'

const activeProviderActor = {
  userStatus: 'ACTIVE' as const,
  membershipStatus: 'ACTIVE' as const,
  membershipRole: 'OWNER' as const,
  organizationStatus: 'ACTIVE' as const,
  organizationType: 'PROVIDER' as const,
}

describe('providerautorisatiebeleid', () => {
  it.each([
    ['OWNER', 'PROVIDER'],
    ['OWNER', 'BOTH'],
    ['ADMIN', 'BOTH'],
  ] as const)('staat actieve %s bij %s toe providerdata te beheren', (membershipRole, organizationType) => {
    expect(canManageProviderData({ ...activeProviderActor, membershipRole, organizationType })).toBe(true)
  })

  it('weigert MEMBER, inactieve memberships en geschorste organisaties', () => {
    expect(canManageProviderData({ ...activeProviderActor, membershipRole: 'MEMBER' })).toBe(false)
    expect(canManageProviderData({ ...activeProviderActor, membershipStatus: 'SUSPENDED' })).toBe(false)
    expect(canManageProviderData({ ...activeProviderActor, organizationStatus: 'SUSPENDED' })).toBe(false)
  })

  it('weigert een CLIENT-organisatie ook voor een OWNER', () => {
    expect(canManageProviderData({ ...activeProviderActor, organizationType: 'CLIENT' })).toBe(false)
  })

  it('accepteert uitsluitend een actuele, niet-ingetrokken expliciete permission', () => {
    const at = new Date('2026-07-14T12:00:00.000Z')
    const grant = { permission: 'PROVIDER_REVIEWER' as const, validFrom: new Date('2026-07-01T00:00:00.000Z'), validUntil: null, revocation: null }
    expect(isPermissionActive(grant, 'PROVIDER_REVIEWER', at)).toBe(true)
    expect(isPermissionActive({ ...grant, revocation: {} }, 'PROVIDER_REVIEWER', at)).toBe(false)
    expect(isPermissionActive({ ...grant, validUntil: at }, 'PROVIDER_REVIEWER', at)).toBe(false)
    expect(isPermissionActive(grant, 'PROVIDER_APPROVER', at)).toBe(false)
  })

  it('dwingt twee verschillende actoren af', () => {
    expect(requiresFourEyes('reviewer', 'approver')).toBe(true)
    expect(requiresFourEyes('same', 'same')).toBe(false)
  })
})
