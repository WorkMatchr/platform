import { describe, expect, it } from 'vitest'
import {
  hasReliableDeterministicContinuityEvidence,
  isTechnicalClassifierFallback,
} from './classifier-fallback-continuity'
import { emptyCaseUnderstanding } from '@/lib/ai-intake-classifier/case-understanding-contract'
import { deriveKnowledgeConceptCandidates, extractPublicIntakeFacts } from './context-fact-extractor'

describe('technical classifier fallback continuity', () => {
  it('onderscheidt technische uitval van limiter-, abuse- en inputbesluiten', () => {
    expect(isTechnicalClassifierFallback('PROVIDER_TIMEOUT')).toBe(true)
    expect(isTechnicalClassifierFallback('PROVIDER_UNAVAILABLE')).toBe(true)
    expect(isTechnicalClassifierFallback('RATE_LIMITED')).toBe(false)
    expect(isTechnicalClassifierFallback('ABUSE_PROTECTION_UNAVAILABLE')).toBe(false)
    expect(isTechnicalClassifierFallback('INPUT_REJECTED')).toBe(false)
    expect(isTechnicalClassifierFallback(null)).toBe(false)
  })

  it('laat alleen betrouwbare deterministische concepten continuiteit bewijzen', () => {
    expect(hasReliableDeterministicContinuityEvidence([{
      code: 'PSA', confidence: 0.9, source: 'EXPLICIT_INPUT', supportingKnowledgeIds: [],
    }])).toBe(true)
    expect(hasReliableDeterministicContinuityEvidence([{
      code: 'PSA', status: 'HYPOTHESIS', confidence: 0.95, source: 'CLASSIFIER', supportingKnowledgeIds: [],
    }])).toBe(false)
  })

  it('maakt bij technische uitval van expliciete signalen geen diagnose of causaliteit', () => {
    const originalInput = 'Het verzuim stijgt; medewerkers noemen werkdruk, slechte communicatie en spanningen.'
    const facts = extractPublicIntakeFacts({
      originalInput,
      answers: [],
      caseUnderstanding: emptyCaseUnderstanding(),
    })
    const concepts = deriveKnowledgeConceptCandidates({ originalInput, classification: null, facts })

    expect(concepts).toEqual([expect.objectContaining({
      code: 'PSA', confidence: 0.9, source: 'EXPLICIT_INPUT',
    })])
    expect(facts.some((fact) => JSON.stringify(fact.value).match(/veroorzaakt|diagnose|schuld/i))).toBe(false)
    expect(concepts.some((concept) => concept.status === 'HYPOTHESIS')).toBe(false)
  })

  it('zet expliciete re-integratie- en werkvermogenscontext veilig voort na technische uitval', () => {
    const originalInput = 'Na uitval is een medewerker gedeeltelijk weer aan het werk. Er is verschil over de inzetbare uren en wij willen geen medische gegevens opvragen.'
    const facts = extractPublicIntakeFacts({ originalInput, answers: [], caseUnderstanding: emptyCaseUnderstanding() })
    const concepts = deriveKnowledgeConceptCandidates({ originalInput, classification: null, facts })

    expect(hasReliableDeterministicContinuityEvidence(concepts)).toBe(true)
    expect(concepts.map((item) => item.code)).toEqual(expect.arrayContaining([
      'REINTEGRATION', 'WORK_ABILITY', 'WORK_ABILITY_REINTEGRATION', 'MEDICAL_PRIVACY',
    ]))
    expect(facts.every((fact) => fact.status !== 'HYPOTHESIS')).toBe(true)
    expect(JSON.stringify({ facts, concepts })).not.toMatch(/diagnose|medische oorzaak|arbeidsongeschiktheidspercentage/i)
  })
})
