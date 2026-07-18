import { describe, expect, it } from 'vitest'
import {
  assertNormalOrganizationOperationAllowed,
  isPlatformOrganization,
  PlatformOrganizationGovernanceError,
} from './platform-organization-governance'

const platform = {
  organizationType: 'PLATFORM_OPERATOR' as const,
  status: 'ACTIVE' as const,
  systemKey: 'WORKMATCHR_PLATFORM',
}

describe('governance platformorganisatie', () => {
  it.each(['UPDATE', 'ARCHIVE', 'DELETE', 'CREATE_PROVIDER_PROFILE', 'CREATE_INTAKE', 'CREATE_ASSIGNMENT'] as const)(
    'weigert normale operatie %s',
    (operation) => {
      expect(() => assertNormalOrganizationOperationAllowed(platform, operation)).toThrow(
        PlatformOrganizationGovernanceError,
      )
    },
  )

  it('herkent niet op naam en staat een gewone tenant toe', () => {
    const sameNameTenant = { organizationType: 'CLIENT' as const, status: 'ACTIVE' as const, systemKey: null }
    expect(isPlatformOrganization(sameNameTenant)).toBe(false)
    expect(() => assertNormalOrganizationOperationAllowed(sameNameTenant, 'UPDATE')).not.toThrow()
  })
})
