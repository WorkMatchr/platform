import { createHash } from 'node:crypto'
import { describe, expect, it, vi } from 'vitest'
import { emptyCaseUnderstanding } from '@/lib/ai-intake-classifier/case-understanding-contract'
import { deriveKnowledgeConceptCandidates, extractPublicIntakeFacts } from './context-fact-extractor'
import { contextGoalApplies, isReliableConcept } from './context-goal-applicability'
import { loadKnowledgeGroundedContextGoals } from './knowledge-context-goal-provider'
import { buildKnowledgeGroundedMatchingProfile } from './knowledge-expert-routing-provider'
import { assessContextQuestionGrounding } from './context-question-grounding'

const originalInput = 'Sinds we naar een nieuw kantoor zijn verhuisd, hebben meerdere medewerkers hoofdpijn, droge ogen en vermoeidheid. We weten niet waar het door komt. Kan iemand dit onderzoeken?'
const understanding = { ...emptyCaseUnderstanding(), candidateExpertiseDomains: {
  value: ['INDOOR_ENVIRONMENT'], status: 'HYPOTHESIS' as const, confidence: 0.94, evidence: ['nieuw kantoor'],
} }
const classification = { summary: originalInput, primarySubject: 'OCCUPATIONAL_HEALTH' as const,
  secondarySubjects: [], confidence: 'HIGH' as const, alternatives: [], caseUnderstanding: understanding }
const facts = extractPublicIntakeFacts({ originalInput, answers: [], caseUnderstanding: understanding })
const concepts = deriveKnowledgeConceptCandidates({ originalInput, classification, facts })
const claimId = '11111111-1111-4111-8111-111111111101'
const ruleId = '11111111-1111-4111-8111-111111111201'
const requiredFactCodes = ['WORK_LOCATION_MENTIONED', 'HEALTH_COMPLAINT', 'WORK_ENVIRONMENT_CHANGE_SIGNAL', 'AFFECTED_SCOPE']
const outputSchema = {
  contractVersion: 2, kind: 'CONTEXT_GOAL', scope: 'INTAKE_ROUTING_KNOWLEDGE',
  code: 'WORK_ENVIRONMENT_FACTORS', variantKey: 'INDOOR:WORK_ENVIRONMENT_FACTORS', questionKey: 'context_indoor_factors',
  informationNeed: 'Onbekende kenmerken van de werkomgeving verhelderen zonder een oorzaak vast te stellen.',
  runtimeQuestionInstructions: 'Gebruik uitsluitend bewezen casuscontext; formuleer een neutrale vraag zonder een oorzaak te veronderstellen.',
  neutralFallbackQuestion: 'Wat kunt u vertellen over de werkomgeving waarin de klachten optreden?',
  exampleQuestionForReview: 'Deze redactionele voorbeeldtekst mag nooit in de runtime verschijnen.',
  answerType: 'TEXT', options: [], category: 'WORK', relevantConceptCodes: [], discoveryConceptCodes: ['INDOOR_ENVIRONMENT'],
  satisfiesFactCodes: ['INDOOR_FACTORS_ANSWERED'], equivalentGoalCodes: [], groundingPolicy: 'DOMAIN_SPECIFIC',
  applicability: { requiredAllConceptCodes: [], requiredAnyConceptCodes: [], requiredFactCodes,
    requiredAnyFactCodes: [], excludedFactCodes: [], excludedFactValues: [] },
  mandatory: false, universal: false, weights: { relevance: 1, informationGain: 1, matchingValue: 1, userBurden: 0.2 },
  supportingKnowledgeIds: [claimId],
}
const findClaims = () => vi.fn().mockResolvedValueOnce([]).mockResolvedValueOnce([{
  id: claimId, confidenceLevel: 'HIGH', topic: { slug: 'arbeidshygiene-binnenmilieu' },
  normalizedStatement: 'Gezondheidsklachten bij meerdere werknemers kunnen aanleiding zijn voor onderzoek naar de werkomgeving; dit stelt geen oorzaak vast.',
}])
const load = () => loadKnowledgeGroundedContextGoals({
  originalInput, concepts, database: { knowledgeClaim: { findMany: findClaims() }, knowledgeRule: { findMany: vi.fn().mockResolvedValue([
    { id: ruleId, code: 'INDOOR_FACTORS', ruleVersion: 4, outputSchema },
  ]) } } as never,
})

