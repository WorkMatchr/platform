import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  transaction: vi.fn(),
  requireManager: vi.fn(),
  updateMany: vi.fn(),
  revisionCreate: vi.fn(),
  historyCreate: vi.fn(),
  locationFind: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({ getPrisma: () => ({ $transaction: mocks.transaction }) }))
vi.mock('./assignment-authorization', () => ({ requireAssignmentManager: mocks.requireManager }))

import { archiveUnpublishedAssignment, cancelAssignment, markAssignmentReadyForReview, reopenAssignment, updateAssignment } from './assignment-service'

const userId = '00000000-0000-4000-8000-000000000001'
const organizationId = '00000000-0000-4000-8000-000000000002'
const assignmentId = '00000000-0000-4000-8000-000000000003'
const locationId = '00000000-0000-4000-8000-000000000004'
const futureDate = new Date()
futureDate.setUTCDate(futureDate.getUTCDate() + 30)

const transactionClient = {
  assignment: { updateMany: mocks.updateMany },
  assignmentRevision: { create: mocks.revisionCreate },
  assignmentStatusHistory: { create: mocks.historyCreate },
  organizationLocation: { findFirst: mocks.locationFind },
}

function assignment(status: 'DRAFT' | 'READY_FOR_REVIEW' | 'OPEN' | 'CANCELLED' | 'ARCHIVED' = 'DRAFT', version = 1) {
  return {
    id: assignmentId,
    clientOrganizationId: organizationId,
    status,
    version,
    title: 'Veiligheidskundige ondersteuning',
    description: 'Een volledige zakelijke opdrachtomschrijving voor veilig werken.',
    primarySpecialismId: null,
    sectorId: null,
    employeeCount: 20,
    desiredStartDate: null,
    responseDeadline: null,
    locationType: 'REGISTERED' as const,
    locationId,
    locationName: 'Hoofdkantoor',
    locationAddressLine: 'Testlaan 1',
    locationPostalCode: '1234AB',
    locationCity: 'Utrecht',
    locationProvince: 'Utrecht',
    locationCountryCode: 'NL',
    locationRegion: 'Utrecht',
    locationDescription: null,
    locationCount: null,
    allowsRemoteWork: false,
    publishedAt: null,
    archivedAt: status === 'ARCHIVED' ? new Date('2026-08-01T10:00:00.000Z') : null,
  }
}

const editInput = {
  assignmentId,
  expectedAssignmentVersion: 1,
  title: 'Aangepaste veiligheidsopdracht',
  description: 'Een aangepaste en voldoende uitgebreide zakelijke opdrachtomschrijving.',
  employeeCount: 30,
  desiredStartDate: futureDate.toISOString().slice(0, 10),
  locationType: 'REGISTERED' as const,
  locationId,
  locationCity: null,
  locationRegion: null,
  locationDescription: null,
  locationCount: null,
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.transaction.mockImplementation((callback) => callback(transactionClient))
  mocks.requireManager.mockResolvedValue(assignment())
  mocks.updateMany.mockResolvedValue({ count: 1 })
  mocks.locationFind.mockResolvedValue({
    id: locationId,
    label: 'Hoofdkantoor',
    addressLine: 'Testlaan 1',
    postalCode: '1234AB',
    city: 'Utrecht',
    province: 'Utrecht',
    countryCode: 'NL',
  })
  mocks.revisionCreate.mockResolvedValue({ id: 'revision' })
  mocks.historyCreate.mockResolvedValue({ id: 'history' })
})

