import type { Prisma } from '@/generated/prisma/client'
import { describe, expect, it, vi } from 'vitest'
import {
  PlatformOrganizationConfigurationError,
  WORKMATCHR_PLATFORM_ORGANIZATION,
  ensurePlatformOrganization,
  findPlatformOrganization,
} from './platform-organization-service'

function clientMock() {
  return { organization: { findMany: vi.fn(), create: vi.fn() } } as unknown as Pick<
    Prisma.TransactionClient,
    'organization'
  >
}

describe('WorkMatchr-platformorganisatie', () => {
  it('zoekt uitsluitend op de immutable systemKey', async () => {
    const client = clientMock()
    vi.mocked(client.organization.findMany).mockResolvedValue([])
    await findPlatformOrganization(client)
    expect(client.organization.findMany).toHaveBeenCalledWith({
      where: { systemKey: 'WORKMATCHR_PLATFORM' },
      take: 2,
    })
  })

  it('maakt idempotent niets aan wanneer de platformorganisatie bestaat', async () => {
    const client = clientMock()
    vi.mocked(client.organization.findMany).mockResolvedValue([{
      id: 'platform-1',
      ...WORKMATCHR_PLATFORM_ORGANIZATION,
      archivedAt: null,
    }] as never)
    await expect(ensurePlatformOrganization(client)).resolves.toMatchObject({ id: 'platform-1' })
    expect(client.organization.create).not.toHaveBeenCalled()
  })

  it('hergebruikt geen tenantorganisatie op basis van alleen de naam', async () => {
    const client = clientMock()
    vi.mocked(client.organization.findMany).mockResolvedValue([])
    vi.mocked(client.organization.create).mockResolvedValue({ id: 'platform-new' } as never)
    await ensurePlatformOrganization(client)
    expect(client.organization.create).toHaveBeenCalledWith({ data: WORKMATCHR_PLATFORM_ORGANIZATION })
  })

  it('faalt gesloten bij een ongeldige systeemidentiteit', async () => {
    const client = clientMock()
    vi.mocked(client.organization.findMany).mockResolvedValue([{
      id: 'wrong',
      name: 'Andere naam',
      organizationType: 'CLIENT',
      systemKey: 'WORKMATCHR_PLATFORM',
      status: 'ACTIVE',
      archivedAt: null,
    }] as never)
    await expect(findPlatformOrganization(client)).rejects.toThrow(PlatformOrganizationConfigurationError)
  })

  it('faalt gesloten bij meerdere resultaten met dezelfde systeemidentiteit', async () => {
    const client = clientMock()
    vi.mocked(client.organization.findMany).mockResolvedValue([
      { id: 'platform-1', ...WORKMATCHR_PLATFORM_ORGANIZATION, archivedAt: null },
      { id: 'platform-2', ...WORKMATCHR_PLATFORM_ORGANIZATION, archivedAt: null },
    ] as never)
    await expect(findPlatformOrganization(client)).rejects.toThrow(PlatformOrganizationConfigurationError)
  })

  it.each([
    { status: 'INACTIVE', archivedAt: null },
    { status: 'ACTIVE', archivedAt: new Date('2026-01-01T00:00:00.000Z') },
  ])('faalt gesloten bij een inactieve of gearchiveerde platformorganisatie', async (override) => {
    const client = clientMock()
    vi.mocked(client.organization.findMany).mockResolvedValue([{
      id: 'platform-1',
      ...WORKMATCHR_PLATFORM_ORGANIZATION,
      ...override,
    }] as never)
    await expect(findPlatformOrganization(client)).rejects.toThrow(PlatformOrganizationConfigurationError)
  })
})
