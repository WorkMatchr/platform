import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  transaction: vi.fn(),
  requireManager: vi.fn(),
  assignmentUpdateMany: vi.fn(),
  revisionCreate: vi.fn(),
  revisionFind: vi.fn(),
  historyCreate: vi.fn(),
  historyFindMany: vi.fn(),
  locationFind: vi.fn(),
  sectorFind: vi.fn(),
  specialismFind: vi.fn(),
  assignmentSpecialismFind: vi.fn(),
  intakeFind: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  getPrisma: () => ({ $transaction: mocks.transaction }),
}))
vi.mock('./assignment-authorization', () => ({
  requireAssignmentManager: mocks.requireManager,
}))

import { AssignmentServiceError } from './assignment-errors'
import {
  publishAssignment,
  withdrawPublishedAssignment,
} from './assignment-publication-service'

const userId = '00000000-0000-4000-8000-000000000001'
const organizationId = '00000000-0000-4000-8000-000000000002'
const assignmentId = '00000000-0000-4000-8000-000000000003'
const intakeId = '00000000-0000-4000-8000-000000000004'
const locationId = '00000000-0000-4000-8000-000000000005'
const publishedAt = new Date('2026-07-14T10:00:00.000Z')

const transactionClient = {
  assignment: { updateMany: mocks.assignmentUpdateMany },
  assignmentRevision: {
    create: mocks.revisionCreate,
    findFirst: mocks.revisionFind,
  },
  assignmentStatusHistory: {
    create: mocks.historyCreate,
    findMany: mocks.historyFindMany,
  },
  organizationLocation: { findFirst: mocks.locationFind },
  sector: { findFirst: mocks.sectorFind },
  specialism: { findFirst: mocks.specialismFind },
  assignmentSpecialism: { findFirst: mocks.assignmentSpecialismFind },
  intake: { findFirst: mocks.intakeFind },
}

function assignment(
  status: 'DRAFT' | 'READY_FOR_REVIEW' | 'OPEN' | 'CANCELLED' = 'READY_FOR_REVIEW',
  version = status === 'OPEN' ? 4 : status === 'CANCELLED' ? 5 : 3,
) {
  const wasPublished = status === 'OPEN' || status === 'CANCELLED'
  return {
    id: assignmentId,
    intakeId,
    clientOrganizationId: organizationId,
    createdByUserId: userId,
    status,
    version,
    title: 'Veiligheidskundige ondersteuning',
    description: 'Een volledige zakelijke opdrachtomschrijving voor veilig werken.',
    primarySpecialismId: null,
    sectorId: null,
    employeeCount: 20,
    desiredStartDate: new Date('2099-08-01T00:00:00.000Z'),
    responseDeadline: null,
    locationId,
    allowsRemoteWork: false,
    publishedAt: wasPublished ? publishedAt : null,
    publishedByUserId: wasPublished ? userId : null,
    publishedVersion: wasPublished ? 4 : null,
    closedAt: null,
    archivedAt: null,
    clientOrganization: {
      status: 'ACTIVE',
      organizationType: 'CLIENT',
      memberships: [],
    },
  }
}

function snapshot(record = assignment('OPEN')) {
  return {
    title: record.title,
    description: record.description,
    primarySpecialismId: record.primarySpecialismId,
    sectorId: record.sectorId,
    employeeCount: record.employeeCount,
    desiredStartDate: record.desiredStartDate,
    responseDeadline: record.responseDeadline,
    locationId: record.locationId,
    allowsRemoteWork: record.allowsRemoteWork,
  }
}

function publicationInput(expectedAssignmentVersion = 3) {
  return { assignmentId, expectedAssignmentVersion }
}

