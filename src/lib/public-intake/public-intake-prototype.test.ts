import { describe, expect, it } from 'vitest'
import type { PublicIntakeAnswerView } from './public-intake-types'
import {
  getPublicIntakeAnswerLabel,
  getPublicIntakePrototypeQuestion,
  getRecognizableRequestInitialAnswer,
  publicIntakePrototypeQuestions,
  recognizableSituations,
} from './public-intake-prototype'

function answer(
  questionKey: string,
  value: string | number | null,
  disposition: 'ANSWERED' | 'UNKNOWN' | 'SKIPPED' = 'ANSWERED',
): PublicIntakeAnswerView {
  return {
    questionKey,
    questionVersion: 1,
    answerType:
      questionKey === 'sector'
        ? 'TEXT'
        : questionKey === 'location_count'
          ? 'NUMBER'
          : 'OPTION',
    disposition,
    source: 'USER_INPUT',
    version: 1,
    value,
  }
}

describe('publieke intakepresentatie', () => {
  it('biedt exact zeven herkenbare situaties en markeert alleen de RI&E-routes als actief', () => {
    expect(recognizableSituations).toHaveLength(7)
    expect(recognizableSituations.filter((situation) => situation.prototypeAvailable)).toHaveLength(3)
    expect(recognizableSituations.at(-1)?.label).toBe('Mijn situatie staat er niet tussen')
  })

  it('bevat voor iedere actieve beslisvraag één unieke presentatie', () => {
    expect(publicIntakePrototypeQuestions.map((question) => question.questionKey)).toEqual([
      'guidance_topic',
      'context_sector',
      'context_rie_status',
      'context_employee_count',
      'context_location_count',
      'context_preferred_start',
      'context_work_activity',
      'context_physical_load',
      'context_affected_scope',
      'context_existing_investigation',
      'context_urgency',
      'rie_has_employees',
      'incident_injury_occurred',
      'hazardous_substances_storage',
      'hazardous_substances_transport',
      'hazardous_substances_loading_unloading',
      'rie_existing_status',
      'employee_count_range',
      'rie_current_age',
      'rie_update_reason',
      'sector',
      'location_count',
      'preferred_start_period',
    ])
    expect(new Set(publicIntakePrototypeQuestions.map((question) => question.questionKey))).toHaveLength(
      publicIntakePrototypeQuestions.length,
    )
    expect(getPublicIntakePrototypeQuestion('location_count')?.inputKind).toBe('NUMBER')
    expect(getPublicIntakePrototypeQuestion('rie_has_employees')).toMatchObject({
      inputKind: 'OPTIONS',
      legend: 'Heeft u personeel?',
    })
  })

  it('leidt een herkenbare RI&E-ingang af zonder dezelfde vraag dubbel te stellen', () => {
    expect(getRecognizableRequestInitialAnswer('rie_needed')).toMatchObject({
      questionKey: 'rie_existing_status',
      disposition: 'ANSWERED',
      value: 'NONE',
    })
    expect(getRecognizableRequestInitialAnswer('rie_update')?.value).toBe('NEEDS_UPDATE')
    expect(getRecognizableRequestInitialAnswer('rie_uncertain')?.value).toBe(
      'COMPLIANCE_UNCERTAIN',
    )
    expect(getRecognizableRequestInitialAnswer('health_complaints')).toBeNull()
  })

  it('onderscheidt onbekend van bewust overslaan in de zichtbare antwoordhistorie', () => {
    expect(getPublicIntakeAnswerLabel(answer('employee_count_range', null, 'UNKNOWN'))).toBe(
      'Dat weet ik nu niet',
    )
    expect(getPublicIntakeAnswerLabel(answer('sector', null, 'SKIPPED'))).toBe('Nu niet')
    expect(getPublicIntakeAnswerLabel(answer('location_count', 3))).toBe('3')
  })
})
