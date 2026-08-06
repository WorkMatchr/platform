import { describe, expect, it } from 'vitest'
import {
  evaluateIntakeAssignmentReadiness,
  type IntakeAssignmentReadinessInput,
} from './intake-assignment-readiness'

function input(
  overrides: Partial<IntakeAssignmentReadinessInput> = {},
): IntakeAssignmentReadinessInput {
  return {
    intakeId: '00000000-0000-4000-8000-000000000001',
    questionnaireVersion: 2,
    missingQuestionKeys: [],
    questions: [
      {
        id: '00000000-0000-4000-8000-000000000101',
        key: 'LOCATION_MODE',
        category: 'LOCATION',
        label: 'Waar vindt de ondersteuning plaats?',
        selectedOptionValues: ['REMOTE'],
        organizationLocationId: null,
      },
      {
        id: '00000000-0000-4000-8000-000000000102',
        key: 'BHV_EMPLOYEE_COUNT',
        category: 'SITUATION',
        label: 'Hoeveel medewerkers werken er ongeveer?',
        selectedOptionValues: [],
        organizationLocationId: null,
      },
    ],
    activeLocationIds: new Set(),
    ...overrides,
  }
}

describe('gedeelde intake-opdrachtreadiness', () => {
  it('laat een volledige BHV-intake met remote locatie publiceren', () => {
    expect(evaluateIntakeAssignmentReadiness(input())).toEqual({ isReady: true, issues: [] })
  })

  it('geeft een ontbrekend verplicht BHV-antwoord met concrete bewerklink terug', () => {
    const readiness = evaluateIntakeAssignmentReadiness(input({
      missingQuestionKeys: ['BHV_EMPLOYEE_COUNT'],
    }))

    expect(readiness).toEqual({
      isReady: false,
      issues: [{
        code: 'REQUIRED_ANSWER_MISSING',
        section: 'SITUATION',
        questionId: '00000000-0000-4000-8000-000000000102',
        questionKey: 'BHV_EMPLOYEE_COUNT',
        message: 'Hoeveel medewerkers werken er ongeveer?',
        editHref: '/hulpvragen/00000000-0000-4000-8000-000000000001/huidige-situatie?wijzig=1',
      }],
    })
  })

  it.each(['REMOTE', 'UNKNOWN'] as const)('laat locatievorm %s zonder aanvullende gegevens publiceren', (mode) => {
    const questions = input().questions.map((question) => question.key === 'LOCATION_MODE'
      ? { ...question, selectedOptionValues: [mode] }
      : question)
    expect(evaluateIntakeAssignmentReadiness(input({ questions }))).toEqual({ isReady: true, issues: [] })
  })

  it('vereist minimaal twee plaatsen of regio’s voor locatievorm MULTIPLE', () => {
    const questions = input().questions.map((question) => question.key === 'LOCATION_MODE'
      ? { ...question, selectedOptionValues: ['MULTIPLE'] }
      : question)
    expect(evaluateIntakeAssignmentReadiness(input({ questions })).isReady).toBe(false)
  })

  it('vereist bij een andere locatie een plaats of regio', () => {
    const questions = [
      ...input().questions.map((question) => question.key === 'LOCATION_MODE'
        ? { ...question, selectedOptionValues: ['OTHER'] }
        : question),
      {
        id: '00000000-0000-4000-8000-000000000110',
        key: 'OTHER_LOCATION_CITY',
        category: 'LOCATION' as const,
        label: 'In welke plaats vindt de opdracht plaats?',
        selectedOptionValues: [],
        organizationLocationId: null,
        textValue: null,
      },
    ]
    expect(evaluateIntakeAssignmentReadiness(input({ questions })).issues[0]).toMatchObject({
      code: 'LOCATION_NOT_PUBLICABLE',
      questionKey: 'OTHER_LOCATION_CITY',
    })
  })

  it('laat optionele toelichtingen en de gedeactiveerde omvangvraag buiten readiness', () => {
    const readiness = evaluateIntakeAssignmentReadiness(input({
      questions: [
        ...input().questions,
        {
          id: '00000000-0000-4000-8000-000000000103',
          key: 'BHV_EVACUATION_SUPPORT_CONTEXT',
          category: 'SITUATION',
          label: 'Welke organisatorische ondersteuning kan nodig zijn?',
          selectedOptionValues: [],
          organizationLocationId: null,
        },
        {
          id: '00000000-0000-4000-8000-000000000104',
          key: 'ADDITIONAL_NOTES',
          category: 'CONSTRAINTS',
          label: 'Aanvullende opmerkingen',
          selectedOptionValues: [],
          organizationLocationId: null,
        },
        {
          id: '00000000-0000-4000-8000-000000000105',
          key: 'EXPECTED_ENGAGEMENT_SIZE',
          category: 'PLANNING',
          label: 'Hoe groot verwacht u dat de opdracht ongeveer is?',
          selectedOptionValues: [],
          organizationLocationId: null,
        },
      ],
    }))

    expect(readiness).toEqual({ isReady: true, issues: [] })
  })
})
