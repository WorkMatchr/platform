import { readFile } from 'node:fs/promises'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ transaction: vi.fn(), userFind: vi.fn(), sectorCount: vi.fn(), organizationCreate: vi.fn() }))

vi.mock('@/lib/prisma', () => ({
  getPrisma: () => ({
    $transaction: mocks.transaction,
  }),
}))

import { createOrganization, OrganizationServiceError } from './organization-service'

beforeEach(() => vi.clearAllMocks())

const input = {
  name: 'Voorbeeld Organisatie', organizationType: 'CLIENT' as const, acceptedBusinessAccuracy: 'on' as const,
  sectorIds: ['00000000-0000-4000-8000-000000000001'], primarySectorId: '00000000-0000-4000-8000-000000000001',
  addressLine: 'Voorbeeldstraat 1', postalCode: '1234 AB', city: 'Utrecht', countryCode: 'NL',
}

function prepare(status: 'ACTIVE' | 'BLOCKED' | 'ARCHIVED' = 'ACTIVE') {
  const transactionClient = {
    user: { findUnique: mocks.userFind },
    sector: { count: mocks.sectorCount },
    organization: { create: mocks.organizationCreate },
  }
  mocks.userFind.mockResolvedValue({ status })
  mocks.sectorCount.mockResolvedValue(1)
  mocks.organizationCreate.mockResolvedValue({ id: 'organization-id' })
  mocks.transaction.mockImplementation((callback) => callback(transactionClient))
}

describe('transactionele organisatieaanmaak', () => {
  it('maakt organisatie, OWNER-membership, sector en primaire locatie in één transactie aan', async () => {
    prepare()
    await expect(createOrganization('user-id', input)).resolves.toEqual({ id: 'organization-id' })
    expect(mocks.transaction).toHaveBeenCalledTimes(1)
    const data = mocks.organizationCreate.mock.calls.at(-1)?.[0].data
    expect(data.memberships.create).toMatchObject({ userId: 'user-id', role: 'OWNER', status: 'ACTIVE' })
    expect(data.locations.create).toMatchObject({ isPrimary: true })
    expect(data.sectors.create).toEqual([{ sectorId: input.primarySectorId, isPrimary: true }])
  })

  it.each(['BLOCKED', 'ARCHIVED'] as const)('weigert een %s gebruiker vóór schrijven', async (status) => {
    prepare(status)
    await expect(createOrganization('user-id', input)).rejects.toBeInstanceOf(OrganizationServiceError)
    expect(mocks.organizationCreate).not.toHaveBeenCalled()
  })

  it('maakt ProviderProfile DRAFT alleen voor PROVIDER en BOTH', async () => {
    prepare()
    for (const organizationType of ['PROVIDER', 'BOTH'] as const) {
      await createOrganization('user-id', { ...input, organizationType })
      expect(mocks.organizationCreate.mock.calls.at(-1)?.[0].data.providerProfile).toEqual({ create: { approvalStatus: 'DRAFT', isAvailable: false } })
    }
    await createOrganization('user-id', input)
    expect(mocks.organizationCreate.mock.calls.at(-1)?.[0].data.providerProfile).toBeUndefined()
  })

  it('borgt dubbele memberships met een samengestelde unieke database-index', async () => {
    const schema = await readFile('prisma/schema.prisma', 'utf8')
    expect(schema).toContain('@@unique([userId, organizationId])')
  })
})
