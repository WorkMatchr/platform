import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  transaction: vi.fn(),
  requireManager: vi.fn(),
  termFind: vi.fn(),
  capabilityCreate: vi.fn(),
  profileUpdateMany: vi.fn(),
  projectionFind: vi.fn(),
  requireEditable: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({ getPrisma: () => ({ $transaction: mocks.transaction }) }))
vi.mock('./provider-authorization', () => ({ requireProviderManager: mocks.requireManager }))
vi.mock('./provider-dossier-access', () => ({ requireProviderSectionEditable: mocks.requireEditable }))

import { createProviderCapability } from './provider-capability-service'

const id = (suffix: string) => `00000000-0000-4000-8000-${suffix.padStart(12, '0')}`
const transactionClient = {
  providerTaxonomyTerm: { findFirst: mocks.termFind },
  providerCapability: { create: mocks.capabilityCreate },
  providerProfile: { updateMany: mocks.profileUpdateMany },
  trustedProviderProjection: { findFirst: mocks.projectionFind },
  trustedProviderProjectionInvalidation: { create: vi.fn() },
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.transaction.mockImplementation((callback) => callback(transactionClient))
  mocks.requireManager.mockResolvedValue({ id: id('1'), version: 1 })
  mocks.termFind.mockResolvedValue({ id: id('2') })
  mocks.capabilityCreate.mockResolvedValue({ id: id('3'), version: 1 })
  mocks.profileUpdateMany.mockResolvedValue({ count: 1 })
  mocks.projectionFind.mockResolvedValue(null)
})

describe('provider capability service', () => {
  it('schrijft een nieuwe capability uitsluitend als SELF_DECLARED en verhoogt de profielversie', async () => {
    const result = await createProviderCapability(id('4'), id('1'), {
      expectedProfileVersion: 1,
      serviceTermId: id('2'),
      deliveryModes: ['REMOTE'],
    })
    expect(result).toMatchObject({ profileVersion: 2, verificationLevel: 'SELF_DECLARED' })
    expect(mocks.capabilityCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ revisions: { create: expect.objectContaining({ verificationLevel: 'SELF_DECLARED' }) } }),
    }))
    const revision = mocks.capabilityCreate.mock.calls[0]?.[0].data.revisions.create
    expect(revision).not.toHaveProperty('competencyTermId')
    expect(mocks.profileUpdateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: id('1'), version: 1, archivedAt: null } }))
  })

  it('meldt een concurrencyconflict veilig', async () => {
    mocks.profileUpdateMany.mockResolvedValue({ count: 0 })
    await expect(createProviderCapability(id('4'), id('1'), {
      expectedProfileVersion: 1,
      serviceTermId: id('2'),
      deliveryModes: ['ON_SITE'],
    })).rejects.toMatchObject({ code: 'CONFLICT' })
  })
})
