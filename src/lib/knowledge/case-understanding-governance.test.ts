import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import reviewPackage from '../../../data/knowledge/review/case-understanding-10-scenario-review-v1.json'
import decision from '../../../data/knowledge/review/case-understanding-10-scenario-review-v2-decision.json'
import { parseCaseUnderstandingKnowledgeReview } from './case-understanding-review-schema'

describe('Case Understanding Knowledge-governance', () => {
  it('beperkt de menselijke goedkeuring expliciet tot intake-routing', () => {
    const review = parseCaseUnderstandingKnowledgeReview(reviewPackage)
    expect(decision.packageId).toBe(review.packageId)
    expect(decision.usageScope).toBe('INTAKE_ROUTING_KNOWLEDGE')
    expect(decision.scenarioDecisions).toHaveLength(10)
    expect(decision.scenarioDecisions.every((item) => item.decision.startsWith('APPROVED'))).toBe(true)
    expect(decision.prohibitedUses).toEqual(expect.arrayContaining([
      'DIAGNOSIS', 'LEGAL_ADVICE', 'COMPLIANCE_DECISION', 'SAFE_UNSAFE_DECLARATION',
      'SEVESO_COMPLIANCE_CONCLUSION', 'PRESCRIBED_MEDICAL_CAPACITY',
    ]))
    expect(review.contextGoals).toHaveLength(25)
  })

  it('publiceert ook goedgekeurde doelen zonder formuleringsexemplaar als niet-vraagbare definitie', () => {
    const publisher = readFileSync(new URL('../../../scripts/publish-case-understanding-knowledge-preview.ts', import.meta.url), 'utf8')
    expect(publisher).toContain("kind: 'CONTEXT_GOAL_DEFINITION'")
    expect(publisher).toContain('askable: false')
    expect(publisher).not.toContain('if (!text) continue')
  })

  it('verankert scopefilters in zowel claims als regels en runtimelezers', () => {
    const schema = readFileSync(new URL('../../../prisma/schema.prisma', import.meta.url), 'utf8')
    const goalProvider = readFileSync(new URL('../public-intake/knowledge-context-goal-provider.ts', import.meta.url), 'utf8')
    const routingProvider = readFileSync(new URL('../public-intake/knowledge-expert-routing-provider.ts', import.meta.url), 'utf8')
    expect(schema.match(/usageScopes\s+String\[\]/g)).toHaveLength(2)
    expect(goalProvider.match(/usageScopes:/g)?.length).toBeGreaterThanOrEqual(2)
    expect(routingProvider.match(/usageScopes:/g)?.length).toBeGreaterThanOrEqual(2)
  })

  it('modelleert procesveiligheid als cross-discipline specialisme zonder HVK-ouder', () => {
    expect(reviewPackage.specialismProposal.code).toBe('PROCESS_SAFETY_MAJOR_HAZARDS')
    expect(reviewPackage.specialismProposal.parentDisciplines).toEqual([])
    expect(decision.specialism.guardrail).toMatch(/HVK alleen is niet voldoende/)
  })
})
