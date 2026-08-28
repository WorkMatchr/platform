import { describe, expect, it } from 'vitest'
import {
  inferSharedSectorCode,
  resolveSharedAssignmentContext,
  type SharedSectorOption,
} from './shared-assignment-context'
import { selectSafeAIContextQuestions } from '@/lib/ai-intake-classifier/ai-context-question-planner'

const sectors: readonly SharedSectorOption[] = [
  { code: 'industrie', label: 'Industrie' },
  { code: 'logistiek', label: 'Logistiek' },
  { code: 'zorg', label: 'Zorg' },
  { code: 'onderwijs', label: 'Onderwijs' },
]

describe('Shared Assignment Context', () => {
  it.each([
    ['Wij zijn een metaalbewerkingsbedrijf.', 'industrie'],
    ['Bij ons transportbedrijf hebben 6 chauffeurs last van hun rug.', 'logistiek'],
    ['Onze zorginstelling heeft ondersteuning nodig.', 'zorg'],
    ['Onze school heeft een RI&E nodig.', 'onderwijs'],
  ])('koppelt een betrouwbare sectorvermelding aan de beheerde taxonomie', (input, expected) => {
    expect(inferSharedSectorCode(input, sectors)).toBe(expected)
  })

  it('verzint geen sector bij onvoldoende of conflicterende informatie', () => {
    expect(inferSharedSectorCode('6 medewerkers hebben last van hun rug.', sectors)).toBeNull()
    expect(inferSharedSectorCode('Een school en zorginstelling delen één locatie.', sectors)).toBeNull()
  })

  it('gebruikt een bevestigd sectorkeuze boven tekstinferentie', () => {
    const context = resolveSharedAssignmentContext({
      originalInput: 'Wij zijn een metaalbewerkingsbedrijf.',
      sectorOptions: sectors,
      answers: [{
        questionKey: 'context_sector', questionVersion: 1, answerType: 'OPTION',
        disposition: 'ANSWERED', source: 'AI_CONTEXT_PLANNER', version: 1, value: 'logistiek',
      }],
    })
    expect(context.sector).toMatchObject({ code: 'logistiek', label: 'Logistiek', source: 'USER_ANSWER' })
  })

  it.each([
    {
      input: 'Wij hebben een RI&E nodig voor ons bedrijf.',
      subject: 'RIE' as const,
      expected: ['context_sector', 'context_employee_count', 'context_location_count'],
    },
    {
      input: 'Wij hebben een RI&E nodig voor ons metaalbewerkingsbedrijf.',
      subject: 'RIE' as const,
      expected: ['context_employee_count', 'context_location_count', 'context_preferred_start'],
    },
    {
      input: '6 medewerkers hebben last van hun rug.',
      subject: 'OCCUPATIONAL_HEALTH' as const,
      expected: ['context_sector', 'context_work_activity', 'context_physical_load'],
    },
    {
      input: 'Bij ons transportbedrijf hebben 6 chauffeurs last van hun rug.',
      subject: 'OCCUPATIONAL_HEALTH' as const,
      expected: ['context_work_activity', 'context_physical_load', 'context_existing_investigation'],
    },
  ])('plant shared en domeincontext zonder bekende feiten opnieuw te vragen: $input', ({ input, subject, expected }) => {
    const knownSector = inferSharedSectorCode(input, sectors)
    const questions = selectSafeAIContextQuestions({
      originalInput: input,
      classification: {
        summary: input,
        primarySubject: subject,
        secondarySubjects: [],
        confidence: 'HIGH',
        alternatives: [],
      },
      answeredQuestionKeys: [],
      askedQuestionKeys: [],
      remainingQuestionBudget: 5,
      knownSharedContextQuestionKeys: knownSector ? ['context_sector'] : [],
    })
    expect(questions.map((question) => question.questionKey)).toEqual(expected)
    expect(questions).toHaveLength(Math.min(3, expected.length))
  })
})
