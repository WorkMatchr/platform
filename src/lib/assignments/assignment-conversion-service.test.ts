import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  transaction: vi.fn(),
  intakeFind: vi.fn(),
  intakeUpdateMany: vi.fn(),
  assignmentFind: vi.fn(),
  assignmentCreate: vi.fn(),
  questionFindMany: vi.fn(),
  answerFindMany: vi.fn(),
  locationFindMany: vi.fn(),
  sectorFindMany: vi.fn(),
  intakeStatusHistoryCreate: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  getPrisma: () => ({ $transaction: mocks.transaction }),
}))

import { convertIntakeToAssignment } from './assignment-conversion-service'

const userId = '00000000-0000-4000-8000-000000000001'
const organizationId = '00000000-0000-4000-8000-000000000002'
const intakeId = '00000000-0000-4000-8000-000000000003'
const questionnaireVersionId = '00000000-0000-4000-8000-000000000004'
const assignmentId = '00000000-0000-4000-8000-000000000005'

const questionIds = {
  help: '00000000-0000-4000-8000-000000000101',
  topics: '00000000-0000-4000-8000-000000000102',
  outcome: '00000000-0000-4000-8000-000000000103',
  situation: '00000000-0000-4000-8000-000000000104',
  urgency: '00000000-0000-4000-8000-000000000105',
  workMode: '00000000-0000-4000-8000-000000000106',
  location: '00000000-0000-4000-8000-000000000107',
} as const

const optionIds = {
  topic: '00000000-0000-4000-8000-000000000201',
  urgency: '00000000-0000-4000-8000-000000000202',
  remote: '00000000-0000-4000-8000-000000000203',
} as const

const transactionClient = {
  intake: { findFirst: mocks.intakeFind, updateMany: mocks.intakeUpdateMany },
  assignment: { findUnique: mocks.assignmentFind, create: mocks.assignmentCreate },
  intakeQuestion: { findMany: mocks.questionFindMany },
  intakeAnswer: { findMany: mocks.answerFindMany },
  organizationLocation: { findMany: mocks.locationFindMany },
  organizationSector: { findMany: mocks.sectorFindMany },
  intakeStatusHistory: { create: mocks.intakeStatusHistoryCreate },
}

function option(id: string, value: string) {
  return { id, value, isActive: true, isExclusive: false }
}

function question(input: {
  id: string
  key: string
  category: 'HELP_REQUEST' | 'DESIRED_OUTCOME' | 'SITUATION' | 'URGENCY' | 'WORK_MODE' | 'LOCATION'
  inputType: 'LONG_TEXT' | 'MULTI_SELECT' | 'SINGLE_SELECT' | 'ORGANIZATION_LOCATION'
  isRequired: boolean
  options?: ReturnType<typeof option>[]
  minLength?: number | null
  maxLength?: number | null
  minSelections?: number | null
  maxSelections?: number | null
}) {
  return {
    id: input.id,
    questionnaireVersionId,
    key: input.key,
    category: input.category,
    inputType: input.inputType,
    label: input.key,
    helpText: null,
    isRequired: input.isRequired,
    sortOrder: 1,
    minLength: input.minLength ?? null,
    maxLength: input.maxLength ?? null,
    minNumber: null,
    maxNumber: null,
    minSelections: input.minSelections ?? null,
    maxSelections: input.maxSelections ?? null,
    createdAt: new Date(),
    updatedAt: new Date(),
    options: input.options ?? [],
  }
}

const questions = [
  question({
    id: questionIds.help,
    key: 'HELP_REQUEST_DESCRIPTION',
    category: 'HELP_REQUEST',
    inputType: 'LONG_TEXT',
    isRequired: true,
    minLength: 20,
    maxLength: 2000,
  }),
  question({
    id: questionIds.topics,
    key: 'HELP_REQUEST_TOPICS',
    category: 'HELP_REQUEST',
    inputType: 'MULTI_SELECT',
    isRequired: true,
    options: [option(optionIds.topic, 'WORKPLACE_OPERATIONAL_SAFETY')],
    minSelections: 1,
    maxSelections: 3,
  }),
  question({
    id: questionIds.outcome,
    key: 'DESIRED_OUTCOME_DESCRIPTION',
    category: 'DESIRED_OUTCOME',
    inputType: 'LONG_TEXT',
    isRequired: true,
    minLength: 10,
    maxLength: 1500,
  }),
  question({
    id: questionIds.situation,
    key: 'SITUATION_DESCRIPTION',
    category: 'SITUATION',
    inputType: 'LONG_TEXT',
    isRequired: true,
    minLength: 20,
    maxLength: 3000,
  }),
  question({
    id: questionIds.urgency,
    key: 'SUPPORT_URGENCY',
    category: 'URGENCY',
    inputType: 'SINGLE_SELECT',
    isRequired: true,
    options: [option(optionIds.urgency, 'WITHIN_FOUR_WEEKS')],
    minSelections: 1,
    maxSelections: 1,
  }),
  question({
    id: questionIds.workMode,
    key: 'PREFERRED_WORK_MODE',
    category: 'WORK_MODE',
    inputType: 'SINGLE_SELECT',
    isRequired: true,
    options: [option(optionIds.remote, 'REMOTE')],
    minSelections: 1,
    maxSelections: 1,
  }),
  question({
    id: questionIds.location,
    key: 'PRIMARY_LOCATION',
    category: 'LOCATION',
    inputType: 'ORGANIZATION_LOCATION',
    isRequired: false,
  }),
]

