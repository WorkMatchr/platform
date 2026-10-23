import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { f4PositiveAnswers, f4TestDefinition } from '@/test-fixtures/compliance-f4'
import { v2Context } from '@/test-fixtures/compliance-v2'
import { f4Catalog, F4_BINDING } from './compliance-f4-catalog'
import { f4RuleReviewHolds } from './compliance-f4-rule-review'
import { buildComplianceV2Report, complianceChecksum, complianceV2DefinitionSchema } from './compliance-v2'

const matrixText = readFileSync('docs/compliance-f4-legal-matrix.json', 'utf8')
const matrix = JSON.parse(matrixText) as {
  framework: typeof F4_BINDING & { published: boolean; checksum: null }
  questions: { code: string; questionChecksum: string; claimBindings: null; candidateBlockIds: string[]; rules: string[]; legalBasis: string; reviewHold: string | null }[]
  rules: { code: string; templateChecksum: string; sources: null; boundRuleChecksum: null; legalBasis: string }[]
}
const evidence = JSON.parse(readFileSync('docs/compliance-f4-source-evidence.json', 'utf8')) as {
  candidateBlocks: { id: string; sourceVersionId: string; textHash: string }[]
  sources: { sourceVersionId: string; checksum: string }[]
}
const definition = f4TestDefinition()

const claimReview = JSON.parse(readFileSync('docs/compliance-f4-claim-review.json', 'utf8')) as {
  claims: { id: string; externalKey: string; reviewedAt: null; reusableNow: boolean; publicationAction: string; reviewNote: string; citations: { id: string; sourceVersionId: string; reviewStatus: string; checksum: string }[] }[]
}

describe('F4 bronreview en publicatiemanifest', () => {
  it('registreert alle 46 echte historische claimkandidaten zonder goedkeuring te verzinnen', () => {
    expect(claimReview.claims).toHaveLength(46)
    expect(new Set(claimReview.claims.map(c => c.id)).size).toBe(46)
    expect(new Set(claimReview.claims.map(c => c.externalKey)).size).toBe(46)
    for (const claim of claimReview.claims) {
      expect(claim.reusableNow).toBe(false)
      expect(claim.publicationAction).toBe('NONE')
      expect(claim.reviewedAt).toBeNull()
      expect(claim.reviewNote.length).toBeGreaterThan(30)
      expect(claim.citations.length).toBeGreaterThan(0)
      for (const citation of claim.citations) {
        expect(citation.sourceVersionId).toMatch(/^[a-f0-9-]{36}$/)
        expect(citation.checksum).toMatch(/^[a-f0-9]{64}$/)
        expect(citation.reviewStatus).toBe('REVIEW_REQUIRED')
      }
    }
  })
  it('maakt per regel de ontbrekende juridische goedkeuring en alle antwoorduitkomsten expliciet', () => {
    const inventory = JSON.parse(matrixText) as { rules: { bindingReview: { legalConclusionSupported: boolean; humanReviewRequired: boolean; answerOutcomes: Record<string, string>; requiredArticleOrFragment: string } }[] }
    for (const rule of inventory.rules) {
      expect(rule.bindingReview.legalConclusionSupported).toBe(false)
      expect(rule.bindingReview.humanReviewRequired).toBe(true)
      expect(Object.keys(rule.bindingReview.answerOutcomes).sort()).toEqual(['NO', 'PARTIAL', 'UNKNOWN', 'YES'])
      expect(rule.bindingReview.requiredArticleOrFragment.length).toBeGreaterThan(0)
    }
  })
  it('dekt alle actuele vraagdefinities inclusief opties en zichtbaarheid zonder fictieve bindings', () => {
    expect(matrix.framework).toEqual({ ...F4_BINDING, published: false, checksum: null })
    expect(matrix.questions).toHaveLength(48)
    expect(matrix.questions.map(q => q.code)).toEqual(f4Catalog.map(q => q.code))
    for (const q of definition.modules.flatMap(m => m.questions)) {
      const row = matrix.questions.find(r => r.code === q.code)!
      expect(row.questionChecksum).toBe(complianceChecksum(q))
      expect(row.claimBindings).toBeNull()
      expect(row.legalBasis.length).toBeGreaterThan(0)
      expect(row.candidateBlockIds.length).toBeGreaterThan(0)
      for (const id of row.candidateBlockIds) expect(evidence.candidateBlocks.some(b => b.id === id)).toBe(true)
    }
  })
  it('legt alle 141 regeltemplates vast zonder ze als publiceerbare checksums te presenteren', () => {
    const rules = definition.modules.flatMap(m => m.rules)
    expect(matrix.rules).toHaveLength(141)
    expect(new Set(matrix.rules.map(r => r.code)).size).toBe(141)
    for (const rule of rules) {
      const template = Object.fromEntries(Object.entries(rule).filter(([key]) => key !== 'sources'))
      const row = matrix.rules.find(r => r.code === rule.code)!
      expect(row.templateChecksum).toBe(complianceChecksum(template))
      expect(row.sources).toBeNull()
      expect(row.boundRuleChecksum).toBeNull()
      expect(row.legalBasis.length).toBeGreaterThan(0)
      expect(complianceChecksum(rule)).not.toBe(row.templateChecksum)
    }
    expect(matrixText).not.toContain('example.invalid')
    expect(matrixText).not.toContain('41000000-0000-4000-8000-000000000001')
  })
  it('verbindt kandidaatfragmenten alleen met waargenomen bronrevisies', () => {
    for (const block of evidence.candidateBlocks) {
      expect(evidence.sources.some(s => s.sourceVersionId === block.sourceVersionId)).toBe(true)
      expect(block.textHash).toMatch(/^[a-f0-9]{64}$/)
    }
    for (const source of evidence.sources) expect(source.checksum).toMatch(/^[a-f0-9]{64}$/)
  })
  it('verwerpt ontbrekende of ongeldige bronhashes en detecteert elke gewijzigde binding', () => {
    const missing = structuredClone(definition)
    missing.modules[0].rules[0].sources = []
    expect(complianceV2DefinitionSchema.safeParse(missing).success).toBe(false)
    const altered = structuredClone(definition)
    altered.modules[0].rules[0].sources[0].sourceChecksum = 'invalid'
    expect(complianceV2DefinitionSchema.safeParse(altered).success).toBe(false)
    altered.modules[0].rules[0].sources[0].sourceChecksum = 'b'.repeat(64)
    expect(complianceChecksum(altered)).not.toBe(complianceChecksum(definition))
  })
  it('houdt de negen onvoldoende onderbouwde regelgroepen expliciet tegen', () => {
    expect(Object.keys(f4RuleReviewHolds)).toHaveLength(9)
    for (const [code, reason] of Object.entries(f4RuleReviewHolds)) {
      expect(matrix.questions.find(q => q.code === code)?.reviewHold).toBe(reason)
      const rules = definition.modules.flatMap(m => m.rules).filter(r => r.code.startsWith(code + '-'))
      expect(rules).toHaveLength(3)
      for (const rule of rules) {
        expect(rule.status).toBe('NOT_ASSESSED')
        expect(rule.mode).toBe('SPECIALIST_REQUIRED')
        expect(rule.nextStep).toBe(reason)
      }
    }
  })
  it('behoudt een zelfstandige bekende tekortkoming naast een bronreviewhold', () => {
    const result = buildComplianceV2Report(definition, { ...f4PositiveAnswers, RIE: 'NO' }, v2Context).results.find(r => r.id === 'C01')!
    expect(result.status).toBe('ACTION_REQUIRED')
    expect(result.sufficientlyAssessed).toBe(false)
  })
})
