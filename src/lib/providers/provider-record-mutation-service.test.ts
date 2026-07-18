import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ transaction: vi.fn(), requireManager: vi.fn(), requireEditable: vi.fn(), term: vi.fn(), update: vi.fn(), revision: vi.fn(), profileUpdate: vi.fn(), projection: vi.fn(), invalidation: vi.fn() }))
vi.mock('@/lib/prisma', () => ({ getPrisma: () => ({ $transaction: mocks.transaction }) }))
vi.mock('./provider-authorization', () => ({ requireProviderManager: mocks.requireManager }))
vi.mock('./provider-dossier-access', () => ({ requireProviderSectionEditable: mocks.requireEditable }))

import { reviseProviderCapability, setProviderRecordStatus } from './provider-record-mutation-service'

const id = (suffix: string) => `00000000-0000-4000-8000-${suffix.padStart(12, '0')}`
const transaction = {
  providerTaxonomyTerm: { findFirst: mocks.term }, providerCapability: { updateMany: mocks.update }, providerCapabilityRevision: { create: mocks.revision },
  providerWorkArea: { findMany: vi.fn().mockResolvedValue([]) },
  providerProfile: { updateMany: mocks.profileUpdate }, trustedProviderProjection: { findFirst: mocks.projection }, trustedProviderProjectionInvalidation: { create: mocks.invalidation },
}

beforeEach(() => {
  vi.clearAllMocks(); mocks.transaction.mockImplementation((callback) => callback(transaction)); mocks.requireManager.mockResolvedValue({ organizationId: id('1') }); mocks.term.mockResolvedValue({ id: id('2'), code: 'SERVICE' }); mocks.update.mockResolvedValue({ count: 1 }); mocks.revision.mockResolvedValue({ id: id('3'), version: 2 }); mocks.profileUpdate.mockResolvedValue({ count: 1 }); mocks.projection.mockResolvedValue({ id: id('4') })
})

describe('provider record mutation service', () => {
  it('schrijft een nieuwe SELF_DECLARED revisie en centrale invalidation', async () => {
    const result = await reviseProviderCapability(id('9'), id('1'), { expectedProfileVersion: 3, expectedRecordVersion: 1, capabilityId: id('5'), serviceTermId: id('2'), deliveryModes: ['REMOTE'] })
    expect(result).toMatchObject({ version: 2, profileVersion: 4, verificationLevel: 'SELF_DECLARED' })
    expect(mocks.requireEditable).toHaveBeenCalledWith(transaction, id('1'), 'CAPABILITIES')
    expect(mocks.invalidation).toHaveBeenCalledWith({ data: { projectionId: id('4'), reasonCode: 'SOURCE_CHANGED' } })
  })

  it('meldt een stale recordversie als veilig conflict', async () => {
    mocks.update.mockResolvedValue({ count: 0 })
    await expect(reviseProviderCapability(id('9'), id('1'), { expectedProfileVersion: 3, expectedRecordVersion: 1, capabilityId: id('5'), serviceTermId: id('2'), deliveryModes: ['ON_SITE'] })).rejects.toMatchObject({ code: 'CONFLICT' })
    expect(mocks.revision).not.toHaveBeenCalled()
  })

  it('archiveert een record met versieverhoging en zonder hard delete', async () => {
    const result = await setProviderRecordStatus(id('9'), id('1'), 'CAPABILITY', {
      expectedProfileVersion: 3,
      expectedRecordVersion: 1,
      recordId: id('5'),
      status: 'ARCHIVED',
    })
    expect(result).toMatchObject({ status: 'ARCHIVED', recordVersion: 2, profileVersion: 4 })
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({
      data: { status: 'ARCHIVED', version: { increment: 1 } },
    }))
    expect(transaction.providerCapability).not.toHaveProperty('delete')
  })

  it('weigert een MEMBER of gebruiker uit een andere tenant vóór de mutatie', async () => {
    mocks.requireManager.mockRejectedValueOnce({ code: 'ACCESS_DENIED' })
    await expect(setProviderRecordStatus(id('9'), id('1'), 'CAPABILITY', {
      expectedProfileVersion: 3,
      expectedRecordVersion: 1,
      recordId: id('5'),
      status: 'ARCHIVED',
    })).rejects.toMatchObject({ code: 'ACCESS_DENIED' })
    expect(mocks.update).not.toHaveBeenCalled()
  })
})
