import { describe, expect, it } from 'vitest'
import {
  formatKnowledgeCitationLocation,
  formatKnowledgeInternalExcerpt,
  formatKnowledgePublicationYear,
  knowledgeAdminLabels,
} from './knowledge-admin-presentation'

describe('knowledge admin presentation', () => {
  it('vertaalt technische statussen naar Nederlandse presentatielabels', () => {
    expect(knowledgeAdminLabels.temporalStatus('HISTORICAL')).toBe('Historisch')
    expect(knowledgeAdminLabels.validationStatus('UNVALIDATED')).toBe('Ongevalideerd')
    expect(knowledgeAdminLabels.publicationStatus('DRAFT')).toBe('Concept')
    expect(knowledgeAdminLabels.accessTier('INTERNAL_REVIEWER')).toBe('Alleen interne controle')
    expect(knowledgeAdminLabels.reviewStatus('REVIEW_REQUIRED')).toBe('Hercontrole nodig')
    expect(knowledgeAdminLabels.auditEvent('CLAIM_CREATED')).toBe('Kennisitem aangemaakt')
    expect(knowledgeAdminLabels.reviewTaskStatus('CONTENT_APPROVED')).toBe('Broncontrole afgerond')
    expect(knowledgeAdminLabels.controlRisk('CRITICAL')).toBe('Kritiek')
    expect(knowledgeAdminLabels.improvementReportStatus('UNDER_INVESTIGATION')).toBe('In onderzoek')
  })

  it('presenteert bronjaar en citatielocatie zonder technische codes', () => {
    expect(formatKnowledgePublicationYear(new Date('2002-01-01T00:00:00.000Z'))).toBe('2002')
    expect(formatKnowledgePublicationYear(null)).toBe('Onbekend')
    expect(formatKnowledgeCitationLocation({ pageFrom: 7, pageTo: null, sectionPath: 'Beleid' })).toBe(
      'pagina 7, Beleid',
    )
  })

  it('begrensd interne bronfragmenten zonder volledige brontekst te tonen', () => {
    const value = formatKnowledgeInternalExcerpt('a'.repeat(600))
    expect(value.length).toBeLessThanOrEqual(240)
    expect(value.endsWith('…')).toBe(true)
  })
})
