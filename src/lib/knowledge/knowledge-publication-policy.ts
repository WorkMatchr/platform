import type { KnowledgeControlRisk, KnowledgeSourceControlStatus } from '@/generated/prisma/enums'
import { getKnowledgeControlRequirement } from './knowledge-control-policy'

export type PublicationPolicyInput = {
  publicationStatus: string
  validationStatus: string
  copyrightCheckPassed: boolean
  reviewedByUserId: string | null
  reviewedAt: Date | null
  nextReviewAt: Date | null
  controlRisk: KnowledgeControlRisk
  sourceControlStatus: KnowledgeSourceControlStatus
  hasOpenImprovementReport: boolean
  citations: Array<{
    supportType: string
    fragmentId: string | null
    sourceVersion: {
      validUntil: Date | null
      source: { temporalStatus: string; authorityLevel: string; independenceGroup: string }
    }
  }>
  hasOpenHigherAuthorityConflict: boolean
}

export type PublicationPolicyResult = {
  publishable: boolean
  reasons: string[]
  independentSourceGroups: number
  qualityTargetMet: boolean
}

export function evaluateKnowledgePublication(input: PublicationPolicyInput, now = new Date(), target = 3): PublicationPolicyResult {
  const reasons: string[] = []
  const controlRequirement = getKnowledgeControlRequirement(input.controlRisk)
  if (input.publicationStatus !== 'APPROVED') reasons.push('NOT_APPROVED')
  if (input.validationStatus !== 'VALIDATED') reasons.push('NOT_VALIDATED')
  if (!input.copyrightCheckPassed) reasons.push('COPYRIGHT_NOT_CHECKED')
  if (input.sourceControlStatus !== 'CONTROL_COMPLETE') reasons.push('SOURCE_CONTROL_INCOMPLETE')
  if (input.sourceControlStatus === 'CONFLICT_DETECTED') reasons.push('SOURCE_CONFLICT_OPEN')
  if (controlRequirement.humanControlRequiredForPublication && (!input.reviewedByUserId || !input.reviewedAt)) {
    reasons.push('HUMAN_EXCEPTION_CONTROL_MISSING')
  }
  if (input.hasOpenImprovementReport) {
    reasons.push('SERIOUS_IMPROVEMENT_REPORT_OPEN')
  }
  if (input.nextReviewAt && input.nextReviewAt <= now) reasons.push('REVIEW_EXPIRED')
  if (input.hasOpenHigherAuthorityConflict) reasons.push('HIGHER_AUTHORITY_CONFLICT')
  if (input.citations.length === 0 || input.citations.some((citation) => !citation.fragmentId)) reasons.push('CITATION_INVALID')

  const suitable = input.citations.filter((citation) =>
    ['DIRECT_SUPPORT', 'PARTIAL_SUPPORT'].includes(citation.supportType) &&
    citation.sourceVersion.source.temporalStatus === 'CURRENT' &&
    (!citation.sourceVersion.validUntil || citation.sourceVersion.validUntil > now) &&
    ['PRIMARY_LEGAL', 'OFFICIAL_GUIDANCE', 'CONSENSUS_STANDARD', 'PROFESSIONAL_GUIDANCE'].includes(citation.sourceVersion.source.authorityLevel),
  )
  const independentSourceGroups = new Set(suitable.map((citation) => citation.sourceVersion.source.independenceGroup)).size
  if (independentSourceGroups < controlRequirement.minimumCurrentAuthoritativeSources) {
    reasons.push(input.controlRisk === 'HIGH' || input.controlRisk === 'CRITICAL'
      ? 'HIGH_RISK_CURRENT_SOURCES_INSUFFICIENT'
      : 'CURRENT_AUTHORITATIVE_SOURCE_MISSING')
  }
  return { publishable: reasons.length === 0, reasons, independentSourceGroups, qualityTargetMet: independentSourceGroups >= target }
}

export function canReadKnowledgeTier(granted: string[], required: string) {
  return granted.includes('PLATFORM_ADMIN') || granted.includes(required)
}
