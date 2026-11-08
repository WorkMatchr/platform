import { evaluateMatchingCandidate, type MatchingAssignmentFacts, type MatchingProviderFacts } from './matching-rules'

/** Reuses existing rules. Additional choices are alternatives, never inferred requirements. */
export function evaluateRequestedExpertises(assignment: MatchingAssignmentFacts, additionalCodes: readonly string[], provider: MatchingProviderFacts) {
  const codes = [assignment.capabilityCode, ...additionalCodes]
  const results = codes.map(capabilityCode => evaluateMatchingCandidate({ ...assignment, capabilityCode }, provider))
  const eligibleIndex = results.findIndex(result => result.status === 'ELIGIBLE')
  // Explain an exclusion against an expertise the provider actually offers, if present.
  const offeredIndex = results.findIndex(result => !result.exclusionReasons.includes('DIENST_NIET_AANGEBODEN'))
  const index = eligibleIndex >= 0 ? eligibleIndex : Math.max(0, offeredIndex)
  const result = results[index]!
  return { ...result, factors: [...result.factors, {
    key: index > 0 ? 'ADDITIONAL_EXPERTISE' : 'PRIMARY_EXPERTISE', matched: result.status === 'ELIGIBLE',
    points: 0, possible: 0, explanation: codes[index]!,
  }] }
}