function textAnswer(questionId: string, textValue: string | null) {
  return {
    id: `${questionId}-answer`,
    intakeId,
    questionId,
    version: 1,
    textValue,
    numberValue: null,
    booleanValue: null,
    dateValue: null,
    organizationLocationId: null,
    updatedByUserId: userId,
    createdAt: new Date(),
    updatedAt: new Date(),
    options: [],
  }
}

function optionAnswer(questionId: string, optionId: string, value: string) {
  return {
    ...textAnswer(questionId, null),
    options: [{ optionId, option: { value } }],
  }
}

const answers = [
  textAnswer(questionIds.help, 'Wij willen onze werkwijze op meerdere punten veiliger maken.'),
  optionAnswer(questionIds.topics, optionIds.topic, 'WORKPLACE_OPERATIONAL_SAFETY'),
  textAnswer(questionIds.outcome, 'Een praktisch en uitvoerbaar verbeterplan.'),
  textAnswer(questionIds.situation, 'De bestaande werkinstructies zijn verouderd en niet overal bekend.'),
  optionAnswer(questionIds.urgency, optionIds.urgency, 'WITHIN_FOUR_WEEKS'),
  optionAnswer(questionIds.workMode, optionIds.remote, 'REMOTE'),
]

function intakeRecord(role: 'OWNER' | 'ADMIN' | 'MEMBER', status = 'READY_FOR_REVIEW', version = 4) {
  return {
    id: intakeId,
    clientOrganizationId: organizationId,
    createdByUserId: userId,
    questionnaireVersionId,
    status,
    version,
    archivedAt: null,
    clientOrganization: {
      status: 'ACTIVE',
      organizationType: 'CLIENT',
      memberships: [
        {
          userId,
          role,
          status: 'ACTIVE',
          user: { status: 'ACTIVE' },
        },
      ],
    },
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.transaction.mockImplementation((callback) => callback(transactionClient))
  mocks.intakeFind.mockResolvedValue(intakeRecord('OWNER'))
  mocks.intakeUpdateMany.mockResolvedValue({ count: 1 })
  mocks.assignmentFind.mockResolvedValue(null)
  mocks.assignmentCreate.mockResolvedValue({ id: assignmentId, status: 'DRAFT', version: 1 })
  mocks.questionFindMany.mockResolvedValue(questions)
  mocks.answerFindMany.mockResolvedValue(answers)
  mocks.locationFindMany.mockResolvedValue([])
  mocks.sectorFindMany.mockResolvedValue([])
  mocks.intakeStatusHistoryCreate.mockResolvedValue({ id: 'history-id' })
})

