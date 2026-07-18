import { describe, expect, it } from 'vitest'
import {
  AccountLifecycleTransitionError,
  assertAccountStatusTransition,
  canTransitionAccountStatus,
  isLegacyArchivedStatus,
} from './account-lifecycle'

describe('ADR-013 accountlifecyclefundament', () => {
  it('ondersteunt herstelbaar blokkeren zonder een overgang uit te voeren', () => {
    expect(canTransitionAccountStatus('ACTIVE', 'BLOCKED')).toBe(true)
    expect(canTransitionAccountStatus('BLOCKED', 'ACTIVE')).toBe(true)
  })

  it('maakt definitieve verwijdering een eenrichtingspad', () => {
    expect(canTransitionAccountStatus('ACTIVE', 'DELETION_PENDING')).toBe(true)
    expect(canTransitionAccountStatus('DELETION_PENDING', 'ANONYMIZED')).toBe(true)
    expect(canTransitionAccountStatus('ANONYMIZED', 'ACTIVE')).toBe(false)
  })

  it('weigert ongeldige overgangen fail-closed', () => {
    expect(() => assertAccountStatusTransition('ACTIVE', 'ANONYMIZED')).toThrow(AccountLifecycleTransitionError)
  })

  it('behandelt ARCHIVED expliciet als terminale legacystatus', () => {
    expect(isLegacyArchivedStatus('ARCHIVED')).toBe(true)
    expect(canTransitionAccountStatus('ARCHIVED', 'ACTIVE')).toBe(false)
  })
})
