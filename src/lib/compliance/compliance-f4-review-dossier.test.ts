import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import dossier from '../../../docs/compliance-f4-review-dossier.json'
import blocks from '../../../docs/compliance-f4-review-source-blocks.json'
import matrix from '../../../docs/compliance-f4-legal-matrix.json'
import inventory from '../../../docs/compliance-f4-claim-review.json'
import evidence from '../../../docs/compliance-f4-source-evidence.json'
import supplement from '../../../docs/compliance-f4-review-supplement.json'
import { f4RuleReviewHolds } from './compliance-f4-rule-review'

const emptyDecision = { decision: null, reviewer: null, date: null, reviewedRevision: null, rationale: null, followUp: null }

describe('F4 juridisch reviewer-dossier', () => {
  it('dekt precies de bestaande 46 claims zonder statuspromotie of fictieve bindings', () => {
    expect(dossier.claims.map(c => c.id)).toEqual(inventory.claims.map(c => c.id))
    for (const claim of dossier.claims) {
      const old = inventory.claims.find(c => c.id === claim.id)!
      expect(claim.statement).toBe(old.statement)
      expect(claim.historicalCitations).toEqual(old.citations)
      expect(claim.knowledgeStatus).toEqual({ publicationStatus: old.publicationStatus, validationStatus: old.validationStatus, temporalStatus: old.temporalStatus, sourceControlStatus: old.sourceControlStatus })
      expect(claim.publicationAction).toBe('NONE')
      expect(claim.conclusionSupported).toBe(false)
      expect(claim.existingFrameworkRuleBindings).toEqual([])
      expect(claim.humanDecision).toEqual(emptyDecision)
      if (old.disposition === 'OUTSIDE_F4' || old.disposition === 'HISTORICAL_ONLY') expect(claim.candidateRuleCodes).toEqual([])
    }
  })

  it('dekt alle 131 antwoordregels en 10 scopevoorwaarden exact zonder resultaatwijziging', () => {
    expect(dossier.rules.map(r => r.id)).toEqual(matrix.rules.map(r => r.id))
    expect(dossier.rules.filter(r => r.kind === 'ANSWER_RULE')).toHaveLength(131)
    expect(dossier.rules.filter(r => r.kind === 'SCOPE_UNCERTAINTY')).toHaveLength(10)
    for (const row of dossier.rules) {
      const rule = matrix.rules.find(r => r.id === row.id)!
      expect(row.applicabilityCondition).toEqual(rule.condition)
      expect(row.configuredStatus).toBe(rule.status)
      expect(row.templateChecksum).toBe(rule.templateChecksum)
      expect(row.legalConclusionSupported).toBe(false)
      expect(row.currentClaimIds).toEqual([])
      expect(row.boundRuleChecksum).toBeNull()
      expect(row.humanDecision).toEqual(emptyDecision)
    }
  })

  it('houdt de negen blokkades en aparte werkgeversscope zichtbaar', () => {
    const held = dossier.rules.filter(r => r.reviewHold)
    expect(new Set(held.map(r => r.questionCode))).toEqual(new Set(Object.keys(f4RuleReviewHolds)))
    expect(held).toHaveLength(27)
    for (const r of held) expect(r.configuredStatus).toBe('NOT_ASSESSED')
    for (const r of dossier.rules.filter(r => r.kind === 'SCOPE_UNCERTAINTY')) {
      expect(r.configuredStatus).toBe('NOT_ASSESSED')
      expect(r.topic).toBe('C10')
      expect(r.candidateClaimIds).toEqual([])
    }
  })

  it('bindt 107 ongewijzigde bronfragmenten met echte hashes en revisies', () => {
    expect(blocks.blocks).toHaveLength(107)
    expect(new Set(blocks.blocks.map(b => b.id))).toEqual(new Set(evidence.candidateBlocks.map(b => b.id)))
    for (const block of blocks.blocks) {
      const old = evidence.candidateBlocks.find(b => b.id === block.id)!
      expect(block.textHash).toBe(old.textHash)
      expect(block.sourceVersionId).toBe(old.sourceVersionId)
      expect(createHash('sha256').update(block.exactText, 'utf8').digest('hex')).toBe(block.textHash)
      expect(block.administrativeLabel).toBe('REVIEW_REQUIRED')
      expect(block.currentConsolidationVerified).toBe(false)
    }
  })

  it('voorkomt kapotte bron- en kandidaatverwijzingen', () => {
    for (const item of [...dossier.claims, ...dossier.rules, ...dossier.contextQuestions]) {
      for (const id of item.primaryBlockIds) expect(blocks.blocks.some(b => b.id === id)).toBe(true)
    }
    for (const claim of dossier.claims) {
      for (const id of claim.additionalPrimaryBlockIds) expect(supplement.blocks.some(b => b.id === id)).toBe(true)
      for (const code of claim.candidateQuestionCodes) expect(matrix.questions.some(q => q.code === code)).toBe(true)
      for (const code of claim.candidateRuleCodes) expect(dossier.rules.some(r => r.code === code && r.candidateClaimIds.some(id => id === claim.id))).toBe(true)
      for (const key of claim.officialExplanationKeys) expect(dossier.webEvidence.some(w => w.key === key)).toBe(true)
    }
  })

  it('onderbouwt de aanvullende specialistische zoekingangen en vrijwilligersscope zonder vrijgave', () => {
    expect(supplement.blocks).toHaveLength(81)
    expect(supplement.claims).toHaveLength(24)
    expect(supplement.currentConsolidationVerified).toBe(false)
    for (const block of supplement.blocks) {
      expect(block.sourceVersionId).toBe(supplement.sourceVersionId)
      expect(createHash('sha256').update(block.exactText, 'utf8').digest('hex')).toBe(block.textHash)
      expect(block.exactText).not.toBe(block.sectionPath)
    }
    for (const id of supplement.employerScope.blockIds) expect(supplement.blocks.find(b => b.id === id)?.sectionPath).toContain('Artikel 9.5a ')
    for (const claim of supplement.claims) {
      expect(claim.legalApproval).toBe(false)
      expect(inventory.claims.some(c => c.externalKey === claim.claimExternalKey)).toBe(true)
      for (const id of claim.blockIds) expect(supplement.blocks.some(b => b.id === id)).toBe(true)
    }
  })

  it('laat alle menselijke beslissingen leeg en dekt elk onderwerp en elke regel', () => {
    expect(dossier.topicDecisionSheets).toHaveLength(10)
    const codes = dossier.topicDecisionSheets.flatMap(s => s.ruleCodes)
    expect(codes).toHaveLength(141)
    expect(new Set(codes)).toEqual(new Set(dossier.rules.map(r => r.code)))
    for (const s of dossier.topicDecisionSheets) {
      expect(s.humanDecision).toEqual(emptyDecision)
      expect(s.permittedDecisions).toEqual(['Goedgekeurd', 'Afgekeurd', 'Aanpassing vereist', 'Aanvullend brononderzoek vereist'])
    }
    expect(dossier.decision).toBe('NO_GO')
    expect(dossier.humanApprovalGranted).toBe(false)
    expect(dossier.sourceAccess.currentConsolidationVerified).toBe(false)
    for (const w of dossier.webEvidence) expect(w.legalApproval).toBe(false)
  })

  it('presenteert alle claim- en regelidentiteiten ook in het leesbare dossier', () => {
    const markdown = readFileSync('docs/compliance-f4-review-dossier.md', 'utf8')
    for (const c of dossier.claims) expect(markdown).toContain(c.id)
    for (const r of dossier.rules) expect(markdown).toContain(`| ${r.code} (`)
    expect(markdown).toContain('HTTP 429')
    expect(markdown).toContain('NO-GO')
  })
})