function withdrawalInput(expectedAssignmentVersion = 4) {
  return {
    assignmentId,
    expectedAssignmentVersion,
    reason: 'De organisatie trekt deze publicatie bewust in.',
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.transaction.mockImplementation((callback) => callback(transactionClient))
  mocks.requireManager.mockResolvedValue(assignment())
  mocks.assignmentUpdateMany.mockResolvedValue({ count: 1 })
  mocks.revisionCreate.mockResolvedValue({ id: 'revision' })
  mocks.revisionFind.mockResolvedValue(snapshot())
  mocks.historyCreate.mockResolvedValue({ id: 'history' })
  mocks.historyFindMany.mockImplementation(({ where }) =>
    where.toStatus === 'OPEN'
      ? [{ changedByUserId: userId, createdAt: publishedAt }]
      : [],
  )
  mocks.locationFind.mockResolvedValue({ id: locationId })
  mocks.sectorFind.mockResolvedValue({ id: 'sector' })
  mocks.specialismFind.mockResolvedValue({ id: 'specialism' })
  mocks.assignmentSpecialismFind.mockResolvedValue(null)
  mocks.intakeFind.mockResolvedValue({ id: intakeId })
})

describe('opdrachtpublicatie', () => {
  it('publiceert een geldige opdracht atomair met snapshot en precies één statushistorie-item', async () => {
    await expect(
      publishAssignment(userId, organizationId, publicationInput()),
    ).resolves.toMatchObject({
      id: assignmentId,
      status: 'OPEN',
      version: 4,
      publishedByUserId: userId,
      publishedVersion: 4,
      idempotent: false,
    })

    expect(mocks.transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: 'Serializable',
    })
    expect(mocks.assignmentUpdateMany).toHaveBeenNthCalledWith(1, {
      where: {
        id: assignmentId,
        clientOrganizationId: organizationId,
        status: 'READY_FOR_REVIEW',
        version: 3,
        publishedAt: null,
        publishedByUserId: null,
        publishedVersion: null,
      },
      data: { version: { increment: 1 } },
    })
    expect(mocks.revisionCreate).toHaveBeenCalledOnce()
    expect(mocks.revisionCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        assignmentId,
        version: 4,
        title: 'Veiligheidskundige ondersteuning',
        changedByUserId: userId,
      }),
    })
    expect(mocks.assignmentUpdateMany).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: expect.objectContaining({ status: 'READY_FOR_REVIEW', version: 4 }),
        data: expect.objectContaining({
          status: 'OPEN',
          publishedByUserId: userId,
          publishedVersion: 4,
        }),
      }),
    )
    expect(mocks.historyCreate).toHaveBeenCalledOnce()
    expect(mocks.historyCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        fromStatus: 'READY_FOR_REVIEW',
        toStatus: 'OPEN',
        changedByUserId: userId,
      }),
    })
  })

  it.each(['OWNER', 'ADMIN'] as const)('laat publicatie door wanneer de policy %s autoriseert', async () => {
    await expect(
      publishAssignment(userId, organizationId, publicationInput()),
    ).resolves.toMatchObject({ status: 'OPEN' })
  })

  it.each([
    'MEMBER',
    'verkeerde tenant',
    'inactieve membership',
    'inactieve organisatie',
    'PROVIDER-organisatie',
    'gemanipuleerde opdracht-ID',
  ])('weigert veilig wanneer de centrale autorisatie faalt: %s', async () => {
    mocks.requireManager.mockRejectedValue(
      new AssignmentServiceError('ACCESS_DENIED', 'Deze opdracht is niet beschikbaar.'),
    )

    await expect(
      publishAssignment(userId, organizationId, publicationInput()),
    ).rejects.toMatchObject({ code: 'ACCESS_DENIED' })
    expect(mocks.assignmentUpdateMany).not.toHaveBeenCalled()
  })

  it.each([
    [{ title: 'Kort' }, 'title'],
    [{ description: 'Te kort' }, 'description'],
    [{ employeeCount: 0 }, 'employeeCount'],
    [{ desiredStartDate: new Date('2020-01-01T00:00:00.000Z') }, 'desiredStartDate'],
    [{ responseDeadline: new Date('2020-01-01T00:00:00.000Z') }, 'responseDeadline'],
  ] as const)('blokkeert een ongeldige aanwezige waarde', async (change, field) => {
    mocks.requireManager.mockResolvedValue({ ...assignment(), ...change })

    await expect(
      publishAssignment(userId, organizationId, publicationInput()),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR', fieldErrors: { [field]: expect.any(Array) } })
    expect(mocks.assignmentUpdateMany).not.toHaveBeenCalled()
  })

  it('vereist een geldige locatie wanneer de opdracht niet remote kan', async () => {
    mocks.locationFind.mockResolvedValue(null)

    await expect(
      publishAssignment(userId, organizationId, publicationInput()),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('laat een remote opdracht zonder locatie en zonder specialisme of responstermijn publiceren', async () => {
    mocks.requireManager.mockResolvedValue({
      ...assignment(),
      locationId: null,
      allowsRemoteWork: true,
      primarySpecialismId: null,
      responseDeadline: null,
    })

    await expect(
      publishAssignment(userId, organizationId, publicationInput()),
    ).resolves.toMatchObject({ status: 'OPEN' })
    expect(mocks.locationFind).not.toHaveBeenCalled()
    expect(mocks.specialismFind).not.toHaveBeenCalled()
  })

  it('raadt sector of specialisme niet en bewaart null in de snapshot', async () => {
    await publishAssignment(userId, organizationId, publicationInput())

    expect(mocks.revisionCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ sectorId: null, primarySpecialismId: null }),
    })
    expect(mocks.assignmentUpdateMany).not.toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ sectorId: expect.anything() }),
      }),
    )
  })

  it('weigert een achterhaalde versie zonder writes', async () => {
    await expect(
      publishAssignment(userId, organizationId, publicationInput(2)),
    ).rejects.toMatchObject({ code: 'CONFLICT' })
    expect(mocks.assignmentUpdateMany).not.toHaveBeenCalled()
  })

  it('geeft een consistente herhaling na succes idempotent terug zonder writes', async () => {
    mocks.requireManager.mockResolvedValue(assignment('OPEN'))

    await expect(
      publishAssignment(userId, organizationId, publicationInput()),
    ).resolves.toMatchObject({ status: 'OPEN', version: 4, idempotent: true })
    expect(mocks.assignmentUpdateMany).not.toHaveBeenCalled()
    expect(mocks.revisionCreate).not.toHaveBeenCalled()
    expect(mocks.historyCreate).not.toHaveBeenCalled()
  })

  it('accepteert een inconsistente OPEN-toestand niet als idempotent succes', async () => {
    mocks.requireManager.mockResolvedValue(assignment('OPEN'))
    mocks.revisionFind.mockResolvedValue(null)

    await expect(
      publishAssignment(userId, organizationId, publicationInput()),
    ).rejects.toMatchObject({ code: 'INTEGRITY_ERROR' })
  })

  it('schrijft bij een gelijktijdig verloren versieclaim geen snapshot of historie', async () => {
    mocks.assignmentUpdateMany.mockResolvedValueOnce({ count: 0 })

    await expect(
      publishAssignment(userId, organizationId, publicationInput()),
    ).rejects.toMatchObject({ code: 'CONFLICT' })
    expect(mocks.revisionCreate).not.toHaveBeenCalled()
    expect(mocks.historyCreate).not.toHaveBeenCalled()
  })

  it('vertaalt een transactionele schrijffout naar een veilige integriteitsfout', async () => {
    mocks.revisionCreate.mockRejectedValue(new Error('Gesimuleerde schrijffout'))

    await expect(
      publishAssignment(userId, organizationId, publicationInput()),
    ).rejects.toMatchObject({
      code: 'INTEGRITY_ERROR',
      message: 'De opdracht kon niet veilig worden gepubliceerd.',
    })
    expect(mocks.historyCreate).not.toHaveBeenCalled()
  })

  it('publiceert geen geannuleerde opdracht opnieuw', async () => {
    mocks.requireManager.mockResolvedValue({
      ...assignment('CANCELLED'),
      publishedAt: null,
      publishedByUserId: null,
      publishedVersion: null,
    })

    await expect(
      publishAssignment(userId, organizationId, publicationInput()),
    ).rejects.toMatchObject({ code: 'INVALID_STATUS' })
  })

  it('publiceert geen administratief gesloten of gearchiveerde opdracht', async () => {
    mocks.requireManager.mockResolvedValue({
      ...assignment(),
      archivedAt: new Date('2026-07-14T09:00:00.000Z'),
    })

    await expect(
      publishAssignment(userId, organizationId, publicationInput()),
    ).rejects.toMatchObject({ code: 'INVALID_STATUS' })
    expect(mocks.assignmentUpdateMany).not.toHaveBeenCalled()
  })
})

