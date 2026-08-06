import { describe, expect, it, vi } from 'vitest'
import { requireClientMarketplaceManager, requireProviderMarketplaceAccess } from './marketplace-authorization'

function transaction(result: unknown) {
  return {
    organizationMembership: {
      findFirst: vi.fn().mockResolvedValue(result),
    },
  }
}

describe('marketplace-autorisatie per accounttype', () => {
  it('vraagt voor opdrachtgeverswerk expliciet om een bedrijfsaccount', async () => {
    const prisma = transaction({ role: 'OWNER', organizationId: 'client-1' })
    await requireClientMarketplaceManager(prisma as never, 'user-1', 'client-1')

    expect(prisma.organizationMembership.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          user: { status: 'ACTIVE', accountType: 'CLIENT' },
          organization: { status: 'ACTIVE', organizationType: 'CLIENT', systemKey: null },
        }),
      }),
    )
  })

  it('vraagt voor reageren en credits expliciet om een professionalaccount', async () => {
    const prisma = transaction({
      role: 'OWNER',
      organizationId: 'provider-1',
      organization: { providerProfile: { id: 'profile-1', selectabilityStatus: 'SELECTABLE', lifecycleStatus: 'ACTIVE' } },
    })
    await requireProviderMarketplaceAccess(prisma as never, 'user-1', 'provider-1', true)

    expect(prisma.organizationMembership.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          role: { in: ['OWNER', 'ADMIN'] },
          user: { status: 'ACTIVE', accountType: 'PROFESSIONAL' },
          organization: expect.objectContaining({ organizationType: { in: ['PROVIDER', 'BOTH'] } }),
        }),
      }),
    )
  })

  it('weigert wanneer de accounttypegebonden membershipquery niets vindt', async () => {
    await expect(requireClientMarketplaceManager(transaction(null) as never, 'user-1', 'client-1')).rejects.toMatchObject({ code: 'ACCESS_DENIED' })
    await expect(requireProviderMarketplaceAccess(transaction(null) as never, 'user-1', 'provider-1')).rejects.toMatchObject({ code: 'ACCESS_DENIED' })
  })
})
