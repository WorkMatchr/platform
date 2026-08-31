import type {
  AssignmentReadiness,
  ContextGoal,
  ContextGoalCandidate,
  ContextGoalScore,
  ContextQuestionPlan,
  ExtractedFact,
  IntakeMode,
  KnowledgeConceptCandidate,
  KnowledgeEvidence,
} from './context-question-engine-types'
import { KNOWLEDGE_GROUNDED_CONTEXT_ENGINE_VERSION } from './context-question-engine-types'
import { contextGoalApplies, isDiscoverableConcept } from './context-goal-applicability'
import { isKnownAnswerFact } from './negative-answer-resolution'

const round = (value: number) => Math.round(value * 10000) / 10000
const MINIMUM_HIGH_VALUE_INFORMATION_GAIN = 0.4

function factCodes(facts: readonly ExtractedFact[]) {
  return new Set(facts.filter(isKnownAnswerFact).map((fact) => fact.code))
}

function hasValidKnowledgeGrounding(evidence: readonly KnowledgeEvidence[]) {
  return evidence.some((item) => item.source === 'PUBLISHED_ROUTING_RULE')
    && evidence.some((item) => item.source === 'PUBLISHED_CLAIM')
}

function goalIdentity(goal: ContextGoal) {
  return goal.variantKey ?? goal.code
}

function isGoalResolved(goal: ContextGoal, knownFacts: ReadonlySet<string>, absentFacts: ReadonlySet<string>) {
  return goal.satisfiesFactCodes.some((code) => knownFacts.has(code)) || absentFacts.has(goal.code)
}

function scoreGoal(input: {
  goal: ContextGoal
  evidence: readonly KnowledgeEvidence[]
  concepts: readonly KnowledgeConceptCandidate[]
  mode: IntakeMode
}): ContextGoalScore {
  // Ranking a candidate family does not establish applicability or causality.
  const rankingCodes = [...input.goal.relevantConceptCodes, ...(input.goal.discoveryConceptCodes ?? [])]
  const conceptConfidence = Math.max(0.5, ...input.concepts.filter((concept) => isDiscoverableConcept(concept) && rankingCodes.includes(concept.code)).map((concept) => concept.confidence))
  const evidenceConfidence = input.goal.universal ? 1 : Math.max(0, ...input.evidence.map((evidence) => evidence.confidence))
  const modeWeight = input.mode === 'DISCOVERY' && ['WORK_ACTIVITY', 'LOCATION_PATTERN', 'DURATION_FREQUENCY'].includes(input.goal.code) ? 1.1 : 1
  const relevance = Math.min(1, input.goal.baseRelevance * conceptConfidence * modeWeight)
  const total = input.goal.mandatory
    ? 100 + relevance
    : (relevance * input.goal.informationGain * input.goal.matchingValue * evidenceConfidence) / input.goal.userBurden
  return Object.freeze({
    relevance: round(relevance),
    informationGain: input.goal.informationGain,
    matchingValue: input.goal.matchingValue,
    evidenceConfidence: round(evidenceConfidence),
    userBurden: input.goal.userBurden,
    total: round(total),
  })
}

function readiness(input: {
  selected: ContextGoalCandidate | null
  remainingBudget: number
  hadApplicableContext: boolean
  knowledgeCoverageInsufficient: boolean
}): AssignmentReadiness {
  if (input.remainingBudget <= 0) return Object.freeze({ status: 'MAX_QUESTION_BUDGET_REACHED', reasonCode: 'QUESTION_BUDGET_EXHAUSTED' })
  if (!input.selected) return Object.freeze({
    status: input.knowledgeCoverageInsufficient && !input.hadApplicableContext ? 'SAFE_FALLBACK' : 'COMPLETE',
    reasonCode: input.knowledgeCoverageInsufficient && !input.hadApplicableContext
      ? 'KNOWLEDGE_COVERAGE_INSUFFICIENT'
      : 'NO_UNRESOLVED_HIGH_VALUE_GOAL',
  })
  if (input.selected.goal.mandatory) return Object.freeze({ status: 'NEEDS_ESSENTIAL_CONTEXT', reasonCode: 'MANDATORY_GOAL_MISSING' })
  return Object.freeze({ status: 'CAN_ASK_HIGH_VALUE_CONTEXT', reasonCode: 'HIGH_VALUE_GOAL_AVAILABLE' })
}

