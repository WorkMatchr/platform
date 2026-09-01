import { describe, expect, it, vi } from 'vitest'
import { emptyCaseUnderstanding } from '@/lib/ai-intake-classifier/case-understanding-contract'
import { buildKnowledgeGroundedMatchingProfile } from './knowledge-expert-routing-provider'

const claimId = '11111111-1111-4111-8111-111111111101'

describe('Knowledge-grounded expert routing', () => {
  const output = (primaryExpertise: string) => ({
    kind: 'EXPERT_ROUTING', scope: 'INTAKE_ROUTING_KNOWLEDGE', requiredConceptCodes: ['INDOOR_ENVIRONMENT'],
    requiredFactCodes: [], excludedFactCodes: [], primaryExpertise, conditionalExpertise: [],
    requiredSpecialisms: ['INDOOR_ENVIRONMENT'], assignmentType: 'INVESTIGATION_AND_ADVICE',
    relevantSectorExperience: [], multidisciplinary: false, matchingCodes: ['INDOOR_ENVIRONMENT'],
    supportingKnowledgeIds: [claimId], priority: 90,
  })
  it('selecteert v3 voorbij honderd historische rijen en nooit v1', async () => {
    const rows = [{ code: 'INDOOR', ruleVersion: 1, outputSchema: output('OLD_EXPERT') },
      ...Array.from({ length: 105 }, (_, i) => ({ code: `OTHER_${i}`, ruleVersion: 1, outputSchema: {} })),
      { code: 'INDOOR', ruleVersion: 3, outputSchema: output('ARBEIDSHYGIENIST') }]
    const findRules = vi.fn(async (query: { take?: number }) => query.take ? rows.slice(0, query.take) : rows)
    const profile = await buildKnowledgeGroundedMatchingProfile({
      database: { knowledgeRule: { findMany: findRules }, knowledgeClaim: { findMany: vi.fn().mockResolvedValue([{ id: claimId }]) } } as never,
      understanding: emptyCaseUnderstanding(), facts: [],
      concepts: [{ code: 'INDOOR_ENVIRONMENT', confidence: 1, source: 'EXPLICIT_INPUT', supportingKnowledgeIds: [] }],
    })
    expect(profile?.primaryExpertise).toBe('ARBEIDSHYGIENIST')
    expect(findRules.mock.calls[0][0]).not.toHaveProperty('take')
    expect(findRules.mock.calls[0][0]).toMatchObject({ distinct: ['code'], orderBy: [{ code: 'asc' }, { ruleVersion: 'desc' }],
      where: { publicationStatus: 'PUBLISHED', validationStatus: 'VALIDATED', accessTier: 'PUBLIC_BASIC',
        ruleType: 'ROUTING_RULE', usageScopes: { has: 'INTAKE_ROUTING_KNOWLEDGE' } },
    })
  })
  it('valt niet terug op v1 als de actuele versie niet toepasselijk is', async () => {
    const profile = await buildKnowledgeGroundedMatchingProfile({
      database: { knowledgeRule: { findMany: vi.fn().mockResolvedValue([
        { code: 'INDOOR', ruleVersion: 1, outputSchema: output('OLD_EXPERT') },
        { code: 'INDOOR', ruleVersion: 3, outputSchema: { ...output('ARBEIDSHYGIENIST'), requiredFactCodes: ['MISSING'] } },
      ]) }, knowledgeClaim: { findMany: vi.fn() } } as never,
      understanding: emptyCaseUnderstanding(), facts: [],
      concepts: [{ code: 'INDOOR_ENVIRONMENT', confidence: 1, source: 'EXPLICIT_INPUT', supportingKnowledgeIds: [] }],
    })
    expect(profile).toBeNull()
  })
  it('activeert een domeinregel niet door concepten uit een niet-toepasselijk Context Goal', async () => {
    const findClaims = vi.fn()
    const profile = await buildKnowledgeGroundedMatchingProfile({
      database: {
        knowledgeRule: { findMany: vi.fn().mockResolvedValue([{
          outputSchema: {
            kind: 'EXPERT_ROUTING', scope: 'INTAKE_ROUTING_KNOWLEDGE',
            requiredConceptCodes: ['PROCESS_SAFETY_MAJOR_HAZARDS'], requiredFactCodes: [], excludedFactCodes: [],
            primaryExpertise: 'PROCESS_SAFETY_MAJOR_HAZARDS', conditionalExpertise: [],
            requiredSpecialisms: ['PROCESS_SAFETY_MAJOR_HAZARDS'], assignmentType: 'INVESTIGATION_AND_ADVICE',
            relevantSectorExperience: ['Aantoonbare procesveiligheidservaring.'], multidisciplinary: true,
            matchingCodes: ['PROCESS_SAFETY_MAJOR_HAZARDS'], supportingKnowledgeIds: [claimId], priority: 100,
          },
        }]) },
        knowledgeClaim: { findMany: findClaims },
      } as never,
      understanding: emptyCaseUnderstanding(),
      facts: [],
      concepts: [{ code: 'INDOOR_ENVIRONMENT', confidence: 0.95, source: 'CLASSIFIER', supportingKnowledgeIds: [] }],
    })

    expect(profile).toBeNull()
    expect(findClaims).not.toHaveBeenCalled()
  })
})
