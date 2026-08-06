import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  canUseAsTestAccount,
  isRecognizedTestEmail,
  isTestAccountSwitcherEnabled,
} from './test-impersonation-policy'

describe('testaccountwisselaarbeleid', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('is uitsluitend buiten productie met de expliciete feature flag actief', () => {
    expect(
      isTestAccountSwitcherEnabled({
        NODE_ENV: 'development',
        ENABLE_TEST_ACCOUNT_SWITCHER: 'true',
      }),
    ).toBe(true)
    expect(
      isTestAccountSwitcherEnabled({
        NODE_ENV: 'development',
        ENABLE_TEST_ACCOUNT_SWITCHER: 'false',
      }),
    ).toBe(false)
    expect(
      isTestAccountSwitcherEnabled({
        NODE_ENV: 'production',
        ENABLE_TEST_ACCOUNT_SWITCHER: 'true',
      }),
    ).toBe(false)
  })

  it('herkent alleen gereserveerde example.invalid-domeinen', () => {
    expect(isRecognizedTestEmail('eigenaar@example.invalid')).toBe(true)
    expect(isRecognizedTestEmail('owner-01@test-wm.example.invalid')).toBe(true)
    expect(isRecognizedTestEmail('iemand@nietexample.invalid')).toBe(false)
    expect(isRecognizedTestEmail('iemand@workmatchr.nl')).toBe(false)
  })

  it('weigert de actor, niet-actieve, niet-geverifieerde en echte accounts', () => {
    const base = {
      id: 'target',
      email: 'target@example.invalid',
      emailVerified: true,
      status: 'ACTIVE',
    }
    expect(canUseAsTestAccount({ actorUserId: 'actor', user: base })).toBe(true)
    expect(canUseAsTestAccount({ actorUserId: 'target', user: base })).toBe(false)
    expect(
      canUseAsTestAccount({
        actorUserId: 'actor',
        user: { ...base, status: 'BLOCKED' },
      }),
    ).toBe(false)
    expect(
      canUseAsTestAccount({
        actorUserId: 'actor',
        user: { ...base, emailVerified: false },
      }),
    ).toBe(false)
    expect(
      canUseAsTestAccount({
        actorUserId: 'actor',
        user: { ...base, email: 'target@workmatchr.nl' },
      }),
    ).toBe(false)
  })
})
