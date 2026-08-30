import { isReliablePresentFact } from './context-goal-applicability'
import type { ContextGoal, ExtractedFact } from './context-question-engine-types'

/** A declared answer target is not evidence that its answer already exists. */
export function questionEvidenceContract(goal: ContextGoal, facts: readonly ExtractedFact[]) {
  const targetAnswerSlots = new Set(goal.satisfiesFactCodes)
  const applicabilityEvidence = facts.filter((fact) => isReliablePresentFact(fact) && !targetAnswerSlots.has(fact.code))
  return { targetAnswerSlots, applicabilityEvidence }
}

/** Only exact targets of the selected rule are separated; no prefix exemption. */
export function applicabilitySupportCodes(codes: readonly string[], targetAnswerSlots: ReadonlySet<string>) {
  return codes.filter((code) => !targetAnswerSlots.has(code))
}
