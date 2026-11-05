import { describe, expect, it } from 'vitest'
import { f4TopicCandidates, inspectF4TopicCandidate } from './compliance-f4-topic-candidates'
import { f4RuleReviewHolds } from './compliance-f4-rule-review'
import { f4TestDefinition } from '@/test-fixtures/compliance-f4'
import { f4Catalog } from './compliance-f4-catalog'

describe('Versiegebonden kandidaatmodules', () => {
  it('behoudt registry-identiteiten en verandert framework 2.1 niet', () => {
    expect(f4TopicCandidates.map(m => m.moduleCode)).toEqual(['C07', 'R03'])
    expect(f4TestDefinition().modules.flatMap(m => m.rules)).toHaveLength(141)
    expect(f4Catalog).toHaveLength(48)
    expect(Object.keys(f4RuleReviewHolds)).toHaveLength(9)
    const codes = f4TopicCandidates.flatMap(m => m.questions.map(q => q.code))
    expect(new Set(codes).size).toBe(codes.length)
    expect(f4TopicCandidates.every(m => m.status === 'DRAFT' && m.candidateVersion === '2.2' && m.evidence.claimId === null && m.evidence.sourceVersionId === null)).toBe(true)
  })
  for (const answer of ['YES','PARTIAL','NO','UNKNOWN','']) it(`geeft geen nalevingsoordeel voor ${answer || 'ontbrekend'}`, () => {
    for (let i = 0; i < 2; i++) {
      const state = inspectF4TopicCandidate(i, Object.fromEntries(f4TopicCandidates[i].questions.map(q => [q.code, answer])))
      expect(state.assessmentStatus).toBe('NOT_ASSESSED'); expect(state.publicationDecision).toBe('NO_GO')
      expect(state.checksum).toMatch(/^[a-f0-9]{64}$/)
    }
  })
  it('houdt onbekende blootstelling zichtbaar en maakt van verborgen vragen geen vrijstelling', () => {
    expect(inspectF4TopicCandidate(1, { HASEMPLOYEES: 'YES', 'CW-R03-01': 'UNKNOWN' }).visibleCodes).toHaveLength(4)
    const hidden = inspectF4TopicCandidate(1, { HASEMPLOYEES: 'YES', 'CW-R03-01': 'NO' })
    expect(hidden.visibleCodes).toHaveLength(2); expect(hidden.assessmentStatus).toBe('NOT_ASSESSED')
  })
})
