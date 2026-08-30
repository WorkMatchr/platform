import { describe, expect, it, vi } from 'vitest'
import { compatibilityContextGoals } from './context-goal-catalog'
import { formulateContextQuestion, type ContextQuestionFormulationInput } from './context-question-formulator'
import { planNextContextQuestion } from './context-question-engine'
import { assessContextQuestionGrounding } from './context-question-grounding'

const ruleId = '11111111-1111-4111-8111-111111111201'
const claimId = '11111111-1111-4111-8111-111111111101'
const cases = [
  ['LOCATION_PATTERN', 'Is bekend of de klachten verschillen tussen werkplekken?'],
  ['EXISTING_MEASUREMENTS', 'Zijn er relevante metingen beschikbaar, en zo ja welke?'],
  ['EXPOSURE_SOURCE', 'Is bekend bij welke werkzaamheden de signalen optreden?'],
  ['EXISTING_MEASURES', 'Zijn er al maatregelen genomen, en zo ja welke?'],
] as const

function fixture(code: string): ContextQuestionFormulationInput {
  return {
    originalInput: 'Er zijn signalen op het werk. De oorzaak is onbekend.',
    facts: [{ code: 'WORK_SIGNAL', value: 'signalen op het werk', status: 'EXPLICIT_INPUT', confidence: 1 },
      { code: 'POSSIBLE_SOURCE', value: 'mogelijke oorzaak', status: 'HYPOTHESIS', confidence: 0.9 }],
    goal: { ...compatibilityContextGoals[0], code, questionKey: code, selectedContextRuleId: ruleId,
      ruleVersion: 4, variantKey: `TEST:${code}`, satisfiesFactCodes: [`CONTEXT_ANSWERED_${code}`],
      relevantConceptCodes: [], supportingKnowledgeIds: [claimId],
      applicability: { requiredFactCodes: ['WORK_SIGNAL'], requiredAnyFactCodes: [], excludedFactValues: [] },
      questionGeneration: { contractVersion: 2, informationNeed: 'Ontbrekende context onderzoeken.',
        runtimeQuestionInstructions: 'Vraag neutraal zonder aannames.', neutralFallbackQuestion: 'Welke context is nog relevant?' } },
    evidence: [{ knowledgeId: ruleId, source: 'PUBLISHED_ROUTING_RULE', topicCode: code, confidence: 1 },
      { knowledgeId: claimId, source: 'PUBLISHED_CLAIM', topicCode: code, confidence: 1 }],
  }
}

describe.each(cases)('%s target answer slot', (code, question) => {
  it('does not require or resolve the missing target, and keeps it out of evidence provenance', async () => {
    const input = fixture(code)
    const target = input.goal.satisfiesFactCodes[0]
    const before = JSON.stringify(input)
    const transport = vi.fn().mockResolvedValueOnce({ question, selectedContextRuleId: ruleId,
      variantKey: input.goal.variantKey, goalCode: code }).mockResolvedValueOnce({
      informationNeedPreserved: true, oneDutchQuestion: true, unsupportedPresuppositions: [],
      supportingFactCodes: ['WORK_SIGNAL', target], evidenceQuotes: ['signalen op het werk'],
    })
    const result = await formulateContextQuestion(input, { transport, authorizeExternalCall: async () => true })
    expect(result.provenance.status).toBe('VERIFIED')
    expect(result.provenance.factsSupportingQuestion).toEqual(['WORK_SIGNAL'])
    expect(JSON.stringify(input)).toBe(before)
    expect(transport.mock.calls[1][0].data).toMatchObject({ targetAnswerSlots: [target],
      applicabilityEvidence: [expect.objectContaining({ code: 'WORK_SIGNAL' })] })
    expect(transport.mock.calls[1][0].data).not.toHaveProperty('missingFactCodes')
    expect(assessContextQuestionGrounding({ ...input, concepts: [], formulation: result }).knowledgeGroundingApplicableToCase).toBe(true)
    expect(assessContextQuestionGrounding({ ...input, facts: [], concepts: [], formulation: result }).knowledgeGroundingApplicableToCase).toBe(false)
    const plan = (facts: ContextQuestionFormulationInput['facts']) => planNextContextQuestion({
      mode: 'DIRECT_REQUEST', facts, concepts: [], goals: [input.goal],
      evidenceByGoalCode: new Map([[input.goal.variantKey!, input.evidence]]),
      askedQuestionKeys: [], answeredQuestionKeys: [], questionBudgetRemaining: 5,
    })
    expect(plan(input.facts).selected?.goal.code).toBe(code)
    expect(plan([...input.facts, { code: target, value: 'Een antwoord', status: 'USER_CONFIRMED', confidence: 1 }]).selected).toBeNull()
  })

  it.each(['ASSUMED_EXISTENCE', 'ASSUMED_CAUSALITY', 'UNSUPPORTED_ENTITY'])('still rejects %s, even with a declared target', async (rejection) => {
    const input = fixture(code)
    const transport = vi.fn().mockResolvedValueOnce({ question, selectedContextRuleId: ruleId,
      variantKey: input.goal.variantKey, goalCode: code }).mockResolvedValueOnce({
      informationNeedPreserved: true, oneDutchQuestion: true, unsupportedPresuppositions: [rejection],
      supportingFactCodes: [input.goal.satisfiesFactCodes[0]], evidenceQuotes: [],
    })
    expect((await formulateContextQuestion(input, { transport, authorizeExternalCall: async () => true })).provenance.reasonCode)
      .toBe('QUESTION_VERIFICATION_REJECTED')
  })

  it.each(['CONTEXT_ANSWERED_OTHER_RULE', 'UNKNOWN_LOCATION', 'POSSIBLE_SOURCE'])('rejects undeclared/unknown/hypothesis evidence %s', async (unknownCode) => {
    const input = fixture(code)
    const transport = vi.fn().mockResolvedValueOnce({ question, selectedContextRuleId: ruleId,
      variantKey: input.goal.variantKey, goalCode: code }).mockResolvedValueOnce({
      informationNeedPreserved: true, oneDutchQuestion: true, unsupportedPresuppositions: [],
      supportingFactCodes: [unknownCode, input.goal.satisfiesFactCodes[0]], evidenceQuotes: [],
    })
    expect((await formulateContextQuestion(input, { transport, authorizeExternalCall: async () => true })).provenance.reasonCode)
      .toBe('QUESTION_VERIFICATION_REJECTED')
  })
})
