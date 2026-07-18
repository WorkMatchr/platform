import { describe, expect, it, vi } from 'vitest'
import { requireProviderManager } from './provider-authorization'

function provider(role: 'OWNER' | 'ADMIN' | 'MEMBER', organizationType: 'CLIENT' | 'PROVIDER' | 'BOTH') {
  return {
    id: 'provider-1',
    organizationId: 'organization-1',
    version: 1,
    lifecycleStatus: 'DRAFT',
    organization: {
      status: 'ACTIVE',
      organizationType,
      memberships: [{ role, status: 'ACTIVE', user: { status: 'ACTIVE' } }],
    },
  }
}

function transaction(result: ReturnType<typeof provider> | null) {
  return {
    providerProfile: { findFirst: vi.fn().mockResolvedValue(result) },
  }
}

describe('provider-managerautorisatie voor professionals', () => {
  it.each([
    ['OWNER', 'PROVIDER'],
    ['OWNER', 'BOTH'],
    ['ADMIN', 'BOTH'],
  ] as const)('staat %s bij %s server-side toe', async (role, organizationType) => {
    await expect(
      requireProviderManager(transaction(provider(role, organizationType)) as never, 'user-1', 'provider-1'),
    ).resolves.toMatchObject({ id: 'provider-1' })
  })

  it('weigert MEMBER server-side', async () => {
    await expect(
      requireProviderManager(transaction(provider('MEMBER', 'BOTH')) as never, 'user-1', 'provider-1'),
    ).rejects.toMatchObject({ code: 'ACCESS_DENIED' })
  })

  it('weigert een CLIENT-organisatie server-side', async () => {
    await expect(
      requireProviderManager(transaction(provider('OWNER', 'CLIENT')) as never, 'user-1', 'provider-1'),
    ).rejects.toMatchObject({ code: 'ACCESS_DENIED' })
  })

  it('weigert een provider uit een andere tenant zonder details te lekken', async () => {
    const prisma = transaction(null)
    await expect(requireProviderManager(prisma as never, 'user-1', 'provider-other')).rejects.toMatchObject({
      code: 'ACCESS_DENIED',
    })
    expect(prisma.providerProfile.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: 'provider-other',
          organization: expect.objectContaining({ memberships: { some: { userId: 'user-1' } } }),
        }),
      }),
    )
  })
})
