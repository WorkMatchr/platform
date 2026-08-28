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

const round = (value: number) => Math.round(value * 10000) / 10000

function factCodes(facts: readonly ExtractedFact[]) {
  return new Set(facts.filter((fact) => fact.status !== 'HYPOTHESIS' && fact.status !== 'SUGGESTED_DIRECTION').map((fact) => fact.code))
}

function conceptsMatch(goal: ContextGoal, concepts: readonly KnowledgeConceptCandidate[]) {
  if (goal.relevantConceptCodes.length === 0) return true
  return concepts.some((concept) => goal.relevantConceptCodes.includes(concept.code))
}

function isGoalResolved(goal: ContextGoal, knownFacts: ReadonlySet<string>) {
  return goal.satisfiesFactCodes.some((code) => knownFacts.has(code))
}

function scoreGoal(input: {
  goal: ContextGoal
  evidence: readonly KnowledgeEvidence[]
  concepts: readonly KnowledgeConceptCandidate[]
  mode: IntakeMode
}): ContextGoalScore {
  const conceptConfidence = Math.max(0.5, ...input.concepts.filter((concept) => input.goal.relevantConceptCodes.includes(concept.code)).map((concept) => concept.confidence))
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
  hadGroundedCandidates: boolean
}): AssignmentReadiness {
  if (input.remainingBudget <= 0) return Object.freeze({ status: 'MAX_QUESTION_BUDGET_REACHED', reasonCode: 'QUESTION_BUDGET_EXHAUSTED' })
  if (!input.selected) return Object.freeze({ status: input.hadGroundedCandidates ? 'COMPLETE' : 'SAFE_FALLBACK', reasonCode: input.hadGroundedCandidates ? 'NO_UNRESOLVED_HIGH_VALUE_GOAL' : 'KNOWLEDGE_COVERAGE_INSUFFICIENT' })
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
  const unavailableQuestions = new Set([...input.answeredQuestionKeys, ...input.askedQuestionKeys])
  const unavailableGoalCodes = new Set<string>()
  for (const goal of input.goals) {
    if (unavailableQuestions.has(goal.questionKey) || isGoalResolved(goal, knownFacts)) {
      unavailableGoalCodes.add(goal.code)
      goal.equivalentGoalCodes.forEach((code) => unavailableGoalCodes.add(code))
    }
  }
  const candidates: ContextGoalCandidate[] = []
  let deduplicatedGoalCount = 0
  for (const goal of input.goals) {
    if (unavailableQuestions.has(goal.questionKey) || unavailableGoalCodes.has(goal.code) || isGoalResolved(goal, knownFacts)) {
      deduplicatedGoalCount += 1
      continue
    }
    const relevant = conceptsMatch(goal, input.concepts)
    if (!relevant) continue
    if (goal.code === 'PHYSICAL_LOAD' && !knownFacts.has('PHYSICAL_LOAD_RELEVANT')) continue
    if (goal.code === 'RIE_STATUS' && knownFacts.has('RIE_INTENT')) continue
    if (['ORGANIZATION_SIZE', 'WORKSITE_COUNT', 'START_WINDOW'].includes(goal.code) && !input.concepts.some((concept) => concept.code === 'RIE')) continue
    const evidence = input.evidenceByGoalCode.get(goal.code) ?? Object.freeze([])
    if (!goal.universal && evidence.length === 0) continue
    const skippedByFactCodes = goal.satisfiesFactCodes.filter((code) => knownFacts.has(code))
    candidates.push(Object.freeze({
      goal,
      applicability: Object.freeze({ applicable: true, reasonCode: goal.mandatory ? 'MANDATORY_CONTEXT' : relevant ? 'CONCEPT_RELEVANT' : 'UNIVERSAL_CONTEXT', evidence, skippedByFactCodes: Object.freeze(skippedByFactCodes) }),
      score: scoreGoal({ goal, evidence, concepts: input.concepts, mode: input.mode }),
    }))
  }
  candidates.sort((left, right) => right.score.total - left.score.total || left.goal.code.localeCompare(right.goal.code))
  const selected = input.questionBudgetRemaining > 0 ? candidates[0] ?? null : null
  return Object.freeze({
    engineVersion: KNOWLEDGE_GROUNDED_CONTEXT_ENGINE_VERSION,
    mode: input.mode,
    selected,
    candidates: Object.freeze(candidates),
    readiness: readiness({ selected, remainingBudget: input.questionBudgetRemaining, hadGroundedCandidates: candidates.some((candidate) => candidate.applicability.evidence.some((evidence) => evidence.source !== 'LEGACY_COMPATIBILITY')) }),
    deduplicatedGoalCount,
    questionBudgetRemaining: Math.max(0, input.questionBudgetRemaining),
  })
}
