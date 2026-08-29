import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  transaction: vi.fn(),
  queryRaw: vi.fn(),
  eventFind: vi.fn(),
  eventCreate: vi.fn(),
  eventUpdate: vi.fn(),
  eventUpdateMany: vi.fn(),
  assignmentFind: vi.fn(),
  candidateCreateMany: vi.fn(),
}))

const transactionClient = {
  $queryRaw: mocks.queryRaw,
  marketplaceAssignmentAvailability: {
    findUnique: mocks.eventFind,
    create: mocks.eventCreate,
    update: mocks.eventUpdate,
  },
  assignment: { findUnique: mocks.assignmentFind },
  marketplaceMatchCandidate: { createMany: mocks.candidateCreateMany },
}

vi.mock('@/lib/prisma', () => ({
  getPrisma: () => ({
    $transaction: mocks.transaction,
    marketplaceAssignmentAvailability: {
      updateMany: mocks.eventUpdateMany,
    },
  }),
}))

import {
  createAssignmentAvailabilityEvent,
  evaluateAssignmentPopulation,
  processAssignmentAvailability,
  processAssignmentAvailabilityFailSafe,
} from './assignment-availability-service'

const assignmentId = '00000000-0000-4000-8000-000000000001'
const criterion = {
  specialismId: '00000000-0000-4000-8000-000000000002',
  code: 'ERGONOMICS',
  label: 'Ergonomie',
}

function candidate(index: number, options?: {
  capabilityCode?: string
  sectorCode?: string
}) {
  const suffix = String(index).padStart(12, '0')
  return {
    providerProfileId: `10000000-0000-4000-8000-${suffix}`,
    projectionId: `20000000-0000-4000-8000-${suffix}`,
    projectionChecksum: `${index}`.padStart(64, '0'),
    projectionSourceVersion: 1,
    projectionSchemaVersion: 2,
    providerOrganizationId: `30000000-0000-4000-8000-${suffix}`,
    payload: {
      capabilities: [{
        serviceCode: options?.capabilityCode ?? criterion.code,
        specialismCode: null,
        deliveryModes: ['ONSITE'],
      }],
      sectors: options?.sectorCode
        ? [{ sectorCode: options.sectorCode }]
        : [],
      workAreas: [{ regionCode: 'NATIONWIDE' }],
    },
  }
}

