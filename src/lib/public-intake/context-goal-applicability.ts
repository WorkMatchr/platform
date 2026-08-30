import type { ContextGoal, ExtractedFact, KnowledgeConceptCandidate } from './context-question-engine-types'

/** Hypotheses, uncertainty and negative facts cannot prove a presupposition. */
export function isReliablePresentFact(fact: ExtractedFact): boolean {
  if (!['EXPLICIT_INPUT', 'RELIABLE_EXTRACTION', 'USER_CONFIRMED'].includes(fact.status)) return false
  if (fact.confidence < 0.8 || fact.value === false) return false
  const values = Array.isArray(fact.value) ? fact.value : [fact.value]
  return values.length > 0 && values.every((value) => typeof value !== 'string'
    || (value.trim().length > 0 && !/^(?:unknown|onbekend|niet bekend|dat weet ik niet|not_sure)$/i.test(value.trim())))
}

/** Every AND group must pass; alternatives are OR only inside their group. */
export function contextGoalApplies(input: {
  goal: ContextGoal
  concepts: readonly KnowledgeConceptCandidate[]
  facts: readonly ExtractedFact[]
}): boolean {
  const { goal } = input
  const concepts = new Set(input.concepts.filter((item) => item.confidence >= 0.8).map((item) => item.code))
  const facts = new Set(input.facts.filter(isReliablePresentFact).map((item) => item.code))
  const rule = goal.applicability
  if (goal.relevantConceptCodes.length && !goal.relevantConceptCodes.some((code) => concepts.has(code))) return false
  if (!(rule.requiredAllConceptCodes ?? []).every((code) => concepts.has(code))) return false
  if (rule.requiredAnyConceptCodes?.length && !rule.requiredAnyConceptCodes.some((code) => concepts.has(code))) return false
  if (!rule.requiredFactCodes.every((code) => facts.has(code))) return false
  if (rule.requiredAnyFactCodes.length && !rule.requiredAnyFactCodes.some((code) => facts.has(code))) return false
  if ((rule.excludedFactCodes ?? []).some((code) => facts.has(code))) return false
  return !rule.excludedFactValues.some((excluded) => input.facts.some((fact) =>
    fact.code === excluded.code
      && ['EXPLICIT_INPUT', 'RELIABLE_EXTRACTION', 'USER_CONFIRMED'].includes(fact.status)
      && fact.confidence >= 0.8
      && (Array.isArray(fact.value) ? fact.value : [fact.value]).some((value) => excluded.values.includes(value)),
  ))
}