describe('gepubliceerde opdracht intrekken', () => {
  beforeEach(() => {
    mocks.requireManager.mockResolvedValue(assignment('OPEN'))
  })

  it('trekt OPEN transactioneel in en behoudt alle publicatiemetadata', async () => {
    await expect(
      withdrawPublishedAssignment(userId, organizationId, withdrawalInput()),
    ).resolves.toEqual({
      id: assignmentId,
      status: 'CANCELLED',
      version: 5,
      publishedAt,
      publishedByUserId: userId,
      publishedVersion: 4,
      idempotent: false,
    })

    expect(mocks.assignmentUpdateMany).toHaveBeenCalledWith({
      where: {
        id: assignmentId,
        clientOrganizationId: organizationId,
        status: 'OPEN',
        version: 4,
        publishedAt,
        publishedByUserId: userId,
        publishedVersion: 4,
      },
      data: { status: 'CANCELLED', version: { increment: 1 } },
    })
    expect(mocks.historyCreate).toHaveBeenCalledOnce()
    expect(mocks.historyCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        fromStatus: 'OPEN',
        toStatus: 'CANCELLED',
        reason: 'De organisatie trekt deze publicatie bewust in.',
      }),
    })
    expect(mocks.revisionCreate).not.toHaveBeenCalled()
  })

  it('weigert een ontbrekende of te korte reden vóór databasegebruik', () => {
    expect(() =>
      withdrawPublishedAssignment(userId, organizationId, {
        assignmentId,
        expectedAssignmentVersion: 4,
        reason: 'Te kort',
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
    expect(mocks.transaction).not.toHaveBeenCalled()
  })

  it('weigert intrekken vanuit een andere status', async () => {
    mocks.requireManager.mockResolvedValue(assignment('READY_FOR_REVIEW'))

    await expect(
      withdrawPublishedAssignment(userId, organizationId, withdrawalInput()),
    ).rejects.toMatchObject({ code: 'INVALID_STATUS' })
  })

  it('overschrijft niets bij een achterhaalde versie', async () => {
    await expect(
      withdrawPublishedAssignment(userId, organizationId, withdrawalInput(3)),
    ).rejects.toMatchObject({ code: 'CONFLICT' })
    expect(mocks.assignmentUpdateMany).not.toHaveBeenCalled()
  })

  it('geeft een consistente dubbele intrekking idempotent terug zonder historie', async () => {
    mocks.requireManager.mockResolvedValue(assignment('CANCELLED'))
    mocks.historyFindMany.mockImplementation(({ where }) =>
      where.toStatus === 'OPEN'
        ? [{ changedByUserId: userId, createdAt: publishedAt }]
        : [{ id: 'withdrawal-history' }],
    )

    await expect(
      withdrawPublishedAssignment(userId, organizationId, withdrawalInput()),
    ).resolves.toMatchObject({ status: 'CANCELLED', version: 5, idempotent: true })
    expect(mocks.assignmentUpdateMany).not.toHaveBeenCalled()
    expect(mocks.historyCreate).not.toHaveBeenCalled()
  })
})
