import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { evaluateComplianceClaim, type CompliancePublicationClaim } from './compliance-knowledge-publication'

const now = new Date('2026-10-18T12:00:00Z')
export function reviewedClaimFixture() {
  const reviewedAt = new Date('2026-10-15T12:00:00Z')
  return {
    publicationStatus: 'PUBLISHED', validationStatus: 'VALIDATED', copyrightCheckPassed: true,
    reviewedAt, reviewedByUserId: 'synthetic-reviewer', nextReviewAt: new Date('2027-01-01'),
    controlRisk: 'HIGH', sourceControlStatus: 'CONTROL_COMPLETE', temporalStatus: 'CURRENT',
    jurisdiction: 'NL', applicability: 'Uitsluitend synthetische test', validFrom: null, validUntil: null,
    relationsFrom: [], relationsTo: [], improvementReports: [], crossValidations: [],
    validations: [{ status: 'VALIDATED', validatorType: 'HUMAN', validatorUserId: 'synthetic-reviewer', validatedAt: reviewedAt, nextReviewAt: null, withdrawsValidationId: null, withdrawnByValidations: [] }],
    citations: [{ supportType: 'DIRECT_SUPPORT', fragmentId: 'fragment',
      fragment: { sourceVersionId: 'revision', requiresReview: false, sectionPath: 'Artikel 1', internalExcerpt: 'Synthetische tekst', excerptHash: createHash('sha256').update('Synthetische tekst').digest('hex') },
      sourceVersion: { id: 'revision', checksum: 'a'.repeat(64), contentFingerprint: null, reviewStatus: 'REVIEWED', supersededByVersion: null, validFrom: null, validUntil: null,
        source: { temporalStatus: 'CURRENT', authorityLevel: 'PRIMARY_LEGAL', independenceGroup: 'test', sourceUrl: 'https://example.invalid/test' } },
    }],
  } as unknown as CompliancePublicationClaim
}

describe('Compliance gebruikt de volledige Knowledge-policy voor actuele bronclaims', () => {
  it('accepteert aantoonbaar beoordeelde directe bronondersteuning', () => expect(evaluateComplianceClaim(reviewedClaimFixture(), now).publishable).toBe(true))
  const cases: Array<[string, (c: CompliancePublicationClaim) => void, string]> = [
    ['status alleen', c => { c.validationStatus = 'UNVALIDATED' }, 'NOT_VALIDATED'],
    ['verlopen review', c => { c.nextReviewAt = new Date('2026-10-18') }, 'REVIEW_EXPIRED'],
    ['ontbrekende einddatum verlengt geen oude review', c => { c.nextReviewAt = null; c.reviewedAt = new Date('2025-01-01') }, 'REVIEW_EXPIRED'],
    ['geen menselijke review', c => { c.reviewedByUserId = null }, 'HUMAN_REVIEW_MISSING'],
    ['datum alleen', c => { c.validations = [] }, 'HUMAN_APPROVAL_MISSING_OR_WITHDRAWN'],
    ['ingetrokken menselijke goedkeuring', c => { c.validations[0].withdrawnByValidations = [{ id: 'withdrawal' }] }, 'HUMAN_APPROVAL_MISSING_OR_WITHDRAWN'],
    ['conflicterende claim', c => { c.relationsFrom = [{ relationType: 'CONFLICTS_WITH' }] }, 'HIGHER_AUTHORITY_CONFLICT'],
    ['conflict in andere richting', c => { c.relationsTo = [{ relationType: 'CONFLICTS_WITH' }] }, 'HIGHER_AUTHORITY_CONFLICT'],
    ['vervangen claim', c => { c.relationsTo = [{ relationType: 'SUPERSEDES' }] }, 'CLAIM_SUPERSEDED'],
    ['ingetrokken bron', c => { c.citations[0].sourceVersion.source.temporalStatus = 'WITHDRAWN' }, 'SOURCE_REVISION_NOT_CURRENT_REVIEWED'],
    ['oude bron', c => { c.citations[0].sourceVersion.source.temporalStatus = 'HISTORICAL' }, 'SOURCE_REVISION_NOT_CURRENT_REVIEWED'],
    ['onbeoordeelde revisie', c => { c.citations[0].sourceVersion.reviewStatus = 'REVIEW_REQUIRED' }, 'SOURCE_REVISION_NOT_CURRENT_REVIEWED'],
    ['vervangen revisie', c => { c.citations[0].sourceVersion.supersededByVersion = { id: 'new' } }, 'SOURCE_REVISION_NOT_CURRENT_REVIEWED'],
    ['toekomstige revisie', c => { c.citations[0].sourceVersion.validFrom = new Date('2027-01-01') }, 'SOURCE_REVISION_NOT_CURRENT_REVIEWED'],
    ['onjuist fragmentchecksum', c => { c.citations[0].fragment!.excerptHash = 'b'.repeat(64) }, 'FRAGMENT_CHECKSUM_MISMATCH'],
    ['onjuist bronchecksumformaat', c => { c.citations[0].sourceVersion.checksum = 'bad' }, 'SOURCE_IDENTITY_INVALID'],
    ['ontbrekend fragment', c => { c.citations[0].fragment = null }, 'REVIEWED_CITATION_MISSING'],
    ['onbeoordeeld fragment', c => { c.citations[0].fragment!.requiresReview = true }, 'REVIEWED_CITATION_MISSING'],
    ['indirecte onderbouwing', c => { c.citations[0].supportType = 'PARTIAL_SUPPORT' }, 'DIRECT_SUPPORT_REQUIRED'],
    ['ontbrekende toepasselijkheid', c => { c.applicability = '' }, 'APPLICABILITY_UNVERIFIED'],
    ['open verbeterbericht', c => { c.improvementReports = [{ status: 'NEW' }] }, 'SERIOUS_IMPROVEMENT_REPORT_OPEN'],
    ['onopgeloste kruisvalidatie', c => { c.crossValidations = [{ outcome: 'CONFLICT', supersededByAssessment: null }] }, 'CROSS_VALIDATION_UNRESOLVED'],
    ['onvoldoende onafhankelijke bronnen bij kritiek risico', c => { c.controlRisk = 'CRITICAL' }, 'HIGH_RISK_CURRENT_SOURCES_INSUFFICIENT'],
  ]
  it.each(cases)('%s blokkeert', (_, alter, reason) => {
    const claim = reviewedClaimFixture(); alter(claim)
    const result = evaluateComplianceClaim(claim, now)
    expect(result.publishable).toBe(false)
    expect(result.reasons).toContain(reason)
  })
})
