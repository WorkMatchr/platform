import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  transaction: vi.fn(),
  organizationFind: vi.fn(),
  assignmentFindMany: vi.fn(),
  assignmentFindUnique: vi.fn(),
  requireViewer: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({ getPrisma: () => ({ $transaction: mocks.transaction }) }))
vi.mock('./assignment-authorization', () => ({ requireAssignmentViewer: mocks.requireViewer }))

import { AssignmentServiceError } from './assignment-errors'
import { getAssignmentDetail, listAssignmentsForOrganization } from './assignment-query-service'

const userId = '00000000-0000-4000-8000-000000000001'
const organizationId = '00000000-0000-4000-8000-000000000002'
const assignmentId = '00000000-0000-4000-8000-000000000003'

const transactionClient = {
  organization: { findFirst: mocks.organizationFind },
  assignment: { findMany: mocks.assignmentFindMany, findUnique: mocks.assignmentFindUnique },
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.transaction.mockImplementation((callback) => callback(transactionClient))
  mocks.organizationFind.mockResolvedValue({ id: organizationId, name: 'Voorbeeldorganisatie', memberships: [{ role: 'OWNER' }] })
  mocks.assignmentFindMany.mockResolvedValue([{ id: assignmentId, title: 'Veiligheidsadvies', status: 'DRAFT', createdAt: new Date('2026-07-13T10:00:00Z') }])
  mocks.requireViewer.mockResolvedValue({ id: assignmentId, clientOrganization: { memberships: [{ role: 'OWNER' }] } })
  mocks.assignmentFindUnique.mockResolvedValue({
    id: assignmentId,
    title: 'Veiligheidsadvies',
    description: 'Hulpvraag\nVeiliger werken.',
    status: 'DRAFT',
    version: 1,
    employeeCount: 12,
    desiredStartDate: null,
    allowsRemoteWork: false,
    publishedAt: null,
    publishedVersion: null,
    publishedByUser: null,
    createdAt: new Date('2026-07-13T10:00:00Z'),
    updatedAt: new Date('2026-07-13T10:00:00Z'),
    clientOrganization: { name: 'Voorbeeldorganisatie' },
    intake: { id: '00000000-0000-4000-8000-000000000004', freeText: 'Wij willen veiliger werken.' },
    sector: null,
    location: { label: 'Hoofdlocatie', city: 'Utrecht' },
    statusHistory: [{ toStatus: 'DRAFT', createdAt: new Date('2026-07-13T10:00:00Z'), reason: 'Opdracht gevormd.' }],
    _count: { revisions: 1 },
  })
})

describe('opdrachtqueryservice', () => {
  it('begrenst de lijst tot de actieve organisatie en verbergt gearchiveerde opdrachten', async () => {
    const result = await listAssignmentsForOrganization(userId, organizationId)
    expect(mocks.organizationFind).toHaveBeenCalledWith(expect.objectContaining({ where: { id: organizationId, status: 'ACTIVE' } }))
    expect(mocks.assignmentFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { clientOrganizationId: organizationId, status: { not: 'ARCHIVED' } },
    }))
    expect(result.items[0]?.organizationName).toBe('Voorbeeldorganisatie')
  })

  it('begrenst MEMBER in het overzicht tot opdrachten uit eigen intakes', async () => {
    mocks.organizationFind.mockResolvedValue({ id: organizationId, name: 'Voorbeeldorganisatie', memberships: [{ role: 'MEMBER' }] })
    await listAssignmentsForOrganization(userId, organizationId, 'draft')
    expect(mocks.assignmentFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { clientOrganizationId: organizationId, status: 'DRAFT', intake: { createdByUserId: userId } },
    }))
  })

  it('laat de detailquery eerst membership en tenanttoegang controleren', async () => {
    const result = await getAssignmentDetail(userId, organizationId, assignmentId)
    expect(mocks.requireViewer).toHaveBeenCalledWith(transactionClient, userId, organizationId, assignmentId)
    expect(mocks.requireViewer.mock.invocationCallOrder[0]).toBeLessThan(mocks.assignmentFindUnique.mock.invocationCallOrder[0])
    expect(result).toMatchObject({
      status: 'DRAFT',
      organizationName: 'Voorbeeldorganisatie',
      publishedAt: null,
      publishedByName: null,
      publishedVersion: null,
      revisionCount: 1,
    })
  })

  it('onthult een opdracht uit een andere organisatie niet', async () => {
    mocks.requireViewer.mockRejectedValue(new AssignmentServiceError('ACCESS_DENIED'))
    await expect(getAssignmentDetail(userId, organizationId, assignmentId)).rejects.toMatchObject({ code: 'ACCESS_DENIED' })
    expect(mocks.assignmentFindUnique).not.toHaveBeenCalled()
  })
})
