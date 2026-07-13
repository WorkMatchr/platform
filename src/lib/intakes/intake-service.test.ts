import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  transaction: vi.fn(),
  organizationFind: vi.fn(),
  questionnaireVersionFind: vi.fn(),
  intakeFind: vi.fn(),
  intakeCreate: vi.fn(),
  intakeUpdateMany: vi.fn(),
  questionFindMany: vi.fn(),
  locationFindMany: vi.fn(),
  answerFindMany: vi.fn(),
  answerCreate: vi.fn(),
  answerUpdateMany: vi.fn(),
  answerOptionDeleteMany: vi.fn(),
  answerOptionCreateMany: vi.fn(),
  revisionCreate: vi.fn(),
  statusHistoryCreate: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  getPrisma: () => ({ $transaction: mocks.transaction }),
}))

import { createIntake, markIntakeReadyForReview, saveIntakeStep } from './intake-service'

const userId = '00000000-0000-4000-8000-000000000001'
const organizationId = '00000000-0000-4000-8000-000000000002'
const intakeId = '00000000-0000-4000-8000-000000000003'
const questionnaireVersionId = '00000000-0000-4000-8000-000000000004'
const questionId = '00000000-0000-4000-8000-000000000005'

const transactionClient = {
  organization: { findFirst: mocks.organizationFind },
  intakeQuestionnaireVersion: { findFirst: mocks.questionnaireVersionFind },
  intake: {
    findFirst: mocks.intakeFind,
    create: mocks.intakeCreate,
    updateMany: mocks.intakeUpdateMany,
  },
  intakeQuestion: { findMany: mocks.questionFindMany },
  organizationLocation: { findMany: mocks.locationFindMany },
  intakeAnswer: {
    findMany: mocks.answerFindMany,
    create: mocks.answerCreate,
    updateMany: mocks.answerUpdateMany,
  },
  intakeAnswerOption: {
    deleteMany: mocks.answerOptionDeleteMany,
    createMany: mocks.answerOptionCreateMany,
  },
  intakeAnswerRevision: { create: mocks.revisionCreate },
  intakeStatusHistory: { create: mocks.statusHistoryCreate },
}

const activeMembership = {
  userId,
  role: 'OWNER' as const,
  status: 'ACTIVE' as const,
  user: { status: 'ACTIVE' as const },
}

const question = {
  id: questionId,
  questionnaireVersionId,
  key: 'HELP_REQUEST_DESCRIPTION',
  category: 'HELP_REQUEST' as const,
  inputType: 'LONG_TEXT' as const,
  label: 'Waarbij heeft Uw organisatie hulp nodig?',
  helpText: null,
  isRequired: true,
  sortOrder: 10,
  minLength: 20,
  maxLength: 2000,
  minNumber: null,
  maxNumber: null,
  minSelections: null,
  maxSelections: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  options: [],
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.transaction.mockImplementation((callback) => callback(transactionClient))
  mocks.organizationFind.mockResolvedValue({
    id: organizationId,
    status: 'ACTIVE',
    organizationType: 'CLIENT',
    memberships: [activeMembership],
  })
  mocks.questionnaireVersionFind.mockResolvedValue({
    id: questionnaireVersionId,
    questions: [question],
  })
  mocks.intakeCreate.mockResolvedValue({ id: intakeId, status: 'DRAFT', version: 1 })
  mocks.answerCreate.mockResolvedValue({ id: 'answer-id' })
  mocks.revisionCreate.mockResolvedValue({ id: 'revision-id' })
  mocks.statusHistoryCreate.mockResolvedValue({ id: 'history-id' })
})

describe('intake aanmaken', () => {
  it('schrijft bronantwoord, eerste revisie en beginstatus in één transactie', async () => {
    const freeText = 'Wij hebben ondersteuning nodig bij veilig werken.'
    await expect(createIntake(userId, organizationId, { freeText })).resolves.toEqual({
      id: intakeId,
      status: 'DRAFT',
      version: 1,
    })

    expect(mocks.transaction).toHaveBeenCalledTimes(1)
    expect(mocks.intakeCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ freeText, clientOrganizationId: organizationId }),
      }),
    )
    expect(mocks.answerCreate).toHaveBeenCalledOnce()
    expect(mocks.revisionCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ intakeAnswerId: 'answer-id', version: 1, changedByUserId: userId }),
      }),
    )
    expect(mocks.statusHistoryCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ fromStatus: null, toStatus: 'DRAFT' }),
      }),
    )
  })
})

