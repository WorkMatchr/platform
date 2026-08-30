import { contextGoalApplies } from './context-goal-applicability'
import { createHash } from 'node:crypto'
import type { ContextQuestionGenerationProvenance } from './context-question-generation-contract'
import type { ContextGoal, ExtractedFact, KnowledgeConceptCandidate, KnowledgeEvidence } from './context-question-engine-types'

/** A planning verdict is deliberately not a verdict about the final wording. */
export function assessContextQuestionGrounding(input: {
  goal: ContextGoal
  facts: readonly ExtractedFact[]
  concepts: readonly KnowledgeConceptCandidate[]
  evidence: readonly KnowledgeEvidence[]
  formulation?: Readonly<{ text: string; provenance: ContextQuestionGenerationProvenance }>
}) {
  const ruleId = input.goal.selectedContextRuleId
  const rulePresent = Boolean(ruleId && input.evidence.some((item) =>
    item.source === 'PUBLISHED_ROUTING_RULE' && item.knowledgeId === ruleId))
  const supportingKnowledgeIds = [...new Set(input.evidence
    .filter((item) => item.source === 'PUBLISHED_CLAIM')
    .map((item) => item.knowledgeId))]
  const knowledgeGroundingPresent = rulePresent && supportingKnowledgeIds.length > 0
  const applicabilityResult = contextGoalApplies(input)
  const formulation = input.formulation
  const questionVerified = Boolean(formulation
    && formulation.provenance.status === 'VERIFIED'
    && formulation.provenance.questionDigest === createHash('sha256').update(formulation.text).digest('hex')
    && formulation.provenance.unsupportedPresuppositions?.length === 0)
  const allRequiredClaimsPresent = Boolean(input.goal.supportingKnowledgeIds?.length
    && input.goal.supportingKnowledgeIds.every((id) => supportingKnowledgeIds.includes(id)))
  return Object.freeze({
    knowledgeGroundingPresent,
    applicabilityResult,
    supportingKnowledgeIds: Object.freeze(supportingKnowledgeIds),
    // Neither a valid rule nor a model's self-assessment proves that the
    // eventual free-text question is free of unsupported presuppositions.
    // Only the question-generation/validation boundary may establish that.
    knowledgeGroundingApplicableToCase: Boolean(knowledgeGroundingPresent && applicabilityResult
      && input.goal.questionGeneration && allRequiredClaimsPresent && questionVerified),
    questionGenerationProvenance: formulation?.provenance ?? Object.freeze({
      status: 'NOT_VERIFIED' as const,
      reasonCode: 'FINAL_QUESTION_PRESUPPOSITIONS_NOT_VERIFIED' as const,
    }),
  })
}
