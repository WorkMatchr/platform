import { describe, expect, it } from 'vitest'
import { IntakeServiceError } from './intake-errors'
import type { IntakeQuestionDefinition, StoredIntakeAnswer } from './intake-validation'
import { calculateIntakeProgress, normalizeIntakeAnswer } from './intake-validation'

const textQuestion: IntakeQuestionDefinition = {
  id: '00000000-0000-4000-8000-000000000001',
  key: 'HELP_REQUEST_DESCRIPTION',
  category: 'HELP_REQUEST',
  inputType: 'LONG_TEXT',
  isRequired: true,
  minLength: 20,
  maxLength: 100,
  minNumber: null,
  maxNumber: null,
  minSelections: null,
  maxSelections: null,
  options: [],
}

describe('dynamische intakevalidatie', () => {
  it('normaliseert vrije tekst volgens de gepubliceerde vraagmetadata', () => {
    const result = normalizeIntakeAnswer(textQuestion, '  Wij hebben ondersteuning nodig bij veilig werken.  ', {
      activeLocationIds: new Set(),
    })
    expect(result.textValue).toBe('Wij hebben ondersteuning nodig bij veilig werken.')
  })

  it('weigert te korte en uitvoerbare tekst', () => {
    expect(() => normalizeIntakeAnswer(textQuestion, 'te kort', { activeLocationIds: new Set() })).toThrow(
      IntakeServiceError,
    )
    expect(() =>
      normalizeIntakeAnswer(textQuestion, '<script>onveilige inhoud</script>', {
        activeLocationIds: new Set(),
      }),
    ).toThrow(IntakeServiceError)
  })

  it('accepteert uitsluitend een actieve locatie van de organisatie', () => {
    const locationQuestion = {
      ...textQuestion,
      key: 'PRIMARY_LOCATION',
      inputType: 'ORGANIZATION_LOCATION' as const,
      minLength: null,
      maxLength: null,
    }
    expect(
      normalizeIntakeAnswer(locationQuestion, 'location-1', {
        activeLocationIds: new Set(['location-1']),
      }).organizationLocationId,
    ).toBe('location-1')
    expect(() =>
      normalizeIntakeAnswer(locationQuestion, 'foreign-location', {
        activeLocationIds: new Set(['location-1']),
      }),
    ).toThrow(IntakeServiceError)
  })

  it('valideert getallen, booleans en datums typevast', () => {
    const numberQuestion = {
      ...textQuestion,
      key: 'AFFECTED_EMPLOYEE_COUNT',
      inputType: 'NUMBER' as const,
      minLength: null,
      maxLength: null,
      minNumber: 1,
      maxNumber: 100,
    }
    expect(normalizeIntakeAnswer(numberQuestion, '12', { activeLocationIds: new Set() }).numberValue).toBe('12')
    expect(() => normalizeIntakeAnswer(numberQuestion, '12,5', { activeLocationIds: new Set() })).toThrow(
      IntakeServiceError,
    )

    const booleanQuestion = {
      ...numberQuestion,
      key: 'BOOLEAN_EXAMPLE',
      inputType: 'BOOLEAN' as const,
      minNumber: null,
      maxNumber: null,
    }
    expect(normalizeIntakeAnswer(booleanQuestion, false, { activeLocationIds: new Set() }).booleanValue).toBe(false)
    expect(() => normalizeIntakeAnswer(booleanQuestion, 'false', { activeLocationIds: new Set() })).toThrow(
      IntakeServiceError,
    )

    const dateQuestion = { ...booleanQuestion, key: 'PREFERRED_START_DATE', inputType: 'DATE' as const }
    expect(
      normalizeIntakeAnswer(dateQuestion, '2026-07-14', {
        activeLocationIds: new Set(),
        today: new Date('2026-07-13T00:00:00.000Z'),
      }).dateValue,
    ).toEqual(new Date('2026-07-14T00:00:00.000Z'))
    expect(() =>
      normalizeIntakeAnswer(dateQuestion, '2026-07-12', {
        activeLocationIds: new Set(),
        today: new Date('2026-07-13T00:00:00.000Z'),
      }),
    ).toThrow(IntakeServiceError)
  })

  it('weigert onbekende en exclusief gecombineerde keuzeopties', () => {
    const optionQuestion = {
      ...textQuestion,
      key: 'HELP_REQUEST_TOPICS',
      inputType: 'MULTI_SELECT' as const,
      minLength: null,
      maxLength: null,
      minSelections: 1,
      maxSelections: 3,
      options: [
        { id: 'option-1', value: 'SAFETY', isActive: true, isExclusive: false },
        { id: 'option-2', value: 'NOT_SURE', isActive: true, isExclusive: true },
      ],
    }
    expect(
      normalizeIntakeAnswer(optionQuestion, ['option-1'], { activeLocationIds: new Set() }).optionIds,
    ).toEqual(['option-1'])
    expect(() =>
      normalizeIntakeAnswer(optionQuestion, ['option-1', 'option-2'], { activeLocationIds: new Set() }),
    ).toThrow(IntakeServiceError)
    expect(() =>
      normalizeIntakeAnswer(optionQuestion, ['foreign-option'], { activeLocationIds: new Set() }),
    ).toThrow(IntakeServiceError)
  })
})