describe('hypothesis discovery is not applicability evidence', () => {
  it('retains scenario-1 indoor hypothesis without promoting it to a reliable concept or fact', () => {
    const indoor = concepts.find((concept) => concept.code === 'INDOOR_ENVIRONMENT')!
    expect(indoor.status).toBe('HYPOTHESIS')
    expect(isReliableConcept(indoor)).toBe(false)
    expect(facts.find((fact) => fact.code === 'EXPERTISE_DOMAIN_INDOOR_ENVIRONMENT')?.status).toBe('HYPOTHESIS')
    const unknown = deriveKnowledgeConceptCandidates({ originalInput, facts, classification: {
      ...classification, caseUnderstanding: { ...understanding, candidateExpertiseDomains: {
        ...understanding.candidateExpertiseDomains, status: 'UNKNOWN',
      } },
    } })
    expect(unknown.some((concept) => concept.code === 'INDOOR_ENVIRONMENT')).toBe(false)
  })
  it('hydrates validated indoor claims for candidates, then requires independent applicable facts and verified neutral wording', async () => {
    const result = await load()
    const goal = result.goals.find((item) => item.selectedContextRuleId === ruleId)!
    expect(goal).toBeDefined()
    const evidence = result.evidenceByGoalCode.get(goal.variantKey!)!
    expect(evidence).toContainEqual(expect.objectContaining({ knowledgeId: claimId, source: 'PUBLISHED_CLAIM' }))
    expect(contextGoalApplies({ goal, facts, concepts })).toBe(true)
    expect(contextGoalApplies({ goal, facts: [], concepts })).toBe(false)
    expect(contextGoalApplies({ goal: { ...goal, applicability: { ...goal.applicability, requiredAllConceptCodes: ['INDOOR_ENVIRONMENT'] } }, facts, concepts })).toBe(false)
    const text = 'Wat kunt u vertellen over de inrichting en het gebruik van het nieuwe kantoor?'
    const formulation = { text, provenance: { status: 'VERIFIED' as const, reasonCode: 'VERIFIED',
      questionDigest: createHash('sha256').update(text).digest('hex'), unsupportedPresuppositions: [],
    } }
    expect(assessContextQuestionGrounding({ goal, facts, concepts, evidence, formulation })).toMatchObject({ knowledgeGroundingApplicableToCase: true })
    expect(assessContextQuestionGrounding({ goal, facts: [], concepts, evidence, formulation })).toMatchObject({ knowledgeGroundingApplicableToCase: false })
    expect(goal.text).not.toContain('redactionele')
  })
  it('routes from a discovered family plus independently proven context, never the hypothesis alone', async () => {
    const route = { kind: 'EXPERT_ROUTING', scope: 'INTAKE_ROUTING_KNOWLEDGE', requiredConceptCodes: [],
      discoveryConceptCodes: ['INDOOR_ENVIRONMENT'], requiredFactCodes, excludedFactCodes: [],
      primaryExpertise: 'ARBEIDSHYGIENIST', conditionalExpertise: [], requiredSpecialisms: ['INDOOR_ENVIRONMENT'],
      assignmentType: 'INVESTIGATION_AND_ADVICE', relevantSectorExperience: [], multidisciplinary: false,
      matchingCodes: ['INDOOR_ENVIRONMENT'], supportingKnowledgeIds: [claimId], priority: 90 }
    const database = { knowledgeRule: { findMany: vi.fn().mockResolvedValue([{ code: 'INDOOR', ruleVersion: 3, outputSchema: route }]) },
      knowledgeClaim: { findMany: vi.fn().mockResolvedValue([{ id: claimId }]) } } as never
    expect(await buildKnowledgeGroundedMatchingProfile({ database, understanding, facts, concepts })).toMatchObject({
      primaryExpertise: 'ARBEIDSHYGIENIST', requiredSpecialisms: ['INDOOR_ENVIRONMENT'], riskContext: [],
    })
    expect(await buildKnowledgeGroundedMatchingProfile({ database, understanding, facts: [], concepts })).toBeNull()
    expect(await buildKnowledgeGroundedMatchingProfile({ database, understanding, facts: facts.map((fact) => ({ ...fact, status: 'HYPOTHESIS' })), concepts })).toBeNull()
  })
})