function evaluate(candidates: ReturnType<typeof candidate>[], criteria = [criterion]) {
  return evaluateAssignmentPopulation({
    assignmentId,
    criteria,
    sectorCode: null,
    regionCode: 'UTRECHT',
    allowsRemoteWork: false,
    candidates,
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.transaction.mockImplementation((callback) => callback(transactionClient))
  mocks.queryRaw.mockResolvedValue([{ id: 'event-1' }])
  vi.spyOn(console, 'info').mockImplementation(() => undefined)
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
})

describe('brede Assignment-eligibility', () => {
  it('bewaart alle tien eligible providers en gebruikt maxSelections=3 niet als grens', () => {
    const result = evaluate(Array.from({ length: 10 }, (_, index) => candidate(index + 1)))

    expect(result.evaluated).toHaveLength(10)
    expect(result.evaluated.filter((item) => item.eligibility.result.status === 'ELIGIBLE')).toHaveLength(10)
    expect(result.ranked).toHaveLength(10)
  })

  it('levert voor maxSelections=5 exact dezelfde doelgroep omdat capaciteit geen evaluatorinput is', () => {
    const population = Array.from({ length: 10 }, (_, index) => candidate(index + 1))
    const withThreeResponseSlots = evaluate(population)
    const withFiveResponseSlots = evaluate(population)

    expect(withFiveResponseSlots.evaluated).toEqual(withThreeResponseSlots.evaluated)
  })

  it('beoordeelt de volledige gemengde populatie en sluit alleen niet-passende providers uit', () => {
    const population = [
      ...Array.from({ length: 8 }, (_, index) => candidate(index + 1)),
      ...Array.from({ length: 12 }, (_, index) => candidate(index + 9, {
        capabilityCode: 'OTHER',
      })),
    ]
    const result = evaluate(population)

    expect(result.evaluated).toHaveLength(20)
    expect(result.evaluated.filter((item) => item.eligibility.result.status === 'ELIGIBLE')).toHaveLength(8)
    expect(result.evaluated.filter((item) => item.eligibility.result.status === 'EXCLUDED')).toHaveLength(12)
  })

  it('dedupliceert een multidisciplinaire provider en bewaart alle gematchte specialismen', () => {
    const secondCriterion = {
      specialismId: '00000000-0000-4000-8000-000000000003',
      code: 'OCCUPATIONAL_HYGIENE',
      label: 'Arbeidshygiëne',
    }
    const provider = candidate(1)
    provider.payload.capabilities.push({
      serviceCode: secondCriterion.code,
      specialismCode: null,
      deliveryModes: ['ONSITE'],
    })

    const result = evaluate([provider], [criterion, secondCriterion])

    expect(result.evaluated).toHaveLength(1)
    expect(result.evaluated[0]!.eligibility.result.status).toBe('ELIGIBLE')
    expect(result.evaluated[0]!.eligibility.matchedSpecialisms.map((item) => item.code)).toEqual([
      criterion.code,
      secondCriterion.code,
    ])
  })

  it('behoudt ranking en laat scoreverschillen de eligibilityset niet afkappen', () => {
    const population = [
      candidate(1, { sectorCode: 'CONSTRUCTION' }),
      candidate(2),
    ]
    const result = evaluateAssignmentPopulation({
      assignmentId,
      criteria: [criterion],
      sectorCode: 'CONSTRUCTION',
      regionCode: 'UTRECHT',
      allowsRemoteWork: false,
      candidates: population,
    })

    expect(result.ranked).toHaveLength(2)
    expect(result.ranked[0]!.providerProfileId).toBe(population[0]!.providerProfileId)
    expect(result.evaluated.every((item) => item.eligibility.result.status === 'ELIGIBLE')).toBe(true)
  })
})

describe('publication event en retry', () => {
  it('maakt één duurzame eventidentiteit voor assignment en publishedVersion', async () => {
    const createdAt = new Date('2026-08-29T10:00:00.000Z')
    mocks.eventCreate.mockResolvedValue({ id: 'event-1' })

    await createAssignmentAvailabilityEvent(transactionClient as never, {
      assignmentId,
      publishedVersion: 4,
      createdAt,
    })

    expect(mocks.eventCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        assignmentId,
        publishedVersion: 4,
        idempotencyKey: `ASSIGNMENT_AVAILABLE:${assignmentId}:4`,
      }),
      select: { id: true },
    })
  })

  it('is idempotent bij replay van een reeds voltooide event en schrijft geen kandidaten of side effects', async () => {
    const completed = {
      id: 'event-1',
      assignmentId,
      status: 'COMPLETED',
      matchRunId: 'run-1',
      candidatesEvaluated: 10,
      eligibleCount: 10,
      notEligibleCount: 0,
      lastErrorCode: null,
    }
    mocks.eventFind.mockResolvedValue(completed)

    await processAssignmentAvailability(assignmentId)
    await processAssignmentAvailability(assignmentId)

    expect(mocks.assignmentFind).not.toHaveBeenCalled()
    expect(mocks.candidateCreateMany).not.toHaveBeenCalled()
    expect(mocks.eventUpdate).not.toHaveBeenCalled()
  })

  it.each(['DRAFT', 'READY_FOR_REVIEW', 'CANCELLED', 'ARCHIVED'])(
    'produceert vanuit %s geen actieve availability',
    async (status) => {
      mocks.eventFind.mockResolvedValue({
        id: 'event-1',
        assignmentId,
        status: 'PENDING',
        publishedVersion: 4,
      })
      mocks.assignmentFind.mockResolvedValue({
        id: assignmentId,
        status,
        publishedVersion: status === 'CANCELLED' ? 4 : null,
        publishedByUserId: null,
      })
      mocks.eventUpdate.mockResolvedValue({
        id: 'event-1',
        assignmentId,
        status: 'CANCELLED',
        matchRunId: null,
        candidatesEvaluated: 0,
        eligibleCount: 0,
        notEligibleCount: 0,
        lastErrorCode: null,
      })

      const result = await processAssignmentAvailability(assignmentId)

      expect(result?.status).toBe('CANCELLED')
      expect(mocks.candidateCreateMany).not.toHaveBeenCalled()
    },
  )

  it('faalt gesloten en laat de publicatiecaller doorgaan wanneer verwerking mislukt', async () => {
    mocks.transaction.mockRejectedValueOnce(new Error('gesimuleerde verwerking'))
    mocks.eventUpdateMany.mockResolvedValue({ count: 1 })

    await expect(
      processAssignmentAvailabilityFailSafe(assignmentId),
    ).resolves.toBeNull()
    expect(mocks.eventUpdateMany).toHaveBeenCalledWith({
      where: {
        assignmentId,
        status: { notIn: ['COMPLETED', 'CANCELLED'] },
      },
      data: {
        status: 'FAILED',
        attemptCount: { increment: 1 },
        lastErrorCode: 'ELIGIBILITY_PROCESSING_FAILED',
      },
    })
  })
})
