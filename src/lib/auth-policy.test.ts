import { describe, expect, it } from 'vitest'
import {
  AUTH_SESSION_POLICY,
  canAccessAccount,
  canStartSession,
  canUseAccountRecovery,
  shouldActivateVerifiedInvitation,
  shouldRevokeExistingSessions,
} from '@/lib/auth-policy'

describe('accounttoegang', () => {
  it('weigert een niet-ingelogde gebruiker', () => { expect(canAccessAccount(null)).toBe(false) })
  it('weigert een geblokkeerde gebruiker', () => { expect(canAccessAccount('BLOCKED')).toBe(false) })
  it('weigert een gearchiveerde gebruiker', () => { expect(canAccessAccount('ARCHIVED')).toBe(false) })
  it('staat alleen een actieve gebruiker toe', () => { expect(canAccessAccount('ACTIVE')).toBe(true) })
  it('maakt geen nieuwe sessie voor een geblokkeerd account', () => { expect(canStartSession('BLOCKED')).toBe(false) })
  it('maakt geen nieuwe sessie voor een gearchiveerd account', () => { expect(canStartSession('ARCHIVED')).toBe(false) })
  it('maakt geen sessie voor een verwijderings- of anonimiseringsstatus', () => {
    expect(canStartSession('DELETION_PENDING')).toBe(false)
    expect(canStartSession('ANONYMIZED')).toBe(false)
  })
  it('trekt een bestaande sessie in bij blokkeren of archiveren', () => {
    expect(shouldRevokeExistingSessions('BLOCKED')).toBe(true)
    expect(shouldRevokeExistingSessions('ARCHIVED')).toBe(true)
    expect(shouldRevokeExistingSessions('DELETION_PENDING')).toBe(true)
    expect(shouldRevokeExistingSessions('ANONYMIZED')).toBe(true)
  })
  it('trekt sessies in na wachtwoordreset', () => { expect(AUTH_SESSION_POLICY.revokeSessionsOnPasswordReset).toBe(true) })
  it('staat account recovery uitsluitend voor ACTIVE toe', () => {
    expect(canUseAccountRecovery('ACTIVE')).toBe(true)
    for (const status of ['INVITED', 'BLOCKED', 'ARCHIVED', 'DELETION_PENDING', 'ANONYMIZED'] as const) {
      expect(canUseAccountRecovery(status)).toBe(false)
    }
  })
  it('activeert alleen een geverifieerde normale uitnodiging', () => {
    expect(shouldActivateVerifiedInvitation({ status: 'INVITED', emailVerified: true, migrationClassification: null })).toBe(true)
    expect(shouldActivateVerifiedInvitation({ status: 'INVITED', emailVerified: true, migrationClassification: 'MIGRATION_TEMP' })).toBe(false)
    expect(shouldActivateVerifiedInvitation({ status: 'BLOCKED', emailVerified: true, migrationClassification: null })).toBe(false)
  })
})
