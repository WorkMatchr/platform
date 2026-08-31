import { describe, expect, it } from 'vitest'
import { extractNegativeAnswerFacts, isKnownAnswerFact } from './negative-answer-resolution'
import { extractPublicIntakeFacts } from './context-fact-extractor'
import { compatibilityContextGoals } from './context-goal-catalog'
import { planNextContextQuestion } from './context-question-engine'
import { contextGoalApplies, isReliablePresentFact } from './context-goal-applicability'
import type { ContextGoal, ExtractedFact } from './context-question-engine-types'
import type { PublicIntakeAnswerView } from './public-intake-types'

const answer = (value: string): PublicIntakeAnswerView => ({ questionKey: 'context_other_domain_question',
  questionVersion: 1, answerType: 'TEXT', disposition: 'ANSWERED', source: 'USER_INPUT', version: 1, value })
const goal = (code: string, extra: Partial<ContextGoal> = {}): ContextGoal => ({ ...compatibilityContextGoals[0],
  code, questionKey: `context_${code}`, mandatory: false, relevantConceptCodes: [],
  satisfiesFactCodes: [code], ...extra })
const plan = (goals: ContextGoal[], facts: readonly ExtractedFact[], answeredQuestionKeys: string[] = []) => planNextContextQuestion({
  goals, facts, answeredQuestionKeys, askedQuestionKeys: [], concepts: [], mode: 'DIRECT_REQUEST',
  evidenceByGoalCode: new Map(), questionBudgetRemaining: 5,
})

describe('negative context is an answer, not positive evidence', () => {
  it.each([
    ['geen metingen uitgevoerd', 'EXISTING_MEASUREMENTS'],
    ['geen onderzoek uitgevoerd', 'EXISTING_ASSESSMENT'],
    ['nog geen beoordeling gedaan', 'EXISTING_ASSESSMENT'],
    ['geen maatregelen genomen', 'EXISTING_MEASURES'],
    ['geen eerdere incidenten', 'PREVIOUS_INCIDENTS'],
    ['Metingen zijn nog niet uitgevoerd.', 'EXISTING_MEASUREMENTS'],
  ])('%s resolves %s and declared equivalent without proving presence', (text, code) => {
    const facts = extractNegativeAnswerFacts([answer(text)])
    expect(facts).toContainEqual(expect.objectContaining({ code, value: false, status: 'USER_CONFIRMED',
      sourceQuestionKey: answer(text).questionKey, resolution: 'CASE_WIDE_ABSENCE' }))
    expect(facts.every(isKnownAnswerFact)).toBe(true)
    expect(facts.some(isReliablePresentFact)).toBe(false)
    const g = goal(code, { equivalentGoalCodes: ['SAME_INFORMATION'] })
    expect(plan([g, goal('SAME_INFORMATION')], facts).selected).toBeNull()
    expect(plan([goal(code, { variantKey: `DOMAIN:${code}`, satisfiesFactCodes: [`CONTEXT_ANSWERED_DOMAIN_${code}`] })], facts).selected).toBeNull()
    expect(contextGoalApplies({ goal: goal('PRESUPPOSES_EXISTENCE', { applicability: {
      requiredFactCodes: [code], requiredAnyFactCodes: [], excludedFactValues: [],
    } }), facts, concepts: [] })).toBe(false)
  })

  it('reproduces the exact compound answer from a different goal', () => {
    const facts = extractPublicIntakeFacts({ originalInput: 'Een onderzoeksvraag.', answers: [answer(
      'We hebben hierover nog geen concrete gegevens. Er zijn nog geen metingen of onderzoek gedaan. We willen laten onderzoeken welke kenmerken van het werk en de werkomgeving relevant zijn, zonder vooraf een oorzaak aan te nemen.',
    )] })
    expect(facts.filter((fact) => fact.resolution).map((fact) => fact.code)).toEqual(['EXISTING_MEASUREMENTS', 'EXISTING_ASSESSMENT'])
    expect(plan([goal('EXISTING_ASSESSMENT'), goal('EXISTING_MEASUREMENTS')], facts).selected).toBeNull()
  })

  it.each(['Dat weet ik niet', 'UNKNOWN', 'onbekend', 'NOT_SURE', 'We weten niet of er onderzoek is gedaan'])('unknown %s remains unresolved', (value) => {
    const facts: ExtractedFact[] = [{ code: 'EXISTING_ASSESSMENT', value, status: 'USER_CONFIRMED', confidence: 1 }]
    expect(isKnownAnswerFact(facts[0])).toBe(false)
    expect(plan([goal('EXISTING_ASSESSMENT')], facts).selected?.goal.code).toBe('EXISTING_ASSESSMENT')
  })

  it.each(['HYPOTHESIS', 'SUGGESTED_DIRECTION'] as const)('%s does not resolve absence', (status) => {
    expect(plan([goal('EXISTING_MEASUREMENTS')], [{ code: 'EXISTING_MEASUREMENTS', value: false,
      resolution: 'CASE_WIDE_ABSENCE', status, confidence: 1 }]).selected).not.toBeNull()
  })

  it.each([
    'Misschien zijn er geen metingen uitgevoerd.',
    'Er zijn geen metingen in ruimte A uitgevoerd.',
    'Geen metingen van geluid uitgevoerd.',
    'Geen onderzoek gedaan?',
    'Volgens iemand zijn er geen maatregelen genomen.',
    'Geen metingen uitgevoerd, maar wel onderzoek gedaan.',
    '"Geen metingen uitgevoerd"',
  ])('does not broaden an ambiguous/scoped assertion: %s', (text) => {
    expect(extractNegativeAnswerFacts([answer(text)])).toEqual([])
  })

  it('conflicting answers do not silently resolve a goal', () => {
    expect(extractNegativeAnswerFacts([answer('Geen onderzoek gedaan.'), answer('Er is onderzoek gedaan.')])).toEqual([])
  })
  it('no measurements does not mean no assessment or measures', () => {
    const result = plan([goal('EXISTING_ASSESSMENT'), goal('EXISTING_MEASURES')], extractNegativeAnswerFacts([answer('Geen metingen gedaan.')]))
    expect(result.candidates).toHaveLength(2)
  })
  it('false resolves a direct fact slot, while an empty value does not', () => {
    expect(plan([goal('KNOWN')], [{ code: 'KNOWN', value: false, confidence: 1, status: 'USER_CONFIRMED' }]).selected).toBeNull()
    expect(plan([goal('KNOWN')], [{ code: 'KNOWN', value: '', confidence: 1, status: 'USER_CONFIRMED' }]).selected).not.toBeNull()
  })
  it('asking an unanswered/unknown question does not resolve its equivalents', () => {
    const g = goal('FIRST', { equivalentGoalCodes: ['SECOND'] })
    expect(plan([g, goal('SECOND')], [], [g.questionKey]).selected?.goal.code).toBe('SECOND')
  })
  it('a broad positive fact still does not resolve a domain variant', () => {
    expect(plan([goal('EXISTING_MEASUREMENTS', { satisfiesFactCodes: ['CONTEXT_ANSWERED_SPECIFIC'] })],
      [{ code: 'EXISTING_MEASUREMENTS', value: 'Er zijn metingen', status: 'USER_CONFIRMED', confidence: 1 }]).selected).not.toBeNull()
  })
})