describe('opdrachtmutatieservice', () => {
  it('wijzigt een concept met optimistic concurrency en precies één nieuwe revisie', async () => {
    await expect(updateAssignment(userId, organizationId, editInput)).resolves.toEqual({ id: assignmentId, status: 'DRAFT', version: 2 })
    expect(mocks.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: assignmentId, version: 1, status: 'DRAFT' }, data: expect.objectContaining({ version: { increment: 1 } }) }))
    expect(mocks.revisionCreate).toHaveBeenCalledOnce()
    expect(mocks.revisionCreate).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ assignmentId, version: 2, changedByUserId: userId }) }))
  })

  it('overschrijft niets bij een concurrencyconflict', async () => {
    mocks.requireManager.mockResolvedValue(assignment('DRAFT', 2))
    await expect(updateAssignment(userId, organizationId, editInput)).rejects.toMatchObject({ code: 'CONFLICT' })
    expect(mocks.updateMany).not.toHaveBeenCalled()
    expect(mocks.revisionCreate).not.toHaveBeenCalled()
  })

  it('weigert wijziging van een geannuleerde opdracht', async () => {
    mocks.requireManager.mockResolvedValue(assignment('CANCELLED'))
    await expect(updateAssignment(userId, organizationId, editInput)).rejects.toMatchObject({ code: 'INVALID_STATUS' })
  })

  it('weigert inhoudswijziging en generiek annuleren van een gepubliceerde opdracht', async () => {
    mocks.requireManager.mockResolvedValue(assignment('OPEN'))
    await expect(updateAssignment(userId, organizationId, editInput)).rejects.toMatchObject({ code: 'INVALID_STATUS' })
    await expect(cancelAssignment(userId, organizationId, { assignmentId, expectedAssignmentVersion: 1, reason: 'Deze generieke actie mag publicatie niet intrekken.' })).rejects.toMatchObject({ code: 'INVALID_STATUS' })
    await expect(reopenAssignment(userId, organizationId, { assignmentId, expectedAssignmentVersion: 1, reason: 'Deze opdracht mag niet terug naar een interne status.' })).rejects.toMatchObject({ code: 'INVALID_STATUS' })
    expect(mocks.updateMany).not.toHaveBeenCalled()
  })

  it('weigert een onbevoegde wijziging zonder databasewrite', async () => {
    mocks.requireManager.mockRejectedValue({ code: 'ACCESS_DENIED' })
    await expect(updateAssignment(userId, organizationId, editInput)).rejects.toMatchObject({ code: 'ACCESS_DENIED' })
    expect(mocks.updateMany).not.toHaveBeenCalled()
    expect(mocks.revisionCreate).not.toHaveBeenCalled()
  })

  it('weigert een locatie van een andere tenant', async () => {
    mocks.locationFind.mockResolvedValue(null)
    await expect(updateAssignment(userId, organizationId, editInput)).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
    expect(mocks.updateMany).not.toHaveBeenCalled()
  })

  it('brengt een geldig concept intern gereed en schrijft statushistorie', async () => {
    await expect(markAssignmentReadyForReview(userId, organizationId, { assignmentId, expectedAssignmentVersion: 1 })).resolves.toEqual({ id: assignmentId, status: 'READY_FOR_REVIEW', version: 2 })
    expect(mocks.historyCreate).toHaveBeenCalledWith({ data: expect.objectContaining({ fromStatus: 'DRAFT', toStatus: 'READY_FOR_REVIEW', changedByUserId: userId }) })
  })

  it('meldt een inhoudelijk ongeldig concept niet gereed', async () => {
    mocks.requireManager.mockResolvedValue({ ...assignment(), title: 'Kort', description: 'Te kort' })
    await expect(markAssignmentReadyForReview(userId, organizationId, { assignmentId, expectedAssignmentVersion: 1 })).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
    expect(mocks.updateMany).not.toHaveBeenCalled()
    expect(mocks.historyCreate).not.toHaveBeenCalled()
  })

  it('overschrijft geen gelijktijdige statuswijziging', async () => {
    mocks.updateMany.mockResolvedValue({ count: 0 })
    await expect(markAssignmentReadyForReview(userId, organizationId, { assignmentId, expectedAssignmentVersion: 1 })).rejects.toMatchObject({ code: 'CONFLICT' })
    expect(mocks.historyCreate).not.toHaveBeenCalled()
  })

  it('zet gereed terug naar concept met een begrensde reden', async () => {
    mocks.requireManager.mockResolvedValue(assignment('READY_FOR_REVIEW'))
    await reopenAssignment(userId, organizationId, { assignmentId, expectedAssignmentVersion: 1, reason: 'De planning moet eerst worden aangepast.' })
    expect(mocks.historyCreate).toHaveBeenCalledWith({ data: expect.objectContaining({ fromStatus: 'READY_FOR_REVIEW', toStatus: 'DRAFT', reason: 'De planning moet eerst worden aangepast.' }) })
  })

  it.each(['DRAFT', 'READY_FOR_REVIEW'] as const)('annuleert %s zonder te verwijderen en bewaart de reden', async (status) => {
    mocks.requireManager.mockResolvedValue(assignment(status))
    await cancelAssignment(userId, organizationId, { assignmentId, expectedAssignmentVersion: 1, reason: 'De organisatie trekt deze opdracht bewust in.' })
    expect(mocks.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: { status: 'CANCELLED', version: { increment: 1 } } }))
    expect(mocks.historyCreate).toHaveBeenCalledWith({ data: expect.objectContaining({ toStatus: 'CANCELLED' }) })
  })

  it('weigert een te korte annuleringsreden vóór een databasewrite', async () => {
    expect(() => cancelAssignment(userId, organizationId, { assignmentId, expectedAssignmentVersion: 1, reason: 'Te kort' })).toThrow(expect.objectContaining({ code: 'VALIDATION_ERROR' }))
    expect(mocks.updateMany).not.toHaveBeenCalled()
  })

  it.each(['DRAFT', 'READY_FOR_REVIEW'] as const)('archiveert een nooit gepubliceerde %s-opdracht met auditspoor', async (status) => {
    mocks.requireManager.mockResolvedValue(assignment(status))

    await expect(archiveUnpublishedAssignment(userId, organizationId, {
      assignmentId,
      expectedAssignmentVersion: 1,
    })).resolves.toMatchObject({ id: assignmentId, status: 'ARCHIVED', version: 2, idempotent: false })

    expect(mocks.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        id: assignmentId,
        clientOrganizationId: organizationId,
        status,
        version: 1,
        publishedAt: null,
      },
      data: expect.objectContaining({ status: 'ARCHIVED', version: { increment: 1 } }),
    }))
    expect(mocks.historyCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        assignmentId,
        fromStatus: status,
        toStatus: 'ARCHIVED',
        changedByUserId: userId,
      }),
    })
  })

  it('behandelt herhaald verwijderen van dezelfde ongepubliceerde opdracht idempotent', async () => {
    mocks.requireManager.mockResolvedValue(assignment('ARCHIVED', 2))

    await expect(archiveUnpublishedAssignment(userId, organizationId, {
      assignmentId,
      expectedAssignmentVersion: 1,
    })).resolves.toMatchObject({ status: 'ARCHIVED', version: 2, idempotent: true })

    expect(mocks.updateMany).not.toHaveBeenCalled()
    expect(mocks.historyCreate).not.toHaveBeenCalled()
  })

  it('weigert verwijderen zodra een opdracht ooit is gepubliceerd', async () => {
    mocks.requireManager.mockResolvedValue({
      ...assignment('OPEN'),
      publishedAt: new Date('2026-08-01T09:00:00.000Z'),
    })

    await expect(archiveUnpublishedAssignment(userId, organizationId, {
      assignmentId,
      expectedAssignmentVersion: 1,
    })).rejects.toMatchObject({ code: 'INVALID_STATUS' })
    expect(mocks.updateMany).not.toHaveBeenCalled()
    expect(mocks.historyCreate).not.toHaveBeenCalled()
  })

  it('schrijft geen gedeeltelijke verwijdering bij een concurrencyconflict', async () => {
    mocks.updateMany.mockResolvedValue({ count: 0 })

    await expect(archiveUnpublishedAssignment(userId, organizationId, {
      assignmentId,
      expectedAssignmentVersion: 1,
    })).rejects.toMatchObject({ code: 'CONFLICT' })

    expect(mocks.historyCreate).not.toHaveBeenCalled()
  })
})
