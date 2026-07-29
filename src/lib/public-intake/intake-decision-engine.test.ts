import { describe, expect, it } from 'vitest'
import { decidePublicIntake } from './intake-decision-engine'
import { getPublicIntakeQuestion } from './public-intake-questions'
import type { PublicIntakeAnswerView } from './public-intake-types'

function answer(
  questionKey: string,
  value: string | number | null,
  disposition: 'ANSWERED' | 'UNKNOWN' | 'SKIPPED' = 'ANSWERED',
): PublicIntakeAnswerView {
  const definition = getPublicIntakeQuestion(questionKey)
  if (!definition) throw new Error(`Onbekende testvraag: ${questionKey}`)
  return {
    questionKey,
    questionVersion: definition.version,
    answerType: definition.answerType,
    disposition,
    source: 'USER_INPUT',
    version: 1,
    value,
  }
}

function decide(
  answers: PublicIntakeAnswerView[],
  selectedRequestKey: string | null = 'rie_needed',
) {
  return decidePublicIntake({
    entryPoint: selectedRequestKey ? 'RECOGNIZABLE_REQUEST' : 'FREE_TEXT',
    selectedRequestKey,
    answers,
    lifecycle: answers.length === 0 ? 'STARTED' : 'CLARIFYING',
  })
}

