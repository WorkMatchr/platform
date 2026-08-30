import { describe, expect, it } from 'vitest'
import review from '../../../data/knowledge/review/case-understanding-10-scenario-review-v1.json'
import generationPackage from '../../../data/knowledge/review/context-question-generation-v2.json'
import { buildContextGoalV2Successors } from './context-goal-v2-publication'
import { contextGoalApplies } from '../public-intake/context-goal-applicability'
import { compatibilityContextGoals } from '../public-intake/context-goal-catalog'

const existingRules = review.scenarios.flatMap((scenario) => scenario.questionExamples.map((example) => ({
  code: `CASE_GOAL_${example.contextGoal}_S${scenario.number}`, ruleVersion: 2,
  outputSchema: {
    kind: 'CONTEXT_GOAL', scope: 'INTAKE_ROUTING_KNOWLEDGE', code: example.contextGoal,
    questionKey: `context_s${scenario.number}_${example.contextGoal.toLowerCase()}`, category: 'WORK',
    text: example.question, supportingKnowledgeIds: ['11111111-1111-4111-8111-111111111101'],
  },
})))

describe('additive context-goal successors', () => {
  it('behoudt alle voorgangers en scheidt voorbeelden van runtime-instructies', () => {
    const before = JSON.stringify(existingRules)
    const rules = buildContextGoalV2Successors({ review, generationPackage, existingRules })
    expect(rules).toHaveLength(existingRules.length)
    expect(JSON.stringify(existingRules)).toBe(before)
    for (const rule of rules) {
      expect(rule.ruleVersion).toBe(3)
      expect(rule.outputSchema).not.toHaveProperty('text')
      expect(rule.outputSchema.exampleQuestionForReview.length).toBeGreaterThan(10)
      expect(rule.outputSchema.runtimeQuestionInstructions).not.toMatch(/twaalf|lekkages|deze afdeling/)
      expect(rule.outputSchema.neutralFallbackQuestion).not.toMatch(/twaalf|lekkages|deze afdeling/)
    }
  })

  it('weigert ontbrekende voorgangers in plaats van gedeeltelijk te publiceren', () => {
    expect(() => buildContextGoalV2Successors({ review, generationPackage, existingRules: existingRules.slice(1) }))
      .toThrow('CONTEXT_GOAL_V2_PREDECESSOR_MISSING')
  })

  it('vereist aannemercontext ook wanneer procesveiligheid al bekend is', () => {
    const successor = buildContextGoalV2Successors({ review, generationPackage, existingRules })
      .find((rule) => rule.code === 'CASE_GOAL_CONTROL_COORDINATION_S9')!
    const goal = { ...compatibilityContextGoals[0], ...successor.outputSchema }
    const concept = (code: string) => ({ code, confidence: 1, source: 'EXPLICIT_INPUT' as const, supportingKnowledgeIds: [] })
    expect(contextGoalApplies({ goal: { ...compatibilityContextGoals[0], relevantConceptCodes: goal.relevantConceptCodes,
      applicability: goal.applicability }, facts: [], concepts: [concept('PROCESS_SAFETY_MAJOR_HAZARDS')] })).toBe(false)
    expect(contextGoalApplies({ goal: { ...compatibilityContextGoals[0], relevantConceptCodes: goal.relevantConceptCodes,
      applicability: goal.applicability }, facts: [], concepts: [concept('PROCESS_SAFETY_MAJOR_HAZARDS'), concept('CONTRACTOR_INTERFACE')] })).toBe(true)
  })

  it.each(['EXPOSURE_ASSESSMENT', 'NOISE', 'PHYSICAL_WORKLOAD'])('laat %s niet door een procesvariant heen', (code) => {
    const rule = buildContextGoalV2Successors({ review, generationPackage, existingRules })
      .find((item) => item.code === 'CASE_GOAL_EXISTING_MEASUREMENTS_S10')!
    expect(contextGoalApplies({ goal: { ...compatibilityContextGoals[0], relevantConceptCodes: rule.outputSchema.relevantConceptCodes,
      applicability: rule.outputSchema.applicability }, facts: [], concepts: [{ code, confidence: 1, source: 'EXPLICIT_INPUT', supportingKnowledgeIds: [] }] })).toBe(false)
  })
})