describe('concept opslaan', () => {
  beforeEach(() => {
    mocks.intakeFind.mockResolvedValue({
      id: intakeId,
      clientOrganizationId: organizationId,
      createdByUserId: userId,
      questionnaireVersionId,
      status: 'DRAFT',
      version: 1,
      archivedAt: null,
      clientOrganization: {
        status: 'ACTIVE',
        organizationType: 'CLIENT',
        memberships: [activeMembership],
      },
    })
    mocks.questionFindMany.mockResolvedValue([question])
    mocks.locationFindMany.mockResolvedValue([])
    mocks.answerFindMany.mockResolvedValue([])
    mocks.intakeUpdateMany.mockResolvedValue({ count: 1 })
  })

  it('maakt voor een nieuw antwoord ook een revisie en zet DRAFT op IN_PROGRESS', async () => {
    const result = await saveIntakeStep(userId, intakeId, {
      expectedIntakeVersion: 1,
      category: 'HELP_REQUEST',
      answers: [{ questionId, value: 'Een bijgewerkte en voldoende lange hulpvraag.' }],
    })

    expect(result).toEqual({ id: intakeId, status: 'IN_PROGRESS', version: 2, changedAnswers: 1 })
    expect(mocks.answerCreate).toHaveBeenCalledOnce()
    expect(mocks.revisionCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ version: 1 }) }),
    )
    expect(mocks.intakeUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ version: 1, status: 'DRAFT' }) }),
    )
    expect(mocks.statusHistoryCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ fromStatus: 'DRAFT', toStatus: 'IN_PROGRESS' }),
      }),
    )
  })

  it('weigert een verouderde intakeversie voordat antwoorden worden geschreven', async () => {
    await expect(
      saveIntakeStep(userId, intakeId, {
        expectedIntakeVersion: 2,
        category: 'HELP_REQUEST',
        answers: [{ questionId, value: 'Een bijgewerkte en voldoende lange hulpvraag.' }],
      }),
    ).rejects.toMatchObject({ code: 'CONFLICT' })
    expect(mocks.questionFindMany).not.toHaveBeenCalled()
    expect(mocks.answerCreate).not.toHaveBeenCalled()
  })

  it('weigert een intake buiten de actuele organisatietenant zonder inhoud te onthullen', async () => {
    mocks.intakeFind.mockResolvedValue(null)
    await expect(
      saveIntakeStep(userId, intakeId, {
        expectedIntakeVersion: 1,
        category: 'HELP_REQUEST',
        answers: [{ questionId, value: 'Een bijgewerkte en voldoende lange hulpvraag.' }],
      }),
    ).rejects.toMatchObject({ code: 'ACCESS_DENIED' })
    expect(mocks.questionFindMany).not.toHaveBeenCalled()
  })

  it('schrijft een opeenvolgende revisie bij wijziging van een bestaand antwoord', async () => {
    mocks.answerFindMany.mockResolvedValue([
      {
        id: 'answer-id',
        intakeId,
        questionId,
        version: 1,
        textValue: 'De oorspronkelijke hulpvraag met voldoende lengte.',
        numberValue: null,
        booleanValue: null,
        dateValue: null,
        organizationLocationId: null,
        updatedByUserId: userId,
        createdAt: new Date(),
        updatedAt: new Date(),
        options: [],
      },
    ])
    mocks.answerUpdateMany.mockResolvedValue({ count: 1 })
    mocks.answerOptionDeleteMany.mockResolvedValue({ count: 0 })

    await saveIntakeStep(userId, intakeId, {
      expectedIntakeVersion: 1,
      category: 'HELP_REQUEST',
      answers: [{ questionId, value: 'De gewijzigde hulpvraag heeft eveneens voldoende lengte.' }],
    })

    expect(mocks.answerUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'answer-id', version: 1 } }),
    )
    expect(mocks.revisionCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ intakeAnswerId: 'answer-id', version: 2 }) }),
    )
  })

  it('zet een volledige intake transactioneel gereed voor controle', async () => {
    mocks.questionFindMany.mockResolvedValue([
      { id: questionId, key: question.key, category: question.category, isRequired: true },
    ])
    mocks.answerFindMany.mockResolvedValue([
      {
        questionId,
        textValue: 'De hulpvraag is volledig beschreven.',
        numberValue: null,
        booleanValue: null,
        dateValue: null,
        organizationLocationId: null,
        options: [],
      },
    ])

    await expect(
      markIntakeReadyForReview(userId, intakeId, { expectedIntakeVersion: 1 }),
    ).resolves.toEqual({ id: intakeId, status: 'READY_FOR_REVIEW', version: 2 })
    expect(mocks.intakeUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'READY_FOR_REVIEW' }) }),
    )
  })

  it('wijzigt geen status wanneer een verplichte vraag ontbreekt', async () => {
    mocks.questionFindMany.mockResolvedValue([
      { id: questionId, key: question.key, category: question.category, isRequired: true },
    ])
    mocks.answerFindMany.mockResolvedValue([])

    await expect(
      markIntakeReadyForReview(userId, intakeId, { expectedIntakeVersion: 1 }),
    ).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
      issues: [{ questionKey: question.key }],
    })
    expect(mocks.intakeUpdateMany).not.toHaveBeenCalled()
  })
})
