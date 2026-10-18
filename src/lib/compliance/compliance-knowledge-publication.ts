import { createHash } from 'node:crypto'
import type { Prisma } from '@/generated/prisma/client'
import { evaluateKnowledgePublication } from '@/lib/knowledge/knowledge-publication-policy'
import { getKnowledgeControlRequirement } from '@/lib/knowledge/knowledge-control-policy'

export const complianceClaimInclude = {
  citations: { orderBy: { id: 'asc' }, include: { fragment: true, sourceVersion: { include: { source: true, supersededByVersion: { select: { id: true } } } } } },
  validations: { include: { withdrawnByValidations: { select: { id: true } } } },
  relationsFrom: { select: { relationType: true } },
  relationsTo: { select: { relationType: true } },
  improvementReports: { select: { status: true } },
  crossValidations: { select: { outcome: true, supersededByAssessment: { select: { id: true } } } },
} as const satisfies Prisma.KnowledgeClaimInclude

export type CompliancePublicationClaim = Prisma.KnowledgeClaimGetPayload<{ include: typeof complianceClaimInclude }>

/** Revalidate current evidence for NEW assessments. Never rewrites historical snapshots. */
export function evaluateComplianceClaim(claim: CompliancePublicationClaim, now = new Date()) {
  const conflict = [...claim.relationsFrom, ...claim.relationsTo].some(r => r.relationType === 'CONFLICTS_WITH')
  const policy = evaluateKnowledgePublication({ ...claim,
    // PUBLISHED passed the approval transition previously; recheck every OTHER policy input.
    publicationStatus: claim.publicationStatus === 'PUBLISHED' ? 'APPROVED' : claim.publicationStatus,
    hasOpenImprovementReport: claim.improvementReports.some(r => ['NEW', 'UNDER_INVESTIGATION'].includes(r.status)),
    hasOpenHigherAuthorityConflict: conflict,
  }, now)
  const reasons = [...policy.reasons]
  if (claim.publicationStatus !== 'PUBLISHED') reasons.push('CLAIM_NOT_PUBLISHED')
  if (claim.temporalStatus !== 'CURRENT' || (claim.validFrom && claim.validFrom > now) || (claim.validUntil && claim.validUntil <= now)) reasons.push('CLAIM_NOT_CURRENT')
  if (!claim.applicability?.trim() || claim.jurisdiction !== 'NL') reasons.push('APPLICABILITY_UNVERIFIED')
  if (claim.relationsTo.some(r => r.relationType === 'SUPERSEDES')) reasons.push('CLAIM_SUPERSEDED')
  if (claim.crossValidations.some(v => !v.supersededByAssessment && v.outcome !== 'CONFIRMED')) reasons.push('CROSS_VALIDATION_UNRESOLVED')
  // Compliance publication requires traceable human approval, also for lower-risk claims.
  const review = claim.reviewedAt
  const expiry = review && new Date(review)
  if (expiry) expiry.setUTCMonth(expiry.getUTCMonth() + getKnowledgeControlRequirement(claim.controlRisk).reviewIntervalMonths)
  if (!review || review > now || !claim.reviewedByUserId) reasons.push('HUMAN_REVIEW_MISSING')
  if (expiry && expiry <= now) reasons.push('REVIEW_EXPIRED')
  if (!claim.validations.some(v => v.status === 'VALIDATED' && v.validatorType === 'HUMAN' && v.validatorUserId === claim.reviewedByUserId &&
    v.validatedAt <= now && !!review && v.validatedAt >= review && (!v.nextReviewAt || v.nextReviewAt > now) && !v.withdrawsValidationId && v.withdrawnByValidations.length === 0)) reasons.push('HUMAN_APPROVAL_MISSING_OR_WITHDRAWN')
  for (const citation of claim.citations) {
    const version = citation.sourceVersion, source = version.source, fragment = citation.fragment
    if (citation.supportType !== 'DIRECT_SUPPORT') reasons.push('DIRECT_SUPPORT_REQUIRED')
    if (source.temporalStatus !== 'CURRENT' || version.reviewStatus !== 'REVIEWED' || version.supersededByVersion ||
      (version.validFrom && version.validFrom > now) || (version.validUntil && version.validUntil <= now)) reasons.push('SOURCE_REVISION_NOT_CURRENT_REVIEWED')
    if (!source.sourceUrl || !source.independenceGroup.trim() || !/^[a-f0-9]{64}$/i.test(version.contentFingerprint ?? version.checksum ?? '')) reasons.push('SOURCE_IDENTITY_INVALID')
    if (!fragment || fragment.sourceVersionId !== version.id || fragment.requiresReview ||
      !fragment.sectionPath?.trim() || !fragment.internalExcerpt?.trim()) reasons.push('REVIEWED_CITATION_MISSING')
    else if (createHash('sha256').update(fragment.internalExcerpt, 'utf8').digest('hex') !== fragment.excerptHash) reasons.push('FRAGMENT_CHECKSUM_MISMATCH')
  }
  return { publishable: reasons.length === 0, reasons: [...new Set(reasons)], independentSourceGroups: policy.independentSourceGroups }
}
