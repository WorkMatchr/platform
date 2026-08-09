import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ findMany: vi.fn() }))

vi.mock('@/lib/prisma', () => ({
  getPrisma: () => ({ providerSectorTaxonomyMap: { findMany: mocks.findMany } }),
}))

import { getOrganizationSectorOptions } from './organization-sector-options'

beforeEach(() => vi.clearAllMocks())

describe('centrale sectoropties voor organisatie-onboarding', () => {
  it('levert de gepubliceerde centrale sectortaxonomie als selecteerbare organisatieopties', async () => {
    mocks.findMany.mockResolvedValue([
      { sector: { id: 'sector-bouw' }, term: { label: 'Bouw', sortOrder: 0 } },
      { sector: { id: 'sector-zorg' }, term: { label: 'Zorg', sortOrder: 1 } },
    ])

    await expect(getOrganizationSectorOptions()).resolves.toEqual([
      { id: 'sector-bouw', name: 'Bouw' },
      { id: 'sector-zorg', name: 'Zorg' },
    ])
    expect(mocks.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        sector: { isActive: true },
        term: expect.objectContaining({ isActive: true }),
      }),
    }))
  })
})
