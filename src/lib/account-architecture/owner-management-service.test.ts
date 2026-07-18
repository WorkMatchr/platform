import { describe, expect, it } from 'vitest'
import { endOrganizationMembership, OwnerManagementServiceError } from './owner-management-service'

describe('membershipbeëindiging in ADR-013 Fase 2B', () => {
  it('blijft expliciet fail-closed zolang de volledige lifecycle niet actief is', () => {
    expect(() => endOrganizationMembership()).toThrow(OwnerManagementServiceError)
    try {
      endOrganizationMembership()
    } catch (error) {
      expect(error).toMatchObject({ code: 'LIFECYCLE_NOT_AVAILABLE' })
    }
  })
})
