import { describe, expect, it } from 'vitest'
import { intakeQuestionnaireV2 } from './intake-questionnaire-v2'

describe('opdrachtintake vraagset versie 2', () => {
  it('heeft unieke, stabiele vraag- en optie-identifiers', () => {
    const questions = intakeQuestionnaireV2.questions
    const options = questions.flatMap((question) => question.options ?? [])
    expect(new Set(questions.map((question) => question.id)).size).toBe(questions.length)
    expect(new Set(questions.map((question) => question.key)).size).toBe(questions.length)
    expect(new Set(questions.map((question) => question.sortOrder)).size).toBe(questions.length)
    expect(new Set(options.map((option) => option.id)).size).toBe(options.length)
    expect(questions.every((question) => question.version === 2)).toBe(true)
  })

  it('bevat de acht gevraagde BHV-onderwerpen', () => {
    const keys = new Set(intakeQuestionnaireV2.questions.map((question) => question.key))
    for (const key of [
      'BHV_LOCATION_COUNT',
      'BHV_EMPLOYEE_COUNT',
      'BHV_SHIFT_PATTERN',
      'BHV_EVACUATION_SUPPORT',
      'BHV_EXISTING_STAFF',
      'BHV_EXISTING_DOCUMENTS',
      'BHV_SUPPORT_NEEDED',
      'BHV_LOCATION_CHARACTERISTICS',
    ]) expect(keys.has(key)).toBe(true)
  })

  it('houdt historische planning en locatiedetails technisch herkenbaar maar niet actief', () => {
    const byKey = new Map(intakeQuestionnaireV2.questions.map((question) => [question.key, question]))
    expect(byKey.get('REGISTERED_LOCATION')?.visibleWhen).toEqual({ questionKey: 'LOCATION_MODE', oneOf: ['REGISTERED'] })
    expect(byKey.get('MULTIPLE_LOCATION_DETAILS')?.active).toBe(true)
    expect(byKey.get('OTHER_LOCATION_DETAILS')?.active).toBe(false)
    expect(byKey.get('PREFERRED_START')?.active).toBe(false)
    expect(byKey.get('PREFERRED_START_DATE')?.active).toBe(false)
    expect(byKey.get('EXPECTED_ENGAGEMENT_SIZE')?.active).toBe(false)
    expect(byKey.get('GENERAL_SUPPORT_GOAL')?.active).toBe(false)
    expect(byKey.get('GENERAL_RELEVANT_CONTEXT')?.active).toBe(false)
  })

  it('houdt oude generieke vragen alleen historisch herkenbaar', () => {
    const keys = new Set(intakeQuestionnaireV2.questions.map((question) => question.key))
    expect(keys.has('GENERAL_SUPPORT_GOAL')).toBe(true)
    expect(keys.has('GENERAL_RELEVANT_CONTEXT')).toBe(true)
    expect(keys.has('HELP_REQUEST_TOPICS')).toBe(false)
    expect(keys.has('SITUATION_DESCRIPTION')).toBe(false)
  })
})
