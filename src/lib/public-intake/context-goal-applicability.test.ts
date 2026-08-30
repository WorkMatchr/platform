import { describe, expect, it } from 'vitest'
import { contextGoalApplies } from './context-goal-applicability'
import { compatibilityContextGoals } from './context-goal-catalog'
import type { ContextGoal, ExtractedFact } from './context-question-engine-types'

const goal: ContextGoal = {
  ...compatibilityContextGoals[0], code: 'MEASUREMENTS', relevantConceptCodes: ['EXPOSURE'],
  applicability: {
    requiredAllConceptCodes: ['EXPOSURE', 'PROCESS'], requiredAnyConceptCodes: ['CHEMICAL', 'GAS'],
    requiredFactCodes: ['MEASUREMENTS', 'INCIDENT'], requiredAnyFactCodes: ['LOCATION', 'TIME'],
    excludedFactCodes: ['NOT_APPLICABLE'], excludedFactValues: [{ code: 'STATE', values: ['ABSENT', false] }],
  },
}
const fact = (code: string): ExtractedFact => ({ code, value: true, status: 'EXPLICIT_INPUT', confidence: 1 })
const facts = ['MEASUREMENTS', 'INCIDENT', 'LOCATION'].map(fact)
const check = (codes: string[], selectedFacts = facts, selectedGoal = goal) => contextGoalApplies({
  goal: selectedGoal, facts: selectedFacts,
  concepts: codes.map((code) => ({ code, confidence: 1, source: 'EXPLICIT_INPUT', supportingKnowledgeIds: [] })),
})

describe('declarative case applicability', () => {
  it('requires every AND group and at least one member of each OR group', () => {
    expect(check(['EXPOSURE', 'PROCESS', 'CHEMICAL'])).toBe(true)
    expect(check(['EXPOSURE', 'PROCESS', 'GAS'])).toBe(true)
    expect(check(['EXPOSURE', 'CHEMICAL'])).toBe(false)
    expect(check(['EXPOSURE', 'PROCESS'])).toBe(false)
    expect(check(['EXPOSURE', 'PROCESS', 'CHEMICAL'], facts.slice(0, 2))).toBe(false)
  })
  it.each(['EPOXY', 'NOISE', 'HEAT', 'VIBRATION'])('does not admit leakage context through broad EXPOSURE for %s', (domain) => {
    expect(check(['EXPOSURE', domain])).toBe(false)
  })
  it('requires actual contractor context, not process safety alone', () => {
    const contractor = { ...goal, applicability: { ...goal.applicability,
      requiredAllConceptCodes: ['PROCESS'], requiredAnyConceptCodes: [],
      requiredFactCodes: ['CONTRACTORS'], requiredAnyFactCodes: [],
    } }
    expect(check(['EXPOSURE', 'PROCESS'], [], contractor)).toBe(false)
    expect(check(['EXPOSURE', 'PROCESS'], [fact('CONTRACTORS')], contractor)).toBe(true)
  })
  it.each(['HYPOTHESIS', 'SUGGESTED_DIRECTION'] as const)('does not prove required context from %s', (status) => {
    expect(check(['EXPOSURE', 'PROCESS', 'CHEMICAL'], [
      ...facts.slice(1), { ...fact('MEASUREMENTS'), status, confidence: 0.6 },
    ])).toBe(false)
  })
  it('handles excluded codes, scalar values and array values', () => {
    const codes = ['EXPOSURE', 'PROCESS', 'CHEMICAL']
    expect(check(codes, [...facts, fact('NOT_APPLICABLE')])).toBe(false)
    expect(check(codes, [...facts, { ...fact('STATE'), value: false }])).toBe(false)
    expect(check(codes, [...facts, { ...fact('STATE'), value: ['ABSENT'] }])).toBe(false)
  })
  it.each([false, '', 'UNKNOWN', 'onbekend', []])('does not use unknown or negative values as affirmative evidence: %j', (value) => {
    expect(check(['EXPOSURE', 'PROCESS', 'CHEMICAL'], [...facts.slice(1), { ...fact('MEASUREMENTS'), value }])).toBe(false)
  })
})
