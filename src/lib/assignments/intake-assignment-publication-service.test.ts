import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  transaction: vi.fn(),
  convert: vi.fn(),
  publish: vi.fn(),
  processAvailability: vi.fn(),
}))

const transactionClient = { marker: 'shared-transaction' }

vi.mock('@/lib/prisma', () => ({
  getPrisma: () => ({ $transaction: mocks.transaction }),
}))
vi.mock('./assignment-conversion-service', () => ({
  convertIntakeToAssignmentInTransaction: mocks.convert,
}))
vi.mock('./assignment-publication-service', () => ({
  publishAssignmentInTransaction: mocks.publish,
}))
vi.mock('@/lib/marketplace/assignment-availability-service', () => ({
  processAssignmentAvailabilityFailSafe: mocks.processAvailability,
}))

import { AssignmentServiceError } from './assignment-errors'
import { publishIntakeAsAssignment } from './intake-assignment-publication-service'

const userId = '00000000-0000-4000-8000-000000000001'
const organizationId = '00000000-0000-4000-8000-000000000002'
const intakeId = '00000000-0000-4000-8000-000000000003'
const assignmentId = '00000000-0000-4000-8000-000000000004'

beforeEach(() => {
  vi.clearAllMocks()
  mocks.transaction.mockImplementation(async (callback: (transaction: unknown) => unknown) => (
    callback(transactionClient)
  ))
  mocks.convert.mockResolvedValue({
    id: assignmentId,
    status: 'DRAFT',
    version: 1,
    idempotent: false,
  })
  mocks.publish.mockResolvedValue({
    id: assignmentId,
    status: 'OPEN',
    version: 3,
    publishedVersion: 3,
    idempotent: false,
  })
  mocks.processAvailability.mockResolvedValue(null)
})

describe('transactionele intakepublicatie', () => {
  it('vormt en publiceert de opdracht binnen exact dezelfde seriële transactie', async () => {
    await expect(publishIntakeAsAssignment(userId, organizationId, intakeId, {
      expectedIntakeVersion: 7,
    })).resolves.toMatchObject({ id: assignmentId, status: 'OPEN', publishedVersion: 3 })

    expect(mocks.transaction).toHaveBeenCalledOnce()
    expect(mocks.transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: 'Serializable',
    })
    expect(mocks.convert).toHaveBeenCalledWith(transactionClient, userId, intakeId, {
      expectedIntakeVersion: 7,
    })
    expect(mocks.publish).toHaveBeenCalledWith(transactionClient, userId, organizationId, {
      assignmentId,
      expectedAssignmentVersion: 1,
    })
    expect(mocks.processAvailability).toHaveBeenCalledWith(assignmentId)
  })

  it('gebruikt bij herhaling dezelfde reeds gepubliceerde opdracht zonder duplicaten', async () => {
    mocks.convert.mockResolvedValue({
      id: assignmentId,
      status: 'OPEN',
      version: 3,
      idempotent: true,
    })
    mocks.publish.mockResolvedValue({
      id: assignmentId,
      status: 'OPEN',
      version: 3,
      publishedVersion: 3,
      idempotent: true,
    })

    await expect(publishIntakeAsAssignment(userId, organizationId, intakeId, {
      expectedIntakeVersion: 7,
    })).resolves.toMatchObject({ id: assignmentId, status: 'OPEN', idempotent: true })
    expect(mocks.convert).toHaveBeenCalledOnce()
    expect(mocks.publish).toHaveBeenCalledOnce()
  })

  it('publiceert niets wanneer de actuele intakevalidatie faalt', async () => {
    mocks.convert.mockRejectedValue(new AssignmentServiceError('VALIDATION_ERROR'))

    await expect(publishIntakeAsAssignment(userId, organizationId, intakeId, {
      expectedIntakeVersion: 7,
    })).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
    expect(mocks.publish).not.toHaveBeenCalled()
  })

  it('vertaalt een concurrencyrace naar een veilig conflict', async () => {
    mocks.transaction.mockRejectedValue({ code: 'P2034' })

    await expect(publishIntakeAsAssignment(userId, organizationId, intakeId, {
      expectedIntakeVersion: 7,
    })).rejects.toMatchObject({ code: 'CONFLICT' })
  })
})