describe('Intake Decision Engine', () => {
  it('stuurt een nieuwe RI&E deterministisch naar organisatiecontext en start', () => {
    const answers = [answer('rie_existing_status', 'NONE')]
    expect(decide(answers).nextQuestionKey).toBe('employee_count_range')
    answers.push(answer('employee_count_range', 'ELEVEN_TO_FIFTY'))
    expect(decide(answers).nextQuestionKey).toBe('sector')
    answers.push(answer('sector', 'Bouw'))
    expect(decide(answers).nextQuestionKey).toBe('location_count')
    answers.push(answer('location_count', 2))
    expect(decide(answers).nextQuestionKey).toBe('preferred_start_period')
    answers.push(answer('preferred_start_period', 'SOON'))
    expect(decide(answers)).toMatchObject({
      nextQuestionKey: null,
      currentStep: 'SUMMARY',
      remainingQuestions: [],
      isReadyForSummary: true,
      missingRequiredInformation: [],
    })
  })

  it.each(['NEEDS_UPDATE', 'COMPLIANCE_UNCERTAIN'])(
    'stuurt de bestaande RI&E-tak %s via ouderdom en aanleiding',
    (status) => {
      const answers = [answer('rie_existing_status', status)]
      expect(decide(answers, status === 'NEEDS_UPDATE' ? 'rie_update' : 'rie_uncertain').nextQuestionKey).toBe(
        'rie_current_age',
      )
      answers.push(answer('rie_current_age', 'ONE_TO_THREE_YEARS'))
      expect(decide(answers).nextQuestionKey).toBe('rie_update_reason')
      answers.push(answer('rie_update_reason', 'PERIODIC_REVIEW'))
      expect(decide(answers).nextQuestionKey).toBe('sector')
      answers.push(answer('sector', 'Industrie'))
      expect(decide(answers).nextQuestionKey).toBe('preferred_start_period')
      answers.push(answer('preferred_start_period', 'ORIENTING'))
      expect(decide(answers).isReadyForSummary).toBe(true)
    },
  )

  it('houdt beide actieve RI&E-takken binnen vijf inhoudelijke beslismomenten', () => {
    const newRie = decide([answer('rie_existing_status', 'NONE')])
    const existingRie = decide([
      answer('rie_existing_status', 'NEEDS_UPDATE'),
    ], 'rie_update')

    expect(['rie_existing_status', ...newRie.remainingQuestions]).toHaveLength(5)
    expect(['rie_existing_status', ...existingRie.remainingQuestions]).toHaveLength(5)
    expect(new Set(newRie.remainingQuestions).size).toBe(newRie.remainingQuestions.length)
    expect(new Set(existingRie.remainingQuestions).size).toBe(
      existingRie.remainingQuestions.length,
    )
  })

  it('laat een onbekende sector doorstromen omdat deze niet noodzakelijk is', () => {
    const result = decide([
      answer('rie_existing_status', 'NONE'),
      answer('employee_count_range', 'ONE_TO_TEN'),
      answer('sector', null, 'UNKNOWN'),
    ])
    expect(result.nextQuestionKey).toBe('location_count')
    expect(result.missingRequiredInformation).toEqual(['location_count'])
  })

  it('stelt een noodzakelijke onbekende vestiging later opnieuw', () => {
    const answers = [
      answer('rie_existing_status', 'NONE'),
      answer('employee_count_range', null, 'UNKNOWN'),
      answer('sector', null, 'SKIPPED'),
      answer('location_count', null, 'UNKNOWN'),
    ]
    expect(decide(answers)).toMatchObject({
      nextQuestionKey: 'preferred_start_period',
      missingRequiredInformation: ['location_count'],
    })
    answers.push(answer('preferred_start_period', null, 'UNKNOWN'))
    expect(decide(answers)).toMatchObject({
      nextQuestionKey: 'location_count',
      remainingQuestions: ['location_count'],
      isReadyForSummary: false,
    })
  })

  it('laat een onbekende startperiode toe als optionele informatie', () => {
    const result = decide([
      answer('rie_existing_status', 'NONE'),
      answer('employee_count_range', 'FIFTY_ONE_TO_TWO_FIFTY'),
      answer('sector', 'Zakelijke dienstverlening'),
      answer('location_count', 1),
      answer('preferred_start_period', null, 'UNKNOWN'),
    ])
    expect(result.isReadyForSummary).toBe(true)
    expect(result.optionalQuestions).toEqual([])
  })

  it('stelt een noodzakelijke onbekende RI&E-status pas na de overige vragen opnieuw', () => {
    const answers = [
      answer('rie_existing_status', null, 'UNKNOWN'),
      answer('employee_count_range', 'ONE_TO_TEN'),
      answer('sector', 'Onderwijs'),
      answer('location_count', 1),
      answer('preferred_start_period', 'SOON'),
    ]
    expect(decide(answers, null)).toMatchObject({
      nextQuestionKey: 'rie_existing_status',
      missingRequiredInformation: ['rie_existing_status'],
      isReadyForSummary: false,
    })
  })

  it('geeft voor een nog niet ondersteunde ingang geen verborgen vragen vrij', () => {
    expect(decide([], 'health_complaints')).toEqual({
      nextQuestionKey: null,
      currentStep: 'LIMITED_ROUTE',
      remainingQuestions: [],
      isReadyForSummary: false,
      missingRequiredInformation: [],
      optionalQuestions: [],
    })
  })

  it('respecteert een reeds bereikte lifecyclefase', () => {
    expect(
      decidePublicIntake({
        entryPoint: 'FREE_TEXT',
        selectedRequestKey: null,
        answers: [],
        lifecycle: 'SUMMARY_PRESENTED',
      }),
    ).toMatchObject({
      nextQuestionKey: null,
      currentStep: 'SUMMARY',
      isReadyForSummary: true,
    })
  })

  it('levert voor alle vaste antwoordcombinaties steeds exact dezelfde beslissing', () => {
    const dispositions = ['ANSWERED', 'UNKNOWN', 'SKIPPED'] as const
    const scenarios = dispositions.flatMap((sectorDisposition) =>
      dispositions.map((startDisposition) => [
        answer('rie_existing_status', 'NONE'),
        answer('employee_count_range', null, 'UNKNOWN'),
        answer(
          'sector',
          sectorDisposition === 'ANSWERED' ? 'Bouw' : null,
          sectorDisposition,
        ),
        answer('location_count', 2),
        answer(
          'preferred_start_period',
          startDisposition === 'ANSWERED' ? 'SOON' : null,
          startDisposition,
        ),
      ]),
    )

    for (const scenario of scenarios) {
      const first = decide(scenario)
      expect(decide([...scenario])).toEqual(first)
      expect(decide([...scenario].reverse().reverse())).toEqual(first)
    }
  })
})
