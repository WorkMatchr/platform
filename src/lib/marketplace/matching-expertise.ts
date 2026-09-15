import { evaluateMatchingCandidate, type MatchingAssignmentFacts, type MatchingProviderFacts } from './matching-rules'

/** Reuses existing rules. Additional choices are alternatives, never inferred requirements. */
export function evaluateRequestedExpertises(assignment: MatchingAssignmentFacts, additionalCodes: readonly string[], provider: MatchingProviderFacts) {
  const codes = [assignment.capabilityCode, ...additionalCodes]
  const results = codes.map(capabilityCode => evaluateMatchingCandidate({ ...assignment, capabilityCode }, provider))
  const index = results.findIndex(result => result.status === 'ELIGIBLE')
  const result = results[index < 0 ? 0 : index]!
  return { ...result, factors: [...result.factors, {
    key: index > 0 ? 'ADDITIONAL_EXPERTISE' : 'PRIMARY_EXPERTISE', matched: index >= 0,
    points: 0, possible: 0, explanation: codes[index < 0 ? 0 : index]!,
  }] }
}
