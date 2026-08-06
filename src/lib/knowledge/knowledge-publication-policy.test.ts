import { describe, expect, it } from 'vitest'
import { canReadKnowledgeTier, evaluateKnowledgePublication } from './knowledge-publication-policy'

const source = { temporalStatus: 'CURRENT', authorityLevel: 'OFFICIAL_GUIDANCE', independenceGroup: 'official-a' }
const base = {
  publicationStatus: 'APPROVED', validationStatus: 'VALIDATED', copyrightCheckPassed: true,
  reviewedByUserId: 'reviewer', reviewedAt: new Date('2026-01-01'), nextReviewAt: new Date('2027-01-01'),
  controlRisk: 'MEDIUM' as const, sourceControlStatus: 'CONTROL_COMPLETE' as const, hasOpenImprovementReport: false,
  citations: [{ supportType: 'DIRECT_SUPPORT', fragmentId: 'fragment', sourceVersion: { validUntil: null, source } }],
  hasOpenHigherAuthorityConflict: false,
}

describe('KnowledgePublicationPolicy', () => {
  it('publiceert nooit alleen op basis van drie bronnen', () => {
    const result = evaluateKnowledgePublication({ ...base, publicationStatus: 'DRAFT', citations: [0, 1, 2].map((index) => ({ ...base.citations[0], sourceVersion: { validUntil: null, source: { ...source, independenceGroup: `group-${index}` } } })) }, new Date('2026-06-01'))
    expect(result.qualityTargetMet).toBe(true)
    expect(result.publishable).toBe(false)
    expect(result.reasons).toContain('NOT_APPROVED')
  })

  it('vereist actuele gezaghebbende bron, afgeronde broncontrole en copyrightcontrole', () => {
    expect(evaluateKnowledgePublication(base, new Date('2026-06-01')).publishable).toBe(true)
    const rejected = evaluateKnowledgePublication({ ...base, copyrightCheckPassed: false, sourceControlStatus: 'SOURCES_REQUIRED', citations: [{ ...base.citations[0], sourceVersion: { validUntil: null, source: { ...source, temporalStatus: 'HISTORICAL' } } }] }, new Date('2026-06-01'))
    expect(rejected.reasons).toEqual(expect.arrayContaining(['SOURCE_CONTROL_INCOMPLETE', 'COPYRIGHT_NOT_CHECKED', 'CURRENT_AUTHORITATIVE_SOURCE_MISSING']))
  })

  it('publiceert niet na uitsluitend een menselijke inhoudelijke beoordeling', () => {
    const result = evaluateKnowledgePublication({
      ...base,
      publicationStatus: 'INTERNAL_REVIEW',
      validationStatus: 'PARTIALLY_VALIDATED',
    }, new Date('2026-06-01'))
    expect(result.publishable).toBe(false)
    expect(result.reasons).toEqual(expect.arrayContaining(['NOT_APPROVED', 'NOT_VALIDATED']))
  })

  it('blokkeert historische bronnen, open conflicten en verlopen controles afzonderlijk', () => {
    const result = evaluateKnowledgePublication({
      ...base,
      nextReviewAt: new Date('2026-01-01'),
      hasOpenHigherAuthorityConflict: true,
      citations: [{ ...base.citations[0], sourceVersion: { validUntil: null, source: { ...source, temporalStatus: 'HISTORICAL' } } }],
    }, new Date('2026-06-01'))
    expect(result.reasons).toEqual(expect.arrayContaining([
      'REVIEW_EXPIRED',
      'HIGHER_AUTHORITY_CONFLICT',
      'CURRENT_AUTHORITATIVE_SOURCE_MISSING',
    ]))
  })

  it('blokkeert hoog en kritiek risico zonder menselijke uitzonderingcontrole en voldoende actuele bronnen', () => {
    const high = evaluateKnowledgePublication({
      ...base,
      controlRisk: 'HIGH',
      reviewedByUserId: null,
      reviewedAt: null,
      hasOpenImprovementReport: true,
    }, new Date('2026-06-01'))
    expect(high.reasons).toEqual(expect.arrayContaining(['HUMAN_EXCEPTION_CONTROL_MISSING', 'SERIOUS_IMPROVEMENT_REPORT_OPEN']))

    const critical = evaluateKnowledgePublication({ ...base, controlRisk: 'CRITICAL' }, new Date('2026-06-01'))
    expect(critical.reasons).toContain('HIGH_RISK_CURRENT_SOURCES_INSUFFICIENT')
  })

  it('maakt menselijke itemcontrole voor laag en middel niet tot een algemene publicatiebottleneck', () => {
    for (const controlRisk of ['LOW', 'MEDIUM'] as const) {
      const result = evaluateKnowledgePublication({
        ...base,
        controlRisk,
        reviewedByUserId: null,
        reviewedAt: null,
      }, new Date('2026-06-01'))
      expect(result.publishable).toBe(true)
      expect(result.reasons).not.toContain('HUMAN_EXCEPTION_CONTROL_MISSING')
    }
  })

  it('beperkt toegang zonder feiten per abonnement te dupliceren', () => {
    expect(canReadKnowledgeTier(['PUBLIC_BASIC'], 'PROFESSIONAL_PRO')).toBe(false)
    expect(canReadKnowledgeTier(['PLATFORM_ADMIN'], 'PROFESSIONAL_PRO')).toBe(true)
  })
})
