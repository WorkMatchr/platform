import { describe, expect, it } from 'vitest'
import {
  assertFuturePlatformPermissionAssignment,
  hasValidPlatformActorFoundation,
  PlatformPermissionPolicyError,
} from './platform-actor-policy'

const platformMembership = {
  status: 'ACTIVE' as const,
  organization: {
    status: 'ACTIVE' as const,
    organizationType: 'PLATFORM_OPERATOR' as const,
    systemKey: 'WORKMATCHR_PLATFORM',
  },
}
const centralAdministrator = {
  status: 'ACTIVE' as const,
  platformRole: 'ADMIN' as const,
  platformMembership,
}

describe('platformactorfundament', () => {
  it.each(['PROVIDER_REVIEWER', 'PROVIDER_APPROVER'] as const)(
    'vereist voor %s een actieve membership bij de platformorganisatie',
    (permission) => {
      expect(hasValidPlatformActorFoundation(permission, platformMembership)).toBe(true)
      expect(hasValidPlatformActorFoundation(permission, null)).toBe(false)
      expect(
        hasValidPlatformActorFoundation(permission, {
          ...platformMembership,
          organization: { ...platformMembership.organization, organizationType: 'PROVIDER' },
        }),
      ).toBe(false)
    },
  )

  it('vereist voor AUDITOR juist geen organisatiemembership', () => {
    expect(hasValidPlatformActorFoundation('PROVIDER_AUDITOR', null)).toBe(true)
    expect(hasValidPlatformActorFoundation('PROVIDER_AUDITOR', platformMembership)).toBe(false)
  })

  it('weigert tenantuitnodigingen en niet-centrale toekenning voor iedere platformpermission', () => {
    expect(() => assertFuturePlatformPermissionAssignment('PROVIDER_REVIEWER', platformMembership, {
      centralAdministrator,
      viaTenantInvitation: false,
    })).not.toThrow()
    expect(() => assertFuturePlatformPermissionAssignment('PROVIDER_AUDITOR', null, {
      centralAdministrator: { ...centralAdministrator, platformRole: 'USER' },
      viaTenantInvitation: false,
    })).toThrow(PlatformPermissionPolicyError)
    expect(() => assertFuturePlatformPermissionAssignment('PROVIDER_AUDITOR', null, {
      centralAdministrator,
      viaTenantInvitation: true,
    })).toThrow(PlatformPermissionPolicyError)
  })
})