describe('intake naar opdracht converteren', () => {
  it.each(['OWNER', 'ADMIN'] as const)('staat succesvolle conversie toe voor %s', async (role) => {
    mocks.intakeFind.mockResolvedValue(intakeRecord(role))

    await expect(
      convertIntakeToAssignment(userId, intakeId, { expectedIntakeVersion: 4 }),
    ).resolves.toEqual({ id: assignmentId, status: 'DRAFT', version: 1, idempotent: false })

    expect(mocks.transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: 'Serializable',
    })
    expect(mocks.intakeUpdateMany).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: { id: intakeId, version: 4, status: 'READY_FOR_REVIEW' },
        data: expect.objectContaining({ status: 'SUBMITTED', submittedByUserId: userId }),
      }),
    )
    expect(mocks.assignmentCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          intakeId,
          clientOrganizationId: organizationId,
          createdByUserId: userId,
          status: 'DRAFT',
          title: 'Wij willen onze werkwijze op meerdere punten veiliger maken.',
          allowsRemoteWork: true,
          statusHistory: { create: expect.objectContaining({ toStatus: 'DRAFT' }) },
          revisions: { create: expect.objectContaining({ version: 1 }) },
        }),
      }),
    )
    expect(mocks.intakeUpdateMany).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: { id: intakeId, version: 4, status: 'SUBMITTED' },
        data: expect.objectContaining({ status: 'CONVERTED', version: { increment: 1 } }),
      }),
    )
  })

  it('weigert MEMBER voordat conversiegegevens worden geladen', async () => {
    mocks.intakeFind.mockResolvedValue(intakeRecord('MEMBER'))

    await expect(
      convertIntakeToAssignment(userId, intakeId, { expectedIntakeVersion: 4 }),
    ).rejects.toMatchObject({ code: 'ACCESS_DENIED' })
    expect(mocks.assignmentFind).not.toHaveBeenCalled()
    expect(mocks.assignmentCreate).not.toHaveBeenCalled()
  })

  it('geeft bij herhaalde conversie veilig dezelfde opdracht terug', async () => {
    mocks.intakeFind.mockResolvedValue(intakeRecord('OWNER', 'CONVERTED', 5))
    mocks.assignmentFind.mockResolvedValue({
      id: assignmentId,
      clientOrganizationId: organizationId,
      status: 'DRAFT',
      version: 1,
    })

    await expect(
      convertIntakeToAssignment(userId, intakeId, { expectedIntakeVersion: 4 }),
    ).resolves.toEqual({ id: assignmentId, status: 'DRAFT', version: 1, idempotent: true })
    expect(mocks.intakeUpdateMany).not.toHaveBeenCalled()
    expect(mocks.assignmentCreate).not.toHaveBeenCalled()
  })

  it('weigert een intake met een ongeldige status', async () => {
    mocks.intakeFind.mockResolvedValue(intakeRecord('OWNER', 'IN_PROGRESS'))

    await expect(
      convertIntakeToAssignment(userId, intakeId, { expectedIntakeVersion: 4 }),
    ).rejects.toMatchObject({ code: 'INVALID_STATUS' })
    expect(mocks.assignmentCreate).not.toHaveBeenCalled()
  })

  it('weigert een inconsistente geconverteerde intake zonder opdracht', async () => {
    mocks.intakeFind.mockResolvedValue(intakeRecord('OWNER', 'CONVERTED', 5))

    await expect(
      convertIntakeToAssignment(userId, intakeId, { expectedIntakeVersion: 5 }),
    ).rejects.toMatchObject({ code: 'INTEGRITY_ERROR' })
    expect(mocks.assignmentCreate).not.toHaveBeenCalled()
  })

  it('weigert een achterhaalde intakeversie als concurrencyconflict', async () => {
    await expect(
      convertIntakeToAssignment(userId, intakeId, { expectedIntakeVersion: 3 }),
    ).rejects.toMatchObject({ code: 'CONFLICT' })
    expect(mocks.questionFindMany).not.toHaveBeenCalled()
    expect(mocks.assignmentCreate).not.toHaveBeenCalled()
  })

  it('weigert een onvolledige intake ondanks READY_FOR_REVIEW-status', async () => {
    mocks.answerFindMany.mockResolvedValue(
      answers.filter((answer) => answer.questionId !== questionIds.outcome),
    )

    await expect(
      convertIntakeToAssignment(userId, intakeId, { expectedIntakeVersion: 4 }),
    ).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
      issues: [expect.objectContaining({ questionKey: 'DESIRED_OUTCOME_DESCRIPTION' })],
    })
    expect(mocks.intakeUpdateMany).not.toHaveBeenCalled()
    expect(mocks.assignmentCreate).not.toHaveBeenCalled()
  })

  it('laat een schrijffout de omvattende transactie afbreken vóór CONVERTED', async () => {
    mocks.assignmentCreate.mockRejectedValue(new Error('Gesimuleerde transactionele schrijffout'))

    await expect(
      convertIntakeToAssignment(userId, intakeId, { expectedIntakeVersion: 4 }),
    ).rejects.toThrow('Gesimuleerde transactionele schrijffout')
    expect(mocks.transaction).toHaveBeenCalledOnce()
    expect(mocks.intakeUpdateMany).toHaveBeenCalledOnce()
    expect(mocks.intakeUpdateMany).not.toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'CONVERTED' }) }),
    )
  })
})