describe('intakevolledigheid', () => {
  const questions = [
    { id: 'q-help', key: 'HELP_REQUEST_DESCRIPTION', category: 'HELP_REQUEST' as const, isRequired: true },
    { id: 'q-mode', key: 'PREFERRED_WORK_MODE', category: 'WORK_MODE' as const, isRequired: true },
    { id: 'q-location', key: 'PRIMARY_LOCATION', category: 'LOCATION' as const, isRequired: false },
  ]

  const scalarAnswer = (questionId: string): StoredIntakeAnswer => ({
    questionId,
    textValue: 'ingevuld',
    numberValue: null,
    booleanValue: null,
    dateValue: null,
    organizationLocationId: null,
    options: [],
  })

  it('vereist een locatie bij werken op locatie', () => {
    const answers = [
      scalarAnswer('q-help'),
      {
        ...scalarAnswer('q-mode'),
        textValue: null,
        options: [{ option: { value: 'ON_SITE' } }],
      },
    ]
    expect(calculateIntakeProgress(questions, answers).missingQuestionKeys).toEqual(['PRIMARY_LOCATION'])
    expect(calculateIntakeProgress(questions, answers).nextIncompleteCategory).toBe('LOCATION')
  })

  it('maakt de locatie optioneel bij volledig werken op afstand', () => {
    const answers = [
      scalarAnswer('q-help'),
      {
        ...scalarAnswer('q-mode'),
        textValue: null,
        options: [{ option: { value: 'REMOTE' } }],
      },
    ]
    expect(calculateIntakeProgress(questions, answers).isComplete).toBe(true)
  })

  it('vereist BHV-vragen alleen na bevestiging van de BHV-categorie', () => {
    const conditionalQuestions = [
      { id: 'q-category', key: 'CONFIRMED_HELP_CATEGORY', category: 'HELP_REQUEST' as const, isRequired: true },
      { id: 'q-bhv-locations', key: 'BHV_LOCATION_COUNT', category: 'SITUATION' as const, isRequired: true },
    ]
    const categoryAnswer = {
      ...scalarAnswer('q-category'),
      textValue: null,
      options: [{ option: { value: 'BHV' } }],
    }
    expect(calculateIntakeProgress(conditionalQuestions, [categoryAnswer]).missingQuestionKeys).toEqual(['BHV_LOCATION_COUNT'])

    const fallbackAnswer = {
      ...categoryAnswer,
      options: [{ option: { value: 'RIE' } }],
    }
    expect(calculateIntakeProgress(conditionalQuestions, [fallbackAnswer]).isComplete).toBe(true)
  })

  it('gebruikt voor een volledig ingevulde BHV-intake dezelfde zichtbare verplichte vragen', () => {
    const requiredBhvKeys = [
      'BHV_LOCATION_COUNT',
      'BHV_EMPLOYEE_COUNT',
      'BHV_SHIFT_PATTERN',
      'BHV_EVACUATION_SUPPORT',
      'BHV_EXISTING_STAFF',
      'BHV_SUPPORT_NEEDED',
    ]
    const questions = [
      { id: 'q-category', key: 'CONFIRMED_HELP_CATEGORY', category: 'HELP_REQUEST' as const, isRequired: true },
      ...requiredBhvKeys.map((key, index) => ({
        id: `q-bhv-${index}`,
        key,
        category: 'SITUATION' as const,
        isRequired: true,
      })),
    ]
    const answers = [
      {
        ...scalarAnswer('q-category'),
        textValue: null,
        options: [{ option: { value: 'BHV' } }],
      },
      ...requiredBhvKeys.map((_key, index) => scalarAnswer(`q-bhv-${index}`)),
    ]

    expect(calculateIntakeProgress(questions, answers, 2)).toMatchObject({
      isComplete: true,
      missingQuestionKeys: [],
      answeredQuestionCount: 7,
      totalQuestionCount: 7,
    })
  })

  it('vereist alleen de locatievelden van de gekozen locatievorm', () => {
    const locationQuestions = [
      { id: 'q-location-mode', key: 'LOCATION_MODE', category: 'LOCATION' as const, isRequired: true },
      { id: 'q-registered', key: 'REGISTERED_LOCATION', category: 'LOCATION' as const, isRequired: true },
      { id: 'q-other-city', key: 'OTHER_LOCATION_CITY', category: 'LOCATION' as const, isRequired: true },
    ]
    const modeAnswer = {
      ...scalarAnswer('q-location-mode'),
      textValue: null,
      options: [{ option: { value: 'OTHER' } }],
    }
    expect(calculateIntakeProgress(locationQuestions, [modeAnswer]).missingQuestionKeys).toEqual(['OTHER_LOCATION_CITY'])
  })

  it.each(['REMOTE', 'UNKNOWN'])('blokkeert locatievorm %s niet met fysieke locatievelden', (mode) => {
    const locationQuestions = [
      { id: 'q-location-mode', key: 'LOCATION_MODE', category: 'LOCATION' as const, isRequired: true },
      { id: 'q-registered', key: 'REGISTERED_LOCATION', category: 'LOCATION' as const, isRequired: true },
      { id: 'q-other-city', key: 'OTHER_LOCATION_CITY', category: 'LOCATION' as const, isRequired: true },
      { id: 'q-multiple', key: 'MULTIPLE_LOCATION_DETAILS', category: 'LOCATION' as const, isRequired: true },
    ]
    const answers = [{
      ...scalarAnswer('q-location-mode'),
      textValue: null,
      options: [{ option: { value: mode } }],
    }]

    expect(calculateIntakeProgress(locationQuestions, answers)).toMatchObject({
      isComplete: true,
      missingQuestionKeys: [],
      totalQuestionCount: 1,
    })
  })

  it('vereist en accepteert de locatielijst bij locatievorm MULTIPLE', () => {
    const questions = [
      { id: 'q-location-mode', key: 'LOCATION_MODE', category: 'LOCATION' as const, isRequired: true },
      { id: 'q-multiple', key: 'MULTIPLE_LOCATION_DETAILS', category: 'LOCATION' as const, isRequired: true },
    ]
    const mode = { ...scalarAnswer('q-location-mode'), textValue: null, options: [{ option: { value: 'MULTIPLE' } }] }
    expect(calculateIntakeProgress(questions, [mode]).missingQuestionKeys).toEqual(['MULTIPLE_LOCATION_DETAILS'])
    expect(calculateIntakeProgress(questions, [mode, { ...scalarAnswer('q-multiple'), textValue: 'Utrecht\nZwolle' }]).isComplete).toBe(true)
  })

  it('negeert een oude locatie-ID nadat een andere locatievorm is gekozen', () => {
    const locationQuestions = [
      { id: 'q-location-mode', key: 'LOCATION_MODE', category: 'LOCATION' as const, isRequired: true },
      { id: 'q-registered', key: 'REGISTERED_LOCATION', category: 'LOCATION' as const, isRequired: true },
      { id: 'q-other-city', key: 'OTHER_LOCATION_CITY', category: 'LOCATION' as const, isRequired: true },
    ]
    const answers = [
      {
        ...scalarAnswer('q-location-mode'),
        textValue: null,
        options: [{ option: { value: 'OTHER' } }],
      },
      {
        ...scalarAnswer('q-registered'),
        textValue: null,
        organizationLocationId: 'oude-locatie-id',
      },
      scalarAnswer('q-other-city'),
    ]

    expect(calculateIntakeProgress(locationQuestions, answers)).toMatchObject({
      isComplete: true,
      answeredQuestionCount: 2,
      totalQuestionCount: 2,
    })
  })

  it('laat de gedeactiveerde doelvraag en optionele opmerkingen buiten de voortgang', () => {
    const questions = [
      { id: 'q-category', key: 'CONFIRMED_HELP_CATEGORY', category: 'HELP_REQUEST' as const, isRequired: true },
      { id: 'q-goal', key: 'GENERAL_SUPPORT_GOAL', category: 'SITUATION' as const, isRequired: true },
      { id: 'q-notes', key: 'ADDITIONAL_NOTES', category: 'CONSTRAINTS' as const, isRequired: false },
    ]
    const answers = [{
      ...scalarAnswer('q-category'),
      textValue: null,
      options: [{ option: { value: 'MACHINERY_SAFETY' } }],
    }]

    expect(calculateIntakeProgress(questions, answers, 2)).toMatchObject({
      isComplete: true,
      answeredQuestionCount: 1,
      totalQuestionCount: 1,
    })
  })

  it('laat historische planning buiten volledigheid en voortgang van versie 2', () => {
    const planningQuestions = [
      { id: 'q-start', key: 'PREFERRED_START', category: 'PLANNING' as const, isRequired: true },
      { id: 'q-date', key: 'PREFERRED_START_DATE', category: 'PLANNING' as const, isRequired: true },
      { id: 'q-size', key: 'EXPECTED_ENGAGEMENT_SIZE', category: 'PLANNING' as const, isRequired: true },
    ]
    const startAnswer = {
      ...scalarAnswer('q-start'),
      textValue: null,
      options: [{ option: { value: 'SPECIFIC_DATE' } }],
    }
    expect(calculateIntakeProgress(planningQuestions, [startAnswer])).toMatchObject({
      isComplete: true,
      missingQuestionKeys: [],
      answeredQuestionCount: 0,
      totalQuestionCount: 0,
    })
  })

  it('laat optionele zichtbare antwoorden buiten de verplichte voortgangsteller', () => {
    const progress = calculateIntakeProgress([
      { id: 'q-required', key: 'HELP_REQUEST_DESCRIPTION', category: 'HELP_REQUEST' as const, isRequired: true },
      { id: 'q-optional', key: 'ADDITIONAL_NOTES', category: 'CONSTRAINTS' as const, isRequired: false },
    ], [scalarAnswer('q-required')])
    expect(progress).toMatchObject({ isComplete: true, answeredQuestionCount: 1, totalQuestionCount: 1 })
  })
})
