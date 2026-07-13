import { describe, expect, it } from 'vitest'
import { AUTH_SESSION_POLICY, canAccessAccount, canStartSession, shouldRevokeExistingSessions } from '@/lib/auth-policy'

describe('accounttoegang', () => {
  it('weigert een niet-ingelogde gebruiker', () => { expect(canAccessAccount(null)).toBe(false) })
  it('weigert een geblokkeerde gebruiker', () => { expect(canAccessAccount('BLOCKED')).toBe(false) })
  it('weigert een gearchiveerde gebruiker', () => { expect(canAccessAccount('ARCHIVED')).toBe(false) })
  it('staat alleen een actieve gebruiker toe', () => { expect(canAccessAccount('ACTIVE')).toBe(true) })
  it('maakt geen nieuwe sessie voor een geblokkeerd account', () => { expect(canStartSession('BLOCKED')).toBe(false) })
  it('maakt geen nieuwe sessie voor een gearchiveerd account', () => { expect(canStartSession('ARCHIVED')).toBe(false) })
  it('trekt een bestaande sessie in bij blokkeren of archiveren', () => {
    expect(shouldRevokeExistingSessions('BLOCKED')).toBe(true)
    expect(shouldRevokeExistingSessions('ARCHIVED')).toBe(true)
  })
  it('trekt sessies in na wachtwoordreset', () => { expect(AUTH_SESSION_POLICY.revokeSessionsOnPasswordReset).toBe(true) })
})
