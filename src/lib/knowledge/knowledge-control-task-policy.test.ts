import { describe, expect, it } from 'vitest'
import { determineKnowledgeHumanControl, type KnowledgeHumanControlInput } from './knowledge-control-task-policy'

const base: KnowledgeHumanControlInput = {
  risk: 'MEDIUM', temporalStatus: 'CURRENT', copyrightClassification: 'OPEN_LICENSE',
  publicationStatus: 'DRAFT', usedInSituationalAdvice: false, hasSourceConflict: false,
  hasSufficientTraceability: true, hasExpiredSource: false, hasProfessionalReport: false,
  hasUnclearApplicability: false,
}

describe('uitzonderingsgestuurde kenniscontrole', () => {
  it.each(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const)('maakt voor %s zonder uitzondering geen menselijke taak', (risk) => {
    expect(determineKnowledgeHumanControl({ ...base, risk }).requiresHumanAction).toBe(false)
  })

  it('houdt historische beperkte kennis intern zonder werkvoorraad', () => {
    expect(determineKnowledgeHumanControl({
      ...base, temporalStatus: 'HISTORICAL', copyrightClassification: 'RESTRICTED_REFERENCE_ONLY',
      hasSufficientTraceability: false,
    })).toEqual({ requiresHumanAction: false, exceptionType: null, reason: null, historicalInternalOnly: true })
  })

  it.each([
    ['hasSourceConflict', 'SOURCE_CONFLICT'],
    ['hasExpiredSource', 'SOURCE_EXPIRED'],
    ['hasProfessionalReport', 'PROFESSIONAL_REPORT'],
    ['hasUnclearApplicability', 'APPLICABILITY_UNCLEAR'],
  ] as const)('activeert alleen een concrete uitzondering voor %s', (field, exceptionType) => {
    const result = determineKnowledgeHumanControl({ ...base, [field]: true })
    expect(result.requiresHumanAction).toBe(true)
    expect(result.exceptionType).toBe(exceptionType)
  })

  it('activeert hoog risico pas bij voorgenomen publicatie', () => {
    expect(determineKnowledgeHumanControl({ ...base, risk: 'HIGH' }).requiresHumanAction).toBe(false)
    expect(determineKnowledgeHumanControl({ ...base, risk: 'HIGH', publicationStatus: 'APPROVED' }).exceptionType).toBe('HIGH_RISK_PUBLICATION')
  })
})
