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
const locationModeQuestionId = '00000000-0000-4000-8000-000000000010'
const registeredLocationQuestionId = '00000000-0000-4000-8000-000000000011'
const otherLocationCityQuestionId = '00000000-0000-4000-8000-000000000012'
const otherLocationDetailsQuestionId = '00000000-0000-4000-8000-000000000013'
const registeredOptionId = '00000000-0000-4000-8000-000000000020'
const otherOptionId = '00000000-0000-4000-8000-000000000021'
const multipleOptionId = '00000000-0000-4000-8000-000000000022'
const remoteOptionId = '00000000-0000-4000-8000-000000000023'
const unknownLocationOptionId = '00000000-0000-4000-8000-000000000024'
const ownLocationId = '00000000-0000-4000-8000-000000000030'
const foreignLocationId = '00000000-0000-4000-8000-000000000031'
const confirmedCategoryQuestionId = '00000000-0000-4000-8000-000000000040'
const bhvLocationCountQuestionId = '00000000-0000-4000-8000-000000000041'
const bhvCategoryOptionId = '00000000-0000-4000-8000-000000000042'

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
  user: { status: 'ACTIVE' as const, accountType: 'CLIENT' as const },
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

const locationModeQuestion = {
  ...question,
  id: locationModeQuestionId,
  key: 'LOCATION_MODE',
  category: 'LOCATION' as const,
  inputType: 'SINGLE_SELECT' as const,
  minLength: null,
  maxLength: null,
  minSelections: 1,
  maxSelections: 1,
  options: [
    { id: registeredOptionId, value: 'REGISTERED', isActive: true, isExclusive: false },
    { id: otherOptionId, value: 'OTHER', isActive: true, isExclusive: false },
    { id: multipleOptionId, value: 'MULTIPLE', isActive: true, isExclusive: false },
    { id: remoteOptionId, value: 'REMOTE', isActive: true, isExclusive: false },
    { id: unknownLocationOptionId, value: 'UNKNOWN', isActive: true, isExclusive: false },
  ],
}
const registeredLocationQuestion = {
  ...question,
  id: registeredLocationQuestionId,
  key: 'REGISTERED_LOCATION',
  category: 'LOCATION' as const,
  inputType: 'ORGANIZATION_LOCATION' as const,
  minLength: null,
  maxLength: null,
}
const otherLocationCityQuestion = {
  ...question,
  id: otherLocationCityQuestionId,
  key: 'OTHER_LOCATION_CITY',
  category: 'LOCATION' as const,
  inputType: 'SHORT_TEXT' as const,
  minLength: 2,
  maxLength: 120,
}
const otherLocationDetailsQuestion = {
  ...question,
  id: otherLocationDetailsQuestionId,
  key: 'OTHER_LOCATION_DETAILS',
  category: 'LOCATION' as const,
  inputType: 'LONG_TEXT' as const,
  isRequired: false,
  minLength: null,
  maxLength: 1000,
}
const confirmedCategoryQuestion = {
  ...question,
  id: confirmedCategoryQuestionId,
  key: 'CONFIRMED_HELP_CATEGORY',
  inputType: 'SINGLE_SELECT' as const,
  minLength: null,
  maxLength: null,
  minSelections: 1,
  maxSelections: 1,
  options: [
    { id: bhvCategoryOptionId, value: 'BHV', isActive: true, isExclusive: false },
  ],
}
const bhvLocationCountQuestion = {
  ...question,
  id: bhvLocationCountQuestionId,
  key: 'BHV_LOCATION_COUNT',
  category: 'SITUATION' as const,
  inputType: 'NUMBER' as const,
  minLength: null,
  maxLength: null,
  minNumber: 1,
  maxNumber: 10000,
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
  it('bewaart een gevalideerde kenniscontext los van de oorspronkelijke omschrijving', async () => {
    const freeText = 'Wij willen weten wanneer wij een bedrijfsarts moeten inschakelen.'

    await createIntake(userId, organizationId, {
      freeText,
      knowledgeContextId: 'OCCUPATIONAL_PHYSICIAN',
    })

    expect(mocks.intakeCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          freeText,
          knowledgeContextId: 'OCCUPATIONAL_PHYSICIAN',
          knowledgeContextVersion: 1,
          knowledgeSourceRoute: '/kenniscentrum/wanneer-bedrijfsarts-inschakelen',
          knowledgeSuggestedCategory: 'OCCUPATIONAL_HEALTH',
        }),
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
      questionnaireVersion: { version: 2 },
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

  it('accepteert een verplicht BHV-antwoord op basis van de eerder bevestigde categorie', async () => {
    mocks.questionFindMany.mockResolvedValue([
      confirmedCategoryQuestion,
      bhvLocationCountQuestion,
    ])
    mocks.answerFindMany.mockResolvedValue([{
      id: 'category-answer-id',
      intakeId,
      questionId: confirmedCategoryQuestionId,
      version: 1,
      textValue: null,
      numberValue: null,
      booleanValue: null,
      dateValue: null,
      organizationLocationId: null,
      updatedByUserId: userId,
      createdAt: new Date(),
      updatedAt: new Date(),
      options: [{
        optionId: bhvCategoryOptionId,
        option: { value: 'BHV' },
      }],
    }])

    await expect(saveIntakeStep(userId, intakeId, {
      expectedIntakeVersion: 1,
      category: 'SITUATION',
      answers: [{ questionId: bhvLocationCountQuestionId, value: '2' }],
    })).resolves.toMatchObject({ changedAnswers: 1, status: 'IN_PROGRESS' })
    expect(mocks.answerCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ questionId: bhvLocationCountQuestionId }),
    }))
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

  it('wist een verborgen oude locatie uit de actuele waarde en bewaart een revisie', async () => {
    mocks.questionFindMany.mockResolvedValue([
      locationModeQuestion,
      registeredLocationQuestion,
      otherLocationCityQuestion,
      otherLocationDetailsQuestion,
    ])
    mocks.locationFindMany.mockResolvedValue([{ id: ownLocationId }])
    mocks.answerFindMany.mockResolvedValue([{
      id: 'registered-answer-id',
      intakeId,
      questionId: registeredLocationQuestionId,
      version: 1,
      textValue: null,
      numberValue: null,
      booleanValue: null,
      dateValue: null,
      organizationLocationId: ownLocationId,
      updatedByUserId: userId,
      createdAt: new Date(),
      updatedAt: new Date(),
      options: [],
    }])
    mocks.answerUpdateMany.mockResolvedValue({ count: 1 })
    mocks.answerOptionDeleteMany.mockResolvedValue({ count: 0 })

    await saveIntakeStep(userId, intakeId, {
      expectedIntakeVersion: 1,
      category: 'LOCATION',
      answers: [
        { questionId: locationModeQuestionId, value: otherOptionId },
        { questionId: registeredLocationQuestionId, value: ownLocationId },
        { questionId: otherLocationCityQuestionId, value: 'Regio Utrecht' },
        { questionId: otherLocationDetailsQuestionId, value: '' },
      ],
    })

    expect(mocks.answerUpdateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'registered-answer-id', version: 1 },
      data: expect.objectContaining({ organizationLocationId: null }),
    }))
    expect(mocks.revisionCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ intakeAnswerId: 'registered-answer-id', version: 2, organizationLocationId: null }),
    }))
  })

  it('geeft een veldfout wanneer een bestaande organisatielocatie ontbreekt', async () => {
    mocks.questionFindMany.mockResolvedValue([locationModeQuestion, registeredLocationQuestion])
    mocks.locationFindMany.mockResolvedValue([{ id: ownLocationId }])

    await expect(saveIntakeStep(userId, intakeId, {
      expectedIntakeVersion: 1,
      category: 'LOCATION',
      answers: [
        { questionId: locationModeQuestionId, value: registeredOptionId },
        { questionId: registeredLocationQuestionId, value: '' },
      ],
    })).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
      issues: [{ questionId: registeredLocationQuestionId, message: 'Kies een actieve organisatielocatie.' }],
    })
  })

  it('accepteert uitsluitend een actieve locatie van de eigen organisatie', async () => {
    mocks.questionFindMany.mockResolvedValue([locationModeQuestion, registeredLocationQuestion])
    mocks.locationFindMany.mockResolvedValue([{ id: ownLocationId }])

    await expect(saveIntakeStep(userId, intakeId, {
      expectedIntakeVersion: 1,
      category: 'LOCATION',
      answers: [
        { questionId: locationModeQuestionId, value: registeredOptionId },
        { questionId: registeredLocationQuestionId, value: ownLocationId },
      ],
    })).resolves.toMatchObject({ changedAnswers: 2 })
  })

  it('weigert een locatie van een andere tenant server-side', async () => {
    mocks.questionFindMany.mockResolvedValue([locationModeQuestion, registeredLocationQuestion])
    mocks.locationFindMany.mockResolvedValue([{ id: ownLocationId }])

    await expect(saveIntakeStep(userId, intakeId, {
      expectedIntakeVersion: 1,
      category: 'LOCATION',
      answers: [
        { questionId: locationModeQuestionId, value: registeredOptionId },
        { questionId: registeredLocationQuestionId, value: foreignLocationId },
      ],
    })).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
      issues: [{ questionId: registeredLocationQuestionId, message: 'Kies een actieve organisatielocatie.' }],
    })
  })

  it('geeft een veldfout wanneer plaats of regio bij een andere locatie ontbreekt', async () => {
    mocks.questionFindMany.mockResolvedValue([locationModeQuestion, registeredLocationQuestion, otherLocationCityQuestion])

    await expect(saveIntakeStep(userId, intakeId, {
      expectedIntakeVersion: 1,
      category: 'LOCATION',
      answers: [
        { questionId: locationModeQuestionId, value: otherOptionId },
        { questionId: registeredLocationQuestionId, value: '' },
        { questionId: otherLocationCityQuestionId, value: '' },
      ],
    })).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
      issues: [{ questionId: otherLocationCityQuestionId, message: 'Vul een plaats of regio in.' }],
    })
  })

  it('slaat meerdere locaties op zonder locatie-ID of vrije locatielijst', async () => {
    mocks.questionFindMany.mockResolvedValue([locationModeQuestion, registeredLocationQuestion, otherLocationCityQuestion])

    await expect(saveIntakeStep(userId, intakeId, {
      expectedIntakeVersion: 1,
      category: 'LOCATION',
      answers: [
        { questionId: locationModeQuestionId, value: multipleOptionId },
        { questionId: registeredLocationQuestionId, value: '' },
        { questionId: otherLocationCityQuestionId, value: '' },
      ],
    })).resolves.toMatchObject({ changedAnswers: 1 })
  })

  it.each([
    ['volledig op afstand', remoteOptionId],
    ['een onbekende locatie', unknownLocationOptionId],
  ])('slaat %s op zonder fysieke locatiegegevens', async (_label, modeOptionId) => {
    mocks.questionFindMany.mockResolvedValue([locationModeQuestion, registeredLocationQuestion, otherLocationCityQuestion])

    await expect(saveIntakeStep(userId, intakeId, {
      expectedIntakeVersion: 1,
      category: 'LOCATION',
      answers: [
        { questionId: locationModeQuestionId, value: modeOptionId },
        { questionId: registeredLocationQuestionId, value: '' },
        { questionId: otherLocationCityQuestionId, value: '' },
      ],
    })).resolves.toMatchObject({ changedAnswers: 1 })
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
