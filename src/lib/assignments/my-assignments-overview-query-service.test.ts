import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  listIntakesForOrganization: vi.fn(),
  listAssignmentsForOrganization: vi.fn(),
}))

vi.mock('@/lib/intakes/intake-query-service', () => ({
  listIntakesForOrganization: mocks.listIntakesForOrganization,
}))
vi.mock('./assignment-query-service', () => ({
  listAssignmentsForOrganization: mocks.listAssignmentsForOrganization,
}))

import { getMyAssignmentsOverview } from './my-assignments-overview-query-service'

describe('getMyAssignmentsOverview', () => {
  beforeEach(() => {
    mocks.listIntakesForOrganization.mockResolvedValue({
      viewerRole: 'MEMBER',
      items: [
        { id: 'draft', status: 'DRAFT' },
        { id: 'converted', status: 'CONVERTED' },
      ],
    })
    mocks.listAssignmentsForOrganization
      .mockResolvedValueOnce({ items: [{ id: 'open', status: 'OPEN' }] })
      .mockResolvedValueOnce({ items: [{ id: 'closed', status: 'CLOSED' }] })
      .mockResolvedValueOnce({ items: [{ id: 'cancelled', status: 'CANCELLED' }] })
  })

  it('hergebruikt de bestaande scoped services en toont een geconverteerde intake niet dubbel', async () => {
    const result = await getMyAssignmentsOverview('user-1', 'organization-1')

    expect(mocks.listIntakesForOrganization).toHaveBeenCalledWith('user-1', 'organization-1')
    expect(mocks.listAssignmentsForOrganization).toHaveBeenNthCalledWith(1, 'user-1', 'organization-1', 'active')
    expect(mocks.listAssignmentsForOrganization).toHaveBeenNthCalledWith(2, 'user-1', 'organization-1', 'completed')
    expect(mocks.listAssignmentsForOrganization).toHaveBeenNthCalledWith(3, 'user-1', 'organization-1', 'cancelled')
    expect(result.viewerRole).toBe('MEMBER')
    expect(result.intakes.map((item) => item.id)).toEqual(['draft'])
    expect(result.assignments.map((item) => item.id)).toEqual(['open', 'closed', 'cancelled'])
  })
  it('houdt een nog ongepubliceerde legacy Assignment bereikbaar als concept', async () => {
    mocks.listIntakesForOrganization.mockResolvedValue({ viewerRole: 'OWNER', items: [{ id: 'pending', status: 'CONVERTED', hasUnpublishedAssignment: true }, { id: 'published', status: 'CONVERTED', hasUnpublishedAssignment: false }] })
    const result = await getMyAssignmentsOverview('owner', 'organization')
    expect(result.intakes.map(item => item.id)).toEqual(['pending'])
  })

})