export function planNextContextQuestion(input: {
  mode: IntakeMode
  facts: readonly ExtractedFact[]
  concepts: readonly KnowledgeConceptCandidate[]
  goals: readonly ContextGoal[]
  evidenceByGoalCode: ReadonlyMap<string, readonly KnowledgeEvidence[]>
  answeredQuestionKeys: readonly string[]
  askedQuestionKeys: readonly string[]
  questionBudgetRemaining: number
}): ContextQuestionPlan {
  const knownFacts = factCodes(input.facts)
  const absentFacts = new Set(input.facts.filter((fact) => isKnownAnswerFact(fact)
    && fact.value === false && fact.resolution === 'CASE_WIDE_ABSENCE').map((fact) => fact.code))
  const unavailableQuestions = new Set([...input.answeredQuestionKeys, ...input.askedQuestionKeys])
  const unavailableGoalIdentities = new Set<string>()
  const unavailableEquivalentGoalCodes = new Set<string>()
  for (const goal of input.goals) {
    if (unavailableQuestions.has(goal.questionKey) || isGoalResolved(goal, knownFacts, absentFacts)) {
      unavailableGoalIdentities.add(goalIdentity(goal))
      if (isGoalResolved(goal, knownFacts, absentFacts)) goal.equivalentGoalCodes.forEach((code) => unavailableEquivalentGoalCodes.add(code))
    }
  }
  const candidates: ContextGoalCandidate[] = []
  let deduplicatedGoalCount = 0
  let hadApplicableContext = false
  let knowledgeCoverageInsufficient = false
  for (const goal of input.goals) {
    if (unavailableQuestions.has(goal.questionKey)
      || unavailableGoalIdentities.has(goalIdentity(goal))
      || unavailableEquivalentGoalCodes.has(goal.code)
      || isGoalResolved(goal, knownFacts, absentFacts)) {
      deduplicatedGoalCount += 1
      continue
    }
    const applicable = contextGoalApplies({ goal, concepts: input.concepts, facts: input.facts })
    if (!applicable) continue
    const evidence = input.evidenceByGoalCode.get(goalIdentity(goal)) ?? Object.freeze([])
    if (goal.groundingPolicy === 'DOMAIN_SPECIFIC' && !hasValidKnowledgeGrounding(evidence)) {
      knowledgeCoverageInsufficient = true
      continue
    }
    hadApplicableContext = true
    if (!goal.mandatory && goal.informationGain < MINIMUM_HIGH_VALUE_INFORMATION_GAIN) continue
    const skippedByFactCodes = goal.satisfiesFactCodes.filter((code) => knownFacts.has(code))
    candidates.push(Object.freeze({
      goal,
      applicability: Object.freeze({
        applicable: true,
        reasonCode: goal.mandatory
          ? 'MANDATORY_CONTEXT'
          : goal.groundingPolicy === 'DOMAIN_SPECIFIC'
            ? 'VALID_APPLICABILITY_AND_KNOWLEDGE_GROUNDING'
            : 'SAFE_SHARED_CONTEXT',
        evidence,
        skippedByFactCodes: Object.freeze(skippedByFactCodes),
      }),
      score: scoreGoal({ goal, evidence, concepts: input.concepts, mode: input.mode }),
    }))
  }
  const tier = (candidate: ContextGoalCandidate) => candidate.goal.mandatory ? 3
    : hasValidKnowledgeGrounding(candidate.applicability.evidence) ? 2
      : candidate.goal.groundingPolicy === 'SHARED_CONTEXT' ? 1 : 0
  candidates.sort((left, right) => tier(right) - tier(left)
    || right.score.total - left.score.total
    || goalIdentity(left.goal).localeCompare(goalIdentity(right.goal)))
  const selected = input.questionBudgetRemaining > 0 ? candidates[0] ?? null : null
  return Object.freeze({
    engineVersion: KNOWLEDGE_GROUNDED_CONTEXT_ENGINE_VERSION,
    mode: input.mode,
    selected,
    candidates: Object.freeze(candidates),
    readiness: readiness({ selected, remainingBudget: input.questionBudgetRemaining, hadApplicableContext, knowledgeCoverageInsufficient }),
    deduplicatedGoalCount,
    questionBudgetRemaining: Math.max(0, input.questionBudgetRemaining),
  })
}
