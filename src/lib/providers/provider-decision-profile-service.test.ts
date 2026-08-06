import { describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  transaction: vi.fn(),
  assignmentFindFirst: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  getPrisma: () => ({ $transaction: mocks.transaction }),
}))

import {
  deriveProviderProfileCompleteness,
  getAssignmentProviderDecisionProfile,
  updateProviderProfileSelections,
} from './provider-decision-profile-service'

describe('dienstverlenersprofiel', () => {
  it('berekent volledigheid uitsluitend als afgeleide UX-indicator', () => {
    expect(deriveProviderProfileCompleteness({
      logoStorageKey: null,
      shortIntroduction: null,
      description: null,
      workingMethod: null,
      coreExpertiseCount: 0,
      capabilityCount: 0,
      sectorCount: 0,
      workAreaCount: 0,
      workModeCount: 0,
    })).toEqual(expect.objectContaining({ completed: 0, total: 9, percentage: 0 }))

    expect(deriveProviderProfileCompleteness({
      logoStorageKey: 'logo.webp',
      shortIntroduction: 'Korte introductie',
      description: 'Organisatieomschrijving',
      workingMethod: 'Werkwijze',
      coreExpertiseCount: 1,
      capabilityCount: 1,
      sectorCount: 1,
      workAreaCount: 1,
      workModeCount: 1,
    })).toEqual({ completed: 9, total: 9, percentage: 100, suggestions: [] })
  })

  it('weigert meer dan drie kernexpertises voordat een databasewrite start', async () => {
    await expect(updateProviderProfileSelections('11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222', {
      expectedProfileVersion: 1,
      coreExpertiseTermIds: [
        '33333333-3333-4333-8333-333333333331',
        '33333333-3333-4333-8333-333333333332',
        '33333333-3333-4333-8333-333333333333',
        '33333333-3333-4333-8333-333333333334',
      ],
      workModeTermIds: [],
    })).rejects.toThrow()
    expect(mocks.transaction).not.toHaveBeenCalled()
  })

  it('weigert profielinzage wanneer geen opdrachtrelatie voor de tenant bestaat', async () => {
    mocks.transaction.mockImplementationOnce(async (callback) => callback({
      assignment: { findFirst: mocks.assignmentFindFirst.mockResolvedValueOnce(null) },
    }))
    await expect(getAssignmentProviderDecisionProfile(
      '11111111-1111-4111-8111-111111111111',
      '22222222-2222-4222-8222-222222222222',
      '33333333-3333-4333-8333-333333333333',
    )).rejects.toThrow('geen toegang')
    expect(mocks.assignmentFindFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        clientOrganization: expect.objectContaining({ memberships: expect.any(Object) }),
        providerSelections: { some: { providerProfileId: '33333333-3333-4333-8333-333333333333', status: { not: 'REMOVED' } } },
      }),
    }))
  })
})
