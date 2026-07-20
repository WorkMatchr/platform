import { createHash } from 'node:crypto'
import { MARKETPLACE_MINIMUM_SCORE, MARKETPLACE_WEIGHTS } from './marketplace-config'

export type MatchingAssignmentFacts = {
  assignmentId: string
  capabilityCode: string
  sectorCode: string | null
  regionCode: string | null
  allowsRemoteWork: boolean
}

export type MatchingProviderFacts = {
  providerProfileId: string
  capabilities: Array<{ serviceCode: string; specialismCode: string | null; deliveryModes: string[] }>
  sectors: Array<{ sectorCode: string }>
  workAreas: Array<{ regionCode: string }>
}

export type MatchingRuleResult = {
  status: 'EXCLUDED' | 'ELIGIBLE'
  exclusionReasons: string[]
  scoreNumerator: number | null
  scoreDenominator: number | null
  normalizedScore: number | null
  factors: Array<{ key: string; matched: boolean; points: number; possible: number; explanation: string }>
  tieBreakerHash: string
}

function stableHash(assignmentId: string, providerProfileId: string) {
  return createHash('sha256').update(`${assignmentId}:${providerProfileId}`).digest('hex')
}

export function evaluateMatchingCandidate(
  assignment: MatchingAssignmentFacts,
  provider: MatchingProviderFacts,
): MatchingRuleResult {
  const matchingCapabilities = provider.capabilities.filter(
    (capability) => capability.serviceCode === assignment.capabilityCode || capability.specialismCode === assignment.capabilityCode,
  )
  const regionMatch =
    assignment.regionCode === null ||
    provider.workAreas.some((area) => area.regionCode === assignment.regionCode || area.regionCode === 'NATIONWIDE')
  const remoteMatch =
    !assignment.allowsRemoteWork ||
    matchingCapabilities.some((capability) => capability.deliveryModes.includes('REMOTE')) ||
    provider.workAreas.some((area) => area.regionCode === 'REMOTE')

  const exclusionReasons: string[] = []
  if (matchingCapabilities.length === 0) exclusionReasons.push('DIENST_NIET_AANGEBODEN')
  if (!regionMatch && !remoteMatch) exclusionReasons.push('WERKGEBIED_PAST_NIET')
  if (exclusionReasons.length > 0) {
    return {
      status: 'EXCLUDED',
      exclusionReasons,
      scoreNumerator: null,
      scoreDenominator: null,
      normalizedScore: null,
      factors: [],
      tieBreakerHash: stableHash(assignment.assignmentId, provider.providerProfileId),
    }
  }

  const factors: MatchingRuleResult['factors'] = [
    {
      key: 'CAPABILITIES',
      matched: true,
      points: MARKETPLACE_WEIGHTS.capabilities,
      possible: MARKETPLACE_WEIGHTS.capabilities,
      explanation: 'De gevraagde dienstverlening is gecontroleerd aanwezig.',
    },
  ]
  if (assignment.sectorCode) {
    const matched = provider.sectors.some((sector) => sector.sectorCode === assignment.sectorCode)
    factors.push({
      key: 'SECTORFIT',
      matched,
      points: matched ? MARKETPLACE_WEIGHTS.sectorFit : 0,
      possible: MARKETPLACE_WEIGHTS.sectorFit,
      explanation: matched ? 'Er is gecontroleerde ervaring in uw sector.' : 'Er is geen gecontroleerde sectorspecifieke ervaring.',
    })
  }
  const deliveryMatched = assignment.allowsRemoteWork ? remoteMatch : regionMatch
  factors.push({
    key: 'LEVERINGSVOORKEUR',
    matched: deliveryMatched,
    points: deliveryMatched ? MARKETPLACE_WEIGHTS.deliveryPreference : 0,
    possible: MARKETPLACE_WEIGHTS.deliveryPreference,
    explanation: deliveryMatched ? 'De leveringsvorm sluit aan op de opdracht.' : 'De leveringsvorm sluit beperkt aan.',
  })

  const scoreNumerator = factors.reduce((total, factor) => total + factor.points, 0)
  const scoreDenominator = factors.reduce((total, factor) => total + factor.possible, 0)
  const normalizedScore = Math.floor((scoreNumerator * 10_000) / scoreDenominator)
  if (normalizedScore < MARKETPLACE_MINIMUM_SCORE) exclusionReasons.push('MINIMUMSCORE_NIET_BEHAALD')
  return {
    status: exclusionReasons.length === 0 ? 'ELIGIBLE' : 'EXCLUDED',
    exclusionReasons,
    scoreNumerator: exclusionReasons.length === 0 ? scoreNumerator : null,
    scoreDenominator: exclusionReasons.length === 0 ? scoreDenominator : null,
    normalizedScore: exclusionReasons.length === 0 ? normalizedScore : null,
    factors,
    tieBreakerHash: stableHash(assignment.assignmentId, provider.providerProfileId),
  }
}

export function rankMatchingCandidates<T extends { result: MatchingRuleResult; providerProfileId: string }>(candidates: T[]) {
  return candidates
    .filter((candidate) => candidate.result.status === 'ELIGIBLE')
    .sort((left, right) => {
      const scoreDifference = (right.result.normalizedScore ?? 0) - (left.result.normalizedScore ?? 0)
      if (scoreDifference !== 0) return scoreDifference
      return left.result.tieBreakerHash.localeCompare(right.result.tieBreakerHash, 'en')
    })
}
