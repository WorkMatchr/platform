import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('next/navigation', () => ({ redirect: vi.fn() }))
vi.mock('@/lib/authorization', () => ({ requireUser: vi.fn() }))

const mocks = {
  findFirst: vi.fn(),
}

vi.mock('@/lib/prisma', () => ({
  getPrisma: () => ({ user: { findFirst: mocks.findFirst } }),
}))

import {
  getPlatformAuditorContext,
  getPlatformOperatorContext,
  getPlatformOwnerContext,
  PlatformAdminAccessError,
  requirePlatformAuditor,
  requirePlatformOperator,
  requirePlatformOwner,
} from './platform-admin-authorization'

const { redirect } = await import('next/navigation')
const { requireUser } = await import('@/lib/authorization')

function platformUser(role: 'OWNER' | 'ADMIN' | 'MEMBER', twoFactor: 'verified' | 'disabled' | 'pending' = 'verified') {
  return {
    id: 'platform-user',
    displayName: 'Platformgebruiker',
    email: 'platform@example.invalid',
    twoFactorEnabled: twoFactor !== 'disabled',
    twoFactors: twoFactor === 'verified' ? [{ id: 'two-factor-1' }] : [],
    providerPermissionSubjects: [],
    memberships: [{
      id: 'membership-1',
      role,
      organization: { id: 'platform-organization', name: 'WorkMatchr Platform', systemKey: 'WORKMATCHR_PLATFORM' },
    }],
  }
}

describe('centrale platformguards', () => {
  beforeEach(() => {
    mocks.findFirst.mockReset()
    vi.mocked(redirect).mockReset()
    vi.mocked(requireUser).mockReset()
  })

  it('laat MEMBER uitsluitend door in de auditorguard en niet via de operatorguard', async () => {
    mocks.findFirst.mockResolvedValue(platformUser('MEMBER'))
    await expect(getPlatformAuditorContext('platform-user')).resolves.toMatchObject({
      membershipRole: 'MEMBER',
      platformOrganizationId: 'platform-organization',
    })
    await expect(getPlatformOperatorContext('platform-user')).rejects.toBeInstanceOf(PlatformAdminAccessError)
    await expect(getPlatformOwnerContext('platform-user')).rejects.toBeInstanceOf(PlatformAdminAccessError)
  })

  it('laat ADMIN door als operator maar niet als eigenaar', async () => {
    mocks.findFirst.mockResolvedValue(platformUser('ADMIN'))
    await expect(getPlatformOperatorContext('platform-user')).resolves.toMatchObject({ membershipRole: 'ADMIN' })
    await expect(getPlatformOwnerContext('platform-user')).rejects.toBeInstanceOf(PlatformAdminAccessError)
  })

  it('laat OWNER door als operator en eigenaar', async () => {
    mocks.findFirst.mockResolvedValue(platformUser('OWNER'))
    await expect(getPlatformOperatorContext('platform-user')).resolves.toMatchObject({ membershipRole: 'OWNER' })
    await expect(getPlatformOwnerContext('platform-user')).resolves.toMatchObject({ membershipRole: 'OWNER' })
  })

  it('houdt de accountflow voor niet-platformgebruikers server-side intact', async () => {
    const redirectSignal = new Error('NEXT_REDIRECT')
    vi.mocked(requireUser).mockResolvedValue({ id: 'regular-user' } as never)
    mocks.findFirst.mockResolvedValue(null)
    vi.mocked(redirect).mockImplementation(() => { throw redirectSignal })

    await expect(requirePlatformAuditor('/platformbeheer')).rejects.toBe(redirectSignal)

    expect(redirect).toHaveBeenCalledWith('/account')
  })

  it('stuurt een platformaccount zonder volledig geverifieerde 2FA server-side naar beveiliging', async () => {
    const redirectSignal = new Error('NEXT_REDIRECT')
    vi.mocked(requireUser).mockResolvedValue({ id: 'platform-user' } as never)
    mocks.findFirst.mockResolvedValue(platformUser('MEMBER', 'disabled'))
    vi.mocked(redirect).mockImplementation(() => { throw redirectSignal })

    await expect(requirePlatformAuditor('/platformbeheer/auditor')).rejects.toBe(redirectSignal)
    expect(redirect).toHaveBeenCalledWith('/account/beveiliging?returnTo=%2Fplatformbeheer%2Fauditor')
  })

  it.each([
    ['OWNER', requirePlatformOwner],
    ['ADMIN', requirePlatformOperator],
    ['MEMBER', requirePlatformAuditor],
  ] as const)('vereist geverifieerde 2FA voor %s', async (role, guard) => {
    const redirectSignal = new Error('NEXT_REDIRECT')
    vi.mocked(requireUser).mockResolvedValue({ id: 'platform-user' } as never)
    mocks.findFirst.mockResolvedValue(platformUser(role, 'disabled'))
    vi.mocked(redirect).mockImplementation(() => { throw redirectSignal })

    await expect(guard('/platformbeheer')).rejects.toBe(redirectSignal)
    expect(redirect).toHaveBeenCalledWith('/account/beveiliging?returnTo=%2Fplatformbeheer')
  })

  it('laat een platformaccount met geverifieerde 2FA door', async () => {
    vi.mocked(requireUser).mockResolvedValue({ id: 'platform-user' } as never)
    mocks.findFirst.mockResolvedValue(platformUser('MEMBER', 'verified'))

    await expect(requirePlatformAuditor('/platformbeheer/auditor')).resolves.toMatchObject({
      hasVerifiedTwoFactor: true,
    })
  })

  it('weigert een half-afgeronde enrollment zonder geverifieerd TwoFactor-record', async () => {
    const redirectSignal = new Error('NEXT_REDIRECT')
    vi.mocked(requireUser).mockResolvedValue({ id: 'platform-user' } as never)
    mocks.findFirst.mockResolvedValue(platformUser('MEMBER', 'pending'))
    vi.mocked(redirect).mockImplementation(() => { throw redirectSignal })

    await expect(requirePlatformAuditor('/platformbeheer/auditor')).rejects.toBe(redirectSignal)
    expect(redirect).toHaveBeenCalledWith('/account/beveiliging?returnTo=%2Fplatformbeheer%2Fauditor')
  })
})
