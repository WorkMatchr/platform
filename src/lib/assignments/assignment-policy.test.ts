import { describe, expect, it } from 'vitest'
import type { AssignmentAccessContext } from './assignment-policy'
import { canManageAssignment, canViewAssignment } from './assignment-policy'

const context: AssignmentAccessContext = {
  userId: 'user-1',
  userStatus: 'ACTIVE',
  membershipRole: 'MEMBER',
  membershipStatus: 'ACTIVE',
  organizationStatus: 'ACTIVE',
  organizationType: 'CLIENT',
  intakeCreatedByUserId: 'user-1',
}

describe('opdrachtautorisatiebeleid', () => {
  it.each(['OWNER', 'ADMIN'] as const)('%s mag organisatieopdrachten bekijken en beheren', (membershipRole) => {
    expect(canViewAssignment({ ...context, membershipRole, intakeCreatedByUserId: 'other-user' })).toBe(true)
    expect(canManageAssignment({ ...context, membershipRole })).toBe(true)
  })

  it('laat een MEMBER alleen een opdracht uit de eigen intake bekijken', () => {
    expect(canViewAssignment(context)).toBe(true)
    expect(canViewAssignment({ ...context, intakeCreatedByUserId: 'other-user' })).toBe(false)
    expect(canManageAssignment(context)).toBe(false)
  })

  it.each(['BLOCKED', 'ARCHIVED'] as const)('weigert een gebruiker met status %s', (userStatus) => {
    expect(canViewAssignment({ ...context, userStatus })).toBe(false)
  })

  it('weigert inactieve memberships en organisaties', () => {
    expect(canViewAssignment({ ...context, membershipStatus: 'SUSPENDED' })).toBe(false)
    expect(canViewAssignment({ ...context, organizationStatus: 'SUSPENDED' })).toBe(false)
    expect(canViewAssignment({ ...context, organizationStatus: 'ARCHIVED' })).toBe(false)
  })

  it('weigert een organisatie die uitsluitend aanbieder is', () => {
    expect(canViewAssignment({ ...context, organizationType: 'PROVIDER' })).toBe(false)
    expect(canManageAssignment({ ...context, membershipRole: 'OWNER', organizationType: 'PROVIDER' })).toBe(false)
  })
})
