import { describe, expect, it } from 'vitest'
import { isRegisteredPublicHref } from '@/content/public-routes'
import { buildGuidedIntakeResult, GuidedIntakeValidationError } from './guided-intake-engine'
import { deriveGuidedFacts } from './guided-intake-facts'
import { validateGuidedAnswer } from './guided-intake-flow'
import {
  guidedIntakeQuestions,
  MAX_DECISION_MOMENTS,
  unavailableStartingSituations,
} from './guided-intake-questions'
import type { GuidedAnswers } from './guided-intake-types'

const completeAnswers: GuidedAnswers = {
  START_SITUATION: 'HAS_EMPLOYEES',
  EMPLOYEE_COUNT: 'TWO_TO_TWENTY_FIVE',
  RIE_STATUS: 'NONE',
  DECISION_GOAL: 'PRACTICAL_SUPPORT',
  DESIRED_TIMING: 'ORIENTING',
}

describe('Guided Intake Engine v1', () => {
  it('begrenst de werkgeversflow tot vijf unieke beslismomenten', () => {
    expect(MAX_DECISION_MOMENTS).toBe(5)
    expect(guidedIntakeQuestions).toHaveLength(MAX_DECISION_MOMENTS)
    expect(new Set(guidedIntakeQuestions.map((question) => question.id))).toHaveLength(MAX_DECISION_MOMENTS)
    expect(new Set(guidedIntakeQuestions.map((question) => question.title))).toHaveLength(MAX_DECISION_MOMENTS)
    expect(new Set(guidedIntakeQuestions.map((question) => question.factKey))).toHaveLength(MAX_DECISION_MOMENTS)
    expect(guidedIntakeQuestions.every((question) => question.decisionPurpose.length > 20)).toBe(true)
  })

  it('presenteert uitsluitend de personeelsroute als werkend startpunt', () => {
    expect(guidedIntakeQuestions[0].options.map((option) => option.value)).toEqual(['HAS_EMPLOYEES'])
    expect(unavailableStartingSituations).toHaveLength(5)
    expect(unavailableStartingSituations.every((situation) => situation.length > 0)).toBe(true)
  })

  it('behandelt de datum alleen als conditionele precisering van de termijnvraag', () => {
    const timing = guidedIntakeQuestions.find((question) => question.id === 'DESIRED_TIMING')!
    expect(timing.id).toBe('DESIRED_TIMING')
    expect('dateRefinement' in timing && timing.dateRefinement.when).toBe('SPECIFIC_DATE')
    expect(validateGuidedAnswer('DESIRED_TIMING', { DESIRED_TIMING: 'ORIENTING' }, '2026-07-19')).toBeNull()
    expect(validateGuidedAnswer('DESIRED_TIMING', { DESIRED_TIMING: 'SPECIFIC_DATE' }, '2026-07-19')).toBe('Vul de gewenste datum in.')
    expect(validateGuidedAnswer('DESIRED_TIMING', { DESIRED_TIMING: 'SPECIFIC_DATE', desiredDate: '2026-07-18' }, '2026-07-19')).toBe('Kies vandaag of een datum in de toekomst.')
    expect(validateGuidedAnswer('DESIRED_TIMING', { DESIRED_TIMING: 'SPECIFIC_DATE', desiredDate: '2026-08-01' }, '2026-07-19')).toBeNull()
  })

  it('leidt ieder antwoord herleidbaar af tot een feit', () => {
    const facts = deriveGuidedFacts({ ...completeAnswers, DESIRED_TIMING: 'SPECIFIC_DATE', desiredDate: '2026-08-01' })
    expect(facts).toHaveLength(6)
    expect(facts.every((fact) => guidedIntakeQuestions.some((question) => question.id === fact.sourceQuestionId))).toBe(true)
    expect(facts.find((fact) => fact.key === 'DESIRED_DATE')?.sourceQuestionId).toBe('DESIRED_TIMING')
  })

  it('geeft bij een ontbrekende RI&E eerst inhoudelijk advies en daarna pas dienstverlening', () => {
    const result = buildGuidedIntakeResult(completeAnswers, '2026-07-19')
    expect(result.recommendation.id).toBe('create-rie')
    expect(result.recommendation.title).toContain('RI&E')
    expect(result.recommendation.reasons.length).toBeGreaterThan(0)
    expect(result.recommendation.nextActions.length).toBeGreaterThan(0)
    expect(result.recommendation.knowledgeLinks.length).toBeGreaterThan(0)
    expect(result.recommendation.serviceLinks.length).toBeGreaterThan(0)
  })

  it.each([
    ['UNKNOWN', 'verify-rie-status'],
    ['OUTDATED', 'update-rie'],
    ['CURRENT', 'use-current-rie'],
  ] as const)('past de centrale regel voor RI&E-status %s toe', (status, expectedRule) => {
    const result = buildGuidedIntakeResult({ ...completeAnswers, RIE_STATUS: status }, '2026-07-19')
    expect(result.recommendation.id).toBe(expectedRule)
  })

  it('verwijst uitsluitend naar geregistreerde publieke routes', () => {
    const result = buildGuidedIntakeResult(completeAnswers, '2026-07-19')
    const links = [...result.recommendation.knowledgeLinks, ...result.recommendation.serviceLinks]
    expect(links.every((link) => isRegisteredPublicHref(link.href))).toBe(true)
  })

  it('weigert een onvolledige flow veilig', () => {
    expect(() => buildGuidedIntakeResult({ START_SITUATION: 'HAS_EMPLOYEES' }, '2026-07-19')).toThrow(GuidedIntakeValidationError)
  })
})
