import { describe, expect, it } from 'vitest'
import { compatibilityContextGoals } from './context-goal-catalog'
import { assessContextQuestionGrounding } from './context-question-grounding'
import type { ContextGoal, KnowledgeEvidence } from './context-question-engine-types'

const ruleId = '11111111-1111-4111-8111-111111111201'
const claimId = '11111111-1111-4111-8111-111111111101'
const goal: ContextGoal = {
  ...compatibilityContextGoals[0], selectedContextRuleId: ruleId, ruleVersion: 3,
  variantKey: 'PROCESS:MEASUREMENTS', relevantConceptCodes: ['PROCESS'],
  applicability: { requiredAllConceptCodes: ['PROCESS'], requiredFactCodes: [], requiredAnyFactCodes: [], excludedFactValues: [] },
}
const evidence: KnowledgeEvidence[] = [
  { knowledgeId: ruleId, source: 'PUBLISHED_ROUTING_RULE', topicCode: 'routing', confidence: 1 },
  { knowledgeId: claimId, source: 'PUBLISHED_CLAIM', topicCode: 'process', confidence: 1 },
]

describe('planning grounding is not question applicability', () => {
  it.each(['EPOXY', 'NOISE', 'HEAT', 'VIBRATION'])('does not prove a process question from %s', (code) => {
    expect(assessContextQuestionGrounding({ goal, facts: [], evidence,
      concepts: [{ code, confidence: 1, source: 'EXPLICIT_INPUT', supportingKnowledgeIds: [] }],
    })).toMatchObject({ knowledgeGroundingPresent: true, applicabilityResult: false, knowledgeGroundingApplicableToCase: false })
  })

  it('does not equate applicable planning with verified final wording', () => {
    expect(assessContextQuestionGrounding({ goal, facts: [], evidence,
      concepts: [{ code: 'PROCESS', confidence: 1, source: 'EXPLICIT_INPUT', supportingKnowledgeIds: [] }],
    })).toMatchObject({ knowledgeGroundingPresent: true, applicabilityResult: true,
      knowledgeGroundingApplicableToCase: false,
      supportingKnowledgeIds: [claimId],
      questionGenerationProvenance: { status: 'NOT_VERIFIED' },
    })
  })

  it('rejects evidence for another rule with the same goal code', () => {
    expect(assessContextQuestionGrounding({ goal: { ...goal, selectedContextRuleId: 'other-rule' }, facts: [], concepts: [], evidence }))
      .toMatchObject({ knowledgeGroundingPresent: false, knowledgeGroundingApplicableToCase: false })
  })

  it('does not treat a claim without the selected rule as complete grounding', () => {
    expect(assessContextQuestionGrounding({ goal, facts: [], concepts: [], evidence: evidence.slice(1) }))
      .toMatchObject({ knowledgeGroundingPresent: false })
  })
})
