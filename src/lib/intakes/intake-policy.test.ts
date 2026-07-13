import { describe, expect, it } from 'vitest'
import type { IntakePolicyContext } from './intake-types'
import {
  canArchiveIntake,
  canConvertIntake,
  canEditIntake,
  canMarkIntakeReadyForReview,
  canReopenIntake,
  canViewIntake,
} from './intake-policy'

const baseContext: IntakePolicyContext = {
  userId: 'user-1',
  userStatus: 'ACTIVE',
  membershipStatus: 'ACTIVE',
  membershipRole: 'MEMBER',
  organizationStatus: 'ACTIVE',
  organizationType: 'CLIENT',
  createdByUserId: 'user-1',
  intakeStatus: 'DRAFT',
}

describe('intakeautorisatiebeleid', () => {
  it.each(['OWNER', 'ADMIN'] as const)('%s beheert alle conceptintakes binnen de organisatie', (membershipRole) => {
    const context = { ...baseContext, membershipRole, createdByUserId: 'other-user' }
    expect(canViewIntake(context)).toBe(true)
    expect(canEditIntake(context)).toBe(true)
    expect(canMarkIntakeReadyForReview(context)).toBe(true)
    expect(canArchiveIntake(context)).toBe(true)
  })

  it('laat een MEMBER alleen de eigen conceptintake beheren', () => {
    expect(canEditIntake(baseContext)).toBe(true)
    expect(canEditIntake({ ...baseContext, createdByUserId: 'other-user' })).toBe(false)
  })

  it('staat CLIENT en BOTH toe, maar geen PROVIDER-organisatie', () => {
    expect(canEditIntake(baseContext)).toBe(true)
    expect(canEditIntake({ ...baseContext, organizationType: 'BOTH' })).toBe(true)
    expect(canEditIntake({ ...baseContext, organizationType: 'PROVIDER' })).toBe(false)
  })

  it('weigert toegang bij een inactieve gebruiker, membership of organisatie', () => {
    expect(canViewIntake({ ...baseContext, userStatus: 'BLOCKED' })).toBe(false)
    expect(canViewIntake({ ...baseContext, membershipStatus: 'SUSPENDED' })).toBe(false)
    expect(canViewIntake({ ...baseContext, organizationStatus: 'SUSPENDED' })).toBe(false)
  })

  it('staat heropenen alleen toe vanuit READY_FOR_REVIEW', () => {
    expect(canReopenIntake({ ...baseContext, intakeStatus: 'READY_FOR_REVIEW' })).toBe(true)
    expect(canReopenIntake(baseContext)).toBe(false)
  })

  it.each(['SUBMITTED', 'CONVERTED', 'ARCHIVED'] as const)('weigert inhoudelijke wijziging in status %s', (intakeStatus) => {
    expect(canEditIntake({ ...baseContext, membershipRole: 'OWNER', intakeStatus })).toBe(false)
  })

  it.each(['OWNER', 'ADMIN'] as const)('staat conversie toe voor een actieve %s', (membershipRole) => {
    expect(canConvertIntake({ ...baseContext, membershipRole, intakeStatus: 'READY_FOR_REVIEW' })).toBe(true)
  })

  it('weigert conversie voor MEMBER en inactieve organisatiecontext', () => {
    expect(canConvertIntake({ ...baseContext, intakeStatus: 'READY_FOR_REVIEW' })).toBe(false)
    expect(
      canConvertIntake({
        ...baseContext,
        membershipRole: 'OWNER',
        organizationStatus: 'SUSPENDED',
        intakeStatus: 'READY_FOR_REVIEW',
      }),
    ).toBe(false)
  })
})
